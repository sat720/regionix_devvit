import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type { PlayerProfile, LeaderboardEntry, Puzzle, Seed } from '../../shared/types';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

// Helper to get today's date string (YYYY-MM-DD)
const getTodayStr = (): string => {
  return new Date().toISOString().split('T')[0] || '';
};

// Helper to get yesterday's date string (YYYY-MM-DD)
const getYesterdayStr = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0] || '';
};

// Default profile generator
const createDefaultProfile = (username: string): PlayerProfile => {
  return {
    username,
    diamonds: 10, // Start with 10 diamonds for hints
    currentStreak: 0,
    longestStreak: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    perfectSolves: 0,
    averageTime: 0,
    bestTime: 0,
    highestScore: 0,
    hintsUsed: 0,
    undoCount: 0,
    achievements: [],
    lastLoginDate: null,
    lastDailyChallengeDate: null,
  };
};

// Initialize / Sync Player Profile
api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  try {
    const username = (await reddit.getCurrentUsername()) || 'anonymous';
    const profileKey = `profile:${username}`;
    
    // 1. Fetch profile
    const rawProfile = await redis.get(profileKey);
    const profile: PlayerProfile = rawProfile ? JSON.parse(rawProfile) : createDefaultProfile(username);
    
    // Ensure profile has default username if anonymous resolved
    if (!profile.username) profile.username = username;

    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();
    let loginRewardAwarded = false;

    // 2. Daily Login Reward checking (Only reward once per calendar day)
    if (profile.lastLoginDate !== todayStr) {
      loginRewardAwarded = true;
      profile.diamonds += 5; // Award 5 diamonds
      
      // Update streak
      if (profile.lastLoginDate === yesterdayStr) {
        profile.currentStreak += 1;
      } else {
        profile.currentStreak = 1; // reset streak if gap exists
      }
      
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      
      // Check 30-day streak achievement
      if (profile.currentStreak >= 30 && !profile.achievements.includes('streak_30')) {
        profile.achievements.push('streak_30');
      }

      profile.lastLoginDate = todayStr;
      await redis.set(profileKey, JSON.stringify(profile));
    }

    // 3. Check if current post is a custom user puzzle
    const customPuzzleKey = `custom_puzzle:${postId}`;
    const rawCustomPuzzle = await redis.get(customPuzzleKey);
    let customPuzzle: Puzzle | null = null;
    if (rawCustomPuzzle) {
      customPuzzle = JSON.parse(rawCustomPuzzle);
    }

    return c.json({
      status: 'success',
      postId,
      username,
      profile,
      loginRewardAwarded,
      customPuzzle,
      serverDate: todayStr,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown initialization error',
    }, 500);
  }
});

// Update profile statistics and achievements
api.post('/profile/update', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) || 'anonymous';
    const profileKey = `profile:${username}`;
    const body = await c.req.json<{ profile: PlayerProfile }>();
    
    if (!body || !body.profile) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Missing profile body' }, 400);
    }

    const currentProfileRaw = await redis.get(profileKey);
    const currentProfile: PlayerProfile = currentProfileRaw 
      ? JSON.parse(currentProfileRaw) 
      : createDefaultProfile(username);

    // Merge changes safely, preserving critical server-side fields like lastLoginDate and diamonds if needed,
    // but here we merge client stats. Ensure no client cheating by basic validation.
    const updatedProfile = {
      ...currentProfile,
      ...body.profile,
      username, // preserve username
    };

    await redis.set(profileKey, JSON.stringify(updatedProfile));

    return c.json({
      status: 'success',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('API Profile Update Error:', error);
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update profile',
    }, 500);
  }
});

// Submit Daily Challenge Solve
api.post('/daily/solve', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) || 'anonymous';
    const todayStr = getTodayStr();
    const body = await c.req.json<{ score: number; time: number; hints: number; undos: number }>();

    if (!body) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Missing solve details' }, 400);
    }

    const { score, time, hints, undos } = body;
    const profileKey = `profile:${username}`;

    // 1. Fetch profile and mark daily complete
    const rawProfile = await redis.get(profileKey);
    const profile: PlayerProfile = rawProfile ? JSON.parse(rawProfile) : createDefaultProfile(username);

    let isNewSolveToday = false;
    if (profile.lastDailyChallengeDate !== todayStr) {
      profile.lastDailyChallengeDate = todayStr;
      profile.diamonds += 10; // Award 10 diamonds for solving the daily challenge!
      profile.gamesPlayed += 1;
      profile.gamesWon += 1;
      
      // Update best time and high score
      if (profile.bestTime === 0 || time < profile.bestTime) {
        profile.bestTime = time;
      }
      if (score > profile.highestScore) {
        profile.highestScore = score;
      }

      isNewSolveToday = true;
      await redis.set(profileKey, JSON.stringify(profile));
    }

    // 2. Submit to Leaderboard (Sorted Set)
    // Encode score & time: score * 1,000,000 + (86,400 - time)
    // Capping time to max seconds in day: 86400
    const timeFactor = Math.max(0, 86400 - Math.min(86400, time));
    const redisScore = score * 1000000 + timeFactor;

    const leaderboardKey = `leaderboard:${todayStr}`;
    const leaderboardDetailsKey = `leaderboard:details:${todayStr}`;

    // zAdd expects member and score.
    // Let's add user to leaderboard sorted set
    await redis.zAdd(leaderboardKey, { member: username, score: redisScore });

    // Store details (score, time, hints, undos) in details hash
    const detailsEntry = {
      username,
      score,
      time,
      hints,
      undos,
      date: todayStr,
    };
    await redis.hSet(leaderboardDetailsKey, { [username]: JSON.stringify(detailsEntry) });

    return c.json({
      status: 'success',
      profile,
      isNewSolveToday,
    });
  } catch (error) {
    console.error('API Daily Solve Error:', error);
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to submit daily solve',
    }, 500);
  }
});

// Fetch Daily Leaderboard
api.get('/daily/leaderboard', async (c) => {
  const todayStr = getTodayStr();
  const leaderboardKey = `leaderboard:${todayStr}`;
  const leaderboardDetailsKey = `leaderboard:details:${todayStr}`;

  try {
    const username = (await reddit.getCurrentUsername()) || 'anonymous';

    // Fetch all members in the sorted set
    const allMembers = await redis.zRange(leaderboardKey, 0, -1);

    // Sort descending by score
    const sortedMembers = [...allMembers].sort((a, b) => b.score - a.score);

    // Get top 10
    const topMembers = sortedMembers.slice(0, 10);

    const entries: LeaderboardEntry[] = [];
    
    // Fetch details for each top member
    for (const memberObj of topMembers) {
      const memberName = memberObj.member;
      const detailsRaw = await redis.hGet(leaderboardDetailsKey, memberName);
      if (detailsRaw) {
        entries.push(JSON.parse(detailsRaw));
      } else {
        // Fallback if details are missing but sorted set has user
        // Extract base score and time from the redis score:
        // redisScore = score * 1000000 + (86400 - time)
        const scoreVal = Math.floor(memberObj.score / 1000000);
        const timeVal = 86400 - (memberObj.score % 1000000);
        entries.push({
          username: memberName,
          score: scoreVal,
          time: timeVal,
          hints: 0,
          undos: 0,
          date: todayStr,
        });
      }
    }

    // Retrieve user's own global rank
    const myIndex = sortedMembers.findIndex(m => m.member === username);
    let myRank: number | null = null;
    if (myIndex !== -1) {
      myRank = myIndex + 1; // 1-indexed descending rank
    }

    const myDetailsRaw = await redis.hGet(leaderboardDetailsKey, username);
    const myDetails = myDetailsRaw ? JSON.parse(myDetailsRaw) : null;

    return c.json({
      status: 'success',
      leaderboard: entries,
      myRank,
      myDetails,
    });
  } catch (error) {
    console.error('API Leaderboard Error:', error);
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch daily leaderboard',
    }, 500);
  }
});

// Publish a custom user puzzle as a new Reddit post
api.post('/custom-puzzle/publish', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) || 'anonymous';
    const body = await c.req.json<{ width: number; height: number; seeds: Seed[] }>();

    if (!body || !body.seeds || body.seeds.length === 0) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Missing puzzle layout data' }, 400);
    }

    const { width, height, seeds } = body;

    // 1. Submit the new custom post via Reddit Devvit API
    // We name the title to fit the creator's username
    const postTitle = `🧩 Custom Logic Puzzle by u/${username} - Regionix`;
    
    const post = await reddit.submitCustomPost({
      title: postTitle,
      subredditName: context.subredditName,
    });

    // 2. Save the puzzle layout in Redis associated with this new post ID
    const puzzleKey = `custom_puzzle:${post.id}`;
    const puzzleData: Puzzle = {
      width,
      height,
      seeds,
      solution: [], // Solution is solved client-side by backtracking or reference
    };

    await redis.set(puzzleKey, JSON.stringify(puzzleData));

    // 3. Award diamonds to the creator for contributing!
    const profileKey = `profile:${username}`;
    const rawProfile = await redis.get(profileKey);
    if (rawProfile) {
      const profile: PlayerProfile = JSON.parse(rawProfile);
      profile.diamonds += 15; // award 15 diamonds for publishing a level!
      await redis.set(profileKey, JSON.stringify(profile));
    }

    const postUrl = `https://reddit.com/r/${context.subredditName}/comments/${post.id}`;

    return c.json({
      status: 'success',
      postId: post.id,
      postUrl,
    });
  } catch (error) {
    console.error('API Publish Puzzle Error:', error);
    return c.json<ErrorResponse>({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to publish custom puzzle',
    }, 500);
  }
});
