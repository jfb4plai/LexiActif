# LexiActif

Jeu de roue de lettres pour l'entraînement à la structure orthographique lexicale, avec suivi enseignant et codes élèves anonymes.

Reconstruction PLAI de l'ancienne app "Puzzle de Mots" (`WoW éducatif/index.html`), corrigée suite à un audit fluidité/RISS.

- Design : [docs/superpowers/specs/2026-08-17-lexiactif-design.md](docs/superpowers/specs/2026-08-17-lexiactif-design.md)
- Stack : React 18 + Vite + Tailwind v3 + Supabase (RLS, tables préfixées `lexi_`)
- Déploiement cible : `lexiactif.jfb4plai.com`

## Développement local

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

Avant tout `git push` sur `main` :

```bash
npm run typecheck
npm run test
npm run build
```
