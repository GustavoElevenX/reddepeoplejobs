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

export function getNextApplicationStage(stage: ApplicationStage) {
  const index = activeApplicationStages.indexOf(stage);
  return index >= 0 ? activeApplicationStages[index + 1] ?? null : null;
}

export function getPreviousApplicationStage(stage: ApplicationStage) {
  const index = activeApplicationStages.indexOf(stage);
  return index > 0 ? activeApplicationStages[index - 1] : null;
}
