import { useState, useEffect, useRef } from 'react';
import type { PlayerProfile, Puzzle, RegionState, ScoreResult, GameConfig } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';
import { generatePuzzle } from '../game/generator';
import { validateBoard } from '../game/validator';
import { getNextHint } from '../game/solver';
import { calculateScore } from '../game/score';
import { Board } from '../components/Board';

type GameScreenProps = {
  theme: ThemeColors;
  profile: PlayerProfile;
  serverDate: string;
  gameConfig: GameConfig;
  onBack: () => void;
  onNavigate: (page: string, params?: GameConfig) => void;
  onToggleTheme: () => void;
  onUpdateProfile: (updatedProfile: PlayerProfile) => void;
};

export const GameScreen = ({
  theme,
  profile,
  serverDate,
  gameConfig,
  onBack,
  onNavigate,
  onToggleTheme,
  onUpdateProfile,
}: GameScreenProps) => {
  const [puzzle] = useState<Puzzle>(() => {
    if (gameConfig.mode === 'daily') {
      const numSeed = parseInt(serverDate.replace(/-/g, '')) || 20260713;
      return generatePuzzle(gameConfig.width, gameConfig.height, gameConfig.difficulty, numSeed);
    } else if (gameConfig.mode === 'custom' && gameConfig.customPuzzle) {
      return gameConfig.customPuzzle;
    } else {
      return generatePuzzle(gameConfig.width, gameConfig.height, gameConfig.difficulty);
    }
  });

  const getSavedField = <T,>(field: string, fallback: T): T => {
    const saveKey = gameConfig.mode === 'daily'
      ? `regionix_save_daily_${serverDate}`
      : gameConfig.mode === 'custom'
        ? `regionix_save_custom_${gameConfig.customPuzzle?.seeds[0]?.id || ''}`
        : `regionix_save_practice`;
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed[field] !== undefined) {
          return parsed[field];
        }
      } catch (e) { /* ignore */ }
    }
    return fallback;
  };

  const [regions, setRegions] = useState<RegionState[]>(() => {
    const savedRegions = getSavedField<RegionState[] | null>('regions', null);
    if (savedRegions && Array.isArray(savedRegions) && savedRegions.length === puzzle.seeds.length) {
      return savedRegions;
    }
    return puzzle.seeds.map((s) => ({
      id: s.id,
      seedX: s.x,
      seedY: s.y,
      x1: s.x,
      y1: s.y,
      x2: s.x,
      y2: s.y,
      hintLevel: 0,
      isHinted: false,
    }));
  });

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  
  // Game stats
  const [timer, setTimer] = useState<number>(() => getSavedField<number>('timer', 0));
  const [hintsUsed, setHintsUsed] = useState<number>(() => getSavedField<number>('hintsUsed', 0));
  const [undoCount, setUndoCount] = useState<number>(() => getSavedField<number>('undoCount', 0));
  const [mistakeCount] = useState<number>(() => getSavedField<number>('mistakeCount', 0));
  const [undoHistory, setUndoHistory] = useState<RegionState[][]>(() => getSavedField<RegionState[][]>('undoHistory', []));
  
  // Solved state
  const [victory, setVictory] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Dynamic header and button classes depending on theme
  const btnSecondaryClass = theme.isDark
    ? 'bg-slate-900/60 border border-slate-800 hover:bg-slate-850/80 text-slate-300 font-bold'
    : 'bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold';

  const headerBadgeClass = theme.isDark
    ? 'text-slate-350 bg-slate-950 border-slate-850'
    : 'text-slate-650 bg-white border-slate-250 shadow-sm font-bold';

  const timerTextClass = theme.isDark
    ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.3)]'
    : 'text-emerald-700';

  const badgeThemeClass = theme.isDark
    ? 'text-yellow-400'
    : 'text-amber-650 font-bold';

  // Start ticking timer on mount and clean up on unmount
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Save progress state to localStorage on updates
  useEffect(() => {
    if (!puzzle || victory) return;

    const saveKey = gameConfig.mode === 'daily'
      ? `regionix_save_daily_${serverDate}`
      : gameConfig.mode === 'custom'
        ? `regionix_save_custom_${gameConfig.customPuzzle?.seeds[0]?.id || ''}`
        : `regionix_save_practice`;

    const saveState = {
      regions,
      timer,
      hintsUsed,
      undoCount,
      mistakeCount,
      undoHistory,
    };

    localStorage.setItem(saveKey, JSON.stringify(saveState));
  }, [regions, timer, hintsUsed, undoCount, mistakeCount, undoHistory, puzzle, victory, gameConfig, serverDate]);

  // Handle saving to undo stack
  const handleUndoSave = () => {
    const clone = regions.map((r) => ({ ...r }));
    setUndoHistory((prev) => [...prev.slice(-19), clone]); // keep last 20 steps
  };

  const handleUndo = () => {
    if (undoHistory.length === 0 || victory) return;

    const previous = undoHistory[undoHistory.length - 1];
    if (!previous) return;
    setRegions(previous);
    setUndoHistory((prev) => prev.slice(0, -1));
    setUndoCount((prev) => prev + 1);
    setErrorMessage(null);
  };

  const handleReset = () => {
    if (victory || !puzzle) return;

    handleUndoSave();
    const resetRegions = puzzle.seeds.map((s) => ({
      id: s.id,
      seedX: s.x,
      seedY: s.y,
      x1: s.x,
      y1: s.y,
      x2: s.x,
      y2: s.y,
      hintLevel: 0,
      isHinted: false,
    }));
    setRegions(resetRegions);
    setSelectedRegionId(null);
    setErrorMessage(null);
  };

  // Trigger progressive hint reveal
  const handleHint = async () => {
    if (victory || !puzzle) return;

    // Check diamonds
    if (profile.diamonds < 1) {
      alert('You need at least 1 Diamond to buy a hint! Create custom puzzles or solve daily challenges to earn more.');
      return;
    }

    const { updatedRegions, hintTargetId } = getNextHint(regions, puzzle.solution);

    if (!hintTargetId) {
      alert('Your board is already correctly solved!');
      return;
    }

    // Deduct 1 diamond in local profile first, and increment hint metrics
    handleUndoSave();
    setRegions(updatedRegions);
    setHintsUsed((prev) => prev + 1);
    setSelectedRegionId(hintTargetId);

    // Update profile diamonds on the server
    const nextProfile = {
      ...profile,
      diamonds: Math.max(0, profile.diamonds - 1),
    };
    onUpdateProfile(nextProfile);

    // Sync updated diamonds to server
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: nextProfile }),
      });
    } catch (err) {
      console.error('Failed to sync hint diamond deduction:', err);
    }
  };

  // Trigger successful validation & submission
  const triggerSolveSuccess = async () => {
    if (victory || !puzzle) return;

    // Solved successfully! Stop Timer
    if (timerRef.current) clearInterval(timerRef.current);
    setErrorMessage(null);

    // Clear saved progress from localStorage on success
    const saveKey = gameConfig.mode === 'daily'
      ? `regionix_save_daily_${serverDate}`
      : gameConfig.mode === 'custom'
        ? `regionix_save_custom_${gameConfig.customPuzzle?.seeds[0]?.id || ''}`
        : `regionix_save_practice`;
    localStorage.removeItem(saveKey);

    // Calculate score
    const finalScore = calculateScore(
      puzzle.seeds.length,
      timer,
      hintsUsed,
      undoCount,
      mistakeCount,
      profile.currentStreak
    );

    setScoreResult(finalScore);
    setVictory(true);
    setIsSubmitting(true);

    // Build next profile details
    const nextProfile = { ...profile };
    nextProfile.gamesPlayed += 1;
    nextProfile.gamesWon += 1;

    // Check perfect solve (0 hints, 0 undos, 0 mistakes)
    const isPerfect = hintsUsed === 0 && undoCount === 0 && mistakeCount === 0;
    if (isPerfect) {
      nextProfile.perfectSolves += 1;
      if (!nextProfile.achievements.includes('perfect_solver')) {
        nextProfile.achievements.push('perfect_solver');
      }
    }

    // Check speed runner (larger grids under 30s)
    if (puzzle.width >= 6 && timer < 30) {
      if (!nextProfile.achievements.includes('speed_runner')) {
        nextProfile.achievements.push('speed_runner');
      }
    }

    // Add general solves achievements
    if (nextProfile.gamesWon >= 100 && !nextProfile.achievements.includes('solves_100')) {
      nextProfile.achievements.push('solves_100');
    } else if (nextProfile.gamesWon >= 10 && !nextProfile.achievements.includes('solves_10')) {
      nextProfile.achievements.push('solves_10');
    }
    if (!nextProfile.achievements.includes('first_solve')) {
      nextProfile.achievements.push('first_solve');
    }

    // Track total regions completed (solving a puzzle increments by seed count)
    const totalRegionsKey = 'regionsCompletedCount';
    const currentTotalRegions = parseInt(localStorage.getItem(totalRegionsKey) || '0') + puzzle.seeds.length;
    localStorage.setItem(totalRegionsKey, currentTotalRegions.toString());
    if (currentTotalRegions >= 1000 && !nextProfile.achievements.includes('regions_1000')) {
      nextProfile.achievements.push('regions_1000');
    }

    // Update profile averages
    const totalPrevTime = (profile.gamesWon - 1) * profile.averageTime;
    nextProfile.averageTime = Math.round((totalPrevTime + timer) / nextProfile.gamesWon);

    if (profile.bestTime === 0 || timer < profile.bestTime) {
      nextProfile.bestTime = timer;
    }
    if (finalScore.finalScore > profile.highestScore) {
      nextProfile.highestScore = finalScore.finalScore;
    }

    try {
      if (gameConfig.mode === 'daily') {
        // Submit solve to daily database leaderboard and earn challenge diamonds
        const res = await fetch('/api/daily/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: finalScore.finalScore,
            time: timer,
            hints: hintsUsed,
            undos: undoCount,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (data.status === 'success') {
          // Sync server profile containing awarded daily solve bonus diamonds
          onUpdateProfile(data.profile);
        } else {
          onUpdateProfile(nextProfile);
        }
      } else {
        // Custom or Practice solves
        onUpdateProfile(nextProfile);

        // Sync local stats to server profile database
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: nextProfile }),
        });
      }
    } catch (err) {
      console.error('Failed to sync complete stats:', err);
      onUpdateProfile(nextProfile);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-check completed board for automatic submissions
  useEffect(() => {
    if (victory || !puzzle || regions.length === 0) return;

    const validation = validateBoard(puzzle.width, puzzle.height, puzzle.seeds, regions);

    if (validation.isValid) {
      const timeoutId = setTimeout(() => {
        void triggerSolveSuccess();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, puzzle, victory]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col gap-4 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-200/50">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer font-bold transition-all ${btnSecondaryClass}`}
          >
            Leave
          </button>
          <span className={`text-xs font-mono px-2 py-1 rounded border ${headerBadgeClass}`}>
            {gameConfig.mode === 'daily' ? 'DAILY CHALLENGE' : gameConfig.mode === 'custom' ? 'COMMUNITY PUZZLE' : 'PRACTICE'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleTheme}
            className={`text-xs p-1.5 rounded-lg cursor-pointer border transition-all ${btnSecondaryClass}`}
            title="Toggle theme"
          >
            {theme.isDark ? '☀️' : '🌙'}
          </button>
          <span className={`text-sm font-mono font-bold tracking-widest ${timerTextClass}`}>
            ⏱️ {formatTimer(timer)}
          </span>
          <span className={`text-xs font-bold ${badgeThemeClass}`}>
            💎 {profile.diamonds}
          </span>
        </div>
      </div>

      {/* Constraints Helper Sidebar details */}
      {selectedRegionId && puzzle && (
        <div className={`p-3 flex items-center justify-between text-xs font-mono rounded-xl ${theme.cardBg}`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.8em] opacity-60">SELECTED CONSTRAINT</span>
            <div className="flex items-center gap-2 mt-0.5">
              {(() => {
                const seed = puzzle.seeds.find((s) => s.id === selectedRegionId);
                const reg = regions.find((r) => r.id === selectedRegionId);
                if (!seed) return null;
                const { constraint } = seed;
                const w = reg ? (reg.x2 - reg.x1 + 1) : 1;
                const h = reg ? (reg.y2 - reg.y1 + 1) : 1;

                return (
                  <div className="flex items-center gap-3">
                    <span className={`font-bold uppercase ${theme.isDark ? 'text-cyan-300' : 'text-indigo-600'}`}>
                      Seed ({seed.x},{seed.y})
                    </span>
                    <span className="opacity-80">
                      {constraint.area ? `Area: ${constraint.area}` : 'Area: Any'}
                    </span>
                    <span className="opacity-80">
                      Shape: {constraint.shape.toUpperCase()}
                    </span>
                    {constraint.orientation !== 'any' && (
                      <span className="opacity-80">
                        Orient: {constraint.orientation.toUpperCase()}
                      </span>
                    )}
                    <span className={`font-bold px-1.5 rounded ${theme.isDark ? 'text-emerald-400 bg-emerald-950/20' : 'text-emerald-700 bg-emerald-100'}`}>
                      Current: {w}x{h}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Main Board */}
      {puzzle && (
        <div className="my-2">
          <Board
            width={puzzle.width}
            height={puzzle.height}
            seeds={puzzle.seeds}
            regions={regions}
            theme={theme}
            selectedRegionId={selectedRegionId}
            setSelectedRegionId={setSelectedRegionId}
            onUpdateRegions={setRegions}
            onUndoSave={handleUndoSave}
          />
        </div>
      )}

      {/* Validation Failure Toast message */}
      {errorMessage && (
        <div className="p-3 text-xs bg-red-950/20 border border-red-500/35 rounded-xl text-red-400 text-center font-mono animate-pulse">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Lower Toolbar */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        <button
          onClick={handleUndo}
          disabled={undoHistory.length === 0 || victory}
          className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all ${btnSecondaryClass}`}
        >
          <span className="text-base">↩️</span>
          <span className="text-[0.65em] font-mono mt-1 font-bold">Undo</span>
        </button>

        <button
          onClick={handleHint}
          disabled={victory}
          className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all ${btnSecondaryClass}`}
        >
          <span className="text-base">💡</span>
          <span className="text-[0.65em] font-mono mt-1 font-bold">Hint (-1💎)</span>
        </button>

        <button
          onClick={handleReset}
          disabled={victory}
          className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all ${btnSecondaryClass}`}
        >
          <span className="text-base">🔄</span>
          <span className="text-[0.65em] font-mono mt-1 font-bold">Reset</span>
        </button>
      </div>

      {/* Victory Summary Screen Overlay Modal */}
      {victory && scoreResult && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`w-full max-w-sm p-6 flex flex-col gap-4 text-center rounded-2xl shadow-2xl border ${theme.cardBg} ${theme.border}`}>
            <span className="text-5xl animate-bounce">🎉</span>
            <h2 className={`text-2xl font-black uppercase tracking-wider ${theme.text}`}>Victory!</h2>
            <p className="text-xs opacity-75 font-mono -mt-1">Puzzle Solved Successfully</p>
            
            {/* Score details */}
            <div className="flex flex-col border border-slate-800 rounded-xl p-3 bg-slate-950/30 gap-1.5 text-xs text-left font-mono">
              <div className="flex justify-between">
                <span className="opacity-75">Base Completion</span>
                <span className="font-bold text-slate-300">+{scoreResult.baseScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">Solve Time ({timer}s)</span>
                <span className="font-bold text-emerald-400">+{scoreResult.timeBonus}</span>
              </div>
              {hintsUsed > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Hint Penalty ({hintsUsed} consumed)</span>
                  <span className="font-bold">-{scoreResult.hintPenalty}</span>
                </div>
              )}
              {undoCount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Undo Penalty ({undoCount} times)</span>
                  <span className="font-bold">-{scoreResult.undoPenalty}</span>
                </div>
              )}
              {mistakeCount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Mistake Penalty ({mistakeCount} errors)</span>
                  <span className="font-bold">-{scoreResult.mistakePenalty}</span>
                </div>
              )}
              {scoreResult.perfectSolveBonus > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>✨ Perfect Solve Bonus</span>
                  <span>+{scoreResult.perfectSolveBonus}</span>
                </div>
              )}
              <div className="border-t border-slate-800 mt-2 pt-2 flex justify-between text-sm font-extrabold text-cyan-300">
                <span>FINAL SCORE</span>
                <span>{scoreResult.finalScore}</span>
              </div>
            </div>

            {/* Earnings info */}
            <div className="text-[0.7em] font-mono text-yellow-400 border border-yellow-500/20 bg-yellow-500/5 py-1.5 px-3 rounded-lg">
              {gameConfig.mode === 'daily' 
                ? '🏆 Daily solve: Awarded +10 💎 and registered score!' 
                : '💎 Train solve complete! Check stats for accomplishments.'}
            </div>

            {/* Modal actions */}
            <div className="flex flex-col gap-2 mt-1">
              {gameConfig.mode === 'daily' && (
                <button
                  onClick={() => onNavigate('leaderboard')}
                  disabled={isSubmitting}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'View Today Standings'}
                </button>
              )}
              <button
                onClick={onBack}
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 py-2 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
