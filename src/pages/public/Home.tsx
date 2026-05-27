import { ArrowRight, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CompanyLogoGrid } from '../../components/public/CompanyLogoGrid';
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
        listCompanies({ publishedOnly: true, featuredOnly: true }),
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
      <HeroSearch />

      <section className="bg-surface-50 py-12">
        <div className="container-page">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-black text-ink-900">Empresas parceiras estão contratando agora</h2>
              <p className="mt-2 max-w-2xl text-ink-500">
                Conheça empresas que estruturam seus processos seletivos com a Redde People.
              </p>
            </div>
            <Link to="/empresas" className="inline-flex items-center gap-2 text-sm font-bold text-redde-600">
              Ver mais empresas
              <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? <LoadingState label="Carregando empresas..." /> : <CompanyLogoGrid companies={companies} />}
        </div>
      </section>

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

      <section id="para-empresas" className="bg-ink-900 py-12 text-white">
        <div className="container-page grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black">{cta?.title ?? 'Sua empresa quer contratar com mais critério?'}</h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/75">
              {cta?.subtitle ??
                'A Redde People estrutura processos de contratação para reduzir improviso, rotatividade e decisões baseadas apenas em currículo.'}
            </p>
          </div>
          <a href={cta?.button_url ?? 'mailto:contato@reddepeople.com.br'}>
            <Button size="lg" className="bg-white text-ink-900 hover:bg-redde-50">
              <Mail size={18} />
              {cta?.button_label ?? 'Falar com a Redde People'}
            </Button>
          </a>
        </div>
      </section>
    </>
  );
}
