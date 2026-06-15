import { Clock3 } from 'lucide-react';
import { formatRelativeDate } from '../../lib/formatters';

export type HistoryTimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

type HistoryTimelineProps = {
  items: HistoryTimelineItem[];
  emptyLabel?: string;
};

export function HistoryTimeline({ items, emptyLabel = 'Nenhuma movimentação registrada.' }: HistoryTimelineProps) {
  if (!items.length) return <p className="text-sm text-ink-500">{emptyLabel}</p>;

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.id} className="relative grid grid-cols-[28px_1fr] gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-redde-50 text-redde-700">
            <Clock3 size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900">{item.title}</p>
            {item.description ? <p className="mt-0.5 text-sm text-ink-500">{item.description}</p> : null}
            <p className="mt-1 text-xs font-semibold text-ink-500">{formatRelativeDate(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
