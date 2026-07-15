import { Download, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { ProcessListTable } from '../../components/admin/ProcessListTable';
import { ProcessFilters } from '../../components/admin/processes/ProcessFilters';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { resolveApplicationStage } from '../../lib/applicationStages';
import { listApplications, listCompanies, listProcessJobs, upsertJob } from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { linkSingleAvailableProjectToJob } from '../../lib/recruitmentPipeline';
import { useAdminProfile } from '../../routes/ProtectedRoute';
import type { Application, Company, CompanyUserAccess, Job, ProcessFilters as ProcessFilterValues } from '../../types';

export type ProcessScope = 'master' | 'franchise' | 'company';
type ProcessesProps = { scope: ProcessScope };
const detailBasePaths: Record<ProcessScope, string> = { master: '/admin/processos', franchise: '/franqueado/processos', company: '/empresa/processos' };

export function Processes({ scope }: ProcessesProps) {
  const profile = useAdminProfile();
  const [access, setAccess] = useState<CompanyUserAccess | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<ProcessFilterValues>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [referenceTime] = useState(() => Date.now());
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (scope === 'company') {
        const accessData = await getCompanyAccessForCurrentUser();
        setAccess(accessData);
        if (!accessData) { setCompanies([]); setJobs([]); setApplications([]); return; }
        const [companyData, jobPage] = await Promise.all([
          listCompanies().then((items) => items.filter((company) => company.id === accessData.company_id)),
          listProcessJobs({ ...filters, page, pageSize }, { companyId: accessData.company_id }),
        ]);
        const applicationData = jobPage.items.length ? await listApplications({ jobIds: jobPage.items.map((job) => job.id) }) : [];
        setCompanies(companyData); setJobs(jobPage.items); setApplications(applicationData); setTotal(jobPage.total); return;
      }
      const franchiseId = scope === 'franchise' ? profile.franchise_id ?? undefined : undefined;
      const [companyData, jobPage] = await Promise.all([
        listCompanies(franchiseId ? { franchiseId } : undefined),
        listProcessJobs({ ...filters, page, pageSize }, { franchiseId }),
      ]);
      const applicationData = jobPage.items.length ? await listApplications({ jobIds: jobPage.items.map((job) => job.id) }) : [];
      setCompanies(companyData); setJobs(jobPage.items); setApplications(applicationData); setTotal(jobPage.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os processos.');
    } finally { setLoading(false); }
  }, [filters, page, profile.franchise_id, scope]);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => jobs.filter((job) => {
    const candidates = applications.filter((application) => application.job_id === job.id);
    const searchText = `${job.title} ${job.company?.name ?? ''} ${job.responsible_name ?? ''}`.toLowerCase();
    const deadline = job.application_deadline ? new Date(`${job.application_deadline}T23:59:59`).getTime() : null;
    const now = referenceTime;
    return (!filters.search || searchText.includes(filters.search.toLowerCase()))
      && (!filters.companyId || job.company_id === filters.companyId)
      && (!filters.processStatus || job.process_status === filters.processStatus)
      && (!filters.responsible || job.responsible_name === filters.responsible)
      && (!filters.city || `${job.city ?? ''} ${job.state ?? ''}`.toLowerCase().includes(filters.city.toLowerCase()))
      && (!filters.contractType || job.contract_type === filters.contractType)
      && (!filters.hasNewCandidates || candidates.some((candidate) => candidate.is_new))
      && (!filters.overdueOnly || Boolean(deadline && deadline < now && !['completed', 'cancelled'].includes(job.process_status)))
      && (!filters.deadline || (filters.deadline === 'overdue'
        ? Boolean(deadline && deadline < now)
        : filters.deadline === 'next_7_days'
          ? Boolean(deadline && deadline >= now && deadline <= now + 7 * 86_400_000)
          : Boolean(deadline && deadline >= now)));
  }), [applications, filters, jobs, referenceTime]);

  const canManage = scope !== 'company' || Boolean(access?.can_manage_jobs);
  const fixedCompanyId = scope === 'company' ? access?.company_id : undefined;
  const totalPositions = filtered.reduce((sum, job) => sum + job.open_positions, 0);

  function exportReport() {
    const rows = filtered.map((job) => {
      const candidates = applications.filter((application) => application.job_id === job.id);
      const stageCount = (stage: Application['stage']) => candidates.filter((application) => resolveApplicationStage(application) === stage).length;
      const hired = candidates.filter((candidate) => candidate.hired_at);
      const averageHireDays = hired.length ? Math.round(hired.reduce((sum, candidate) => sum + (new Date(candidate.hired_at!).getTime() - new Date(candidate.created_at).getTime()) / 86_400_000, 0) / hired.length) : '';
      return [job.id, job.title, job.company?.name ?? '', job.responsible_name ?? '', job.process_status, job.open_positions, candidates.length, stageCount('qualificacao'), stageCount('testes'), stageCount('entrevista'), stageCount('finalistas'), stageCount('contratacao'), job.application_deadline ?? '', averageHireDays];
    });
    const csv = [['ID', 'Processo', 'Cliente', 'Responsável', 'Status', 'Posições', 'Candidatos', 'Qualificação', 'Testes', 'Entrevistas', 'Finalistas', 'Contratados', 'Prazo', 'Dias médios para contratação'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'relatorio-processos-seletivos.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  async function handleSave(values: JobFormValues) {
    const payload = toJobPayload(values, editing);
    const saved = await upsertJob({ ...payload, franchise_id: scope === 'franchise' ? profile.franchise_id : editing?.franchise_id });
    if (!editing) await linkSingleAvailableProjectToJob(saved);
    setEditing(null); setModalOpen(false); await load();
  }

  if (loading) return <LoadingState label="Carregando processos seletivos..." />;
  if (loadError) return <div className="grid gap-4 rounded-xl border border-red-200 bg-red-50 p-6"><p className="font-bold text-red-700">{loadError}</p><Button className="w-fit" variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div>;
  if (scope === 'franchise' && !profile.franchise_id) return <EmptyState title="Seu usuário não está vinculado a um franqueado." />;
  if (scope === 'company' && !access) return <EmptyState title="Nenhuma empresa vinculada ao seu usuário." />;

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">Recrutamento e seleção</p><h1 className="mt-1 text-3xl font-black text-ink-900">Processos seletivos</h1><p className="mt-2 text-ink-500">Acompanhe requisições, candidatos, etapas e contratações em um único fluxo.</p><p className="mt-2 text-sm font-black text-ink-700">{total} processos • {totalPositions} vagas nesta página</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={exportReport}><Download size={17} />Relatório da página</Button>{canManage ? <Button disabled={!companies.length} onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} />Criar processo</Button> : null}</div></div>
    <ProcessFilters value={filters} companies={companies} responsibles={[...new Set(jobs.map((job) => job.responsible_name).filter((name): name is string => Boolean(name)))]} onChange={(value) => { setPage(1); setFilters(value); }} />
    {filtered.length ? <ProcessListTable jobs={filtered} applications={applications} detailBasePath={detailBasePaths[scope]} canEdit={canManage} onEdit={(job) => { if (!canManage) return; setEditing(job); setModalOpen(true); }} onStatusChange={async (job, status, reason) => { await upsertJob({ ...job, company: undefined, process_status: status, internal_notes: reason ? `${job.internal_notes ?? ''}\n${reason}`.trim() : job.internal_notes }); await load(); }} onDuplicate={async (job) => { await upsertJob({ ...job, id: undefined, company: undefined, title: `${job.title} (cópia)`, slug: `${job.slug}-copia-${Date.now()}`, process_status: 'draft', status: 'draft', approved_positions: 0 }); await load(); }} /> : <EmptyState title="Nenhum processo seletivo encontrado." />}
    {total > pageSize ? <div className="flex items-center justify-end gap-3"><Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button><span className="text-sm font-bold text-ink-600">Página {page} de {Math.ceil(total / pageSize)}</span><Button variant="secondary" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div> : null}
    <Modal open={modalOpen} title={editing ? 'Editar processo seletivo' : 'Novo processo seletivo'} description="A vaga e o processo seletivo compartilham a mesma requisição." onClose={() => setModalOpen(false)}><JobForm job={editing} companies={companies} fixedCompanyId={fixedCompanyId} submitLabel="Salvar processo" onSubmit={handleSave} /></Modal>
  </div>;
}
