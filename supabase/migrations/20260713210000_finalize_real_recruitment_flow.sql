-- Finaliza o fluxo operacional real de recrutamento sem remover dados existentes.

alter table public.applications
  add column if not exists resume_analysis_status text not null default 'pending',
  add column if not exists resume_analysis jsonb not null default '{}'::jsonb,
  add column if not exists resume_analysis_error text,
  add column if not exists resume_analyzed_at timestamptz,
  add column if not exists ai_match_score integer,
  add column if not exists ranking_details jsonb not null default '{}'::jsonb,
  add column if not exists ranking_generated_at timestamptz,
  add column if not exists resume_analysis_waived_at timestamptz,
  add column if not exists resume_analysis_waiver_reason text,
  add column if not exists resume_analysis_waived_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'applications_resume_analysis_status_check') then
    alter table public.applications add constraint applications_resume_analysis_status_check
      check (resume_analysis_status in ('pending', 'processing', 'completed', 'failed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'applications_ai_match_score_check') then
    alter table public.applications add constraint applications_ai_match_score_check
      check (ai_match_score is null or ai_match_score between 0 and 100) not valid;
  end if;
end $$;

create table if not exists public.candidate_screenings (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status text not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  mandatory_requirements_confirmed boolean not null default false,
  salary_compatible boolean,
  availability_compatible boolean,
  location_compatible boolean,
  technical_score integer,
  behavioral_score integer,
  recruiter_notes text not null default '',
  rejection_reason text,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, application_id)
);

create table if not exists public.internal_interviews (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status text not null default 'draft',
  scheduled_at timestamptz,
  interviewed_at timestamptz,
  interviewer_id uuid references public.profiles(id) on delete set null,
  template_snapshot jsonb not null default '{}'::jsonb,
  questions_answers jsonb not null default '[]'::jsonb,
  strengths text not null default '',
  risks text not null default '',
  technical_score integer,
  behavioral_score integer,
  communication_score integer,
  culture_score integer,
  recommendation text,
  conclusion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, application_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'candidate_screenings_status_check') then
    alter table public.candidate_screenings add constraint candidate_screenings_status_check
      check (status in ('draft', 'completed', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidate_screenings_scores_check') then
    alter table public.candidate_screenings add constraint candidate_screenings_scores_check
      check ((technical_score is null or technical_score between 0 and 10)
        and (behavioral_score is null or behavioral_score between 0 and 10));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internal_interviews_status_check') then
    alter table public.internal_interviews add constraint internal_interviews_status_check
      check (status in ('draft', 'scheduled', 'completed', 'cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internal_interviews_recommendation_check') then
    alter table public.internal_interviews add constraint internal_interviews_recommendation_check
      check (recommendation is null or recommendation in ('strong_yes', 'yes', 'with_reservations', 'no'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internal_interviews_scores_check') then
    alter table public.internal_interviews add constraint internal_interviews_scores_check
      check ((technical_score is null or technical_score between 0 and 10)
        and (behavioral_score is null or behavioral_score between 0 and 10)
        and (communication_score is null or communication_score between 0 and 10)
        and (culture_score is null or culture_score between 0 and 10));
  end if;
end $$;

alter table public.finalists
  add column if not exists ai_report_status text not null default 'pending',
  add column if not exists ai_report_payload jsonb not null default '{}'::jsonb,
  add column if not exists ai_report_generated_at timestamptz,
  add column if not exists franchise_approved_at timestamptz,
  add column if not exists franchise_approved_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'finalists_ai_report_status_check') then
    alter table public.finalists add constraint finalists_ai_report_status_check
      check (ai_report_status in ('pending', 'generating', 'generated', 'approved', 'failed')) not valid;
  end if;
end $$;

create unique index if not exists finalists_project_application_unique
  on public.finalists(project_id, application_id);

create table if not exists public.accounts_receivable_installments (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  client_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  receivable_id uuid not null references public.accounts_receivable(id) on delete cascade,
  installment_number integer not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  due_date date,
  release_trigger text not null default 'immediate',
  released_at timestamptz,
  status text not null default 'pending',
  paid_at timestamptz,
  payment_link text,
  receipt_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(receivable_id, installment_number)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receivable_installments_release_trigger_check') then
    alter table public.accounts_receivable_installments add constraint receivable_installments_release_trigger_check
      check (release_trigger in ('immediate', 'final_decision', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'receivable_installments_status_check') then
    alter table public.accounts_receivable_installments add constraint receivable_installments_status_check
      check (status in ('locked', 'pending', 'received', 'waived', 'overdue', 'cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'receivable_installments_amount_check') then
    alter table public.accounts_receivable_installments add constraint receivable_installments_amount_check
      check (amount >= 0 and installment_number > 0);
  end if;
end $$;

alter table public.projects
  add column if not exists client_decision_status text not null default 'not_started',
  add column if not exists client_decision_finalized_at timestamptz,
  add column if not exists nps_released_at timestamptz,
  add column if not exists process_completed_at timestamptz,
  add column if not exists finalists_release_exception_reason text;

alter table public.hiring_decisions
  add column if not exists is_final boolean not null default false,
  add column if not exists finalized_at timestamptz;

create unique index if not exists hiring_decisions_finalist_unique
  on public.hiring_decisions(finalist_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_client_decision_status_check') then
    alter table public.projects add constraint projects_client_decision_status_check
      check (client_decision_status in ('not_started', 'in_progress', 'finalized', 'reopen_required')) not valid;
  end if;
end $$;

alter table public.post_sale_tasks
  add column if not exists next_action_date date,
  add column if not exists contacted_person text,
  add column if not exists referral_name text,
  add column if not exists referral_contact text;

alter table public.chat_conversations
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists provider text not null default 'manual_external',
  add column if not exists provider_conversation_id text,
  add column if not exists provider_error text;

alter table public.chat_messages
  add column if not exists franchise_id uuid references public.franchises(id) on delete cascade,
  add column if not exists client_id uuid references public.companies(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists provider text not null default 'manual_external',
  add column if not exists provider_conversation_id text,
  add column if not exists provider_message_id text,
  add column if not exists direction text not null default 'outbound',
  add column if not exists delivery_status text not null default 'queued',
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists error_message text;

alter table public.contracts
  add column if not exists signature_status text not null default 'not_generated',
  add column if not exists signature_error text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_direction_check') then
    alter table public.chat_messages add constraint chat_messages_direction_check
      check (direction in ('inbound', 'outbound')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_delivery_status_check') then
    alter table public.chat_messages add constraint chat_messages_delivery_status_check
      check (delivery_status in ('queued', 'sent', 'delivered', 'read', 'failed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracts_signature_status_check') then
    alter table public.contracts add constraint contracts_signature_status_check
      check (signature_status in ('not_generated', 'generated', 'sent', 'viewed', 'signed', 'cancelled', 'expired', 'failed')) not valid;
  end if;
end $$;

create or replace function public.recalculate_receivable_status(receivable_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  open_total numeric(12,2);
  entry_total numeric(12,2);
  has_overdue boolean;
  has_open boolean;
begin
  select
    coalesce(sum(amount) filter (where status in ('locked', 'pending', 'overdue')), 0),
    coalesce(sum(amount) filter (where lower(description) like '%entrada%' and status <> 'cancelled'), 0),
    coalesce(bool_or(status = 'overdue'), false),
    coalesce(bool_or(status in ('locked', 'pending', 'overdue')), false)
  into open_total, entry_total, has_overdue, has_open
  from public.accounts_receivable_installments
  where receivable_id = receivable_uuid;

  update public.accounts_receivable
  set entry_amount = entry_total,
      remaining_amount = open_total,
      status = case when has_overdue then 'overdue' when has_open then 'pending' else 'received' end,
      updated_at = now()
  where id = receivable_uuid;
end;
$$;

create or replace function public.recalculate_receivable_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_receivable_status(coalesce(new.receivable_id, old.receivable_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists recalculate_receivable_after_installment_change on public.accounts_receivable_installments;

-- Migra contas antigas uma única vez, sem duplicar valores.
insert into public.accounts_receivable_installments (
  franchise_id, client_id, project_id, service_order_id, receivable_id,
  installment_number, description, amount, due_date, release_trigger,
  released_at, status, paid_at, payment_link, notes
)
select ar.franchise_id, ar.client_id, ar.project_id, ar.service_order_id, ar.id,
  1, 'Parcela única, migrada do modelo anterior', ar.total_amount, ar.due_date, 'immediate',
  now(), case when ar.status = 'received' then 'received' when ar.status = 'overdue' then 'overdue' else 'pending' end,
  case when ar.status = 'received' then ar.updated_at else null end, ar.payment_link,
  'Migrado do modelo anterior'
from public.accounts_receivable ar
where not exists (select 1 from public.accounts_receivable_installments i where i.receivable_id = ar.id)
  and not (coalesce(ar.entry_amount, 0) > 0 and coalesce(ar.remaining_amount, 0) > 0);

insert into public.accounts_receivable_installments (
  franchise_id, client_id, project_id, service_order_id, receivable_id,
  installment_number, description, amount, due_date, release_trigger,
  released_at, status, paid_at, payment_link, notes
)
select ar.franchise_id, ar.client_id, ar.project_id, ar.service_order_id, ar.id,
  1, 'Entrada, migrada do modelo anterior', ar.entry_amount, ar.due_date, 'immediate', now(),
  case when ar.status = 'received' then 'received' else 'pending' end,
  case when ar.status = 'received' then ar.updated_at else null end, ar.payment_link,
  'Migrado do modelo anterior'
from public.accounts_receivable ar
where not exists (select 1 from public.accounts_receivable_installments i where i.receivable_id = ar.id)
  and coalesce(ar.entry_amount, 0) > 0 and coalesce(ar.remaining_amount, 0) > 0;

insert into public.accounts_receivable_installments (
  franchise_id, client_id, project_id, service_order_id, receivable_id,
  installment_number, description, amount, due_date, release_trigger, status, notes
)
select ar.franchise_id, ar.client_id, ar.project_id, ar.service_order_id, ar.id,
  2, 'Saldo, migrado do modelo anterior', ar.remaining_amount, ar.due_date, 'final_decision', 'locked',
  'Migrado do modelo anterior'
from public.accounts_receivable ar
where exists (select 1 from public.accounts_receivable_installments i where i.receivable_id = ar.id and i.installment_number = 1 and i.notes = 'Migrado do modelo anterior')
  and not exists (select 1 from public.accounts_receivable_installments i where i.receivable_id = ar.id and i.installment_number = 2)
  and coalesce(ar.entry_amount, 0) > 0 and coalesce(ar.remaining_amount, 0) > 0;

update public.finalists
set ai_report_status = 'generated',
    ai_report_payload = jsonb_build_object('client_facing_report', ai_report),
    ai_report_generated_at = coalesce(ai_report_generated_at, updated_at)
where coalesce(ai_report, '') <> '' and ai_report_status = 'pending';

update public.hiring_decisions d
set is_final = true, finalized_at = coalesce(d.finalized_at, d.updated_at)
from public.projects p
where p.id = d.project_id
  and p.stage in ('candidate_approved', 'post_sale', 'completed')
  and not d.is_final;

create trigger recalculate_receivable_after_installment_change
after insert or update or delete on public.accounts_receivable_installments
for each row execute function public.recalculate_receivable_status_trigger();

do $$
declare
  receivable_record record;
begin
  for receivable_record in select distinct receivable_id from public.accounts_receivable_installments loop
    perform public.recalculate_receivable_status(receivable_record.receivable_id);
  end loop;
end $$;

alter table public.candidate_screenings enable row level security;
alter table public.internal_interviews enable row level security;
alter table public.accounts_receivable_installments enable row level security;

drop policy if exists "Admin master manages candidate screenings" on public.candidate_screenings;
create policy "Admin master manages candidate screenings"
on public.candidate_screenings for all to authenticated
using (public.is_admin_master()) with check (public.is_admin_master());

drop policy if exists "Franchisees manage own candidate screenings" on public.candidate_screenings;
create policy "Franchisees manage own candidate screenings"
on public.candidate_screenings for all to authenticated
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master manages internal interviews" on public.internal_interviews;
create policy "Admin master manages internal interviews"
on public.internal_interviews for all to authenticated
using (public.is_admin_master()) with check (public.is_admin_master());

drop policy if exists "Franchisees manage own internal interviews" on public.internal_interviews;
create policy "Franchisees manage own internal interviews"
on public.internal_interviews for all to authenticated
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master manages receivable installments" on public.accounts_receivable_installments;
create policy "Admin master manages receivable installments"
on public.accounts_receivable_installments for all to authenticated
using (public.is_admin_master()) with check (public.is_admin_master());

drop policy if exists "Franchisees manage own receivable installments" on public.accounts_receivable_installments;
create policy "Franchisees manage own receivable installments"
on public.accounts_receivable_installments for all to authenticated
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

create or replace function public.select_project_finalist(
  project_uuid uuid,
  application_uuid uuid,
  franchise_opinion_value text default ''
)
returns public.finalists
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_project public.projects;
  current_application public.applications;
  current_screening public.candidate_screenings;
  current_interview public.internal_interviews;
  current_finalist public.finalists;
begin
  select * into current_project from public.projects where id = project_uuid;
  if current_project.id is null
    or not (public.is_admin_master() or current_project.franchise_id = public.current_user_franchise_id()) then
    raise exception 'Projeto não encontrado ou sem permissão.';
  end if;

  select * into current_application from public.applications
  where id = application_uuid and job_id = current_project.job_id and franchise_id = current_project.franchise_id;
  if current_application.id is null then raise exception 'Candidatura inválida para este projeto.'; end if;
  if current_application.resume_analysis_status <> 'completed'
    and (current_application.resume_analysis_waived_at is null or coalesce(current_application.resume_analysis_waiver_reason, '') = '') then
    raise exception 'Conclua a análise do currículo ou registre a dispensa com justificativa.';
  end if;

  select * into current_screening from public.candidate_screenings
  where project_id = project_uuid and application_id = application_uuid and status = 'completed';
  if current_screening.id is null then raise exception 'Conclua a triagem manual antes de selecionar o finalista.'; end if;

  select * into current_interview from public.internal_interviews
  where project_id = project_uuid and application_id = application_uuid and status = 'completed';
  if current_interview.id is null then raise exception 'Conclua a entrevista interna antes de selecionar o finalista.'; end if;
  if current_interview.recommendation = 'no' then raise exception 'Candidato com recomendação negativa não pode ser finalista.'; end if;

  select * into current_finalist from public.finalists
  where project_id = project_uuid and application_id = application_uuid;
  if current_finalist.id is null or current_finalist.ai_report_status <> 'approved' then
    raise exception 'Gere, revise e aprove o parecer antes de selecionar o finalista.';
  end if;
  if (select count(*) from public.finalists where project_id = project_uuid and status <> 'draft' and id <> current_finalist.id) >= 3 then
    raise exception 'O projeto já possui três finalistas ativos.';
  end if;

  update public.finalists
  set status = 'selected', franchise_opinion = franchise_opinion_value, updated_at = now()
  where id = current_finalist.id
  returning * into current_finalist;

  update public.applications set stage = 'finalistas', status = 'selecionado', updated_at = now()
  where id = application_uuid;
  update public.projects set stage = 'finalists_selected', next_step = 'Liberar finalistas ao cliente', updated_at = now()
  where id = project_uuid;
  return current_finalist;
end;
$$;

create or replace function public.get_client_portal(access_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with selected_project as (
    select p.* from public.projects p where p.client_access_token = access_token limit 1
  ), released_finalists as (
    select f.* from public.finalists f
    join selected_project p on p.id = f.project_id
    where f.status in ('released_to_client', 'interview_scheduled', 'client_decided')
      and f.ai_report_status = 'approved'
  )
  select jsonb_build_object(
    'project', jsonb_build_object(
      'id', p.id, 'title', p.title, 'stage', p.stage,
      'client_decision_status', p.client_decision_status,
      'client_decision_finalized_at', p.client_decision_finalized_at
    ),
    'company', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end,
    'job', case when j.id is null then null else jsonb_build_object(
      'id', j.id, 'title', j.title, 'description', j.description,
      'location', concat_ws(' / ', j.city, j.state), 'employment_type', j.contract_type
    ) end,
    'finalists', coalesce((select jsonb_agg(jsonb_build_object(
      'id', f.id, 'project_id', f.project_id, 'application_id', f.application_id,
      'status', f.status, 'ai_report', f.ai_report, 'ai_report_status', f.ai_report_status,
      'client_notes', f.client_notes, 'created_at', f.created_at, 'updated_at', f.updated_at
    )) from released_finalists f), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'candidate_name', a.candidate_name, 'candidate_city', a.candidate_city,
      'professional_summary', a.professional_summary
    )) from public.applications a join released_finalists f on f.application_id = a.id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s.*))
      from public.client_interview_schedules s join released_finalists f on f.id = s.finalist_id), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'finalist_id', d.finalist_id, 'decision', d.decision,
      'start_date', d.start_date, 'internal_responsible_name', d.internal_responsible_name,
      'internal_responsible_email', d.internal_responsible_email,
      'internal_responsible_phone', d.internal_responsible_phone,
      'admission_notes', d.admission_notes, 'required_documents', d.required_documents,
      'rejection_reason', d.rejection_reason, 'is_final', d.is_final, 'finalized_at', d.finalized_at
    )) from public.hiring_decisions d join released_finalists f on f.id = d.finalist_id), '[]'::jsonb),
    'nps', (select jsonb_build_object('id', n.id, 'score', n.score, 'comment', n.comment,
      'positives', n.positives, 'improvements', n.improvements, 'referral_possible', n.referral_possible,
      'referral_contacts', n.referral_contacts, 'created_at', n.created_at)
      from public.nps_responses n where n.project_id = p.id order by n.created_at desc limit 1),
    'can_submit_nps', p.nps_released_at is not null and p.client_decision_status = 'finalized'
      and exists (select 1 from public.hiring_decisions d where d.project_id = p.id and d.decision = 'approved' and d.is_final),
    'client_decision_status', p.client_decision_status,
    'decision_finalized_at', p.client_decision_finalized_at
  )
  from selected_project p
  left join public.companies c on c.id = p.client_id
  left join public.jobs j on j.id = p.job_id;
$$;

create or replace function public.save_portal_hiring_decision(access_token text, finalist_uuid uuid, decision_payload jsonb)
returns public.hiring_decisions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  current_finalist public.finalists;
  saved_row public.hiring_decisions;
  decision_value text;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  if current_project.id is null then raise exception 'Projeto não encontrado.'; end if;
  if current_project.client_decision_status = 'finalized' then raise exception 'A decisão já foi finalizada.'; end if;
  select * into current_finalist from public.finalists
  where id = finalist_uuid and project_id = current_project.id
    and status in ('released_to_client', 'interview_scheduled', 'client_decided')
    and ai_report_status = 'approved';
  if current_finalist.id is null then raise exception 'Finalista não encontrado.'; end if;

  decision_value := decision_payload->>'decision';
  if decision_value not in ('approved', 'rejected', 'undecided') then raise exception 'Decisão inválida.'; end if;
  if decision_value = 'approved' and (
    coalesce(decision_payload->>'start_date', '') = '' or
    coalesce(decision_payload->>'internal_responsible_name', '') = '' or
    coalesce(decision_payload->>'internal_responsible_email', '') = '' or
    coalesce(decision_payload->>'internal_responsible_phone', '') = ''
  ) then raise exception 'Informe data de início e os dados do responsável interno.'; end if;

  insert into public.hiring_decisions (
    franchise_id, project_id, finalist_id, application_id, decision, start_date,
    internal_responsible_name, internal_responsible_email, internal_responsible_phone,
    admission_notes, required_documents, rejection_reason, is_final, finalized_at
  ) values (
    current_finalist.franchise_id, current_project.id, current_finalist.id, current_finalist.application_id,
    decision_value, nullif(decision_payload->>'start_date', '')::date,
    coalesce(decision_payload->>'internal_responsible_name', ''),
    coalesce(decision_payload->>'internal_responsible_email', ''),
    coalesce(decision_payload->>'internal_responsible_phone', ''),
    coalesce(decision_payload->>'admission_notes', ''), coalesce(decision_payload->>'required_documents', ''),
    coalesce(decision_payload->>'rejection_reason', ''), false, null
  )
  on conflict (finalist_id) do update set
    decision = excluded.decision, start_date = excluded.start_date,
    internal_responsible_name = excluded.internal_responsible_name,
    internal_responsible_email = excluded.internal_responsible_email,
    internal_responsible_phone = excluded.internal_responsible_phone,
    admission_notes = excluded.admission_notes, required_documents = excluded.required_documents,
    rejection_reason = excluded.rejection_reason, is_final = false, finalized_at = null, updated_at = now()
  returning * into saved_row;

  update public.projects set client_decision_status = 'in_progress', updated_at = now() where id = current_project.id;
  return saved_row;
end;
$$;

create or replace function public.finalize_portal_hiring_decisions(access_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  released_count integer;
  decided_count integer;
  approved_count integer;
  current_service_order public.service_orders;
  approved_payload jsonb;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1 for update;
  if current_project.id is null then raise exception 'Projeto não encontrado.'; end if;
  if current_project.client_decision_status = 'finalized' then raise exception 'A decisão já foi finalizada.'; end if;

  select count(*) into released_count from public.finalists f
  where f.project_id = current_project.id
    and f.status in ('released_to_client', 'interview_scheduled', 'client_decided')
    and f.ai_report_status = 'approved';
  select count(*) into decided_count from public.hiring_decisions d
  join public.finalists f on f.id = d.finalist_id
  where f.project_id = current_project.id
    and f.status in ('released_to_client', 'interview_scheduled', 'client_decided')
    and d.decision in ('approved', 'rejected');
  if released_count = 0 or decided_count <> released_count then
    raise exception 'Todos os finalistas precisam ter decisão aprovada ou rejeitada.';
  end if;
  if exists (
    select 1 from public.hiring_decisions d join public.finalists f on f.id = d.finalist_id
    where f.project_id = current_project.id and d.decision = 'approved'
      and (d.start_date is null or coalesce(d.internal_responsible_name, '') = ''
        or coalesce(d.internal_responsible_email, '') = '' or coalesce(d.internal_responsible_phone, '') = '')
  ) then raise exception 'Preencha os dados de início e responsável de todos os aprovados.'; end if;

  update public.hiring_decisions d set is_final = true, finalized_at = now(), updated_at = now()
  from public.finalists f
  where f.id = d.finalist_id and f.project_id = current_project.id;

  select count(*) into approved_count from public.hiring_decisions
  where project_id = current_project.id and decision = 'approved' and is_final;

  if approved_count > 0 then
    update public.applications a set
      status = case when d.decision = 'approved' then 'aprovado'::public.application_status else 'reprovado'::public.application_status end,
      stage = case when d.decision = 'approved' then 'contratacao' else 'desclassificados' end,
      updated_at = now()
    from public.hiring_decisions d
    where d.application_id = a.id and d.project_id = current_project.id and d.is_final;

    update public.projects set stage = 'candidate_approved', next_step = 'Emitir NFS-e e iniciar pós-venda',
      client_decision_status = 'finalized', client_decision_finalized_at = now(), nps_released_at = now(),
      process_completed_at = now(), updated_at = now()
    where id = current_project.id;

    update public.accounts_receivable_installments
    set status = 'pending', released_at = now(), updated_at = now()
    where project_id = current_project.id and status = 'locked' and release_trigger = 'final_decision';

    select * into current_service_order from public.service_orders where project_id = current_project.id limit 1;
    if current_service_order.id is not null and not exists (
      select 1 from public.invoices where project_id = current_project.id and status <> 'cancelled'
    ) then
      insert into public.invoices (franchise_id, client_id, project_id, service_order_id, amount, status, expected_date, notes)
      values (current_project.franchise_id, current_project.client_id, current_project.id, current_service_order.id,
        current_service_order.amount, 'ready_to_issue', current_date + 1,
        'NFS-e preparada após a finalização conjunta. Emissão continua manual.');
    end if;

    insert into public.post_sale_tasks (
      franchise_id, project_id, client_id, application_id, title, due_date, responsible,
      replacement_risk, status
    )
    select current_project.franchise_id, current_project.id, current_project.client_id, d.application_id,
      'Fazer pós-venda de ' || days || ' dias', d.start_date + days,
      d.internal_responsible_name, 'baixo', 'open'
    from public.hiring_decisions d
    cross join lateral unnest(coalesce(
      (select s.post_sale_days from public.franchise_workflow_settings s
       where s.franchise_id = current_project.franchise_id limit 1), array[30,60,90]
    )) days
    where d.project_id = current_project.id and d.decision = 'approved' and d.is_final
      and not exists (
        select 1 from public.post_sale_tasks t
        where t.project_id = current_project.id and t.application_id = d.application_id
          and t.title = 'Fazer pós-venda de ' || days || ' dias'
      );
  else
    update public.applications a set status = 'reprovado', stage = 'desclassificados', updated_at = now()
    from public.hiring_decisions d
    where d.application_id = a.id and d.project_id = current_project.id and d.is_final;
    update public.projects set stage = 'finalists_selected', next_step = 'Selecionar novos finalistas',
      client_decision_status = 'reopen_required', client_decision_finalized_at = now(),
      nps_released_at = null, process_completed_at = null, updated_at = now()
    where id = current_project.id;
    insert into public.notification_tasks (franchise_id, project_id, title, type, due_at, status)
    values (current_project.franchise_id, current_project.id, 'Selecionar novos finalistas',
      'reopen_finalists', now(), 'open');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'application_id', d.application_id, 'candidate_name', a.candidate_name,
    'candidate_email', a.candidate_email, 'decision', d.decision,
    'start_date', d.start_date, 'internal_responsible_name', d.internal_responsible_name,
    'internal_responsible_email', d.internal_responsible_email,
    'internal_responsible_phone', d.internal_responsible_phone
  )), '[]'::jsonb) into approved_payload
  from public.hiring_decisions d join public.applications a on a.id = d.application_id
  where d.project_id = current_project.id and d.is_final;

  return jsonb_build_object('status', case when approved_count > 0 then 'finalized' else 'reopen_required' end,
    'approved_count', approved_count, 'decisions', approved_payload);
end;
$$;

create or replace function public.save_public_nps(access_token text, nps_payload jsonb)
returns public.nps_responses
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  saved_row public.nps_responses;
  score_value integer;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  if current_project.id is null then raise exception 'Projeto não encontrado.'; end if;
  if current_project.nps_released_at is null or current_project.client_decision_status <> 'finalized'
    or not exists (select 1 from public.hiring_decisions d
      where d.project_id = current_project.id and d.decision = 'approved' and d.is_final) then
    raise exception 'O NPS ainda não foi liberado para este processo.';
  end if;
  if exists (select 1 from public.nps_responses where project_id = current_project.id) then
    raise exception 'O NPS deste processo já foi respondido.';
  end if;
  score_value := (nps_payload->>'score')::integer;
  if score_value is null or score_value not between 0 and 10 then raise exception 'Nota de NPS inválida.'; end if;

  insert into public.nps_responses (
    franchise_id, project_id, client_id, score, comment, positives, improvements,
    referral_possible, referral_contacts
  ) values (
    current_project.franchise_id, current_project.id, current_project.client_id, score_value,
    coalesce(nps_payload->>'comment', ''), coalesce(nps_payload->>'positives', ''),
    coalesce(nps_payload->>'improvements', ''), coalesce((nps_payload->>'referral_possible')::boolean, false),
    coalesce(nps_payload->>'referral_contacts', '')
  ) returning * into saved_row;

  update public.projects set stage = 'post_sale', next_step = 'Acompanhar tarefas de pós-venda', updated_at = now()
  where id = current_project.id;
  insert into public.notification_tasks (franchise_id, project_id, title, type, due_at, status)
  values (current_project.franchise_id, current_project.id, 'NPS respondido pelo cliente', 'nps_received', now(), 'open');
  return saved_row;
end;
$$;

create or replace view public.client_last_hiring_activity
with (security_invoker = true)
as
select c.id as client_id, c.franchise_id,
  max(coalesce(d.finalized_at, d.updated_at)) filter (where d.decision = 'approved' and d.is_final) as last_hiring_at,
  max(p.created_at) filter (where p.stage in ('candidate_approved', 'post_sale', 'completed')) as last_completed_project_at,
  coalesce(
    max(coalesce(d.finalized_at, d.updated_at)) filter (where d.decision = 'approved' and d.is_final),
    max(p.created_at) filter (where p.stage in ('candidate_approved', 'post_sale', 'completed')),
    c.created_at
  ) as activity_reference_at
from public.companies c
left join public.projects p on p.client_id = c.id
left join public.hiring_decisions d on d.project_id = p.id
group by c.id, c.franchise_id, c.created_at;

grant select on public.client_last_hiring_activity to authenticated;
grant execute on function public.select_project_finalist(uuid, uuid, text) to authenticated;
grant execute on function public.get_client_portal(text) to anon, authenticated;
grant execute on function public.save_portal_hiring_decision(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.finalize_portal_hiring_decisions(text) to anon, authenticated;
grant execute on function public.save_public_nps(text, jsonb) to anon, authenticated;

revoke all on public.candidate_screenings from anon;
revoke all on public.internal_interviews from anon;
revoke all on public.accounts_receivable_installments from anon;
