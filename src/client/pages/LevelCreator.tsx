import { useState } from 'react';
import type { Seed, Constraint, ShapeConstraint, OrientationConstraint } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';
import { solvePuzzle } from '../game/solver';
import { navigateTo } from '@devvit/web/client';

type LevelCreatorProps = {
  theme: ThemeColors;
  onBack: () => void;
  onToggleTheme: () => void;
  onProfileUpdate: (diamondsAwarded: number) => void;
};

export const LevelCreator = ({ theme, onBack, onToggleTheme, onProfileUpdate }: LevelCreatorProps) => {
  const width = 6;
  const height = 6;

  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  
  // Validation states
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    solvable: boolean;
    isUnique: boolean;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const getSeedAt = (x: number, y: number) => {
    return seeds.find((s) => s.x === x && s.y === y) || null;
  };

  const handleCellClick = (x: number, y: number) => {
    // Reset validation state on change
    setValidationResult(null);
    setPublishedUrl(null);

    const existing = getSeedAt(x, y);
    if (existing) {
      // Select for editing
      setSelectedSeedId(existing.id);
    } else {
      // Create new seed
      const newId = `seed_${seeds.length}_${x}_${y}`;
      const newSeed: Seed = {
        id: newId,
        x,
        y,
        colorIndex: seeds.length % 8,
        constraint: {
          shape: 'any',
          orientation: 'any',
          area: null,
        },
      };
      setSeeds([...seeds, newSeed]);
      setSelectedSeedId(newId);
    }
  };

  const handleRemoveSeed = (id: string) => {
    setValidationResult(null);
    setPublishedUrl(null);
    setSeeds(seeds.filter((s) => s.id !== id));
    if (selectedSeedId === id) setSelectedSeedId(null);
  };

  const handleUpdateConstraint = (id: string, updates: Partial<Constraint>) => {
    setValidationResult(null);
    setPublishedUrl(null);
    setSeeds(
      seeds.map((s) => {
        if (s.id === id) {
          const constraint = { ...s.constraint, ...updates };
          // Enforce semantic correction: if shape is square, orientation must be 'any'
          if (constraint.shape === 'square') {
            constraint.orientation = 'any';
          }
          return {
            ...s,
            constraint,
          };
        }
        return s;
      })
    );
  };

  const handleUpdateColor = (id: string, colorIndex: number) => {
    setValidationResult(null);
    setPublishedUrl(null);
    setSeeds(
      seeds.map((s) => (s.id === id ? { ...s, colorIndex } : s))
    );
  };

  const handleClear = () => {
    setSeeds([]);
    setSelectedSeedId(null);
    setValidationResult(null);
    setPublishedUrl(null);
  };

  // Validate that the puzzle has solutions using our backtrack solver
  const handleValidate = () => {
    if (seeds.length === 0) {
      setValidationResult({
        tested: true,
        solvable: false,
        isUnique: false,
        message: 'Place at least one seed on the board first!',
      });
      return;
    }

    // Solve
    const solutions = solvePuzzle(width, height, seeds);

    if (solutions.length === 0) {
      setValidationResult({
        tested: true,
        solvable: false,
        isUnique: false,
        message: 'Puzzle is unsolvable. Try changing constraints or adding/removing seeds.',
      });
    } else if (solutions.length === 1) {
      setValidationResult({
        tested: true,
        solvable: true,
        isUnique: true,
        message: 'Solvable with a unique solution! Ready to publish.',
      });
    } else {
      // solutions.length >= 2
      setValidationResult({
        tested: true,
        solvable: true,
        isUnique: false,
        message: 'Solvable! (Note: It has multiple solutions, which is allowed but less challenging).',
      });
    }
  };

  // Publish custom puzzle to Subreddit as a new post
  const handlePublish = async () => {
    if (!validationResult || !validationResult.solvable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/custom-puzzle/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width,
          height,
          seeds,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === 'success') {
        setPublishedUrl(data.postUrl);
        // Award 15 diamonds to profile
        onProfileUpdate(15);
      } else {
        alert(data.message || 'Failed to publish puzzle.');
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Error publishing level. Check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSeed = seeds.find((s) => s.id === selectedSeedId);

  const inputBgClass = theme.isDark
    ? 'bg-slate-950 border-slate-850 text-slate-100'
    : 'bg-slate-50 border-slate-200 text-slate-700';

  const btnSecondaryClass = theme.isDark
    ? 'bg-slate-900/60 border border-slate-800 hover:bg-slate-850/80 text-slate-300 font-bold'
    : 'bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold';

  const controlBtnClass = theme.isDark
    ? 'bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-250 font-bold'
    : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm font-bold';

  const selectBtnClass = (isSel: boolean) => {
    if (isSel) {
      return theme.isDark
        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-extrabold shadow-sm text-xs'
        : 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold shadow-sm text-xs';
    } else {
      return theme.isDark
        ? 'bg-slate-950 border-slate-850 text-slate-450 hover:bg-slate-900/50 text-xs'
        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100/50 text-xs';
    }
  };

  const getSeedShapeClasses = (seed: Seed) => {
    const { constraint } = seed;
    let shapeClass = 'w-[82%] h-[82%] rounded-xl';
    let borderClass = 'border border-white/20';

    if (constraint.shape === 'square') {
      shapeClass = 'w-[75%] h-[75%] aspect-square rounded-xl';
    } else if (constraint.shape === 'rectangle') {
      if (constraint.orientation === 'horizontal') {
        shapeClass = 'w-[90%] h-[55%] rounded-lg';
      } else if (constraint.orientation === 'vertical') {
        shapeClass = 'w-[55%] h-[90%] rounded-lg';
      } else {
        // Rectangle, orientation any -> "both but dotted"
        shapeClass = 'w-[82%] h-[82%] rounded-xl';
        borderClass = 'border-2 border-dashed border-white/70';
      }
    } else if (constraint.shape === 'any') {
      if (constraint.orientation === 'horizontal') {
        shapeClass = 'w-[90%] h-[60%] rounded-lg';
      } else if (constraint.orientation === 'vertical') {
        shapeClass = 'w-[60%] h-[90%] rounded-lg';
      } else {
        shapeClass = 'w-[82%] h-[82%] rounded-xl';
      }
    }

    return `${shapeClass} ${borderClass}`;
  };

  return (
    <div className={`flex flex-col gap-5 w-full max-w-md mx-auto p-4 ${theme.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 border-slate-200/50">
        <div className="flex flex-col">
          <h2 className={`text-2xl font-bold ${theme.accent || 'text-cyan-400'}`}>Level Creator</h2>
          <span className="text-xs opacity-60 font-mono mt-0.5">Design & publish puzzles</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className={`text-xs p-1.5 rounded-lg cursor-pointer border transition-all ${btnSecondaryClass}`}
            title="Toggle theme"
          >
            {theme.isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={onBack} className={theme.btnSecondary}>
            Back
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex flex-col items-center">
        <div
          className={`grid rounded-xl overflow-hidden border p-1 w-full aspect-square max-w-[280px] ${theme.gridBg} ${theme.border}`}
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((_, x) => {
              const seed = getSeedAt(x, y);
              const isSelected = seed && selectedSeedId === seed.id;

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  className={`
                    relative flex items-center justify-center aspect-square border cursor-pointer transition-all duration-150
                    ${theme.gridLine} border-t border-b border-l border-r opacity-90 hover:bg-white/5
                    ${isSelected ? 'bg-white/10 scale-95 ring-1 ring-cyan-400' : ''}
                  `}
                  style={{ borderWidth: '0.5px' }}
                >
                  {seed && (
                    <div
                      className={`
                        flex items-center justify-center shadow-md font-bold text-xs text-white select-none
                        ${((theme.regionBorderColors[seed.colorIndex] || '').split(' ')[0] || '').replace('border-', 'bg-').replace(' shadow-', '')}
                        ${getSeedShapeClasses(seed)}
                      `}
                    >
                      {seed.constraint.area || ''}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Board actions */}
        <div className="flex gap-3 mt-3 w-full max-w-[280px]">
          <button
            onClick={handleClear}
            className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs py-2 rounded-xl cursor-pointer"
          >
            Clear Grid
          </button>
          <button
            onClick={handleValidate}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 rounded-xl cursor-pointer shadow-md shadow-cyan-950/20"
          >
            Check Solvable
          </button>
        </div>
      </div>

      {/* Info / Validation Feedback */}
      {validationResult && (
        <div className={`p-3 text-xs rounded-xl border text-center font-mono ${
          validationResult.solvable 
            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/35 text-red-400'
        }`}>
          {validationResult.message}
        </div>
      )}

      {/* Customize Selected Seed Panel */}
      {selectedSeed && (
        <div className={`p-4 flex flex-col gap-3.5 ${theme.cardBg}`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold font-mono">EDIT SEED ({selectedSeed.x}, {selectedSeed.y})</span>
            <button
              onClick={() => handleRemoveSeed(selectedSeed.id)}
              className="text-[0.7em] text-red-400 border border-red-500/35 px-2 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
            >
              Delete
            </button>
          </div>

          {/* Color pickers */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.7em] opacity-65 font-mono">COLOR SELECTOR</span>
            <div className="flex gap-2">
              {theme.regionBorderColors.map((borderClass: string, colorIdx: number) => {
                const bgClass = (borderClass.split(' ')[0] || '').replace('border-', 'bg-').replace(' shadow-', '');
                const isSelected = selectedSeed && selectedSeed.colorIndex === colorIdx;
                return (
                  <button
                    key={colorIdx}
                    onClick={() => selectedSeed && handleUpdateColor(selectedSeed.id, colorIdx)}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${bgClass} border border-white/20 ${
                      isSelected ? 'scale-120 ring-2 ring-white/50' : 'hover:scale-110'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Constraint editing selectors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Area constraint */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7em] opacity-65 font-mono">AREA CLUE</span>
              <div className={`flex items-center gap-1.5 border p-1.5 rounded-lg ${inputBgClass}`}>
                <button
                  disabled={selectedSeed.constraint.area === null}
                  onClick={() => {
                    const area = selectedSeed.constraint.area;
                    if (area && area > 1) handleUpdateConstraint(selectedSeed.id, { area: area - 1 });
                  }}
                  className={`w-6 h-6 flex items-center justify-center border rounded disabled:opacity-40 ${controlBtnClass}`}
                >
                  -
                </button>
                <button
                  onClick={() => {
                    const isNull = selectedSeed.constraint.area === null;
                    handleUpdateConstraint(selectedSeed.id, { area: isNull ? 4 : null });
                  }}
                  className="flex-1 text-center font-bold text-xs min-h-[24px] flex items-center justify-center cursor-pointer"
                >
                  {selectedSeed.constraint.area || 'None'}
                </button>
                <button
                  disabled={selectedSeed.constraint.area === null}
                  onClick={() => {
                    const area = selectedSeed.constraint.area || 1;
                    if (area < 36) handleUpdateConstraint(selectedSeed.id, { area: area + 1 });
                  }}
                  className={`w-6 h-6 flex items-center justify-center border rounded disabled:opacity-40 ${controlBtnClass}`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Shape constraint */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7em] opacity-65 font-mono">SHAPE CLUE</span>
              <select
                value={selectedSeed.constraint.shape}
                onChange={(e) =>
                  handleUpdateConstraint(selectedSeed.id, { shape: e.target.value as ShapeConstraint })
                }
                className={`border p-1.5 rounded-lg text-xs font-mono w-full min-h-[34px] cursor-pointer ${inputBgClass}`}
              >
                <option value="any">Any (●)</option>
                <option value="square">Square (■)</option>
                <option value="rectangle">Rectangle (▬)</option>
              </select>
            </div>
          </div>

          {/* Orientation selector - Only show if shape is rectangle or any */}
          {selectedSeed.constraint.shape !== 'square' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7em] opacity-65 font-mono">ORIENTATION CONSTRAINT</span>
              <div className="flex gap-2">
                {(['any', 'horizontal', 'vertical'] as OrientationConstraint[]).map((orient) => {
                  const isSel = selectedSeed.constraint.orientation === orient;
                  return (
                    <button
                      key={orient}
                      onClick={() => handleUpdateConstraint(selectedSeed.id, { orientation: orient })}
                      className={`flex-1 font-mono py-1 rounded cursor-pointer border text-center transition-colors ${selectBtnClass(isSel)}`}
                    >
                      {orient.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publish Block */}
      {validationResult && validationResult.solvable && !publishedUrl && (
        <button
          onClick={handlePublish}
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl cursor-pointer transition-colors shadow-lg shadow-emerald-950/20 border border-emerald-500/20 text-center uppercase"
        >
          {isSubmitting ? 'Publishing to Subreddit...' : '🚀 Publish to Subreddit (+15 💎)'}
        </button>
      )}

      {/* Success Published Block */}
      {publishedUrl && (
        <div className="p-5 flex flex-col items-center gap-4 bg-emerald-950/25 border border-emerald-500/35 rounded-2xl text-center">
          <span className="text-3xl animate-bounce">🎉</span>
          <h3 className="text-base font-extrabold text-emerald-300">Puzzle Successfully Published!</h3>
          <p className="text-xs opacity-75 max-w-[260px] leading-relaxed">
            Your custom logic puzzle has been posted to the subreddit. Other members can play it in their feeds!
          </p>
          <button
            onClick={() => navigateTo(publishedUrl)}
            className="bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer shadow-md shadow-emerald-950/30"
          >
            Open Reddit Post
          </button>
        </div>
      )}
    </div>
  );
};
