import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ApplicationStatus, AppRole, CompanyPageStatus, JobContractType, JobModality, JobStatus } from '../types';

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
  redde_super_admin: 'Administrador principal',
  redde_admin: 'Administrador geral',
  company_admin: 'Administrador da empresa',
  company_recruiter: 'Recrutador da empresa',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  novo: 'Novo',
  em_analise: 'Em análise',
  selecionado: 'Selecionado',
  entrevista: 'Entrevista',
  reprovado: 'Reprovado',
  contratado: 'Contratado',
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
