-- Mapping engine: extend ar_section_account_map with lock + AI confidence + source
alter table public.ar_section_account_map
  add column if not exists is_locked boolean not null default false,
  add column if not exists ai_confidence numeric,
  add column if not exists source text not null default 'auto';

-- Add check constraint via DO block (CHECK constraints with IF NOT EXISTS aren't supported in older PG)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ar_section_account_map_source_check'
  ) then
    alter table public.ar_section_account_map
      add constraint ar_section_account_map_source_check
      check (source in ('auto','user','prior_year','bas_template'));
  end if;
end $$;

-- Realtime for live mapping updates in UI
alter publication supabase_realtime add table public.ar_section_account_map;