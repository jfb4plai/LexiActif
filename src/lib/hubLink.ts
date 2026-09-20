// src/lib/hubLink.ts
//
// Lien vers la page « Assigner » de HubActif, préremplie : l'enseignant y choisit la classe (ou quelques élèves)
// et HubActif donne à chaque élève son propre QR code vers cette liste. Les paramètres sont ceux du contrat de
// HubActif (docs/CONTRAT-API.md) : app, title, link, type, domain, class.

export const HUB_URL = 'https://hubactif-plai.vercel.app';

export function buildHubAssignUrl(listName: string, shareUrl: string, hubUrl: string = HUB_URL): string {
  const url = new URL('/enseignant/assigner', hubUrl);
  url.searchParams.set('app', 'lexiactif');
  url.searchParams.set('title', listName.trim().slice(0, 120));
  url.searchParams.set('link', shareUrl);
  url.searchParams.set('type', 'liste de mots');
  url.searchParams.set('domain', 'Orthographe');
  return url.toString();
}
