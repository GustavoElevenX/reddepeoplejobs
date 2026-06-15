import { ArrowRight, CalendarDays, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { contractTypeLabels, formatDate, processStatusLabels } from '../../lib/formatters';
import type { Application, Job } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

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
  return (
    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full divide-y divide-surface-200 text-sm">
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
              const hired = candidates.filter((application) => application.stage === 'contratacao').length;
              const target = Math.max(job.open_positions, 1);
              const progress = Math.min(100, Math.round((Math.max(hired, job.approved_positions) / target) * 100));

              return (
                <tr key={job.id} className="group transition hover:bg-surface-50">
                  <td className="px-4 py-4">
                    <Link to={`${detailBasePath}/${job.id}`} className="font-black text-ink-900 hover:text-redde-700">
                      {job.title}
                    </Link>
                    <div className="mt-1">
                      <Badge variant={job.process_status === 'in_progress' ? 'success' : 'neutral'}>
                        {processStatusLabels[job.process_status]}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-ink-700">{job.company?.name ?? '-'}</td>
                  <td className="px-4 py-4 text-ink-700">{contractTypeLabels[job.contract_type]}</td>
                  <td className="px-4 py-4 text-ink-700">{job.responsible_name ?? 'Não definido'}</td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-28 items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-200">
                        <div className="h-full rounded-full bg-redde-500" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-ink-700">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex min-w-8 justify-center rounded-full bg-redde-50 px-2 py-1 font-black text-redde-700">
                      {candidates.length}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-ink-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={15} />
                      {formatDate(job.application_deadline)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {canEdit ? (
                        <Button variant="ghost" size="sm" aria-label="Editar processo" onClick={() => onEdit(job)}>
                          <MoreHorizontal size={17} />
                        </Button>
                      ) : null}
                      <Link to={`${detailBasePath}/${job.id}`}>
                        <Button size="sm">
                          Abrir
                          <ArrowRight size={15} />
                        </Button>
                      </Link>
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
