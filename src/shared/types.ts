export type ShapeConstraint = 'square' | 'rectangle' | 'any';
export type OrientationConstraint = 'horizontal' | 'vertical' | 'any';

export type Constraint = {
  shape: ShapeConstraint;
  orientation: OrientationConstraint;
  area: number | null; // null represents no size constraint
};

export type Seed = {
  id: string; // matches region ID
  x: number;
  y: number;
  colorIndex: number; // Index to resolve color based on selected theme
  constraint: Constraint;
};

export type RegionState = {
  id: string; // unique ID matching the seed
  seedX: number;
  seedY: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHinted?: boolean; // if this region has been locked by a full solution hint
  hintLevel?: number; // 0 = none, 1 = bounds shown, 2 = partial lock, 3 = full solve
};

export type Puzzle = {
  width: number;
  height: number;
  seeds: Seed[];
  solution: RegionState[];
};

export type GameConfig = {
  mode: 'daily' | 'practice' | 'custom';
  width: number;
  height: number;
  difficulty: 'easy' | 'medium' | 'hard';
  customPuzzle?: Puzzle | null;
};

export type AchievementId =
  | 'first_solve'
  | 'solves_10'
  | 'solves_100'
  | 'perfect_solver'
  | 'speed_runner'
  | 'streak_30'
  | 'regions_1000';

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  unlockedAt: string | null; // ISO string or null
};

export type PlayerProfile = {
  username: string;
  diamonds: number;
  currentStreak: number;
  longestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  perfectSolves: number;
  averageTime: number; // in seconds
  bestTime: number; // in seconds
  highestScore: number;
  hintsUsed: number;
  undoCount: number;
  achievements: AchievementId[];
  lastLoginDate: string | null; // YYYY-MM-DD
  lastDailyChallengeDate: string | null; // YYYY-MM-DD
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  time: number; // in seconds
  hints: number;
  undos: number;
  date: string; // YYYY-MM-DD
};

export type ScoreResult = {
  baseScore: number;
  timeBonus: number;
  hintPenalty: number;
  undoPenalty: number;
  mistakePenalty: number;
  perfectSolveBonus: number;
  finalScore: number;
};
