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

alter table public.jobs drop constraint if exists jobs_billing_amount_check;
alter table public.jobs
  add constraint jobs_billing_amount_check
    check (billing_amount is null or billing_amount >= 0),
  add constraint jobs_billing_type_check
    check (billing_type in ('fixed', 'success_fee', 'monthly', 'other')),
  add constraint jobs_billing_status_check
    check (billing_status in ('not_started', 'pending', 'invoiced', 'paid', 'overdue', 'cancelled')),
  add constraint jobs_franchise_commission_check
    check (franchise_commission is null or franchise_commission between 0 and 100);

notify pgrst, 'reload schema';
