create or replace function public.fix_latin1_mojibake(value text)
returns text
language plpgsql
immutable
as $$
begin
  if value is null or (position(chr(195) in value) = 0 and position(chr(194) in value) = 0) then
    return value;
  end if;

  begin
    return convert_from(convert_to(value, 'LATIN1'), 'UTF8');
  exception when others then
    return value;
  end;
end;
$$;

do $$
declare
  target_column text;
begin
  if to_regclass('public.companies') is not null then
    foreach target_column in array array[
      'name',
      'segment',
      'city',
      'state',
      'employees_range',
      'short_description',
      'about_text',
      'why_work_here',
      'culture_text'
    ]
    loop
      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'companies'
          and c.column_name = target_column
          and c.data_type in ('text', 'character varying')
      ) then
        execute format(
          'update public.companies set %1$I = public.fix_latin1_mojibake(%1$I) where %1$I is not null and (position(chr(195) in %1$I) > 0 or position(chr(194) in %1$I) > 0)',
          target_column
        );
      end if;
    end loop;
  end if;
end $$;

do $$
declare
  target_column text;
begin
  if to_regclass('public.jobs') is not null then
    foreach target_column in array array[
      'title',
      'short_description',
      'description',
      'responsibilities',
      'requirements',
      'desirable_requirements',
      'benefits',
      'salary_range',
      'city',
      'state',
      'seniority',
      'education_level',
      'work_schedule',
      'about_company',
      'neighborhood',
      'about_job',
      'seo_title',
      'seo_description',
      'responsible_name',
      'internal_notes',
      'finance_responsible'
    ]
    loop
      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'jobs'
          and c.column_name = target_column
          and c.data_type in ('text', 'character varying')
      ) then
        execute format(
          'update public.jobs set %1$I = public.fix_latin1_mojibake(%1$I) where %1$I is not null and (position(chr(195) in %1$I) > 0 or position(chr(194) in %1$I) > 0)',
          target_column
        );
      end if;
    end loop;
  end if;
end $$;

do $$
declare
  target_column text;
begin
  if to_regclass('public.site_contents') is not null then
    foreach target_column in array array[
      'title',
      'subtitle',
      'body',
      'button_label',
      'button_url'
    ]
    loop
      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'site_contents'
          and c.column_name = target_column
          and c.data_type in ('text', 'character varying')
      ) then
        execute format(
          'update public.site_contents set %1$I = public.fix_latin1_mojibake(%1$I) where %1$I is not null and (position(chr(195) in %1$I) > 0 or position(chr(194) in %1$I) > 0)',
          target_column
        );
      end if;
    end loop;
  end if;
end $$;

do $$
declare
  target_column text;
begin
  if to_regclass('public.franchises') is not null then
    foreach target_column in array array[
      'name',
      'legal_name',
      'contact_name',
      'city',
      'state'
    ]
    loop
      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'franchises'
          and c.column_name = target_column
          and c.data_type in ('text', 'character varying')
      ) then
        execute format(
          'update public.franchises set %1$I = public.fix_latin1_mojibake(%1$I) where %1$I is not null and (position(chr(195) in %1$I) > 0 or position(chr(194) in %1$I) > 0)',
          target_column
        );
      end if;
    end loop;
  end if;
end $$;

do $$
declare
  has_published_at boolean;
  has_updated_at boolean;
  set_clause text;
begin
  if to_regclass('public.jobs') is null or to_regclass('public.companies') is null then
    return;
  end if;

  has_published_at := exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'jobs'
      and c.column_name = 'published_at'
  );

  has_updated_at := exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'jobs'
      and c.column_name = 'updated_at'
  );

  set_clause := 'created_at = case when created_at > now() - interval ''2 days'' then now() - interval ''21 days'' else created_at end';

  if has_published_at then
    set_clause := set_clause || ', published_at = case when coalesce(published_at, created_at) > now() - interval ''2 days'' then now() - interval ''21 days'' else coalesce(published_at, created_at) end';
  end if;

  if has_updated_at then
    set_clause := set_clause || ', updated_at = now()';
  end if;

  execute format(
    'with seed_jobs as (
      select j.id
      from public.jobs j
      join public.companies c on c.id = j.company_id
      where (c.slug, j.slug) in (
        (''aba-kids'', ''assistente-de-atendimento-infantil''),
        (''aquarela'', ''assistente-administrativo''),
        (''karolicias'', ''atendente-de-loja''),
        (''farma-center'', ''recepcionista''),
        (''darma-center'', ''recepcionista'')
      )
    )
    update public.jobs
    set %s
    where id in (select id from seed_jobs)',
    set_clause
  );
end $$;

drop function public.fix_latin1_mojibake(text);
