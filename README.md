# People Jobs

Plataforma multi-franqueado para operação de recrutamento e seleção da Redde People Jobs.

## Visão Geral

O primeiro escopo operacional reúne:

- Admin Master com visão consolidada da rede;
- cadastro e ativação de franqueados;
- cadastro de empresas clientes por franqueado;
- abertura de vagas vinculadas à empresa e ao franqueado;
- candidatura pública sem login;
- gestão dos candidatos no processo seletivo;
- isolamento de dados entre franqueados.

## Fluxos Principais

### Candidato

O candidato pode acessar o portal, buscar vagas, conhecer empresas parceiras e enviar uma candidatura com currículo sem criar conta.

### Admin Master

O Admin Master cadastra franqueados, acompanha os indicadores da rede e gerencia franqueados, empresas, vagas, candidatos e usuários.

### Franqueado

O franqueado acessa apenas a própria unidade. Ele cadastra empresas clientes, abre vagas para essas empresas e movimenta candidatos no processo seletivo.

### Empresa Cliente

O acesso legado de empresa continua disponível e limitado aos próprios dados, conforme as permissões concedidas.

## Rotas Administrativas

- `/admin/master`: visão consolidada da rede;
- `/admin/master/franqueados`: cadastro e gestão de franqueados;
- `/admin/processos`: processos seletivos de toda a rede;
- `/admin/franqueado`: dashboard da unidade autenticada;
- `/admin/franqueado/empresas`: empresas clientes da unidade;
- `/franqueado/processos`: processos seletivos da unidade;
- `/empresa/processos`: processos seletivos da empresa cliente.

## Processos seletivos

Cada vaga funciona também como uma requisição de recrutamento. A tela de detalhe centraliza:

- ficha da requisição, responsáveis, requisitos e configurações;
- comentários e histórico operacional;
- triagem e candidatos desclassificados;
- Kanban de seleção com etapas, ordenação e atualização do status;
- drawer do candidato com currículo, respostas, comentários, arquivos, e-mail e histórico.

Antes de publicar essa versão, aplique também:

```txt
supabase/migrations/20260615120000_add_recruitment_process_flow.sql
```

## Escopo Posterior

Portal avançado do franqueado, financeiro, base central de currículos, CRM comercial e novas integrações externas não fazem parte desta primeira fase.

## Primeiro acesso

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Rode todas as migrations no Supabase, incluindo `20260612170000_add_multi_franchise_core.sql`.
3. Crie o primeiro administrador no Supabase Auth.
4. Insira o perfil na tabela `profiles` com a função `admin_master`.
5. Publique novamente as Edge Functions `create-company-user` e `delete-user`.

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

## Distribuição de Vagas

A implementação inicial prepara vagas para Google for Jobs, Indeed, Glassdoor e InfoJobs. A publicação nos portais externos continua sujeita às regras, revisão e aprovação de cada canal.

Configure também:

```env
VITE_SITE_URL=https://reddepeoplejobs.com.br
```

Depois de aplicar a migration `20260612120000_add_job_distribution.sql`, publique as funções públicas:

```bash
supabase functions deploy job-sitemap --no-verify-jwt
supabase functions deploy indeed-feed --no-verify-jwt
```

Endpoints deste projeto:

```txt
https://qglkvllmtrvyujhvojqb.supabase.co/functions/v1/job-sitemap
https://qglkvllmtrvyujhvojqb.supabase.co/functions/v1/indeed-feed
```

Os feeds públicos precisam ser servidos por Supabase Edge Function, Netlify Function ou rota backend. Um arquivo gerado somente pelo cliente React/Vite não é suficiente para indexadores e parceiros.

### Google for Jobs

Cada vaga aberta tem URL canônica, metadados SEO e JSON-LD `JobPosting` apenas na página individual. O sitemap inclui somente vagas abertas, empresas publicadas e distribuição Google habilitada.

1. Abra a URL pública da vaga sem login.
2. Teste a URL no [Rich Results Test](https://search.google.com/test/rich-results).
3. Confirme título, descrição, localidade, `datePosted`, `validThrough`, contrato e salário.
4. Adicione o endpoint `job-sitemap` em **Search Console > Sitemaps**.
5. Use a inspeção de URL no Search Console para solicitar e acompanhar a indexação.
6. Feche ou arquive vagas encerradas para removê-las do sitemap e do JSON-LD.

O `public/robots.txt` já aponta para o sitemap de vagas.

### Indeed

O endpoint `indeed-feed` produz XML com CDATA, IDs estáveis, datas, descrição completa, salário, tipo de vaga, localidade e UTM:

```txt
utm_source=indeed&utm_medium=jobboard&utm_campaign=job_distribution
```

O feed inclui vagas abertas com distribuição para Indeed ou Glassdoor habilitada. Envie esse endpoint ao Indeed durante o processo de análise/parceria. O aceite e a frequência de coleta são controlados pelo Indeed.

### Glassdoor

Não existe um feed Glassdoor separado neste MVP. A distribuição segue o ecossistema Indeed/Glassdoor e usa o mesmo feed do Indeed. A exibição no Glassdoor depende da integração e revisão desses portais. Caso o parceiro ofereça redirecionamento específico, use:

```txt
utm_source=glassdoor&utm_medium=jobboard&utm_campaign=job_distribution
```

### InfoJobs

O painel de vagas oferece **Copiar texto para InfoJobs**. O modal gera os campos formatados, copia o conteúdo, cria o link de candidatura com UTM e permite registrar:

- status pendente, pronto, publicado manualmente, falhou, removido ou ação manual necessária;
- URL da vaga publicada no InfoJobs;
- data da publicação manual.

UTM usada:

```txt
utm_source=infojobs&utm_medium=jobboard&utm_campaign=manual_distribution
```

Esse fluxo é manual/semi-automático. Uma futura integração pela API Pandapé/InfoJobs depende de conta aprovada e acesso técnico fornecido pelo responsável da conta.

### Origem das candidaturas

O formulário público lê `utm_source` ou `source` da URL e salva o valor em `applications.source`. Sem parâmetro, usa `direct`.
