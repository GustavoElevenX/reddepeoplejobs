import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applicationStageLabels, formatDate } from '../../../lib/formatters';
import { listDisqualifiedApplications, restoreDisqualifiedApplication } from '../../../lib/recruitmentPipeline';
import type { Application, ApplicationDisqualification } from '../../../types';
import { EmptyState } from '../../public/EmptyState';
import { Button } from '../../ui/Button';

type Props = { jobId: string; applications: Application[]; canManage: boolean; onOpen: (application: Application) => void; onChanged: () => Promise<void> | void };

export function ProcessDisqualifiedTab({ jobId, applications, canManage, onOpen, onChanged }: Props) {
  const [events, setEvents] = useState<ApplicationDisqualification[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void listDisqualifiedApplications(jobId).then(setEvents).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Falha ao carregar a auditoria.')); }, [jobId]);
  const activeById = new Map(applications.map((application) => [application.id, application]));
  const activeEvents = events.filter((event) => !event.restored_at && activeById.get(event.application_id)?.stage === 'desclassificados');
  return <section className="grid gap-3">{error ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</div> : null}{activeEvents.length ? <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-card"><table className="min-w-[980px] w-full text-sm"><thead className="bg-surface-50 text-left text-xs font-black uppercase text-ink-500"><tr><th className="p-3">Candidato</th><th className="p-3">Cidade</th><th className="p-3">Etapa de origem</th><th className="p-3">Data</th><th className="p-3">Motivo</th><th className="p-3">Score</th><th className="p-3">Ações</th></tr></thead><tbody className="divide-y divide-surface-200">{activeEvents.map((event) => { const application = activeById.get(event.application_id) ?? event.application; return <tr key={event.id} className="hover:bg-surface-50"><td className="p-3"><button type="button" disabled={!application} onClick={() => application && onOpen(application)} className="font-black hover:text-redde-700">{application?.candidate_name ?? 'Candidato'}</button></td><td className="p-3">{application?.candidate_city ?? '-'}</td><td className="p-3">{applicationStageLabels[event.from_stage]}</td><td className="p-3">{formatDate(event.disqualified_at)}</td><td className="max-w-xs p-3">{event.reason}</td><td className="p-3">{application?.ai_match_score ?? application?.adhesion_score ?? 0}%</td><td className="p-3">{canManage ? <Button size="sm" variant="secondary" onClick={() => { const reason = window.prompt('Motivo da restauração:')?.trim(); if (!reason || !window.confirm('Restaurar para a etapa anterior?')) return; void restoreDisqualifiedApplication({ applicationId: event.application_id, reason }).then(() => onChanged()); }}><RotateCcw size={15} />Restaurar</Button> : null}</td></tr>; })}</tbody></table></div> : <EmptyState title="Nenhum candidato desclassificado." />}</section>;
}
