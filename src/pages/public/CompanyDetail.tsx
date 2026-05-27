import { BriefcaseBusiness, Building2, ExternalLink, MapPin } from 'lucide-react';
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
    async function load() {
      if (!slug) return;
      setLoading(true);
      const companyData = await getCompanyBySlug(slug, true);
      setCompany(companyData);
      if (companyData) setJobs(await listJobs({ companyId: companyData.id, openOnly: true }));
      setLoading(false);
    }

    void load();
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
      <section className="bg-white">
        <div className="h-56 bg-gradient-to-r from-ink-900 via-redde-900 to-redde-600">
          {company.cover_image_url ? (
            <img src={company.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="container-page -mt-16 pb-10">
          <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-surface-200 bg-surface-50 p-4 shadow-sm">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <Building2 size={34} className="text-redde-500" />
                  )}
                </div>
                <div>
                  <Badge>{company.segment ?? 'Empresa parceira'}</Badge>
                  <h1 className="mt-3 text-3xl font-black text-ink-900">{company.name}</h1>
                  <p className="mt-2 flex items-center gap-2 text-ink-500">
                    <MapPin size={17} />
                    {formatLocation(company.city, company.state)}
                  </p>
                </div>
              </div>
              <a href="#vagas">
                <Button size="lg">
                  <BriefcaseBusiness size={18} />
                  Ver vagas abertas
                </Button>
              </a>
            </div>
            {company.short_description ? <p className="mt-5 max-w-3xl leading-7 text-ink-500">{company.short_description}</p> : null}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-5 py-10 lg:grid-cols-[1fr_0.38fr]">
        <div className="grid gap-5">
          {[
            { title: 'Sobre a empresa', text: company.about_text },
            { title: 'Por que trabalhar aqui?', text: company.why_work_here },
            { title: 'Cultura e ambiente', text: company.culture_text },
          ].map((block) => (
            <Card key={block.title} className="p-6">
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
