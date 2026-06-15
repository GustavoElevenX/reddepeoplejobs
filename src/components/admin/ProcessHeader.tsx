import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatDate, formatLocation, modalityLabels, processStatusLabels } from '../../lib/formatters';
import type { Application, Job } from '../../types';

type ProcessHeaderProps = {
  job: Job;
  applications: Application[];
};

export function ProcessHeader({ job, applications }: ProcessHeaderProps) {
  const hired = applications.filter((application) => application.stage === 'contratacao').length;
  const target = Math.max(job.open_positions, 1);
  const progress = Math.min(100, Math.round((Math.max(hired, job.approved_positions) / target) * 100));

  return (
    <section className="rounded-xl bg-ink-900 p-5 text-white shadow-soft">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/10 text-white">{processStatusLabels[job.process_status]}</Badge>
            <span className="text-sm font-semibold text-white/60">{job.company?.name}</span>
          </div>
          <h1 className="mt-3 text-3xl font-black">{job.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
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

        <div className="w-full max-w-sm rounded-xl bg-white/10 p-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Progresso do processo</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-redde-200 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/60">
            {Math.max(hired, job.approved_positions)} de {target} posições preenchidas
          </p>
        </div>
      </div>
    </section>
  );
}
