
create table if not exists public.ai_action_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  module text not null,
  action_kind text not null,
  reference_id text,
  counterparty_key text,
  ai_recommendation jsonb not null,
  ai_reasoning text,
  ai_confidence numeric not null,
  ai_tier text not null check (ai_tier in ('done','review','input_needed')),
  was_correct boolean,
  user_correction jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_aiaf_company on public.ai_action_feedback(company_id, created_at desc);
create index if not exists idx_aiaf_counterparty on public.ai_action_feedback(company_id, counterparty_key);

alter table public.ai_action_feedback enable row level security;

create policy "company members read ai feedback"
  on public.ai_action_feedback for select
  using (
    company_id in (select ur.company_id from public.user_roles ur where ur.user_id = auth.uid())
  );

create policy "company members insert ai feedback"
  on public.ai_action_feedback for insert
  with check (
    company_id in (select ur.company_id from public.user_roles ur where ur.user_id = auth.uid())
  );

create policy "users update own ai feedback"
  on public.ai_action_feedback for update
  using (user_id = auth.uid());
