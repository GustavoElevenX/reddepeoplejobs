import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Application, ApplicationStage } from '../../types';
import { applicationStageLabels } from '../../lib/formatters';
import { CandidateKanbanCard } from './CandidateKanbanCard';

type CandidateKanbanColumnProps = {
  stage: ApplicationStage;
  applications: Application[];
  onOpenCandidate: (application: Application) => void;
};

export function CandidateKanbanColumn({ stage, applications, onOpenCandidate }: CandidateKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } });

  return (
    <section className="w-[290px] shrink-0">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-black text-ink-900">{applicationStageLabels[stage]}</h3>
        <span className="rounded-full bg-surface-200 px-2 py-0.5 text-xs font-black text-ink-700">
          {applications.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`grid min-h-[420px] content-start gap-3 rounded-xl border p-3 transition ${
          isOver ? 'border-redde-200 bg-redde-50' : 'border-surface-200 bg-surface-100/70'
        }`}
      >
        <SortableContext items={applications.map((application) => application.id)} strategy={verticalListSortingStrategy}>
          {applications.map((application) => (
            <CandidateKanbanCard key={application.id} application={application} onOpen={onOpenCandidate} />
          ))}
        </SortableContext>
        {!applications.length ? (
          <div className="rounded-lg border border-dashed border-surface-200 bg-white/60 p-4 text-center text-xs font-semibold text-ink-500">
            Arraste candidatos para esta etapa
          </div>
        ) : null}
      </div>
    </section>
  );
}
