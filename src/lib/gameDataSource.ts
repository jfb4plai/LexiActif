// src/lib/gameDataSource.ts
import { getWords } from './wordLists';
import { createSession, recordAttempt, type RecordAttemptInput } from './attempts';

export interface GameWordList {
  id: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
}

export interface GameStudent {
  id: string;
  code_anonyme: string;
}

// Game.tsx depends on this object's identity (its effects list `dataSource`
// as a dependency) — callers must pass a referentially stable instance,
// e.g. a module-level constant or a `useMemo`'d value, never a fresh object
// literal constructed inline on every render.
export interface GameDataSource {
  getWords: (listId: string) => Promise<string[]>;
  createSession: (listId: string, studentId: string) => Promise<string>;
  recordAttempt: (input: RecordAttemptInput) => Promise<void>;
}

export const authenticatedGameDataSource: GameDataSource = {
  getWords: async (listId) => {
    const words = await getWords(listId);
    return words.map((w) => w.mot);
  },
  createSession: (listId, studentId) => createSession({ listId, studentId }),
  recordAttempt: (input) => recordAttempt(input),
};
