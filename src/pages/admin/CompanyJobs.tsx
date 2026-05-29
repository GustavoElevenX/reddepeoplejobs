import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { deleteJob, getCompanyById, listJobs, upsertJob } from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { jobStatusLabels } from '../../lib/formatters';
import type { Company, CompanyUserAccess, Job } from '../../types';

export function CompanyJobs() {
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const accessData = await getCompanyAccessForCurrentUser();
    setAccess(accessData);
    if (accessData) {
      const [companyData, jobData] = await Promise.all([getCompanyById(accessData.company_id), listJobs({ companyId: accessData.company_id })]);
      setCompany(companyData);
      setJobs(jobData);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(values: JobFormValues) {
    if (!access?.can_manage_jobs) return;
    await upsertJob(toJobPayload(values, editing));
    setEditing(null);
    setModalOpen(false);
    await load();
  }

  async function changeStatus(job: Job, status: Job['status']) {
    const jobPayload = { ...job };
    delete jobPayload.company;
    await upsertJob({
      ...jobPayload,
      status,
    });
    await load();
  }

  async function handleDelete(job: Job) {
    if (!access?.can_manage_jobs || job.company_id !== access.company_id) return;

    const confirmed = window.confirm(
      'Tem certeza que deseja excluir esta vaga? Essa ação também removerá as candidaturas vinculadas a ela.',
    );
    if (!confirmed) return;

    await deleteJob(job.id);
    await load();
  }

  if (loading) return <LoadingState label="Carregando vagas..." />;
  if (!access || !company) return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;
  if (!access.can_manage_jobs) return <EmptyState title="Seu usuário não tem permissão para gerenciar vagas." />;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black text-ink-900">Vagas da empresa</h1>
          <p className="mt-2 text-ink-500">Crie, edite, pause, encerre ou arquive vagas da {company.name}.</p>
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

      {jobs.length ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-ink-900">{job.title}</h2>
                  <Badge variant={job.status === 'open' ? 'success' : 'neutral'}>{jobStatusLabels[job.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-500">{job.short_description}</p>
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
                <Button variant="secondary" size="sm" onClick={() => changeStatus(job, 'paused')}>
                  Pausar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => changeStatus(job, 'closed')}>
                  Encerrar
                </Button>
                <Button variant="danger" size="sm" onClick={() => changeStatus(job, 'archived')}>
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
        <EmptyState title="Nenhuma vaga cadastrada." />
      )}

      <Modal open={modalOpen} title={editing ? 'Editar vaga' : 'Criar vaga'} onClose={() => setModalOpen(false)}>
        <JobForm
          job={editing}
          companies={[company]}
          fixedCompanyId={company.id}
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
