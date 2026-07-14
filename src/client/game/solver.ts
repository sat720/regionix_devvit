import type { Seed, RegionState } from '../../shared/types';

// Generate all possible valid rectangles for a given seed that fit within W x H and contain the seed
export const getValidRectanglesForSeed = (
  width: number,
  height: number,
  seed: Seed,
  allSeeds: Seed[]
): RegionState[] => {
  const rects: RegionState[] = [];
  const { x: sx, y: sy, id } = seed;
  const { shape, orientation, area } = seed.constraint;

  // Define min and max dimensions to check
  const minDim = 1;
  const maxW = width;
  const maxH = height;

  for (let w = minDim; w <= maxW; w++) {
    for (let h = minDim; h <= maxH; h++) {
      // 1. Check area constraint
      if (area !== null && w * h !== area) continue;

      // 2. Check shape constraints
      if (shape === 'square' && w !== h) continue;
      if (shape === 'rectangle' && w === h) continue;

      // 3. Check orientation constraints
      if (orientation === 'horizontal' && w <= h) continue;
      if (orientation === 'vertical' && w >= h) continue;

      // Iterate through all possible top-left positions (x1, y1) such that the rectangle encloses (sx, sy)
      // The rectangle spans from [x1, y1] to [x1 + w - 1, y1 + h - 1]
      // Enclosing (sx, sy) means:
      // x1 <= sx <= x1 + w - 1  =>  sx - w + 1 <= x1 <= sx
      // y1 <= sy <= y1 + h - 1  =>  sy - h + 1 <= y1 <= sy
      const minX1 = Math.max(0, sx - w + 1);
      const maxX1 = Math.min(width - w, sx);
      const minY1 = Math.max(0, sy - h + 1);
      const maxY1 = Math.min(height - h, sy);

      for (let x1 = minX1; x1 <= maxX1; x1++) {
        for (let y1 = minY1; y1 <= maxY1; y1++) {
          const x2 = x1 + w - 1;
          const y2 = y1 + h - 1;

          // Verify this rectangle does not enclose any OTHER seeds
          let containsOtherSeed = false;
          for (const os of allSeeds) {
            if (os.id === id) continue;
            if (os.x >= x1 && os.x <= x2 && os.y >= y1 && os.y <= y2) {
              containsOtherSeed = true;
              break;
            }
          }

          if (!containsOtherSeed) {
            rects.push({
              id,
              seedX: sx,
              seedY: sy,
              x1,
              y1,
              x2,
              y2,
            });
          }
        }
      }
    }
  }

  return rects;
};

// Solve a board configuration using Backtracking Search
// Used by the custom level creator to check if a user puzzle is solvable and/or has a unique solution
export const solvePuzzle = (
  width: number,
  height: number,
  seeds: Seed[]
): RegionState[][] => {
  const solutions: RegionState[][] = [];
  if (seeds.length === 0) return [];

  // Generate all possible valid rectangles for each seed
  const seedOptions = seeds.map((seed) => ({
    seed,
    options: getValidRectanglesForSeed(width, height, seed, seeds),
  }));

  // Sort seeds by MRV (Minimum Remaining Values) to optimize backtracking
  seedOptions.sort((a, b) => a.options.length - b.options.length);

  const placed: RegionState[] = [];
  const grid = Array.from({ length: width }, () => new Array<boolean>(height).fill(false));

  const canPlace = (r: RegionState): boolean => {
    for (let x = r.x1; x <= r.x2; x++) {
      const col = grid[x];
      if (!col) return false;
      for (let y = r.y1; y <= r.y2; y++) {
        if (col[y]) return false;
      }
    }
    return true;
  };

  const togglePlacement = (r: RegionState, state: boolean) => {
    for (let x = r.x1; x <= r.x2; x++) {
      const col = grid[x];
      if (col) {
        for (let y = r.y1; y <= r.y2; y++) {
          col[y] = state;
        }
      }
    }
  };

  const backtrack = (seedIndex: number) => {
    // If we have placed all seeds, check if the grid is fully covered
    if (seedIndex === seedOptions.length) {
      let coveredCount = 0;
      for (let x = 0; x < width; x++) {
        const col = grid[x];
        if (col) {
          for (let y = 0; y < height; y++) {
            if (col[y]) coveredCount++;
          }
        }
      }

      if (coveredCount === width * height) {
        solutions.push([...placed]);
      }
      return;
    }

    // Stop searching if we already found 2 solutions (not unique)
    if (solutions.length >= 2) return;

    const currentOption = seedOptions[seedIndex];
    if (!currentOption) return;
    const { options } = currentOption;
    for (const opt of options) {
      if (canPlace(opt)) {
        // Place
        togglePlacement(opt, true);
        placed.push(opt);

        // Recurse
        backtrack(seedIndex + 1);

        // Unplace
        placed.pop();
        togglePlacement(opt, false);
      }
    }
  };

  backtrack(0);
  return solutions;
};

// Help helper: picks the next unsolved region and increments its hint level
// Returns the updated regions and the region ID that was updated
export const getNextHint = (
  currentRegions: RegionState[],
  solution: RegionState[]
): { updatedRegions: RegionState[]; hintTargetId: string | null } => {
  // Find regions that do not match the reference solution
  const unsolvedRegions = solution.filter((solRegion) => {
    const curr = currentRegions.find((r) => r.id === solRegion.id);
    if (!curr) return true;
    return (
      curr.x1 !== solRegion.x1 ||
      curr.y1 !== solRegion.y1 ||
      curr.x2 !== solRegion.x2 ||
      curr.y2 !== solRegion.y2
    );
  });

  if (unsolvedRegions.length === 0) {
    return { updatedRegions: currentRegions, hintTargetId: null };
  }

  // Pick the first unsolved region in the solution array (can be sorted or random, let's keep it sequential)
  const targetSol = unsolvedRegions[0];
  if (!targetSol) {
    return { updatedRegions: currentRegions, hintTargetId: null };
  }
  const targetId = targetSol.id;

  const updatedRegions = currentRegions.map((r) => {
    if (r.id !== targetId) return r;

    const currentLevel = r.hintLevel || 0;
    const nextLevel = Math.min(3, currentLevel + 1) as 0 | 1 | 2 | 3;

    let x1 = r.x1;
    let y1 = r.y1;
    let x2 = r.x2;
    let y2 = r.y2;

    if (nextLevel === 1) {
      // Stage 1: Keep current position, but in UI we'll draw the dotted outline of targetSol
      // No coordinate change
    } else if (nextLevel === 2) {
      // Stage 2: Lock one correct dimension or shrink towards solution
      // For partial solution, we set it to be a 50% midpoint towards correct, or lock in the width
      // Let's set it to be a sub-rectangle of targetSol that encloses the seed
      // For instance, let's span the width to targetSol but keep height at 1 cell centered on seed
      x1 = targetSol.x1;
      x2 = targetSol.x2;
      y1 = r.seedY;
      y2 = r.seedY;
    } else if (nextLevel === 3) {
      // Stage 3: Lock in exact solution
      x1 = targetSol.x1;
      y1 = targetSol.y1;
      x2 = targetSol.x2;
      y2 = targetSol.y2;
    }

    return {
      ...r,
      x1,
      y1,
      x2,
      y2,
      hintLevel: nextLevel,
      isHinted: nextLevel === 3, // mark as locked if level 3
    };
  });

  return { updatedRegions, hintTargetId: targetId };
};
