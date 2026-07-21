import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  ApplicationStage,
  ApplicationStatus,
  AppRole,
  CompanyCommercialStatus,
  CompanyPageStatus,
  FranchiseStatus,
  Job,
  JobContractType,
  JobModality,
  JobStatus,
  ProcessStatus,
} from '../types';

export const modalityLabels: Record<JobModality, string> = {
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  remoto: 'Remoto',
};

export const contractTypeLabels: Record<JobContractType, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
  freelancer: 'Autônomo',
  outro: 'Outro',
};

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  paused: 'Pausada',
  closed: 'Encerrada',
  archived: 'Arquivada',
};

export const companyPageStatusLabels: Record<CompanyPageStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
};

export const roleLabels: Record<AppRole, string> = {
  admin_master: 'Administrador principal',
  franqueado: 'Franqueado',
  empresa_cliente: 'Empresa cliente',
  candidato: 'Candidato',
  redde_super_admin: 'Administrador principal',
  redde_admin: 'Administrador geral',
  company_admin: 'Administrador da empresa',
  company_recruiter: 'Recrutador da empresa',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  novo: 'Novo',
  triagem: 'Triagem',
  em_analise: 'Em análise',
  selecionado: 'Selecionado',
  entrevista: 'Entrevista',
  teste: 'Teste',
  encaminhado_cliente: 'Encaminhado ao cliente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  contratado: 'Contratado',
  banco_talentos: 'Banco de talentos',
};

export const applicationStageLabels: Record<ApplicationStage, string> = {
  qualificacao: 'Qualificação',
  testes: 'Testes',
  entrevista: 'Entrevista',
  finalistas: 'Finalistas',
  contratacao: 'Contratação',
  desclassificados: 'Desclassificados',
};

export const processStatusLabels: Record<ProcessStatus, string> = {
  draft: 'Em preparação',
  in_progress: 'Em andamento',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const franchiseStatusLabels: Record<FranchiseStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export const companyCommercialStatusLabels: Record<CompanyCommercialStatus, string> = {
  lead: 'Potencial cliente',
  negotiation: 'Em negociação',
  active_client: 'Cliente ativo',
  inactive_client: 'Cliente inativo',
};

const operationalValueLabels: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Aberto',
  closed: 'Encerrado',
  archived: 'Arquivado',
  published: 'Publicado',
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  generated: 'Gerado',
  edited: 'Editado',
  selected: 'Selecionado',
  approved_by_franchise: 'Aprovado pela franquia',
  released_to_client: 'Enviado ao cliente',
  interview_scheduled: 'Entrevista agendada',
  client_decided: 'Decisão do cliente registrada',
  scheduled: 'Agendado',
  cancelled: 'Cancelado',
  strong_yes: 'Fortemente recomendado',
  yes: 'Recomendado',
  with_reservations: 'Com ressalvas',
  no: 'Não recomendado',
  undecided: 'Não decidido',
  received: 'Recebido',
  paid: 'Pago',
  signed: 'Assinado',
  issued: 'Emitido',
  done: 'Concluído',
  sent: 'Enviado',
  ready_to_issue: 'Pronto para emitir',
  overdue: 'Vencido',
  locked: 'Bloqueado',
  waived: 'Dispensado',
  not_started: 'Não iniciado',
  not_generated: 'Não gerado',
  not_sent: 'Não enviado',
  viewed: 'Visualizado',
  expired: 'Expirado',
  regenerate: 'Gerar novamente',
  in_progress: 'Em andamento',
  filled: 'Preenchido',
  in_review: 'Em revisão',
  needs_adjustment: 'Precisa de ajuste',
  finalized: 'Finalizado',
  reopen_required: 'Reabertura necessária',
  waiting: 'Aguardando',
  snoozed: 'Adiado',
  awaiting_documents: 'Aguardando documentos',
  scheduled_to_start: 'Início agendado',
  started: 'Iniciado',
  withdrawn: 'Desistiu',
  no_show: 'Não compareceu',
  presencial: 'Presencial',
  online: 'Virtual',
  telefone: 'Telefone',
  manual: 'Manual',
  manual_external: 'Manual ou externo',
  manual_required: 'Publicação manual necessária',
  immediate: 'Imediato',
  final_decision: 'Decisão final',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  generating: 'Gerando',
  met: 'Atendido',
  partial: 'Parcialmente atendido',
  not_found: 'Não encontrado',
  queued: 'Na fila',
  delivered: 'Entregue',
  read: 'Lido',
  inbound: 'Recebida',
  outbound: 'Enviada',
  internal: 'Interno',
  shared: 'Compartilhado',
  whatsapp_ready: 'Pronto para WhatsApp',
  franchise: 'Franquia',
  client: 'Cliente',
  candidate: 'Candidato',
  system: 'Sistema',
  mixed: 'Misto',
  external_link: 'Endereço externo',
  form: 'Formulário',
  file_upload: 'Envio de arquivo',
  score_only: 'Somente pontuação',
  fixed: 'Valor fixo',
  success_fee: 'Pagamento por sucesso',
  monthly: 'Mensal',
  other: 'Outro',
  invoiced: 'Faturado',
  qualification: 'Qualificação',
  em_adaptacao: 'Em adaptação',
  com_dificuldades: 'Com dificuldades',
  pediu_desligamento: 'Pediu desligamento',
  nao_iniciou: 'Não iniciou',
  sem_retorno: 'Sem retorno',
  muito_satisfeito: 'Muito satisfeito',
  satisfeito: 'Satisfeito',
  neutro: 'Neutro',
  insatisfeito: 'Insatisfeito',
  muito_insatisfeito: 'Muito insatisfeito',
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  reposicao_necessaria: 'Reposição necessária',
  new_lead: 'Novo potencial cliente',
  proposal_sent: 'Proposta enviada',
  negotiation: 'Em negociação',
  won: 'Ganho',
  lost: 'Perdido',
  active: 'Ativo',
  inactive: 'Inativo',
  commercial_formalized: 'Formalização comercial',
  briefing_pending: 'Levantamento da vaga pendente',
  briefing_received: 'Levantamento da vaga recebido',
  description_review: 'Revisão da descrição',
  job_published: 'Vaga publicada',
  applications_received: 'Candidaturas recebidas',
  screening: 'Triagem',
  internal_interviews: 'Entrevistas internas',
  finalists_selected: 'Finalistas selecionados',
  waiting_client: 'Aguardando cliente',
  client_interviews: 'Entrevistas com o cliente',
  candidate_approved: 'Candidato aprovado',
  start_informed: 'Início informado',
  nps: 'Pesquisa de satisfação',
  post_sale: 'Pós-venda',
  client_inactive: 'Cliente inativo',
  first_contact: 'Primeiro contato',
  lead_followup: 'Acompanhamento comercial',
  contract_entry: 'Entrada do contrato',
  client_decision: 'Decisão do cliente',
};

export function formatOperationalValue(value?: string | null, fallback = '-') {
  if (!value) return fallback;
  return operationalValueLabels[value] ?? 'Não informado';
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatRelativeDate(value?: string | null) {
  if (!value) return '-';
  return `há ${formatDistanceToNowStrict(parseISO(value), { locale: ptBR })}`;
}

export function formatPublicRelativeDate(value?: string | null) {
  if (!value) return '-';

  const publishedDate = parseISO(value);
  const days = differenceInCalendarDays(new Date(), publishedDate);

  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 45) return `há ${days} dias`;

  return `em ${formatDate(value)}`;
}

export function formatLocation(city?: string | null, state?: string | null, neighborhood?: string | null) {
  const cityState = city && state ? `${city}, ${state}` : city ?? state;
  if (neighborhood && cityState) return `${neighborhood}, ${cityState}`;
  return neighborhood ?? cityState ?? 'Localidade não informada';
}

export function formatSalaryRange(value?: string | null) {
  const salary = value?.trim();
  if (!salary) return null;
  if (/^R\$\s*/i.test(salary)) return salary.replace(/^R\$\s*/i, 'R$ ');
  if (/^RS\s+/i.test(salary)) return salary.replace(/^RS\s+/i, 'R$ ');
  return `R$ ${salary}`;
}

export function formatJobSalary(
  job: Pick<Job, 'salary_range' | 'salary_min' | 'salary_max' | 'salary_currency' | 'salary_unit'>,
) {
  if (job.salary_min === null && job.salary_max === null) return formatSalaryRange(job.salary_range);

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: job.salary_currency ?? 'BRL',
  });
  const minimum = job.salary_min !== null ? formatter.format(job.salary_min) : '';
  const maximum = job.salary_max !== null ? formatter.format(job.salary_max) : '';
  const range = minimum && maximum && minimum !== maximum ? `${minimum} a ${maximum}` : minimum || maximum;
  const unitLabels: Record<string, string> = {
    HOUR: 'por hora',
    DAY: 'por dia',
    WEEK: 'por semana',
    MONTH: 'por mês',
    YEAR: 'por ano',
  };
  return `${range} ${unitLabels[job.salary_unit ?? 'MONTH'] ?? job.salary_unit ?? ''}`.trim();
}
