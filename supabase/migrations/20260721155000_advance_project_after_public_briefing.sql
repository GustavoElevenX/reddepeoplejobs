create or replace function public.save_public_briefing(access_token text, next_payload jsonb)
returns public.job_briefings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.job_briefings;
begin
  update public.job_briefings
  set
    payload = next_payload,
    status = 'filled',
    filled_by = 'client',
    filled_at = now(),
    updated_at = now()
  where secure_token = access_token
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Briefing não encontrado ou link inválido.';
  end if;

  update public.projects
  set
    stage = 'briefing_received',
    next_step = 'Publicar vaga',
    updated_at = now()
  where id = updated_row.project_id;

  return updated_row;
end;
$$;

update public.projects as project
set
  stage = 'briefing_received',
  next_step = 'Publicar vaga',
  updated_at = now()
from public.job_briefings as briefing
where briefing.project_id = project.id
  and briefing.status in ('filled', 'approved')
  and project.job_id is null
  and project.stage = 'briefing_pending';
