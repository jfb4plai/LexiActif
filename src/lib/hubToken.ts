// src/lib/hubToken.ts
//
// Jeton HubActif reçu dans l'adresse d'une tâche (/jouer/<code>?t=<jeton>). Il est retiré de la barre d'adresse
// dès la lecture et rangé PAR LISTE : un jeton reçu pour une liste ne sert jamais pour une autre.
// La signature n'est pas vérifiée ici : elle l'est côté serveur (api/play-hub-student.ts et HubActif).

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface HubTokenEnv {
  href: string;
  replaceUrl: (relativeUrl: string) => void;
  storage: TokenStorage | null;
}

const storageKey = (code: string) => `lexi_hub_token:${code}`;

function browserEnv(): HubTokenEnv {
  let storage: TokenStorage | null = null;
  try {
    storage = window.localStorage; // peut lever une exception (navigation privée, stockage bloqué)
  } catch {
    storage = null;
  }
  return {
    href: window.location.href,
    replaceUrl: (url) => window.history.replaceState(window.history.state, '', url),
    storage,
  };
}

// Lit le jeton de l'adresse (et l'en retire), sinon celui déjà rangé pour cette liste, sinon null.
export function captureHubToken(code: string, env: HubTokenEnv = browserEnv()): string | null {
  let fromUrl: string | null = null;
  try {
    const url = new URL(env.href);
    fromUrl = url.searchParams.get('t');
    if (fromUrl) {
      url.searchParams.delete('t');
      env.replaceUrl(url.pathname + url.search + url.hash);
    }
  } catch {
    // adresse illisible : on continue sans jeton
  }
  try {
    if (fromUrl) {
      env.storage?.setItem(storageKey(code), fromUrl);
      return fromUrl;
    }
    return env.storage?.getItem(storageKey(code)) ?? null;
  } catch {
    return fromUrl; // stockage indisponible : le jeton de l'adresse reste utilisable pour cette visite
  }
}

export function forgetHubToken(code: string, env: Pick<HubTokenEnv, 'storage'> = browserEnv()): void {
  try {
    env.storage?.removeItem(storageKey(code));
  } catch {
    // rien à faire
  }
}
