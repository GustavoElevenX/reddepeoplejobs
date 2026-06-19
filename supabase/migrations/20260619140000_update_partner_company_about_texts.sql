update public.companies
set
  segment = coalesce(nullif(segment, ''), 'Beleza e estética'),
  short_description = 'Salão de beleza em São Luís com serviços de cabelo, maquiagem, unhas, spa e produção para ocasiões especiais.',
  about_text = 'A MF Beauty é um salão de beleza em São Luís voltado para cuidado, autoestima e bem-estar. A empresa reúne serviços de cabelo, maquiagem, unhas, spa e produções especiais, com atenção à experiência da cliente em cada atendimento.',
  why_work_here = coalesce(nullif(why_work_here, ''), 'Ambiente de beleza dinâmico, com rotina próxima ao cliente e oportunidades para profissionais atentos a acabamento, cuidado e experiência.'),
  culture_text = coalesce(nullif(culture_text, ''), 'Cultura de acolhimento, capricho, responsabilidade com horários e valorização da autoestima.')
where lower(name) in ('mf beauty')
   or slug in ('mf-beauty');

update public.companies
set
  segment = coalesce(nullif(segment, ''), 'Comercial e marketing'),
  short_description = 'Consultoria de inteligência comercial e marketing para empresas que buscam estruturar vendas, processos e crescimento.',
  about_text = 'A Booster Academy atua com inteligência comercial, marketing e desenvolvimento de negócios. Seu trabalho apoia empresas de serviços na estruturação de vendas, processos, indicadores, CRM e rotinas comerciais mais previsíveis.',
  why_work_here = coalesce(nullif(why_work_here, ''), 'Rotina acelerada, orientada por metas, dados e melhoria contínua, ideal para perfis comerciais, analíticos e comunicativos.'),
  culture_text = coalesce(nullif(culture_text, ''), 'Cultura de execução, aprendizado prático, acompanhamento de indicadores e crescimento em equipe.')
where lower(name) in ('booster academy')
   or slug in ('booster-academy', 'booster');

update public.companies
set
  segment = coalesce(nullif(segment, ''), 'Saúde, ortopedia e traumatologia'),
  short_description = 'Clínica especializada em ortopedia, traumatologia e cuidado com a mobilidade, com atendimento multidisciplinar em São Luís.',
  about_text = 'O Instituto IOTE atua na área de ortopedia e traumatologia, com foco em diagnóstico, tratamento e acompanhamento de pacientes que buscam recuperar mobilidade, qualidade de vida e desempenho físico. A clínica reúne atendimento especializado e rotina de saúde organizada.',
  why_work_here = coalesce(nullif(why_work_here, ''), 'Ambiente de saúde especializado, com contato direto com pacientes, equipe técnica e rotinas que valorizam organização e cuidado.'),
  culture_text = coalesce(nullif(culture_text, ''), 'Cultura de responsabilidade, precisão no atendimento, ética, acolhimento e compromisso com a evolução dos pacientes.')
where lower(name) in ('instituto iote', 'iote')
   or slug in ('instituto-iote', 'iote');

update public.companies
set
  segment = coalesce(nullif(segment, ''), 'Refrigeração automotiva'),
  short_description = 'Empresa de refrigeração automotiva com atuação em soluções, peças e suporte para ar-condicionado veicular.',
  about_text = 'A BRN atua no segmento de refrigeração automotiva, atendendo demandas ligadas a ar-condicionado veicular, peças, insumos e suporte para oficinas e clientes que precisam manter sistemas de climatização automotiva em bom funcionamento.',
  why_work_here = coalesce(nullif(why_work_here, ''), 'Rotina operacional e comercial com foco em atendimento rápido, conhecimento técnico e suporte a clientes do setor automotivo.'),
  culture_text = coalesce(nullif(culture_text, ''), 'Cultura de agilidade, organização, responsabilidade técnica e compromisso com a necessidade do cliente.')
where lower(name) in ('brn')
   or slug in ('brn');

update public.companies
set
  segment = coalesce(nullif(segment, ''), 'Consultoria empresarial'),
  short_description = 'Ecossistema de consultoria, mentorias e soluções de gestão para apoiar empresas que querem crescer com método.',
  about_text = 'A Redde é um ecossistema de negócios voltado para consultoria, mentorias, imersões e soluções de gestão empresarial. A empresa apoia empreendedores e pequenas e médias empresas na organização de processos, estratégia, finanças, cultura e crescimento sustentável.',
  why_work_here = coalesce(nullif(why_work_here, ''), 'Ambiente consultivo, colaborativo e próximo de empreendedores, com desafios ligados a gestão, processos e desenvolvimento de negócios.'),
  culture_text = coalesce(nullif(culture_text, ''), 'Cultura de evolução, clareza, método, parceria com clientes e busca por crescimento empresarial consistente.')
where lower(name) in ('redde')
   or slug in ('redde', 'redde-consultoria');
