import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
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
  freelancer: 'Freelancer',
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
  admin_master: 'Admin Master',
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
  lead: 'Lead',
  negotiation: 'Em negociação',
  active_client: 'Cliente ativo',
  inactive_client: 'Cliente inativo',
};

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatRelativeDate(value?: string | null) {
  if (!value) return '-';
  return `há ${formatDistanceToNowStrict(parseISO(value), { locale: ptBR })}`;
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
