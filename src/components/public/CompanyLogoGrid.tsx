import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CompanySummary } from '../../types';

type CompanyLogoGridProps = {
  companies: CompanySummary[];
};

function CompanyLogoCard({ company }: { company: CompanySummary }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = company.logo_url || `/imagens/clientes/${company.slug}.png`;

  return (
    <Link
      to={`/empresa/${company.slug}`}
      className="group flex h-[88px] items-center justify-center rounded-2xl border border-surface-200 bg-white p-4 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
      aria-label={`Ver empresa ${company.name}`}
    >
      {!failed ? (
        <img
          src={imageUrl}
          alt={company.name}
          className="max-h-12 max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-center text-sm font-black text-ink-900">{company.name}</span>
      )}
    </Link>
  );
}

export function CompanyLogoGrid({ companies }: CompanyLogoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {companies.map((company) => (
        <CompanyLogoCard key={company.id} company={company} />
      ))}
    </div>
  );
}
