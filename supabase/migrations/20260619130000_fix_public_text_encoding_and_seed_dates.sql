create or replace function public.fix_latin1_mojibake(value text)
returns text
language plpgsql
immutable
as $$
begin
  if value is null or value !~ '[ÃÂ]' then
    return value;
  end if;

  begin
    return convert_from(convert_to(value, 'LATIN1'), 'UTF8');
  exception when others then
    return value;
  end;
end;
$$;

update public.companies
set
  name = public.fix_latin1_mojibake(name),
  segment = public.fix_latin1_mojibake(segment),
  city = public.fix_latin1_mojibake(city),
  state = public.fix_latin1_mojibake(state),
  employees_range = public.fix_latin1_mojibake(employees_range),
  short_description = public.fix_latin1_mojibake(short_description),
  about_text = public.fix_latin1_mojibake(about_text),
  why_work_here = public.fix_latin1_mojibake(why_work_here),
  culture_text = public.fix_latin1_mojibake(culture_text)
where concat_ws(
  ' ',
  name,
  segment,
  city,
  state,
  employees_range,
  short_description,
  about_text,
  why_work_here,
  culture_text
) ~ '[ÃÂ]';

update public.jobs
set
  title = public.fix_latin1_mojibake(title),
  short_description = public.fix_latin1_mojibake(short_description),
  description = public.fix_latin1_mojibake(description),
  responsibilities = public.fix_latin1_mojibake(responsibilities),
  requirements = public.fix_latin1_mojibake(requirements),
  desirable_requirements = public.fix_latin1_mojibake(desirable_requirements),
  benefits = public.fix_latin1_mojibake(benefits),
  salary_range = public.fix_latin1_mojibake(salary_range),
  city = public.fix_latin1_mojibake(city),
  state = public.fix_latin1_mojibake(state),
  seniority = public.fix_latin1_mojibake(seniority),
  education_level = public.fix_latin1_mojibake(education_level),
  work_schedule = public.fix_latin1_mojibake(work_schedule),
  about_company = public.fix_latin1_mojibake(about_company),
  neighborhood = public.fix_latin1_mojibake(neighborhood),
  about_job = public.fix_latin1_mojibake(about_job),
  seo_title = public.fix_latin1_mojibake(seo_title),
  seo_description = public.fix_latin1_mojibake(seo_description),
  responsible_name = public.fix_latin1_mojibake(responsible_name),
  internal_notes = public.fix_latin1_mojibake(internal_notes),
  finance_responsible = public.fix_latin1_mojibake(finance_responsible)
where concat_ws(
  ' ',
  title,
  short_description,
  description,
  responsibilities,
  requirements,
  desirable_requirements,
  benefits,
  salary_range,
  city,
  state,
  seniority,
  education_level,
  work_schedule,
  about_company,
  neighborhood,
  about_job,
  seo_title,
  seo_description,
  responsible_name,
  internal_notes,
  finance_responsible
) ~ '[ÃÂ]';

update public.site_contents
set
  title = public.fix_latin1_mojibake(title),
  subtitle = public.fix_latin1_mojibake(subtitle),
  body = public.fix_latin1_mojibake(body),
  button_label = public.fix_latin1_mojibake(button_label),
  button_url = public.fix_latin1_mojibake(button_url)
where concat_ws(' ', title, subtitle, body, button_label, button_url) ~ '[ÃÂ]';

update public.franchises
set
  name = public.fix_latin1_mojibake(name),
  legal_name = public.fix_latin1_mojibake(legal_name),
  contact_name = public.fix_latin1_mojibake(contact_name),
  city = public.fix_latin1_mojibake(city),
  state = public.fix_latin1_mojibake(state)
where concat_ws(' ', name, legal_name, contact_name, city, state) ~ '[ÃÂ]';

with seed_jobs as (
  select j.id
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where (c.slug, j.slug) in (
    ('aba-kids', 'assistente-de-atendimento-infantil'),
    ('aquarela', 'assistente-administrativo'),
    ('karolicias', 'atendente-de-loja'),
    ('farma-center', 'recepcionista')
  )
)
update public.jobs
set
  created_at = case
    when created_at > now() - interval '2 days' then now() - interval '21 days'
    else created_at
  end,
  published_at = case
    when coalesce(published_at, created_at) > now() - interval '2 days' then now() - interval '21 days'
    else coalesce(published_at, created_at)
  end,
  updated_at = now()
where id in (select id from seed_jobs);

drop function public.fix_latin1_mojibake(text);
