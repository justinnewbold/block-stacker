import { describe, it, expect } from 'vitest';
import {
  calculateOverlap,
  isPerfectPlacement,
  calculateScore,
  stackHeight,
  gameReducer,
  createInitialState,
} from './gameReducer';
import type { Block, GameState } from './types';
import {
  GAME_WIDTH,
  INITIAL_SPEED,
  NORMAL_SCORE,
  PERFECT_BASE_SCORE,
  PERFECT_STREAK_BONUS,
} from './constants';

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe('calculateOverlap', () => {
  it('returns positive overlap for overlapping blocks', () => {
    const a: Block = { x: 80, y: 0, width: 100, height: 22, type: 'patty', color: '#000' };
    const b: Block = { x: 100, y: 22, width: 100, height: 22, type: 'patty', color: '#000' };
    const { overlapWidth, overlapLeft } = calculateOverlap(a, b);
    expect(overlapWidth).toBe(80);
    expect(overlapLeft).toBe(100);
  });

  it('returns zero or negative for a complete miss', () => {
    const a: Block = { x: 0, y: 0, width: 50, height: 22, type: 'patty', color: '#000' };
    const b: Block = { x: 100, y: 22, width: 50, height: 22, type: 'patty', color: '#000' };
    const { overlapWidth } = calculateOverlap(a, b);
    expect(overlapWidth).toBeLessThanOrEqual(0);
  });

  it('returns full width when blocks are perfectly aligned', () => {
    const a: Block = { x: 100, y: 0, width: 100, height: 22, type: 'patty', color: '#000' };
    const b: Block = { x: 100, y: 22, width: 100, height: 22, type: 'patty', color: '#000' };
    const { overlapWidth } = calculateOverlap(a, b);
    expect(overlapWidth).toBe(100);
  });
});

describe('isPerfectPlacement', () => {
  it('returns true when blocks are within threshold', () => {
    const a: Block = { x: 101, y: 0, width: 99, height: 22, type: 'patty', color: '#000' };
    const b: Block = { x: 100, y: 22, width: 100, height: 22, type: 'patty', color: '#000' };
    expect(isPerfectPlacement(a, b)).toBe(true);
  });

  it('returns false when blocks differ by more than threshold', () => {
    const a: Block = { x: 110, y: 0, width: 100, height: 22, type: 'patty', color: '#000' };
    const b: Block = { x: 100, y: 22, width: 100, height: 22, type: 'patty', color: '#000' };
    expect(isPerfectPlacement(a, b)).toBe(false);
  });
});

describe('calculateScore', () => {
  it('returns normal score for non-perfect placement', () => {
    expect(calculateScore(false, 0)).toBe(NORMAL_SCORE);
    expect(calculateScore(false, 5)).toBe(NORMAL_SCORE);
  });

  it('returns perfect base score when streak is 0', () => {
    expect(calculateScore(true, 0)).toBe(PERFECT_BASE_SCORE);
  });

  it('adds streak bonus for consecutive perfects', () => {
    expect(calculateScore(true, 3)).toBe(
      PERFECT_BASE_SCORE + 3 * PERFECT_STREAK_BONUS,
    );
  });
});

describe('stackHeight', () => {
  it('returns 0 for empty array', () => {
    expect(stackHeight([])).toBe(0);
  });

  it('sums all block heights', () => {
    const blocks: Block[] = [
      { x: 0, y: 0, width: 100, height: 22, type: 'patty', color: '#000' },
      { x: 0, y: 22, width: 100, height: 8, type: 'cheese', color: '#000' },
      { x: 0, y: 30, width: 100, height: 10, type: 'lettuce', color: '#000' },
    ];
    expect(stackHeight(blocks)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Reducer tests
// ---------------------------------------------------------------------------

describe('gameReducer', () => {
  function getInitialState(): GameState {
    return createInitialState();
  }

  describe('START_GAME', () => {
    it('transitions from start to playing', () => {
      const state = getInitialState();
      const next = gameReducer(state, { type: 'START_GAME' });
      expect(next.phase).toBe('playing');
      expect(next.blocks).toHaveLength(1);
      expect(next.currentBlock).not.toBeNull();
      expect(next.score).toBe(0);
      expect(next.speed).toBe(INITIAL_SPEED);
    });

    it('resets score and streak', () => {
      const state: GameState = { ...getInitialState(), score: 100, perfectStreak: 5 };
      const next = gameReducer(state, { type: 'START_GAME' });
      expect(next.score).toBe(0);
      expect(next.perfectStreak).toBe(0);
    });
  });

  describe('TICK', () => {
    it('moves the current block', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const prev = state.currentBlock!;
      const next = gameReducer(state, { type: 'TICK' });
      expect(next.currentBlock!.x).not.toBe(prev.x);
    });

    it('reverses direction at left wall', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const atWall: GameState = {
        ...state,
        currentBlock: { ...state.currentBlock!, x: 0 },
        direction: -1,
        speed: 5,
      };
      const next = gameReducer(atWall, { type: 'TICK' });
      expect(next.direction).toBe(1);
      expect(next.currentBlock!.x).toBe(0);
    });

    it('reverses direction at right wall', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const atWall: GameState = {
        ...state,
        currentBlock: { ...state.currentBlock!, x: GAME_WIDTH - state.currentBlock!.width },
        direction: 1,
        speed: 5,
      };
      const next = gameReducer(atWall, { type: 'TICK' });
      expect(next.direction).toBe(-1);
    });

    it('does nothing when paused', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const paused: GameState = { ...state, isPaused: true };
      const next = gameReducer(paused, { type: 'TICK' });
      expect(next).toBe(paused);
    });
  });

  describe('PLACE_BLOCK', () => {
    function makePlacingState(): GameState {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      // Position the current block perfectly over the base
      const base = state.blocks[0];
      return {
        ...state,
        currentBlock: {
          ...state.currentBlock!,
          x: base.x,
          width: base.width,
        },
      };
    }

    it('adds a block on successful placement', () => {
      const state = makePlacingState();
      const next = gameReducer(state, { type: 'PLACE_BLOCK' });
      expect(next.blocks).toHaveLength(2);
      expect(next.currentBlock).not.toBeNull();
    });

    it('detects perfect placement and increases streak', () => {
      const state = makePlacingState();
      const next = gameReducer(state, { type: 'PLACE_BLOCK' });
      expect(next.perfectStreak).toBe(1);
      expect(next.showPerfect).toBe(true);
      expect(next.score).toBeGreaterThan(NORMAL_SCORE);
    });

    it('resets streak on imperfect placement', () => {
      const state = makePlacingState();
      const offset: GameState = {
        ...state,
        perfectStreak: 3,
        currentBlock: { ...state.currentBlock!, x: state.blocks[0].x + 20 },
      };
      const next = gameReducer(offset, { type: 'PLACE_BLOCK' });
      expect(next.perfectStreak).toBe(0);
      expect(next.showPerfect).toBe(false);
      expect(next.score).toBe(NORMAL_SCORE);
    });

    it('triggers game over on complete miss', () => {
      const state = makePlacingState();
      const miss: GameState = {
        ...state,
        currentBlock: { ...state.currentBlock!, x: GAME_WIDTH + 10 },
      };
      const next = gameReducer(miss, { type: 'PLACE_BLOCK' });
      expect(next.phase).toBe('gameOver');
      expect(next.currentBlock).toBeNull();
      expect(next.lastEvent?.kind).toBe('miss');
    });

    it('triggers game over when block becomes too narrow', () => {
      const state = makePlacingState();
      // Make current block barely overlapping
      const base = state.blocks[0];
      const narrow: GameState = {
        ...state,
        currentBlock: {
          ...state.currentBlock!,
          x: base.x + base.width - 5,
          width: 100,
        },
      };
      const next = gameReducer(narrow, { type: 'PLACE_BLOCK' });
      expect(next.phase).toBe('gameOver');
      expect(next.lastEvent?.kind).toBe('tooSmall');
    });

    it('increases speed with each block', () => {
      const state = makePlacingState();
      const next = gameReducer(state, { type: 'PLACE_BLOCK' });
      expect(next.speed).toBeGreaterThan(state.speed);
    });

    it('generates debris for imperfect placements', () => {
      const state = makePlacingState();
      const offset: GameState = {
        ...state,
        currentBlock: { ...state.currentBlock!, x: state.blocks[0].x + 20 },
      };
      const next = gameReducer(offset, { type: 'PLACE_BLOCK' });
      expect(next.lastEvent?.debris.length).toBeGreaterThan(0);
    });
  });

  describe('TOGGLE_PAUSE', () => {
    it('toggles pause state during play', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const paused = gameReducer(state, { type: 'TOGGLE_PAUSE' });
      expect(paused.isPaused).toBe(true);
      const resumed = gameReducer(paused, { type: 'TOGGLE_PAUSE' });
      expect(resumed.isPaused).toBe(false);
    });

    it('does nothing when not playing', () => {
      const state = getInitialState();
      const next = gameReducer(state, { type: 'TOGGLE_PAUSE' });
      expect(next).toBe(state);
    });
  });

  describe('QUIT', () => {
    it('returns to start screen', () => {
      const state = gameReducer(getInitialState(), { type: 'START_GAME' });
      const paused = gameReducer(state, { type: 'TOGGLE_PAUSE' });
      const next = gameReducer(paused, { type: 'QUIT' });
      expect(next.phase).toBe('start');
      expect(next.isPaused).toBe(false);
    });
  });

  describe('HIDE_PERFECT', () => {
    it('sets showPerfect to false', () => {
      const state: GameState = { ...getInitialState(), showPerfect: true };
      const next = gameReducer(state, { type: 'HIDE_PERFECT' });
      expect(next.showPerfect).toBe(false);
    });
  });
});
