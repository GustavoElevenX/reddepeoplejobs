-- Gestao completa e transacional do pipeline de candidatos da Recruitify.

alter table public.applications
  add column if not exists stage_entered_at timestamptz not null default now(),
  add column if not exists stage_sla_due_at timestamptz,
  add column if not exists last_stage_changed_by uuid references public.profiles(id) on delete set null,
  add column if not exists hired_at timestamptz,
  add column if not exists current_owner_id uuid references public.profiles(id) on delete set null;

alter table public.application_stage_history
  add column if not exists reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists from_order integer,
  add column if not exists to_order integer;

alter table public.documents add column if not exists job_id uuid references public.jobs(id) on delete set null;

-- Processos sem projeto tambem precisam usar a triagem e a entrevista oficiais.
alter table public.candidate_screenings alter column project_id drop not null;
alter table public.internal_interviews alter column project_id drop not null;
create unique index if not exists candidate_screenings_application_unique
  on public.candidate_screenings(application_id);
create unique index if not exists internal_interviews_application_unique
  on public.internal_interviews(application_id);

create table if not exists public.job_tests (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  description text,
  instructions text,
  test_type text not null,
  provider text,
  external_url text,
  passing_score numeric,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_test_assignments (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  job_test_id uuid not null references public.job_tests(id) on delete cascade,
  status text not null default 'pending',
  score numeric,
  max_score numeric,
  result text,
  notes text,
  external_result_url text,
  attachment_url text,
  sent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  waived_at timestamptz,
  waived_by uuid references public.profiles(id) on delete set null,
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, job_test_id)
);

create table if not exists public.application_disqualifications (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage text not null,
  reason text not null,
  details text,
  disqualified_by uuid references public.profiles(id) on delete set null,
  disqualified_at timestamptz not null default now(),
  restored_by uuid references public.profiles(id) on delete set null,
  restored_at timestamptz,
  restore_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.application_hires (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null unique references public.applications(id) on delete cascade,
  hiring_decision_id uuid references public.hiring_decisions(id) on delete set null,
  approved_at timestamptz,
  expected_start_date date,
  actual_start_date date,
  internal_responsible_name text,
  internal_responsible_email text,
  internal_responsible_phone text,
  admission_status text not null default 'approved',
  required_documents text,
  admission_notes text,
  withdrawal_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_stage_sla_settings (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  stage text not null,
  sla_days integer not null,
  warning_days integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, stage)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_tests_type_check') then
    alter table public.job_tests add constraint job_tests_type_check
      check (test_type in ('manual', 'external_link', 'form', 'file_upload', 'score_only')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'application_test_assignments_status_check') then
    alter table public.application_test_assignments add constraint application_test_assignments_status_check
      check (status in ('pending', 'sent', 'in_progress', 'completed', 'approved', 'failed', 'waived', 'cancelled')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'application_test_assignments_waiver_check') then
    alter table public.application_test_assignments add constraint application_test_assignments_waiver_check
      check (status <> 'waived' or (waived_at is not null and waived_by is not null and length(trim(waiver_reason)) > 0)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'application_hires_admission_status_check') then
    alter table public.application_hires add constraint application_hires_admission_status_check
      check (admission_status in ('approved', 'awaiting_documents', 'scheduled_to_start', 'started', 'withdrawn', 'no_show', 'cancelled')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'job_stage_sla_settings_stage_check') then
    alter table public.job_stage_sla_settings add constraint job_stage_sla_settings_stage_check
      check (stage in ('qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'job_stage_sla_settings_days_check') then
    alter table public.job_stage_sla_settings add constraint job_stage_sla_settings_days_check
      check (sla_days >= 0 and warning_days >= 0) not valid;
  end if;
end $$;

create index if not exists applications_job_stage_order_idx on public.applications(job_id, stage, kanban_order);
create index if not exists applications_job_stage_entered_idx on public.applications(job_id, stage_entered_at);
create index if not exists applications_franchise_stage_idx on public.applications(franchise_id, stage);
create index if not exists applications_company_stage_idx on public.applications(company_id, stage);
create index if not exists application_stage_history_application_created_idx on public.application_stage_history(application_id, created_at desc);
create index if not exists application_disqualifications_job_date_idx on public.application_disqualifications(job_id, disqualified_at desc);
create index if not exists application_disqualifications_application_date_idx on public.application_disqualifications(application_id, disqualified_at desc);
create index if not exists job_tests_job_order_idx on public.job_tests(job_id, sort_order);
create index if not exists application_test_assignments_application_status_idx on public.application_test_assignments(application_id, status);
create index if not exists application_test_assignments_test_status_idx on public.application_test_assignments(job_test_id, status);
create index if not exists application_hires_job_date_idx on public.application_hires(job_id, approved_at desc);
create index if not exists application_hires_company_status_idx on public.application_hires(company_id, admission_status);
create index if not exists job_stage_sla_settings_job_stage_idx on public.job_stage_sla_settings(job_id, stage);
create index if not exists documents_job_idx on public.documents(job_id, created_at desc);

update public.applications
set stage_entered_at = coalesce(updated_at, created_at, now())
where stage_entered_at is null;

update public.applications
set hired_at = coalesce(updated_at, created_at, now())
where stage = 'contratacao' and hired_at is null;

insert into public.application_hires (
  franchise_id, project_id, job_id, company_id, application_id, hiring_decision_id,
  approved_at, expected_start_date, internal_responsible_name, internal_responsible_email,
  internal_responsible_phone, admission_status, required_documents, admission_notes, created_by
)
select
  a.franchise_id, p.id, a.job_id, a.company_id, a.id, d.id,
  coalesce(d.finalized_at, a.hired_at, a.updated_at, a.created_at), d.start_date,
  d.internal_responsible_name, d.internal_responsible_email, d.internal_responsible_phone,
  case when d.start_date is null then 'approved' else 'scheduled_to_start' end,
  d.required_documents, d.admission_notes, a.last_stage_changed_by
from public.applications a
left join lateral (select project.id from public.projects project where project.job_id = a.job_id order by project.created_at limit 1) p on true
left join lateral (
  select decision.* from public.hiring_decisions decision
  where decision.application_id = a.id and decision.decision = 'approved'
  order by coalesce(decision.finalized_at, decision.updated_at) desc limit 1
) d on true
where a.stage = 'contratacao'
on conflict (application_id) do nothing;

update public.jobs j set approved_positions = least(j.open_positions, hired.total)
from (
  select a.job_id, count(*)::integer as total from public.applications a
  where a.stage = 'contratacao' group by a.job_id
) hired
where j.id = hired.job_id and j.approved_positions is distinct from least(j.open_positions, hired.total);

create or replace function public.sync_recruitment_child_scope()
returns trigger language plpgsql set search_path = public as $$
declare target_application public.applications;
begin
  select * into target_application from public.applications where id = new.application_id;
  if target_application.id is null then raise exception 'Candidatura invalida.'; end if;
  new.job_id := target_application.job_id;
  new.franchise_id := target_application.franchise_id;
  return new;
end $$;

drop trigger if exists sync_test_assignment_scope_before_write on public.application_test_assignments;
create trigger sync_test_assignment_scope_before_write before insert or update of application_id
on public.application_test_assignments for each row execute function public.sync_recruitment_child_scope();

create or replace function public.sync_internal_interview_schedule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.applications set interview_scheduled_at = new.scheduled_at, updated_at = now()
  where id = new.application_id and interview_scheduled_at is distinct from new.scheduled_at;
  return new;
end $$;

drop trigger if exists sync_internal_interview_schedule_after_write on public.internal_interviews;
create trigger sync_internal_interview_schedule_after_write after insert or update of scheduled_at
on public.internal_interviews for each row execute function public.sync_internal_interview_schedule();

create or replace function public.sync_application_hire_from_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_application public.applications;
begin
  if new.decision <> 'approved' or not coalesce(new.is_final, false) then return new; end if;
  select * into target_application from public.applications where id = new.application_id;
  insert into public.application_hires (
    franchise_id, project_id, job_id, company_id, application_id, hiring_decision_id,
    approved_at, expected_start_date, internal_responsible_name, internal_responsible_email,
    internal_responsible_phone, admission_status, required_documents, admission_notes, created_by
  ) values (
    target_application.franchise_id, new.project_id, target_application.job_id, target_application.company_id,
    new.application_id, new.id, coalesce(new.finalized_at, now()), new.start_date,
    new.internal_responsible_name, new.internal_responsible_email, new.internal_responsible_phone,
    case when new.start_date is null then 'approved' else 'scheduled_to_start' end,
    new.required_documents, new.admission_notes, auth.uid()
  ) on conflict (application_id) do update set
    hiring_decision_id = excluded.hiring_decision_id, approved_at = excluded.approved_at,
    expected_start_date = excluded.expected_start_date,
    internal_responsible_name = excluded.internal_responsible_name,
    internal_responsible_email = excluded.internal_responsible_email,
    internal_responsible_phone = excluded.internal_responsible_phone,
    required_documents = excluded.required_documents, admission_notes = excluded.admission_notes,
    updated_at = now();
  return new;
end $$;

drop trigger if exists sync_application_hire_after_decision on public.hiring_decisions;
create trigger sync_application_hire_after_decision after insert or update of decision, is_final
on public.hiring_decisions for each row execute function public.sync_application_hire_from_decision();

-- O trigger antigo continua sendo o unico gravador do historico; a RPC passa o contexto por transaction-local settings.
create or replace function public.record_application_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare context_metadata jsonb;
begin
  if old.stage is distinct from new.stage then
    begin
      context_metadata := coalesce(nullif(current_setting('recruitify.stage_metadata', true), '')::jsonb, '{}'::jsonb);
    exception when others then context_metadata := '{}'::jsonb;
    end;
    insert into public.application_stage_history (
      application_id, from_stage, to_stage, moved_by, reason, metadata, from_order, to_order
    ) values (
      new.id, old.stage, new.stage, auth.uid(),
      nullif(current_setting('recruitify.stage_reason', true), ''), context_metadata,
      old.kanban_order, new.kanban_order
    );
  end if;
  return new;
end $$;

create or replace function public.move_application_stage(
  application_uuid uuid,
  target_stage text,
  target_order integer,
  action_reason text default null,
  action_metadata jsonb default '{}'::jsonb
)
returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  current_application public.applications;
  saved_application public.applications;
  current_index integer;
  target_index integer;
  target_status public.application_status;
  sla_days_value integer;
  linked_project_id uuid;
  actor_is_admin boolean;
  can_manage boolean;
begin
  if auth.uid() is null then raise exception 'Sessao expirada.'; end if;
  if application_uuid is null then raise exception 'Candidatura invalida.'; end if;
  if target_stage not in ('qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao', 'desclassificados') then
    raise exception 'Etapa de destino invalida.';
  end if;

  select * into current_application from public.applications where id = application_uuid for update;
  if current_application.id is null then raise exception 'Candidatura nao encontrada.'; end if;

  actor_is_admin := public.is_admin_master();
  can_manage := actor_is_admin
    or current_application.franchise_id = public.current_user_franchise_id()
    or exists (
      select 1 from public.company_user_access cua join public.profiles p on p.id = cua.user_id
      where cua.user_id = auth.uid() and cua.company_id = current_application.company_id
        and cua.can_manage_jobs and p.is_active
    );
  if not can_manage then raise exception 'Voce nao tem permissao para movimentar este candidato.'; end if;

  current_index := array_position(array['qualificacao','testes','entrevista','finalistas','contratacao'], current_application.stage);
  target_index := array_position(array['qualificacao','testes','entrevista','finalistas','contratacao'], target_stage);
  if current_application.stage <> target_stage and target_stage <> 'desclassificados'
    and current_application.stage <> 'desclassificados'
    and abs(coalesce(target_index, 99) - coalesce(current_index, -99)) <> 1 then
    raise exception 'Movimentacao permitida apenas para a etapa imediatamente anterior ou seguinte.';
  end if;
  if target_stage = 'desclassificados' and length(trim(coalesce(action_reason, ''))) = 0 then
    raise exception 'Informe o motivo da desclassificacao.';
  end if;

  if current_application.stage = 'qualificacao' and target_stage = 'testes' then
    if current_application.resume_analysis_status <> 'completed'
      and (current_application.resume_analysis_waived_at is null or length(trim(coalesce(current_application.resume_analysis_waiver_reason, ''))) = 0) then
      raise exception 'Conclua a analise do curriculo ou registre a dispensa com justificativa.';
    end if;
    if not exists (select 1 from public.candidate_screenings s where s.application_id = application_uuid and s.status = 'completed') then
      raise exception 'Conclua e aprove a triagem manual antes de avancar.';
    end if;
  end if;

  if current_application.stage = 'testes' and target_stage = 'entrevista' then
    if exists (
      select 1 from public.job_tests jt
      left join public.application_test_assignments ata on ata.job_test_id = jt.id and ata.application_id = application_uuid
      where jt.job_id = current_application.job_id and jt.is_active and jt.is_required
        and coalesce(ata.status, 'pending') not in ('approved', 'waived')
    ) then raise exception 'Conclua e aprove todos os testes obrigatorios ou registre a dispensa.'; end if;
    if not exists (select 1 from public.job_tests jt where jt.job_id = current_application.job_id and jt.is_active and jt.is_required)
      and not coalesce((action_metadata->>'skip_tests')::boolean, false) then
      raise exception 'Confirme explicitamente que a vaga nao possui teste obrigatorio.';
    end if;
  end if;

  if current_application.stage = 'entrevista' and target_stage = 'finalistas' then
    if not exists (select 1 from public.internal_interviews i where i.application_id = application_uuid and i.status = 'completed' and i.recommendation <> 'no') then
      raise exception 'Conclua a entrevista interna com recomendacao favoravel antes de avancar.';
    end if;
    select id into linked_project_id from public.projects where job_id = current_application.job_id limit 1;
    if linked_project_id is not null then
      if not exists (
        select 1 from public.finalists f where f.project_id = linked_project_id and f.application_id = application_uuid
          and f.ai_report_status = 'approved'
      ) then raise exception 'Gere, revise e aprove o parecer do finalista antes de avancar.'; end if;
      if (select count(*) from public.finalists f where f.project_id = linked_project_id and f.status <> 'draft' and f.application_id <> application_uuid) >= 3 then
        raise exception 'O projeto ja possui tres finalistas ativos.';
      end if;
      update public.finalists set status = 'selected', updated_at = now()
      where project_id = linked_project_id and application_id = application_uuid;
    end if;
  end if;

  if target_stage = 'contratacao' and current_application.stage <> 'contratacao' then
    if not exists (
      select 1 from public.hiring_decisions d
      where d.application_id = application_uuid and d.decision = 'approved' and coalesce(d.is_final, false)
    ) and not (
      actor_is_admin and coalesce((action_metadata->>'manual_regularization')::boolean, false)
      and length(trim(coalesce(action_reason, ''))) > 0
    ) then raise exception 'A contratacao exige decisao final aprovada ou regularizacao administrativa justificada.'; end if;
  end if;

  target_order := greatest(coalesce(target_order, 0), 0);
  perform set_config('recruitify.stage_reason', coalesce(action_reason, ''), true);
  perform set_config('recruitify.stage_metadata', coalesce(action_metadata, '{}'::jsonb)::text, true);

  if current_application.stage = target_stage then
    if target_order < current_application.kanban_order then
      update public.applications set kanban_order = kanban_order + 1
      where job_id = current_application.job_id and stage = target_stage
        and kanban_order >= target_order and kanban_order < current_application.kanban_order and id <> application_uuid;
    elsif target_order > current_application.kanban_order then
      update public.applications set kanban_order = kanban_order - 1
      where job_id = current_application.job_id and stage = target_stage
        and kanban_order <= target_order and kanban_order > current_application.kanban_order and id <> application_uuid;
    end if;
  else
    update public.applications set kanban_order = kanban_order - 1
    where job_id = current_application.job_id and stage = current_application.stage
      and kanban_order > current_application.kanban_order;
    update public.applications set kanban_order = kanban_order + 1
    where job_id = current_application.job_id and stage = target_stage and kanban_order >= target_order;
  end if;

  target_status := case target_stage
    when 'qualificacao' then 'triagem'::public.application_status
    when 'testes' then 'teste'::public.application_status
    when 'entrevista' then 'entrevista'::public.application_status
    when 'finalistas' then 'selecionado'::public.application_status
    when 'contratacao' then 'contratado'::public.application_status
    else 'reprovado'::public.application_status end;
  select s.sla_days into sla_days_value from public.job_stage_sla_settings s
  where s.job_id = current_application.job_id and s.stage = target_stage;

  update public.applications set
    stage = target_stage, kanban_order = target_order, status = target_status, is_new = false,
    rejection_reason = case when target_stage = 'desclassificados' then action_reason else null end,
    stage_entered_at = case when stage is distinct from target_stage then now() else stage_entered_at end,
    stage_sla_due_at = case when sla_days_value is null then null else now() + make_interval(days => sla_days_value) end,
    last_stage_changed_by = case when stage is distinct from target_stage then auth.uid() else last_stage_changed_by end,
    hired_at = case when target_stage = 'contratacao' then coalesce(hired_at, now()) else hired_at end,
    updated_at = now()
  where id = application_uuid returning * into saved_application;

  if target_stage = 'desclassificados' and current_application.stage <> 'desclassificados' then
    insert into public.application_disqualifications (
      franchise_id, job_id, application_id, from_stage, reason, details, disqualified_by
    ) values (
      current_application.franchise_id, current_application.job_id, application_uuid,
      current_application.stage, action_reason, action_metadata->>'details', auth.uid()
    );
  elsif current_application.stage = 'desclassificados' and target_stage <> 'desclassificados' then
    update public.application_disqualifications set
      restored_by = auth.uid(), restored_at = now(), restore_reason = action_reason
    where id = (
      select id from public.application_disqualifications
      where application_id = application_uuid and restored_at is null order by disqualified_at desc limit 1
    );
  end if;
  if target_stage = 'contratacao' then
    insert into public.application_hires (
      franchise_id, project_id, job_id, company_id, application_id, hiring_decision_id,
      approved_at, expected_start_date, internal_responsible_name, internal_responsible_email,
      internal_responsible_phone, admission_status, required_documents, admission_notes, created_by
    )
    select
      saved_application.franchise_id, p.id, saved_application.job_id, saved_application.company_id,
      saved_application.id, d.id, coalesce(d.finalized_at, now()), d.start_date,
      d.internal_responsible_name, d.internal_responsible_email, d.internal_responsible_phone,
      case when d.start_date is null then 'approved' else 'scheduled_to_start' end,
      d.required_documents, coalesce(d.admission_notes, action_reason), auth.uid()
    from (select 1) seed
    left join lateral (select project.id from public.projects project where project.job_id = saved_application.job_id order by project.created_at limit 1) p on true
    left join lateral (
      select decision.* from public.hiring_decisions decision
      where decision.application_id = saved_application.id and decision.decision = 'approved'
      order by coalesce(decision.finalized_at, decision.updated_at) desc limit 1
    ) d on true
    on conflict (application_id) do update set
      hiring_decision_id = coalesce(excluded.hiring_decision_id, application_hires.hiring_decision_id),
      approved_at = coalesce(application_hires.approved_at, excluded.approved_at),
      expected_start_date = coalesce(excluded.expected_start_date, application_hires.expected_start_date),
      internal_responsible_name = coalesce(excluded.internal_responsible_name, application_hires.internal_responsible_name),
      internal_responsible_email = coalesce(excluded.internal_responsible_email, application_hires.internal_responsible_email),
      internal_responsible_phone = coalesce(excluded.internal_responsible_phone, application_hires.internal_responsible_phone),
      required_documents = coalesce(excluded.required_documents, application_hires.required_documents),
      admission_notes = coalesce(excluded.admission_notes, application_hires.admission_notes),
      updated_at = now();
    update public.jobs set approved_positions = least(open_positions, (
      select count(*)::integer from public.applications where job_id = saved_application.job_id and stage = 'contratacao'
    )) where id = saved_application.job_id;
  end if;
  return saved_application;
end $$;

create or replace function public.reorder_applications(application_positions jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare item jsonb; target_application public.applications; affected integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessao expirada.'; end if;
  if jsonb_typeof(application_positions) <> 'array' then raise exception 'Posicoes invalidas.'; end if;
  for item in select * from jsonb_array_elements(application_positions) loop
    select * into target_application from public.applications where id = (item->>'id')::uuid for update;
    if target_application.id is null then raise exception 'Candidatura invalida na reordenacao.'; end if;
    if not (public.is_admin_master() or target_application.franchise_id = public.current_user_franchise_id()
      or exists (select 1 from public.company_user_access cua where cua.user_id = auth.uid()
        and cua.company_id = target_application.company_id and cua.can_manage_jobs)) then
      raise exception 'Sem permissao para reordenar candidatos.';
    end if;
    update public.applications set kanban_order = greatest((item->>'order')::integer, 0), updated_at = now()
    where id = target_application.id;
    affected := affected + 1;
  end loop;
  return affected;
end $$;

alter table public.job_tests enable row level security;
alter table public.application_test_assignments enable row level security;
alter table public.application_disqualifications enable row level security;
alter table public.application_hires enable row level security;
alter table public.job_stage_sla_settings enable row level security;

-- Admin master e franqueado gerenciam; empresa vinculada apenas le dados operacionais permitidos.
do $$
declare table_name text;
begin
  foreach table_name in array array['job_tests','application_test_assignments','application_disqualifications','application_hires','job_stage_sla_settings'] loop
    execute format('drop policy if exists "Admin master manages %1$s" on public.%1$I', table_name);
    execute format('create policy "Admin master manages %1$s" on public.%1$I for all to authenticated using (public.is_admin_master()) with check (public.is_admin_master())', table_name);
    execute format('drop policy if exists "Franchise manages own %1$s" on public.%1$I', table_name);
    execute format('create policy "Franchise manages own %1$s" on public.%1$I for all to authenticated using (franchise_id = public.current_user_franchise_id()) with check (franchise_id = public.current_user_franchise_id())', table_name);
  end loop;
end $$;

drop policy if exists "Company reads own job tests" on public.job_tests;
create policy "Company reads own job tests" on public.job_tests for select to authenticated
using (public.has_company_access((select j.company_id from public.jobs j where j.id = job_tests.job_id)));
drop policy if exists "Company reads own test assignments" on public.application_test_assignments;
create policy "Company reads own test assignments" on public.application_test_assignments for select to authenticated
using (public.has_company_access((select a.company_id from public.applications a where a.id = application_test_assignments.application_id)));
drop policy if exists "Company reads own disqualifications" on public.application_disqualifications;
create policy "Company reads own disqualifications" on public.application_disqualifications for select to authenticated
using (public.has_company_access((select a.company_id from public.applications a where a.id = application_disqualifications.application_id)));
drop policy if exists "Company reads own hires" on public.application_hires;
create policy "Company reads own hires" on public.application_hires for select to authenticated
using (public.has_company_access(company_id));
drop policy if exists "Company reads own SLA" on public.job_stage_sla_settings;
create policy "Company reads own SLA" on public.job_stage_sla_settings for select to authenticated
using (public.has_company_access((select j.company_id from public.jobs j where j.id = job_stage_sla_settings.job_id)));

grant select, insert, update, delete on public.job_tests, public.application_test_assignments,
  public.application_disqualifications, public.application_hires, public.job_stage_sla_settings to authenticated;
grant execute on function public.move_application_stage(uuid, text, integer, text, jsonb) to authenticated;
grant execute on function public.reorder_applications(jsonb) to authenticated;
