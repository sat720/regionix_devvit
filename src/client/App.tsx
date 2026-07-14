import { useState, useEffect } from 'react';
import type { PlayerProfile, GameConfig } from '../shared/types';
import { THEMES, type ThemeId, type ThemeColors } from './constants/themes';
import { Home } from './pages/Home';
import { GameScreen } from './pages/GameScreen';
import { LevelCreator } from './pages/LevelCreator';
import { Leaderboard } from './pages/Leaderboard';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';
import { requestExpandedMode } from '@devvit/web/client';

type AppProps = {
  mode: 'splash' | 'game';
};

type PageId = 'home' | 'game' | 'creator' | 'leaderboard' | 'stats' | 'settings';

export const App = ({ mode }: AppProps) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [serverDate, setServerDate] = useState<string>('');
  const [loginRewardAwarded, setLoginRewardAwarded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Routing states
  const [page, setPage] = useState<PageId>('home');
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    mode: 'practice',
    width: 6,
    height: 6,
    difficulty: 'medium',
  });

  // Theme state derived from profile or local selection
  const [themeId, setThemeId] = useState<ThemeId>('nordic');
  const theme: ThemeColors = THEMES[themeId] || THEMES.nordic;

  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        
        if (data.status === 'success') {
          setProfile(data.profile);
          setServerDate(data.serverDate);
          setLoginRewardAwarded(data.loginRewardAwarded);

          // Resolve active theme from localStorage or default
          const storedTheme = localStorage.getItem('themeId') as ThemeId;
          if (storedTheme && THEMES[storedTheme]) {
            setThemeId(storedTheme);
          } else {
            setThemeId('nordic');
          }

          // If launched inside a user's custom puzzle post, boot straight into it
          if (data.customPuzzle) {
            setGameConfig({
              mode: 'custom',
              width: data.customPuzzle.width,
              height: data.customPuzzle.height,
              difficulty: 'medium',
              customPuzzle: data.customPuzzle,
            });
            setPage('game');
          }
        }
      } catch (err) {
        console.warn('Error during app initialization, using local mock profile fallback:', err);
        const mockProfile: PlayerProfile = {
          username: 'LocalPlayer',
          diamonds: 50,
          currentStreak: 5,
          longestStreak: 5,
          gamesPlayed: 15,
          gamesWon: 12,
          perfectSolves: 3,
          averageTime: 50,
          bestTime: 18,
          highestScore: 1450,
          hintsUsed: 2,
          undoCount: 10,
          achievements: ['first_solve', 'solves_10'],
          lastLoginDate: null,
          lastDailyChallengeDate: '',
        };
        setProfile(mockProfile);
        setServerDate(new Date().toISOString().split('T')[0] || '');

        const storedTheme = localStorage.getItem('themeId') as ThemeId;
        if (storedTheme && THEMES[storedTheme]) {
          setThemeId(storedTheme);
        } else {
          setThemeId('nordic');
        }
      } finally {
        setLoading(false);
      }
    };

    void initApp();
  }, []);

  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    setProfile(newProfile);
  };

  const handleProfileDiamondsAwarded = async (diamondsCount: number) => {
    if (!profile) return;
    const nextProfile = {
      ...profile,
      diamonds: profile.diamonds + diamondsCount,
    };
    setProfile(nextProfile);

    // Sync to backend
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: nextProfile }),
      });
    } catch (err) {
      console.error('Failed to sync published diamonds:', err);
    }
  };

  const handleThemeChange = (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    localStorage.setItem('themeId', newThemeId);
  };

  const handleToggleTheme = () => {
    const nextThemeId = themeId === 'nordic' ? 'cyberpunk' : 'nordic';
    handleThemeChange(nextThemeId);
  };

  const handleResetProfile = async () => {
    if (!profile) return;
    const defaultProfile: PlayerProfile = {
      username: profile.username,
      diamonds: 10,
      currentStreak: 1, // keep today login
      longestStreak: 1,
      gamesPlayed: 0,
      gamesWon: 0,
      perfectSolves: 0,
      averageTime: 0,
      bestTime: 0,
      highestScore: 0,
      hintsUsed: 0,
      undoCount: 0,
      achievements: [],
      lastLoginDate: serverDate,
      lastDailyChallengeDate: null,
    };

    setProfile(defaultProfile);
    setThemeId('cyberpunk');
    localStorage.setItem('themeId', 'cyberpunk');
    localStorage.setItem('regionsCompletedCount', '0');

    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: defaultProfile }),
      });
    } catch (err) {
      console.error('Failed to sync profile reset:', err);
    }
  };

  const handleNavigate = (targetPage: string, params?: GameConfig) => {
    if (params) {
      setGameConfig(params);
    }
    setPage(targetPage as PageId);
  };

  // 1. Loading state view
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-cyan-400 font-mono gap-3 p-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-sm font-bold tracking-widest uppercase mt-3 animate-pulse">Initializing Regionix</h2>
      </div>
    );
  }

  // 2. Inline view (Inside Reddit Feed)
  if (mode === 'splash') {
    const hasSolved = profile?.lastDailyChallengeDate === serverDate;
    
    return (
      <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-slate-950 text-slate-100 p-6 select-none font-sans overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1),transparent_70%)] pointer-events-none" />
        
        <div className="text-5xl animate-pulse">🧩</div>
        <div className="flex flex-col items-center gap-1.5 text-center z-10">
          <h1 className="text-3xl font-black text-cyan-400 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
            REGIONIX
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {hasSolved ? '✅ Daily Challenge Solved!' : '🏆 Daily Challenge is Active'}
          </p>
          {profile && profile.currentStreak > 0 && (
            <span className="text-xs bg-orange-950/40 text-orange-450 border border-orange-900/30 px-2.5 py-0.5 rounded-full font-mono font-bold mt-1 shadow-inner">
              🔥 {profile.currentStreak} Day Login Streak
            </span>
          )}
        </div>

        <div className="flex items-center justify-center mt-3 z-10">
          <button
            className="flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wider uppercase w-auto h-11 rounded-full cursor-pointer transition-all px-6 shadow-[0_0_15px_rgba(6,182,212,0.45)] hover:shadow-[0_0_20px_rgba(6,182,212,0.65)] transform hover:scale-103"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          >
            {hasSolved ? 'Show Leaderboard' : 'Tap to Play'}
          </button>
        </div>
      </div>
    );
  }

  // 3. Expanded View (Full game application)
  return (
    <div className={`w-full min-h-screen ${theme.bg}`}>
      {/* Daily Login Reward Popup Overlay */}
      {loginRewardAwarded && profile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-xs bg-slate-900 border border-cyan-500/30 p-6 flex flex-col items-center gap-4 text-center rounded-2xl shadow-2xl">
            <span className="text-4xl animate-bounce">💎</span>
            <h3 className="text-lg font-extrabold text-cyan-400">Daily Login Reward!</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Welcome back, u/{profile.username}! You claimed:
            </p>
            <div className="flex flex-col gap-1 items-center bg-slate-950 py-2.5 px-4 rounded-xl border border-slate-800 w-full font-mono text-sm">
              <span className="text-yellow-400 font-extrabold">+5 Diamonds 💎</span>
              <span className="text-orange-450 font-bold">Streak: {profile.currentStreak} Days 🔥</span>
            </div>
            <button
              onClick={() => setLoginRewardAwarded(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-xl transition-colors cursor-pointer text-xs"
            >
              Let's Play
            </button>
          </div>
        </div>
      )}

      {/* Page Routing Switchboard */}
      {profile && (
        <>
          {page === 'home' && (
            <Home
              profile={profile}
              theme={theme}
              serverDate={serverDate}
              onNavigate={handleNavigate}
              onToggleTheme={handleToggleTheme}
            />
          )}

          {page === 'game' && (
            <GameScreen
              key={`${gameConfig.mode}-${gameConfig.width}-${gameConfig.height}-${gameConfig.difficulty}`}
              theme={theme}
              profile={profile}
              serverDate={serverDate}
              gameConfig={gameConfig}
              onBack={() => setPage('home')}
              onNavigate={handleNavigate}
              onToggleTheme={handleToggleTheme}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {page === 'creator' && (
            <LevelCreator
              theme={theme}
              onBack={() => setPage('home')}
              onToggleTheme={handleToggleTheme}
              onProfileUpdate={handleProfileDiamondsAwarded}
            />
          )}

          {page === 'leaderboard' && (
            <Leaderboard
              theme={theme}
              currentUsername={profile.username}
              onBack={() => setPage('home')}
            />
          )}

          {page === 'stats' && (
            <Statistics
              profile={profile}
              theme={theme}
              onBack={() => setPage('home')}
            />
          )}

          {page === 'settings' && (
            <Settings
              theme={theme}
              onChangeTheme={handleThemeChange}
              onResetProfile={handleResetProfile}
              onBack={() => setPage('home')}
            />
          )}
        </>
      )}
    </div>
  );
};
