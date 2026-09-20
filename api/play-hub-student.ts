// api/play-hub-student.ts
//
// Élève arrivé par un lien de HubActif (/jouer/<code>?t=<jeton>) : vérifie le jeton signé, puis retourne (en le
// créant au besoin) l'élève de la liste qui porte son code, pour lui éviter le menu « Qui joue ? ».
// Le jeton est signé par HubActif : seuls ses élèves réels peuvent ainsi créer une ligne dans le fichier d'élèves
// d'un enseignant (sans cette vérification, n'importe qui pourrait le remplir de codes bidon).
//
// NOTE: autonome, aucun import d'un fichier voisin — voir la note en tête de api/play-list.ts.
// Le bloc hub-bridge est une copie de src/lib/hubBridge.ts (un test vérifie qu'il est identique).
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

const HUB_APP_SLUG = 'lexiactif';

interface WordListRow {
  id: string;
  user_id: string;
}

interface StudentRow {
  id: string;
  code_anonyme: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    const { code, hubToken } = (req.body ?? {}) as { code?: unknown; hubToken?: unknown };
    if (typeof code !== 'string' || typeof hubToken !== 'string') {
      res.status(400).json({ error: 'Paramètres manquants' });
      return;
    }

    const baseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hubPublicKey = process.env.HUB_SIGNING_PUBLIC_KEY;
    if (!baseUrl || !serviceKey || !hubPublicKey) {
      res.status(500).json({ error: 'Configuration serveur manquante' });
      return;
    }

    const payload = await verifyHubToken(hubToken, hubPublicKey.trim(), Math.floor(Date.now() / 1000), HUB_APP_SLUG);
    if (!payload || payload.code.length === 0 || payload.code.length > 32) {
      res.status(401).json({ error: 'Lien HubActif invalide ou expiré' });
      return;
    }

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    const listResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_word_lists?select=id,user_id&share_code=eq.${encodeURIComponent(code)}`,
      { headers }
    );
    if (!listResponse.ok) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }
    const list = ((await listResponse.json()) as WordListRow[])[0];
    if (!list) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }

    // Retrouve l'élève (enseignant, code) ou le crée : la fiche LexiActif de l'élève suit son code HubActif.
    const studentResponse = await fetch(`${baseUrl}/rest/v1/lexi_students?on_conflict=user_id,code_anonyme`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ user_id: list.user_id, code_anonyme: payload.code }),
    });
    if (!studentResponse.ok) {
      res.status(500).json({ error: "Erreur lors de la recherche de l'élève" });
      return;
    }
    const student = ((await studentResponse.json()) as StudentRow[])[0];
    if (!student) {
      res.status(500).json({ error: "Erreur lors de la recherche de l'élève" });
      return;
    }

    res.status(200).json({ student: { id: student.id, code_anonyme: student.code_anonyme } });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
