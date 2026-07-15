import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartHandshake,
  LockKeyhole,
  Mail,
  Route,
  Search,
  Send,
  ShieldCheck,
  Timer,
  UserRoundCheck,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompanyHiringGrid } from '../../components/public/CompanyHiringGrid';
import { EmptyState } from '../../components/public/EmptyState';
import { HeroSearch } from '../../components/public/HeroSearch';
import { JobCard } from '../../components/public/JobCard';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { getSiteContent, listCompanies, listJobs, listPublicCompanyResponseMetrics } from '../../lib/data';
import { getJobTransparency, isEntryLevelJob } from '../../lib/jobTransparency';
import { formatDate } from '../../lib/formatters';
import type { Company, CompanyResponseMetric, Job, SiteContent } from '../../types';

const areaDefinitions = [
  {
    label: 'Comercial e Vendas',
    query: 'comercial',
    terms: ['comercial', 'vendas', 'vendedor', 'consultor', 'representante'],
  },
  {
    label: 'Administrativo',
    query: 'administrativo',
    terms: ['administrativo', 'administração', 'assistente', 'auxiliar administrativo', 'financeiro'],
  },
  {
    label: 'Atendimento',
    query: 'atendimento',
    terms: ['atendimento', 'atendente', 'recepção', 'recepcionista', 'cliente'],
  },
  {
    label: 'Operacional',
    query: 'operacional',
    terms: ['operacional', 'operação', 'auxiliar', 'produção', 'estoque'],
  },
  {
    label: 'Alimentação',
    query: 'alimentação',
    terms: ['alimentação', 'cozinha', 'cozinheiro', 'restaurante', 'lanchonete', 'barista'],
  },
  {
    label: 'Logística',
    query: 'logística',
    terms: ['logística', 'entrega', 'motorista', 'expedição', 'almoxarifado'],
  },
  {
    label: 'Serviços Gerais',
    query: 'serviços gerais',
    terms: ['serviços gerais', 'limpeza', 'manutenção', 'zeladoria'],
  },
  {
    label: 'Estágio e Jovem Aprendiz',
    query: 'estágio',
    terms: ['estágio', 'estagiário', 'jovem aprendiz', 'aprendiz'],
  },
];

function getJobSearchText(job: Job) {
  return [
    job.title,
    job.short_description,
    job.description,
    job.requirements,
    job.responsibilities,
    job.company?.name,
    job.company?.segment,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function countJobsByCompany(jobs: Job[]) {
  return jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.company_id] = (acc[job.company_id] ?? 0) + 1;
    return acc;
  }, {});
}

function getTopCities(jobs: Job[]) {
  const counts = jobs.reduce<Record<string, number>>((acc, job) => {
    if (!job.city) return acc;
    acc[job.city] = (acc[job.city] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([city, count]) => ({ city, count }));
}

function settle<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  );
}

export function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [responseMetrics, setResponseMetrics] = useState<CompanyResponseMetric[]>([]);
  const [cta, setCta] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      const [companyData, jobData, ctaData, metricsData] = await Promise.all([
        settle(listCompanies({ publishedOnly: true })),
        settle(listJobs({ openOnly: true })),
        settle(getSiteContent('home_company_cta')),
        settle(listPublicCompanyResponseMetrics()),
      ]);

      if (!isMounted) return;

      if (companyData.status === 'fulfilled') {
        setCompanies(companyData.value);
      } else {
        console.error('Erro ao carregar empresas da home:', companyData.reason);
      }

      if (jobData.status === 'fulfilled') {
        setJobs(jobData.value);
      } else {
        console.error('Erro ao carregar vagas da home:', jobData.reason);
      }

      if (ctaData.status === 'fulfilled') {
        setCta(ctaData.value);
      } else {
        console.error('Erro ao carregar CTA da home:', ctaData.reason);
      }

      if (metricsData.status === 'fulfilled') {
        setResponseMetrics(metricsData.value);
      } else {
        console.error('Erro ao carregar indicadores de retorno:', metricsData.reason);
      }

      setLoading(false);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const jobsByCompany = useMemo(() => countJobsByCompany(jobs), [jobs]);
  const companiesHiring = useMemo(
    () =>
      [...companies]
        .filter((company) => (jobsByCompany[company.id] ?? 0) > 0)
        .sort((a, b) => (jobsByCompany[b.id] ?? 0) - (jobsByCompany[a.id] ?? 0))
        .slice(0, 8),
    [companies, jobsByCompany],
  );
  const transparentJobs = useMemo(
    () => [...jobs].sort((a, b) => getJobTransparency(b).score - getJobTransparency(a).score).slice(0, 6),
    [jobs],
  );
  const entryLevelJobs = useMemo(() => jobs.filter(isEntryLevelJob).slice(0, 3), [jobs]);
  const companiesWithResponse = useMemo(
    () => responseMetrics
      .map((metric) => ({ metric, company: companies.find((company) => company.id === metric.company_id) }))
      .filter((item): item is { metric: CompanyResponseMetric; company: Company } => Boolean(item.company))
      .sort((a, b) => b.metric.response_rate - a.metric.response_rate)
      .slice(0, 4),
    [companies, responseMetrics],
  );
  const areas = useMemo(
    () =>
      areaDefinitions
        .map((area) => ({
          ...area,
          count: jobs.filter((job) => area.terms.some((term) => getJobSearchText(job).includes(term))).length,
        }))
        .filter((area) => area.count > 0),
    [jobs],
  );
  const popularSearches = useMemo(() => {
    const cityLinks = getTopCities(jobs).map(({ city, count }) => ({
      label: `Vagas em ${city}`,
      to: `/vagas?cidade=${encodeURIComponent(city)}`,
      count,
    }));
    const areaLinks = areas.slice(0, 4).map((area) => ({
      label: `Vagas em ${area.label}`,
      to: `/vagas?busca=${encodeURIComponent(area.query)}`,
      count: area.count,
    }));

    return [...cityLinks, ...areaLinks].slice(0, 7);
  }, [areas, jobs]);

  function handleTracking(event: FormEvent) {
    event.preventDefault();
    const value = trackingCode.trim().replace(/\/+$/, '');
    const token = value.split('/').pop();
    if (token) navigate(`/acompanhar/${encodeURIComponent(token)}`);
  }

  return (
    <>
      <HeroSearch companies={companies} loading={loading} />

      <section className="bg-white py-10">
        <div className="container-page">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black text-ink-900">Por que buscar pela Recruitify?</h2>
            <p className="mt-2 text-ink-500">Informação clara antes, durante e depois da candidatura.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Vagas verificadas', text: 'Oportunidades publicadas por empresas parceiras.' },
              { icon: ClipboardList, title: 'Salário transparente', text: 'Identifique rapidamente quais vagas informam remuneração.' },
              { icon: Send, title: 'Candidatura rápida', text: 'Envie seu currículo em poucos minutos e sem criar conta.' },
              { icon: Route, title: 'Acompanhamento real', text: 'Consulte cada etapa por um link individual e seguro.' },
            ].map((benefit) => (
              <div key={benefit.title} className="rounded-xl border border-surface-200 bg-surface-50 p-5">
                <benefit.icon className="text-redde-600" size={25} />
                <h3 className="mt-4 font-black text-ink-900">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-50 py-12">
        <div className="container-page">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-black text-ink-900">Empresas verificadas contratando agora</h2>
              <p className="mt-2 max-w-2xl text-ink-500">
                Conheça empresas com vagas abertas e processos seletivos acompanhados pela Recruitify.
              </p>
            </div>
            <Link to="/empresas" className="inline-flex items-center gap-2 text-sm font-bold text-redde-600">
              Ver empresas
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando empresas..." />
          ) : companiesHiring.length ? (
            <CompanyHiringGrid companies={companiesHiring} jobs={jobs} />
          ) : (
            <EmptyState title="Nenhuma empresa com vaga aberta no momento." />
          )}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container-page">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-black text-ink-900">Vagas transparentes em destaque</h2>
              <p className="mt-2 max-w-2xl text-ink-500">
                Compare o nível de informação publicado antes de decidir onde se candidatar.
              </p>
            </div>
            <Link to="/vagas" className="inline-flex items-center gap-2 text-sm font-bold text-redde-600">
              Ver todas as vagas
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Carregando vagas..." />
          ) : transparentJobs.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {transparentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma vaga aberta encontrada." />
          )}
        </div>
      </section>

      {companiesWithResponse.length > 0 ? (
        <section className="bg-surface-50 py-12">
          <div className="container-page">
            <div className="mb-7">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-redde-600">Compromisso mensurável</span>
              <h2 className="mt-2 text-3xl font-black text-ink-900">Empresas que dão retorno</h2>
              <p className="mt-2 max-w-2xl text-ink-500">Indicadores calculados com processos seletivos reais concluídos na plataforma.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {companiesWithResponse.map(({ company, metric }) => (
                <Link key={company.id} to={`/empresa/${company.slug}`} className="rounded-xl border border-surface-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
                  <HeartHandshake className="text-redde-600" size={27} />
                  <h3 className="mt-4 text-lg font-black text-ink-900">{company.name}</h3>
                  <p className="mt-3 text-2xl font-black text-emerald-700">{metric.response_rate}% com retorno</p>
                  {metric.average_response_days !== null ? (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink-500"><Timer size={15} />Prazo médio: {metric.average_response_days} {metric.average_response_days === 1 ? 'dia' : 'dias'}</p>
                  ) : null}
                  {metric.last_process_completed_at ? (
                    <p className="mt-2 text-xs text-ink-400">Último processo concluído em {formatDate(metric.last_process_completed_at)}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {entryLevelJobs.length > 0 ? (
        <section className="bg-white py-12">
          <div className="container-page">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black text-ink-900">Vagas para começar agora</h2>
                <p className="mt-2 text-ink-500">Primeiro emprego, estágio, jovem aprendiz e oportunidades sem experiência.</p>
              </div>
              <Link to="/vagas?busca=primeiro%20emprego" className="inline-flex items-center gap-2 text-sm font-bold text-redde-600">Explorar oportunidades <ArrowRight size={16} /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entryLevelJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-[#f6edf7] py-12">
        <div className="container-page grid gap-8 rounded-2xl border border-redde-100 bg-white p-6 shadow-card lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:p-8">
          <div>
            <Route className="text-redde-600" size={32} />
            <h2 className="mt-4 text-3xl font-black text-ink-900">Acompanhe sua candidatura</h2>
            <p className="mt-3 leading-7 text-ink-500">Cole o código ou o link seguro recebido ao finalizar a candidatura. Nenhuma conta é necessária.</p>
          </div>
          <form onSubmit={handleTracking} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="tracking-code">Código ou link de acompanhamento</label>
            <input id="tracking-code" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} required placeholder="Código ou link de acompanhamento" className="h-12 rounded-lg border border-surface-300 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-redde-500 focus:ring-2 focus:ring-redde-100" />
            <Button type="submit" size="lg"><Search size={17} />Consultar</Button>
          </form>
        </div>
      </section>

      {areas.length > 0 ? (
        <section className="bg-surface-50 py-12">
          <div className="container-page">
            <div className="mb-7">
              <h2 className="text-3xl font-black text-ink-900">Áreas com oportunidades</h2>
              <p className="mt-2 max-w-2xl text-ink-500">
                Navegue pelas áreas que têm vagas abertas agora na Recruitify.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {areas.map((area) => (
                <Link
                  key={area.label}
                  to={`/vagas?busca=${encodeURIComponent(area.query)}`}
                  className="rounded-lg border border-surface-200 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
                >
                  <p className="text-base font-black text-ink-900">{area.label}</p>
                  <p className="mt-2 text-sm font-semibold text-redde-600">
                    {area.count} {area.count === 1 ? 'vaga aberta' : 'vagas abertas'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="como-funciona" className="bg-white py-12">
        <div className="container-page">
          <div className="mb-7">
            <h2 className="text-3xl font-black text-ink-900">Como funciona a Recruitify</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Search,
                title: 'Encontre uma vaga',
                text: 'Busque oportunidades por cargo, empresa ou cidade.',
              },
              {
                icon: ClipboardList,
                title: 'Veja os detalhes',
                text: 'Confira requisitos, benefícios, localidade e informações da empresa.',
              },
              {
                icon: Send,
                title: 'Envie seu currículo',
                text: 'Candidate-se sem criar conta, de forma simples e segura.',
              },
              {
                icon: Clock3,
                title: 'Acompanhe o processo',
                text: 'Consulte o avanço da candidatura por um link individual e seguro.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-surface-200 bg-surface-50 p-6">
                <item.icon className="text-redde-600" size={28} />
                <h3 className="mt-4 text-lg font-black text-ink-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="para-empresas" className="bg-[#800084] py-12 text-white">
        <div className="container-page grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="text-sm font-black uppercase tracking-[0.14em] text-white/60">Para empresas</span>
            <h2 className="mt-3 text-3xl font-black">
              {cta?.title ?? 'Sua empresa quer contratar com mais organização?'}
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/75">
              {cta?.subtitle ??
                'A Recruitify permite que empresas parceiras publiquem vagas, tenham uma página própria e acompanhem candidaturas em um painel simples.'}
            </p>
            <div className="mt-5 grid gap-2 text-sm font-semibold text-white/85 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'Página pública da empresa',
                'Vagas abertas em ambiente profissional',
                'Candidaturas centralizadas',
                'Currículos organizados',
                'Processo mais claro para o candidato',
              ].map((benefit) => (
                <span key={benefit} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {benefit}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={cta?.button_url ?? 'mailto:contato@recruitfy.com.br'} className="inline-flex">
              <Button size="lg" variant="secondary" className="border-white bg-white text-ink-900 hover:bg-redde-50">
                <Mail size={18} />
                {cta?.button_label ?? 'Falar com a Recruitify'}
              </Button>
            </a>
            <Link to="/admin/login" className="inline-flex">
              <Button size="lg" variant="secondary" className="border-white bg-white text-[#800084] hover:bg-redde-50">
                Acessar painel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="seguranca-lgpd" className="bg-white py-10">
        <div className="container-page grid gap-3 md:grid-cols-4">
          {[
            { icon: LockKeyhole, text: 'Ambiente seguro para envio de currículo' },
            { icon: Building2, text: 'Empresas parceiras verificadas' },
            { icon: ShieldCheck, text: 'Dados tratados conforme LGPD' },
            { icon: UserRoundCheck, text: 'Acompanhamento sem criar conta' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 p-4">
              <item.icon className="shrink-0 text-redde-600" size={22} />
              <p className="text-sm font-bold leading-5 text-ink-700">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {popularSearches.length > 0 ? (
        <section className="bg-surface-50 py-12">
          <div className="container-page">
            <div className="mb-6">
              <h2 className="text-3xl font-black text-ink-900">Buscas populares</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {popularSearches.map((searchItem) => (
                <Link
                  key={searchItem.label}
                  to={searchItem.to}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-3 text-sm font-bold text-ink-700 shadow-card transition hover:-translate-y-0.5 hover:text-redde-600 hover:shadow-soft"
                >
                  <BriefcaseBusiness size={16} />
                  {searchItem.label}
                  <span className="rounded-full bg-redde-50 px-2 py-0.5 text-xs text-redde-600">{searchItem.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
