# LexiActif — Accès élève par lien/QR partagé — Design

Date : 2026-08-18
Origine : retour terrain — LexiActif est utilisé sur plusieurs postes de classe et en asynchrone, pas sur un poste unique partagé où l'enseignant reste présent. Le parcours actuel (l'élève joue à l'intérieur de la session Supabase de l'enseignant, via le bouton « Jouer » du tableau de bord) expose le tableau de bord admin (suppression d'élèves, de listes) dès que l'élève quitte la partie ou recharge la page — sur chaque poste où ce parcours est utilisé sans surveillance continue.

## Objectif

Permettre à un élève d'accéder au jeu via un lien ou un QR code propre à une liste de mots, **sans jamais toucher la session authentifiée de l'enseignant** — sur n'importe quel poste, à tout moment, de façon asynchrone.

## Architecture retenue

**Option B (validée)** : une petite API Vercel Serverless (`/api/play-*.js`) utilisant la clé de service Supabase côté serveur uniquement. Le navigateur de l'élève ne parle jamais directement à Supabase pour ce parcours — seulement à cette API. Aucun changement de configuration sur le projet Supabase partagé (`dfoaumjleqtxjeaplnna`), donc aucun impact sur les autres apps PLAI qui l'utilisent.

Écartée : l'authentification anonyme Supabase (option A) — aurait nécessité d'activer un réglage au niveau du projet Supabase partagé, une décision qui dépasse le périmètre de LexiActif seul.

## Schéma de données

Nouvelle colonne sur `lexi_word_lists` :
- `share_code text` — 8 caractères aléatoires alphanumériques, générés côté client à la création d'une liste (via `crypto.getRandomValues`, pas de nouvelle dépendance). Unique (index partiel, autorisant plusieurs `null` pour les listes créées avant cette fonctionnalité).
- Les listes existantes sans `share_code` affichent un bouton « Générer le lien » dans l'interface enseignant plutôt qu'un backfill automatique.
- Le code ne change pas lors d'une modification de la liste (lien stable, imprimable une fois). Un bouton « Régénérer le lien » permet de l'invalider volontairement si besoin (ex. lien diffusé par erreur).

Aucune autre table modifiée. Les règles RLS existantes (accès enseignant scopé par `auth.uid() = user_id`) restent inchangées — elles ne s'appliquent pas au nouveau parcours, qui contourne délibérément RLS via la clé de service, dans un périmètre strictement contrôlé côté serveur (voir Sécurité).

## API (Vercel Serverless Functions)

Trois fonctions, une responsabilité chacune, testées via `vercel dev` (jamais `vite dev` seul, cf. règle du projet) :

- **`GET /api/play-list?code=XXXX`** : résout le `share_code` vers une liste. Renvoie uniquement : config de la liste (nom, ordre_aleatoire, distracteurs_actifs, nb_distracteurs, indices_actifs — jamais `user_id` ni aucune donnée d'identité enseignant), ses mots, et les élèves du même enseignant (id + code_anonyme uniquement). 404 générique si le code n'existe pas.
- **`POST /api/play-session`** : `{ code, studentId }` → crée une `lexi_sessions`. Revérifie côté serveur que `studentId` appartient bien au même enseignant que la liste résolue par `code` (sinon 403) — empêche un client de forger une session pour un élève d'un autre enseignant.
- **`POST /api/play-attempt`** : `{ code, sessionId, mot, reussi, lettresBienPlacees, score, distracteursActifs }` → revérifie que `sessionId` correspond bien à une session créée pour ce `code`, avant d'insérer dans `lexi_attempts`.

## Frontend

- **Routage minimal** : au démarrage, `main.tsx` inspecte `window.location.pathname`. Si elle correspond à `/jouer/:code`, rend un nouveau composant `PublicPlay.tsx` à la place de l'arbre habituel (`App.tsx`) — aucune vérification de session Supabase, aucun accès possible au tableau de bord depuis cette route. Pas de librairie de routing ajoutée (seul cas d'usage dans toute l'app).
- **`PublicPlay.tsx`** : appelle `GET /api/play-list`, affiche la sélection du code élève (réutilise le même principe visuel que `StudentSelect`, adapté aux données publiques réduites), puis rend `Game.tsx`.
- **`Game.tsx` refactorisé** : reçoit désormais ses fonctions de données (`getWords`, `createSession`, `recordAttempt`) en prop plutôt que de les appeler en dur depuis `src/lib/wordLists.ts`/`src/lib/attempts.ts`. Deux implémentations de cette interface :
  - `authenticatedGameDataSource` (comportement actuel inchangé) pour le bouton « Jouer » du tableau de bord enseignant, conservé pour les tests rapides.
  - `publicGameDataSource` (nouveau, `src/lib/publicPlay.ts`) qui appelle les trois endpoints `/api/play-*` au lieu de Supabase directement.
  Ce découplage évite de dupliquer la logique de jeu (roue circulaire, grille progressive, indices, score) entre les deux parcours.
- **QR code** : librairie `qrcode` (légère, MIT, génère un data URL). Affiché avec le lien et un bouton « Copier » dans un panneau dépliable par liste, dans `WordListsManager.tsx`.

## Sécurité

- La clé de service Supabase (`SUPABASE_SERVICE_ROLE_KEY`) vit uniquement dans les variables d'environnement Vercel, **jamais** préfixée `VITE_` (donc jamais embarquée dans le bundle client). Elle contourne toutes les règles RLS — sa fuite serait équivalente à un accès admin complet à la base partagée.
- Chaque écriture (session, tentative) revalide côté serveur la chaîne de propriété (élève → enseignant → liste → code) avant d'écrire quoi que ce soit — un client ne peut pas soumettre de résultats pour un élève ou une liste qui ne correspondent pas au code fourni.
- Le `share_code` (8 caractères alphanumériques aléatoires) n'est pas une protection cryptographique forte — c'est un compromis proportionné à l'usage (outil de classe, pas de données sensibles au-delà de codes anonymes et de scores). Pas de limitation de débit (rate limiting) en v1 — acceptable vu l'échelle (une classe), à revisiter si l'usage s'élargit.
- Le tableau de bord enseignant reste entièrement derrière l'authentification Supabase classique — cette fonctionnalité ne le modifie pas, elle ajoute un chemin parallèle qui ne le croise jamais.

## Hors scope de cette itération

- Expiration automatique des liens.
- Limitation de débit sur les endpoints publics.
- Génération QR pour un lien « par classe » (option écartée en amont — un code par liste de mots a été retenu).
