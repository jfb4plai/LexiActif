# LexiActif — Design

Date : 2026-08-17
Origine : audit de `WoW éducatif/index.html` ("Puzzle de Mots PLAI"), un jeu de roue de lettres existant, hors stack PLAI.

## Objectif pédagogique

Jeu de reconstitution de mots (roue de lettres) pour l'entraînement à la structure orthographique séquentielle des mots, avec option de rappel lexical renforcé (lettres distractrices), suivi enseignant par élève anonymisé, ancré RISS.

## Ancrage RISS (vérifié via `mcp__RISS__search_articles`)

- `tel-00728785` (Chaves, 2012), `hal-00825972` (Chaves, Bosse & Largy, 2010) : la trace orthographique lexicale se construit par traitement simultané des séquences visuelle et phonologique — justifie le couple reconstitution visuelle + prononciation immédiate (bouton 🔊).
- `tel-00979303` (Pacton, Fayol & Perruchet, cités) : apprentissage implicite des régularités graphotactiques — pertinent quand la roue ne contient QUE les lettres du mot cible (pas de distracteurs) : l'exercice travaille alors l'ordre séquentiel, pas le rappel lexical complet.
- **Nuance à communiquer à l'enseignant** : sans distracteurs, le jeu n'exige pas de se souvenir *quelles* lettres composent le mot, seulement leur *ordre*. Avec distracteurs actifs, l'élève doit identifier les bonnes lettres parmi des leurres — plus proche d'un vrai rappel en mémoire lexicale.
- `dumas-03138797`, `hal-01842212` : la valeur pédagogique du feedback tient à sa qualification (type d'erreur), pas au simple correct/incorrect → feedback qualifié requis (nombre de lettres bien placées).
- `hal-05494071`, `hal-04682680` : la gamification (score, mécaniques ludiques) soutient motivation/engagement — justifie de garder score et mécanique de jeu.
- `ensl-01576226` (Rey & Feyfant) : l'évaluation formative valorise une rétroaction orientée progrès plutôt qu'un classement comparatif → justifie de retirer le classement compétitif visible côté élève.
- Aucune référence RISS trouvée ne valide une difficulté adaptative automatique pour ce type d'exercice → hors scope V1 (voir plus bas), pas de prétention de progression pédagogique non vérifiée.

## Architecture

- React 18 + Vite + Tailwind v3, `shared/css/plai-style.css` copié dans `src/`, fonts DM Serif Display + DM Sans, logo PLAI copié dans `public/plai-logo.jpg`.
- Supabase (projet partagé `dfoaumjleqtxjeaplnna`) : auth enseignant + tables préfixées `lexi_` :
  - `lexi_word_lists` (id, user_id, nom, ordre_aleatoire bool, distracteurs_actifs bool, nb_distracteurs int, created_at)
  - `lexi_words` (id, list_id, mot, position int) — `position` porte l'ordre de difficulté saisi par l'enseignant
  - `lexi_students` (id, user_id, code_anonyme, classe)
  - `lexi_sessions` (id, list_id, student_id, started_at, ended_at)
  - `lexi_attempts` (id, session_id, mot, reussi bool, lettres_bien_placees int, score int, distracteurs_actifs bool, created_at)
  - RLS `auth.uid() = user_id` sur `lexi_word_lists` et `lexi_students`, cascade via jointure sur les tables dépendantes. Réutilise `profiles` existant, pas de nouveau trigger `updated_at`.
- Vercel : repo GitHub `jfb4plai/LexiActif`, branche `main`, déploiement continu, sous-domaine `lexiactif.jfb4plai.com`.
- Pas de Serverless Function ni de Claude Haiku — mécanique 100% déterministe, pas de génération IA, donc pas de split 80/20 à prévoir dans cette app.

## Espace enseignant

- Connexion email/password Supabase auth (pattern `profiles` existant).
- Gestion des élèves : liste de codes anonymes par classe (ex. `EL-3B-07`), création/suppression — jamais de nom réel stocké nulle part.
- Gestion des listes de mots :
  - Saisie par **copier-coller texte**, un mot par ligne — aucune dépendance externe (fin de xlsx.js / CDN cdnjs, fin du risque hors-ligne).
  - Aucune limite stricte de longueur. Au-delà de 10 lettres, avertissement explicite affiché : *"⚠️ ce mot risque d'être peu lisible sur la roue à l'écran"* — aucun mot n'est rejeté silencieusement (contrairement à l'ancienne limite muette de 7 caractères).
  - Texte d'aide sous le champ : *"L'ordre des mots dans la liste est respecté pendant la partie. Pour une difficulté progressive, place les mots les plus courts/familiers en premier, les plus longs ou les moins fréquents ensuite."*
  - Toggle "Ordre aléatoire" (off par défaut) — par défaut le tirage suit l'ordre de la liste (`position`), pour que le conseil ci-dessus ait un effet réel. Si activé, tirage aléatoire comme dans l'ancienne version.
  - Toggle "Lettres distractrices" (off par défaut) + réglage du nombre (+1 / +2), avec icône ⓘ ouvrant une note pédagogique courte citant la nuance RISS ci-dessus, pour que l'enseignant active l'option en connaissance de cause.
- Tableau de bord : scores/progression par élève et par liste. Remplace le classement compétitif de l'ancienne version — pas de vue "meilleurs scores" comparative entre élèves.

## Espace élève (écran de jeu)

- Sélection du code élève dans une liste déroulante (pas de saisie libre de nom).
- Roue de lettres accessible clavier : `<button>` par lettre, `tabindex`, `aria-label` (ex. "lettre A"), zone de message en `aria-live="polite"` pour les lecteurs d'écran.
- Feedback à l'échec qualifié : nombre de lettres bien placées affiché (ex. "3 lettres sur 6 sont bien placées"), sans révéler lesquelles.
- Pas de classement visible côté élève. Score personnel et nombre de mots réussis dans la séance restent affichés, étiquetés explicitement comme un compteur de séance (pas "Niveau", pour ne pas suggérer une difficulté croissante automatique qui n'existe pas).
- Bouton 🔊 prononciation conservé (Web Speech API, `fr-FR`, `rate: 0.8`), correctement désactivé visuellement (`opacity`, `pointer-events: none`, `aria-disabled="true"`) tant que le mot n'est pas trouvé — corrige le bug de l'ancienne version où la classe `.disabled` n'avait aucun style associé.

## Flux de données

Enseignant crée liste + élèves → élève choisit son code → partie jouée en local (state React), mot suivant tiré selon `position` (ou aléatoire si activé) → à chaque tentative, écriture dans `lexi_attempts` (mot, réussite, lettres bien placées, score, distracteurs actifs, horodatage) → dashboard enseignant agrège par élève et par liste.

## Erreurs / robustesse

- Aucune dépendance CDN externe : fin du risque de rupture hors-ligne lié à xlsx.js.
- Perte de connexion Supabase en cours de partie : l'état de jeu reste en mémoire côté client, tentative de synchronisation différée à la reconnexion, message explicite si l'écriture échoue définitivement — la partie en cours n'est jamais perdue silencieusement.

## Hors scope V1 (explicite, pas oublié)

- Pas de difficulté adaptative automatique (pas d'augmentation automatique du nombre de distracteurs ou de la longueur des mots proposés en fonction de la réussite de l'élève). Seuls deux leviers manuels existent en V1 : l'ordre de saisie de la liste (respecté par défaut) et le toggle distracteurs (réglé par liste, pas par élève). Une vraie adaptativité serait un sous-projet séparé, avec sa propre recherche RISS et son propre design — aucune référence RISS trouvée à ce jour ne valide une progression de difficulté optimale pour ce type d'exercice.

## Conformité aux règles absolues PLAI (vs. version audités)

| Règle | Ancienne version | LexiActif |
|---|---|---|
| Codes anonymes élèves | Nom réel saisi et affiché | Codes anonymes pré-créés par l'enseignant |
| Classement compétitif visible | Tableau de scores nominatif public | Réservé au dashboard enseignant |
| Guidage contextuel des champs | Champ fichier sans aide | Aide explicite sur chaque champ (format, longueur, ordre, distracteurs) |
| Accessibilité clavier | Roue en `<div>` non focusables | `<button>` + `aria-label` + `aria-live` |
| Dépendance hors-ligne | xlsx.js (CDN) | Copier-coller texte, aucune dépendance externe |
| Feedback qualifié | "Ce n'est pas le bon mot" | Nombre de lettres bien placées |
