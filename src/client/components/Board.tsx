import React, { useState, useRef, useEffect } from 'react';
import type { Seed, RegionState } from '../../shared/types';
import type { ThemeColors } from '../constants/themes';

type BoardProps = {
  width: number;
  height: number;
  seeds: Seed[];
  regions: RegionState[];
  theme: ThemeColors;
  selectedRegionId: string | null;
  setSelectedRegionId: (id: string | null) => void;
  onUpdateRegions: (newRegions: RegionState[]) => void;
  onUndoSave: () => void;
};

export const Board = ({
  width,
  height,
  seeds,
  regions,
  theme,
  selectedRegionId,
  setSelectedRegionId,
  onUpdateRegions,
  onUndoSave,
}: BoardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Map to quickly find which region a cell belongs to
  const getCellRegion = (x: number, y: number): RegionState | null => {
    for (const r of regions) {
      if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) {
        return r;
      }
    }
    return null;
  };

  // Check if a cell is a seed cell
  const getCellSeed = (x: number, y: number): Seed | null => {
    return seeds.find((s) => s.x === x && s.y === y) || null;
  };

  // Helper to validate if a region can be resized to a proposed rectangle
  const validateResize = (
    regionId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean => {
    // 1. Must not enclose any other seeds
    for (const s of seeds) {
      if (s.id === regionId) continue;
      if (s.x >= x1 && s.x <= x2 && s.y >= y1 && s.y <= y2) {
        return false;
      }
    }

    // 2. Must not overlap any other regions (strict blocking)
    for (const r of regions) {
      if (r.id === regionId) continue;
      // Check intersection of [x1, y1, x2, y2] with [r.x1, r.y1, r.x2, r.y2]
      const overlaps = !(x2 < r.x1 || x1 > r.x2 || y2 < r.y1 || y1 > r.y2);
      if (overlaps) {
        return false;
      }
    }

    return true;
  };

  // Perform region resize by expanding current region boundaries to contain targetX, targetY
  const resizeRegion = (regionId: string, targetX: number, targetY: number) => {
    const targetRegion = regions.find((r) => r.id === regionId);
    if (!targetRegion || targetRegion.isHinted) return; // ignore if locked by hint

    // Calculate union bounding box of current region and the target coordinate
    const x1 = Math.min(targetRegion.x1, targetX);
    const x2 = Math.max(targetRegion.x2, targetX);
    const y1 = Math.min(targetRegion.y1, targetY);
    const y2 = Math.max(targetRegion.y2, targetY);

    // Only update if dimensions actually grew/changed
    if (x1 !== targetRegion.x1 || x2 !== targetRegion.x2 || y1 !== targetRegion.y1 || y2 !== targetRegion.y2) {
      if (validateResize(regionId, x1, y1, x2, y2)) {
        // Save current state to undo history before making changes
        onUndoSave();

        const nextRegions = regions.map((r) => {
          if (r.id === regionId) {
            return { ...r, x1, y1, x2, y2 };
          }
          return r;
        });
        onUpdateRegions(nextRegions);
      }
    }
  };

  // Handle cell click / tap
  const handleCellClick = (x: number, y: number) => {
    const clickedRegion = getCellRegion(x, y);
    const clickedSeed = getCellSeed(x, y);

    if (clickedSeed) {
      // Clicked the seed box! Reset region back to its 1x1 seed bounds
      const regionId = clickedSeed.id;
      const targetRegion = regions.find((r) => r.id === regionId);
      if (targetRegion && !targetRegion.isHinted) {
        // Reset to 1x1 only if it's currently expanded
        const isExpanded = targetRegion.x1 !== clickedSeed.x ||
                           targetRegion.x2 !== clickedSeed.x ||
                           targetRegion.y1 !== clickedSeed.y ||
                           targetRegion.y2 !== clickedSeed.y;
        
        if (isExpanded) {
          onUndoSave();
          const nextRegions = regions.map((r) => {
            if (r.id === regionId) {
              return {
                ...r,
                x1: clickedSeed.x,
                y1: clickedSeed.y,
                x2: clickedSeed.x,
                y2: clickedSeed.y,
              };
            }
            return r;
          });
          onUpdateRegions(nextRegions);
        }
        setSelectedRegionId(regionId);
      }
    } else if (clickedRegion) {
      if (selectedRegionId === clickedRegion.id) {
        // Already selected
      } else {
        setSelectedRegionId(clickedRegion.id);
      }
    } else {
      // If we clicked an empty cell and have a selected region, resize it!
      if (selectedRegionId) {
        resizeRegion(selectedRegionId, x, y);
      } else {
        setSelectedRegionId(null);
      }
    }
  };

  // Handle drag interactions (Mouse)
  const handleMouseDown = (x: number, y: number) => {
    const clickedRegion = getCellRegion(x, y);
    if (clickedRegion && !clickedRegion.isHinted) {
      setSelectedRegionId(clickedRegion.id);
      setIsDragging(true);
      resizeRegion(clickedRegion.id, x, y);
    }
  };

  const handleMouseEnterCell = (x: number, y: number) => {
    if (isDragging && selectedRegionId) {
      resizeRegion(selectedRegionId, x, y);
    }
  };

  // Global mouse up to stop dragging
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch handlers to support drag-to-resize on mobile without blocking layout scrolls
  const handleTouchStart = (x: number, y: number, e: React.TouchEvent) => {
    const clickedRegion = getCellRegion(x, y);
    if (clickedRegion && !clickedRegion.isHinted) {
      setSelectedRegionId(clickedRegion.id);
      setIsDragging(true);
      resizeRegion(clickedRegion.id, x, y);
      // Prevent browser default scroll only when touching inside the board to ensure smooth drawing
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !selectedRegionId || !boardRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;
    const boardElement = boardRef.current;
    const rect = boardElement.getBoundingClientRect();

    // Calculate grid coordinates based on touch positions
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    const cellWidth = rect.width / width;
    const cellHeight = rect.height / height;

    const x = Math.floor(touchX / cellWidth);
    const y = Math.floor(touchY / cellHeight);

    // Ensure computed grid coordinates lie within board boundaries
    if (x >= 0 && x < width && y >= 0 && y < height) {
      resizeRegion(selectedRegionId, x, y);
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

  // Render clues for seeds
  const renderClue = (seed: Seed) => {
    const { constraint } = seed;
    return (
      <div className="flex flex-col items-center justify-center leading-none">
        {constraint.area !== null && (
          <span className="text-base font-extrabold tracking-tight select-none">
            {constraint.area}
          </span>
        )}
      </div>
    );
  };

  // Determine borders for cell coordinates
  const getCellBorders = (x: number, y: number) => {
    const region = getCellRegion(x, y);
    if (!region) {
      return {
        top: false,
        bottom: false,
        left: false,
        right: false,
        colorIndex: 0,
        style: 'border opacity-25',
        isSelected: false,
        isHinted: false,
      };
    }

    const isSelected = selectedRegionId === region.id;
    const baseColorIdx = seeds.find((s) => s.id === region.id)?.colorIndex ?? 0;
    
    // Choose appropriate borders for the cell
    const isTop = y === region.y1;
    const isBottom = y === region.y2;
    const isLeft = x === region.x1;
    const isRight = x === region.x2;

    const borderStyle = isSelected ? 'border-2 border-dashed z-10' : 'border-2 z-10';

    return {
      top: isTop,
      bottom: isBottom,
      left: isLeft,
      right: isRight,
      colorIndex: baseColorIdx,
      style: borderStyle,
      isSelected,
      isHinted: region.isHinted,
    };
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[380px] mx-auto select-none">
      {/* Tap Instruction Help */}
      <div className="mb-2 text-xs opacity-60 text-center font-mono">
        {selectedRegionId 
          ? 'Tap an empty cell to resize selected region' 
          : 'Tap & drag from a seed, or tap to select'}
      </div>

      <div
        ref={boardRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
        className={`grid rounded-xl overflow-hidden border p-1.5 shadow-inner w-full aspect-square ${theme.gridBg} ${theme.border}`}
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: height }).map((_, y) =>
          Array.from({ length: width }).map((_, x) => {
            const seed = getCellSeed(x, y);
            const region = getCellRegion(x, y);
            const borderInfo = getCellBorders(x, y);
            
            // Build cell background color
            let bgClass = 'bg-transparent';
            let textClass = theme.textSecondary;

            if (region) {
              const seedColorIdx = seeds.find((s) => s.id === region.id)?.colorIndex ?? 0;
              bgClass = theme.regionColors[seedColorIdx] || 'bg-transparent';
              textClass = theme.regionTextColors[seedColorIdx] || theme.textSecondary;
            }

            // Outer borders to create region outline
            let borderClasses: string;
            if (region) {
              const borderThemeColor = (theme.regionBorderColors[borderInfo.colorIndex] || '').split(' ')[0] || '';
              borderClasses = `
                ${theme.regionBorderStyle}
                ${borderInfo.top ? borderThemeColor : 'border-t-transparent'} 
                ${borderInfo.bottom ? borderThemeColor : 'border-b-transparent'} 
                ${borderInfo.left ? borderThemeColor : 'border-l-transparent'} 
                ${borderInfo.right ? borderThemeColor : 'border-r-transparent'}
              `;
            } else {
              borderClasses = `${theme.gridLine} border-t border-b border-l border-r`;
            }

            return (
              <div
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                onMouseDown={() => handleMouseDown(x, y)}
                onMouseEnter={() => handleMouseEnterCell(x, y)}
                onTouchStart={(e) => handleTouchStart(x, y, e)}
                className={`
                  relative flex items-center justify-center aspect-square transition-all duration-200 cursor-pointer select-none border
                  ${bgClass} ${textClass} ${borderClasses} 
                  ${region && borderInfo.isSelected ? 'scale-[0.98] ring-1 ring-white/10' : ''}
                `}
                style={{
                  borderWidth: region ? '2px' : '0.5px',
                }}
              >
                {/* Active Outline Highlight */}
                {region && borderInfo.isSelected && (
                  <div className="absolute inset-0 border border-white/20 animate-pulse pointer-events-none rounded-sm" />
                )}

                {/* Seed Cell Render */}
                {seed && (
                  <div
                    className={`
                      flex items-center justify-center shadow-sm font-extrabold text-sm transition-all transform select-none
                      ${borderInfo.isSelected ? 'scale-[1.05] ring-2 ring-white/50' : 'hover:scale-[1.02]'}
                      ${region ? ((theme.regionBorderColors[seed.colorIndex] || '').split(' ')[0] || '').replace('border-', 'bg-').replace(' shadow-', '') + ' text-white' : 'bg-slate-500 text-white'}
                      ${getSeedShapeClasses(seed)}
                    `}
                  >
                    {renderClue(seed)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
