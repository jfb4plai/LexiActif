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
  lettres_bien_placees integer not null check (lettres_bien_placees >= 0),
  score integer not null default 0 check (score >= 0),
  distracteurs_actifs boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lexi_words_list_id_idx on public.lexi_words (list_id);
create index if not exists lexi_sessions_list_id_idx on public.lexi_sessions (list_id);
create index if not exists lexi_sessions_student_id_idx on public.lexi_sessions (student_id);
create index if not exists lexi_attempts_session_id_idx on public.lexi_attempts (session_id);

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
    and exists (
      select 1 from public.lexi_word_lists l
      where l.id = lexi_sessions.list_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lexi_students s
      where s.id = lexi_sessions.student_id and s.user_id = auth.uid()
    )
    and exists (
      select 1 from public.lexi_word_lists l
      where l.id = lexi_sessions.list_id and l.user_id = auth.uid()
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
