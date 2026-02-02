export type ToppingType = 'patty' | 'cheese' | 'lettuce' | 'tomato' | 'onion';

export interface ToppingConfig {
  type: ToppingType;
  height: number;
  colors: string[];
}

export interface ToppingSelection {
  type: ToppingType;
  height: number;
  color: string;
}

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ToppingType;
  color: string;
}

export interface FallingPiece extends Block {
  rotation: number;
  rotationSpeed: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export type GamePhase = 'start' | 'playing' | 'gameOver';

export interface PlacementEvent {
  kind: 'perfect' | 'normal' | 'miss' | 'tooSmall';
  x: number;
  y: number;
  color: string;
  debris: FallingPiece[];
  missedBlock?: Block;
}

export interface GameState {
  phase: GamePhase;
  blocks: Block[];
  currentBlock: Block | null;
  score: number;
  highScore: number;
  perfectStreak: number;
  showPerfect: boolean;
  cameraOffset: number;
  isPaused: boolean;
  speed: number;
  direction: 1 | -1;
  toppingIndex: number;
  lastEvent: PlacementEvent | null;
  eventCounter: number;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'TICK' }
  | { type: 'PLACE_BLOCK' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT' }
  | { type: 'HIDE_PERFECT' };
