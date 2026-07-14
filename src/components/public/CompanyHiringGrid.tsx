import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Company, Job } from '../../types';
import { Button } from '../ui/Button';

type CompanyHiringGridProps = {
  companies: Company[];
  jobs: Job[];
};

function CompanyHiringCard({ company, jobs }: { company: Company; jobs: Job[] }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = company.logo_url || `/imagens/clientes/${company.slug}.png`;
  const openJobs = jobs.filter((job) => job.company_id === company.id).length;
  const location = [company.city, company.state].filter(Boolean).join('/');

  return (
    <div className="grid min-h-64 content-between rounded-lg border border-surface-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/empresa/${company.slug}`} className="grid gap-4">
        <div className="flex h-24 items-center justify-center rounded-lg bg-surface-50 p-4">
          {!failed ? (
            <img
              src={imageUrl}
              alt={company.name}
              className="max-h-16 max-w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <Building2 className="text-redde-500" size={34} />
          )}
        </div>
        <div>
          <h3 className="text-lg font-black text-ink-900">{company.name}</h3>
          <p className="mt-2 text-sm font-semibold text-ink-700">{company.segment ?? 'Empresa parceira'}</p>
          {location ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
              <MapPin size={15} />
              {location}
            </p>
          ) : null}
          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-redde-600">
            {openJobs} {openJobs === 1 ? 'vaga aberta' : 'vagas abertas'}
          </p>
        </div>
      </Link>
      <Link to={`/empresa/${company.slug}#vagas`} className="mt-5">
        <Button variant="secondary" size="sm" className="w-full">
          Ver vagas
          <ArrowRight size={15} />
        </Button>
      </Link>
    </div>
  );
}

export function CompanyHiringGrid({ companies, jobs }: CompanyHiringGridProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))' }}
    >
      {companies.map((company) => (
        <CompanyHiringCard key={company.id} company={company} jobs={jobs} />
      ))}
    </div>
  );
}
