# LexiActif — Lien/QR de partage élève — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students join a specific word-list game via a share link or QR code, without ever touching the teacher's authenticated Supabase session — on any device, at any time, supervised or not.

**Architecture:** A new `share_code` column on `lexi_word_lists`, resolved by three small Vercel Serverless Functions (`api/play-*.ts`) using the Supabase **service role key** (server-only, never in the frontend bundle). The client-side game screen (`Game.tsx`) is refactored to receive its data-access functions via a `GameDataSource` prop instead of importing Supabase calls directly, so the exact same gameplay code serves both the existing teacher-authenticated flow and the new public share-link flow without duplication. A minimal path-based check in `main.tsx` renders the public flow for `/jouer/:code`, bypassing `App.tsx`'s auth gate entirely.

**Tech Stack:** React 18, TypeScript, Vite 5, `@supabase/supabase-js` (client, existing) + a second server-side instance with the service role key, Vercel Serverless Functions (`@vercel/node`), `qrcode` (client-side QR generation), Vitest.

Reference spec: `docs/superpowers/specs/2026-08-18-lexiactif-lien-partage-design.md`

---

## Task 1: Migration + share-code generator (TDD) + types

**Files:**
- Create: `supabase/migrations/20260819000000_add_lexi_share_code.sql`
- Create: `src/lib/shareCode.ts`
- Test: `src/lib/shareCode.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the migration**

```sql
-- lexiactif/supabase/migrations/20260819000000_add_lexi_share_code.sql

alter table public.lexi_word_lists
  add column if not exists share_code text;

create unique index if not exists lexi_word_lists_share_code_idx
  on public.lexi_word_lists (share_code)
  where share_code is not null;
```

This is additive-only: existing rows get `share_code = null` (no backfill), the partial unique index allows any number of `null`s while still enforcing uniqueness once a code is set. No RLS change needed — the owner-scoped policies on `lexi_word_lists` already cover this new column for authenticated teacher access; the public share-link flow (Tasks 5–7) deliberately bypasses RLS via the service role key, in a tightly scoped way.

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/shareCode.test.ts
import { describe, expect, it } from 'vitest';
import { generateShareCode } from './shareCode';

describe('generateShareCode', () => {
  it('generates an 8-character code', () => {
    expect(generateShareCode()).toHaveLength(8);
  });

  it('only uses unambiguous uppercase letters and digits (no 0/O/1/I)', () => {
    const code = generateShareCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it('produces different codes across many calls (extremely low collision odds)', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShareCode()));
    expect(codes.size).toBe(1000);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npm run test
```

Expected: FAIL — `src/lib/shareCode.ts` does not exist yet.

- [ ] **Step 4: Implement `src/lib/shareCode.ts`**

```ts
// src/lib/shareCode.ts

// Excludes 0/O and 1/I — a printed or handwritten code should never be
// ambiguous. This is not meant to be cryptographically strong (see design
// doc's Sécurité section) — Math.random() is deliberate, not a placeholder:
// it keeps this function identical in the browser and under Vitest's Node
// environment, with no dependency on Web Crypto API availability.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

export function generateShareCode(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test
```

Expected: PASS — all `shareCode.test.ts` tests green, `gameEngine.test.ts` still green (13 total).

- [ ] **Step 6: Add `share_code` to the `WordList` type**

In `src/lib/types.ts`, modify the `WordList` interface:

```ts
export interface WordList {
  id: string;
  user_id: string;
  nom: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
  share_code: string | null;
  created_at: string;
}
```

- [ ] **Step 7: Verify everything compiles**

```bash
npm run typecheck
```

Expected: exit 0. (`WordList.share_code` is a new required field on the type — nothing yet constructs a `WordList` object literal by hand outside Supabase responses, so this should not break existing code; if it does, that call site is missing the field and must be fixed as part of this step, not deferred.)

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260819000000_add_lexi_share_code.sql src/lib/shareCode.ts src/lib/shareCode.test.ts src/lib/types.ts
git commit -m "feat: add share-code generator, migration, and type"
```

---

## Task 2: `wordLists.ts` — generate share_code on create, add regenerateShareCode

**Files:**
- Modify: `src/lib/wordLists.ts`

- [ ] **Step 1: Import the generator and set `share_code` on creation**

In `src/lib/wordLists.ts`, add the import at the top:

```ts
import { generateShareCode } from './shareCode';
```

In `createWordList`, add `share_code: generateShareCode()` to the insert payload:

```ts
export async function createWordList(input: CreateWordListInput): Promise<WordList> {
  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .insert({
      user_id: input.userId,
      nom: input.nom,
      ordre_aleatoire: input.ordreAleatoire,
      distracteurs_actifs: input.distracteursActifs,
      nb_distracteurs: input.nbDistracteurs,
      indices_actifs: input.indicesActifs,
      share_code: generateShareCode(),
    })
    .select()
    .single();
  if (listError) throw listError;
```

(the rest of `createWordList` is unchanged)

- [ ] **Step 2: Add `regenerateShareCode`**

Append at the end of `src/lib/wordLists.ts`:

```ts
export async function regenerateShareCode(listId: string): Promise<WordList> {
  const { data, error } = await supabase
    .from('lexi_word_lists')
    .update({ share_code: generateShareCode() })
    .eq('id', listId)
    .select()
    .single();
  if (error) throw error;
  return data as WordList;
}
```

This also serves lists created before this feature existed (`share_code` still `null`) — calling it once assigns their first code.

- [ ] **Step 3: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/wordLists.ts
git commit -m "feat: generate share codes for new word lists, add regeneration"
```

---

## Task 3: Word-list share panel (link + QR + copy + regenerate)

**Files:**
- Create: `src/components/ShareLinkPanel.tsx`
- Modify: `src/components/WordListsManager.tsx`
- Modify: `package.json`

- [ ] **Step 1: Add the `qrcode` dependency**

In `package.json`, add to `dependencies`:

```json
    "qrcode": "^1.5.4",
```

And to `devDependencies`:

```json
    "@types/qrcode": "^1.5.5",
```

- [ ] **Step 2: Install**

```bash
npm install
```

Expected: exit 0, `qrcode` and `@types/qrcode` appear in `package-lock.json`.

- [ ] **Step 3: Write `ShareLinkPanel.tsx`**

```tsx
// src/components/ShareLinkPanel.tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { WordList } from '../lib/types';
import { regenerateShareCode } from '../lib/wordLists';

interface ShareLinkPanelProps {
  list: WordList;
  onListUpdated: (list: WordList) => void;
}

export function ShareLinkPanel({ list, onListUpdated }: ShareLinkPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = list.share_code ? `${window.location.origin}/jouer/${list.share_code}` : null;

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(shareUrl, { width: 200 })
      .then(setQrDataUrl)
      .catch(() => setError('Impossible de générer le QR code.'));
  }, [shareUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement.');
    }
  };

  const handleGenerate = async () => {
    setError(null);
    try {
      const updated = await regenerateShareCode(list.id);
      onListUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du lien.');
    }
  };

  return (
    <li className="py-3 border-b border-[var(--border)]" style={{ background: 'var(--surface2)' }}>
      <p className="text-sm font-semibold mb-2">Lien élève — {list.nom}</p>
      {error && <div className="plai-error mb-2" role="alert">{error}</div>}
      {shareUrl ? (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              className="plai-input"
              readOnly
              value={shareUrl}
              style={{ maxWidth: 320 }}
              onFocus={(e) => e.target.select()}
              aria-label="Lien de partage"
            />
            <button type="button" className="plai-btn" onClick={handleCopy}>
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>
            <button type="button" className="text-sm text-[var(--text3)]" onClick={handleGenerate}>
              Régénérer le lien
            </button>
          </div>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={`QR code pour rejoindre la liste ${list.nom}`}
              className="mt-3"
              width={200}
              height={200}
            />
          )}
        </>
      ) : (
        <button type="button" className="plai-btn" onClick={handleGenerate}>
          Générer le lien
        </button>
      )}
    </li>
  );
}
```

- [ ] **Step 4: Wire it into `WordListsManager.tsx`**

In `src/components/WordListsManager.tsx`, add the import:

```tsx
import { Fragment, useEffect, useState } from 'react';
```

(replace the existing `import { useEffect, useState } from 'react';` with the line above)

```tsx
import { ShareLinkPanel } from './ShareLinkPanel';
```

(add alongside the other component imports)

Add a new piece of state, alongside the existing ones:

```tsx
  const [sharingListId, setSharingListId] = useState<string | null>(null);
```

Replace the list-rendering block:

```tsx
      <ul className="mt-4">
        {lists.length === 0 && <li className="plai-empty">Aucune liste créée.</li>}
        {lists.map((l) => (
          <li key={l.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>{l.nom}</span>
            <span className="flex gap-3">
              <button
                type="button"
                className="text-sm text-[var(--teal-text)]"
                onClick={() => onPlayList(l)}
                aria-label={`Jouer à la liste ${l.nom}`}
              >
                Jouer
              </button>
              <button
                type="button"
                className="text-sm text-[var(--teal-text)]"
                onClick={() => onOpenList(l)}
                aria-label={`Voir la progression de la liste ${l.nom}`}
              >
                Progression
              </button>
              <button
                type="button"
                className="text-sm text-[var(--teal-text)]"
                onClick={() => handleEdit(l)}
                aria-label={`Modifier la liste ${l.nom}`}
              >
                Modifier
              </button>
              <button
                type="button"
                className="text-sm text-[var(--text3)]"
                onClick={() => handleDelete(l)}
                aria-label={`Supprimer la liste ${l.nom}`}
              >
                Supprimer
              </button>
            </span>
          </li>
        ))}
      </ul>
```

with:

```tsx
      <ul className="mt-4">
        {lists.length === 0 && <li className="plai-empty">Aucune liste créée.</li>}
        {lists.map((l) => (
          <Fragment key={l.id}>
            <li className="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>{l.nom}</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => onPlayList(l)}
                  aria-label={`Jouer à la liste ${l.nom}`}
                >
                  Jouer
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => onOpenList(l)}
                  aria-label={`Voir la progression de la liste ${l.nom}`}
                >
                  Progression
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => setSharingListId((id) => (id === l.id ? null : l.id))}
                  aria-expanded={sharingListId === l.id}
                  aria-label={`Partager la liste ${l.nom}`}
                >
                  Partager
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => handleEdit(l)}
                  aria-label={`Modifier la liste ${l.nom}`}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--text3)]"
                  onClick={() => handleDelete(l)}
                  aria-label={`Supprimer la liste ${l.nom}`}
                >
                  Supprimer
                </button>
              </span>
            </li>
            {sharingListId === l.id && (
              <ShareLinkPanel
                list={l}
                onListUpdated={(updated) => setLists((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
              />
            )}
          </Fragment>
        ))}
      </ul>
```

- [ ] **Step 5: Verify it compiles and builds**

```bash
npm run typecheck
npm run build
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/ShareLinkPanel.tsx src/components/WordListsManager.tsx package.json package-lock.json
git commit -m "feat: add share link/QR panel to word lists manager"
```

---

## Task 4: `Game.tsx` refactor — inject data access via `GameDataSource`

This decouples gameplay logic (wheel, grid, hints, scoring) from *how* words/sessions/attempts are fetched or written, so the same component serves both the teacher-authenticated flow (unchanged behavior) and the new public share-link flow (Task 8) without duplicating ~170 lines of game logic.

**Files:**
- Create: `src/lib/gameDataSource.ts`
- Modify: `src/components/Game.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `gameDataSource.ts`**

```ts
// src/lib/gameDataSource.ts
import { getWords } from './wordLists';
import { createSession, recordAttempt, type RecordAttemptInput } from './attempts';

export interface GameWordList {
  id: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
}

export interface GameStudent {
  id: string;
  code_anonyme: string;
}

export interface GameDataSource {
  getWords: (listId: string) => Promise<string[]>;
  createSession: (listId: string, studentId: string) => Promise<string>;
  recordAttempt: (input: RecordAttemptInput) => Promise<void>;
}

export const authenticatedGameDataSource: GameDataSource = {
  getWords: async (listId) => {
    const words = await getWords(listId);
    return words.map((w) => w.mot);
  },
  createSession: (listId, studentId) => createSession({ listId, studentId }),
  recordAttempt: (input) => recordAttempt(input),
};
```

- [ ] **Step 2: Update `Game.tsx`'s imports and props**

In `src/components/Game.tsx`, replace the import block:

```tsx
// src/components/Game.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Student, WordList } from '../lib/types';
import { getWords } from '../lib/wordLists';
import { createSession, recordAttempt } from '../lib/attempts';
import { buildWheelLetters, buildWordQueue, countWellPlaced, scoreForWord } from '../lib/gameEngine';
```

with:

```tsx
// src/components/Game.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDataSource, GameStudent, GameWordList } from '../lib/gameDataSource';
import { buildWheelLetters, buildWordQueue, countWellPlaced, scoreForWord } from '../lib/gameEngine';
```

Replace the `GameProps` interface:

```tsx
interface GameProps {
  list: WordList;
  student: Student;
  onExit: () => void;
}
```

with:

```tsx
interface GameProps {
  list: GameWordList;
  student: GameStudent;
  dataSource: GameDataSource;
  onExit: () => void;
}
```

Update the function signature:

```tsx
export function Game({ list, student, onExit }: GameProps) {
```

becomes:

```tsx
export function Game({ list, student, dataSource, onExit }: GameProps) {
```

- [ ] **Step 3: Route the two data-fetching effects and the attempt-recording call through `dataSource`**

Replace:

```tsx
  useEffect(() => {
    createSession({ listId: list.id, studentId: student.id })
      .then(setSessionId)
      .catch(() => setError('Impossible de démarrer la partie. Réessayez.'));
  }, [list.id, student.id]);

  useEffect(() => {
    getWords(list.id)
      .then((words) => {
        const ordered = words.map((w) => w.mot);
        setQueue(buildWordQueue(ordered, list.ordre_aleatoire));
      })
      .catch(() => setError('Impossible de charger les mots. Réessayez.'));
  }, [list.id, list.ordre_aleatoire]);
```

with:

```tsx
  useEffect(() => {
    dataSource
      .createSession(list.id, student.id)
      .then(setSessionId)
      .catch(() => setError('Impossible de démarrer la partie. Réessayez.'));
  }, [dataSource, list.id, student.id]);

  useEffect(() => {
    dataSource
      .getWords(list.id)
      .then((ordered) => {
        setQueue(buildWordQueue(ordered, list.ordre_aleatoire));
      })
      .catch(() => setError('Impossible de charger les mots. Réessayez.'));
  }, [dataSource, list.id, list.ordre_aleatoire]);
```

Replace the `recordAttempt({...})` call inside `submit()`:

```tsx
    try {
      await recordAttempt({
        sessionId,
        mot: currentWord,
        reussi: success,
        lettresBienPlacees: wellPlaced,
        score: success ? netScore : 0,
        distracteursActifs: list.distracteurs_actifs,
      });
    } catch {
```

with:

```tsx
    try {
      await dataSource.recordAttempt({
        sessionId,
        mot: currentWord,
        reussi: success,
        lettresBienPlacees: wellPlaced,
        score: success ? netScore : 0,
        distracteursActifs: list.distracteurs_actifs,
      });
    } catch {
```

Nothing else in `Game.tsx` changes — the rest of the component (grid, circular wheel, hints, scoring, speech) is data-source-agnostic already.

- [ ] **Step 4: Wire `authenticatedGameDataSource` into `App.tsx`**

In `src/App.tsx`, add the import:

```tsx
import { authenticatedGameDataSource } from './lib/gameDataSource';
```

Replace:

```tsx
  if (view.name === 'game') {
    return <Game list={view.list} student={view.student} onExit={() => setView({ name: 'dashboard' })} />;
  }
```

with:

```tsx
  if (view.name === 'game') {
    return (
      <Game
        list={view.list}
        student={view.student}
        dataSource={authenticatedGameDataSource}
        onExit={() => setView({ name: 'dashboard' })}
      />
    );
  }
```

(`view.list`/`view.student` are still typed as `WordList`/`Student` from `./lib/types` — TypeScript accepts passing them where `GameWordList`/`GameStudent` are expected, since those interfaces are structural subsets. No other change needed in `App.tsx`.)

- [ ] **Step 5: Verify it compiles, tests and builds**

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all exit 0, 13 tests still passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gameDataSource.ts src/components/Game.tsx src/App.tsx
git commit -m "refactor: inject game data access via GameDataSource"
```

---

## Task 5: Serverless API infrastructure + `play-list` endpoint

**Files:**
- Create: `api/_supabaseAdmin.ts`
- Create: `api/tsconfig.json`
- Create: `api/play-list.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Add `@vercel/node` and `@types/node`**

In `package.json`, add to `devDependencies`:

```json
    "@types/node": "^20.14.10",
    "@vercel/node": "^3.2.29",
```

- [ ] **Step 2: Add a second `tsconfig` covering `api/`, and update the typecheck script**

Create `api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["*.ts"]
}
```

`tsconfig.app.json` only covers `src/`, so without this, `npm run typecheck` would silently never check `api/*.ts`. Update `package.json`'s `typecheck` script:

```json
    "typecheck": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p api/tsconfig.json",
```

- [ ] **Step 3: Install**

```bash
npm install
```

Expected: exit 0.

- [ ] **Step 4: Write the shared admin-client helper**

```ts
// api/_supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// Prefixed with `_` so Vercel does not deploy this file as its own route —
// it's a shared helper for the other files in this directory, not an endpoint.
export function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment variables');
  }
  return createClient(url, serviceRoleKey);
}
```

`SUPABASE_SERVICE_ROLE_KEY` must never be prefixed `VITE_` — that prefix is what makes Vite bundle a variable into the client-facing JS. This key stays server-only. `VITE_SUPABASE_URL` is reused here purely for the (non-secret) project URL — Vercel exposes all configured env vars to serverless functions regardless of prefix, only the client *bundle* is filtered by the `VITE_` convention.

- [ ] **Step 5: Write `play-list.ts`**

```ts
// api/play-list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    res.status(400).json({ error: 'Code manquant' });
    return;
  }

  const supabase = supabaseAdmin();

  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .select('id, user_id, nom, ordre_aleatoire, distracteurs_actifs, nb_distracteurs, indices_actifs')
    .eq('share_code', code)
    .maybeSingle();

  if (listError || !list) {
    res.status(404).json({ error: 'Lien invalide ou expiré' });
    return;
  }

  const { data: words, error: wordsError } = await supabase
    .from('lexi_words')
    .select('mot, position')
    .eq('list_id', list.id)
    .order('position', { ascending: true });

  if (wordsError || !words) {
    res.status(500).json({ error: 'Erreur lors du chargement des mots' });
    return;
  }

  const { data: students, error: studentsError } = await supabase
    .from('lexi_students')
    .select('id, code_anonyme')
    .eq('user_id', list.user_id)
    .order('code_anonyme', { ascending: true });

  if (studentsError || !students) {
    res.status(500).json({ error: 'Erreur lors du chargement des élèves' });
    return;
  }

  // `list.user_id` is used above only to scope the students query — it is
  // deliberately NOT included in the response object below.
  res.status(200).json({
    list: {
      id: list.id,
      nom: list.nom,
      ordre_aleatoire: list.ordre_aleatoire,
      distracteurs_actifs: list.distracteurs_actifs,
      nb_distracteurs: list.nb_distracteurs,
      indices_actifs: list.indices_actifs,
    },
    words: words.map((w) => w.mot),
    students,
  });
}
```

- [ ] **Step 6: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`**

```
VITE_SUPABASE_URL=https://dfoaumjleqtxjeaplnna.supabase.co
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0 (both `tsconfig.app.json` and `api/tsconfig.json` checked).

- [ ] **Step 8: Commit**

```bash
git add api/_supabaseAdmin.ts api/tsconfig.json api/play-list.ts package.json package-lock.json .env.example
git commit -m "feat: add serverless API infra and play-list endpoint"
```

---

## Task 6: `play-session` endpoint

**Files:**
- Create: `api/play-session.ts`

- [ ] **Step 1: Write the handler**

```ts
// api/play-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { code, studentId } = (req.body ?? {}) as { code?: unknown; studentId?: unknown };
  if (typeof code !== 'string' || typeof studentId !== 'string') {
    res.status(400).json({ error: 'Paramètres manquants' });
    return;
  }

  const supabase = supabaseAdmin();

  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .select('id, user_id')
    .eq('share_code', code)
    .maybeSingle();
  if (listError || !list) {
    res.status(404).json({ error: 'Lien invalide ou expiré' });
    return;
  }

  const { data: student, error: studentError } = await supabase
    .from('lexi_students')
    .select('id')
    .eq('id', studentId)
    .eq('user_id', list.user_id)
    .maybeSingle();
  if (studentError || !student) {
    res.status(403).json({ error: 'Élève invalide pour cette liste' });
    return;
  }

  const { data: session, error: sessionError } = await supabase
    .from('lexi_sessions')
    .insert({ list_id: list.id, student_id: studentId })
    .select('id')
    .single();
  if (sessionError || !session) {
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
    return;
  }

  res.status(200).json({ sessionId: session.id });
}
```

The `studentId`-belongs-to-`list.user_id` check is the key defense here: without it, a client could pass any student UUID it can guess/enumerate and create a session — and later attempts — attributed to a student under a *different* teacher's roster.

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add api/play-session.ts
git commit -m "feat: add play-session endpoint"
```

---

## Task 7: `play-attempt` endpoint

**Files:**
- Create: `api/play-attempt.ts`

- [ ] **Step 1: Write the handler**

```ts
// api/play-attempt.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin';

interface PlayAttemptBody {
  code?: unknown;
  sessionId?: unknown;
  mot?: unknown;
  reussi?: unknown;
  lettresBienPlacees?: unknown;
  score?: unknown;
  distracteursActifs?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { code, sessionId, mot, reussi, lettresBienPlacees, score, distracteursActifs } = (req.body ??
    {}) as PlayAttemptBody;

  if (
    typeof code !== 'string' ||
    typeof sessionId !== 'string' ||
    typeof mot !== 'string' ||
    typeof reussi !== 'boolean' ||
    typeof lettresBienPlacees !== 'number' ||
    typeof score !== 'number' ||
    typeof distracteursActifs !== 'boolean'
  ) {
    res.status(400).json({ error: 'Paramètres invalides' });
    return;
  }

  const supabase = supabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from('lexi_sessions')
    .select('id, lexi_word_lists(share_code)')
    .eq('id', sessionId)
    .maybeSingle();

  type SessionRow = { id: string; lexi_word_lists: { share_code: string | null } | null };
  const typedSession = session as unknown as SessionRow | null;

  if (sessionError || !typedSession || typedSession.lexi_word_lists?.share_code !== code) {
    res.status(403).json({ error: 'Session invalide pour ce lien' });
    return;
  }

  const { error: attemptError } = await supabase.from('lexi_attempts').insert({
    session_id: sessionId,
    mot,
    reussi,
    lettres_bien_placees: lettresBienPlacees,
    score,
    distracteurs_actifs: distracteursActifs,
  });
  if (attemptError) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
    return;
  }

  res.status(200).json({ ok: true });
}
```

The `typedSession.lexi_word_lists?.share_code !== code` check is the key defense here: it proves the `sessionId` the client is submitting an attempt for was genuinely created against *this* share code's list, not an arbitrary session UUID borrowed from elsewhere.

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add api/play-attempt.ts
git commit -m "feat: add play-attempt endpoint"
```

---

## Task 8: Public play flow — client, component, routing

**Files:**
- Create: `src/lib/publicPlay.ts`
- Create: `src/components/PublicPlay.tsx`
- Modify: `src/main.tsx`
- Modify: `vercel.json`

- [ ] **Step 1: Write `publicPlay.ts`**

```ts
// src/lib/publicPlay.ts
import type { GameDataSource, GameStudent, GameWordList } from './gameDataSource';
import type { RecordAttemptInput } from './attempts';

export interface PublicPlayData {
  list: GameWordList & { nom: string };
  words: string[];
  students: GameStudent[];
}

async function parseJsonOrThrow(response: Response): Promise<any> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? 'Erreur de connexion au serveur.');
  }
  return body;
}

export async function fetchPlayList(code: string): Promise<PublicPlayData> {
  const response = await fetch(`/api/play-list?code=${encodeURIComponent(code)}`);
  return parseJsonOrThrow(response);
}

export function publicGameDataSource(code: string): GameDataSource {
  return {
    getWords: async () => {
      const data = await fetchPlayList(code);
      return data.words;
    },
    createSession: async (_listId, studentId) => {
      const response = await fetch('/api/play-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, studentId }),
      });
      const body = await parseJsonOrThrow(response);
      return body.sessionId as string;
    },
    recordAttempt: async (input: RecordAttemptInput) => {
      const response = await fetch('/api/play-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...input }),
      });
      await parseJsonOrThrow(response);
    },
  };
}
```

`getWords` re-fetches `/api/play-list` rather than reusing what `PublicPlay.tsx` already loaded for the student picker — one small redundant request, accepted deliberately to keep `GameDataSource`'s shape identical for both implementations rather than threading pre-fetched words through extra props. `authenticatedGameDataSource` already re-fetches on every `Game` mount too (existing, unchanged behavior), so this keeps the two paths consistent.

- [ ] **Step 2: Write `PublicPlay.tsx`**

```tsx
// src/components/PublicPlay.tsx
import { useEffect, useMemo, useState } from 'react';
import { Game } from './Game';
import { FormField } from './FormField';
import { fetchPlayList, publicGameDataSource, type PublicPlayData } from '../lib/publicPlay';
import type { GameStudent } from '../lib/gameDataSource';

interface PublicPlayProps {
  code: string;
}

export function PublicPlay({ code }: PublicPlayProps) {
  const [data, setData] = useState<PublicPlayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [student, setStudent] = useState<GameStudent | null>(null);
  // Memoized so Game's effects (which depend on `dataSource` by reference)
  // don't re-fire every time PublicPlay re-renders for an unrelated reason.
  const dataSource = useMemo(() => publicGameDataSource(code), [code]);

  useEffect(() => {
    fetchPlayList(code)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lien invalide ou expiré.'));
  }, [code]);

  if (error) {
    return (
      <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
        <div className="plai-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return <p aria-live="polite">Chargement...</p>;

  if (student) {
    return <Game list={data.list} student={student} dataSource={dataSource} onExit={() => setStudent(null)} />;
  }

  const handleStart = () => {
    const found = data.students.find((s) => s.id === selectedId);
    if (found) setStudent(found);
  };

  return (
    <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
      <h1 className="font-serif text-xl mb-1">{data.list.nom}</h1>
      <h2 className="font-serif text-lg mb-3">Qui joue ?</h2>
      <FormField label="Ton code" required help="Choisis le code que ton/ta enseignant(e) t'a donné.">
        <select className="plai-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Choisir —</option>
          {data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code_anonyme}
            </option>
          ))}
        </select>
      </FormField>
      <button className="plai-btn mt-3" type="button" disabled={!selectedId} onClick={handleStart}>
        Commencer
      </button>
    </div>
  );
}
```

Note `onExit={() => setStudent(null)}`: leaving the game from the public flow returns to this same list's student picker — never to any teacher dashboard, since `PublicPlay` never touches `App.tsx` or Supabase Auth at all.

- [ ] **Step 3: Wire the route in `main.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PublicPlay } from './components/PublicPlay.tsx';
import './index.css';
import './plai-style.css';

const playMatch = window.location.pathname.match(/^\/jouer\/([A-Za-z0-9]+)\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>{playMatch ? <PublicPlay code={playMatch[1]} /> : <App />}</StrictMode>
);
```

- [ ] **Step 4: Exclude `/api` from the SPA rewrite**

In `vercel.json`, replace:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

with:

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

Without this, Vercel could rewrite requests to `/api/play-list` into the SPA's `index.html` instead of routing them to the serverless function — the negative lookahead `(?!api/)` excludes anything under `/api/`.

- [ ] **Step 5: Verify it compiles, tests and builds**

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all exit 0, 13 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/publicPlay.ts src/components/PublicPlay.tsx src/main.tsx vercel.json
git commit -m "feat: add public share-link play flow and routing"
```

---

## Task 9: Documentation, final verification, deploy prep

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the new environment variable and local-testing requirement**

Append to `README.md`'s "Déploiement" section:

```markdown
- `SUPABASE_SERVICE_ROLE_KEY` : variable Vercel supplémentaire, réservée aux fonctions serverless `/api/play-*` (jamais préfixée `VITE_`, jamais dans le frontend). Contourne les règles RLS — à traiter comme un secret admin complet sur le projet Supabase partagé.

Le parcours élève par lien/QR (`/jouer/:code`) repose sur `/api/*` : comme pour les fonctions IA des autres apps PLAI, `npm run dev` seul ne fait pas tourner ces routes — utiliser `vercel dev` pour le tester en local.
```

- [ ] **Step 2: Run the full verification suite one last time**

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all exit 0, 13 tests passing.

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: document SUPABASE_SERVICE_ROLE_KEY and vercel dev requirement"
git push
```

- [ ] **Step 4: Report the manual steps still required (do not attempt from this environment)**

After this push, the human needs to, outside of this implementation:
1. Apply `supabase/migrations/20260819000000_add_lexi_share_code.sql` via the Supabase SQL editor (the `supabase db push` CLI path has been broken since Task 2 of the original plan — same manual-apply workaround as before).
2. Add `SUPABASE_SERVICE_ROLE_KEY` (found in the Supabase project's API settings, "service_role" key — not the "anon" key already in use) to the Vercel project's environment variables.
3. Test the `/jouer/:code` flow against a real deployment (or `vercel dev` locally) once both of the above are done — this plan has no automated test coverage for the three `api/play-*.ts` handlers themselves.

---

## Plan self-review notes

- **Spec coverage:** share-code generation and stability across edits (Task 1–2), teacher UI for link/QR/copy/regenerate (Task 3), no duplicated gameplay logic between flows (Task 4's `GameDataSource` injection), server-side ownership re-validation on every write (Tasks 6–7's explicit checks), public route never touching teacher auth (Task 8's `main.tsx` routing bypassing `App.tsx` entirely), service-role key kept server-only and undocumented nowhere except Vercel env vars (Task 5 comment + Task 9 README) — all covered.
- **Security-sensitive code (Tasks 5–7) should get careful spec + quality review during implementation** — this is the one part of this plan that, if wrong, could leak cross-teacher data or allow forged writes. Treat review of these three tasks as non-negotiable, not a formality.
- **Out of scope, confirmed not silently dropped:** link expiration, rate limiting on public endpoints, per-class (rather than per-list) share codes — all explicitly excluded in the design doc's "Hors scope" section, not attempted here.
