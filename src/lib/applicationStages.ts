import type { Application, ApplicationStage, ApplicationStatus } from '../types';

export const activeApplicationStages: ApplicationStage[] = [
  'qualificacao',
  'testes',
  'entrevista',
  'finalistas',
  'contratacao',
];

const stageByStatus: Record<ApplicationStatus, ApplicationStage> = {
  novo: 'qualificacao',
  triagem: 'qualificacao',
  em_analise: 'qualificacao',
  selecionado: 'finalistas',
  entrevista: 'entrevista',
  teste: 'testes',
  encaminhado_cliente: 'finalistas',
  aprovado: 'finalistas',
  reprovado: 'desclassificados',
  contratado: 'contratacao',
  banco_talentos: 'qualificacao',
};

export function resolveApplicationStage(
  application: Pick<Application, 'status'> & Partial<Pick<Application, 'stage'>>,
): ApplicationStage {
  return application.stage ?? stageByStatus[application.status];
}
