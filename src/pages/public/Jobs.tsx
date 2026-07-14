import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { JobCard } from '../../components/public/JobCard';
import { LoadingState } from '../../components/public/LoadingState';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { listJobs } from '../../lib/data';
import type { Job, JobContractType, JobModality } from '../../types';

export function Jobs() {
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState(params.get('busca') ?? '');
  const [city, setCity] = useState(params.get('cidade') ?? '');
  const [modality, setModality] = useState<JobModality | 'all'>('all');
  const [contractType, setContractType] = useState<JobContractType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const jobData = await listJobs({ openOnly: true });
        if (isMounted) setJobs(jobData);
      } catch (error) {
        console.error('Erro ao carregar vagas:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return jobs
      .filter((job) => {
        if (!search) return true;
        return [
          job.title,
          job.company?.name,
          job.company?.segment,
          job.short_description,
          job.description,
          job.requirements,
          job.responsibilities,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      })
      .filter(
        (job) =>
          !city ||
          job.city?.toLowerCase().includes(city.toLowerCase()) ||
          job.neighborhood?.toLowerCase().includes(city.toLowerCase()),
      )
      .filter((job) => modality === 'all' || job.modality === modality)
      .filter((job) => contractType === 'all' || job.contract_type === contractType);
  }, [jobs, search, city, modality, contractType]);

  return (
    <main className="bg-surface-50 py-10">
      <div className="container-page">
        <div className="mb-8">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-redde-600">Vagas</span>
          <h1 className="mt-2 text-4xl font-black text-ink-900">Vagas abertas</h1>
          <p className="mt-3 max-w-2xl text-ink-500">
            Encontre oportunidades abertas em empresas parceiras do Recruitfy e candidate-se sem criar login.
          </p>
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-card md:grid-cols-4">
          <Input
            aria-label="Buscar vaga"
            placeholder="Cargo, palavra-chave ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            aria-label="Cidade ou bairro"
            placeholder="Cidade ou bairro"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <Select
            aria-label="Modalidade"
            value={modality}
            onChange={(event) => setModality(event.target.value as JobModality | 'all')}
            options={[
              { label: 'Todas modalidades', value: 'all' },
              { label: 'Presencial', value: 'presencial' },
              { label: 'Híbrido', value: 'hibrido' },
              { label: 'Remoto', value: 'remoto' },
            ]}
          />
          <Select
            aria-label="Tipo"
            value={contractType}
            onChange={(event) => setContractType(event.target.value as JobContractType | 'all')}
            options={[
              { label: 'Todos os tipos', value: 'all' },
              { label: 'CLT', value: 'clt' },
              { label: 'PJ', value: 'pj' },
              { label: 'Estágio', value: 'estagio' },
              { label: 'Temporário', value: 'temporario' },
              { label: 'Freelancer', value: 'freelancer' },
            ]}
          />
        </div>

        {loading ? (
          <LoadingState label="Carregando vagas..." />
        ) : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma vaga aberta encontrada com esses filtros." />
        )}
      </div>
    </main>
  );
}
