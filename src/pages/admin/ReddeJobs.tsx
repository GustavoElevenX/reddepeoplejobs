import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { deleteJob, listCompanies, listJobs, upsertJob } from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { contractTypeLabels, formatLocation, jobStatusLabels, modalityLabels } from '../../lib/formatters';
import type { Company, Job, JobStatus } from '../../types';

export function ReddeJobs() {
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
    const [companyData, jobData] = await Promise.all([listCompanies(), listJobs()]);
    setCompanies(companyData);
    setJobs(jobData);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return jobs
      .filter((job) => !search || job.title.toLowerCase().includes(search.toLowerCase()))
      .filter((job) => companyId === 'all' || job.company_id === companyId)
      .filter((job) => status === 'all' || job.status === status);
  }, [companyId, jobs, search, status]);

  async function handleSave(values: JobFormValues) {
    await upsertJob(toJobPayload(values, editing));
    setEditing(null);
    setModalOpen(false);
    await load();
  }

  async function handleArchive(job: Job) {
    const jobPayload = { ...job };
    delete jobPayload.company;
    await upsertJob({
      ...jobPayload,
      status: 'archived',
    });
    await load();
  }

  async function handleDelete(job: Job) {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta vaga? Essa ação também removerá as candidaturas vinculadas a ela.',
    );
    if (!confirmed) return;

    await deleteJob(job.id);
    await load();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Vagas</h1>
          <p className="mt-2 text-ink-500">Gerencie vagas de todas as empresas parceiras.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} />
          Criar vaga
        </Button>
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_220px_220px]">
        <Input placeholder="Buscar por título" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select
          aria-label="Empresa"
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          options={[{ label: 'Todas as empresas', value: 'all' }, ...companies.map((company) => ({ label: company.name, value: company.id }))]}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as JobStatus | 'all')}
          options={[
            { label: 'Todos os status', value: 'all' },
            { label: 'Aberta', value: 'open' },
            { label: 'Pausada', value: 'paused' },
            { label: 'Encerrada', value: 'closed' },
            { label: 'Arquivada', value: 'archived' },
            { label: 'Rascunho', value: 'draft' },
          ]}
        />
      </Card>

      {loading ? (
        <LoadingState label="Carregando vagas..." />
      ) : filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((job) => (
            <Card key={job.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-ink-900">{job.title}</h2>
                  <Badge variant={job.status === 'open' ? 'success' : 'neutral'}>{jobStatusLabels[job.status]}</Badge>
                  {job.is_featured ? <Badge variant="info">Destaque</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {job.company?.name ?? 'Empresa'} · {formatLocation(job.city, job.state)} · {modalityLabels[job.modality]} ·{' '}
                  {contractTypeLabels[job.contract_type]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                <Button variant="danger" size="sm" onClick={() => handleArchive(job)}>
                  Arquivar
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(job)}>
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
        title={editing ? 'Editar vaga' : 'Criar vaga'}
        description="A vaga só aparece publicamente quando estiver com status Aberta."
        onClose={() => setModalOpen(false)}
      >
        <JobForm job={editing} companies={companies} onSubmit={handleSave} />
      </Modal>
    </div>
  );
}
