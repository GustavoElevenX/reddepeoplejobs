alter table public.jobs
  add column if not exists education_level text,
  add column if not exists work_schedule text,
  add column if not exists about_company text;
