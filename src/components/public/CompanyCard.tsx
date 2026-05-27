import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatLocation } from '../../lib/formatters';
import type { Company } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function CompanyCard({ company }: { company: Company }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = company.logo_url || `/imagens/clientes/${company.slug}.png`;

  return (
    <Card className="flex h-full flex-col p-5 transition hover:-translate-y-1 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 p-2">
          {!failed ? (
            <img src={imageUrl} alt={company.name} className="max-h-12 max-w-full object-contain" onError={() => setFailed(true)} />
          ) : (
            <Building2 className="text-redde-500" size={26} />
          )}
        </div>
        {company.segment ? <Badge>{company.segment}</Badge> : null}
      </div>
      <h3 className="mt-4 text-lg font-black text-ink-900">{company.name}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
        <MapPin size={15} />
        {formatLocation(company.city, company.state)}
      </p>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-ink-500">{company.short_description}</p>
      <Link to={`/empresa/${company.slug}`} className="mt-5">
        <Button variant="secondary" className="w-full">
          Ver empresa
          <ArrowRight size={16} />
        </Button>
      </Link>
    </Card>
  );
}
