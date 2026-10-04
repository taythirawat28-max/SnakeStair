import { Ladder, Snake, MoveStep, DEFAULT_LADDERS, DEFAULT_SNAKES } from '../types/game';

/**
 * Returns exact coordinates on a 10x10 board (1-100)
 * Coordinates in percentage (0% - 100%) for centering in grid cells
 */
export function getTileCoordinates(tile: number) {
  const clamped = Math.max(1, Math.min(100, tile));
  const rowFromBottom = Math.floor((clamped - 1) / 10);
  const rowFromTop = 9 - rowFromBottom;
  const isEvenRowFromBottom = rowFromBottom % 2 === 0;

  const col = isEvenRowFromBottom
    ? (clamped - 1) % 10
    : 9 - ((clamped - 1) % 10);

  return {
    tile: clamped,
    col,
    row: rowFromTop,
    xPercent: (col + 0.5) * 10,
    yPercent: (rowFromTop + 0.5) * 10,
  };
}

/**
 * Calculate full step-by-step movement including bounce-back, ladders, and snakes
 */
export function calculateMove(
  fromTile: number,
  dice: number,
  snakes: Snake[],
  ladders: Ladder[]
): {
  steps: MoveStep[];
  intermediateTile: number;
  finalTile: number;
  special?: 'ladder' | 'snake' | 'bounce';
  reachedFinish: boolean;
} {
  const steps: MoveStep[] = [];
  const rawTarget = fromTile + dice;
  const targetTile = Math.min(100, rawTarget);
  let special: 'ladder' | 'snake' | 'bounce' | undefined = undefined;

  // Walk forward step-by-step up to targetTile (caps at 100, no bouncing back)
  for (let t = fromTile + 1; t <= targetTile; t++) {
    steps.push({ tile: t, type: 'step' });
  }

  let intermediateTile = targetTile;
  let finalTile = intermediateTile;

  // If reached 100, direct win!
  if (finalTile === 100) {
    return {
      steps,
      intermediateTile: 100,
      finalTile: 100,
      special: undefined,
      reachedFinish: true,
    };
  }

  // Check Ladder
  const ladder = ladders.find((l) => l.bottom === intermediateTile);
  if (ladder) {
    special = 'ladder';
    finalTile = ladder.top;
    steps.push({ tile: ladder.top, type: 'ladder' });
  } else {
    // Check Snake
    const snake = snakes.find((s) => s.head === intermediateTile);
    if (snake) {
      special = 'snake';
      finalTile = snake.tail;
      steps.push({ tile: snake.tail, type: 'snake' });
    }
  }

  return {
    steps,
    intermediateTile,
    finalTile,
    special,
    reachedFinish: finalTile === 100,
  };
}

/**
 * Generate randomized valid snakes and ladders (5-7 each)
 * Ensures:
 * - No overlaps between ladder bottoms/tops and snake heads/tails
 * - No 1-tile ladders/snakes
 * - No snakes starting at tile 100 (that would make winning impossible)
 * - Ladders always go up, snakes always go down
 */
export function generateRandomBoard(): { snakes: Snake[]; ladders: Ladder[] } {
  const usedTiles = new Set<number>([1, 100]); // Tile 1 is start, tile 100 is goal
  const ladders: Ladder[] = [];
  const snakes: Snake[] = [];

  const ladderCount = 7;
  const snakeCount = 7;

  // Generate Ladders
  let attempts = 0;
  while (ladders.length < ladderCount && attempts < 200) {
    attempts++;
    // Bottom between 2 and 75
    const bottom = Math.floor(Math.random() * 74) + 2;
    if (usedTiles.has(bottom)) continue;

    // Minimum jump of 12, max up to 98
    const minTop = Math.min(98, bottom + 12);
    if (minTop >= 99) continue;
    const top = Math.floor(Math.random() * (98 - minTop + 1)) + minTop;

    if (usedTiles.has(top)) continue;

    // Avoid same column straight line overlap if possible
    usedTiles.add(bottom);
    usedTiles.add(top);
    ladders.push({ id: `ladder-${ladders.length + 1}`, bottom, top });
  }

  // Generate Snakes
  attempts = 0;
  while (snakes.length < snakeCount && attempts < 200) {
    attempts++;
    // Head between 20 and 98
    const head = Math.floor(Math.random() * 79) + 20;
    if (usedTiles.has(head)) continue;

    // Maximum tail is head - 12, minimum is 3
    const maxTail = head - 12;
    if (maxTail < 3) continue;
    const tail = Math.floor(Math.random() * (maxTail - 3 + 1)) + 3;

    if (usedTiles.has(tail)) continue;

    usedTiles.add(head);
    usedTiles.add(tail);
    snakes.push({ id: `snake-${snakes.length + 1}`, head, tail });
  }

  if (ladders.length < 5 || snakes.length < 5) {
    return { ladders: DEFAULT_LADDERS, snakes: DEFAULT_SNAKES };
  }

  return { ladders, snakes };
}
