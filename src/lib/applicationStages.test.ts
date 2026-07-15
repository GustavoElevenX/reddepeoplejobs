import { describe, expect, it } from 'vitest';
import { getNextApplicationStage, getPreviousApplicationStage, resolveApplicationStage } from './applicationStages';
import { isProcessTab } from './processTabs';

describe('fluxo de etapas do processo seletivo', () => {
  it('mantém a sequência operacional completa', () => {
    expect(getNextApplicationStage('qualificacao')).toBe('testes');
    expect(getNextApplicationStage('testes')).toBe('entrevista');
    expect(getNextApplicationStage('entrevista')).toBe('finalistas');
    expect(getNextApplicationStage('finalistas')).toBe('contratacao');
    expect(getNextApplicationStage('contratacao')).toBeNull();
  });

  it('permite retornar apenas para a etapa anterior', () => {
    expect(getPreviousApplicationStage('contratacao')).toBe('finalistas');
    expect(getPreviousApplicationStage('qualificacao')).toBeNull();
  });

  it('prioriza a etapa persistida e converte status legados', () => {
    expect(resolveApplicationStage({ status: 'novo', stage: 'entrevista' })).toBe('entrevista');
    expect(resolveApplicationStage({ status: 'contratado' })).toBe('contratacao');
    expect(resolveApplicationStage({ status: 'reprovado' })).toBe('desclassificados');
  });
});

describe('abas do processo', () => {
  it('aceita somente identificadores conhecidos', () => {
    expect(isProcessTab('triagem')).toBe(true);
    expect(isProcessTab('faturamento')).toBe(true);
    expect(isProcessTab('inexistente')).toBe(false);
    expect(isProcessTab(null)).toBe(false);
  });
});
