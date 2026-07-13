alter table public.franchise_workflow_settings
  add column if not exists interview_templates jsonb not null default '[]'::jsonb;

alter table public.chat_conversations
  add column if not exists contact_phone text;

alter table public.contracts
  add column if not exists contract_file_url text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('franchise-documents', 'franchise-documents', false, 20971520)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Admin master manages franchise documents" on storage.objects;
create policy "Admin master manages franchise documents"
on storage.objects for all
to authenticated
using (bucket_id = 'franchise-documents' and public.is_admin_master())
with check (bucket_id = 'franchise-documents' and public.is_admin_master());

drop policy if exists "Franchisees read own franchise documents" on storage.objects;
create policy "Franchisees read own franchise documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'franchise-documents'
  and (storage.foldername(name))[1] = public.current_user_franchise_id()::text
);

drop policy if exists "Franchisees upload own franchise documents" on storage.objects;
create policy "Franchisees upload own franchise documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'franchise-documents'
  and (storage.foldername(name))[1] = public.current_user_franchise_id()::text
);

drop policy if exists "Franchisees update own franchise documents" on storage.objects;
create policy "Franchisees update own franchise documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'franchise-documents'
  and (storage.foldername(name))[1] = public.current_user_franchise_id()::text
)
with check (
  bucket_id = 'franchise-documents'
  and (storage.foldername(name))[1] = public.current_user_franchise_id()::text
);

drop policy if exists "Franchisees delete own franchise documents" on storage.objects;
create policy "Franchisees delete own franchise documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'franchise-documents'
  and (storage.foldername(name))[1] = public.current_user_franchise_id()::text
);
