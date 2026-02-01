import { describe, it, expect } from 'vitest';
import { adjustColor, pick } from './utils';

describe('adjustColor', () => {
  it('brightens a color by positive amount', () => {
    const result = adjustColor('#808080', 16);
    expect(result).toBe('#909090');
  });

  it('darkens a color by negative amount', () => {
    const result = adjustColor('#808080', -16);
    expect(result).toBe('#707070');
  });

  it('clamps to 0 for very dark colors going darker', () => {
    const result = adjustColor('#050505', -10);
    expect(result).toBe('#000000');
  });

  it('clamps to 255 for very bright colors going brighter', () => {
    const result = adjustColor('#fafafa', 10);
    expect(result).toBe('#ffffff');
  });

  it('handles full black', () => {
    expect(adjustColor('#000000', 0)).toBe('#000000');
  });

  it('handles full white', () => {
    expect(adjustColor('#ffffff', 0)).toBe('#ffffff');
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = pick(arr);
    expect(arr).toContain(result);
  });

  it('returns the only element in a single-element array', () => {
    expect(pick(['only'])).toBe('only');
  });
});
