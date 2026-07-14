import { ArrowRight, Building2, CalendarDays, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contractTypeLabels, formatLocation, formatPublicRelativeDate, formatSalaryRange, modalityLabels } from '../../lib/formatters';
import { getJobTransparency } from '../../lib/jobTransparency';
import type { Job } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type JobCardProps = {
  job: Job;
};

export function JobCard({ job }: JobCardProps) {
  const companySlug = job.company?.slug ?? 'empresa';
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = job.company?.logo_url;
  const transparency = getJobTransparency(job);

  return (
    <Card className="flex h-full flex-col p-5 transition hover:-translate-y-1 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-redde-600">{job.company?.name ?? 'Empresa parceira'}</p>
          <h3 className="mt-1 text-lg font-black text-ink-900">{job.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 p-2">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt={job.company?.name ?? 'Empresa parceira'}
                className="max-h-8 max-w-full object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Building2 className="text-redde-500" size={22} />
            )}
          </div>
          <Badge variant="success">Aberta</Badge>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-500">{job.short_description ?? job.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={transparency.score >= 80 ? 'success' : 'info'}>{transparency.score}% transparente</Badge>
        <Badge>{modalityLabels[job.modality]}</Badge>
        <Badge>{contractTypeLabels[job.contract_type]}</Badge>
        {job.seniority ? <Badge>{job.seniority}</Badge> : null}
        {formatSalaryRange(job.salary_range) ? <Badge variant="info">{formatSalaryRange(job.salary_range)}</Badge> : null}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-ink-500">
        <span className="flex items-center gap-2">
          <MapPin size={15} />
          {formatLocation(job.city, job.state, job.neighborhood)}
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays size={15} />
          Publicada {formatPublicRelativeDate(job.published_at ?? job.created_at)}
        </span>
      </div>
      <Link to={`/empresa/${companySlug}/vagas/${job.slug}`} className="mt-5">
        <Button variant="secondary" className="w-full">
          Ver vaga
          <ArrowRight size={16} />
        </Button>
      </Link>
    </Card>
  );
}
