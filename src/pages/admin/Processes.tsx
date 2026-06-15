import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { ProcessListTable } from '../../components/admin/ProcessListTable';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { listApplications, listCompanies, listJobs, upsertJob } from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { processStatusLabels } from '../../lib/formatters';
import { useAdminProfile } from '../../routes/ProtectedRoute';
import type { Application, Company, CompanyUserAccess, Job, ProcessStatus } from '../../types';

export type ProcessScope = 'master' | 'franchise' | 'company';

type ProcessesProps = {
  scope: ProcessScope;
};

const detailBasePaths: Record<ProcessScope, string> = {
  master: '/admin/processos',
  franchise: '/franqueado/processos',
  company: '/empresa/processos',
};

export function Processes({ scope }: ProcessesProps) {
  const profile = useAdminProfile();
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('all');
  const [processStatus, setProcessStatus] = useState<ProcessStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (scope === 'company') {
        const accessData = await getCompanyAccessForCurrentUser();
        setAccess(accessData);
        if (!accessData) {
          setCompanies([]);
          setJobs([]);
          setApplications([]);
          return;
        }
        const [companyData, jobData, applicationData] = await Promise.all([
          listCompanies().then((items) => items.filter((company) => company.id === accessData.company_id)),
          listJobs({ companyId: accessData.company_id }),
          listApplications({ companyId: accessData.company_id }),
        ]);
        setCompanies(companyData);
        setJobs(jobData);
        setApplications(applicationData);
        return;
      }

      const franchiseId = scope === 'franchise' ? profile.franchise_id ?? undefined : undefined;
      const [companyData, jobData, applicationData] = await Promise.all([
        listCompanies(franchiseId ? { franchiseId } : undefined),
        listJobs(franchiseId ? { franchiseId } : undefined),
        listApplications(franchiseId ? { franchiseId } : undefined),
      ]);
      setCompanies(companyData);
      setJobs(jobData);
      setApplications(applicationData);
    } finally {
      setLoading(false);
    }
  }, [profile.franchise_id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      jobs
        .filter((job) => !search || job.title.toLowerCase().includes(search.toLowerCase()))
        .filter((job) => companyId === 'all' || job.company_id === companyId)
        .filter((job) => processStatus === 'all' || job.process_status === processStatus),
    [companyId, jobs, processStatus, search],
  );

  const canManage = scope !== 'company' || Boolean(access?.can_manage_jobs);
  const fixedCompanyId = scope === 'company' ? access?.company_id : undefined;

  async function handleSave(values: JobFormValues) {
    const payload = toJobPayload(values, editing);
    await upsertJob({
      ...payload,
      franchise_id: scope === 'franchise' ? profile.franchise_id : editing?.franchise_id,
    });
    setEditing(null);
    setModalOpen(false);
    await load();
  }

  if (loading) return <LoadingState label="Carregando processos seletivos..." />;
  if (scope === 'franchise' && !profile.franchise_id) {
    return <EmptyState title="Seu usuário não está vinculado a um franqueado." />;
  }
  if (scope === 'company' && !access) {
    return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Recrutamento e seleção</p>
          <h1 className="mt-1 text-3xl font-black text-ink-900">Processos seletivos</h1>
          <p className="mt-2 text-ink-500">
            Acompanhe requisições, candidatos, etapas e contratações em um único fluxo.
          </p>
        </div>
        {canManage ? (
          <Button
            disabled={!companies.length}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} />
            Novo processo
          </Button>
        ) : null}
      </div>

      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-ink-500" size={17} />
          <Input
            aria-label="Buscar processo"
            className="pl-9"
            placeholder="Buscar por vaga"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          aria-label="Cliente"
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          options={[
            { label: 'Todos os clientes', value: 'all' },
            ...companies.map((company) => ({ label: company.name, value: company.id })),
          ]}
        />
        <Select
          aria-label="Status do processo"
          value={processStatus}
          onChange={(event) => setProcessStatus(event.target.value as ProcessStatus | 'all')}
          options={[
            { label: 'Todos os status', value: 'all' },
            ...Object.entries(processStatusLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
      </Card>

      {filtered.length ? (
        <ProcessListTable
          jobs={filtered}
          applications={applications}
          detailBasePath={detailBasePaths[scope]}
          canEdit={canManage}
          onEdit={(job) => {
            if (!canManage) return;
            setEditing(job);
            setModalOpen(true);
          }}
        />
      ) : (
        <EmptyState title="Nenhum processo seletivo encontrado." />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar processo seletivo' : 'Novo processo seletivo'}
        description="A vaga e o processo seletivo compartilham a mesma requisição."
        onClose={() => setModalOpen(false)}
      >
        <JobForm
          job={editing}
          companies={companies}
          fixedCompanyId={fixedCompanyId}
          submitLabel="Salvar processo"
          onSubmit={handleSave}
        />
      </Modal>
    </div>
  );
}
