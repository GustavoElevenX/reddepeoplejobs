create extension if not exists pgcrypto;

create type public.app_role as enum (
  'redde_super_admin',
  'redde_admin',
  'company_admin',
  'company_recruiter'
);

create type public.company_page_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.job_status as enum (
  'draft',
  'open',
  'paused',
  'closed',
  'archived'
);

create type public.job_modality as enum (
  'presencial',
  'hibrido',
  'remoto'
);

create type public.job_contract_type as enum (
  'clt',
  'pj',
  'estagio',
  'temporario',
  'freelancer',
  'outro'
);

create type public.application_status as enum (
  'novo',
  'em_analise',
  'selecionado',
  'entrevista',
  'reprovado',
  'contratado'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_image_url text,
  segment text,
  city text,
  state text default 'MA',
  employees_range text,
  website_url text,
  instagram_url text,
  linkedin_url text,
  short_description text,
  about_text text,
  why_work_here text,
  culture_text text,
  page_status public.company_page_status not null default 'draft',
  is_featured boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  can_edit_company_page boolean not null default false,
  can_manage_jobs boolean not null default true,
  can_view_applications boolean not null default true,
  can_download_resumes boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  slug text not null,
  short_description text,
  description text not null,
  responsibilities text,
  requirements text,
  benefits text,
  salary_range text,
  city text,
  state text default 'MA',
  modality public.job_modality not null default 'presencial',
  contract_type public.job_contract_type not null default 'clt',
  seniority text,
  status public.job_status not null default 'draft',
  is_featured boolean not null default false,
  application_deadline date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  candidate_name text not null,
  candidate_email text not null,
  candidate_phone text not null,
  candidate_city text,
  linkedin_url text,
  portfolio_url text,
  salary_expectation text,
  availability text,
  message text,
  resume_file_path text not null,
  status public.application_status not null default 'novo',
  lgpd_consent boolean not null default false,
  source text default 'portal_publico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  note text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.site_contents (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  body text,
  button_label text,
  button_url text,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index companies_slug_idx on public.companies(slug);
create index companies_public_idx on public.companies(page_status, is_featured);
create index jobs_company_status_idx on public.jobs(company_id, status);
create index jobs_slug_idx on public.jobs(company_id, slug);
create index applications_company_status_idx on public.applications(company_id, status);
create index applications_job_idx on public.applications(job_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_companies_updated_at before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();

create trigger set_applications_updated_at before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_site_contents_updated_at before update on public.site_contents
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  and is_active = true
  limit 1;
$$;

create or replace function public.is_redde_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and is_active = true
    and role in ('redde_super_admin', 'redde_admin')
  );
$$;

create or replace function public.has_company_access(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_user_access cua
    join public.profiles p on p.id = cua.user_id
    where cua.user_id = auth.uid()
    and cua.company_id = target_company_id
    and p.is_active = true
  );
$$;

create or replace function public.can_download_company_resumes(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_user_access cua
    join public.profiles p on p.id = cua.user_id
    where cua.user_id = auth.uid()
    and cua.company_id = target_company_id
    and cua.can_download_resumes = true
    and p.is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_user_access enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_notes enable row level security;
alter table public.site_contents enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Redde admins can manage all profiles"
on public.profiles for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Public can read published companies"
on public.companies for select
using (page_status = 'published');

create policy "Redde admins can manage all companies"
on public.companies for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Company users can read their own company"
on public.companies for select
using (public.has_company_access(id));

create policy "Company admins can update their own company when allowed"
on public.companies for update
using (
  exists (
    select 1
    from public.company_user_access cua
    join public.profiles p on p.id = cua.user_id
    where cua.user_id = auth.uid()
    and cua.company_id = companies.id
    and p.role in ('company_admin', 'company_recruiter')
    and cua.can_edit_company_page = true
    and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.company_user_access cua
    join public.profiles p on p.id = cua.user_id
    where cua.user_id = auth.uid()
    and cua.company_id = companies.id
    and p.role in ('company_admin', 'company_recruiter')
    and cua.can_edit_company_page = true
    and p.is_active = true
  )
);

create policy "Redde admins can manage company access"
on public.company_user_access for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Company users can read own access"
on public.company_user_access for select
using (user_id = auth.uid());

create policy "Public can read open jobs from published companies"
on public.jobs for select
using (
  status = 'open'
  and exists (
    select 1 from public.companies c
    where c.id = jobs.company_id
    and c.page_status = 'published'
  )
);

create policy "Redde admins can manage all jobs"
on public.jobs for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Company users can read own jobs"
on public.jobs for select
using (public.has_company_access(company_id));

create policy "Company users can manage own jobs when allowed"
on public.jobs for all
using (
  exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
    and cua.company_id = jobs.company_id
    and cua.can_manage_jobs = true
  )
)
with check (
  exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
    and cua.company_id = jobs.company_id
    and cua.can_manage_jobs = true
  )
);

create policy "Public can insert applications"
on public.applications for insert
with check (
  lgpd_consent = true
  and exists (
    select 1
    from public.jobs j
    where j.id = applications.job_id
    and j.company_id = applications.company_id
    and j.status = 'open'
  )
);

create policy "Redde admins can read all applications"
on public.applications for select
using (public.is_redde_admin());

create policy "Redde admins can update all applications"
on public.applications for update
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Company users can read own applications"
on public.applications for select
using (
  public.has_company_access(company_id)
  and exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
    and cua.company_id = applications.company_id
    and cua.can_view_applications = true
  )
);

create policy "Company users can update own applications"
on public.applications for update
using (
  public.has_company_access(company_id)
  and exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
    and cua.company_id = applications.company_id
    and cua.can_view_applications = true
  )
)
with check (public.has_company_access(company_id));

create policy "Redde admins can manage application notes"
on public.application_notes for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Company users can read notes for own applications"
on public.application_notes for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
    and public.has_company_access(a.company_id)
  )
);

create policy "Company users can insert notes for own applications"
on public.application_notes for insert
with check (
  exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
    and public.has_company_access(a.company_id)
  )
);

create policy "Public can read active site contents"
on public.site_contents for select
using (is_active = true);

create policy "Redde admins can manage site contents"
on public.site_contents for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

create policy "Redde admins can read audit logs"
on public.audit_logs for select
using (public.is_redde_admin());

create policy "Redde admins can insert audit logs"
on public.audit_logs for insert
with check (public.is_redde_admin());

insert into storage.buckets (id, name, public)
values
  ('company-assets', 'company-assets', true),
  ('resumes', 'resumes', false)
on conflict (id) do update set public = excluded.public;

create policy "Company assets are public"
on storage.objects for select
using (bucket_id = 'company-assets');

create policy "Redde admins can manage company assets"
on storage.objects for all
using (bucket_id = 'company-assets' and public.is_redde_admin())
with check (bucket_id = 'company-assets' and public.is_redde_admin());

create policy "Public can upload resumes"
on storage.objects for insert
with check (bucket_id = 'resumes');

create policy "Authorized users can read resumes"
on storage.objects for select
using (
  bucket_id = 'resumes'
  and (
    public.is_redde_admin()
    or exists (
      select 1
      from public.applications a
      where a.resume_file_path = storage.objects.name
      and public.can_download_company_resumes(a.company_id)
    )
  )
);

insert into public.companies (
  name,
  slug,
  logo_url,
  segment,
  city,
  state,
  employees_range,
  short_description,
  about_text,
  why_work_here,
  culture_text,
  page_status,
  is_featured
) values
  (
    'Aba Kids',
    'aba-kids',
    '/imagens/clientes/aba-kids.png',
    'Educação e desenvolvimento infantil',
    'São Luís',
    'MA',
    '51-200',
    'Empresa parceira da Redde People com oportunidades em atendimento, apoio pedagógico e operação.',
    'A Aba Kids atua com serviços voltados ao desenvolvimento infantil, combinando atendimento cuidadoso, rotina organizada e equipes preparadas.',
    'Ambiente de crescimento, clareza de função e processo seletivo organizado com apoio da Redde People.',
    'Cultura voltada para responsabilidade, cuidado, atendimento e desenvolvimento.',
    'published',
    true
  ),
  (
    'Aquarela',
    'aquarela',
    '/imagens/clientes/aquarela.png',
    'Serviços educacionais',
    'São Luís',
    'MA',
    '11-50',
    'Empresa parceira com vagas abertas para áreas administrativas, atendimento e operação.',
    'A Aquarela é uma empresa parceira com rotinas estruturadas, foco em atendimento e desenvolvimento de pessoas.',
    'Processo seletivo estruturado com apoio da Redde People.',
    'Cultura focada em entrega, colaboração e melhoria contínua.',
    'published',
    true
  ),
  (
    'Conceito',
    'conceito',
    '/imagens/clientes/conceito.png',
    'Serviços',
    'São Luís',
    'MA',
    '201-500',
    'Empresa parceira com oportunidades em atendimento, rotinas comerciais e gestão operacional.',
    'A Conceito atua em serviços com foco em experiência do cliente, organização de processos e melhoria contínua.',
    'Rotina clara, liderança próxima e oportunidades para perfis comerciais, administrativos e operacionais.',
    'Ambiente colaborativo, orientado por qualidade, ética e melhoria contínua.',
    'published',
    true
  ),
  (
    'Darma Center',
    'darma-center',
    '/imagens/clientes/darma-center.png',
    'Saúde e bem-estar',
    'São Luís',
    'MA',
    '101-200',
    'Centro parceiro com oportunidades em atendimento, recepção, operação e suporte administrativo.',
    'O Darma Center reúne serviços com foco em bem-estar, atendimento humanizado e organização da experiência do cliente.',
    'Processos bem definidos, rotina acolhedora e oportunidades para perfis de atendimento e suporte.',
    'Cultura de cuidado, pontualidade, acolhimento e responsabilidade.',
    'published',
    true
  ),
  (
    'Karolícias',
    'karolicias',
    '/imagens/clientes/karolicias.png',
    'Alimentos',
    'São Luís',
    'MA',
    '51-200',
    'Marca parceira com oportunidades em produção, atendimento, vendas e rotinas operacionais.',
    'A Karolícias atua no segmento de alimentos com foco em qualidade, apresentação, atendimento e ritmo operacional.',
    'Ambiente prático, rotina clara e oportunidades para quem gosta de atendimento e produção com capricho.',
    'Cultura orientada por qualidade, cuidado, colaboração e melhoria diária.',
    'published',
    true
  ),
  (
    'Levive',
    'levive',
    '/imagens/clientes/levive.png',
    'Saúde e estética',
    'São Luís',
    'MA',
    '201-500',
    'Empresa parceira com oportunidades em atendimento, comercial e suporte à operação.',
    'A Levive atua com foco em experiência do cliente, atendimento consultivo e serviços de saúde e estética.',
    'Plano de crescimento por área, liderança próxima e rotinas de treinamento.',
    'Ambiente disciplinado, acolhedor e orientado por qualidade.',
    'published',
    true
  )
on conflict (slug) do nothing;

with c as (
  select id, slug from public.companies
)
insert into public.jobs (
  company_id,
  title,
  slug,
  short_description,
  description,
  responsibilities,
  requirements,
  benefits,
  salary_range,
  city,
  state,
  modality,
  contract_type,
  seniority,
  status,
  is_featured
)
select id, 'Assistente de Atendimento Infantil', 'assistente-de-atendimento-infantil',
  'Atendimento a famílias, organização de demandas e suporte à rotina da unidade.',
  'Atuar no atendimento a famílias, registrar solicitações, organizar informações e apoiar a liderança em rotinas operacionais.',
  'Atender famílias; registrar solicitações; acompanhar prazos; apoiar relatórios operacionais.',
  'Ensino médio completo; boa comunicação; experiência com atendimento ou educação será diferencial.',
  'Vale-transporte; vale-alimentação; plano de desenvolvimento interno.',
  'R$ 1.600 a R$ 1.900', 'São Luís', 'MA', 'presencial'::public.job_modality, 'clt'::public.job_contract_type, 'Júnior', 'open'::public.job_status, true
from c where slug = 'aba-kids'
union all
select id, 'Assistente Administrativo', 'assistente-administrativo',
  'Controle de documentos, indicadores e suporte às rotinas financeiras.',
  'Organizar documentos, acompanhar indicadores, apoiar processos financeiros e dar suporte à gestão.',
  'Organizar documentos; apoiar contas a pagar; acompanhar indicadores; preparar relatórios.',
  'Experiência administrativa; Excel intermediário; perfil organizado e analítico.',
  'Vale-alimentação; assistência médica; bonificação por desempenho.',
  'R$ 2.200 a R$ 2.700', 'São Luís', 'MA', 'hibrido'::public.job_modality, 'clt'::public.job_contract_type, 'Pleno', 'open'::public.job_status, true
from c where slug = 'aquarela'
union all
select id, 'Atendente de Loja', 'atendente-de-loja',
  'Atendimento ao cliente, organização de pedidos e apoio à rotina comercial.',
  'Atuar no atendimento aos clientes da Karolícias, apoiar pedidos, manter a organização do espaço e contribuir para uma experiência acolhedora.',
  'Atender clientes; organizar pedidos; apoiar exposição de produtos; manter o padrão de atendimento.',
  'Boa comunicação, organização, disponibilidade de horário e interesse pelo segmento de alimentos.',
  'Vale-transporte; alimentação no local; treinamento interno.',
  'R$ 1.500 a R$ 1.900', 'São Luís', 'MA', 'presencial'::public.job_modality, 'clt'::public.job_contract_type, 'Operacional', 'open'::public.job_status, true
from c where slug = 'karolicias'
union all
select id, 'Recepcionista', 'recepcionista',
  'Recepção de clientes, organização de agenda e suporte à rotina de atendimento.',
  'Recepcionar clientes do Darma Center, organizar agenda, registrar informações e apoiar o fluxo de atendimento.',
  'Recepcionar clientes; organizar agenda; confirmar horários; apoiar rotinas administrativas.',
  'Ensino médio completo; boa comunicação; experiência com recepção será diferencial.',
  'Vale-transporte; bonificação; treinamento interno.',
  'R$ 1.600 a R$ 2.000', 'São Luís', 'MA', 'presencial'::public.job_modality, 'clt'::public.job_contract_type, 'Operacional', 'open'::public.job_status, false
from c where slug = 'darma-center'
on conflict (company_id, slug) do nothing;

insert into public.site_contents (key, title, subtitle, body, button_label, button_url)
values
  (
    'home_hero',
    'Encontre oportunidades em empresas que contratam com mais critério.',
    'A Redde People conecta candidatos a empresas parceiras com processos de seleção mais claros, organizados e profissionais.',
    'Veja vagas abertas em empresas parceiras da Redde People e envie seu currículo de forma simples, rápida e segura.',
    'Buscar vagas',
    '/vagas'
  ),
  (
    'home_companies_section',
    'Empresas parceiras estão contratando agora',
    'Conheça empresas que estruturam seus processos seletivos com a Redde People.',
    null,
    'Ver mais empresas',
    '/empresas'
  ),
  (
    'home_jobs_section',
    'Vagas abertas recentemente',
    'Veja as últimas oportunidades publicadas por empresas parceiras.',
    null,
    'Ver todas as vagas',
    '/vagas'
  ),
  (
    'home_company_cta',
    'Sua empresa quer contratar com mais critério?',
    'A Redde People estrutura processos de contratação para reduzir improviso, rotatividade e decisões baseadas apenas em currículo.',
    null,
    'Falar com a Redde People',
    'mailto:contato@reddepeople.com.br'
  ),
  (
    'footer_about',
    'Redde People Jobs',
    'Portal de oportunidades em empresas parceiras.',
    null,
    null,
    null
  )
on conflict (key) do nothing;
