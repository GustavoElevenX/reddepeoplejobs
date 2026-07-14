-- Atualiza os dados persistidos para a identidade Recruitfy.
alter table public.applications
  add column if not exists resume_analysis_token text;

update public.applications
set resume_analysis_token = encode(extensions.gen_random_bytes(24), 'hex')
where resume_analysis_token is null
  and resume_analysis_status = 'pending';

alter table public.applications
  alter column resume_analysis_token set default encode(extensions.gen_random_bytes(24), 'hex');

create unique index if not exists applications_resume_analysis_token_key
  on public.applications(resume_analysis_token)
  where resume_analysis_token is not null;

create or replace function pg_temp.recruitfy_rebrand(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(
            replace(coalesce(value, ''), 'Redde People Jobs', 'Recruitfy'),
            'Redde People', 'Recruitfy'
          ),
          'People Jobs', 'Recruitfy'
        ),
        'reddepeoplejobs.com.br', 'recruitfy.com.br'
      ),
      'reddepeople.com.br', 'recruitfy.com.br'
    ),
    'peoplejobs.com.br', 'recruitfy.com.br'
  );
$$;

update public.site_contents
set title = nullif(pg_temp.recruitfy_rebrand(title), ''),
    subtitle = nullif(pg_temp.recruitfy_rebrand(subtitle), ''),
    body = nullif(pg_temp.recruitfy_rebrand(body), ''),
    button_label = nullif(pg_temp.recruitfy_rebrand(button_label), ''),
    button_url = nullif(pg_temp.recruitfy_rebrand(button_url), ''),
    updated_at = now()
where concat_ws(' ', title, subtitle, body, button_label, button_url)
  ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.franchises
set name = pg_temp.recruitfy_rebrand(name),
    legal_name = nullif(pg_temp.recruitfy_rebrand(legal_name), ''),
    contact_email = nullif(pg_temp.recruitfy_rebrand(contact_email), ''),
    updated_at = now()
where concat_ws(' ', name, legal_name, contact_email)
  ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.companies
set name = pg_temp.recruitfy_rebrand(name),
    legal_name = nullif(pg_temp.recruitfy_rebrand(legal_name), ''),
    short_description = nullif(pg_temp.recruitfy_rebrand(short_description), ''),
    about_text = nullif(pg_temp.recruitfy_rebrand(about_text), ''),
    why_work_here = nullif(pg_temp.recruitfy_rebrand(why_work_here), ''),
    culture_text = nullif(pg_temp.recruitfy_rebrand(culture_text), ''),
    website_url = nullif(pg_temp.recruitfy_rebrand(website_url), ''),
    updated_at = now()
where concat_ws(' ', name, legal_name, short_description, about_text, why_work_here, culture_text, website_url)
  ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.jobs
set title = pg_temp.recruitfy_rebrand(title),
    short_description = nullif(pg_temp.recruitfy_rebrand(short_description), ''),
    description = pg_temp.recruitfy_rebrand(description),
    about_job = nullif(pg_temp.recruitfy_rebrand(about_job), ''),
    responsibilities = nullif(pg_temp.recruitfy_rebrand(responsibilities), ''),
    requirements = nullif(pg_temp.recruitfy_rebrand(requirements), ''),
    desirable_requirements = nullif(pg_temp.recruitfy_rebrand(desirable_requirements), ''),
    benefits = nullif(pg_temp.recruitfy_rebrand(benefits), ''),
    about_company = nullif(pg_temp.recruitfy_rebrand(about_company), ''),
    seo_title = nullif(pg_temp.recruitfy_rebrand(seo_title), ''),
    seo_description = nullif(pg_temp.recruitfy_rebrand(seo_description), ''),
    external_apply_url = nullif(pg_temp.recruitfy_rebrand(external_apply_url), ''),
    updated_at = now()
where concat_ws(' ', title, short_description, description, about_job, responsibilities, requirements,
  desirable_requirements, benefits, about_company, seo_title, seo_description, external_apply_url)
  ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.profiles
set full_name = pg_temp.recruitfy_rebrand(full_name),
    updated_at = now()
where full_name ~* '(redde people|people jobs)';

update public.job_briefings
set payload = pg_temp.recruitfy_rebrand(payload::text)::jsonb,
    updated_at = now()
where payload::text ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.job_descriptions
set content = pg_temp.recruitfy_rebrand(content::text)::jsonb,
    updated_at = now()
where content::text ~* '(redde people|people jobs|reddepeople|peoplejobs)';

update public.email_logs
set subject = pg_temp.recruitfy_rebrand(subject),
    payload = pg_temp.recruitfy_rebrand(payload::text)::jsonb
where concat_ws(' ', subject, payload::text)
  ~* '(redde people|people jobs|reddepeople|peoplejobs)';
