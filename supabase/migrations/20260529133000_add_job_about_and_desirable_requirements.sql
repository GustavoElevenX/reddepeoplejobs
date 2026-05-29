alter table public.jobs
  add column if not exists about_job text,
  add column if not exists desirable_requirements text;
