import { BriefcaseBusiness, Building2, ExternalLink, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { JobCard } from '../../components/public/JobCard';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatLocation } from '../../lib/formatters';
import { getCompanyBySlug, listJobs } from '../../lib/data';
import type { Company, Job } from '../../types';

export function CompanyDetail() {
  const { slug } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const companyData = await getCompanyBySlug(slug, true);
        if (!isMounted) return;

        setCompany(companyData);
        if (companyData) {
          const jobData = await listJobs({ companyId: companyData.id, openOnly: true });
          if (isMounted) setJobs(jobData);
        }
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="bg-surface-50 py-10">
        <div className="container-page">
          <LoadingState label="Carregando empresa..." />
        </div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="bg-surface-50 py-10">
        <div className="container-page">
          <EmptyState title="Empresa não encontrada." />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-surface-50">
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(131,0,234,0.42),transparent_32%),linear-gradient(135deg,#07070A_0%,#21003D_55%,#07070A_100%)]" />
        <div className="absolute inset-0 opacity-20">
          {company.cover_image_url ? (
            <img src={company.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="container-page relative grid gap-8 py-12 lg:grid-cols-[1fr_360px] lg:items-center lg:py-16">
          <div>
            <Badge className="bg-white text-ink-900">{company.segment ?? 'Empresa parceira'}</Badge>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">{company.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-white/75">
              <MapPin size={18} />
              {formatLocation(company.city, company.state)}
            </p>
            {company.short_description ? <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">{company.short_description}</p> : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#vagas">
                <Button size="lg">
                  <BriefcaseBusiness size={18} />
                  Ver vagas abertas
                </Button>
              </a>
              {company.website_url ? (
                <a href={company.website_url} target="_blank" rel="noreferrer">
                  <Button size="lg" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                    Site da empresa
                    <ExternalLink size={17} />
                  </Button>
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-6 text-ink-900 shadow-soft">
            <div className="flex h-28 items-center justify-center rounded-xl bg-surface-50 p-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="max-h-20 max-w-full object-contain" />
              ) : (
                <Building2 size={38} className="text-redde-500" />
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-50 p-4">
                <BriefcaseBusiness className="text-redde-600" size={20} />
                <p className="mt-2 text-2xl font-black">{jobs.length}</p>
                <p className="text-xs font-semibold text-ink-500">Vagas abertas</p>
              </div>
              <div className="rounded-lg bg-surface-50 p-4">
                <UsersRound className="text-redde-600" size={20} />
                <p className="mt-2 text-2xl font-black">{company.employees_range ?? '-'}</p>
                <p className="text-xs font-semibold text-ink-500">Tamanho</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-redde-50 p-4 text-sm leading-6 text-ink-700">
              <ShieldCheck className="mt-0.5 shrink-0 text-redde-600" size={18} />
              Processo seletivo estruturado com apoio do People Jobs.
            </div>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-5 py-10 lg:grid-cols-[1fr_0.34fr]">
        <div className="grid gap-5">
          {[
            { title: 'Sobre a empresa', text: company.about_text },
            { title: 'Por que trabalhar aqui?', text: company.why_work_here },
            { title: 'Cultura e ambiente', text: company.culture_text },
          ].map((block) => (
            <Card key={block.title} className="p-7">
              <h2 className="text-2xl font-black text-ink-900">{block.title}</h2>
              <p className="mt-3 leading-7 text-ink-500">{block.text ?? 'Texto editável pelo painel administrativo.'}</p>
            </Card>
          ))}
        </div>
        <Card className="h-fit p-6">
          <h2 className="text-xl font-black text-ink-900">Informações</h2>
          <div className="mt-4 grid gap-3 text-sm text-ink-500">
            <p>
              <strong className="text-ink-900">Segmento:</strong> {company.segment ?? '-'}
            </p>
            <p>
              <strong className="text-ink-900">Tamanho:</strong> {company.employees_range ?? '-'}
            </p>
            {company.website_url ? (
              <a className="inline-flex items-center gap-2 font-semibold text-redde-600" href={company.website_url} target="_blank" rel="noreferrer">
                Site da empresa
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>
        </Card>
      </section>

      <section id="vagas" className="container-page pb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-black text-ink-900">Vagas abertas</h2>
          <p className="mt-2 text-ink-500">Oportunidades disponíveis nesta empresa parceira.</p>
        </div>
        {jobs.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState title="Esta empresa ainda não possui vagas abertas no momento." />
        )}
        <Link to="/vagas" className="mt-6 inline-flex">
          <Button variant="secondary">Ver todas as vagas</Button>
        </Link>
      </section>
    </main>
  );
}
