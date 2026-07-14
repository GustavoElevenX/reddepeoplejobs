import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CompanySummary } from '../../types';

type LogoCarouselProps = {
  companies: CompanySummary[];
};

function LogoItem({ company }: { company: CompanySummary }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = company.logo_url || `/imagens/clientes/${company.slug}.png`;

  return (
    <Link
      to={`/empresa/${company.slug}`}
      aria-label={`Ver empresa ${company.name}`}
      className="mx-3 flex h-16 w-36 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white px-4 shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-soft"
    >
      {!failed ? (
        <img
          src={imageUrl}
          alt={company.name}
          className="max-h-10 max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-center text-xs font-black text-ink-900">{company.name}</span>
      )}
    </Link>
  );
}

export function LogoCarousel({ companies }: LogoCarouselProps) {
  if (!companies.length) return null;

  // Triplica para garantir loop contínuo sem vazio
  const items = [...companies, ...companies, ...companies];

  return (
    <div className="group relative overflow-hidden">
      {/* Gradiente esquerdo */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#800084] to-transparent" />
      {/* Gradiente direito */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#800084] to-transparent" />

      <div className="flex animate-marquee items-center py-3">
        {items.map((company, index) => (
          <LogoItem key={`${company.id}-${index}`} company={company} />
        ))}
      </div>
    </div>
  );
}
