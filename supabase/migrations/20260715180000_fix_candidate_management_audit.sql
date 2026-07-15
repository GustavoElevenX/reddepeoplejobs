-- Correcoes de seguranca e consistencia identificadas na auditoria do fluxo de candidatos.

alter table public.application_notes
  add column if not exists visibility text not null default 'internal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'application_notes_visibility_check'
  ) then
    alter table public.application_notes
      add constraint application_notes_visibility_check
      check (visibility in ('internal', 'shared')) not valid;
  end if;
end $$;

update public.application_notes
set visibility = 'internal'
where visibility is null or visibility not in ('internal', 'shared');

alter table public.application_notes
  validate constraint application_notes_visibility_check;

drop policy if exists "Company users can read notes for own applications" on public.application_notes;
drop policy if exists "Company users can read shared notes for own applications" on public.application_notes;
create policy "Company users can read shared notes for own applications"
on public.application_notes for select
using (
  visibility = 'shared'
  and exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
      and public.has_company_access(a.company_id)
  )
);

drop policy if exists "Company users can insert notes for own applications" on public.application_notes;
drop policy if exists "Company users can insert shared notes for own applications" on public.application_notes;
create policy "Company users can insert shared notes for own applications"
on public.application_notes for insert
with check (
  visibility = 'shared'
  and created_by = auth.uid()
  and exists (
    select 1
    from public.applications a
    where a.id = application_notes.application_id
      and public.has_company_access(a.company_id)
  )
);

-- Vincula automaticamente apenas os casos inequivocos: um projeto sem vaga e uma vaga sem projeto.
with unlinked_projects as (
  select p.id, p.client_id, count(*) over (partition by p.client_id) as project_count
  from public.projects p
  where p.job_id is null and p.client_id is not null
),
unlinked_jobs as (
  select j.id, j.company_id, count(*) over (partition by j.company_id) as job_count
  from public.jobs j
  where not exists (select 1 from public.projects p where p.job_id = j.id)
)
update public.projects p
set job_id = j.id, updated_at = now()
from unlinked_projects up
join unlinked_jobs j on j.company_id = up.client_id
where p.id = up.id and up.project_count = 1 and j.job_count = 1;

create or replace function public.link_project_to_job(project_uuid uuid, job_uuid uuid)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project public.projects;
  target_job public.jobs;
begin
  if auth.uid() is null then raise exception 'Sessao expirada.'; end if;

  select * into target_project from public.projects where id = project_uuid for update;
  select * into target_job from public.jobs where id = job_uuid for update;
  if target_project.id is null or target_job.id is null then raise exception 'Projeto ou processo nao encontrado.'; end if;
  if target_project.client_id is distinct from target_job.company_id then
    raise exception 'O projeto e o processo precisam pertencer ao mesmo cliente.';
  end if;
  if target_project.franchise_id is distinct from target_job.franchise_id then
    raise exception 'O projeto e o processo precisam pertencer a mesma unidade.';
  end if;
  if not (
    public.is_admin_master()
    or target_job.franchise_id = public.current_user_franchise_id()
    or exists (
      select 1 from public.company_user_access cua
      where cua.user_id = auth.uid() and cua.company_id = target_job.company_id and cua.can_manage_jobs
    )
  ) then raise exception 'Sem permissao para vincular o projeto.'; end if;
  if target_project.job_id is not null and target_project.job_id <> job_uuid then
    raise exception 'Este projeto ja esta vinculado a outro processo.';
  end if;
  if exists (select 1 from public.projects p where p.job_id = job_uuid and p.id <> project_uuid) then
    raise exception 'Este processo ja possui outro projeto vinculado.';
  end if;

  update public.projects set job_id = job_uuid, updated_at = now()
  where id = project_uuid returning * into target_project;
  return target_project;
end $$;

create or replace function public.reorder_applications(application_positions jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  target_application public.applications;
  requested_order integer;
  affected integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessao expirada.'; end if;
  if jsonb_typeof(application_positions) <> 'array' then raise exception 'Posicoes invalidas.'; end if;
  if jsonb_array_length(application_positions) > 500 then raise exception 'Limite de reordenacao excedido.'; end if;

  for item in select * from jsonb_array_elements(application_positions) loop
    if not (item ? 'id') or not (item ? 'order') then raise exception 'Posicao incompleta.'; end if;
    begin
      requested_order := greatest((item->>'order')::integer, 0);
      select * into target_application
      from public.applications
      where id = (item->>'id')::uuid
      for update;
    exception when invalid_text_representation then
      raise exception 'Identificador ou ordem invalida na reordenacao.';
    end;

    if target_application.id is null then raise exception 'Candidatura invalida na reordenacao.'; end if;
    if not (
      public.is_admin_master()
      or target_application.franchise_id = public.current_user_franchise_id()
      or exists (
        select 1 from public.company_user_access cua
        where cua.user_id = auth.uid()
          and cua.company_id = target_application.company_id
          and cua.can_manage_jobs
      )
    ) then
      raise exception 'Sem permissao para reordenar candidatos.';
    end if;

    if target_application.kanban_order is distinct from requested_order then
      update public.applications
      set kanban_order = requested_order, updated_at = now()
      where id = target_application.id;

      insert into public.application_stage_history (
        application_id, from_stage, to_stage, moved_by, reason, metadata,
        from_order, to_order
      ) values (
        target_application.id, target_application.stage, target_application.stage, auth.uid(),
        'Reordenacao no kanban', jsonb_build_object('source', 'reorder_applications'),
        target_application.kanban_order, requested_order
      );
    end if;
    affected := affected + 1;
  end loop;
  return affected;
end $$;

grant execute on function public.reorder_applications(jsonb) to authenticated;
grant execute on function public.link_project_to_job(uuid, uuid) to authenticated;
