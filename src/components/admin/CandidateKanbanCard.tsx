import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Circle, GripVertical, MapPin, MoreHorizontal, Sparkles } from 'lucide-react';
import type { Application } from '../../types';

type CandidateKanbanCardProps = {
  application: Application;
  onOpen: (application: Application) => void;
};

export function CandidateKanbanCard({ application, onOpen }: CandidateKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { type: 'candidate', stage: application.stage },
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-white p-3 shadow-sm transition ${
        isDragging ? 'z-20 border-redde-500 opacity-70 shadow-soft' : 'border-surface-200 hover:border-redde-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(application)}
        >
          <span className="flex items-center gap-2">
            {application.is_new ? <Circle size={8} className="fill-redde-500 text-redde-500" /> : null}
            <span className="truncate text-sm font-black text-ink-900">{application.candidate_name}</span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <MapPin size={12} />
            {application.candidate_city ?? 'Localização não informada'}
          </span>
        </button>
        <div className="flex items-center">
          <button type="button" className="cursor-grab p-1 text-ink-500 active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>
          <button type="button" className="p-1 text-ink-500" onClick={() => onOpen(application)}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-redde-50 px-2 py-1 text-xs font-black text-redde-700">
          <Sparkles size={12} />
          {application.adhesion_score ?? application.match_score ?? 0}% aderência
        </span>
        {application.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-bold text-ink-500">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
