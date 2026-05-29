import { ArrowDown, Building2, CalendarDays, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApplicationForm } from '../../components/public/ApplicationForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { contractTypeLabels, formatDate, formatLocation, formatSalaryRange, modalityLabels } from '../../lib/formatters';
import { getJobByCompanyAndSlug } from '../../lib/data';
import type { Job } from '../../types';

function TextBlock({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return (
      <ul className="mt-3 grid gap-2 leading-7 text-ink-500">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-redde-500" />
            <span>{line.replace(/^[-•]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="mt-3 whitespace-pre-line leading-7 text-ink-500">{text}</p>;
}

export function JobDetail() {
  const { companySlug, jobSlug } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!companySlug || !jobSlug) return;
      setLoading(true);
      setJob(await getJobByCompanyAndSlug(companySlug, jobSlug));
      setLoading(false);
    }

    void load();
  }, [companySlug, jobSlug]);

  if (loading) {
    return (
      <main className="bg-surface-50 py-10">
        <div className="container-page">
          <LoadingState label="Carregando vaga..." />
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="bg-surface-50 py-10">
        <div className="container-page">
          <EmptyState title="Vaga não encontrada ou encerrada." />
        </div>
      </main>
    );
  }

  const detailBlocks = [
    { title: 'Sobre a vaga', text: job.about_job },
    { title: 'Benefícios', text: job.benefits },
    { title: 'Responsabilidades Da Posição', text: job.responsibilities },
  ];

  const aboutCompany = job.about_company ?? job.company?.about_text;

  const summaryItems = [
    { label: 'Empresa', value: job.company?.name },
    { label: 'Localização', value: job.neighborhood || job.city || job.state ? formatLocation(job.city, job.state, job.neighborhood) : null },
    { label: 'Nível', value: job.seniority },
    { label: 'Escolaridade', value: job.education_level },
    { label: 'Tipo de contrato', value: contractTypeLabels[job.contract_type] },
    { label: 'Modelo de trabalho', value: modalityLabels[job.modality] },
    { label: 'Jornada de trabalho', value: job.work_schedule },
    { label: 'Faixa salarial base', value: formatSalaryRange(job.salary_range) },
    { label: 'Publicada em', value: formatDate(job.created_at) },
    { label: 'Prazo de candidatura', value: job.application_deadline ? formatDate(job.application_deadline) : null },
  ].filter((item) => item.value);

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.42fr]">
        <div className="grid gap-5">
          <Card className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50">
                {job.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="max-h-11 max-w-full object-contain" />
                ) : (
                  <Building2 className="text-redde-500" size={28} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-redde-600">{job.company?.name ?? 'Empresa parceira'}</p>
                <h1 className="mt-2 text-4xl font-black leading-tight text-ink-900">{job.title}</h1>
                <p className="mt-3 flex items-center gap-2 text-ink-500">
                  <MapPin size={17} />
                  {formatLocation(job.city, job.state, job.neighborhood)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge>{modalityLabels[job.modality]}</Badge>
              <Badge>{contractTypeLabels[job.contract_type]}</Badge>
              {formatSalaryRange(job.salary_range) ? <Badge variant="info">{formatSalaryRange(job.salary_range)}</Badge> : null}
              {job.application_deadline ? <Badge variant="warning">Prazo: {formatDate(job.application_deadline)}</Badge> : null}
            </div>
            <a href="#candidatura" className="mt-6 inline-flex">
              <Button size="lg">
                Candidatar-se
                <ArrowDown size={18} />
              </Button>
            </a>
          </Card>

          {job.short_description ? (
            <Card className="p-6">
              <p className="whitespace-pre-line leading-7 text-ink-500">{job.short_description}</p>
            </Card>
          ) : null}

          {detailBlocks.map((block) =>
            block.text ? (
              <Card key={block.title} className="p-6">
                <h2 className="text-2xl font-black text-ink-900">{block.title}</h2>
                <TextBlock text={block.text} />
              </Card>
            ) : null,
          )}

          {job.requirements || job.desirable_requirements ? (
            <Card className="p-6">
              <h2 className="text-2xl font-black text-ink-900">Requisitos Da Posição</h2>
              {job.requirements ? (
                <div className="mt-4">
                  <h3 className="text-base font-black text-ink-900">Requisitos obrigatórios</h3>
                  <TextBlock text={job.requirements} />
                </div>
              ) : null}
              {job.desirable_requirements ? (
                <div className="mt-5">
                  <h3 className="text-base font-black text-ink-900">Requisitos desejáveis</h3>
                  <TextBlock text={job.desirable_requirements} />
                </div>
              ) : null}
            </Card>
          ) : null}

          {aboutCompany ? (
            <Card className="p-6">
              <h2 className="text-2xl font-black text-ink-900">Sobre a Empresa</h2>
              <TextBlock text={aboutCompany} />
            </Card>
          ) : null}
        </div>

        <div className="grid h-fit gap-5 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Resumo</h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-500">
              {summaryItems.map((item) => (
                <p key={item.label} className={item.label === 'Publicada em' ? 'flex items-center gap-2' : undefined}>
                  {item.label === 'Publicada em' ? <CalendarDays size={15} /> : null}
                  <strong className="text-ink-900">{item.label}:</strong> {item.value}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <section id="candidatura" className="container-page mt-6">
        <ApplicationForm job={job} />
      </section>
    </main>
  );
}
