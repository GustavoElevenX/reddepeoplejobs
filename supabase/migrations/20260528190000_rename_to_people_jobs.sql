update public.companies
set
  short_description = replace(short_description, 'Empresa parceira da ' || 'Redde' || ' People', 'Empresa parceira do People Jobs'),
  why_work_here = replace(why_work_here, 'apoio da ' || 'Redde' || ' People', 'apoio do People Jobs'),
  updated_at = now()
where
  short_description ilike '%' || 'Redde' || ' People' || '%'
  or why_work_here ilike '%' || 'Redde' || ' People' || '%';

update public.site_contents
set
  title = replace(title, 'Redde' || ' People Jobs', 'People Jobs'),
  subtitle = replace(replace(replace(subtitle, 'A ' || 'Redde' || ' People', 'O People Jobs'), 'com a ' || 'Redde' || ' People', 'com o People Jobs'), 'mailto:contato@' || 'reddepeople.com.br', 'mailto:contato@peoplejobs.com.br'),
  body = replace(replace(body, 'da ' || 'Redde' || ' People', 'do People Jobs'), 'mailto:contato@' || 'reddepeople.com.br', 'mailto:contato@peoplejobs.com.br'),
  button_label = replace(button_label, 'Falar com a ' || 'Redde' || ' People', 'Falar com a People Jobs'),
  button_url = replace(button_url, 'contato@' || 'reddepeople.com.br', 'contato@peoplejobs.com.br'),
  updated_at = now()
where
  title ilike '%' || 'Redde' || ' People' || '%'
  or subtitle ilike '%' || 'Redde' || ' People' || '%'
  or body ilike '%' || 'Redde' || ' People' || '%'
  or button_label ilike '%' || 'Redde' || ' People' || '%'
  or button_url ilike '%' || 'reddepeople' || '%';

drop policy if exists "Company users can manage own company assets" on storage.objects;

drop policy if exists "Company users can manage own company assets" on storage.objects;
create policy "Company users can manage own company assets"
on storage.objects for all
using (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.company_user_access cua
    join public.companies c on c.id = cua.company_id
    join public.profiles p on p.id = cua.user_id
    where
      p.id = auth.uid()
      and p.is_active
      and p.role in ('company_admin', 'company_recruiter')
      and cua.can_edit_company_page = true
      and c.id::text = (storage.foldername(name))[1]
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
)
with check (
  bucket_id = 'company-assets'
  and exists (
    select 1
    from public.company_user_access cua
    join public.companies c on c.id = cua.company_id
    join public.profiles p on p.id = cua.user_id
    where
      p.id = auth.uid()
      and p.is_active
      and p.role in ('company_admin', 'company_recruiter')
      and cua.can_edit_company_page = true
      and c.id::text = (storage.foldername(name))[1]
      and (storage.foldername(name))[2] in ('logo', 'banner')
  )
);
