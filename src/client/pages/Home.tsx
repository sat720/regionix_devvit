import { useState } from 'react';
import type { PlayerProfile, GameConfig } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';

type HomeProps = {
  profile: PlayerProfile;
  theme: ThemeColors;
  serverDate: string;
  onNavigate: (page: string, params?: GameConfig) => void;
  onToggleTheme: () => void;
};

export const Home = ({ profile, theme, serverDate, onNavigate, onToggleTheme }: HomeProps) => {
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [practiceSize, setPracticeSize] = useState<'5x6' | '6x6' | '7x6' | '8x8'>('6x6');
  const [practiceDifficulty, setPracticeDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Check if daily challenge was solved today
  const hasSolvedDaily = profile.lastDailyChallengeDate === serverDate;

  // Dynamic styling to adapt to light/dark themes
  const primaryCardClass = theme.isDark
    ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 text-slate-200'
    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm';

  const secondaryCardClass = theme.isDark
    ? 'border-slate-850 bg-slate-900/20 hover:bg-slate-900/40 text-slate-300'
    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650 shadow-sm';

  const selectBtnClass = (isSel: boolean) => {
    if (isSel) {
      return theme.isDark
        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-extrabold shadow-sm'
        : 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold shadow-sm';
    } else {
      return theme.isDark
        ? 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900/50'
        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100/50';
    }
  };

  const dailyBtnClass = hasSolvedDaily
    ? (theme.isDark ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50')
    : (theme.isDark ? 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:scale-[1.01] hover:shadow-lg' : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:scale-[1.01] hover:shadow-sm');

  const dailyTextClass = hasSolvedDaily
    ? 'text-emerald-500'
    : (theme.isDark ? 'text-cyan-300' : 'text-indigo-600');

  const badgeClass = theme.isDark
    ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/35'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-255';

  const handleStartPractice = () => {
    // Parse dimensions
    const parts = practiceSize.split('x');
    const width = parseInt(parts[0] || '6');
    const height = parseInt(parts[1] || '6');

    onNavigate('game', {
      mode: 'practice',
      width,
      height,
      difficulty: practiceDifficulty,
    });
  };

  const handleStartDaily = () => {
    if (hasSolvedDaily) return;
    onNavigate('game', {
      mode: 'daily',
      width: 7, // standardized dimensions for daily challenge
      height: 6,
      difficulty: 'medium',
    });
  };

  return (
    <div className={`flex flex-col gap-6 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Title & Brand Logo */}
      <div className="flex relative items-center justify-between w-full mt-4 border-b pb-3 border-slate-200/50">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧩</span>
          <div className="flex flex-col items-start">
            <h1 className={`text-2xl font-black tracking-wider uppercase leading-none ${theme.text}`}>
              Regionix
            </h1>
            <span className="text-[0.65em] opacity-60 font-mono mt-0.5">
              Logic Grid Partition Puzzle
            </span>
          </div>
        </div>
        <button
          onClick={onToggleTheme}
          className={`px-3 py-1.5 rounded-xl border cursor-pointer font-bold text-xs transition-all hover:scale-105 ${theme.isDark ? 'bg-slate-900 border-slate-800 text-yellow-400' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}
          title="Toggle theme"
        >
          {theme.isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* User Dashboard Summary */}
      <div className={`p-4 flex items-center justify-between shadow-md ${theme.cardBg}`}>
        <div className="flex flex-col">
          <span className="text-xs opacity-65 font-mono">PLAYER IDENTITY</span>
          <span className="font-extrabold text-sm truncate max-w-[150px]">u/{profile.username}</span>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs opacity-65 font-mono">STREAK</span>
            <span className="font-extrabold text-sm text-orange-450 drop-shadow-[0_0_2px_rgba(249,115,22,0.4)]">
              🔥 {profile.currentStreak} d
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs opacity-65 font-mono">DIAMONDS</span>
            <span className="font-extrabold text-sm text-yellow-400 drop-shadow-[0_0_2px_rgba(234,179,8,0.4)]">
              💎 {profile.diamonds}
            </span>
          </div>
        </div>
      </div>

      {/* Main Menu Links */}
      <div className="flex flex-col gap-3">
        {/* Daily Challenge Button */}
        <button
          onClick={handleStartDaily}
          disabled={hasSolvedDaily}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${dailyBtnClass} ${hasSolvedDaily ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex flex-col items-start text-left">
            <span className={`text-base font-extrabold flex items-center gap-1.5 ${dailyTextClass}`}>
              {hasSolvedDaily ? '✅ Daily Challenge Solved' : '🏆 Play Daily Challenge'}
            </span>
            <span className="text-xs opacity-65 mt-0.5">
              {hasSolvedDaily ? 'Solved for today! Come back tomorrow.' : 'Compete on today\'s date-seeded grid'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold font-mono opacity-85">Daily Rank</span>
            <span className="text-[0.7em] opacity-65 mt-0.5">Leaderboard</span>
          </div>
        </button>

        {/* Practice Mode Toggle */}
        <div className="flex flex-col w-full">
          <button
            onClick={() => setShowPracticeConfig(!showPracticeConfig)}
            className={`
              w-full flex items-center justify-between p-4 cursor-pointer transition-all rounded-2xl border ${primaryCardClass}
              ${showPracticeConfig ? (theme.isDark ? 'rounded-b-none border-b-transparent bg-slate-900/50' : 'rounded-b-none border-b-transparent bg-slate-50') : ''}
            `}
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-base font-extrabold">Practice Mode</span>
              <span className="text-xs opacity-65 mt-0.5">Train on customizable dimensions</span>
            </div>
            <span className="text-lg transition-transform duration-200" style={{ transform: showPracticeConfig ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>

          {/* Practice Configuration Sliding Menu */}
          {showPracticeConfig && (
            <div className={`p-4 flex flex-col gap-4 border border-t-transparent rounded-b-2xl -mt-1 shadow-inner ${theme.isDark ? 'border-slate-850 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'}`}>
              {/* Grid Size Selectors */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.7em] opacity-65 font-mono">SELECT BOARD SIZE</span>
                <div className="flex gap-1.5">
                  {(['5x6', '6x6', '7x6', '8x8'] as const).map((sz) => {
                    const isSel = practiceSize === sz;
                    return (
                      <button
                        key={sz}
                        onClick={() => setPracticeSize(sz)}
                        className={`flex-1 text-xs py-2 rounded-xl cursor-pointer border text-center transition-all font-mono ${selectBtnClass(isSel)}`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.7em] opacity-65 font-mono">SELECT DIFFICULTY</span>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => {
                    const isSel = practiceDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        onClick={() => setPracticeDifficulty(diff)}
                        className={`flex-1 text-xs py-2 rounded-xl cursor-pointer border text-center transition-all uppercase ${selectBtnClass(isSel)}`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleStartPractice}
                className={`w-full text-center text-xs py-2.5 font-bold uppercase mt-1 cursor-pointer transition-colors ${theme.btnPrimary}`}
              >
                Launch Practice Grid
              </button>
            </div>
          )}
        </div>

        {/* Level Creator button */}
        <button
          onClick={() => onNavigate('creator')}
          className={`w-full flex items-center justify-between p-4 cursor-pointer transition-all border rounded-2xl ${primaryCardClass}`}
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-base font-extrabold">Level Creator</span>
            <span className="text-xs opacity-65 mt-0.5">Design a board & post to Subreddit</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${badgeClass}`}>
            +15 💎
          </span>
        </button>

        {/* Stats, Leaderboard, Settings icons grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          <button
            onClick={() => onNavigate('leaderboard')}
            className={`flex flex-col items-center justify-center p-3.5 border rounded-2xl cursor-pointer ${secondaryCardClass}`}
          >
            <span className="text-xl">🏆</span>
            <span className="text-[0.65em] font-mono mt-1 opacity-75">Leaderboard</span>
          </button>
          <button
            onClick={() => onNavigate('stats')}
            className={`flex flex-col items-center justify-center p-3.5 border rounded-2xl cursor-pointer ${secondaryCardClass}`}
          >
            <span className="text-xl">📊</span>
            <span className="text-[0.65em] font-mono mt-1 opacity-75">My Stats</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`flex flex-col items-center justify-center p-3.5 border rounded-2xl cursor-pointer ${secondaryCardClass}`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-[0.65em] font-mono mt-1 opacity-75">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
