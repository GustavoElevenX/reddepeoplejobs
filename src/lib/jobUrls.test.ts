import { describe, expect, it } from 'vitest';
import { getJobPath, normalizeSiteUrl } from './jobUrls';

describe('endereços públicos de vagas', () => {
  it('corrige protocolo HTTPS sem dois-pontos', () => {
    expect(normalizeSiteUrl('https//recruitfy.com.br/')).toBe('https://recruitfy.com.br');
  });

  it('mantém um endereço HTTPS válido', () => {
    expect(normalizeSiteUrl('https://recruitfy.com.br')).toBe('https://recruitfy.com.br');
  });

  it('gera o caminho público codificado', () => {
    expect(getJobPath('empresa teste', 'analista recrutamento')).toBe(
      '/empresa/empresa%20teste/vagas/analista%20recrutamento',
    );
  });

  it('permite usar o domínio atual da aplicação', () => {
    const path = getJobPath('teste', 'analista-recrutamento-validacao');
    expect(new URL(path, 'https://recruitfy.vercel.app').toString()).toBe(
      'https://recruitfy.vercel.app/empresa/teste/vagas/analista-recrutamento-validacao',
    );
  });
});
