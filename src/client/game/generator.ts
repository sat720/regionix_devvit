import type { Puzzle, Seed, RegionState, Constraint, ShapeConstraint, OrientationConstraint } from '../../shared/types';

// Simple seedable PRNG (Mulberry32)
export const createPRNG = (seed: number) => {
  let h = seed;
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let imul = Math.imul(h ^ (h >>> 15), h | 1);
    imul = (imul + Math.imul(imul ^ (imul >>> 7), imul | 61)) | 0;
    return ((imul ^ (imul >>> 14)) >>> 0) / 4294967296;
  };
};

type Rect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export const generatePuzzle = (
  width: number,
  height: number,
  difficulty: 'easy' | 'medium' | 'hard',
  seedValue?: number
): Puzzle => {
  // Use seeded random if seedValue is provided, otherwise Math.random
  const random = seedValue !== undefined ? createPRNG(seedValue) : Math.random;

  const rects: Rect[] = [{ x1: 0, y1: 0, x2: width - 1, y2: height - 1 }];

  // Target number of regions based on board size
  const totalCells = width * height;
  let targetRegions = Math.floor(totalCells / 6); // Average region size ~6 cells
  if (difficulty === 'easy') {
    targetRegions = Math.floor(totalCells / 5.5); // Slightly smaller regions, easier to solve
  } else if (difficulty === 'hard') {
    targetRegions = Math.floor(totalCells / 7); // Slightly larger regions, harder to solve
  }
  // Ensure we have at least 2 regions and no more than totalCells
  targetRegions = Math.max(2, Math.min(targetRegions, totalCells - 1));

  let attempts = 0;
  while (rects.length < targetRegions && attempts < 200) {
    attempts++;

    // Find splittable rectangles (width >= 2 or height >= 2)
    const splittableIndices: number[] = [];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;
      const w = r.x2 - r.x1 + 1;
      const h = r.y2 - r.y1 + 1;
      if (w >= 2 || h >= 2) {
        splittableIndices.push(i);
      }
    }

    if (splittableIndices.length === 0) break;

    // Pick a random splittable rectangle
    const pickIndex = splittableIndices[Math.floor(random() * splittableIndices.length)];
    if (pickIndex === undefined) continue;
    const target = rects[pickIndex];
    if (!target) continue;
    const w = target.x2 - target.x1 + 1;
    const h = target.y2 - target.y1 + 1;

    // Decide split direction: horizontal or vertical
    let splitVertical = false;
    if (w >= 2 && h >= 2) {
      // Split vertical (cut width) or horizontal (cut height)
      splitVertical = random() < 0.5;
    } else if (w >= 2) {
      splitVertical = true;
    }

    if (splitVertical) {
      // Choose split column (avoid leaving 0-width)
      // We want to avoid making regions too thin/unbalanced if possible, but 1-wide is okay
      const splitPoint = target.x1 + Math.floor(random() * (w - 1));
      rects.splice(
        pickIndex,
        1,
        { x1: target.x1, y1: target.y1, x2: splitPoint, y2: target.y2 },
        { x1: splitPoint + 1, y1: target.y1, x2: target.x2, y2: target.y2 }
      );
    } else {
      // Choose split row
      const splitPoint = target.y1 + Math.floor(random() * (h - 1));
      rects.splice(
        pickIndex,
        1,
        { x1: target.x1, y1: target.y1, x2: target.x2, y2: splitPoint },
        { x1: target.x1, y1: splitPoint + 1, x2: target.x2, y2: target.y2 }
      );
    }
  }

  // Create seeds and solution states from partitioned rectangles
  const seeds: Seed[] = [];
  const solution: RegionState[] = [];

  // Determine clue reveal chances based on difficulty
  // Easy: 85% area reveal, Medium: 50% area reveal, Hard: 25% area reveal
  let areaRevealChance = 0.5;
  if (difficulty === 'easy') areaRevealChance = 0.85;
  else if (difficulty === 'hard') areaRevealChance = 0.25;

  rects.forEach((r, index) => {
    const id = `region_${index}`;
    const rw = r.x2 - r.x1 + 1;
    const rh = r.y2 - r.y1 + 1;
    const area = rw * rh;

    // Pick a random seed cell inside this rectangle
    const seedX = r.x1 + Math.floor(random() * rw);
    const seedY = r.y1 + Math.floor(random() * rh);

    // Determine shape constraint
    const shape: ShapeConstraint = rw === rh
      ? (random() < 0.6 ? 'square' : 'any')
      : (random() < 0.6 ? 'rectangle' : 'any');

    // Determine orientation constraint (only if rectangle shape constraint or 'any')
    let orientation: OrientationConstraint = 'any';
    if (shape !== 'square' && rw !== rh) {
      // 60% chance to specify orientation if it is a rectangle
      if (random() < 0.6) {
        orientation = rw > rh ? 'horizontal' : 'vertical';
      }
    }

    // Determine if area number is shown
    // Ensure we reveal area for at least some seeds so it's solvable
    // (We also force area if shape is 'any' and orientation is 'any' so it's not a blind guess)
    const forceArea = shape === 'any' && orientation === 'any';
    const showArea = forceArea || random() < areaRevealChance;

    const constraint: Constraint = {
      shape,
      orientation,
      area: showArea ? area : null,
    };

    seeds.push({
      id,
      x: seedX,
      y: seedY,
      colorIndex: index % 8, // Cycle through available theme colors
      constraint,
    });

    solution.push({
      id,
      seedX,
      seedY,
      x1: r.x1,
      y1: r.y1,
      x2: r.x2,
      y2: r.y2,
    });
  });

  return {
    width,
    height,
    seeds,
    solution,
  };
};
