# People Jobs

Portal de oportunidades para conectar candidatos a empresas parceiras, com páginas de empresas, vagas públicas, candidaturas sem login e painel administrativo.

## Visão Geral

O projeto reúne:

- página pública com busca de vagas;
- vitrine de empresas parceiras;
- páginas públicas para cada empresa;
- vagas abertas por empresa;
- candidatura sem login;
- envio de currículo;
- painel geral;
- painel de empresa;
- gestão de candidatos e permissões de acesso.

## Fluxos Principais

### Candidato

O candidato pode acessar o portal, buscar vagas, conhecer empresas parceiras e enviar uma candidatura com currículo sem criar conta.

### People Jobs

Administradores gerais podem gerenciar empresas, vagas, candidatos, usuários e permissões.

### Empresa Cliente

A empresa cliente pode acessar apenas seus próprios dados, vagas e candidaturas, conforme as permissões concedidas no painel People Jobs.

## Primeiro acesso

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Rode as migrations no Supabase.
3. Crie o primeiro administrador no Supabase Auth.
4. Insira o perfil na tabela `profiles` com permissão de administrador geral.
5. Publique a Edge Function `create-company-user`.

## Imagens de Empresas

Logo e banner podem ser enviados pelo formulário de cadastro ou edição da empresa. Os arquivos são salvos no bucket público `company-assets` nos caminhos `{company_id}/logo/{uuid}.{extensao}` e `{company_id}/banner/{uuid}.{extensao}`. As URLs públicas ficam nos campos `logo_url` e `cover_image_url`.

## Checklist de Validação

- A home deve parecer um portal de vagas.
- A busca precisa estar em destaque.
- As empresas devem aparecer com logos e acesso às vagas.
- A candidatura deve funcionar sem login.
- Administradores gerais devem conseguir gerenciar tudo.
- Usuários de empresa devem ver apenas dados da própria empresa.
- Textos técnicos não devem aparecer para candidatos, empresas ou usuários administrativos.
