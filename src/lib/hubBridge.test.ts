// src/lib/hubBridge.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildHubEvent, summarizeSession, verifyHubToken } from './hubBridge';

const NOW = 1_800_000_000;
const enc = new TextEncoder();

function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
  return { priv: pair.privateKey, pub: b64u(spki) };
}

// Même format que HubActif : base64url(JSON).base64url(signature P1363).
async function sign(payload: object, priv: CryptoKey): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, enc.encode(body)));
  return `${body}.${b64u(sig)}`;
}

const payload = { tid: 't1', aid: 'a1', code: '4821-2B-01', app: 'lexiactif', exp: NOW + 3600 };

describe('verifyHubToken', () => {
  it('accepte un jeton valide et rend son contenu', async () => {
    const { priv, pub } = await keyPair();
    expect(await verifyHubToken(await sign(payload, priv), pub, NOW, 'lexiactif')).toEqual(payload);
  });

  it('refuse un jeton expiré, ou destiné à une autre app', async () => {
    const { priv, pub } = await keyPair();
    expect(await verifyHubToken(await sign({ ...payload, exp: NOW - 1 }, priv), pub, NOW, 'lexiactif')).toBeNull();
    expect(await verifyHubToken(await sign({ ...payload, app: 'autre' }, priv), pub, NOW, 'lexiactif')).toBeNull();
  });

  it('refuse une signature d’une autre clé et un corps altéré', async () => {
    const a = await keyPair();
    const b = await keyPair();
    expect(await verifyHubToken(await sign(payload, a.priv), b.pub, NOW, 'lexiactif')).toBeNull();
    const [, sig] = (await sign(payload, a.priv)).split('.');
    const forged = `${b64u(enc.encode(JSON.stringify({ ...payload, code: 'AUTRE' })))}.${sig}`;
    expect(await verifyHubToken(forged, a.pub, NOW, 'lexiactif')).toBeNull();
  });

  it('refuse les valeurs absurdes sans lever d’exception', async () => {
    const { pub } = await keyPair();
    for (const bad of [undefined, null, 42, '', 'abc', 'a.b.c', 'a'.repeat(3000)]) {
      expect(await verifyHubToken(bad, pub, NOW, 'lexiactif')).toBeNull();
    }
    expect(await verifyHubToken('a.b', 'clé invalide', NOW, 'lexiactif')).toBeNull();
  });
});

describe('summarizeSession', () => {
  const words = ['chat', 'chien', 'oiseau'];

  it('partie terminée : tous les mots réussis', () => {
    const s = summarizeSession(words, [
      { mot: 'chat', reussi: true },
      { mot: 'chien', reussi: false },
      { mot: 'chien', reussi: true },
      { mot: 'oiseau', reussi: true },
    ]);
    expect(s).toEqual({ completed: true, wordsDone: 3, wordsRetried: 1, totalAttempts: 4 });
  });

  it('partie non terminée : un mot pas encore réussi', () => {
    const s = summarizeSession(words, [
      { mot: 'chat', reussi: true },
      { mot: 'chien', reussi: false },
    ]);
    expect(s.completed).toBe(false);
    expect(s.wordsDone).toBe(1);
  });

  it('liste vide ou mots en double : pas de terminé abusif, pas de double comptage', () => {
    expect(summarizeSession([], []).completed).toBe(false);
    expect(summarizeSession(['a', 'a'], [{ mot: 'a', reussi: true }])).toMatchObject({ completed: true, wordsDone: 1 });
  });

  it('un mot réussi plusieurs fois ne compte qu’une fois', () => {
    const s = summarizeSession(['a'], [{ mot: 'a', reussi: true }, { mot: 'a', reussi: true }]);
    expect(s).toMatchObject({ wordsDone: 1, wordsRetried: 1, totalAttempts: 2 });
  });
});

describe('buildHubEvent', () => {
  const summary = { completed: true, wordsDone: 10, wordsRetried: 3, totalAttempts: 14 };

  it('reprend les libellés déclarés à l’enregistrement et l’identifiant de session', () => {
    const e = buildHubEvent('11111111-1111-4111-8111-111111111111', 'tok', summary, 125.6);
    expect(e).toMatchObject({ event_id: '11111111-1111-4111-8111-111111111111', token: 'tok', status: 'completed', duration_s: 126, attempts: 14 });
    expect(e.indicators).toEqual([
      { label: 'mots réussis', value: 10 },
      { label: 'mots repris', value: 3 },
    ]);
  });

  it('borne la durée et les essais aux limites du hub', () => {
    const e = buildHubEvent('x', 't', { ...summary, totalAttempts: 5000 }, 999999);
    expect(e.duration_s).toBe(86400);
    expect(e.attempts).toBe(1000);
    expect(buildHubEvent('x', 't', summary, -5).duration_s).toBe(0);
  });
});

describe('copies du pont dans les fonctions api/', () => {
  const block = (path: string) => {
    const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const m = text.match(/\/\/ <hub-bridge:begin>\n([\s\S]*?)\/\/ <hub-bridge:end>/);
    if (!m) throw new Error(`Bloc hub-bridge introuvable dans ${path}`);
    return m[1];
  };

  it('sont identiques à src/lib/hubBridge.ts', () => {
    const reference = block('src/lib/hubBridge.ts');
    expect(block('api/play-hub-student.ts')).toBe(reference);
    expect(block('api/play-attempt.ts')).toBe(reference);
  });
});
