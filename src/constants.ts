import type { ToppingConfig } from './types';

// Game dimensions
export const GAME_WIDTH = 300;
export const GAME_HEIGHT = 520;

// Block settings
export const INITIAL_BLOCK_WIDTH = 100;
export const BLOCK_HEIGHT = 22;

// Speed settings
export const INITIAL_SPEED = 2.5;
export const SPEED_INCREMENT = 0.25;
export const MAX_SPEED = 10;

// Gameplay thresholds
export const PERFECT_THRESHOLD = 5;
export const MIN_BLOCK_WIDTH = 10;
export const CAMERA_TRIGGER_MARGIN = 150;
export const BLOCK_GAP = 5;

// Scoring
export const NORMAL_SCORE = 10;
export const PERFECT_BASE_SCORE = 20;
export const PERFECT_STREAK_BONUS = 10;

// Particles
export const PERFECT_PARTICLE_COUNT = 12;
export const NORMAL_PARTICLE_COUNT = 6;
export const PARTICLE_SPREAD = 30;
export const PARTICLE_SPEED_X = 8;
export const PARTICLE_MIN_SPEED_Y = 2;
export const PARTICLE_MAX_SPEED_Y = 6;
export const PARTICLE_MIN_SIZE = 3;
export const PARTICLE_MAX_SIZE = 6;
export const PARTICLE_GRAVITY = 0.3;
export const PARTICLE_DECAY = 0.03;

// Animation timing
export const SCORE_ANIMATION_INTERVAL = 20;
export const SCORE_ANIMATION_DIVISOR = 5;
export const PHYSICS_INTERVAL = 16;
export const PERFECT_POPUP_DURATION = 600;
export const FALLING_PIECE_SPEED = 10;
export const FALLING_PIECE_BOUNDARY = 100;

// Topping generation
export const MIN_BLOCKS_FOR_VARIETY = 2;
export const NON_PATTY_CHANCE = 0.6;

// Haptic feedback
export const HAPTIC_LIGHT_MS = 10;
export const HAPTIC_HEAVY_MS = 20;

// Z-Index scale (ordered low to high)
export const Z = {
  GRILL_SURFACE: 0,
  GAME_WORLD: 1,
  FALLING_PIECES: 50,
  PARTICLES: 51,
  PERFECT_POPUP: 60,
  MODALS: 70,
  PAUSE_BUTTON: 80,
} as const;

// Topping configurations
export const TOPPING_TYPES: ToppingConfig[] = [
  { type: 'patty', height: 22, colors: ['#8B4513', '#6B3E26', '#7B3F00', '#5C4033', '#804000'] },
  { type: 'cheese', height: 8, colors: ['#FFD700', '#FFA500', '#FFCC00'] },
  { type: 'lettuce', height: 10, colors: ['#88B04B', '#7CB342', '#9CCC65'] },
  { type: 'tomato', height: 12, colors: ['#E53935', '#EF5350', '#C62828'] },
  { type: 'onion', height: 8, colors: ['#E8D5E0', '#F3E5F5', '#FCE4EC'] },
];

// Perfect placement color
export const PERFECT_COLOR = '#FFD700';
