import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Circle, GripVertical, MapPin, MoreHorizontal, Sparkles } from 'lucide-react';
import { resolveApplicationStage } from '../../lib/applicationStages';
import type { Application } from '../../types';

type CandidateKanbanCardProps = {
  application: Application;
  onOpen: (application: Application) => void;
};

export function CandidateKanbanCard({ application, onOpen }: CandidateKanbanCardProps) {
  const stage = resolveApplicationStage(application);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: { type: 'candidate', stage },
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 rounded-xl border border-l-4 bg-white p-3 shadow-sm transition ${
        isDragging
          ? 'z-20 border-redde-500 opacity-70 shadow-soft'
          : 'border-surface-200 border-l-redde-500 hover:border-redde-200 hover:border-l-redde-600 hover:shadow-card'
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
            {application.is_new ? (
              <span className="rounded-full bg-redde-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-redde-700">
                Novo
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-ink-500">
            <MapPin size={12} />
            {application.candidate_city ?? 'Localização não informada'}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={`Arrastar ${application.candidate_name}`}
            className="touch-none cursor-grab rounded-md p-1 text-ink-500 hover:bg-surface-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <button
            type="button"
            aria-label={`Abrir ações de ${application.candidate_name}`}
            className="rounded-md p-1 text-ink-500 hover:bg-surface-100"
            onClick={() => onOpen(application)}
          >
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
        {!application.tags.length ? (
          <span className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-bold text-ink-500">
            Sem indicadores
          </span>
        ) : null}
      </div>
    </article>
  );
}
