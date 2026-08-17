// src/lib/shareCode.ts

// Excludes 0/O and 1/I — a printed or handwritten code should never be
// ambiguous. This is not meant to be cryptographically strong (see design
// doc's Sécurité section) — Math.random() is deliberate, not a placeholder:
// it keeps this function identical in the browser and under Vitest's Node
// environment, with no dependency on Web Crypto API availability.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateShareCode(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
