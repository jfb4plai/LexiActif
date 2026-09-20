// src/lib/hubToken.test.ts
import { describe, expect, it } from 'vitest';
import { buildHubAssignUrl } from './hubLink';
import { captureHubToken, forgetHubToken, type HubTokenEnv } from './hubToken';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function makeEnv(href: string, storage = memStorage()) {
  const replaced: string[] = [];
  const env: HubTokenEnv = { href, replaceUrl: (u) => void replaced.push(u), storage };
  return { env, replaced, storage };
}

describe('captureHubToken', () => {
  it('lit le jeton, le range pour cette liste et le retire de l’adresse (le reste est conservé)', () => {
    const { env, replaced, storage } = makeEnv('https://lexi-actif.vercel.app/jouer/ABCD2345?t=tok.sig&lang=fr#haut');
    expect(captureHubToken('ABCD2345', env)).toBe('tok.sig');
    expect(replaced).toEqual(['/jouer/ABCD2345?lang=fr#haut']);
    expect(storage.dump()).toEqual({ 'lexi_hub_token:ABCD2345': 'tok.sig' });
  });

  it('sans jeton dans l’adresse, reprend celui rangé pour la même liste', () => {
    const storage = memStorage();
    storage.setItem('lexi_hub_token:ABCD2345', 'ancien');
    const { env, replaced } = makeEnv('https://lexi-actif.vercel.app/jouer/ABCD2345', storage);
    expect(captureHubToken('ABCD2345', env)).toBe('ancien');
    expect(replaced).toEqual([]);
  });

  it('ne réutilise jamais le jeton d’une autre liste', () => {
    const storage = memStorage();
    storage.setItem('lexi_hub_token:AUTRELIS', 'jeton-autre-liste');
    const { env } = makeEnv('https://lexi-actif.vercel.app/jouer/ABCD2345', storage);
    expect(captureHubToken('ABCD2345', env)).toBeNull();
  });

  it('reste utilisable quand le stockage est indisponible', () => {
    const throwing = {
      getItem: () => { throw new Error('bloqué'); },
      setItem: () => { throw new Error('bloqué'); },
      removeItem: () => { throw new Error('bloqué'); },
    };
    const { env } = makeEnv('https://lexi-actif.vercel.app/jouer/ABCD2345?t=tok.sig', throwing as never);
    expect(captureHubToken('ABCD2345', env)).toBe('tok.sig');
    expect(captureHubToken('ABCD2345', { ...env, href: 'https://lexi-actif.vercel.app/jouer/ABCD2345' })).toBeNull();
    expect(() => forgetHubToken('ABCD2345', { storage: throwing as never })).not.toThrow();
  });

  it('adresse illisible : pas de jeton, pas d’exception', () => {
    const { env } = makeEnv('pas une url');
    expect(captureHubToken('ABCD2345', env)).toBeNull();
  });

  it('forgetHubToken efface le jeton de la liste', () => {
    const { env, storage } = makeEnv('https://lexi-actif.vercel.app/jouer/ABCD2345?t=x.y');
    captureHubToken('ABCD2345', env);
    forgetHubToken('ABCD2345', env);
    expect(storage.dump()).toEqual({});
  });
});

describe('buildHubAssignUrl', () => {
  it('construit la page Assigner préremplie (contrat de HubActif)', () => {
    const u = new URL(buildHubAssignUrl('  Les animaux  ', 'https://lexi-actif.vercel.app/jouer/ABCD2345', 'https://hub.example.org'));
    expect(u.origin).toBe('https://hub.example.org');
    expect(u.pathname).toBe('/enseignant/assigner');
    expect(u.searchParams.get('app')).toBe('lexiactif');
    expect(u.searchParams.get('title')).toBe('Les animaux');
    expect(u.searchParams.get('link')).toBe('https://lexi-actif.vercel.app/jouer/ABCD2345');
    expect(u.searchParams.get('type')).toBe('liste de mots');
    expect(u.searchParams.get('domain')).toBe('Orthographe');
  });

  it('borne le titre à 120 caractères', () => {
    const u = new URL(buildHubAssignUrl('x'.repeat(300), 'https://lexi-actif.vercel.app/jouer/A'));
    expect(u.searchParams.get('title')).toHaveLength(120);
  });
});
