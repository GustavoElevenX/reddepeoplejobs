import { cn } from '../../lib/cn';
import { processTabs, type ProcessTab } from '../../lib/processTabs';

type ProcessTabsProps = {
  activeTab: ProcessTab;
  counts?: Partial<Record<ProcessTab, number>>;
  onChange: (tab: ProcessTab) => void;
};

export function ProcessTabs({ activeTab, counts = {}, onChange }: ProcessTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-surface-200">
      <div className="flex min-w-max gap-1">
        {processTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center border-b-2 px-4 py-3 text-sm font-bold transition',
              activeTab === tab.id
                ? 'border-redde-500 text-redde-700'
                : 'border-transparent text-ink-500 hover:text-ink-900',
            )}
          >
            <span>{tab.label}</span>
            {counts[tab.id] !== undefined ? (
              <span
                className={cn(
                  'ml-2 inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-[11px] font-black',
                  activeTab === tab.id ? 'bg-redde-100 text-redde-700' : 'bg-surface-100 text-ink-500',
                )}
              >
                {counts[tab.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
