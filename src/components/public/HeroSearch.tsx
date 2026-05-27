import { Building2, FileCheck2, Search, UsersRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function HeroSearch() {
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
    <section className="bg-white">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit rounded-full bg-redde-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-redde-700">
            Portal de oportunidades Redde People
          </span>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-ink-900 sm:text-5xl">
            Encontre oportunidades em empresas que contratam com mais critério.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-500">
            Veja vagas abertas em empresas parceiras da Redde People e envie seu currículo de forma simples,
            rápida e segura.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-soft md:grid-cols-[1fr_0.72fr_auto]"
          >
            <Input
              aria-label="Cargo, palavra-chave ou empresa"
              placeholder="Cargo, palavra-chave ou empresa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Input
              aria-label="Cidade"
              placeholder="Cidade"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <Button type="submit" size="lg">
              <Search size={18} />
              Buscar vagas
            </Button>
          </form>

          <Link to="/empresas" className="mt-4 inline-flex w-fit text-sm font-bold text-redde-600 hover:text-redde-700">
            Ver empresas parceiras
          </Link>
        </div>

        <div className="grid content-center gap-4">
          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5 shadow-card">
            <div className="grid gap-3">
              {[
                { icon: Building2, label: 'Empresas parceiras', value: '6+ perfis públicos' },
                { icon: UsersRound, label: 'Vagas abertas', value: 'Processos ativos' },
                { icon: FileCheck2, label: 'Currículo enviado com segurança', value: 'Upload privado' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-redde-50 text-redde-600">
                      <Icon size={21} />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-ink-900">{item.label}</span>
                      <span className="block text-sm text-ink-500">{item.value}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
