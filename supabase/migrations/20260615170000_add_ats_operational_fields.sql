alter table public.jobs
  add column if not exists billing_amount numeric(12, 2),
  add column if not exists billing_type text not null default 'fixed',
  add column if not exists billing_status text not null default 'not_started',
  add column if not exists billing_due_date date,
  add column if not exists finance_responsible text,
  add column if not exists franchise_commission numeric(5, 2);

alter table public.jobs
  drop constraint if exists jobs_billing_amount_check,
  drop constraint if exists jobs_billing_type_check,
  drop constraint if exists jobs_billing_status_check,
  drop constraint if exists jobs_franchise_commission_check;

alter table public.jobs
  add constraint jobs_billing_amount_check
    check (billing_amount is null or billing_amount >= 0),
  add constraint jobs_billing_type_check
    check (billing_type in ('fixed', 'success_fee', 'monthly', 'other')),
  add constraint jobs_billing_status_check
    check (billing_status in ('not_started', 'pending', 'invoiced', 'paid', 'overdue', 'cancelled')),
  add constraint jobs_franchise_commission_check
    check (franchise_commission is null or franchise_commission between 0 and 100);

alter table public.applications
  add column if not exists interview_scheduled_at timestamptz,
  add column if not exists recruiter_opinion text,
  add column if not exists professional_summary text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists education jsonb not null default '[]'::jsonb,
  add column if not exists experiences jsonb not null default '[]'::jsonb;

alter table public.applications
  drop constraint if exists applications_education_array_check,
  drop constraint if exists applications_experiences_array_check;

alter table public.applications
  add constraint applications_education_array_check
    check (jsonb_typeof(education) = 'array'),
  add constraint applications_experiences_array_check
    check (jsonb_typeof(experiences) = 'array');

create index if not exists applications_interview_schedule_idx
  on public.applications(interview_scheduled_at)
  where interview_scheduled_at is not null;

drop policy if exists "Admins can insert applications" on public.applications;
create policy "Admins can insert applications"
on public.applications for insert
with check (public.is_redde_admin());

drop policy if exists "Franchisees can insert own applications" on public.applications;
create policy "Franchisees can insert own applications"
on public.applications for insert
with check (franchise_id = public.current_user_franchise_id());

drop policy if exists "Company managers can insert own applications" on public.applications;
create policy "Company managers can insert own applications"
on public.applications for insert
with check (
  exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
      and cua.company_id = applications.company_id
      and cua.can_manage_jobs = true
  )
);

drop policy if exists "Company users can update own applications" on public.applications;
create policy "Company managers can update own applications"
on public.applications for update
using (
  exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
      and cua.company_id = applications.company_id
      and cua.can_manage_jobs = true
  )
)
with check (
  exists (
    select 1
    from public.company_user_access cua
    where cua.user_id = auth.uid()
      and cua.company_id = applications.company_id
      and cua.can_manage_jobs = true
  )
);
