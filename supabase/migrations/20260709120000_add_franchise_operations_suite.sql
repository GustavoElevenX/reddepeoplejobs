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
  signed_file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

