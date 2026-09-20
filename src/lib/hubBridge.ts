// src/lib/hubBridge.ts
//
// Pont avec HubActif (https://hubactif-plai.vercel.app) : vérification du jeton signé reçu dans le lien
// d'une tâche et résumé d'une partie pour lui rendre compte.
//
// Le bloc entre les deux marqueurs est COPIÉ À L'IDENTIQUE dans api/play-hub-student.ts et api/play-attempt.ts :
// les fonctions api/ doivent rester autonomes (voir la note en tête de api/play-list.ts). Le test
// src/lib/hubBridge.test.ts vérifie que les trois copies sont identiques. Modifier ici, puis recopier.

// <hub-bridge:begin>
export interface HubTokenPayload {
  tid: string;
  aid: string;
  code: string;
  app: string;
  exp: number;
}

function hubB64uToBytes(input: string): Uint8Array<ArrayBuffer> {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Jeton compact « base64url(JSON).base64url(signature ECDSA P-256) » émis par HubActif (valable 120 h).
// Retourne la charge utile si la signature, l'app visée et l'expiration sont bons, sinon null.
export async function verifyHubToken(
  token: unknown,
  publicKeyB64: string,
  nowSec: number,
  expectedApp: string
): Promise<HubTokenPayload | null> {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      hubB64uToBytes(publicKeyB64),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      hubB64uToBytes(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(hubB64uToBytes(parts[0])));
    if (
      typeof p?.code !== 'string' ||
      typeof p.tid !== 'string' ||
      typeof p.aid !== 'string' ||
      p.app !== expectedApp ||
      typeof p.exp !== 'number' ||
      p.exp <= nowSec
    ) {
      return null;
    }
    return p as HubTokenPayload;
  } catch {
    return null;
  }
}

export interface HubAttemptRow {
  mot: string;
  reussi: boolean;
}

export interface HubSessionSummary {
  completed: boolean;
  wordsDone: number;
  wordsRetried: number;
  totalAttempts: number;
}

// Une partie est terminée quand chaque mot de la liste a été réussi au moins une fois.
// « mots repris » = mots qui ont demandé plusieurs essais.
export function summarizeSession(listWords: string[], attempts: HubAttemptRow[]): HubSessionSummary {
  const words = new Set(listWords);
  const tries = new Map<string, number>();
  const done = new Set<string>();
  for (const a of attempts) {
    tries.set(a.mot, (tries.get(a.mot) ?? 0) + 1);
    if (a.reussi) done.add(a.mot);
  }
  let wordsDone = 0;
  let wordsRetried = 0;
  for (const w of words) {
    if (done.has(w)) wordsDone++;
    if ((tries.get(w) ?? 0) > 1) wordsRetried++;
  }
  return { completed: words.size > 0 && wordsDone === words.size, wordsDone, wordsRetried, totalAttempts: attempts.length };
}

// Événement « terminé » pour POST /api/events de HubActif. L'identifiant de session sert d'event_id :
// un renvoi ne crée pas de doublon côté hub. Libellés d'indicateurs : ceux déclarés à l'enregistrement de l'app.
export function buildHubEvent(sessionId: string, token: string, s: HubSessionSummary, durationS: number) {
  return {
    event_id: sessionId,
    token,
    status: 'completed' as const,
    duration_s: Math.min(86400, Math.max(0, Math.round(durationS))),
    attempts: Math.min(1000, s.totalAttempts),
    indicators: [
      { label: 'mots réussis', value: s.wordsDone },
      { label: 'mots repris', value: s.wordsRetried },
    ],
  };
}
// <hub-bridge:end>
