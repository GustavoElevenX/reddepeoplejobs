# Redde People

Portal de oportunidades para conectar candidatos a empresas parceiras da Redde People.

## Visão Geral

O projeto reúne:

- página pública com busca de vagas;
- vitrine de empresas parceiras;
- páginas públicas para cada empresa;
- vagas abertas por empresa;
- candidatura sem login;
- envio de currículo;
- painel administrativo Redde;
- painel de empresa;
- gestão de candidatos e permissões de acesso.

## Fluxos Principais

### Candidato

O candidato pode acessar o portal, buscar vagas, conhecer empresas parceiras e enviar uma candidatura com currículo sem criar conta.

### Redde People

A Redde People pode gerenciar empresas, vagas, candidatos, usuários e permissões.

### Empresa Cliente

A empresa cliente pode acessar apenas seus próprios dados, vagas e candidaturas, conforme as permissões concedidas pela Redde People.

## Logos de Clientes

As logos ficam na pasta pública de imagens do projeto.

Para uma logo aparecer no portal, a empresa também precisa estar cadastrada. Existem duas formas:

- preencher o caminho da logo no cadastro da empresa;
- deixar o caminho vazio e salvar a imagem com o mesmo slug da empresa.

Colocar uma imagem nova na pasta não cria a empresa automaticamente.

## Contas de Demonstração

Quando o projeto estiver em modo de demonstração, use qualquer senha:

- `admin@reddepeople.com.br`: painel Redde completo
- `empresa@cliente.com.br`: painel de empresa com edição
- `recrutador@cliente.com.br`: painel de empresa sem edição de página

## Checklist de Validação

- A home deve parecer um portal de vagas.
- A busca precisa estar em destaque.
- As empresas devem aparecer com logos e acesso às vagas.
- A candidatura deve funcionar sem login.
- A Redde People deve conseguir gerenciar tudo.
- Usuários de empresa devem ver apenas dados da própria empresa.
- Textos técnicos não devem aparecer para candidatos, empresas ou usuários administrativos.
