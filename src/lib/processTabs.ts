export type ProcessTab =
  | 'requisicao'
  | 'hunting'
  | 'triagem'
  | 'selecao'
  | 'desclassificados'
  | 'contratados'
  | 'faturamento';

export const processTabs: { id: ProcessTab; label: string }[] = [
  { id: 'requisicao', label: 'Requisição' },
  { id: 'hunting', label: 'Hunting' },
  { id: 'triagem', label: 'Triagem' },
  { id: 'selecao', label: 'Seleção' },
  { id: 'desclassificados', label: 'Desclassificados' },
  { id: 'contratados', label: 'Contratados' },
  { id: 'faturamento', label: 'Faturamento' },
];

export function isProcessTab(value: string | null): value is ProcessTab {
  return processTabs.some((tab) => tab.id === value);
}
