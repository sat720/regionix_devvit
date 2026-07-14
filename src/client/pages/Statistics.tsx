import type { PlayerProfile, AchievementId } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';

type StatisticsProps = {
  profile: PlayerProfile;
  theme: ThemeColors;
  onBack: () => void;
};

type AchievementMeta = {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
};

const ACHIEVEMENTS_LIST: AchievementMeta[] = [
  {
    id: 'first_solve',
    name: 'First Light',
    description: 'Solve your first logic puzzle.',
    icon: '✨',
  },
  {
    id: 'solves_10',
    name: 'Deductive Apprentice',
    description: 'Solve 10 puzzles in total.',
    icon: '🎓',
  },
  {
    id: 'solves_100',
    name: 'Grand Puzzle master',
    description: 'Solve 100 puzzles in total.',
    icon: '👑',
  },
  {
    id: 'perfect_solver',
    name: 'Flawless Mind',
    description: 'Complete a puzzle with 0 hints, 0 mistakes, and 0 undos.',
    icon: '🔮',
  },
  {
    id: 'speed_runner',
    name: 'Speed Demon',
    description: 'Solve any 6x6 or larger puzzle in under 30 seconds.',
    icon: '⚡',
  },
  {
    id: 'streak_30',
    name: 'Dedicated Mind',
    description: 'Maintain a daily login streak of 30 days.',
    icon: '🔥',
  },
  {
    id: 'regions_1000',
    name: 'Cartographer',
    description: 'Complete 1,000 individual regions in total.',
    icon: '🗺️',
  },
];

export const Statistics = ({ profile, theme, onBack }: StatisticsProps) => {
  const winRate = profile.gamesPlayed > 0 
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) 
    : 0;

  const formatTime = (secs: number) => {
    if (secs === 0) return '-';
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statCards = [
    { label: 'Played', value: profile.gamesPlayed, icon: '🎮' },
    { label: 'Won', value: profile.gamesWon, icon: '🏆' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📈' },
    { label: 'Current Streak', value: `${profile.currentStreak} days`, icon: '🔥' },
    { label: 'Longest Streak', value: `${profile.longestStreak} days`, icon: '🌟' },
    { label: 'High Score', value: profile.highestScore, icon: '💎' },
    { label: 'Best Solve Time', value: formatTime(profile.bestTime), icon: '⏱️' },
    { label: 'Average Time', value: formatTime(profile.averageTime), icon: '⏳' },
  ];

  return (
    <div className={`flex flex-col gap-6 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-700/30">
        <h2 className={`text-2xl font-bold ${theme.accent || 'text-cyan-400'}`}>My Stats</h2>
        <button onClick={onBack} className={theme.btnSecondary}>
          Back
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((c, i) => (
          <div key={i} className={`p-4 flex flex-col justify-between rounded-2xl ${theme.cardBg}`}>
            <div className="flex items-center justify-between opacity-70 text-xs">
              <span>{c.label}</span>
              <span>{c.icon}</span>
            </div>
            <span className="text-xl font-extrabold mt-2 tracking-tight">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Achievements Card */}
      <div className={`p-5 flex flex-col gap-4 ${theme.cardBg}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Achievements</h3>
          <span className="text-xs opacity-75 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
            {profile.achievements.length} / {ACHIEVEMENTS_LIST.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isUnlocked = profile.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${isUnlocked 
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-100' 
                    : 'border-slate-800 bg-slate-950/40 opacity-50'}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner
                  ${isUnlocked ? 'bg-emerald-500/25 border border-emerald-500/35' : 'bg-slate-900 border border-slate-850'}
                `}>
                  {isUnlocked ? ach.icon : '🔒'}
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className={`text-sm font-bold truncate ${isUnlocked ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {ach.name}
                  </span>
                  <span className="text-xs opacity-65 leading-tight mt-0.5">
                    {ach.description}
                  </span>
                </div>
                {isUnlocked && (
                  <span className="text-emerald-400 text-xs font-mono font-bold bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/35">
                    UNLOCKED
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
