alter type public.app_role add value if not exists 'admin_master';
alter type public.app_role add value if not exists 'franqueado';
alter type public.app_role add value if not exists 'empresa_cliente';
alter type public.app_role add value if not exists 'candidato';

alter type public.application_status add value if not exists 'triagem';
alter type public.application_status add value if not exists 'teste';
alter type public.application_status add value if not exists 'encaminhado_cliente';
alter type public.application_status add value if not exists 'aprovado';
alter type public.application_status add value if not exists 'banco_talentos';

create table if not exists public.franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  document text,
  contact_name text,
  contact_email text,
  contact_phone text,
  city text,
  state text default 'MA',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists franchise_id uuid references public.franchises(id) on delete set null;

alter table public.companies
  add column if not exists franchise_id uuid references public.franchises(id) on delete restrict,
  add column if not exists commercial_status text not null default 'active_client'
    check (commercial_status in ('lead', 'negotiation', 'active_client', 'inactive_client'));

alter table public.jobs
  add column if not exists franchise_id uuid references public.franchises(id) on delete restrict;

alter table public.applications
  add column if not exists franchise_id uuid references public.franchises(id) on delete restrict;

insert into public.franchises (
  name,
  slug,
  legal_name,
  city,
  state,
  status
)
select
  'Unidade Matriz',
  'unidade-matriz',
  'Redde People Jobs',
  'São Luís',
  'MA',
  'active'
where exists (select 1 from public.companies)
on conflict (slug) do nothing;

update public.companies
set franchise_id = (
  select id from public.franchises where slug = 'unidade-matriz' limit 1
)
where franchise_id is null;

update public.jobs j
set franchise_id = c.franchise_id
from public.companies c
where c.id = j.company_id
  and j.franchise_id is null;

update public.applications a
set franchise_id = j.franchise_id
from public.jobs j
where j.id = a.job_id
  and a.franchise_id is null;

create index if not exists profiles_franchise_idx on public.profiles(franchise_id);
create index if not exists companies_franchise_idx on public.companies(franchise_id);
create index if not exists jobs_franchise_status_idx on public.jobs(franchise_id, status);
create index if not exists applications_franchise_status_idx on public.applications(franchise_id, status);

drop trigger if exists set_franchises_updated_at on public.franchises;
create trigger set_franchises_updated_at
before update on public.franchises
for each row execute function public.set_updated_at();

create or replace function public.is_admin_master()
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
      and role::text in ('admin_master', 'redde_super_admin', 'redde_admin')
  );
$$;

create or replace function public.is_redde_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin_master();
$$;

create or replace function public.current_user_franchise_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select p.franchise_id
  from public.profiles p
  join public.franchises f on f.id = p.franchise_id
  where p.id = auth.uid()
    and p.is_active = true
    and p.role::text = 'franqueado'
    and f.status = 'active'
  limit 1;
$$;

create or replace function public.can_download_company_resumes(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_admin_master()
    or exists (
      select 1
      from public.companies c
      where c.id = target_company_id
        and c.franchise_id = public.current_user_franchise_id()
    )
    or exists (
      select 1
      from public.company_user_access cua
      join public.profiles p on p.id = cua.user_id
      where cua.user_id = auth.uid()
        and cua.company_id = target_company_id
        and cua.can_download_resumes = true
        and p.is_active = true
    );
$$;

create or replace function public.sync_job_franchise()
returns trigger
language plpgsql
as $$
begin
  select franchise_id into new.franchise_id
  from public.companies
  where id = new.company_id;
  return new;
end;
$$;

drop trigger if exists sync_job_franchise_before_write on public.jobs;
create trigger sync_job_franchise_before_write
before insert or update of company_id on public.jobs
for each row execute function public.sync_job_franchise();

create or replace function public.sync_application_franchise()
returns trigger
language plpgsql
as $$
begin
  select franchise_id into new.franchise_id
  from public.jobs
  where id = new.job_id;
  return new;
end;
$$;

drop trigger if exists sync_application_franchise_before_write on public.applications;
create trigger sync_application_franchise_before_write
before insert or update of job_id on public.applications
for each row execute function public.sync_application_franchise();

create or replace function public.cascade_company_franchise()
returns trigger
language plpgsql
as $$
begin
  update public.jobs
  set franchise_id = new.franchise_id
  where company_id = new.id;

  update public.applications
  set franchise_id = new.franchise_id
  where company_id = new.id;

  return new;
end;
$$;

drop trigger if exists cascade_company_franchise_after_update on public.companies;
create trigger cascade_company_franchise_after_update
after update of franchise_id on public.companies
for each row
when (old.franchise_id is distinct from new.franchise_id)
execute function public.cascade_company_franchise();

create or replace function public.cascade_job_scope()
returns trigger
language plpgsql
as $$
begin
  update public.applications
  set
    company_id = new.company_id,
    franchise_id = new.franchise_id
  where job_id = new.id;

  return new;
end;
$$;

drop trigger if exists cascade_job_scope_after_update on public.jobs;
create trigger cascade_job_scope_after_update
after update of company_id, franchise_id on public.jobs
for each row
when (
  old.company_id is distinct from new.company_id
  or old.franchise_id is distinct from new.franchise_id
)
execute function public.cascade_job_scope();

alter table public.franchises enable row level security;

drop policy if exists "Public can read published companies" on public.companies;
drop policy if exists "Public can read published companies" on public.companies;
create policy "Public can read published companies"
on public.companies for select
using (
  page_status = 'published'
  and exists (
    select 1
    from public.franchises f
    where f.id = companies.franchise_id
      and f.status = 'active'
  )
);

drop policy if exists "Public can read open jobs from published companies" on public.jobs;
drop policy if exists "Public can read open jobs from published companies" on public.jobs;
create policy "Public can read open jobs from published companies"
on public.jobs for select
using (
  status = 'open'
  and exists (
    select 1
    from public.companies c
    join public.franchises f on f.id = c.franchise_id
    where c.id = jobs.company_id
      and c.page_status = 'published'
      and f.status = 'active'
  )
);

drop policy if exists "Public can insert applications" on public.applications;
drop policy if exists "Public can insert applications" on public.applications;
create policy "Public can insert applications"
on public.applications for insert
with check (
  lgpd_consent = true
  and exists (
    select 1
    from public.jobs j
    join public.companies c on c.id = j.company_id
    join public.franchises f on f.id = c.franchise_id
    where j.id = applications.job_id
      and j.company_id = applications.company_id
      and j.status = 'open'
      and c.page_status = 'published'
      and f.status = 'active'
  )
);

drop policy if exists "Company admins can update their own company when allowed" on public.companies;
drop policy if exists "Company admins can update their own company when allowed" on public.companies;
create policy "Company admins can update their own company when allowed"
on public.companies for update
using (
  exists (
    select 1
    from public.company_user_access cua
    join public.profiles p on p.id = cua.user_id
    where cua.user_id = auth.uid()
      and cua.company_id = companies.id
      and p.role::text in ('empresa_cliente', 'company_admin', 'company_recruiter')
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
      and p.role::text in ('empresa_cliente', 'company_admin', 'company_recruiter')
      and cua.can_edit_company_page = true
      and p.is_active = true
  )
);

drop policy if exists "Company users can manage own company assets" on storage.objects;
drop policy if exists "Company users can manage own company assets" on storage.objects;
create policy "Company users can manage own company assets"
on storage.objects for all
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.company_user_access cua
    join public.companies c on c.id = cua.company_id
    join public.profiles p on p.id = cua.user_id
    where p.id = auth.uid()
      and p.is_active
      and p.role::text in ('empresa_cliente', 'company_admin', 'company_recruiter')
      and cua.can_edit_company_page = true
      and c.id::text = (storage.foldername(name))[1]
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
)
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.company_user_access cua
    join public.companies c on c.id = cua.company_id
    join public.profiles p on p.id = cua.user_id
    where p.id = auth.uid()
      and p.is_active
      and p.role::text in ('empresa_cliente', 'company_admin', 'company_recruiter')
      and cua.can_edit_company_page = true
      and c.id::text = (storage.foldername(name))[1]
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
);

drop policy if exists "Admin master can manage franchises" on public.franchises;
create policy "Admin master can manage franchises"
on public.franchises for all
using (public.is_admin_master())
with check (public.is_admin_master());

drop policy if exists "Franchisees can read own franchise" on public.franchises;
create policy "Franchisees can read own franchise"
on public.franchises for select
using (id = public.current_user_franchise_id());

drop policy if exists "Franchisees can manage own companies" on public.companies;
create policy "Franchisees can manage own companies"
on public.companies for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Franchisees can manage own jobs" on public.jobs;
create policy "Franchisees can manage own jobs"
on public.jobs for all
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Franchisees can read own applications" on public.applications;
create policy "Franchisees can read own applications"
on public.applications for select
using (franchise_id = public.current_user_franchise_id());

drop policy if exists "Franchisees can update own applications" on public.applications;
create policy "Franchisees can update own applications"
on public.applications for update
using (franchise_id = public.current_user_franchise_id())
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Franchisees can read own distribution" on public.job_distribution_channels;
create policy "Franchisees can read own distribution"
on public.job_distribution_channels for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_distribution_channels.job_id
      and j.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Franchisees can manage own distribution" on public.job_distribution_channels;
create policy "Franchisees can manage own distribution"
on public.job_distribution_channels for all
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_distribution_channels.job_id
      and j.franchise_id = public.current_user_franchise_id()
  )
)
with check (
  exists (
    select 1
    from public.jobs j
    where j.id = job_distribution_channels.job_id
      and j.franchise_id = public.current_user_franchise_id()
  )
);

drop policy if exists "Franchisees can manage own company assets" on storage.objects;
create policy "Franchisees can manage own company assets"
on storage.objects for all
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.franchise_id = public.current_user_franchise_id()
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
)
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.companies c
    where c.id::text = (storage.foldername(name))[1]
      and c.franchise_id = public.current_user_franchise_id()
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
);
