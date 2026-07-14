import { BriefcaseBusiness, Building2, MapPin, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CompanySummary } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LogoCarousel } from './LogoCarousel';

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
    <section className="border-b border-[#800084] bg-[#800084]">
      <div className="container-page pb-10 pt-28 lg:pb-12 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
            Portal de vagas Recruitfy
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Encontre vagas em empresas que estão contratando agora.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85">
            O Recruitfy conecta candidatos a empresas parceiras com processos seletivos mais organizados, claros e profissionais.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-soft md:grid-cols-[1fr_0.72fr_auto]"
        >
          <Input
            label="O que?"
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

        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm text-white/85">
          <span className="inline-flex items-center gap-2">
            <BriefcaseBusiness size={16} className="text-white" />
            {openJobsCount} vagas abertas
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/35 sm:block" />
          <span className="inline-flex items-center gap-2">
            <Building2 size={16} className="text-white" />
            {companies.length} empresas parceiras
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/35 sm:block" />
          <span className="inline-flex items-center gap-2">
            <MapPin size={16} className="text-white" />
            Candidatura sem login
          </span>
        </div>
      </div>

      {!loading && companies.length > 0 && (
        <div className="pb-10">
          <LogoCarousel companies={companies} />
        </div>
      )}
    </section>
  );
}
