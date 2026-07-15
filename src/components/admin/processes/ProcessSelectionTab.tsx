import { Columns3, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { Application, ApplicationStage } from '../../../types';
import { CandidateKanbanBoard } from '../CandidateKanbanBoard';
import type { CandidateKanbanAction } from '../CandidateKanbanCard';
import { Button } from '../../ui/Button';
import { applicationStageLabels } from '../../../lib/formatters';

const selectionReferenceTime = Date.now();

type Props = {
  applications: Application[];
  canManage: boolean;
  onOpenCandidate: (application: Application) => void;
  onCandidateAction: (application: Application, action: CandidateKanbanAction) => void;
  onBulkAction: (applications: Application[], action: 'next' | 'schedule' | 'disqualify') => void;
  onMoveCandidate: (application: Application, stage: ApplicationStage, order: number, positions: { id: string; kanbanOrder: number }[]) => Promise<void> | void;
};

export function ProcessSelectionTab(props: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'list' ? 'list' : 'kanban';
  const setView = (nextView: 'kanban' | 'list') => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('view', nextView); return next; }, { replace: true });
  return <section className="grid min-w-0 gap-3">
    <div className="flex justify-end gap-2"><Button size="sm" variant={view === 'kanban' ? 'primary' : 'secondary'} onClick={() => setView('kanban')}><Columns3 size={15} />Quadro</Button><Button size="sm" variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}><List size={15} />Lista</Button></div>
    {view === 'kanban' ? <CandidateKanbanBoard {...props} /> : <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-card"><table className="min-w-[760px] w-full text-sm"><thead className="bg-surface-50 text-left text-xs font-black uppercase text-ink-500"><tr><th className="p-3">Candidato</th><th className="p-3">Etapa</th><th className="p-3">Aderência</th><th className="p-3">Dias na etapa</th><th className="p-3">Indicadores</th></tr></thead><tbody className="divide-y divide-surface-200">{props.applications.map((application) => <tr key={application.id} className="hover:bg-surface-50"><td className="p-3"><button type="button" onClick={() => props.onOpenCandidate(application)} className="font-black hover:text-redde-700">{application.candidate_name}</button><p className="text-xs text-ink-500">{application.candidate_city ?? '-'}</p></td><td className="p-3 font-bold">{applicationStageLabels[application.stage]}</td><td className="p-3">{application.ai_match_score ?? application.adhesion_score ?? 0}%</td><td className="p-3">{Math.max(0, Math.floor((selectionReferenceTime - new Date(application.stage_entered_at ?? application.updated_at).getTime()) / 86400000))}</td><td className="p-3">{application.tags.slice(0, 3).join(', ') || 'Sem tags'}</td></tr>)}</tbody></table></div>}
  </section>;
}
