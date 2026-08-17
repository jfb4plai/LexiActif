// src/lib/gameEngine.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildWordQueue,
  buildWheelLetters,
  countWellPlaced,
  createSeededRng,
  scoreForWord,
} from './gameEngine';

describe('createSeededRng', () => {
  it('is deterministic for a given seed', () => {
    const rngA = createSeededRng(42);
    const rngB = createSeededRng(42);
    const valuesA = [rngA(), rngA(), rngA()];
    const valuesB = [rngB(), rngB(), rngB()];
    expect(valuesA).toEqual(valuesB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 20; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('buildWordQueue', () => {
  const words = ['CHAT', 'ARBRE', 'MAISON'];

  it('preserves the given order when randomOrder is false', () => {
    expect(buildWordQueue(words, false)).toEqual(['CHAT', 'ARBRE', 'MAISON']);
  });

  it('does not mutate the input array', () => {
    const original = [...words];
    buildWordQueue(words, false);
    expect(words).toEqual(original);
  });

  it('shuffles when randomOrder is true, using the given rng', () => {
    const rng = createSeededRng(7);
    const queue = buildWordQueue(words, true, rng);
    expect(queue).toHaveLength(3);
    expect(queue.slice().sort()).toEqual(words.slice().sort());
  });
});

describe('buildWheelLetters', () => {
  it('contains exactly the word letters when distractors are disabled', () => {
    const rng = createSeededRng(1);
    const letters = buildWheelLetters('CHAT', false, 0, rng);
    expect(letters.slice().sort()).toEqual(['C', 'H', 'A', 'T'].sort());
    expect(letters).toHaveLength(4);
  });

  it('adds the requested number of distractor letters', () => {
    const rng = createSeededRng(1);
    const letters = buildWheelLetters('CHAT', true, 2, rng);
    expect(letters).toHaveLength(6);
  });

  it('shuffles the letters (not in the original word order) for a fixed seed', () => {
    const rng = createSeededRng(3);
    const letters = buildWheelLetters('MAISON', false, 0, rng);
    expect(letters.join('')).not.toEqual('MAISON');
    expect(letters.slice().sort().join('')).toEqual('MAISON'.split('').sort().join(''));
  });
});

describe('countWellPlaced', () => {
  it('counts letters at the same index as the target', () => {
    expect(countWellPlaced('CHAT', 'CHAT')).toBe(4);
    expect(countWellPlaced('CHTA', 'CHAT')).toBe(2);
    expect(countWellPlaced('XXXX', 'CHAT')).toBe(0);
  });

  it('only compares up to the shorter string length', () => {
    expect(countWellPlaced('CH', 'CHAT')).toBe(2);
  });
});

describe('scoreForWord', () => {
  it('awards 10 points per letter', () => {
    expect(scoreForWord('CHAT')).toBe(40);
    expect(scoreForWord('MAISON')).toBe(60);
  });
});
