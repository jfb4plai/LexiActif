// src/lib/shareCode.test.ts
import { describe, expect, it } from 'vitest';
import { generateShareCode } from './shareCode';

describe('generateShareCode', () => {
  it('generates an 8-character code', () => {
    expect(generateShareCode()).toHaveLength(8);
  });

  it('only uses unambiguous uppercase letters and digits (no 0/O/1/I)', () => {
    const code = generateShareCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('produces different codes across many calls (extremely low collision odds)', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShareCode()));
    expect(codes.size).toBe(1000);
  });
});
