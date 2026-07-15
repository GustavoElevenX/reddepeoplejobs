alter table public.jobs
  add column if not exists published_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists distribution_google_enabled boolean not null default true,
  add column if not exists distribution_indeed_enabled boolean not null default false,
  add column if not exists distribution_glassdoor_enabled boolean not null default false,
  add column if not exists distribution_infojobs_enabled boolean not null default false,
  add column if not exists external_apply_url text,
  add column if not exists direct_apply boolean not null default true,
  add column if not exists country text default 'BR',
  add column if not exists street_address text,
  add column if not exists postal_code text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text default 'BRL',
  add column if not exists salary_unit text default 'MONTH',
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.companies
  add column if not exists legal_name text,
  add column if not exists same_as_url text;

alter table public.jobs
  drop constraint if exists jobs_salary_range_check;

alter table public.jobs drop constraint if exists jobs_salary_range_check;
alter table public.jobs
  add constraint jobs_salary_range_check
  check (salary_min is null or salary_max is null or salary_min <= salary_max);

create or replace function public.prepare_open_job()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'open' then
    new.published_at = coalesce(new.published_at, now());
    new.expires_at = coalesce(
      new.expires_at,
      case
        when new.application_deadline is not null
          then (new.application_deadline::timestamp + interval '23 hours 59 minutes 59 seconds')
            at time zone 'America/Sao_Paulo'
        else new.published_at + interval '30 days'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_open_job_before_write on public.jobs;
create trigger prepare_open_job_before_write
before insert or update on public.jobs
for each row execute function public.prepare_open_job();

update public.jobs
set
  published_at = coalesce(published_at, created_at),
  expires_at = coalesce(
    expires_at,
    case
      when application_deadline is not null
        then (application_deadline::timestamp + interval '23 hours 59 minutes 59 seconds')
          at time zone 'America/Sao_Paulo'
      else coalesce(published_at, created_at) + interval '30 days'
    end
  )
where status = 'open';

create table if not exists public.job_distribution_channels (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  channel text not null check (channel in ('google_jobs', 'indeed', 'glassdoor', 'infojobs')),
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'published', 'failed', 'removed', 'manual_required')),
  external_url text,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, channel)
);

create index if not exists job_distribution_channels_job_idx
on public.job_distribution_channels(job_id, channel);

drop trigger if exists set_job_distribution_channels_updated_at on public.job_distribution_channels;
create trigger set_job_distribution_channels_updated_at
before update on public.job_distribution_channels
for each row execute function public.set_updated_at();

alter table public.job_distribution_channels enable row level security;

drop policy if exists "People Jobs admins can manage job distribution" on public.job_distribution_channels;
create policy "People Jobs admins can manage job distribution"
on public.job_distribution_channels for all
using (public.is_redde_admin())
with check (public.is_redde_admin());

drop policy if exists "Company users can read own job distribution" on public.job_distribution_channels;
create policy "Company users can read own job distribution"
on public.job_distribution_channels for select
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_distribution_channels.job_id
      and public.has_company_access(j.company_id)
  )
);

drop policy if exists "Company users can manage own job distribution" on public.job_distribution_channels;
create policy "Company users can manage own job distribution"
on public.job_distribution_channels for all
using (
  exists (
    select 1
    from public.jobs j
    join public.company_user_access cua on cua.company_id = j.company_id
    where j.id = job_distribution_channels.job_id
      and cua.user_id = auth.uid()
      and cua.can_manage_jobs = true
  )
)
with check (
  exists (
    select 1
    from public.jobs j
    join public.company_user_access cua on cua.company_id = j.company_id
    where j.id = job_distribution_channels.job_id
      and cua.user_id = auth.uid()
      and cua.can_manage_jobs = true
  )
);
