import { CalendarDays, Columns3, Edit, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveApplicationStage } from '../../lib/applicationStages';
import { contractTypeLabels, formatDate, formatLocation, processStatusLabels } from '../../lib/formatters';
import type { Application, Job } from '../../types';
import { Badge } from '../ui/Badge';
import { ActionMenu, ActionMenuItem } from './ActionMenu';

const listReferenceTime = Date.now();

type ProcessListTableProps = {
  jobs: Job[];
  applications: Application[];
  detailBasePath: string;
  canEdit?: boolean;
  onEdit: (job: Job) => void;
};

export function ProcessListTable({
  jobs,
  applications,
  detailBasePath,
  canEdit = true,
  onEdit,
}: ProcessListTableProps) {
  function getDeadlineLabel(deadline: string | null) {
    if (!deadline) return { text: 'Sem prazo', variant: 'neutral' as const };
    const days = Math.ceil((new Date(`${deadline}T23:59:59`).getTime() - listReferenceTime) / 86_400_000);
    if (days < 0) return { text: `${Math.abs(days)}d em atraso`, variant: 'danger' as const };
    if (days <= 3) return { text: `${days}d restantes`, variant: 'warning' as const };
    return { text: `${days}d restantes`, variant: 'success' as const };
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-[1160px] w-full divide-y divide-surface-200 text-sm">
          <thead className="bg-surface-50">
            <tr className="text-left text-xs font-black uppercase tracking-[0.08em] text-ink-500">
              <th className="px-4 py-3">Processo seletivo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Contrato</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Progresso</th>
              <th className="px-4 py-3">Candidatos</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200">
            {jobs.map((job) => {
              const candidates = applications.filter((application) => application.job_id === job.id);
              const hired = candidates.filter(
                (application) => resolveApplicationStage(application) === 'contratacao',
              ).length;
              const target = Math.max(job.open_positions, 1);
              const progress = Math.min(100, Math.round((Math.max(hired, job.approved_positions) / target) * 100));
              const newCandidates = candidates.filter((application) => application.is_new).length;
              const deadline = getDeadlineLabel(job.application_deadline);

              return (
                <tr key={job.id} className="group transition hover:bg-surface-50">
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-500">
                      Processo #{job.id.slice(0, 8).toUpperCase()}
                    </p>
                    <Link to={`${detailBasePath}/${job.id}`} className="mt-1 block font-black text-ink-900 hover:text-redde-700">
                      {job.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-500">{formatLocation(job.city, job.state)}</p>
                    <div className="mt-2">
                      <Badge variant={job.process_status === 'in_progress' ? 'success' : 'neutral'}>
                        {processStatusLabels[job.process_status]}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-ink-700">{job.company?.name ?? '-'}</td>
                  <td className="px-4 py-4 text-ink-700">{contractTypeLabels[job.contract_type]}</td>
                  <td className="px-4 py-4 text-ink-700">{job.responsible_name ?? 'Não definido'}</td>
                  <td className="px-4 py-4">
                    <p className="mb-1 text-xs font-black text-ink-700">
                      {Math.max(hired, job.approved_positions)}/{target} aprovados
                    </p>
                    <div className="flex min-w-28 items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-200">
                        <div className="h-full rounded-full bg-redde-500" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-ink-700">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-ink-900">{candidates.length} total</p>
                    <p className="mt-1 text-xs font-bold text-redde-700">{newCandidates} novos</p>
                  </td>
                  <td className="px-4 py-4 text-ink-500">
                    <span className="flex items-center gap-1.5 text-xs">
                      <CalendarDays size={15} />
                      {formatDate(job.application_deadline)}
                    </span>
                    <Badge variant={deadline.variant} className="mt-2">
                      {deadline.text}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <ActionMenu>
                        <Link
                          to={`${detailBasePath}/${job.id}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-100"
                        >
                          <ExternalLink size={15} />
                          Abrir processo
                        </Link>
                        <Link
                          to={`${detailBasePath}/${job.id}?tab=selecao`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-100"
                        >
                          <Columns3 size={15} />
                          Ver Kanban
                        </Link>
                        {canEdit ? (
                          <ActionMenuItem onClick={() => onEdit(job)}>
                            <Edit size={15} />
                            Editar requisição
                          </ActionMenuItem>
                        ) : null}
                      </ActionMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
