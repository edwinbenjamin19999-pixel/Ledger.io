-- Intelligence Layer for Annual Report v2

-- 1. Versions / snapshots (separate from existing annual_report_versions to support new workflow status)
create table if not exists public.ar_versions (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  version_number int not null,
  label text,
  status text not null check (status in ('draft','review','approved','signed','submitted')),
  snapshot jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(annual_report_id, version_number)
);

-- 2. Comments per block/section/cell
create table if not exists public.ar_comments (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  section_id uuid references public.annual_report_sections(id) on delete cascade,
  block_id uuid references public.ar_blocks(id) on delete cascade,
  anchor text,
  parent_comment_id uuid references public.ar_comments(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  mentions uuid[] not null default '{}',
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_ar_comments_report on public.ar_comments(annual_report_id);

-- 3. Collaborators per draft
create table if not exists public.ar_collaborators (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('editor','reviewer','approver')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  unique(annual_report_id, user_id)
);
create index if not exists idx_ar_collaborators_report on public.ar_collaborators(annual_report_id);

-- 4. Approval workflow events
create table if not exists public.ar_approvals (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ar_approvals_report on public.ar_approvals(annual_report_id);

-- 5. AI review findings
create table if not exists public.ar_ai_findings (
  id uuid primary key default gen_random_uuid(),
  annual_report_id uuid not null references public.annual_reports(id) on delete cascade,
  section_id uuid references public.annual_report_sections(id) on delete set null,
  block_id uuid references public.ar_blocks(id) on delete set null,
  category text not null check (category in
    ('narrative_mismatch','missing_disclosure','unusual_metric','tone','compliance')),
  severity text not null check (severity in ('error','warning','info')),
  title text not null,
  detail text not null,
  suggested_fix jsonb,
  status text not null default 'open' check (status in ('open','accepted','dismissed')),
  ai_confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_ar_findings_report on public.ar_ai_findings(annual_report_id);

-- 6. Add columns to annual_reports
alter table public.annual_reports
  add column if not exists workflow_status text not null default 'draft'
    check (workflow_status in ('draft','review','approved','signed','submitted')),
  add column if not exists locked_sections uuid[] not null default '{}';

-- Helper: company id from annual_report_id
create or replace function public.ar_company_id(_ar_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.annual_reports where id = _ar_id
$$;

-- RLS
alter table public.ar_versions enable row level security;
alter table public.ar_comments enable row level security;
alter table public.ar_collaborators enable row level security;
alter table public.ar_approvals enable row level security;
alter table public.ar_ai_findings enable row level security;

-- ar_versions
create policy "ar_versions select" on public.ar_versions for select
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_versions insert" on public.ar_versions for insert
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)) and created_by = auth.uid());
create policy "ar_versions delete" on public.ar_versions for delete
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));

-- ar_comments
create policy "ar_comments select" on public.ar_comments for select
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_comments insert" on public.ar_comments for insert
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)) and author_id = auth.uid());
create policy "ar_comments update own" on public.ar_comments for update
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id))
         and (author_id = auth.uid() or status = 'open'))
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_comments delete own" on public.ar_comments for delete
  using (author_id = auth.uid());

-- ar_collaborators (only company members manage)
create policy "ar_collaborators select" on public.ar_collaborators for select
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_collaborators insert" on public.ar_collaborators for insert
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_collaborators update" on public.ar_collaborators for update
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_collaborators delete" on public.ar_collaborators for delete
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));

-- ar_approvals
create policy "ar_approvals select" on public.ar_approvals for select
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_approvals insert" on public.ar_approvals for insert
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)) and actor_id = auth.uid());

-- ar_ai_findings
create policy "ar_findings select" on public.ar_ai_findings for select
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_findings insert" on public.ar_ai_findings for insert
  with check (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_findings update" on public.ar_ai_findings for update
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));
create policy "ar_findings delete" on public.ar_ai_findings for delete
  using (public.has_company_access(auth.uid(), public.ar_company_id(annual_report_id)));

-- Realtime
alter publication supabase_realtime add table public.ar_versions;
alter publication supabase_realtime add table public.ar_comments;
alter publication supabase_realtime add table public.ar_collaborators;
alter publication supabase_realtime add table public.ar_approvals;
alter publication supabase_realtime add table public.ar_ai_findings;