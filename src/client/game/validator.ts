import type { RegionState, Seed, Constraint } from '../../shared/types';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  overlappedCells: Set<string>; // "x,y" keys of cells that overlap
  uncoveredCells: Set<string>;  // "x,y" keys of cells not covered by any region
  invalidRegionIds: Set<string>; // IDs of regions violating constraints
};

export const validateRegionConstraints = (region: RegionState, constraint: Constraint): { isValid: boolean; errors: string[] } => {
  const w = region.x2 - region.x1 + 1;
  const h = region.y2 - region.y1 + 1;
  const area = w * h;
  const errors: string[] = [];

  // 1. Seed enclosure check (seed must be inside the region coordinates)
  const containsSeed =
    region.seedX >= region.x1 &&
    region.seedX <= region.x2 &&
    region.seedY >= region.y1 &&
    region.seedY <= region.y2;

  if (!containsSeed) {
    errors.push('Region does not contain its seed cell.');
  }

  // 2. Area check
  if (constraint.area !== null && area !== constraint.area) {
    errors.push(`Expected area ${constraint.area}, but got ${area}.`);
  }

  // 3. Shape check
  if (constraint.shape === 'square' && w !== h) {
    errors.push('Region must be a square.');
  } else if (constraint.shape === 'rectangle' && w === h) {
    errors.push('Region must be a rectangle (width and height cannot be equal).');
  }

  // 4. Orientation check
  if (constraint.orientation === 'horizontal' && w <= h) {
    errors.push('Region must be horizontal (wider than it is tall).');
  } else if (constraint.orientation === 'vertical' && w >= h) {
    errors.push('Region must be vertical (taller than it is wide).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateBoard = (
  width: number,
  height: number,
  seeds: Seed[],
  regions: RegionState[]
): ValidationResult => {
  const errors: string[] = [];
  const overlappedCells = new Set<string>();
  const uncoveredCells = new Set<string>();
  const invalidRegionIds = new Set<string>();

  // Map to track which cells are occupied and by which region IDs
  const cellCoverage = new Map<string, string[]>();

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      cellCoverage.set(`${x},${y}`, []);
    }
  }

  // Populate cell coverage
  regions.forEach((r) => {
    // Validate individual region constraints first
    const seed = seeds.find((s) => s.id === r.id);
    if (seed) {
      const regionCheck = validateRegionConstraints(r, seed.constraint);
      if (!regionCheck.isValid) {
        invalidRegionIds.add(r.id);
        errors.push(`Region at (${r.seedX},${r.seedY}): ${regionCheck.errors.join(' ')}`);
      }
    }

    // Mark covered cells
    for (let x = r.x1; x <= r.x2; x++) {
      for (let y = r.y1; y <= r.y2; y++) {
        const key = `${x},${y}`;
        const currentList = cellCoverage.get(key) || [];
        currentList.push(r.id);
        cellCoverage.set(key, currentList);
      }
    }
  });

  // Check for overlaps, empty cells, and correct seed enclosure
  cellCoverage.forEach((owners, key) => {
    if (owners.length === 0) {
      uncoveredCells.add(key);
    } else if (owners.length > 1) {
      overlappedCells.add(key);
      owners.forEach((id) => invalidRegionIds.add(id));
    }
  });

  if (uncoveredCells.size > 0) {
    errors.push(`${uncoveredCells.size} cell(s) are empty / uncovered.`);
  }
  if (overlappedCells.size > 0) {
    errors.push('Some regions overlap each other.');
  }

  // Check seed enclosure counts (each region must contain exactly one seed, which must be its own)
  regions.forEach((r) => {
    let seedsInside = 0;
    let containsWrongSeed = false;

    seeds.forEach((s) => {
      const isInside = s.x >= r.x1 && s.x <= r.x2 && s.y >= r.y1 && s.y <= r.y2;
      if (isInside) {
        seedsInside++;
        if (s.id !== r.id) {
          containsWrongSeed = true;
        }
      }
    });

    if (seedsInside !== 1 || containsWrongSeed) {
      invalidRegionIds.add(r.id);
      if (seedsInside === 0) {
        errors.push(`Region starting from seed (${r.seedX},${r.seedY}) does not enclose its own seed.`);
      } else if (seedsInside > 1) {
        errors.push(`Region starting from seed (${r.seedX},${r.seedY}) encloses multiple seeds.`);
      }
    }
  });

  return {
    isValid: errors.length === 0 && invalidRegionIds.size === 0,
    errors,
    overlappedCells,
    uncoveredCells,
    invalidRegionIds,
  };
};
