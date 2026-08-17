-- lexiactif/supabase/migrations/20260818000000_add_lexi_indices_option.sql

alter table public.lexi_word_lists
  add column if not exists indices_actifs boolean not null default false;
