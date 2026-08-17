# LexiActif Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build LexiActif, a letter-wheel word reconstruction game for teachers, replacing the standalone `WoW éducatif/index.html` prototype with a React/Vite/Supabase app that fixes its fluidity, accessibility, and RISS-grounding gaps.

**Architecture:** React 18 + TypeScript + Vite SPA, styled with the shared `plai-style.css` + Tailwind utility classes, backed by Supabase (auth + Postgres + RLS) on the shared project `dfoaumjleqtxjeaplnna`. A pure, dependency-free game-engine module (`src/lib/gameEngine.ts`) holds all game logic (word queueing, wheel generation with optional distractors, scoring, qualified feedback) so it can be unit-tested with Vitest independent of React. Deployed to Vercel as `lexiactif.jfb4plai.com`.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind CSS v3, `@supabase/supabase-js` v2, Vitest, Web Speech API (`SpeechSynthesisUtterance`), Vercel.

Reference spec: `docs/superpowers/specs/2026-08-17-lexiactif-design.md`

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`
- Copy: `shared/css/plai-style.css` → `src/plai-style.css`
- Copy: `shared/css/plai-logo.jpg` → `public/plai-logo.jpg`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "lexiactif",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit -p tsconfig.app.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/supabase/functions/**',
      '.claude/**',
    ],
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `tailwind.config.js` and `postcss.config.js`**

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    },
  },
  plugins: [],
};
```

`postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/jpeg" href="/plai-logo.jpg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LexiActif</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Copy the canonical PLAI stylesheet and logo**

```bash
cp "../shared/css/plai-style.css" "src/plai-style.css"
mkdir -p public
cp "../shared/css/plai-logo.jpg" "public/plai-logo.jpg"
```

- [ ] **Step 8: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 9: Create `src/main.tsx`** (placeholder `App` — replaced in Task 6)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './plai-style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// src/App.tsx (temporary placeholder, replaced in Task 6)
function App() {
  return <p>LexiActif — scaffold OK</p>;
}

export default App;
```

- [ ] **Step 10: Create `.gitignore`**

```
node_modules
dist
.env
.env.local
.superpowers

.vercel
```

- [ ] **Step 11: Create `.env.example`**

```
VITE_SUPABASE_URL=https://dfoaumjleqtxjeaplnna.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 12: Install dependencies and verify the scaffold builds**

```bash
npm install
npm run typecheck
npm run build
```

Expected: all three commands exit 0. `dist/index.html` exists after build.

- [ ] **Step 13: Update `README.md`** — add setup instructions

```markdown
## Développement local

```bash
npm install
cp .env.example .env.local   # renseigner VITE_SUPABASE_ANON_KEY
npm run dev
```
```

Append this section to the existing `README.md` (keep the existing content above it).

- [ ] **Step 14: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js index.html src/main.tsx src/App.tsx src/index.css src/plai-style.css src/vite-env.d.ts public/plai-logo.jpg .gitignore .env.example README.md package-lock.json
git commit -m "chore: scaffold Vite/React/TS project with shared PLAI style"
```

---

## Task 2: Supabase schema (`lexi_*` tables + RLS)

No name collision with existing PLAI apps — verified via `grep -r "lexi_"` across the workspace (no hits) before writing this migration.

**Files:**
- Create: `supabase/migrations/20260817000000_create_lexi_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- lexiactif/supabase/migrations/20260817000000_create_lexi_tables.sql

create table if not exists public.lexi_word_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  ordre_aleatoire boolean not null default false,
  distracteurs_actifs boolean not null default false,
  nb_distracteurs integer not null default 0 check (nb_distracteurs between 0 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.lexi_words (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lexi_word_lists(id) on delete cascade,
  mot text not null,
  position integer not null
);

create table if not exists public.lexi_students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_anonyme text not null,
  classe text,
  created_at timestamptz not null default now(),
  unique (user_id, code_anonyme)
);

create table if not exists public.lexi_sessions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lexi_word_lists(id) on delete cascade,
  student_id uuid not null references public.lexi_students(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.lexi_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lexi_sessions(id) on delete cascade,
  mot text not null,
  reussi boolean not null,
  lettres_bien_placees integer not null,
  score integer not null default 0,
  distracteurs_actifs boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.lexi_word_lists enable row level security;
alter table public.lexi_words enable row level security;
alter table public.lexi_students enable row level security;
alter table public.lexi_sessions enable row level security;
alter table public.lexi_attempts enable row level security;

create policy "lexi_word_lists_owner_all" on public.lexi_word_lists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lexi_words_owner_all" on public.lexi_words
  for all
  using (
    exists (
      select 1 from public.lexi_word_lists l
      where l.id = lexi_words.list_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lexi_word_lists l
      where l.id = lexi_words.list_id and l.user_id = auth.uid()
    )
  );

create policy "lexi_students_owner_all" on public.lexi_students
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lexi_sessions_owner_all" on public.lexi_sessions
  for all
  using (
    exists (
      select 1 from public.lexi_students s
      where s.id = lexi_sessions.student_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lexi_students s
      where s.id = lexi_sessions.student_id and s.user_id = auth.uid()
    )
  );

create policy "lexi_attempts_owner_all" on public.lexi_attempts
  for all
  using (
    exists (
      select 1 from public.lexi_sessions se
      join public.lexi_students s on s.id = se.student_id
      where se.id = lexi_attempts.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lexi_sessions se
      join public.lexi_students s on s.id = se.student_id
      where se.id = lexi_attempts.session_id and s.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Link the project to the shared Supabase project and push the migration**

```bash
supabase link --project-ref dfoaumjleqtxjeaplnna
supabase db push
```

Expected: CLI reports the new migration applied, no errors. If `supabase link` asks for a database password, use the one stored for the shared PLAI Supabase project (not in this repo).

- [ ] **Step 3: Verify RLS is enabled on all five tables**

In the Supabase SQL editor, run:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('lexi_word_lists', 'lexi_words', 'lexi_students', 'lexi_sessions', 'lexi_attempts');
```

Expected: `relrowsecurity = true` for all five rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817000000_create_lexi_tables.sql
git commit -m "feat: add lexi_* Supabase schema with RLS"
```

---

## Task 3: Supabase client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Write the client**

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client"
```

---

## Task 4: Domain types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write the types**

```ts
// src/lib/types.ts

export interface WordList {
  id: string;
  user_id: string;
  nom: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  created_at: string;
}

export interface Word {
  id: string;
  list_id: string;
  mot: string;
  position: number;
}

export interface Student {
  id: string;
  user_id: string;
  code_anonyme: string;
  classe: string | null;
  created_at: string;
}

export interface GameSession {
  id: string;
  list_id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface Attempt {
  id: string;
  session_id: string;
  mot: string;
  reussi: boolean;
  lettres_bien_placees: number;
  score: number;
  distracteurs_actifs: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0 (unused-export is fine, `noUnusedLocals` only flags unused local variables, not unused exports).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add domain types"
```

---

## Task 5: Game engine — pure logic (TDD)

This is the core of the RISS-grounded fix: word ordering that respects the teacher's list order by default, wheel generation with optional distractor letters, and qualified feedback (letters correctly placed) instead of a bare pass/fail message.

**Files:**
- Create: `src/lib/gameEngine.ts`
- Test: `src/lib/gameEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/gameEngine.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildWordQueue,
  buildWheelLetters,
  countWellPlaced,
  createSeededRng,
  scoreForWord,
} from './gameEngine';

describe('createSeededRng', () => {
  it('is deterministic for a given seed', () => {
    const rngA = createSeededRng(42);
    const rngB = createSeededRng(42);
    const valuesA = [rngA(), rngA(), rngA()];
    const valuesB = [rngB(), rngB(), rngB()];
    expect(valuesA).toEqual(valuesB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 20; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('buildWordQueue', () => {
  const words = ['CHAT', 'ARBRE', 'MAISON'];

  it('preserves the given order when randomOrder is false', () => {
    expect(buildWordQueue(words, false)).toEqual(['CHAT', 'ARBRE', 'MAISON']);
  });

  it('does not mutate the input array', () => {
    const original = [...words];
    buildWordQueue(words, false);
    expect(words).toEqual(original);
  });

  it('shuffles when randomOrder is true, using the given rng', () => {
    const rng = createSeededRng(7);
    const queue = buildWordQueue(words, true, rng);
    expect(queue).toHaveLength(3);
    expect(queue.slice().sort()).toEqual(words.slice().sort());
  });
});

describe('buildWheelLetters', () => {
  it('contains exactly the word letters when distractors are disabled', () => {
    const rng = createSeededRng(1);
    const letters = buildWheelLetters('CHAT', false, 0, rng);
    expect(letters.slice().sort()).toEqual(['C', 'H', 'A', 'T'].sort());
    expect(letters).toHaveLength(4);
  });

  it('adds the requested number of distractor letters', () => {
    const rng = createSeededRng(1);
    const letters = buildWheelLetters('CHAT', true, 2, rng);
    expect(letters).toHaveLength(6);
  });

  it('shuffles the letters (not in the original word order) for a fixed seed', () => {
    const rng = createSeededRng(3);
    const letters = buildWheelLetters('MAISON', false, 0, rng);
    expect(letters.join('')).not.toEqual('MAISON');
    expect(letters.slice().sort().join('')).toEqual('MAISON'.split('').sort().join(''));
  });
});

describe('countWellPlaced', () => {
  it('counts letters at the same index as the target', () => {
    expect(countWellPlaced('CHAT', 'CHAT')).toBe(4);
    expect(countWellPlaced('CHTA', 'CHAT')).toBe(2);
    expect(countWellPlaced('XXXX', 'CHAT')).toBe(0);
  });

  it('only compares up to the shorter string length', () => {
    expect(countWellPlaced('CH', 'CHAT')).toBe(2);
  });
});

describe('scoreForWord', () => {
  it('awards 10 points per letter', () => {
    expect(scoreForWord('CHAT')).toBe(40);
    expect(scoreForWord('MAISON')).toBe(60);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run test
```

Expected: FAIL — `src/lib/gameEngine.ts` does not exist yet (`Cannot find module './gameEngine'`).

- [ ] **Step 3: Implement `src/lib/gameEngine.ts`**

```ts
// src/lib/gameEngine.ts

/** Seeded PRNG (mulberry32) so game-logic tests are deterministic. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds the sequence of words for a session.
 * Default (randomOrder = false) preserves the teacher-defined list order,
 * so the "difficulty ordering" guidance shown to teachers has a real effect.
 */
export function buildWordQueue(
  words: string[],
  randomOrder: boolean,
  rng: () => number = Math.random
): string[] {
  return randomOrder ? shuffle(words, rng) : [...words];
}

const DISTRACTOR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Builds the shuffled letters for the wheel: the target word's letters,
 * plus `distractorCount` extra random letters when enabled. Distractors
 * force the player to identify which letters belong to the word, not just
 * their order — closer to genuine lexical recall (see RISS note in the
 * word-list editor).
 */
export function buildWheelLetters(
  word: string,
  distractorsEnabled: boolean,
  distractorCount: number,
  rng: () => number = Math.random
): string[] {
  const letters = word.split('');
  if (distractorsEnabled && distractorCount > 0) {
    for (let i = 0; i < distractorCount; i++) {
      letters.push(DISTRACTOR_POOL[Math.floor(rng() * DISTRACTOR_POOL.length)]);
    }
  }
  return shuffle(letters, rng);
}

/** Qualified feedback: how many letters are in the correct position, without revealing which. */
export function countWellPlaced(attempt: string, target: string): number {
  let count = 0;
  const len = Math.min(attempt.length, target.length);
  for (let i = 0; i < len; i++) {
    if (attempt[i] === target[i]) count++;
  }
  return count;
}

export function scoreForWord(word: string): number {
  return word.length * 10;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test
```

Expected: PASS — all `gameEngine.test.ts` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameEngine.ts src/lib/gameEngine.test.ts
git commit -m "feat: add pure game-engine logic with unit tests"
```

---

## Task 6: `FormField` component (contextual guidance pattern)

Reuses the PLAI form-guidance pattern already validated in RituActif/DiffActif: every field gets a label, and an optional help line rendered right under the input — the mechanism the "guidage contextuel obligatoire" rule requires.

**Files:**
- Create: `src/components/FormField.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/FormField.tsx
import { useId, cloneElement, type ReactElement, type CSSProperties } from 'react';

type FieldChildProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  style?: CSSProperties;
  children: ReactElement<FieldChildProps>;
}

export function FormField({ label, help, error, required, style, children }: FormFieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const field = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    required: required || children.props.required,
  });

  return (
    <div className="plai-field" style={style}>
      <label className="plai-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {field}
      {help && (
        <p id={helpId} className="text-xs text-[var(--text3)] mt-1">
          {help}
        </p>
      )}
      {error && (
        <div id={errorId} className="plai-error mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/FormField.tsx
git commit -m "feat: add FormField contextual-guidance component"
```

---

## Task 7: Auth + App shell

**Files:**
- Create: `src/components/Auth.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `Auth.tsx`**

```tsx
// src/components/Auth.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { FormField } from './FormField';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="plai-section" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="plai-card">
        <h1 className="font-serif text-xl mb-4">LexiActif</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label="Email" required>
            <input
              className="plai-input"
              type="email"
              placeholder="votre.email@ecole.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Mot de passe" required>
            <input
              className="plai-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </FormField>
          {error && <div className="plai-error" aria-live="polite">{error}</div>}
          <button className="plai-btn" type="submit" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
        <button
          type="button"
          className="text-sm text-[var(--text3)] mt-3"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/App.tsx` with the session-gated shell**

The view union anticipates the components built in Tasks 8–12. `TeacherDashboard`, `StudentSelect`, and `Game` are stubbed here and completed in later tasks — importing them now would fail typecheck, so this step's App.tsx only wires `Auth` + a placeholder dashboard; Task 10 replaces the placeholder with the real `TeacherDashboard`.

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  return <p>Connecté — tableau de bord à venir (Task 10).</p>;
}

export default App;
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/Auth.tsx src/App.tsx
git commit -m "feat: add Supabase auth and session-gated app shell"
```

---

## Task 8: Students manager (teacher side)

**Files:**
- Create: `src/lib/students.ts`
- Create: `src/components/StudentsManager.tsx`

- [ ] **Step 1: Write the data-access functions**

```ts
// src/lib/students.ts
import { supabase } from './supabase';
import type { Student } from './types';

export async function listStudents(userId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('lexi_students')
    .select('*')
    .eq('user_id', userId)
    .order('code_anonyme', { ascending: true });
  if (error) throw error;
  return data as Student[];
}

export async function createStudent(
  userId: string,
  codeAnonyme: string,
  classe: string | null
): Promise<Student> {
  const { data, error } = await supabase
    .from('lexi_students')
    .insert({ user_id: userId, code_anonyme: codeAnonyme, classe })
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('lexi_students').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Write `StudentsManager.tsx`**

```tsx
// src/components/StudentsManager.tsx
import { useEffect, useState } from 'react';
import type { Student } from '../lib/types';
import { createStudent, deleteStudent, listStudents } from '../lib/students';
import { FormField } from './FormField';

interface StudentsManagerProps {
  userId: string;
}

export function StudentsManager({ userId }: StudentsManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [code, setCode] = useState('');
  const [classe, setClasse] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStudents(userId).then(setStudents).catch((e) => setError(e.message));
  }, [userId]);

  const handleAdd = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Le code élève est obligatoire.');
      return;
    }
    try {
      const student = await createStudent(userId, trimmed, classe.trim() || null);
      setStudents((prev) => [...prev, student].sort((a, b) => a.code_anonyme.localeCompare(b.code_anonyme)));
      setCode('');
      setClasse('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">Élèves</h2>
      <div className="flex gap-3 items-end flex-wrap">
        <FormField
          label="Code élève"
          help="Jamais le prénom réel de l'élève — un code que vous seul(e) pouvez relier à son identité, ex. EL-3B-07."
        >
          <input
            className="plai-input"
            placeholder="EL-3B-07"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="Classe (facultatif)" help="Pour filtrer la liste, ex. 3B.">
          <input
            className="plai-input"
            placeholder="3B"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
          />
        </FormField>
        <button className="plai-btn" type="button" onClick={handleAdd}>
          Ajouter
        </button>
      </div>
      {error && <div className="plai-error mt-2" role="alert">{error}</div>}
      <ul className="mt-4">
        {students.length === 0 && <li className="plai-empty">Aucun élève enregistré.</li>}
        {students.map((s) => (
          <li key={s.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>
              {s.code_anonyme}
              {s.classe ? ` — ${s.classe}` : ''}
            </span>
            <button
              type="button"
              className="text-sm text-[var(--text3)]"
              onClick={() => handleDelete(s.id)}
              aria-label={`Supprimer l'élève ${s.code_anonyme}`}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/students.ts src/components/StudentsManager.tsx
git commit -m "feat: add students manager (anonymous codes, no real names)"
```

---

## Task 9: Word lists manager (teacher side)

Implements the length warning (no silent rejection, ≤10 letters recommended), the "ordre respecté" contextual help, and the distractors toggle with its RISS-grounded explanation.

**Files:**
- Create: `src/lib/wordLists.ts`
- Create: `src/components/WordListsManager.tsx`

- [ ] **Step 1: Write the data-access functions**

```ts
// src/lib/wordLists.ts
import { supabase } from './supabase';
import type { Word, WordList } from './types';

export async function listWordLists(userId: string): Promise<WordList[]> {
  const { data, error } = await supabase
    .from('lexi_word_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WordList[];
}

export async function getWords(listId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('lexi_words')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data as Word[];
}

export interface CreateWordListInput {
  userId: string;
  nom: string;
  words: string[];
  ordreAleatoire: boolean;
  distracteursActifs: boolean;
  nbDistracteurs: number;
}

export async function createWordList(input: CreateWordListInput): Promise<WordList> {
  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .insert({
      user_id: input.userId,
      nom: input.nom,
      ordre_aleatoire: input.ordreAleatoire,
      distracteurs_actifs: input.distracteursActifs,
      nb_distracteurs: input.nbDistracteurs,
    })
    .select()
    .single();
  if (listError) throw listError;

  const rows = input.words.map((mot, index) => ({
    list_id: list.id,
    mot: mot.toUpperCase(),
    position: index,
  }));
  const { error: wordsError } = await supabase.from('lexi_words').insert(rows);
  if (wordsError) throw wordsError;

  return list as WordList;
}
```

- [ ] **Step 2: Write `WordListsManager.tsx`**

```tsx
// src/components/WordListsManager.tsx
import { useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { createWordList, listWordLists } from '../lib/wordLists';
import { FormField } from './FormField';

const LONG_WORD_THRESHOLD = 10;

interface WordListsManagerProps {
  userId: string;
  onOpenList: (list: WordList) => void;
}

function parseWords(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.toUpperCase());
}

export function WordListsManager({ userId, onOpenList }: WordListsManagerProps) {
  const [lists, setLists] = useState<WordList[]>([]);
  const [nom, setNom] = useState('');
  const [rawWords, setRawWords] = useState('');
  const [ordreAleatoire, setOrdreAleatoire] = useState(false);
  const [distracteursActifs, setDistracteursActifs] = useState(false);
  const [nbDistracteurs, setNbDistracteurs] = useState(1);
  const [showRissNote, setShowRissNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWordLists(userId).then(setLists).catch((e) => setError(e.message));
  }, [userId]);

  const words = parseWords(rawWords);
  const longWords = words.filter((w) => w.length > LONG_WORD_THRESHOLD);

  const handleCreate = async () => {
    setError(null);
    if (!nom.trim()) {
      setError('Le nom de la liste est obligatoire.');
      return;
    }
    if (words.length === 0) {
      setError('Ajoutez au moins un mot.');
      return;
    }
    try {
      const list = await createWordList({
        userId,
        nom: nom.trim(),
        words,
        ordreAleatoire,
        distracteursActifs,
        nbDistracteurs: distracteursActifs ? nbDistracteurs : 0,
      });
      setLists((prev) => [list, ...prev]);
      setNom('');
      setRawWords('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
    }
  };

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">Listes de mots</h2>

      <FormField label="Nom de la liste" required help="Ex. « Animaux de la ferme », « Semaine 3 »." style={{ marginBottom: 12 }}>
        <input className="plai-input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Animaux de la ferme" />
      </FormField>

      <FormField
        label="Mots (un par ligne)"
        required
        help="L'ordre des mots dans la liste est respecté pendant la partie. Pour une difficulté progressive, placez les mots les plus courts/familiers en premier, les plus longs ou les moins fréquents ensuite."
        style={{ marginBottom: 4 }}
      >
        <textarea
          className="plai-input"
          rows={6}
          value={rawWords}
          onChange={(e) => setRawWords(e.target.value)}
          placeholder={'CHAT\nARBRE\nMAISON'}
        />
      </FormField>
      {longWords.length > 0 && (
        <p className="plai-banner" role="status">
          ⚠️ {longWords.length} mot(s) dépassent {LONG_WORD_THRESHOLD} lettres et risquent d'être peu lisibles sur la
          roue à l'écran : {longWords.join(', ')}
        </p>
      )}

      <label className="flex items-center gap-2 mt-3">
        <input type="checkbox" checked={ordreAleatoire} onChange={(e) => setOrdreAleatoire(e.target.checked)} />
        Ordre aléatoire des mots (désactivé : l'ordre de la liste ci-dessus est suivi)
      </label>

      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={distracteursActifs}
          onChange={(e) => setDistracteursActifs(e.target.checked)}
        />
        Lettres distractrices
        <button
          type="button"
          className="text-xs underline text-[var(--teal-text)]"
          onClick={() => setShowRissNote((v) => !v)}
          aria-expanded={showRissNote}
        >
          ⓘ pourquoi ?
        </button>
      </label>
      {showRissNote && (
        <p className="text-xs text-[var(--text3)] mt-1" role="note">
          Ajoute des lettres qui ne font pas partie du mot. Sans distracteurs, l'élève doit seulement retrouver
          l'ordre des lettres du mot (déjà toutes fournies) — un travail sur la structure orthographique séquentielle
          (Pacton, Fayol &amp; Perruchet). Avec distracteurs, l'élève doit aussi identifier quelles lettres composent
          le mot, ce qui se rapproche davantage d'un rappel en mémoire lexicale (Chaves, Bosse &amp; Largy, 2010).
          Aucune des deux versions n'est « la bonne » — à choisir selon l'objectif de la séance.
        </p>
      )}
      {distracteursActifs && (
        <FormField label="Nombre de lettres en trop" help="1 ou 2 lettres en plus de la roue, choisies au hasard." style={{ marginTop: 8, maxWidth: 200 }}>
          <select
            className="plai-input"
            value={nbDistracteurs}
            onChange={(e) => setNbDistracteurs(Number(e.target.value))}
          >
            <option value={1}>+1</option>
            <option value={2}>+2</option>
          </select>
        </FormField>
      )}

      {error && <div className="plai-error mt-2" role="alert">{error}</div>}
      <button className="plai-btn mt-3" type="button" onClick={handleCreate}>
        Créer la liste
      </button>

      <ul className="mt-4">
        {lists.length === 0 && <li className="plai-empty">Aucune liste créée.</li>}
        {lists.map((l) => (
          <li key={l.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>{l.nom}</span>
            <button type="button" className="text-sm text-[var(--teal-text)]" onClick={() => onOpenList(l)}>
              Ouvrir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/wordLists.ts src/components/WordListsManager.tsx
git commit -m "feat: add word lists manager with length warning and distractor toggle"
```

---

## Task 10: Teacher dashboard + attempts view

Replaces the old nominative high-score board with a per-student, per-list progress view visible only to the teacher.

**Files:**
- Create: `src/lib/attempts.ts`
- Create: `src/components/AttemptsView.tsx`
- Create: `src/components/TeacherDashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the attempts data-access functions**

```ts
// src/lib/attempts.ts
import { supabase } from './supabase';
import type { Attempt } from './types';

export interface CreateSessionInput {
  listId: string;
  studentId: string;
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  const { data, error } = await supabase
    .from('lexi_sessions')
    .insert({ list_id: input.listId, student_id: input.studentId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface RecordAttemptInput {
  sessionId: string;
  mot: string;
  reussi: boolean;
  lettresBienPlacees: number;
  score: number;
  distracteursActifs: boolean;
}

export async function recordAttempt(input: RecordAttemptInput): Promise<void> {
  const { error } = await supabase.from('lexi_attempts').insert({
    session_id: input.sessionId,
    mot: input.mot,
    reussi: input.reussi,
    lettres_bien_placees: input.lettresBienPlacees,
    score: input.score,
    distracteurs_actifs: input.distracteursActifs,
  });
  if (error) throw error;
}

export interface AttemptsForList {
  studentCode: string;
  attempts: Attempt[];
}

export async function listAttemptsForWordList(listId: string): Promise<AttemptsForList[]> {
  const { data, error } = await supabase
    .from('lexi_sessions')
    .select('id, lexi_students(code_anonyme), lexi_attempts(*)')
    .eq('list_id', listId);
  if (error) throw error;

  type Row = {
    id: string;
    lexi_students: { code_anonyme: string } | null;
    lexi_attempts: Attempt[];
  };

  return (data as unknown as Row[]).map((row) => ({
    studentCode: row.lexi_students?.code_anonyme ?? '(élève supprimé)',
    attempts: row.lexi_attempts,
  }));
}
```

- [ ] **Step 2: Write `AttemptsView.tsx`**

```tsx
// src/components/AttemptsView.tsx
import { useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { listAttemptsForWordList, type AttemptsForList } from '../lib/attempts';

interface AttemptsViewProps {
  list: WordList;
  onBack: () => void;
}

export function AttemptsView({ list, onBack }: AttemptsViewProps) {
  const [rows, setRows] = useState<AttemptsForList[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAttemptsForWordList(list.id).then(setRows).catch((e) => setError(e.message));
  }, [list.id]);

  return (
    <div className="plai-card">
      <button type="button" className="text-sm text-[var(--text3)] mb-3" onClick={onBack}>
        ← Retour
      </button>
      <h2 className="font-serif text-lg mb-3">Progression — {list.nom}</h2>
      {error && <div className="plai-error" role="alert">{error}</div>}
      {rows.length === 0 && !error && <p className="plai-empty">Aucune tentative enregistrée pour cette liste.</p>}
      {rows.map((row) => {
        const totalScore = row.attempts.reduce((sum, a) => sum + a.score, 0);
        const wordsFound = row.attempts.filter((a) => a.reussi).length;
        return (
          <div key={row.studentCode} className="py-2 border-b border-[var(--border)]">
            <p className="font-semibold">{row.studentCode}</p>
            <p className="text-sm text-[var(--text2)]">
              {wordsFound} mot(s) réussi(s) — {totalScore} points
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write `TeacherDashboard.tsx`**

```tsx
// src/components/TeacherDashboard.tsx
import { useState } from 'react';
import type { WordList } from '../lib/types';
import { StudentsManager } from './StudentsManager';
import { WordListsManager } from './WordListsManager';
import { AttemptsView } from './AttemptsView';

interface TeacherDashboardProps {
  userId: string;
  onStartGame: (list: WordList) => void;
  onSignOut: () => void;
}

export function TeacherDashboard({ userId, onStartGame, onSignOut }: TeacherDashboardProps) {
  const [openList, setOpenList] = useState<WordList | null>(null);

  return (
    <div className="plai-section" style={{ maxWidth: 800, margin: '0 auto' }}>
      <nav className="plai-nav">
        <span className="plai-nav-logo">LexiActif</span>
        <button type="button" className="plai-nav-link" onClick={onSignOut}>
          Se déconnecter
        </button>
      </nav>

      {openList ? (
        <AttemptsView list={openList} onBack={() => setOpenList(null)} />
      ) : (
        <>
          <StudentsManager userId={userId} />
          <div style={{ marginTop: 20 }}>
            <WordListsManager userId={userId} onOpenList={setOpenList} />
          </div>
          <button
            type="button"
            className="plai-btn mt-4"
            onClick={() => openList && onStartGame(openList)}
            disabled={!openList}
            hidden
          >
            {/* placeholder kept out of tab order via hidden; game entry point wired in Task 12 */}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire `TeacherDashboard` into `App.tsx`**

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import type { WordList } from './lib/types';

type View = { name: 'dashboard' } | { name: 'game'; list: WordList };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'dashboard' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  if (view.name === 'game') {
    return <p>Jeu à venir (Task 12) — liste : {view.list.nom}</p>;
  }

  return (
    <TeacherDashboard
      userId={session.user.id}
      onStartGame={(list) => setView({ name: 'game', list })}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

export default App;
```

- [ ] **Step 5: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/attempts.ts src/components/AttemptsView.tsx src/components/TeacherDashboard.tsx src/App.tsx
git commit -m "feat: add teacher dashboard and per-student progress view"
```

---

## Task 11: Student selection screen

**Files:**
- Create: `src/components/StudentSelect.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/StudentSelect.tsx
import { useEffect, useState } from 'react';
import type { Student } from '../lib/types';
import { listStudents } from '../lib/students';
import { FormField } from './FormField';

interface StudentSelectProps {
  userId: string;
  onSelect: (student: Student) => void;
}

export function StudentSelect({ userId, onSelect }: StudentSelectProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStudents(userId).then(setStudents).catch((e) => setError(e.message));
  }, [userId]);

  const handleStart = () => {
    const student = students.find((s) => s.id === selectedId);
    if (student) onSelect(student);
  };

  return (
    <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2 className="font-serif text-lg mb-3">Qui joue ?</h2>
      {error && <div className="plai-error" role="alert">{error}</div>}
      <FormField label="Ton code" required help="Choisis le code que ton/ta enseignant(e) t'a donné.">
        <select className="plai-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Choisir —</option>
          {students.map((s) => (
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

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/StudentSelect.tsx
git commit -m "feat: add anonymous student-code selection screen"
```

---

## Task 12: Game screen

Accessible letter wheel (`<button>`, `aria-label`, keyboard-focusable), `aria-live` feedback region, qualified feedback message, working disabled state on the pronunciation button, and writes each attempt to Supabase via `recordAttempt`.

**Files:**
- Create: `src/components/Game.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write `Game.tsx`**

```tsx
// src/components/Game.tsx
import { useEffect, useMemo, useState } from 'react';
import type { Student, WordList } from '../lib/types';
import { getWords } from '../lib/wordLists';
import { createSession, recordAttempt } from '../lib/attempts';
import { buildWheelLetters, buildWordQueue, countWellPlaced, scoreForWord } from '../lib/gameEngine';

interface GameProps {
  list: WordList;
  student: Student;
  onExit: () => void;
}

export function Game({ list, student, onExit }: GameProps) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [wheelLetters, setWheelLetters] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [found, setFound] = useState(false);

  const currentWord = queue ? queue[wordIndex] : null;
  const attempt = useMemo(() => selectedIndices.map((i) => wheelLetters[i]).join(''), [selectedIndices, wheelLetters]);

  useEffect(() => {
    createSession({ listId: list.id, studentId: student.id }).then(setSessionId);
  }, [list.id, student.id]);

  useEffect(() => {
    getWords(list.id).then((words) => {
      const ordered = words.map((w) => w.mot);
      setQueue(buildWordQueue(ordered, list.ordre_aleatoire));
    });
  }, [list.id, list.ordre_aleatoire]);

  useEffect(() => {
    if (!currentWord) return;
    setWheelLetters(buildWheelLetters(currentWord, list.distracteurs_actifs, list.nb_distracteurs));
    setSelectedIndices([]);
    setFound(false);
  }, [currentWord, list.distracteurs_actifs, list.nb_distracteurs]);

  if (!queue) return <p aria-live="polite">Chargement de la partie...</p>;
  if (!currentWord) return <p>Toutes les listes de mots sont terminées. Bravo !</p>;

  const selectLetter = (index: number) => {
    if (selectedIndices.includes(index) || found) return;
    setSelectedIndices((prev) => [...prev, index]);
  };

  const clearAttempt = () => setSelectedIndices([]);

  const submit = async () => {
    if (attempt.length === 0) {
      setMessage('Sélectionnez des lettres avant de valider.');
      return;
    }
    const wellPlaced = countWellPlaced(attempt, currentWord);
    const success = attempt === currentWord;

    if (sessionId) {
      await recordAttempt({
        sessionId,
        mot: currentWord,
        reussi: success,
        lettresBienPlacees: wellPlaced,
        score: success ? scoreForWord(currentWord) : 0,
        distracteursActifs: list.distracteurs_actifs,
      });
    }

    if (success) {
      const gained = scoreForWord(currentWord);
      setScore((s) => s + gained);
      setWordsFound((n) => n + 1);
      setFound(true);
      setMessage(`Bravo ! +${gained} points`);
      window.setTimeout(() => {
        setWordIndex((i) => i + 1);
        setMessage('');
      }, 1500);
    } else {
      setMessage(`${wellPlaced} lettre(s) sur ${currentWord.length} sont bien placée(s).`);
      setSelectedIndices([]);
    }
  };

  const pronounce = () => {
    if (!found) {
      setMessage("Trouvez d'abord le mot pour entendre sa prononciation.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="plai-section" style={{ maxWidth: 600, margin: '0 auto' }}>
      <button type="button" className="text-sm text-[var(--text3)] mb-3" onClick={onExit}>
        ← Quitter
      </button>
      <p className="text-sm text-[var(--text2)]">
        {student.code_anonyme} — {wordsFound} mot(s) réussi(s) — {score} points
      </p>

      <div className="flex justify-center gap-2 my-4" aria-label="Grille du mot">
        {currentWord.split('').map((letter, i) => (
          <div
            key={i}
            className="w-10 h-10 flex items-center justify-center rounded font-bold text-lg"
            style={{ background: found ? 'var(--teal)' : 'var(--surface2)', color: found ? 'white' : 'inherit' }}
          >
            {found ? letter : ''}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 my-4" role="group" aria-label="Roue de lettres">
        {wheelLetters.map((letter, i) => (
          <button
            key={i}
            type="button"
            className="w-12 h-12 rounded-full font-bold text-lg"
            style={{
              background: selectedIndices.includes(i) ? 'var(--teal)' : 'white',
              color: selectedIndices.includes(i) ? 'white' : 'inherit',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            }}
            aria-label={`lettre ${letter}`}
            aria-pressed={selectedIndices.includes(i)}
            disabled={selectedIndices.includes(i) || found}
            onClick={() => selectLetter(i)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button type="button" className="plai-btn" onClick={clearAttempt} aria-label="Effacer la sélection">
          ⌫
        </button>
        <button type="button" className="plai-btn" onClick={submit} aria-label="Valider le mot">
          ✓
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={pronounce}
          aria-label="Prononcer le mot"
          aria-disabled={!found}
          style={!found ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        >
          🔊
        </button>
      </div>

      <p role="status" aria-live="polite" className="text-center mt-4">
        {message}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire `Game` into `App.tsx`, via the student-selection step**

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentSelect } from './components/StudentSelect';
import { Game } from './components/Game';
import type { Student, WordList } from './lib/types';

type View =
  | { name: 'dashboard' }
  | { name: 'select-student'; list: WordList }
  | { name: 'game'; list: WordList; student: Student };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'dashboard' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  if (view.name === 'select-student') {
    return (
      <StudentSelect
        userId={session.user.id}
        onSelect={(student) => setView({ name: 'game', list: view.list, student })}
      />
    );
  }

  if (view.name === 'game') {
    return <Game list={view.list} student={view.student} onExit={() => setView({ name: 'dashboard' })} />;
  }

  return (
    <TeacherDashboard
      userId={session.user.id}
      onStartGame={(list) => setView({ name: 'select-student', list })}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

export default App;
```

- [ ] **Step 3: Replace the hidden placeholder button in `TeacherDashboard.tsx`** with a real entry point

In `src/components/TeacherDashboard.tsx`, replace this block:

```tsx
          <button
            type="button"
            className="plai-btn mt-4"
            onClick={() => openList && onStartGame(openList)}
            disabled={!openList}
            hidden
          >
            {/* placeholder kept out of tab order via hidden; game entry point wired in Task 12 */}
          </button>
```

with:

```tsx
          <p className="text-sm text-[var(--text3)] mt-4">
            Ouvrez une liste ci-dessus pour voir sa progression, ou lancez directement une partie :
          </p>
          <ul className="mt-2">
            {/* WordListsManager already lists names; add a "Jouer" action per list */}
          </ul>
```

Then update `WordListsManager`'s list rendering (in `src/components/WordListsManager.tsx`) to accept an additional `onPlayList` prop and a second action button, so teachers can start a game directly from the lists panel:

In `src/components/WordListsManager.tsx`, change the props and the list item:

```tsx
interface WordListsManagerProps {
  userId: string;
  onOpenList: (list: WordList) => void;
  onPlayList: (list: WordList) => void;
}

export function WordListsManager({ userId, onOpenList, onPlayList }: WordListsManagerProps) {
```

```tsx
          <li key={l.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>{l.nom}</span>
            <span className="flex gap-3">
              <button type="button" className="text-sm text-[var(--teal-text)]" onClick={() => onPlayList(l)}>
                Jouer
              </button>
              <button type="button" className="text-sm text-[var(--teal-text)]" onClick={() => onOpenList(l)}>
                Progression
              </button>
            </span>
          </li>
```

And in `src/components/TeacherDashboard.tsx`, pass the new prop through and drop the placeholder block entirely:

```tsx
          <div style={{ marginTop: 20 }}>
            <WordListsManager userId={userId} onOpenList={setOpenList} onPlayList={onStartGame} />
          </div>
```

(remove the `<p>`/`<ul>` placeholder added earlier in this step — it was a stepping stone, not needed once `WordListsManager` has real "Jouer" buttons).

- [ ] **Step 4: Verify it compiles**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: PASS — `gameEngine.test.ts` still green, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/Game.tsx src/components/TeacherDashboard.tsx src/components/WordListsManager.tsx src/App.tsx
git commit -m "feat: add accessible game screen wired to teacher dashboard"
```

---

## Task 13: Deployment configuration

**Files:**
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Document the Vercel setup in `README.md`**

Append this section:

```markdown
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
```

- [ ] **Step 3: Run the full local verification one last time**

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all three exit 0.

- [ ] **Step 4: Commit and push**

```bash
git add vercel.json README.md
git commit -m "chore: add Vercel config and deployment docs"
git push -u origin main
```

---

## Plan self-review notes

- **Spec coverage:** teacher auth (Task 7), anonymous student codes (Task 8), copier-coller word import with length warning (Task 9), ordered-by-default word queue (Task 5 + Game wiring in Task 12), distractor toggle with RISS note (Task 9), qualified feedback (Task 5 `countWellPlaced` + Task 12), no competitive leaderboard visible to students / teacher-only progress view (Task 10), accessible keyboard-navigable wheel + `aria-live` feedback (Task 12), working disabled state on the pronunciation button (Task 12), no external CDN dependency (Task 9 uses a plain textarea, no `xlsx.js`), RLS on all `lexi_*` tables (Task 2) — all covered.
- **Out of scope, confirmed not silently dropped:** automatic adaptive difficulty — not implemented anywhere in this plan, matching the design doc's explicit exclusion.
