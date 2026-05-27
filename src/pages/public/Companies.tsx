import { useEffect, useMemo, useState } from 'react';
import { CompanyCard } from '../../components/public/CompanyCard';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Input } from '../../components/ui/Input';
import { listCompanies } from '../../lib/data';
import type { Company } from '../../types';

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [segment, setSegment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setCompanies(await listCompanies({ publishedOnly: true }));
      setLoading(false);
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    return companies
      .filter((company) => !search || company.name.toLowerCase().includes(search.toLowerCase()))
      .filter((company) => !city || company.city?.toLowerCase().includes(city.toLowerCase()))
      .filter((company) => !segment || company.segment?.toLowerCase().includes(segment.toLowerCase()));
  }, [companies, search, city, segment]);

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page">
        <div className="mb-8">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-redde-600">Empresas</span>
          <h1 className="mt-2 text-4xl font-black text-ink-900">Empresas parceiras</h1>
          <p className="mt-3 max-w-2xl text-ink-500">
            Busque por nome, cidade ou segmento e conheça empresas com processos seletivos estruturados pela Redde People.
          </p>
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-card md:grid-cols-3">
          <Input
            aria-label="Buscar empresa"
            placeholder="Buscar por empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            aria-label="Filtrar cidade"
            placeholder="Cidade"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <Input
            aria-label="Filtrar segmento"
            placeholder="Segmento"
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
          />
        </div>

        {loading ? (
          <LoadingState label="Carregando empresas..." />
        ) : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma empresa encontrada." text="Ajuste a busca ou os filtros para tentar novamente." />
        )}
      </div>
    </main>
  );
}
