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
import type { Application, ApplicationStage } from '../../types';
import { CandidateKanbanColumn } from './CandidateKanbanColumn';

const stages: ApplicationStage[] = ['qualificacao', 'testes', 'entrevista', 'finalistas', 'contratacao'];

type CandidateKanbanBoardProps = {
  applications: Application[];
  onOpenCandidate: (application: Application) => void;
  onMoveCandidate: (
    application: Application,
    stage: ApplicationStage,
    order: number,
    positions: { id: string; kanbanOrder: number }[],
  ) => Promise<void> | void;
};

export function CandidateKanbanBoard({
  applications,
  onOpenCandidate,
  onMoveCandidate,
}: CandidateKanbanBoardProps) {
  const [items, setItems] = useState(applications);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setItems(applications);
  }, [applications]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeApplication = items.find((application) => application.id === active.id);
    if (!activeApplication) return;

    const targetStage = stages.includes(over.id as ApplicationStage)
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
      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max gap-4">
          {stages.map((stage) => (
            <CandidateKanbanColumn
              key={stage}
              stage={stage}
              applications={items
                .filter((application) => application.stage === stage)
                .sort((a, b) => a.kanban_order - b.kanban_order)}
              onOpenCandidate={onOpenCandidate}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
