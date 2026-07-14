# Recruitfy

Plataforma multi-franqueado para operação de recrutamento e seleção da Recruitfy.

## Visão Geral

A plataforma reúne:

- Admin Master com visão consolidada da rede;
- cadastro, ativação e gestão de franqueados;
- cadastro de empresas clientes por franqueado;
- CRM comercial do franqueado;
- conversão de oportunidade ganha em projeto operacional;
- contrato comercial, ordem de serviço, contas a receber e contas a pagar;
- briefing nativo com link seguro para cliente;
- geração de descrição de vaga com OpenAI via Supabase Edge Function;
- publicação de vagas vinculadas à empresa e ao franqueado;
- candidatura pública sem login;
- ranking, triagem, finalistas e portal do cliente;
- agendamento de entrevista, confirmação de presença e aprovação final;
- NPS, pós-venda, documentos, chat interno e nota fiscal ao final do serviço;
- isolamento de dados entre franqueados.

## Fluxos Principais

### Candidato

O candidato acessa o portal público, busca vagas, conhece empresas parceiras e envia candidatura com currículo, aceite LGPD e dados de disponibilidade. Quando avança para entrevista com o cliente, recebe link de confirmação de presença.

### Admin Master

O Admin Master cadastra franqueados, acompanha indicadores da rede e gerencia franqueados, empresas, processos, vagas, candidatos e usuários.

### Franqueado

O franqueado acessa apenas a própria unidade. Ele opera CRM de vendas, converte oportunidades em projetos, conduz briefing, descrição da vaga, publicação, candidatos, finalistas, cliente, financeiro, NPS e pós-venda.

### Empresa Cliente

O cliente pode preencher briefing por link seguro, acessar finalistas no portal do cliente, marcar entrevistas, registrar aprovação/reprovação e responder NPS.

## Rotas Administrativas

- `/admin/master`: visão consolidada da rede;
- `/admin/master/franqueados`: cadastro e gestão de franqueados;
- `/admin/master/usuarios`: criação e vínculo de usuários;
- `/admin/processos`: processos seletivos de toda a rede;
- `/admin/franqueado`: dashboard da unidade autenticada;
- `/admin/franqueado/crm`: CRM de vendas;
- `/admin/franqueado/clientes`: clientes da unidade;
- `/admin/franqueado/projetos`: projetos operacionais;
- `/admin/franqueado/projetos/:projectId`: detalhe completo do projeto;
- `/admin/franqueado/vagas`: vagas publicadas no novo workspace;
- `/admin/franqueado/candidatos`: candidatos, triagem e ranking;
- `/admin/franqueado/financeiro`: contas a receber, contas a pagar e resultado;
- `/admin/franqueado/notas-fiscais`: notas fiscais de serviço;
- `/franqueado/processos`: fluxo legado de processos seletivos;
- `/empresa/processos`: processos seletivos da empresa cliente.

## Rotas Públicas

- `/vagas`: listagem pública de vagas;
- `/empresa/:companySlug/vagas/:jobSlug`: detalhe público da vaga e candidatura;
- `/briefing/:token`: briefing seguro para cliente;
- `/portal-cliente/:token`: portal seguro de finalistas, agenda, decisão e NPS;
- `/confirmar-presenca/:token`: confirmação de presença do candidato.

## Operação do Franqueado

1. Cadastrar lead/oportunidade no CRM.
2. Validar contrato assinado e entrada paga ou dispensada.
3. Converter oportunidade em projeto, criando cliente, OS, conta a receber, contrato, briefing e tarefa.
4. Preencher ou enviar briefing por link seguro.
5. Aprovar briefing pelo franqueado.
6. Gerar descrição de vaga no backend com `OPENAI_API_KEY`.
7. Revisar e aprovar descrição para publicar vaga.
8. Receber candidaturas públicas com LGPD e ranking.
9. Selecionar até 3 finalistas e liberar portal do cliente.
10. Cliente agenda entrevistas, decide aprovação/reprovação e responde NPS.
11. Sistema prepara NFS-e ao final e cria tarefas de pós-venda.

## Supabase

Configure:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Rode todas as migrations, incluindo:

```txt
supabase/migrations/20260612170000_add_multi_franchise_core.sql
supabase/migrations/20260615120000_add_recruitment_process_flow.sql
supabase/migrations/20260709120000_add_franchise_operations_suite.sql
supabase/migrations/20260709133000_finalize_franchise_workflow.sql
```

Publique as Edge Functions:

```bash
supabase functions deploy create-company-user
supabase functions deploy delete-user
supabase functions deploy generate-job-description
supabase functions deploy send-workflow-email
supabase functions deploy job-sitemap --no-verify-jwt
supabase functions deploy indeed-feed --no-verify-jwt
```

Configure no ambiente da função:

```env
OPENAI_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=Recruitfy <no-reply@seudominio.com.br>
```

Nunca use `VITE_OPENAI_API_KEY`; a chave OpenAI deve ficar somente no backend.

## Primeiro Acesso

1. Crie o primeiro administrador no Supabase Auth.
2. Insira o perfil correspondente em `public.profiles` com papel `admin_master`.
3. Entre no painel em `/admin/login`.
4. Cadastre franqueados em `/admin/master/franqueados`.
5. Crie ou corrija usuários em `/admin/master/usuarios`, vinculando usuários franqueados a uma franquia ativa.

## Distribuição de Vagas

A implementação prepara vagas para Google for Jobs, Indeed, Glassdoor e InfoJobs. A publicação nos portais externos segue as regras de cada canal.

Configure:

```env
VITE_SITE_URL=https://recruitfy.com.br
```

Endpoints públicos:

```txt
https://qglkvllmtrvyujhvojqb.supabase.co/functions/v1/job-sitemap
https://qglkvllmtrvyujhvojqb.supabase.co/functions/v1/indeed-feed
```

## Validação

Use:

```bash
npm run build
```

O build deve passar antes de publicar.
