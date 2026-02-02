import { HAPTIC_LIGHT_MS, HAPTIC_HEAVY_MS } from './constants';

/**
 * Shift all RGB channels of a hex color by a fixed amount.
 * Channels are clamped to [0, 255].
 */
export function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function getHighScore(): number {
  try {
    const saved = localStorage.getItem('pattyStackerHighScore');
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem('pattyStackerHighScore', score.toString());
  } catch {
    // Storage unavailable (private browsing, quota exceeded)
  }
}

export function triggerHaptic(style: 'light' | 'heavy' = 'light'): void {
  try {
    navigator?.vibrate?.(style === 'heavy' ? HAPTIC_HEAVY_MS : HAPTIC_LIGHT_MS);
  } catch {
    // Vibrate API not available
  }
}

/** Pick a random element from an array. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
