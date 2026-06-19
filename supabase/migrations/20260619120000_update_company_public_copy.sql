update public.companies
set
  segment = 'Educação infantil e desenvolvimento',
  short_description = 'Centro de educação infantil com oportunidades em atendimento, apoio pedagógico, recreação e rotinas da unidade.',
  about_text = 'A Aba Kids atua no cuidado e desenvolvimento de crianças, integrando acolhimento às famílias, apoio pedagógico e organização de rotinas educativas.',
  why_work_here = 'Ambiente orientado por cuidado, aprendizado e desenvolvimento infantil, com funções claras e contato próximo com famílias.',
  culture_text = 'Cultura de acolhimento, responsabilidade, colaboração e atenção ao desenvolvimento das crianças.'
where slug = 'aba-kids';

update public.companies
set
  segment = 'Educação e atividades criativas',
  short_description = 'Empresa de serviços educacionais com oportunidades em atendimento, apoio administrativo e suporte à rotina pedagógica.',
  about_text = 'A Aquarela atua no segmento educacional, unindo organização, criatividade e atendimento próximo para apoiar alunos, famílias e equipe pedagógica.',
  why_work_here = 'Processo seletivo estruturado, rotina organizada e espaço para profissionais que gostam de educação e relacionamento com famílias.',
  culture_text = 'Cultura de cuidado, criatividade, colaboração e melhoria contínua.'
where slug = 'aquarela';

update public.companies
set
  segment = 'Engenharia civil e elétrica',
  short_description = 'Empresa de engenharia civil e elétrica com oportunidades em obras, projetos, manutenção, administrativo e apoio técnico.',
  about_text = 'A Conceito atua com soluções de engenharia civil e elétrica, apoiando projetos, instalações, manutenções e acompanhamento técnico com foco em qualidade e segurança.',
  why_work_here = 'Rotina técnica estruturada, contato com projetos reais e oportunidades para perfis de campo, escritório e suporte operacional.',
  culture_text = 'Cultura de segurança, precisão, colaboração e compromisso com a qualidade das entregas.'
where slug = 'conceito';

update public.companies
set slug = 'farma-center'
where slug = 'darma-center'
  and not exists (
    select 1
    from public.companies existing_company
    where existing_company.slug = 'farma-center'
  );

update public.companies
set
  name = 'Farma Center',
  logo_url = '/imagens/clientes/farma-center.png',
  segment = 'Farmácia de manipulação e drogaria',
  short_description = 'Farmácia de manipulação e drogaria com oportunidades em atendimento, laboratório, dispensação, estoque e suporte administrativo.',
  about_text = 'A Farma Center atua no varejo farmacêutico e em manipulação, conectando cuidado, orientação ao cliente, preparo de fórmulas e rotina operacional organizada.',
  why_work_here = 'Ambiente voltado à saúde, com processos definidos e oportunidades para quem valoriza precisão, cuidado e atendimento responsável.',
  culture_text = 'Cultura de responsabilidade sanitária, atenção ao cliente, ética e cuidado.'
where slug in ('darma-center', 'farma-center')
   or name in ('Darma Center', 'Farma Center');

update public.companies
set
  segment = 'Alimentos e confeitaria',
  short_description = 'Marca de alimentos e confeitaria com oportunidades em produção, atendimento, vendas e rotinas operacionais.',
  about_text = 'A Karolícias atua no segmento de alimentos, com foco em produtos bem apresentados, atendimento acolhedor e operação cuidadosa do preparo à entrega.',
  why_work_here = 'Ambiente prático, rotina clara e oportunidades para quem gosta de atendimento, produção artesanal e cuidado com detalhes.',
  culture_text = 'Cultura orientada por qualidade, capricho, colaboração e melhoria diária.'
where slug = 'karolicias';

update public.companies
set
  segment = 'Saúde, estética e bem-estar',
  short_description = 'Empresa de saúde, estética e bem-estar com oportunidades em atendimento, comercial, procedimentos e suporte à operação.',
  about_text = 'A Levive atua com serviços voltados à saúde, estética e bem-estar, combinando atendimento consultivo, cuidado com o cliente e rotinas de qualidade.',
  why_work_here = 'Plano de crescimento por área, liderança próxima e rotinas de treinamento para profissionais de atendimento, vendas e operação.',
  culture_text = 'Ambiente acolhedor, disciplinado e orientado por cuidado, qualidade e evolução profissional.'
where slug = 'levive';

update public.jobs
set
  description = replace(description, 'Darma Center', 'Farma Center'),
  about_company = 'A Farma Center atua no varejo farmacêutico e em manipulação, conectando cuidado, orientação ao cliente, preparo de fórmulas e rotina operacional organizada.'
where description ilike '%Darma Center%'
   or about_company ilike '%Darma Center%';
