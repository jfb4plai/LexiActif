-- lexiactif/supabase/migrations/20260819000000_add_lexi_share_code.sql

alter table public.lexi_word_lists
  add column if not exists share_code text;

create unique index if not exists lexi_word_lists_share_code_idx
  on public.lexi_word_lists (share_code)
  where share_code is not null;
