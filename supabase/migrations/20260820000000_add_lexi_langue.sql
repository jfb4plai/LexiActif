-- lexiactif/supabase/migrations/20260820000000_add_lexi_langue.sql

alter table public.lexi_word_lists
  add column if not exists langue text not null default 'fr';

-- Postgres has no "ADD CONSTRAINT IF NOT EXISTS" — guard manually so this
-- migration can be re-run safely (this repo's migrations are applied
-- manually via the Supabase SQL editor, so idempotency matters).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lexi_word_lists_langue_check'
  ) then
    alter table public.lexi_word_lists
      add constraint lexi_word_lists_langue_check
      check (langue in ('fr', 'nl', 'en', 'de'));
  end if;
end $$;
