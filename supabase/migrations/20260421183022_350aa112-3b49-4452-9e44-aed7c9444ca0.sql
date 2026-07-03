-- Notion-style blocks inside annual_report_sections
create table public.ar_blocks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.annual_report_sections(id) on delete cascade,
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  block_type text not null check (block_type in ('heading','text','financial_table','note_table','signature','attachment','divider')),
  sort_order int not null default 0,
  content jsonb not null default '{}'::jsonb,
  ai_generated boolean not null default false,
  ai_confidence numeric,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_blocks_section on public.ar_blocks(section_id, sort_order);
create index idx_ar_blocks_report on public.ar_blocks(annual_report_id);

create trigger ar_blocks_updated
  before update on public.ar_blocks
  for each row execute function public.update_updated_at_column();

alter table public.ar_blocks enable row level security;

create policy "ar_blocks_select" on public.ar_blocks
  for select to authenticated
  using (public.has_company_access(auth.uid(), company_id));

create policy "ar_blocks_write" on public.ar_blocks
  for all to authenticated
  using (public.has_company_edit_access(auth.uid(), company_id))
  with check (public.has_company_edit_access(auth.uid(), company_id));

-- Per-section account mapping overrides
create table public.ar_section_account_map (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.annual_report_sections(id) on delete cascade,
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  account_number text not null,
  weight numeric not null default 1.0,
  override_reason text,
  created_at timestamptz not null default now(),
  unique(section_id, account_number)
);
create index idx_ar_sec_acct_map_section on public.ar_section_account_map(section_id);
create index idx_ar_sec_acct_map_report on public.ar_section_account_map(annual_report_id);

alter table public.ar_section_account_map enable row level security;

create policy "ar_sec_acct_map_select" on public.ar_section_account_map
  for select to authenticated
  using (public.has_company_access(auth.uid(), company_id));

create policy "ar_sec_acct_map_write" on public.ar_section_account_map
  for all to authenticated
  using (public.has_company_edit_access(auth.uid(), company_id))
  with check (public.has_company_edit_access(auth.uid(), company_id));

-- Persistent validations
create table public.ar_validations (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  section_id uuid references public.annual_report_sections(id) on delete set null,
  rule_code text not null,
  severity text not null check (severity in ('error','warning','info')),
  message text not null,
  fix_action jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(annual_report_id, rule_code, section_id)
);
create index idx_ar_validations_report on public.ar_validations(annual_report_id, severity);

alter table public.ar_validations enable row level security;

create policy "ar_validations_select" on public.ar_validations
  for select to authenticated
  using (public.has_company_access(auth.uid(), company_id));

create policy "ar_validations_write" on public.ar_validations
  for all to authenticated
  using (public.has_company_edit_access(auth.uid(), company_id))
  with check (public.has_company_edit_access(auth.uid(), company_id));

-- Storage bucket for AR v2 attachments
insert into storage.buckets (id, name, public)
values ('annual-report-attachments', 'annual-report-attachments', false)
on conflict (id) do nothing;

create policy "ar_attach_company_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'annual-report-attachments'
    and public.has_company_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy "ar_attach_company_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'annual-report-attachments'
    and public.has_company_edit_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy "ar_attach_company_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'annual-report-attachments'
    and public.has_company_edit_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

create policy "ar_attach_company_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'annual-report-attachments'
    and public.has_company_edit_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );