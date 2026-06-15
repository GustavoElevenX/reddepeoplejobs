import { cn } from '../../lib/cn';

export type ProcessTab = 'requisicao' | 'hunting' | 'triagem' | 'selecao' | 'desclassificados' | 'faturamento';

const tabs: { id: ProcessTab; label: string }[] = [
  { id: 'requisicao', label: 'Requisição' },
  { id: 'hunting', label: 'Hunting' },
  { id: 'triagem', label: 'Triagem' },
  { id: 'selecao', label: 'Seleção' },
  { id: 'desclassificados', label: 'Desclassificados' },
  { id: 'faturamento', label: 'Faturamento' },
];

type ProcessTabsProps = {
  activeTab: ProcessTab;
  onChange: (tab: ProcessTab) => void;
};

export function ProcessTabs({ activeTab, onChange }: ProcessTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-surface-200">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'border-b-2 px-4 py-3 text-sm font-bold transition',
              activeTab === tab.id
                ? 'border-redde-500 text-redde-700'
                : 'border-transparent text-ink-500 hover:text-ink-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
