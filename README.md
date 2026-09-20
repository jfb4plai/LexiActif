# LexiActif

Jeu de roue de lettres pour l'entraînement à la structure orthographique lexicale, avec suivi enseignant et codes élèves anonymes.

Reconstruction PLAI de l'ancienne app "Puzzle de Mots" (`WoW éducatif/index.html`), corrigée suite à un audit fluidité/RISS.

- Design : [docs/superpowers/specs/2026-08-17-lexiactif-design.md](docs/superpowers/specs/2026-08-17-lexiactif-design.md)
- Stack : React 18 + Vite + Tailwind v3 + Supabase (RLS, tables préfixées `lexi_`)
- Déploiement cible : `lexiactif.jfb4plai.com`

## Développement local

> ⚠️ Avant de lancer l'app : la migration `supabase/migrations/20260817000000_create_lexi_tables.sql` doit être appliquée au projet Supabase partagé (`dfoaumjleqtxjeaplnna`) — `supabase db push` a échoué lors du développement initial (conflit d'historique de migrations partagé avec d'autres apps PLAI) et n'a pas encore été résolu manuellement. Sans cette étape, l'app charge mais aucune requête Supabase ne fonctionnera.

```bash
npm install
cp .env.example .env.local   # renseigner VITE_SUPABASE_ANON_KEY
npm run dev
```

## Déploiement

- Vercel, projet lié au dépôt GitHub `jfb4plai/LexiActif`, branche `main`.
- Variables d'environnement à définir dans Vercel (pas dans le code) :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Sous-domaine cible : `lexiactif.jfb4plai.com` (DNS + domaine à ajouter dans les réglages du projet Vercel).
- `SUPABASE_SERVICE_ROLE_KEY` : variable Vercel supplémentaire, réservée aux fonctions serverless `/api/play-*` (jamais préfixée `VITE_`, jamais dans le frontend). Contourne les règles RLS — à traiter comme un secret admin complet sur le projet Supabase partagé.

Le parcours élève par lien/QR (`/jouer/:code`) repose sur `/api/*` : comme pour les fonctions IA des autres apps PLAI, `npm run dev` seul ne fait pas tourner ces routes — utiliser `vercel dev` pour le tester en local.

Avant tout `git push` sur `main` :

```bash
npm run typecheck
npm run test
npm run build
```

## Branchement sur HubActif

LexiActif est branché sur [HubActif](https://hubactif-plai.vercel.app) (assignation et suivi transversaux des apps PLAI) depuis le 2026-09-20.

- **Enseignant** : le panneau de partage d'une liste propose « Assigner via HubActif » (`src/lib/hubLink.ts`). HubActif remet à chaque élève son propre QR code vers `/jouer/<code>`.
- **Élève** : un lien de HubActif arrive avec `?t=<jeton>`. `src/lib/hubToken.ts` retire le jeton de l'adresse et le range par liste ; `api/play-hub-student.ts` vérifie sa signature (clé publique de HubActif), puis retrouve ou crée l'élève portant son code : plus de menu « Qui joue ? ». Sans jeton ou avec un jeton invalide, le parcours habituel est inchangé.
- **Compte rendu** : à la fin d'une partie (tous les mots réussis), `api/play-attempt.ts` envoie « terminé » à HubActif depuis le serveur (durée, essais, mots réussis, mots repris). Un échec d'envoi ne gêne jamais l'élève ; il n'y a pas de renvoi automatique.
- **Variables Vercel (serveur uniquement)** : `HUB_APP_KEY` (clé d'app, secrète, affichée une seule fois à l'enregistrement par `scripts/register-app.mjs` de HubActif), `HUB_SIGNING_PUBLIC_KEY` (clé publique de vérification des jetons), `HUB_URL` (facultative, défaut `https://hubactif-plai.vercel.app`). Jamais préfixées `VITE_`.
- **Le bloc `hub-bridge`** de `api/play-hub-student.ts` et `api/play-attempt.ts` est une copie de `src/lib/hubBridge.ts` (les fonctions `api/` doivent rester autonomes). Après toute modification : `node scripts/sync-hub-bridge.mjs` ; le test `src/lib/hubBridge.test.ts` échoue si les copies divergent.
- Indicateurs envoyés (libellés déclarés à HubActif, à ne pas renommer sans les redéclarer) : « mots réussis », « mots repris ».
