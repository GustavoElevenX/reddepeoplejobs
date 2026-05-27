import { ArrowRight, Building2 } from 'lucide-react';
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

  return (
    <div className="grid min-h-44 content-between rounded-lg border border-surface-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/empresa/${company.slug}`} className="grid gap-4">
        <div className="flex h-20 items-center justify-center rounded-lg bg-surface-50 p-3">
          {!failed ? (
            <img
              src={imageUrl}
              alt={company.name}
              className="max-h-14 max-w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <Building2 className="text-redde-500" size={30} />
          )}
        </div>
        <div>
          <h3 className="text-base font-black text-ink-900">{company.name}</h3>
          <p className="mt-1 text-sm text-ink-500">{company.segment ?? 'Empresa parceira'}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-redde-600">
            {openJobs || 'Ver'} {openJobs === 1 ? 'vaga aberta' : 'vagas abertas'}
          </p>
        </div>
      </Link>
      <Link to={`/empresa/${company.slug}#vagas`} className="mt-4">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {companies.map((company) => (
        <CompanyHiringCard key={company.id} company={company} jobs={jobs} />
      ))}
    </div>
  );
}
