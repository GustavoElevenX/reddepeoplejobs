create or replace function public.is_active_franchise(target_franchise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.franchises f
    where f.id = target_franchise_id
      and f.status = 'active'
  );
$$;

revoke all on function public.is_active_franchise(uuid) from public;
grant execute on function public.is_active_franchise(uuid) to anon, authenticated;

drop policy if exists "Public can read published companies" on public.companies;
create policy "Public can read published companies"
on public.companies for select
using (
  page_status = 'published'
  and public.is_active_franchise(franchise_id)
);

drop policy if exists "Public can read open jobs from published companies" on public.jobs;
create policy "Public can read open jobs from published companies"
on public.jobs for select
using (
  status = 'open'
  and public.is_active_franchise(franchise_id)
  and exists (
    select 1
    from public.companies c
    where c.id = jobs.company_id
      and c.page_status = 'published'
  )
);

drop policy if exists "Public can insert applications" on public.applications;
create policy "Public can insert applications"
on public.applications for insert
with check (
  lgpd_consent = true
  and public.is_active_franchise(franchise_id)
  and exists (
    select 1
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = applications.job_id
      and j.company_id = applications.company_id
      and j.status = 'open'
      and c.page_status = 'published'
  )
);
