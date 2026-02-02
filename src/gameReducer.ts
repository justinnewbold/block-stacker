import type {
  GameState,
  GameAction,
  Block,
  FallingPiece,
  ToppingSelection,
  PlacementEvent,
} from './types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  INITIAL_BLOCK_WIDTH,
  BLOCK_HEIGHT,
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  PERFECT_THRESHOLD,
  MIN_BLOCK_WIDTH,
  CAMERA_TRIGGER_MARGIN,
  BLOCK_GAP,
  NORMAL_SCORE,
  PERFECT_BASE_SCORE,
  PERFECT_STREAK_BONUS,
  PERFECT_COLOR,
  TOPPING_TYPES,
  MIN_BLOCKS_FOR_VARIETY,
  NON_PATTY_CHANCE,
} from './constants';
import { getHighScore, saveHighScore, pick } from './utils';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

export function calculateOverlap(
  current: Block,
  last: Block,
): { overlapWidth: number; overlapLeft: number } {
  const overlapLeft = Math.max(current.x, last.x);
  const overlapRight = Math.min(
    current.x + current.width,
    last.x + last.width,
  );
  return { overlapWidth: overlapRight - overlapLeft, overlapLeft };
}

export function isPerfectPlacement(current: Block, last: Block): boolean {
  return (
    Math.abs(current.x - last.x) < PERFECT_THRESHOLD &&
    Math.abs(current.width - last.width) < PERFECT_THRESHOLD
  );
}

export function calculateScore(
  isPerfect: boolean,
  currentStreak: number,
): number {
  return isPerfect
    ? PERFECT_BASE_SCORE + currentStreak * PERFECT_STREAK_BONUS
    : NORMAL_SCORE;
}

export function stackHeight(blocks: readonly Block[]): number {
  return blocks.reduce((sum, b) => sum + b.height, 0);
}

// ---------------------------------------------------------------------------
// Topping selection
// ---------------------------------------------------------------------------

function getNextTopping(toppingIndex: number): ToppingSelection {
  if (toppingIndex > MIN_BLOCKS_FOR_VARIETY && Math.random() > NON_PATTY_CHANCE) {
    const config =
      TOPPING_TYPES[Math.floor(Math.random() * (TOPPING_TYPES.length - 1)) + 1];
    return { type: config.type, height: config.height, color: pick(config.colors) };
  }
  const patty = TOPPING_TYPES[0];
  return { type: patty.type, height: patty.height, color: pick(patty.colors) };
}

// ---------------------------------------------------------------------------
// Debris calculation
// ---------------------------------------------------------------------------

function calculateDebris(current: Block, last: Block): FallingPiece[] {
  const debris: FallingPiece[] = [];

  if (current.x < last.x) {
    debris.push({
      x: current.x,
      y: current.y,
      width: last.x - current.x,
      height: current.height,
      color: current.color,
      type: current.type,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 15,
    });
  }

  if (current.x + current.width > last.x + last.width) {
    debris.push({
      x: last.x + last.width,
      y: current.y,
      width: current.x + current.width - (last.x + last.width),
      height: current.height,
      color: current.color,
      type: current.type,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 15,
    });
  }

  return debris;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(): GameState {
  return {
    phase: 'start',
    blocks: [],
    currentBlock: null,
    score: 0,
    highScore: getHighScore(),
    perfectStreak: 0,
    showPerfect: false,
    cameraOffset: 0,
    isPaused: false,
    speed: INITIAL_SPEED,
    direction: 1,
    toppingIndex: 0,
    lastEvent: null,
    eventCounter: 0,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const patty = TOPPING_TYPES[0];
      const baseBlock: Block = {
        x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
        y: GAME_HEIGHT - BLOCK_HEIGHT,
        width: INITIAL_BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        type: 'patty',
        color: patty.colors[0],
      };

      const nextIndex = 1;
      const next = getNextTopping(nextIndex);

      return {
        ...state,
        phase: 'playing',
        blocks: [baseBlock],
        currentBlock: {
          x: 0,
          y: GAME_HEIGHT - BLOCK_HEIGHT - next.height - BLOCK_GAP,
          width: INITIAL_BLOCK_WIDTH,
          height: next.height,
          type: next.type,
          color: next.color,
        },
        score: 0,
        perfectStreak: 0,
        showPerfect: false,
        cameraOffset: 0,
        isPaused: false,
        speed: INITIAL_SPEED,
        direction: 1,
        toppingIndex: nextIndex,
        lastEvent: null,
        eventCounter: 0,
      };
    }

    case 'TICK': {
      if (state.phase !== 'playing' || !state.currentBlock || state.isPaused) {
        return state;
      }

      let newX =
        state.currentBlock.x + state.speed * state.direction;
      let newDir = state.direction;

      if (newX <= 0) {
        newX = 0;
        newDir = 1;
      } else if (newX + state.currentBlock.width >= GAME_WIDTH) {
        newX = GAME_WIDTH - state.currentBlock.width;
        newDir = -1;
      }

      return {
        ...state,
        currentBlock: { ...state.currentBlock, x: newX },
        direction: newDir,
      };
    }

    case 'PLACE_BLOCK': {
      if (state.phase !== 'playing' || !state.currentBlock || state.isPaused) {
        return state;
      }

      const current = state.currentBlock;
      const lastBlock = state.blocks[state.blocks.length - 1];
      const { overlapWidth, overlapLeft } = calculateOverlap(current, lastBlock);

      // Complete miss
      if (overlapWidth <= 0) {
        const newHigh = Math.max(state.score, state.highScore);
        if (newHigh > state.highScore) saveHighScore(newHigh);

        const event: PlacementEvent = {
          kind: 'miss',
          x: current.x + current.width / 2,
          y: current.y,
          color: current.color,
          debris: [],
          missedBlock: current,
        };

        return {
          ...state,
          phase: 'gameOver',
          currentBlock: null,
          highScore: newHigh,
          lastEvent: event,
          eventCounter: state.eventCounter + 1,
        };
      }

      const perfect = isPerfectPlacement(current, lastBlock);
      let newBlockWidth = overlapWidth;
      let newBlockX = overlapLeft;
      const totalH = stackHeight(state.blocks);
      const newY = GAME_HEIGHT - totalH - current.height;

      let newScore = state.score;
      let newStreak = state.perfectStreak;
      let debris: FallingPiece[] = [];

      if (perfect) {
        newBlockWidth = lastBlock.width;
        newBlockX = lastBlock.x;
        newStreak += 1;
        newScore += calculateScore(true, state.perfectStreak);
      } else {
        newStreak = 0;
        newScore += NORMAL_SCORE;
        debris = calculateDebris(current, lastBlock);
      }

      const placedBlock: Block = {
        x: newBlockX,
        y: newY,
        width: newBlockWidth,
        height: current.height,
        type: current.type,
        color: current.color,
      };
      const newBlocks = [...state.blocks, placedBlock];

      // Camera offset
      const newTotalH = stackHeight(newBlocks);
      let newCamera = state.cameraOffset;
      if (newTotalH > GAME_HEIGHT - CAMERA_TRIGGER_MARGIN) {
        newCamera = newTotalH - (GAME_HEIGHT - CAMERA_TRIGGER_MARGIN);
      }

      const placementEvent: PlacementEvent = {
        kind: perfect ? 'perfect' : 'normal',
        x: newBlockX + newBlockWidth / 2,
        y: newY,
        color: perfect ? PERFECT_COLOR : current.color,
        debris,
      };

      // Too small → game over
      if (newBlockWidth < MIN_BLOCK_WIDTH) {
        const newHigh = Math.max(newScore, state.highScore);
        if (newHigh > state.highScore) saveHighScore(newHigh);

        return {
          ...state,
          phase: 'gameOver',
          blocks: newBlocks,
          currentBlock: null,
          score: newScore,
          highScore: newHigh,
          perfectStreak: newStreak,
          showPerfect: perfect,
          cameraOffset: newCamera,
          lastEvent: { ...placementEvent, kind: 'tooSmall' },
          eventCounter: state.eventCounter + 1,
        };
      }

      // Next block
      const newSpeed = Math.min(
        INITIAL_SPEED + newBlocks.length * SPEED_INCREMENT,
        MAX_SPEED,
      );
      const nextIndex = state.toppingIndex + 1;
      const next = getNextTopping(nextIndex);
      const nextY = newY - next.height - BLOCK_GAP;
      const nextBlock: Block = {
        x: state.direction === 1 ? 0 : GAME_WIDTH - newBlockWidth,
        y: nextY,
        width: newBlockWidth,
        height: next.height,
        type: next.type,
        color: next.color,
      };

      return {
        ...state,
        blocks: newBlocks,
        currentBlock: nextBlock,
        score: newScore,
        perfectStreak: newStreak,
        showPerfect: perfect,
        cameraOffset: newCamera,
        speed: newSpeed,
        toppingIndex: nextIndex,
        lastEvent: placementEvent,
        eventCounter: state.eventCounter + 1,
      };
    }

    case 'TOGGLE_PAUSE':
      if (state.phase !== 'playing') return state;
      return { ...state, isPaused: !state.isPaused };

    case 'RESUME':
      return { ...state, isPaused: false };

    case 'QUIT':
      return { ...state, phase: 'start', isPaused: false };

    case 'HIDE_PERFECT':
      return { ...state, showPerfect: false };

    default:
      return state;
  }
}
