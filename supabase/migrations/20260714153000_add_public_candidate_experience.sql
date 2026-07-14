alter table public.applications
  add column if not exists tracking_token text;

update public.applications
set tracking_token = encode(extensions.gen_random_bytes(24), 'hex')
where tracking_token is null;

alter table public.applications
  alter column tracking_token set default encode(extensions.gen_random_bytes(24), 'hex'),
  alter column tracking_token set not null;

create unique index if not exists applications_tracking_token_key
  on public.applications(tracking_token);

create or replace function public.submit_public_application(application_payload jsonb)
returns table(application_id uuid, tracking_token text, resume_analysis_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_job public.jobs;
  created_application public.applications;
begin
  select j.* into current_job
  from public.jobs j
  join public.companies c on c.id = j.company_id and c.page_status = 'published'
  join public.franchises f on f.id = j.franchise_id and f.status = 'active'
  where j.id = (application_payload->>'job_id')::uuid
    and j.company_id = (application_payload->>'company_id')::uuid
    and j.status = 'open';

  if current_job.id is null then
    raise exception 'Esta vaga não está disponível para candidatura.';
  end if;
  if coalesce((application_payload->>'lgpd_consent')::boolean, false) is not true then
    raise exception 'O consentimento LGPD é obrigatório.';
  end if;

  insert into public.applications (
    franchise_id, job_id, company_id, candidate_name, candidate_email, candidate_phone,
    candidate_city, linkedin_url, portfolio_url, salary_expectation, availability,
    message, resume_file_path, lgpd_consent, source
  ) values (
    current_job.franchise_id,
    current_job.id,
    current_job.company_id,
    nullif(trim(application_payload->>'candidate_name'), ''),
    nullif(lower(trim(application_payload->>'candidate_email')), ''),
    nullif(trim(application_payload->>'candidate_phone'), ''),
    nullif(trim(application_payload->>'candidate_city'), ''),
    nullif(trim(application_payload->>'linkedin_url'), ''),
    nullif(trim(application_payload->>'portfolio_url'), ''),
    nullif(trim(application_payload->>'salary_expectation'), ''),
    nullif(trim(application_payload->>'availability'), ''),
    nullif(trim(application_payload->>'message'), ''),
    nullif(trim(application_payload->>'resume_file_path'), ''),
    true,
    coalesce(nullif(trim(application_payload->>'source'), ''), 'direct')
  ) returning * into created_application;

  if created_application.candidate_name is null
    or created_application.candidate_email is null
    or created_application.candidate_phone is null
    or created_application.resume_file_path is null then
    raise exception 'Dados obrigatórios da candidatura não foram informados.';
  end if;

  return query select created_application.id, created_application.tracking_token,
    created_application.resume_analysis_token;
end;
$$;

revoke all on function public.submit_public_application(jsonb) from public;
grant execute on function public.submit_public_application(jsonb) to anon, authenticated;

create or replace function public.get_public_application_tracking(access_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'candidate_first_name', split_part(a.candidate_name, ' ', 1),
    'job_title', j.title,
    'company_name', c.name,
    'company_slug', c.slug,
    'job_slug', j.slug,
    'stage', a.stage,
    'status', a.status,
    'submitted_at', a.created_at,
    'updated_at', a.updated_at,
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('stage', h.to_stage, 'created_at', h.created_at) order by h.created_at)
      from public.application_stage_history h
      where h.application_id = a.id
    ), '[]'::jsonb)
  )
  from public.applications a
  join public.jobs j on j.id = a.job_id
  join public.companies c on c.id = a.company_id
  where a.tracking_token = access_token
  limit 1;
$$;

revoke all on function public.get_public_application_tracking(text) from public;
grant execute on function public.get_public_application_tracking(text) to anon, authenticated;

create or replace function public.list_public_company_response_metrics()
returns table(
  company_id uuid,
  total_applications bigint,
  completed_applications bigint,
  response_rate integer,
  average_response_days integer,
  last_process_completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with application_metrics as (
    select
      a.company_id,
      count(*) as total_applications,
      count(*) filter (where a.status in ('reprovado', 'contratado', 'aprovado')) as completed_applications,
      round(
        100.0 * count(*) filter (where a.status in ('reprovado', 'contratado', 'aprovado'))
        / nullif(count(*), 0)
      )::integer as response_rate,
      round(avg(extract(epoch from (a.updated_at - a.created_at)) / 86400.0)
        filter (where a.status in ('reprovado', 'contratado', 'aprovado')))::integer as average_response_days
    from public.applications a
    join public.companies c on c.id = a.company_id and c.page_status = 'published'
    join public.franchises f on f.id = c.franchise_id and f.status = 'active'
    group by a.company_id
  ), process_metrics as (
    select j.company_id, max(j.updated_at) as last_process_completed_at
    from public.jobs j
    where j.process_status = 'completed' or j.status = 'closed'
    group by j.company_id
  )
  select am.company_id, am.total_applications, am.completed_applications, am.response_rate,
    am.average_response_days, pm.last_process_completed_at
  from application_metrics am
  left join process_metrics pm on pm.company_id = am.company_id
  where am.completed_applications > 0;
$$;

revoke all on function public.list_public_company_response_metrics() from public;
grant execute on function public.list_public_company_response_metrics() to anon, authenticated;
