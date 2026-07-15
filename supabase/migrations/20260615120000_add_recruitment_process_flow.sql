alter table public.jobs
  add column if not exists responsible_name text,
  add column if not exists open_positions integer not null default 1,
  add column if not exists approved_positions integer not null default 0,
  add column if not exists process_status text not null default 'in_progress',
  add column if not exists internal_notes text;

alter table public.jobs
  drop constraint if exists jobs_open_positions_check,
  drop constraint if exists jobs_approved_positions_check,
  drop constraint if exists jobs_process_status_check;

alter table public.jobs drop constraint if exists jobs_open_positions_check;
alter table public.jobs
  add constraint jobs_open_positions_check check (open_positions >= 1),
  add constraint jobs_approved_positions_check check (approved_positions >= 0),
  add constraint jobs_process_status_check
    check (process_status in ('draft', 'in_progress', 'paused', 'completed', 'cancelled'));

update public.jobs
set process_status = case
  when status::text = 'draft' then 'draft'
  when status::text = 'paused' then 'paused'
  when status::text in ('closed', 'archived') then 'completed'
  else 'in_progress'
end
where process_status is null or process_status = 'in_progress';

alter table public.applications
  add column if not exists stage text not null default 'qualificacao',
  add column if not exists kanban_order integer not null default 0,
  add column if not exists match_score numeric(5, 2),
  add column if not exists adhesion_score numeric(5, 2),
  add column if not exists is_new boolean not null default true,
  add column if not exists rejection_reason text,
  add column if not exists tags text[] not null default '{}';

alter table public.applications
  drop constraint if exists applications_stage_check,
  drop constraint if exists applications_kanban_order_check,
  drop constraint if exists applications_match_score_check,
  drop constraint if exists applications_adhesion_score_check;

alter table public.applications drop constraint if exists applications_stage_check;
alter table public.applications
  add constraint applications_stage_check
    check (stage in ('qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao', 'desclassificados')),
  add constraint applications_kanban_order_check check (kanban_order >= 0),
  add constraint applications_match_score_check check (match_score between 0 and 100),
  add constraint applications_adhesion_score_check check (adhesion_score between 0 and 100);

update public.applications
set
  stage = case status::text
    when 'teste' then 'testes'
    when 'entrevista' then 'entrevista'
    when 'selecionado' then 'finalistas'
    when 'encaminhado_cliente' then 'finalistas'
    when 'aprovado' then 'finalistas'
    when 'contratado' then 'contratacao'
    when 'reprovado' then 'desclassificados'
    else 'qualificacao'
  end,
  is_new = status::text = 'novo';

create index if not exists applications_job_stage_order_idx
  on public.applications(job_id, stage, kanban_order);

create table if not exists public.application_stage_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  moved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint application_stage_history_from_stage_check
    check (from_stage is null or from_stage in ('qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao', 'desclassificados')),
  constraint application_stage_history_to_stage_check
    check (to_stage in ('qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao', 'desclassificados'))
);

create index if not exists application_stage_history_application_idx
  on public.application_stage_history(application_id, created_at desc);

create or replace function public.record_application_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stage is distinct from new.stage then
    insert into public.application_stage_history (
      application_id,
      from_stage,
      to_stage,
      moved_by
    )
    values (
      new.id,
      old.stage,
      new.stage,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_application_stage_change_after_update on public.applications;
create trigger record_application_stage_change_after_update
after update of stage on public.applications
for each row execute function public.record_application_stage_change();

create table if not exists public.process_comments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  comment text not null check (length(trim(comment)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists process_comments_job_idx
  on public.process_comments(job_id, created_at desc);

alter table public.application_stage_history enable row level security;
alter table public.process_comments enable row level security;

drop policy if exists "Admins can read stage history" on public.application_stage_history;
drop policy if exists "Admins can read stage history" on public.application_stage_history;
create policy "Admins can read stage history"
on public.application_stage_history for select
using (public.is_redde_admin());

drop policy if exists "Franchisees can read own stage history" on public.application_stage_history;
drop policy if exists "Franchisees can read own stage history" on public.application_stage_history;
create policy "Franchisees can read own stage history"
on public.application_stage_history for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = application_stage_history.application_id
      and a.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Company users can read own stage history" on public.application_stage_history;
drop policy if exists "Company users can read own stage history" on public.application_stage_history;
create policy "Company users can read own stage history"
on public.application_stage_history for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = application_stage_history.application_id
      and public.has_company_access(a.company_id)
  )
);

drop policy if exists "Admins can manage process comments" on public.process_comments;
drop policy if exists "Admins can manage process comments" on public.process_comments;
create policy "Admins can manage process comments"
on public.process_comments for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

drop policy if exists "Franchisees can read own process comments" on public.process_comments;
drop policy if exists "Franchisees can read own process comments" on public.process_comments;
create policy "Franchisees can read own process comments"
on public.process_comments for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = process_comments.job_id
      and j.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Franchisees can insert own process comments" on public.process_comments;
drop policy if exists "Franchisees can insert own process comments" on public.process_comments;
create policy "Franchisees can insert own process comments"
on public.process_comments for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.jobs j
    where j.id = process_comments.job_id
      and j.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Company users can read own process comments" on public.process_comments;
drop policy if exists "Company users can read own process comments" on public.process_comments;
create policy "Company users can read own process comments"
on public.process_comments for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = process_comments.job_id
      and public.has_company_access(j.company_id)
  )
);

drop policy if exists "Company users can insert own process comments" on public.process_comments;
drop policy if exists "Company users can insert own process comments" on public.process_comments;
create policy "Company users can insert own process comments"
on public.process_comments for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.jobs j
    where j.id = process_comments.job_id
      and public.has_company_access(j.company_id)
  )
);

drop policy if exists "Franchisees can read own application notes" on public.application_notes;
drop policy if exists "Franchisees can read own application notes" on public.application_notes;
create policy "Franchisees can read own application notes"
on public.application_notes for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
      and a.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Franchisees can insert own application notes" on public.application_notes;
drop policy if exists "Franchisees can insert own application notes" on public.application_notes;
create policy "Franchisees can insert own application notes"
on public.application_notes for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
      and a.franchise_id = public.current_user_franchise_id()
  )
);
