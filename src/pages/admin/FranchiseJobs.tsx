import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { InfoJobsExport } from '../../components/admin/InfoJobsExport';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { getCurrentFranchise } from '../../lib/auth';
import { deleteJob, listCompanies, listJobs, upsertJob } from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { jobStatusLabels } from '../../lib/formatters';
import type { Company, Franchise, Job, JobStatus } from '../../types';

export function FranchiseJobs() {
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('all');
  const [status, setStatus] = useState<JobStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const franchiseData = await getCurrentFranchise();
    setFranchise(franchiseData);
    if (franchiseData) {
      const [companyData, jobData] = await Promise.all([
        listCompanies({ franchiseId: franchiseData.id }),
        listJobs({ franchiseId: franchiseData.id }),
      ]);
      setCompanies(companyData);
      setJobs(jobData);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      jobs
        .filter((job) => !search || job.title.toLowerCase().includes(search.toLowerCase()))
        .filter((job) => companyId === 'all' || job.company_id === companyId)
        .filter((job) => status === 'all' || job.status === status),
    [companyId, jobs, search, status],
  );

  async function handleSave(values: JobFormValues) {
    if (!franchise) return;
    await upsertJob({
      ...toJobPayload(values, editing),
      franchise_id: franchise.id,
    });
    setEditing(null);
    setModalOpen(false);
    await load();
  }

  async function changeStatus(job: Job, nextStatus: JobStatus) {
    await upsertJob({ ...job, company: undefined, status: nextStatus });
    await load();
  }

  async function handleDelete(job: Job) {
    if (!window.confirm('Excluir esta vaga e suas candidaturas vinculadas?')) return;
    await deleteJob(job.id);
    await load();
  }

  if (loading) return <LoadingState label="Carregando vagas..." />;
  if (!franchise) return <EmptyState title="Seu usuário não está vinculado a um franqueado." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Vagas</h1>
          <p className="mt-2 text-ink-500">Abra vagas para suas empresas clientes e acompanhe a publicação.</p>
        </div>
        <Button
          disabled={!companies.length}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          Abrir vaga
        </Button>
      </div>

      {!companies.length ? (
        <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">
          Cadastre uma empresa cliente antes de abrir a primeira vaga.
        </div>
      ) : null}

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_220px_220px]">
        <Input
          aria-label="Buscar vaga"
          placeholder="Buscar por cargo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          aria-label="Empresa cliente"
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          options={[
            { label: 'Todas as empresas', value: 'all' },
            ...companies.map((company) => ({ label: company.name, value: company.id })),
          ]}
        />
        <Select
          aria-label="Status da vaga"
          value={status}
          onChange={(event) => setStatus(event.target.value as JobStatus | 'all')}
          options={[
            { label: 'Todos os status', value: 'all' },
            ...Object.entries(jobStatusLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
      </Card>

      {filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((job) => (
            <Card key={job.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-ink-900">{job.title}</h2>
                  <Badge variant={job.status === 'open' ? 'success' : 'neutral'}>
                    {jobStatusLabels[job.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-500">{job.company?.name ?? 'Empresa cliente'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <InfoJobsExport job={job} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(job);
                    setModalOpen(true);
                  }}
                >
                  <Edit size={16} />
                  Editar
                </Button>
                {job.status === 'open' ? (
                  <Button variant="secondary" size="sm" onClick={() => void changeStatus(job, 'closed')}>
                    Encerrar
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => void changeStatus(job, 'open')}>
                    Abrir
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => void handleDelete(job)}>
                  <Trash2 size={16} />
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma vaga encontrada." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar vaga' : 'Abrir vaga'}
        description="Selecione a empresa cliente responsável por esta oportunidade."
        onClose={() => setModalOpen(false)}
      >
        <JobForm job={editing} companies={companies} onSubmit={handleSave} />
      </Modal>
    </div>
  );
}
