-- Cost/usage telemetry for bank integration
create table if not exists public.bank_connection_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null check (event_type in ('session_created','transactions_fetched','session_expired','balance_fetched','error')),
  account_count int default 0,
  transaction_count int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_connection_events_company on public.bank_connection_events(company_id, created_at desc);

alter table public.bank_connection_events enable row level security;

create policy "Company members can read bank connection events"
on public.bank_connection_events
for select
to authenticated
using (public.has_company_access(auth.uid(), company_id));

create policy "Service role can insert bank connection events"
on public.bank_connection_events
for insert
to service_role
with check (true);