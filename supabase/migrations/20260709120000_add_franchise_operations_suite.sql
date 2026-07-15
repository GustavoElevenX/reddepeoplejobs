create table if not exists public.sales_opportunities (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  legal_name text,
  document text,
  segment text,
  contact_name text,
  contact_role text,
  contact_phone text,
  contact_email text,
  city text,
  source text,
  campaign text,
  need text,
  estimated_positions integer default 1,
  service_name text,
  negotiated_value numeric(12,2) default 0,
  payment_terms text,
  contract_status text default 'not_generated',
  initial_payment_status text default 'pending',
  signed_contract_url text,
  payment_link text,
  stage text default 'new_lead',
  next_follow_up date,
  notes text,
  lost_reason text,
  converted_project_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  opportunity_id uuid references public.sales_opportunities(id) on delete set null,
  client_id uuid references public.companies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  title text not null,
  stage text not null default 'briefing_pending',
  priority text not null default 'medium',
  next_step text,
  client_access_token text not null default encode(gen_random_bytes(24), 'hex'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_opportunities drop constraint if exists sales_opportunities_converted_project_id_fkey;
alter table public.sales_opportunities
  add constraint sales_opportunities_converted_project_id_fkey
  foreign key (converted_project_id) references public.projects(id) on delete set null;

create table if not exists public.job_briefings (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  secure_token text not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'not_sent',
  payload jsonb not null default '{}'::jsonb,
  filled_by text,
  sent_at timestamptz,
  filled_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists job_briefings_secure_token_key on public.job_briefings(secure_token);

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  briefing_id uuid references public.job_briefings(id) on delete cascade,
  status text not null default 'generated',
  content jsonb not null default '{}'::jsonb,
  job_id uuid references public.jobs(id) on delete set null,
  ai_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  status text not null default 'not_generated',
  provider text,
  provider_document_id text,
  signing_url text,
  signed_file_url text,
  signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts
  add column if not exists provider_document_id text,
  add column if not exists signing_url text,
  add column if not exists signed_at timestamptz;

create table if not exists public.franchise_workflow_settings (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  post_sale_days integer[] not null default array[30,60,90],
  interview_default_duration integer not null default 45,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(franchise_id)
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  recipient text not null,
  subject text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  opportunity_id uuid references public.sales_opportunities(id) on delete set null,
  description text,
  amount numeric(12,2) default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  description text,
  total_amount numeric(12,2) default 0,
  entry_amount numeric(12,2) default 0,
  remaining_amount numeric(12,2) default 0,
  due_date date,
  payment_terms text,
  payment_link text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  description text not null,
  category text,
  amount numeric(12,2) default 0,
  due_date date,
  status text not null default 'pending',
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  amount numeric(12,2) default 0,
  status text not null default 'pending',
  expected_date date,
  issued_at timestamptz,
  number text,
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finalists (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  status text not null default 'draft',
  franchise_opinion text,
  ai_report text,
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_interview_schedules (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  finalist_id uuid references public.finalists(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  date date not null,
  time time not null,
  duration_minutes integer not null default 45,
  format text not null default 'online',
  location_or_link text,
  notes text,
  candidate_confirmation_token text not null default encode(gen_random_bytes(24), 'hex'),
  candidate_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_interview_schedules_token_key
  on public.client_interview_schedules(candidate_confirmation_token);

create table if not exists public.hiring_decisions (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  finalist_id uuid references public.finalists(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  decision text not null,
  start_date date,
  internal_responsible_name text,
  internal_responsible_email text,
  internal_responsible_phone text,
  admission_notes text,
  required_documents text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  score integer not null check (score between 0 and 10),
  comment text,
  positives text,
  improvements text,
  referral_possible boolean not null default false,
  referral_contacts text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_sale_tasks (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.companies(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  title text not null,
  due_date date,
  contact_date timestamptz,
  responsible text,
  candidate_status text,
  client_satisfaction text,
  replacement_risk text,
  new_position_identified boolean not null default false,
  referral_received boolean not null default false,
  notes text,
  next_action text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.companies(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  type text,
  name text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  client_id uuid references public.companies(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  title text not null,
  channel text not null default 'internal',
  status text not null default 'open',
  tags text[] not null default '{}',
  responsible text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  sender text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_tasks (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  opportunity_id uuid references public.sales_opportunities(id) on delete set null,
  title text not null,
  type text,
  due_at timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  provider text,
  prompt jsonb,
  response jsonb,
  status text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.sales_opportunities enable row level security;
alter table public.projects enable row level security;
alter table public.job_briefings enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.contracts enable row level security;
alter table public.service_orders enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.invoices enable row level security;
alter table public.finalists enable row level security;
alter table public.client_interview_schedules enable row level security;
alter table public.hiring_decisions enable row level security;
alter table public.nps_responses enable row level security;
alter table public.post_sale_tasks enable row level security;
alter table public.documents enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notification_tasks enable row level security;
alter table public.ai_logs enable row level security;
alter table public.franchise_workflow_settings enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "Admin master can manage sales opportunities" on public.sales_opportunities;
create policy "Admin master can manage sales opportunities"
on public.sales_opportunities for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own sales opportunities" on public.sales_opportunities;
create policy "Franchisees can manage own sales opportunities"
on public.sales_opportunities for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage projects" on public.projects;
create policy "Admin master can manage projects"
on public.projects for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own projects" on public.projects;
create policy "Franchisees can manage own projects"
on public.projects for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage job briefings" on public.job_briefings;
create policy "Admin master can manage job briefings"
on public.job_briefings for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own job briefings" on public.job_briefings;
create policy "Franchisees can manage own job briefings"
on public.job_briefings for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage job descriptions" on public.job_descriptions;
create policy "Admin master can manage job descriptions"
on public.job_descriptions for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own job descriptions" on public.job_descriptions;
create policy "Franchisees can manage own job descriptions"
on public.job_descriptions for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage contracts" on public.contracts;
create policy "Admin master can manage contracts"
on public.contracts for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own contracts" on public.contracts;
create policy "Franchisees can manage own contracts"
on public.contracts for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage service orders" on public.service_orders;
create policy "Admin master can manage service orders"
on public.service_orders for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own service orders" on public.service_orders;
create policy "Franchisees can manage own service orders"
on public.service_orders for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage accounts receivable" on public.accounts_receivable;
create policy "Admin master can manage accounts receivable"
on public.accounts_receivable for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own accounts receivable" on public.accounts_receivable;
create policy "Franchisees can manage own accounts receivable"
on public.accounts_receivable for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage accounts payable" on public.accounts_payable;
create policy "Admin master can manage accounts payable"
on public.accounts_payable for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own accounts payable" on public.accounts_payable;
create policy "Franchisees can manage own accounts payable"
on public.accounts_payable for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage invoices" on public.invoices;
create policy "Admin master can manage invoices"
on public.invoices for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own invoices" on public.invoices;
create policy "Franchisees can manage own invoices"
on public.invoices for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage finalists" on public.finalists;
create policy "Admin master can manage finalists"
on public.finalists for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own finalists" on public.finalists;
create policy "Franchisees can manage own finalists"
on public.finalists for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage schedules" on public.client_interview_schedules;
create policy "Admin master can manage schedules"
on public.client_interview_schedules for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own schedules" on public.client_interview_schedules;
create policy "Franchisees can manage own schedules"
on public.client_interview_schedules for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage hiring decisions" on public.hiring_decisions;
create policy "Admin master can manage hiring decisions"
on public.hiring_decisions for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own hiring decisions" on public.hiring_decisions;
create policy "Franchisees can manage own hiring decisions"
on public.hiring_decisions for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage nps" on public.nps_responses;
create policy "Admin master can manage nps"
on public.nps_responses for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own nps" on public.nps_responses;
create policy "Franchisees can manage own nps"
on public.nps_responses for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage post sale" on public.post_sale_tasks;
create policy "Admin master can manage post sale"
on public.post_sale_tasks for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own post sale" on public.post_sale_tasks;
create policy "Franchisees can manage own post sale"
on public.post_sale_tasks for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage documents" on public.documents;
create policy "Admin master can manage documents"
on public.documents for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own documents" on public.documents;
create policy "Franchisees can manage own documents"
on public.documents for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage chat conversations" on public.chat_conversations;
create policy "Admin master can manage chat conversations"
on public.chat_conversations for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own chat conversations" on public.chat_conversations;
create policy "Franchisees can manage own chat conversations"
on public.chat_conversations for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage chat messages" on public.chat_messages;
create policy "Admin master can manage chat messages"
on public.chat_messages for all
using (
  public.is_admin_master()
  or exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and c.franchise_id = public.current_user_franchise_id()
  )
)
with check (
  public.is_admin_master()
  or exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and c.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Admin master can manage notification tasks" on public.notification_tasks;
create policy "Admin master can manage notification tasks"
on public.notification_tasks for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can manage own notification tasks" on public.notification_tasks;
create policy "Franchisees can manage own notification tasks"
on public.notification_tasks for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Admin master can manage ai logs" on public.ai_logs;
create policy "Admin master can manage ai logs"
on public.ai_logs for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can read own ai logs" on public.ai_logs;
create policy "Franchisees can read own ai logs"
on public.ai_logs for select
using (franchise_id = public.current_user_franchise_id());

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

create or replace function public.get_public_briefing(access_token text)
returns public.job_briefings
language sql
security definer
set search_path = public
as $$
  select *
  from public.job_briefings
  where secure_token = access_token
  limit 1;
$$;

create or replace function public.save_public_briefing(access_token text, next_payload jsonb)
returns public.job_briefings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.job_briefings;
begin
  update public.job_briefings
  set
    payload = next_payload,
    status = 'filled',
    filled_by = 'client',
    filled_at = now(),
    updated_at = now()
  where secure_token = access_token
  returning * into updated_row;

  update public.projects
  set
    next_step = 'Franqueado revisar briefing',
    updated_at = now()
  where id = updated_row.project_id;

  return updated_row;
end;
$$;

create or replace function public.get_candidate_confirmation(access_token text)
returns table (
  schedule jsonb,
  application jsonb,
  project jsonb,
  company jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    to_jsonb(s.*) as schedule,
    to_jsonb(a.*) as application,
    to_jsonb(p.*) as project,
    to_jsonb(c.*) as company
  from public.client_interview_schedules s
  left join public.applications a on a.id = s.application_id
  left join public.projects p on p.id = s.project_id
  left join public.companies c on c.id = p.client_id
  where s.candidate_confirmation_token = access_token
  limit 1;
$$;

create or replace function public.confirm_candidate_presence(access_token text)
returns public.client_interview_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.client_interview_schedules;
begin
  update public.client_interview_schedules
  set candidate_confirmed_at = now(), updated_at = now()
  where candidate_confirmation_token = access_token
  returning * into updated_row;

  insert into public.notification_tasks (
    franchise_id,
    project_id,
    opportunity_id,
    title,
    type,
    due_at,
    status
  )
  values (
    updated_row.franchise_id,
    updated_row.project_id,
    null,
    'Candidato confirmou presença na entrevista com o cliente',
    'candidate_confirmed',
    now(),
    'open'
  );

  return updated_row;
end;
$$;

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

create or replace function public.save_public_nps(access_token text, nps_payload jsonb)
returns public.nps_responses
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  saved_row public.nps_responses;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  if current_project.id is null then
    raise exception 'Projeto não encontrado.';
  end if;

  delete from public.nps_responses where project_id = current_project.id;

  insert into public.nps_responses (
    franchise_id,
    project_id,
    client_id,
    score,
    comment,
    positives,
    improvements,
    referral_possible,
    referral_contacts
  )
  values (
    current_project.franchise_id,
    current_project.id,
    current_project.client_id,
    coalesce((nps_payload->>'score')::integer, 10),
    coalesce(nps_payload->>'comment', ''),
    coalesce(nps_payload->>'positives', ''),
    coalesce(nps_payload->>'improvements', ''),
    coalesce((nps_payload->>'referral_possible')::boolean, false),
    coalesce(nps_payload->>'referral_contacts', '')
  )
  returning * into saved_row;

  update public.projects
  set stage = 'post_sale', next_step = 'Acompanhar tarefas de pos-venda', updated_at = now()
  where id = current_project.id;

  return saved_row;
end;
$$;

create or replace function public.schedule_client_interview(access_token text, finalist_uuid uuid, schedule_payload jsonb)
returns public.client_interview_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  current_finalist public.finalists;
  saved_row public.client_interview_schedules;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  select * into current_finalist from public.finalists where id = finalist_uuid and project_id = current_project.id limit 1;

  if current_finalist.id is null then
    raise exception 'Finalista não encontrado.';
  end if;

  if exists (
    select 1
    from public.client_interview_schedules s
    where s.project_id = current_project.id
      and s.date = (schedule_payload->>'date')::date
      and s.time = (schedule_payload->>'time')::time
  ) then
    raise exception 'Já existe entrevista neste horário para o projeto.';
  end if;

  insert into public.client_interview_schedules (
    franchise_id,
    project_id,
    finalist_id,
    application_id,
    date,
    time,
    duration_minutes,
    format,
    location_or_link,
    notes
  )
  values (
    current_finalist.franchise_id,
    current_finalist.project_id,
    current_finalist.id,
    current_finalist.application_id,
    (schedule_payload->>'date')::date,
    (schedule_payload->>'time')::time,
    coalesce((schedule_payload->>'duration_minutes')::integer, 45),
    coalesce(schedule_payload->>'format', 'online'),
    coalesce(schedule_payload->>'location_or_link', ''),
    coalesce(schedule_payload->>'notes', '')
  )
  returning * into saved_row;

  update public.finalists set status = 'interview_scheduled', updated_at = now() where id = current_finalist.id;
  update public.projects
  set stage = 'client_interviews', next_step = 'Aguardar confirmação do candidato', updated_at = now()
  where id = current_project.id;

  return saved_row;
end;
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
    raise exception 'Finalista não encontrado.';
  end if;

  if decision_payload->>'decision' = 'approved' then
    if coalesce(decision_payload->>'start_date', '') = ''
      or coalesce(decision_payload->>'internal_responsible_name', '') = ''
      or coalesce(decision_payload->>'internal_responsible_email', '') = ''
      or coalesce(decision_payload->>'internal_responsible_phone', '') = '' then
      raise exception 'Informe data de início e responsável interno para aprovar o candidato.';
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
    set stage = 'candidate_approved', next_step = 'Enviar NPS e iniciar pós-venda', updated_at = now()
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
        'NFS-e preparada ao final do serviço.'
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
      'Fazer pós-venda de ' || days || ' dias',
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
