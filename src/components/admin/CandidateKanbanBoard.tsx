import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { activeApplicationStages, resolveApplicationStage } from '../../lib/applicationStages';
import type { Application, ApplicationStage } from '../../types';
import { CandidateKanbanColumn } from './CandidateKanbanColumn';
import type { CandidateKanbanAction } from './CandidateKanbanCard';

type CandidateKanbanBoardProps = {
  applications: Application[];
  canManage?: boolean;
  onOpenCandidate: (application: Application) => void;
  onCandidateAction: (application: Application, action: CandidateKanbanAction) => void;
  onBulkAction: (applications: Application[], action: 'next' | 'schedule' | 'disqualify') => void;
  onMoveCandidate: (
    application: Application,
    stage: ApplicationStage,
    order: number,
    positions: { id: string; kanbanOrder: number }[],
  ) => Promise<void> | void;
};

export function CandidateKanbanBoard({
  applications,
  canManage = true,
  onOpenCandidate,
  onCandidateAction,
  onBulkAction,
  onMoveCandidate,
}: CandidateKanbanBoardProps) {
  const normalizedApplications = applications.map((application) => ({
    ...application,
    stage: resolveApplicationStage(application),
  }));
  const [items, setItems] = useState(normalizedApplications);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setItems(
      applications.map((application) => ({
        ...application,
        stage: resolveApplicationStage(application),
      })),
    );
    setSelectedIds((current) => new Set([...current].filter((id) => applications.some((item) => item.id === id))));
  }, [applications]);

  function handleSelect(application: Application, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(application.id);
      else next.delete(application.id);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canManage) return;
    const { active, over } = event;
    if (!over) return;

    const activeApplication = items.find((application) => application.id === active.id);
    if (!activeApplication) return;

    const targetStage = activeApplicationStages.includes(over.id as ApplicationStage)
      ? (over.id as ApplicationStage)
      : items.find((application) => application.id === over.id)?.stage;
    if (!targetStage) return;

    const withoutActive = items.filter((application) => application.id !== activeApplication.id);
    const targetItems = withoutActive
      .filter((application) => application.stage === targetStage)
      .sort((a, b) => a.kanban_order - b.kanban_order);
    const overIndex = targetItems.findIndex((application) => application.id === over.id);
    const targetIndex = overIndex >= 0 ? overIndex : targetItems.length;
    targetItems.splice(targetIndex, 0, { ...activeApplication, stage: targetStage, kanban_order: targetIndex });

    const reorderedTarget = targetItems.map((application, index) => ({ ...application, kanban_order: index }));
    const reorderedSource =
      activeApplication.stage === targetStage
        ? []
        : withoutActive
            .filter((application) => application.stage === activeApplication.stage)
            .sort((a, b) => a.kanban_order - b.kanban_order)
            .map((application, index) => ({ ...application, kanban_order: index }));
    const nextItems = withoutActive
      .filter(
        (application) =>
          application.stage !== targetStage &&
          (activeApplication.stage === targetStage || application.stage !== activeApplication.stage),
      )
      .concat(reorderedSource, reorderedTarget);

    setItems(nextItems);
    void onMoveCandidate(
      activeApplication,
      targetStage,
      targetIndex,
      [...reorderedSource, ...reorderedTarget].map((application) => ({
        id: application.id,
        kanbanOrder: application.kanban_order,
      })),
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
        <div className="flex flex-col justify-between gap-2 border-b border-surface-200 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
          <div>
            <h2 className="font-black text-ink-900">Funil de seleção</h2>
            <p className="mt-1 text-xs font-semibold text-ink-500">
              Arraste os cards entre as colunas. Deslize para o lado para ver todas as etapas.
            </p>
          </div>
          <span className="w-fit rounded-full bg-surface-100 px-3 py-1 text-xs font-black text-ink-500">
            {items.length} candidatos ativos
          </span>
        </div>
        <div className="kanban-scroll w-full max-w-full overflow-x-auto overscroll-x-contain p-3 sm:p-4">
          <div className="flex w-max min-w-full items-start gap-3 sm:gap-4">
            {activeApplicationStages.map((stage) => (
              <CandidateKanbanColumn
                key={stage}
                stage={stage}
                canManage={canManage}
                applications={items
                  .filter((application) => application.stage === stage)
                  .sort((a, b) => a.kanban_order - b.kanban_order)}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onOpenCandidate={onOpenCandidate}
                onCandidateAction={onCandidateAction}
                onBulkAction={(selected, action) => {
                  onBulkAction(selected, action);
                  setSelectedIds(new Set());
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </DndContext>
  );
}
