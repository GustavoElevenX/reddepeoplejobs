import { BriefcaseBusiness, Building2, MapPin, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CompanySummary } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CompanyLogoGrid } from './CompanyLogoGrid';

type HeroSearchProps = {
  companies: CompanySummary[];
  openJobsCount: number;
  loading?: boolean;
};

export function HeroSearch({ companies, openJobsCount, loading = false }: HeroSearchProps) {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('busca', search);
    if (city) params.set('cidade', city);
    navigate(`/vagas?${params.toString()}`);
  }

  return (
    <section className="border-b border-surface-200 bg-white">
      <div className="container-page py-10 lg:py-12">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full bg-redde-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-redde-700">
            Portal de vagas Redde People
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
            Encontre sua próxima oportunidade em empresas parceiras da Redde People
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-ink-500">
            Busque vagas abertas, conheça empresas contratando agora e envie seu currículo sem criar login.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-soft md:grid-cols-[1fr_0.72fr_auto]"
        >
          <Input
            label="O quê?"
            aria-label="Cargo, palavra-chave ou empresa"
            placeholder="Cargo, palavra-chave ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12"
          />
          <Input
            label="Onde?"
            aria-label="Cidade"
            placeholder="Cidade"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-12"
          />
          <Button type="submit" size="lg" className="mt-auto h-12">
            <Search size={18} />
            Buscar vagas
          </Button>
        </form>

        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm text-ink-500">
          <span className="inline-flex items-center gap-2">
            <BriefcaseBusiness size={16} className="text-redde-600" />
            {openJobsCount} vagas abertas
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-surface-200 sm:block" />
          <span className="inline-flex items-center gap-2">
            <Building2 size={16} className="text-redde-600" />
            {companies.length || 6}+ empresas parceiras
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-surface-200 sm:block" />
          <span className="inline-flex items-center gap-2">
            <MapPin size={16} className="text-redde-600" />
            Oportunidades presenciais, híbridas e remotas
          </span>
        </div>

        <div className="mt-9 rounded-2xl border border-surface-200 bg-surface-50 p-4 shadow-card">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-ink-900">Empresas líderes contratando agora</h2>
              <p className="mt-1 text-sm text-ink-500">Clique em uma logo para ver o perfil público e as vagas abertas.</p>
            </div>
            <Link to="/empresas" className="text-sm font-bold text-redde-600 hover:text-redde-700">
              Ver empresas
            </Link>
          </div>
          {loading ? (
            <div className="rounded-lg bg-white p-5 text-sm font-semibold text-ink-500">Carregando empresas...</div>
          ) : (
            <CompanyLogoGrid companies={companies.slice(0, 10)} />
          )}
        </div>
      </div>
    </section>
  );
}
