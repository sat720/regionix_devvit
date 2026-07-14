import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';

type LeaderboardProps = {
  theme: ThemeColors;
  currentUsername: string;
  onBack: () => void;
};

export const Leaderboard = ({ theme, currentUsername, onBack }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/daily/leaderboard');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data.status === 'success') {
          setEntries(data.leaderboard || []);
        } else {
          throw new Error(data.message || 'Failed to fetch leaderboard');
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Could not load leaderboard data.');
      } finally {
        setLoading(false);
      }
    };

    void fetchLeaderboard();
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'text-yellow-400 font-extrabold text-base';
    if (index === 1) return 'text-slate-300 font-extrabold text-base';
    if (index === 2) return 'text-amber-600 font-extrabold text-base';
    return 'text-slate-400 font-semibold';
  };

  const todayStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`flex flex-col gap-6 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-700/30">
        <div className="flex flex-col">
          <h2 className={`text-2xl font-bold ${theme.accent || 'text-cyan-400'}`}>Leaderboard</h2>
          <span className="text-xs opacity-60 font-mono mt-0.5">{todayStr}</span>
        </div>
        <button onClick={onBack} className={theme.btnSecondary}>
          Back
        </button>
      </div>

      {/* Main List */}
      <div className={`p-4 flex flex-col gap-3 min-h-[300px] justify-center ${theme.cardBg}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 font-mono">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs opacity-70 mt-2">Retrieving standings...</span>
          </div>
        ) : error ? (
          <div className="text-center text-sm text-red-400 py-10 font-mono">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <span className="text-3xl">🧩</span>
            <span className="font-bold text-base">No solves today yet!</span>
            <p className="text-xs opacity-60 max-w-[240px] leading-relaxed">
              Be the first to complete the Daily Challenge and claim the #1 spot on Reddit!
            </p>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {/* Headers */}
            <div className="flex text-xs opacity-50 font-mono pb-2 border-b border-slate-800 text-left px-2">
              <span className="w-10">Rank</span>
              <span className="flex-1 min-w-0">Player</span>
              <span className="w-16 text-right">Score</span>
              <span className="w-20 text-right">Time</span>
            </div>

            {/* List entries */}
            <div className="flex flex-col gap-1.5 mt-2 max-h-[350px] overflow-y-auto pr-1">
              {entries.map((entry, idx) => {
                const isMe = entry.username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <div
                    key={idx}
                    className={`
                      flex items-center text-sm py-2.5 px-2 rounded-xl border text-left transition-all
                      ${isMe 
                        ? 'border-cyan-400/40 bg-cyan-500/10 scale-101 shadow-md shadow-cyan-500/5' 
                        : 'border-slate-850 bg-slate-950/20'}
                    `}
                  >
                    <span className={`w-10 text-center ${getRankStyle(idx)}`}>
                      {getRankBadge(idx)}
                    </span>
                    <span className={`flex-1 min-w-0 font-bold truncate ${isMe ? 'text-cyan-300' : ''}`}>
                      u/{entry.username}
                      {isMe && <span className="text-[0.7em] font-extrabold ml-1.5 bg-cyan-500 text-slate-950 px-1 py-0.5 rounded">YOU</span>}
                    </span>
                    <span className="w-16 text-right font-extrabold tracking-tight">
                      {entry.score}
                    </span>
                    <span className="w-20 text-right font-mono opacity-80 text-xs">
                      {formatTime(entry.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Footnote */}
      <div className="text-center text-[0.7em] opacity-45 leading-relaxed font-mono px-4 -mt-2">
        Leaderboard updates in real-time. Score calculates based on Base Score (1000) + Time Bonus. Penalty is applied for hints or undos. Ties are broken by the faster solve time.
      </div>
    </div>
  );
};
