import { describe, expect, it } from 'vitest';
import { formatOperationalValue } from './formatters';

describe('formatOperationalValue', () => {
  it('traduz códigos operacionais para português', () => {
    expect(formatOperationalValue('filled')).toBe('Preenchido');
    expect(formatOperationalValue('in_progress')).toBe('Em andamento');
    expect(formatOperationalValue('ready_to_issue')).toBe('Pronto para emitir');
    expect(formatOperationalValue('external_link')).toBe('Endereço externo');
  });

  it('não exibe códigos desconhecidos para o usuário', () => {
    expect(formatOperationalValue('unknown_internal_status')).toBe('Não informado');
  });
});
