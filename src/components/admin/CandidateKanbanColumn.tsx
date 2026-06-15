import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Application, ApplicationStage } from '../../types';
import { applicationStageLabels } from '../../lib/formatters';
import { CandidateKanbanCard } from './CandidateKanbanCard';

const stageSla: Record<ApplicationStage, string> = {
  qualificacao: 'SLA 2 dias',
  testes: 'SLA 3 dias',
  entrevista: 'SLA 5 dias',
  finalistas: 'SLA 3 dias',
  contratacao: 'Conclusão',
  desclassificados: 'Encerrado',
};

type CandidateKanbanColumnProps = {
  stage: ApplicationStage;
  applications: Application[];
  onOpenCandidate: (application: Application) => void;
};

export function CandidateKanbanColumn({ stage, applications, onOpenCandidate }: CandidateKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } });

  return (
    <section className="w-[270px] shrink-0 overflow-hidden rounded-xl border border-surface-200 bg-surface-50 sm:w-[290px]">
      <div className="border-b border-surface-200 bg-white px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-ink-900">{applicationStageLabels[stage]}</h3>
          <span className="rounded-full bg-redde-50 px-2 py-0.5 text-xs font-black text-redde-700">
            {applications.length}
          </span>
        </div>
        <span className="mt-2 inline-flex rounded-md bg-surface-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-ink-500">
          {stageSla[stage]}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`kanban-column-scroll grid min-h-[390px] max-h-[62vh] content-start gap-3 overflow-y-auto p-3 transition ${
          isOver ? 'bg-redde-50 ring-2 ring-inset ring-redde-200' : 'bg-surface-100/60'
        }`}
      >
        <SortableContext items={applications.map((application) => application.id)} strategy={verticalListSortingStrategy}>
          {applications.map((application) => (
            <CandidateKanbanCard key={application.id} application={application} onOpen={onOpenCandidate} />
          ))}
        </SortableContext>
        {!applications.length ? (
          <div className="rounded-lg border border-dashed border-surface-200 bg-white/70 p-5 text-center text-xs font-semibold leading-5 text-ink-500">
            Arraste candidatos para esta etapa
          </div>
        ) : null}
      </div>
    </section>
  );
}
