import { BriefcaseBusiness, CalendarDays, MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatLocation, modalityLabels } from '../../lib/formatters';
import type { Application, Job, ProcessStatus } from '../../types';
import { Select } from '../ui/Select';

type ProcessHeaderProps = {
  job: Job;
  applications: Application[];
  actions?: ReactNode;
  onStatusChange?: (status: ProcessStatus) => void;
};

export function ProcessHeader({ job, applications, actions, onStatusChange }: ProcessHeaderProps) {
  const hired = applications.filter((application) => application.stage === 'contratacao').length;
  const target = Math.max(job.open_positions, 1);
  const progress = Math.min(100, Math.round((Math.max(hired, job.approved_positions) / target) * 100));

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.13em] text-ink-500">
            Processo #{job.id.slice(0, 8).toUpperCase()}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-ink-900 sm:text-3xl">{job.title}</h1>
            <div className="w-44">
              <Select
                aria-label="Status do processo"
                className="h-9 border-redde-100 bg-redde-50 font-black text-redde-700"
                value={job.process_status}
                onChange={(event) => onStatusChange?.(event.target.value as ProcessStatus)}
                disabled={!onStatusChange}
                options={[
                  { label: 'Em preparação', value: 'draft' },
                  { label: 'Em andamento', value: 'in_progress' },
                  { label: 'Pausado', value: 'paused' },
                  { label: 'Concluído', value: 'completed' },
                  { label: 'Cancelado', value: 'cancelled' },
                ]}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {formatLocation(job.city, job.state, job.neighborhood)} · {modalityLabels[job.modality]}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={15} />
              {applications.length} candidatos
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={15} />
              Prazo {formatDate(job.application_deadline)}
            </span>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-ink-500">Cliente</p>
          <p className="mt-1 truncate text-sm font-black text-ink-900">{job.company?.name ?? '-'}</p>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-ink-500">Responsável</p>
          <p className="mt-1 truncate text-sm font-black text-ink-900">{job.responsible_name ?? 'Não definido'}</p>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-ink-500">
            <BriefcaseBusiness size={12} />
            Posições
          </p>
          <p className="mt-1 text-sm font-black text-ink-900">
            {Math.max(hired, job.approved_positions)}/{target} aprovados
          </p>
        </div>
        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Progresso do processo</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-200">
            <div className="h-full rounded-full bg-redde-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
