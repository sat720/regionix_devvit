import type { ScoreResult } from '../../shared/types';

export const calculateScore = (
  regionCount: number,
  timeElapsed: number, // in seconds
  hintsUsed: number,   // count of hints requested
  undoCount: number,
  mistakeCount: number,
  streak: number
): ScoreResult => {
  const baseScore = 1000;

  // Time Bonus: 15 seconds target per region.
  // For a board with 6 regions, target time is 90 seconds.
  const targetTime = regionCount * 15;
  const timeBonus = timeElapsed < targetTime 
    ? Math.min(1000, Math.round((targetTime - timeElapsed) * 8)) 
    : 0;

  // Hint Penalty: -150 per hint level
  const hintPenalty = hintsUsed * 150;

  // Undo Penalty: -5 per undo
  const undoPenalty = undoCount * 5;

  // Mistake Penalty: -50 per mistake (checking when wrong)
  const mistakePenalty = mistakeCount * 50;

  // Perfect Solve Bonus: +250 if no hints, undos, or mistakes
  const isPerfect = hintsUsed === 0 && undoCount === 0 && mistakeCount === 0;
  const perfectSolveBonus = isPerfect ? 250 : 0;

  // Final Score: clamp to a minimum of 0
  let finalScore = baseScore + timeBonus - hintPenalty - undoPenalty - mistakePenalty + perfectSolveBonus;
  
  // Add streak bonus if they have one (e.g. +20 per streak day, up to +100)
  if (streak > 1) {
    const streakBonus = Math.min(100, (streak - 1) * 20);
    finalScore += streakBonus;
  }

  finalScore = Math.max(10, finalScore); // Even with huge penalties, give 10 points for completion

  return {
    baseScore,
    timeBonus,
    hintPenalty,
    undoPenalty,
    mistakePenalty,
    perfectSolveBonus,
    finalScore,
  };
};
