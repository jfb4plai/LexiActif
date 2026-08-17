// src/lib/publicPlay.ts
import type { GameDataSource, GameStudent, GameWordList } from './gameDataSource';
import type { RecordAttemptInput } from './attempts';

export interface PublicPlayData {
  list: GameWordList & { nom: string };
  words: string[];
  students: GameStudent[];
}

async function parseJsonOrThrow(response: Response): Promise<any> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? 'Erreur de connexion au serveur.');
  }
  return body;
}

export async function fetchPlayList(code: string): Promise<PublicPlayData> {
  const response = await fetch(`/api/play-list?code=${encodeURIComponent(code)}`);
  return parseJsonOrThrow(response);
}

export function publicGameDataSource(code: string): GameDataSource {
  return {
    getWords: async () => {
      const data = await fetchPlayList(code);
      return data.words;
    },
    createSession: async (_listId, studentId) => {
      const response = await fetch('/api/play-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, studentId }),
      });
      const body = await parseJsonOrThrow(response);
      return body.sessionId as string;
    },
    recordAttempt: async (input: RecordAttemptInput) => {
      const response = await fetch('/api/play-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...input }),
      });
      await parseJsonOrThrow(response);
    },
  };
}
