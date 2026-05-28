import { ArrowRight, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { HeroSearch } from '../../components/public/HeroSearch';
import { JobCard } from '../../components/public/JobCard';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { listCompanies, listJobs, getSiteContent } from '../../lib/data';
import type { Company, Job, SiteContent } from '../../types';

export function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cta, setCta] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [companyData, jobData, ctaData] = await Promise.all([
        listCompanies({ publishedOnly: true }),
        listJobs({ openOnly: true, limit: 6 }),
        getSiteContent('home_company_cta'),
      ]);
      setCompanies(companyData);
      setJobs(jobData);
      setCta(ctaData);
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <>
      <HeroSearch companies={companies} openJobsCount={jobs.length} loading={loading} />

      <section className="bg-white py-12">
        <div className="container-page">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-black text-ink-900">Vagas abertas recentemente</h2>
              <p className="mt-2 max-w-2xl text-ink-500">Veja as últimas oportunidades publicadas por empresas parceiras.</p>
            </div>
            <Link to="/vagas" className="inline-flex items-center gap-2 text-sm font-bold text-redde-600">
              Ver todas as vagas
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando vagas..." />
          ) : jobs.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma vaga aberta encontrada." />
          )}
        </div>
      </section>

      <section id="para-empresas" className="bg-[#8300ea] py-12 text-white">
        <div className="container-page grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="text-sm font-black uppercase tracking-[0.14em] text-white/60">Para empresas</span>
            <h2 className="mt-3 text-3xl font-black">{cta?.title ?? 'Publique vagas com mais organização'}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/75">
              {cta?.subtitle ??
                'Publique vagas, organize candidaturas e acompanhe candidatos em um só lugar. Com o People Jobs, sua empresa ganha uma página própria, vagas públicas e um painel para visualizar currículos recebidos.'}
            </p>
            <div className="mt-5 grid gap-2 text-sm font-semibold text-white/80 sm:grid-cols-3">
              <span>Página própria da empresa</span>
              <span>Vagas públicas</span>
              <span>Painel de candidaturas</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={cta?.button_url ?? 'mailto:contato@peoplejobs.com.br'} className="inline-flex">
              <Button size="lg" variant="secondary" className="border-white bg-white text-ink-900 hover:bg-redde-50">
                <Mail size={18} />
                {cta?.button_label ?? 'Falar com a People Jobs'}
              </Button>
            </a>
            <Link to="/admin/login" className="inline-flex">
              <Button size="lg" variant="secondary" className="border-white bg-white text-[#8300ea] hover:bg-redde-50">
                Acessar painel
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
