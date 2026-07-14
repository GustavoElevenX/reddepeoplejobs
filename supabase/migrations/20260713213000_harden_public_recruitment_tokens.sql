-- Compatibilidade de processos anteriores e redução de dados nos links públicos.

update public.projects p
set client_decision_status = 'finalized',
    client_decision_finalized_at = coalesce(p.client_decision_finalized_at, decisions.finalized_at),
    nps_released_at = case when decisions.has_approved then coalesce(p.nps_released_at, decisions.finalized_at) else p.nps_released_at end,
    process_completed_at = case when decisions.has_approved then coalesce(p.process_completed_at, decisions.finalized_at) else p.process_completed_at end
from (
  select d.project_id, max(coalesce(d.finalized_at, d.updated_at)) as finalized_at,
    bool_or(d.decision = 'approved' and d.is_final) as has_approved
  from public.hiring_decisions d
  where d.is_final
  group by d.project_id
) decisions
where decisions.project_id = p.id
  and p.stage in ('candidate_approved', 'post_sale', 'completed');

create or replace function public.get_candidate_confirmation(access_token text)
returns table (schedule jsonb, application jsonb, project jsonb, company jsonb)
language sql
security definer
set search_path = public
as $$
  select
    jsonb_build_object(
      'id', s.id, 'project_id', s.project_id, 'application_id', s.application_id,
      'date', s.date, 'time', s.time, 'duration_minutes', s.duration_minutes,
      'format', s.format, 'location_or_link', s.location_or_link, 'notes', s.notes,
      'candidate_confirmed_at', s.candidate_confirmed_at
    ),
    jsonb_build_object('id', a.id, 'candidate_name', a.candidate_name),
    jsonb_build_object('id', p.id, 'title', p.title),
    jsonb_build_object('id', c.id, 'name', c.name)
  from public.client_interview_schedules s
  join public.applications a on a.id = s.application_id
  join public.projects p on p.id = s.project_id
  join public.companies c on c.id = p.client_id
  where s.candidate_confirmation_token = access_token
  limit 1;
$$;

create or replace function public.schedule_client_interview(access_token text, finalist_uuid uuid, schedule_payload jsonb)
returns public.client_interview_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  current_finalist public.finalists;
  saved_row public.client_interview_schedules;
begin
  select * into current_project from public.projects where client_access_token = access_token limit 1;
  if current_project.id is null then raise exception 'Projeto não encontrado.'; end if;
  if current_project.client_decision_status = 'finalized' then raise exception 'A etapa de decisão já foi finalizada.'; end if;
  select * into current_finalist from public.finalists
  where id = finalist_uuid and project_id = current_project.id
    and status in ('released_to_client', 'interview_scheduled', 'client_decided')
    and ai_report_status = 'approved' limit 1;
  if current_finalist.id is null then raise exception 'Finalista não encontrado ou não liberado.'; end if;
  if coalesce(schedule_payload->>'date', '') = '' or coalesce(schedule_payload->>'time', '') = '' then
    raise exception 'Informe data e horário.';
  end if;
  if exists (select 1 from public.client_interview_schedules s
    where s.project_id = current_project.id and s.date = (schedule_payload->>'date')::date
      and s.time = (schedule_payload->>'time')::time and s.finalist_id <> current_finalist.id) then
    raise exception 'Já existe entrevista neste horário para o projeto.';
  end if;
  insert into public.client_interview_schedules (
    franchise_id, project_id, finalist_id, application_id, date, time, duration_minutes,
    format, location_or_link, notes
  ) values (
    current_finalist.franchise_id, current_finalist.project_id, current_finalist.id, current_finalist.application_id,
    (schedule_payload->>'date')::date, (schedule_payload->>'time')::time,
    coalesce((schedule_payload->>'duration_minutes')::integer, 45), coalesce(schedule_payload->>'format', 'online'),
    coalesce(schedule_payload->>'location_or_link', ''), coalesce(schedule_payload->>'notes', '')
  ) returning * into saved_row;
  update public.finalists set status = 'interview_scheduled', updated_at = now() where id = current_finalist.id;
  update public.projects set stage = 'client_interviews', next_step = 'Aguardar confirmação do candidato', updated_at = now()
  where id = current_project.id;
  return saved_row;
end;
$$;

grant execute on function public.get_candidate_confirmation(text) to anon, authenticated;
grant execute on function public.schedule_client_interview(text, uuid, jsonb) to anon, authenticated;
