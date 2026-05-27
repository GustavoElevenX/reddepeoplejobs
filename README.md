# Redde People Jobs

MVP de portal de vagas da Redde People com home pública, empresas parceiras, vagas, candidatura sem login com upload de currículo, painel Redde e painel de empresa com permissões por cliente.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router DOM
- Supabase Auth, Database e Storage
- React Hook Form + Zod
- Lucide React
- Date-fns

## Instalação

```bash
npm install
```

## Configuração do `.env`

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Sem essas variáveis, o app roda em modo local com dados de demonstração em `localStorage`.

## Rodar local

```bash
npm run dev
```

Depois abra a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## Criar tabelas no Supabase

Execute a migration:

```bash
supabase db push
```

Ou copie o conteúdo de `supabase/migrations/20260527160000_redde_people_mvp.sql` e rode no SQL Editor do Supabase.

A migration cria:

- Enums de papel, status, modalidade e candidatura
- Tabelas `profiles`, `companies`, `company_user_access`, `jobs`, `applications`, `application_notes`, `site_contents`, `audit_logs`
- Funções auxiliares de RLS
- Policies de segurança por Redde/admin/empresa/público
- Seed com 6 empresas e 4 vagas

## Criar buckets

A migration cria os buckets:

- `company-assets`, público, para logos e banners
- `resumes`, privado, para currículos

Se preferir criar manualmente, use o painel Storage do Supabase e mantenha `resumes` privado. Currículos devem ser acessados no admin via signed URL.

## Criar o primeiro `redde_super_admin`

1. Crie um usuário no Supabase Auth.
2. Copie o `id` do usuário.
3. Insira o perfil:

```sql
insert into public.profiles (id, full_name, email, role)
values (
  'UUID_DO_AUTH_USER',
  'Admin Redde People',
  'admin@reddepeople.com.br',
  'redde_super_admin'
);
```

Depois acesse `/admin/login` com o e-mail e senha cadastrados no Supabase Auth.

## Criar usuário de empresa

Para MVP inicial:

1. Crie o usuário em Supabase Auth.
2. Insira o registro em `profiles` com role `company_admin` ou `company_recruiter`.
3. Vincule em `company_user_access`.

Exemplo:

```sql
insert into public.profiles (id, full_name, email, role)
values ('UUID_DO_AUTH_USER', 'Gestor Cliente', 'gestor@cliente.com.br', 'company_admin');

insert into public.company_user_access (
  user_id,
  company_id,
  can_edit_company_page,
  can_manage_jobs,
  can_view_applications,
  can_download_resumes
) values (
  'UUID_DO_AUTH_USER',
  'UUID_DA_EMPRESA',
  true,
  true,
  true,
  true
);
```

A Edge Function opcional `supabase/functions/create-company-user/index.ts` está pronta para criar usuários sem expor `SUPABASE_SERVICE_ROLE_KEY` no front-end.

## Testar candidatura pública

1. Acesse `/vagas`.
2. Abra uma vaga.
3. Preencha o formulário.
4. Envie PDF, DOC ou DOCX até 10MB.
5. Aceite LGPD.
6. Após envio, o app redireciona para `/candidatura/sucesso`.

No Supabase, o arquivo fica no bucket privado `resumes`, e o path fica salvo em `applications.resume_file_path`.

## Logos de clientes

As logos ficam em `public/imagens/clientes`.

Para uma logo aparecer no portal, a empresa também precisa existir no painel ou no Supabase. Existem duas formas:

- Preencher `logo_url` com um caminho público, por exemplo `/imagens/clientes/aba-kids.png`.
- Deixar `logo_url` vazio e salvar a imagem com o mesmo slug da empresa, por exemplo `aba-kids.png`.

Colocar uma imagem nova na pasta não cria a empresa automaticamente.

## Testar permissões de cliente

1. Faça login como usuário `company_admin` ou `company_recruiter`.
2. Acesse `/admin/empresa`.
3. Confirme que só aparecem vagas e candidaturas da empresa vinculada.
4. Ajuste `company_user_access.can_edit_company_page` para testar bloqueio/liberação da edição do perfil público.
5. Ajuste `can_download_resumes` para testar o download de currículos.

## Contas locais de demonstração

Quando não há `.env`, use qualquer senha:

- `admin@reddepeople.com.br`: painel Redde completo
- `empresa@cliente.com.br`: painel de empresa com edição
- `recrutador@cliente.com.br`: painel de empresa sem edição de página

## Build

```bash
npm run build
```
