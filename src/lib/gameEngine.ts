// src/lib/gameEngine.ts

/** Seeded PRNG (mulberry32) so game-logic tests are deterministic. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds the sequence of words for a session.
 * Default (randomOrder = false) preserves the teacher-defined list order,
 * so the "difficulty ordering" guidance shown to teachers has a real effect.
 */
export function buildWordQueue(
  words: string[],
  randomOrder: boolean,
  rng: () => number = Math.random
): string[] {
  return randomOrder ? shuffle(words, rng) : [...words];
}

const DISTRACTOR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Builds the shuffled letters for the wheel: the target word's letters,
 * plus `distractorCount` extra random letters when enabled. Distractors
 * force the player to identify which letters belong to the word, not just
 * their order — closer to genuine lexical recall (see RISS note in the
 * word-list editor).
 */
export function buildWheelLetters(
  word: string,
  distractorsEnabled: boolean,
  distractorCount: number,
  rng: () => number = Math.random
): string[] {
  const letters = word.split('');
  if (distractorsEnabled && distractorCount > 0) {
    for (let i = 0; i < distractorCount; i++) {
      letters.push(DISTRACTOR_POOL[Math.floor(rng() * DISTRACTOR_POOL.length)]);
    }
  }
  return shuffle(letters, rng);
}

/** Qualified feedback: how many letters are in the correct position, without revealing which. */
export function countWellPlaced(attempt: string, target: string): number {
  let count = 0;
  const len = Math.min(attempt.length, target.length);
  for (let i = 0; i < len; i++) {
    if (attempt[i] === target[i]) count++;
  }
  return count;
}

export function scoreForWord(word: string): number {
  return word.length * 10;
}
