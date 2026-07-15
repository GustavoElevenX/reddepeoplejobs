alter table public.sales_opportunities add column if not exists signed_contract_url text;
alter table public.sales_opportunities add column if not exists payment_link text;
alter table public.accounts_receivable add column if not exists payment_link text;
alter table public.contracts add column if not exists provider_document_id text;
alter table public.contracts add column if not exists signing_url text;
alter table public.contracts add column if not exists signed_at timestamptz;

create table if not exists public.franchise_workflow_settings (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade not null unique,
  post_sale_days integer[] not null default array[30, 60, 90],
  interview_default_duration integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  recipient text not null,
  subject text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.franchise_workflow_settings enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "Admin master can manage workflow settings" on public.franchise_workflow_settings;
drop policy if exists "Franchisees can manage own workflow settings" on public.franchise_workflow_settings;
drop policy if exists "Admin master can manage email logs" on public.email_logs;
drop policy if exists "Franchisees can read own email logs" on public.email_logs;

drop policy if exists "Admin master can manage workflow settings" on public.franchise_workflow_settings;
create policy "Admin master can manage workflow settings"
on public.franchise_workflow_settings for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own workflow settings" on public.franchise_workflow_settings;
create policy "Franchisees can manage own workflow settings"
on public.franchise_workflow_settings for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage email logs" on public.email_logs;
create policy "Admin master can manage email logs"
on public.email_logs for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can read own email logs" on public.email_logs;
create policy "Franchisees can read own email logs"
on public.email_logs for select
using (franchise_id = public.current_user_franchise_id());

create or replace function public.get_client_portal(access_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with selected_project as (
    select *
    from public.projects
    where client_access_token = access_token
    limit 1
  )
  select jsonb_build_object(
    'project', to_jsonb(p.*),
    'company', to_jsonb(c.*),
    'job', to_jsonb(j.*),
    'finalists', coalesce((select jsonb_agg(to_jsonb(f.*)) from public.finalists f where f.project_id = p.id), '[]'::jsonb),
    'schedules', coalesce((select jsonb_agg(to_jsonb(s.*)) from public.client_interview_schedules s where s.project_id = p.id), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(to_jsonb(d.*)) from public.hiring_decisions d where d.project_id = p.id), '[]'::jsonb),
    'nps', (select to_jsonb(n.*) from public.nps_responses n where n.project_id = p.id order by n.created_at desc limit 1),
    'applications', coalesce((
      select jsonb_agg(to_jsonb(a.*))
      from public.applications a
      join public.finalists f on f.application_id = a.id
      where f.project_id = p.id
    ), '[]'::jsonb)
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
  current_service_order public.service_orders;
  saved_row public.hiring_decisions;
  start_date_value date;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  select * into current_finalist from public.finalists where id = finalist_uuid and project_id = current_project.id limit 1;

  if current_finalist.id is null then
    raise exception 'Finalista nao encontrado.';
  end if;

  if decision_payload->>'decision' = 'approved' then
    if coalesce(decision_payload->>'start_date', '') = ''
      or coalesce(decision_payload->>'internal_responsible_name', '') = ''
      or coalesce(decision_payload->>'internal_responsible_email', '') = ''
      or coalesce(decision_payload->>'internal_responsible_phone', '') = '' then
      raise exception 'Informe data de inicio e responsavel interno para aprovar o candidato.';
    end if;
    start_date_value := (decision_payload->>'start_date')::date;
  end if;

  delete from public.hiring_decisions where finalist_id = current_finalist.id;

  insert into public.hiring_decisions (
    franchise_id,
    project_id,
    finalist_id,
    application_id,
    decision,
    start_date,
    internal_responsible_name,
    internal_responsible_email,
    internal_responsible_phone,
    admission_notes,
    required_documents,
    rejection_reason
  )
  values (
    current_finalist.franchise_id,
    current_finalist.project_id,
    current_finalist.id,
    current_finalist.application_id,
    decision_payload->>'decision',
    start_date_value,
    coalesce(decision_payload->>'internal_responsible_name', ''),
    coalesce(decision_payload->>'internal_responsible_email', ''),
    coalesce(decision_payload->>'internal_responsible_phone', ''),
    coalesce(decision_payload->>'admission_notes', ''),
    coalesce(decision_payload->>'required_documents', ''),
    coalesce(decision_payload->>'rejection_reason', '')
  )
  returning * into saved_row;

  update public.finalists set status = 'client_decided', updated_at = now() where id = current_finalist.id;

  if decision_payload->>'decision' = 'approved' then
    update public.projects
    set stage = 'candidate_approved', next_step = 'Enviar NPS e iniciar pos-venda', updated_at = now()
    where id = current_project.id;

    update public.applications set status = 'aprovado', updated_at = now() where id = current_finalist.application_id;

    select * into current_service_order from public.service_orders where project_id = current_project.id limit 1;
    if current_service_order.id is not null and not exists (select 1 from public.invoices where project_id = current_project.id) then
      insert into public.invoices (
        franchise_id,
        client_id,
        project_id,
        service_order_id,
        amount,
        status,
        expected_date,
        notes
      )
      values (
        current_project.franchise_id,
        current_project.client_id,
        current_project.id,
        current_service_order.id,
        current_service_order.amount,
        'ready_to_issue',
        current_date + 1,
        'NFS-e preparada ao final do servico.'
      );
    end if;

    insert into public.post_sale_tasks (
      franchise_id,
      project_id,
      client_id,
      application_id,
      title,
      due_date,
      responsible,
      replacement_risk,
      status
    )
    select
      current_project.franchise_id,
      current_project.id,
      current_project.client_id,
      current_finalist.application_id,
      'Fazer pos-venda de ' || days || ' dias',
      start_date_value + days,
      coalesce(decision_payload->>'internal_responsible_name', ''),
      'baixo',
      'open'
    from unnest(coalesce(
      (select s.post_sale_days from public.franchise_workflow_settings s where s.franchise_id = current_project.franchise_id limit 1),
      array[30, 60, 90]
    )) as days;
  elsif decision_payload->>'decision' = 'rejected' then
    update public.applications set status = 'reprovado', updated_at = now() where id = current_finalist.application_id;
  end if;

  return saved_row;
end;
$$;

grant execute on function public.get_client_portal(text) to anon, authenticated;
grant execute on function public.save_portal_hiring_decision(text, uuid, jsonb) to anon, authenticated;
