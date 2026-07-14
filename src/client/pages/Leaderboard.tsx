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
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myDetails, setMyDetails] = useState<LeaderboardEntry | null>(null);
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
          setMyRank(data.myRank ?? null);
          setMyDetails(data.myDetails ?? null);
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
          <div className="flex flex-col w-full gap-4">
            {/* Global Top 3 Podium */}
            <div className="grid grid-cols-3 gap-2.5 items-end pb-4 border-b border-slate-200/20">
              {/* 2nd Place (Left) */}
              {entries[1] ? (() => {
                const is2ndMe = entries[1].username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <div className={`flex flex-col items-center p-3 rounded-xl border text-center min-h-[110px] justify-between transition-all ${is2ndMe ? (theme.isDark ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500' : 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-500 shadow-sm') : (theme.isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-250 bg-slate-50/20 shadow-sm')}`}>
                    <span className="text-2xl leading-none">🥈</span>
                    <div className="flex flex-col items-center mt-1 min-w-0 w-full">
                      <span className={`text-[0.65em] font-mono font-extrabold ${is2ndMe ? 'text-cyan-400' : 'opacity-70'}`}>
                        RANK #2 {is2ndMe && '(YOU)'}
                      </span>
                      <span className={`text-xs font-extrabold truncate w-full mt-0.5 ${is2ndMe ? (theme.isDark ? 'text-cyan-300' : 'text-indigo-650') : ''}`}>u/{entries[1].username}</span>
                    </div>
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-[0.7em] font-black">{entries[1].score}</span>
                      <span className="text-[0.6em] font-mono opacity-65">{formatTime(entries[1].time)}</span>
                    </div>
                  </div>
                );
              })() : (
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed opacity-30 text-center min-h-[110px] ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-xs font-mono text-slate-400">Empty</span>
                </div>
              )}

              {/* 1st Place (Center - taller/highlighted) */}
              {entries[0] ? (() => {
                const is1stMe = entries[0].username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <div className={`flex flex-col items-center p-4 rounded-xl border text-center min-h-[135px] justify-between scale-[1.03] shadow-md transition-all ${is1stMe ? (theme.isDark ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500' : 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-500 shadow-md') : (theme.isDark ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-amber-250 bg-amber-50/50')}`}>
                    <span className="text-3xl leading-none animate-bounce">🥇</span>
                    <div className="flex flex-col items-center mt-1 min-w-0 w-full">
                      <span className={`text-[0.65em] font-mono font-black ${is1stMe ? 'text-cyan-400' : 'text-amber-600'}`}>
                        CHAMPION {is1stMe && '(YOU)'}
                      </span>
                      <span className={`text-xs font-black truncate w-full mt-0.5 ${is1stMe ? (theme.isDark ? 'text-cyan-300' : 'text-indigo-650') : ''}`}>u/{entries[0].username}</span>
                    </div>
                    <div className="flex flex-col items-center mt-1">
                      <span className={`text-xs font-black ${is1stMe ? (theme.isDark ? 'text-cyan-300' : 'text-indigo-650') : 'text-amber-700'}`}>{entries[0].score}</span>
                      <span className="text-[0.6em] font-mono opacity-75">{formatTime(entries[0].time)}</span>
                    </div>
                  </div>
                );
              })() : (
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed opacity-30 text-center min-h-[135px] ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-xs font-mono text-slate-400">Empty</span>
                </div>
              )}

              {/* 3rd Place (Right) */}
              {entries[2] ? (() => {
                const is3rdMe = entries[2].username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <div className={`flex flex-col items-center p-3 rounded-xl border text-center min-h-[110px] justify-between transition-all ${is3rdMe ? (theme.isDark ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500' : 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-500 shadow-sm') : (theme.isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-250 bg-slate-50/20 shadow-sm')}`}>
                    <span className="text-2xl leading-none">🥉</span>
                    <div className="flex flex-col items-center mt-1 min-w-0 w-full">
                      <span className={`text-[0.65em] font-mono font-extrabold ${is3rdMe ? 'text-cyan-400' : 'opacity-70'}`}>
                        RANK #3 {is3rdMe && '(YOU)'}
                      </span>
                      <span className={`text-xs font-extrabold truncate w-full mt-0.5 ${is3rdMe ? (theme.isDark ? 'text-cyan-300' : 'text-indigo-650') : ''}`}>u/{entries[2].username}</span>
                    </div>
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-[0.7em] font-black">{entries[2].score}</span>
                      <span className="text-[0.6em] font-mono opacity-65">{formatTime(entries[2].time)}</span>
                    </div>
                  </div>
                );
              })() : (
                <div className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed opacity-30 text-center min-h-[110px] ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-xs font-mono text-slate-400">Empty</span>
                </div>
              )}
            </div>

            {/* If user is Rank 4 or worse, render exactly their row below the podium */}
            {myRank !== null && myRank >= 4 && myDetails && (
              <div className="flex flex-col w-full mt-2">
                <div className={`flex text-[0.65em] opacity-50 font-mono pb-1.5 border-b text-left px-2 ${theme.isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="w-10 text-center">Rank</span>
                  <span className="flex-1 min-w-0">Player</span>
                  <span className="w-16 text-right">Score</span>
                  <span className="w-20 text-right">Time</span>
                </div>
                
                <div className={`flex items-center text-xs py-2.5 px-3 rounded-xl border text-left mt-2 transition-all ${theme.isDark ? 'border-cyan-500/40 bg-cyan-500/10 shadow-md shadow-cyan-500/5 text-cyan-300' : 'border-indigo-300 bg-indigo-50/70 text-indigo-700 font-bold'}`}>
                  <span className="w-10 text-center font-mono font-black">
                    #{myRank}
                  </span>
                  <span className="flex-1 min-w-0 font-bold truncate">
                    u/{currentUsername} <span className={`text-[0.65em] font-extrabold ml-1.5 px-1 py-0.5 rounded ${theme.isDark ? 'bg-cyan-500 text-slate-950' : 'bg-indigo-650 text-white'}`}>YOU</span>
                  </span>
                  <span className="w-16 text-right font-extrabold tracking-tight">
                    {myDetails.score}
                  </span>
                  <span className="w-20 text-right font-mono opacity-90 text-[0.85em]">
                    {formatTime(myDetails.time)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Standing Card */}
      <div className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-1 shadow-inner transition-all duration-300 ${myRank ? (theme.isDark ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-indigo-200 bg-indigo-50/40') : (theme.isDark ? 'border-slate-850 bg-slate-950/30' : 'border-slate-200 bg-slate-50/40')}`}>
        {myRank ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="text-xs font-mono opacity-75">YOUR GLOBAL STANDING</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${theme.isDark ? 'text-cyan-300' : 'text-indigo-650'}`}>
                #{myRank}
              </span>
              <span className="text-[0.7em] opacity-60">OF {entries.length} SOLVERS</span>
            </div>
            {myDetails && (
              <div className="flex gap-4 mt-2 text-xs font-mono opacity-85">
                <span>Score: <strong className={theme.isDark ? 'text-slate-100' : 'text-slate-900'}>{myDetails.score}</strong></span>
                <span>Time: <strong className={theme.isDark ? 'text-slate-100' : 'text-slate-900'}>{formatTime(myDetails.time)}</strong></span>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-xl">🔒</span>
            <span className="text-xs font-mono opacity-65">YOUR GLOBAL STANDING</span>
            <span className={`text-sm font-black mt-1 ${theme.isDark ? 'text-slate-400' : 'text-slate-650'}`}>Unranked</span>
            <span className="text-[0.65em] opacity-55 mt-0.5">Solve today's Daily Challenge to see your rank!</span>
          </>
        )}
      </div>

      {/* Info Footnote */}
      <div className="text-center text-[0.7em] opacity-45 leading-relaxed font-mono px-4 -mt-2">
        Leaderboard updates in real-time. Score calculates based on Base Score + Time Bonus. Penalty is applied for hints or undos. Ties are broken by faster solve time.
      </div>
    </div>
  );
};
