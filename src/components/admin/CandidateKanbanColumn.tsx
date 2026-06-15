import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Application, ApplicationStage } from '../../types';
import { applicationStageLabels } from '../../lib/formatters';
import { ArrowRight, CalendarClock, UserX } from 'lucide-react';
import { ActionMenu, ActionMenuItem } from './ActionMenu';
import { CandidateKanbanCard, type CandidateKanbanAction } from './CandidateKanbanCard';

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
  canManage?: boolean;
  selectedIds: Set<string>;
  onSelect: (application: Application, selected: boolean) => void;
  onOpenCandidate: (application: Application) => void;
  onCandidateAction: (application: Application, action: CandidateKanbanAction) => void;
  onBulkAction: (applications: Application[], action: 'next' | 'schedule' | 'disqualify') => void;
};

export function CandidateKanbanColumn({
  stage,
  applications,
  canManage = true,
  selectedIds,
  onSelect,
  onOpenCandidate,
  onCandidateAction,
  onBulkAction,
}: CandidateKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } });
  const selectedApplications = applications.filter((application) => selectedIds.has(application.id));
  const allSelected = Boolean(applications.length) && selectedApplications.length === applications.length;

  return (
    <section className="w-[270px] shrink-0 overflow-hidden rounded-xl border border-surface-200 bg-surface-50 sm:w-[290px]">
      <div className="border-b border-surface-200 bg-white px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {canManage ? (
              <input
                type="checkbox"
                aria-label={`Selecionar candidatos em ${applicationStageLabels[stage]}`}
                checked={allSelected}
                onChange={(event) =>
                  applications.forEach((application) => onSelect(application, event.target.checked))
                }
                className="h-4 w-4 shrink-0 accent-redde-500"
              />
            ) : null}
            <h3 className="truncate text-sm font-black text-ink-900">{applicationStageLabels[stage]}</h3>
            <span className="rounded-full bg-redde-50 px-2 py-0.5 text-xs font-black text-redde-700">
              {applications.length}
            </span>
          </div>
          {canManage ? (
            <ActionMenu label="icon">
              <ActionMenuItem
                disabled={!selectedApplications.length}
                onClick={() => onBulkAction(selectedApplications, 'next')}
              >
                <ArrowRight size={15} />
                Avançar selecionados
              </ActionMenuItem>
              <ActionMenuItem
                disabled={!selectedApplications.length}
                onClick={() => onBulkAction(selectedApplications, 'schedule')}
              >
                <CalendarClock size={15} />
                Agendar entrevista
              </ActionMenuItem>
              <ActionMenuItem
                danger
                disabled={!selectedApplications.length}
                onClick={() => onBulkAction(selectedApplications, 'disqualify')}
              >
                <UserX size={15} />
                Desclassificar
              </ActionMenuItem>
            </ActionMenu>
          ) : null}
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
            <CandidateKanbanCard
              key={application.id}
              application={application}
              canManage={canManage}
              selected={selectedIds.has(application.id)}
              onSelect={onSelect}
              onOpen={onOpenCandidate}
              onAction={onCandidateAction}
            />
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
