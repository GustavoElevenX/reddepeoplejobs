import {
  BriefcaseBusiness,
  Edit,
  FileText,
  Mail,
  MoreHorizontal,
  Paperclip,
  Printer,
  Search,
  Settings,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CandidateKanbanBoard } from '../../components/admin/CandidateKanbanBoard';
import type { CandidateKanbanAction } from '../../components/admin/CandidateKanbanCard';
import {
  CandidateProfileDrawer,
  type CandidateDrawerTab,
} from '../../components/admin/CandidateProfileDrawer';
import { CommentComposer } from '../../components/admin/CommentComposer';
import { HistoryTimeline } from '../../components/admin/HistoryTimeline';
import { JobForm, type JobFormValues } from '../../components/admin/JobForm';
import { ProcessHeader } from '../../components/admin/ProcessHeader';
import { ProcessTabs } from '../../components/admin/ProcessTabs';
import { ActionMenu, ActionMenuItem } from '../../components/admin/ActionMenu';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import {
  activeApplicationStages,
  getNextApplicationStage,
  getPreviousApplicationStage,
  resolveApplicationStage,
} from '../../lib/applicationStages';
import {
  addProcessComment,
  createApplication,
  createManualApplication,
  getJobById,
  listApplications,
  listCompanies,
  listProcessComments,
  updateApplicationKanbanOrder,
  updateApplicationDetails,
  updateApplicationStage,
  upsertJob,
} from '../../lib/data';
import { toJobPayload } from '../../lib/formPayloads';
import { isProcessTab, processTabs, type ProcessTab } from '../../lib/processTabs';
import {
  applicationStageLabels,
  contractTypeLabels,
  formatDate,
  formatJobSalary,
  modalityLabels,
} from '../../lib/formatters';
import { useAdminProfile } from '../../routes/ProtectedRoute';
import type { Application, ApplicationStage, Company, Job, ProcessComment, ProcessStatus } from '../../types';
import type { ProcessScope } from './Processes';

type ProcessDetailProps = {
  scope: ProcessScope;
};

const listPaths: Record<ProcessScope, string> = {
  master: '/admin/processos',
  franchise: '/franqueado/processos',
  company: '/empresa/processos',
};

function RequirementSection({
  title,
  children,
  open = false,
  onEdit,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  onEdit?: () => void;
}) {
  return (
    <details open={open} className="group rounded-xl border border-surface-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-black text-ink-900">
        <span>{title}</span>
        {onEdit ? (
          <button
            type="button"
            className="rounded-md p-1.5 text-ink-500 hover:bg-surface-100 hover:text-redde-700"
            aria-label={`Editar ${title}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          >
            <Edit size={15} />
          </button>
        ) : null}
      </summary>
      <div className="border-t border-surface-200 px-4 py-4 text-sm leading-6 text-ink-700">{children}</div>
    </details>
  );
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function CandidateMiniCard({ application, onClick }: { application: Application; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-surface-200 bg-white p-4 text-left transition hover:border-redde-200 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-ink-900">{application.candidate_name}</p>
          <p className="mt-1 text-sm text-ink-500">{application.candidate_city ?? 'Localização não informada'}</p>
        </div>
        <Badge variant="info">{application.adhesion_score ?? application.match_score ?? 0}%</Badge>
      </div>
      {application.rejection_reason ? (
        <p className="mt-3 text-sm text-ink-500">{application.rejection_reason}</p>
      ) : null}
    </button>
  );
}

export function ProcessDetail({ scope }: ProcessDetailProps) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = useAdminProfile();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [talentPool, setTalentPool] = useState<Application[]>([]);
  const [talentSearch, setTalentSearch] = useState('');
  const [comments, setComments] = useState<ProcessComment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [candidateDrawerTab, setCandidateDrawerTab] = useState<CandidateDrawerTab>('sobre');
  const [editOpen, setEditOpen] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [manualCandidate, setManualCandidate] = useState({ name: '', email: '', phone: '', city: '' });
  const [sideTab, setSideTab] = useState<'comments' | 'files' | 'history' | 'emails'>('comments');
  const [canDownload, setCanDownload] = useState(true);
  const [canManage, setCanManage] = useState(scope !== 'company');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setForbidden(false);
    try {
      const process = await getJobById(id);
      if (!process) {
        setJob(null);
        return;
      }

      if (scope === 'franchise' && process.franchise_id !== profile.franchise_id) {
        setForbidden(true);
        return;
      }

      if (scope === 'company') {
        const access = await getCompanyAccessForCurrentUser();
        if (!access || access.company_id !== process.company_id || !access.can_view_applications) {
          setForbidden(true);
          return;
        }
        setCanDownload(access.can_download_resumes);
        setCanManage(access.can_manage_jobs);
      } else {
        setCanDownload(true);
        setCanManage(true);
      }

      const [applicationData, talentData, commentData, companyData] = await Promise.all([
        listApplications({ jobId: process.id }),
        listApplications({ franchiseId: process.franchise_id ?? undefined }),
        listProcessComments(process.id).catch(() => []),
        listCompanies({ franchiseId: process.franchise_id ?? undefined }),
      ]);
      setJob(process);
      setApplications(applicationData);
      setTalentPool(talentData);
      setComments(commentData);
      setCompanies(companyData);
    } finally {
      setLoading(false);
    }
  }, [id, profile.franchise_id, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabParam = searchParams.get('tab');
  const activeTab: ProcessTab = isProcessTab(tabParam) ? tabParam : 'requisicao';

  const activeApplications = useMemo(
    () =>
      applications
        .map((application) => ({ ...application, stage: resolveApplicationStage(application) }))
        .filter((application) => activeApplicationStages.includes(application.stage)),
    [applications],
  );
  const disqualified = useMemo(
    () => applications.filter((application) => resolveApplicationStage(application) === 'desclassificados'),
    [applications],
  );
  const screening = useMemo(
    () => applications.filter((application) => resolveApplicationStage(application) === 'qualificacao'),
    [applications],
  );
  const huntingCandidates = useMemo(() => {
    const normalized = talentSearch.trim().toLocaleLowerCase('pt-BR');
    const currentEmails = new Set(applications.map((item) => item.candidate_email.toLocaleLowerCase('pt-BR')));
    return talentPool
      .filter((application) => application.job_id !== id)
      .filter((application) => !currentEmails.has(application.candidate_email.toLocaleLowerCase('pt-BR')))
      .filter((application) =>
        !normalized ||
        [application.candidate_name, application.candidate_email, application.candidate_city, application.professional_summary, ...application.skills]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalized),
      );
  }, [applications, id, talentPool, talentSearch]);
  const tabCounts = useMemo<Partial<Record<ProcessTab, number>>>(
    () => ({
      hunting: applications.filter((application) => application.status === 'banco_talentos').length,
      triagem: screening.length,
      selecao: activeApplications.length,
      desclassificados: disqualified.length,
      faturamento: applications.filter(
        (application) => resolveApplicationStage(application) === 'contratacao',
      ).length,
    }),
    [activeApplications.length, applications, disqualified.length, screening.length],
  );

  function changeTab(tab: ProcessTab) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  }

  async function moveCandidate(
    application: Application,
    stage: ApplicationStage,
    order: number,
    positions: { id: string; kanbanOrder: number }[] = [],
  ) {
    let rejectionReason: string | null = null;
    if (stage === 'desclassificados' && application.stage !== 'desclassificados') {
      rejectionReason = window.prompt('Informe o motivo da desclassificação:')?.trim() || null;
      if (!rejectionReason) {
        window.alert('O motivo da desclassificação é obrigatório.');
        return;
      }
    }
    const updated = await updateApplicationStage(application.id, stage, order, rejectionReason);
    await updateApplicationKanbanOrder(positions.filter((item) => item.id !== application.id));
    setApplications((current) => current.map((item) => (item.id === application.id ? { ...item, ...updated } : item)));
    setSelectedCandidate((current) => (current?.id === application.id ? { ...current, ...updated } : current));
  }

  async function scheduleInterview(application: Application, date?: string) {
    const suggested = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const value = date ?? window.prompt('Data e hora da entrevista (AAAA-MM-DDTHH:mm):', suggested);
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      window.alert('Informe uma data e hora válidas.');
      return;
    }
    const updated = await updateApplicationDetails(application.id, {
      interview_scheduled_at: parsed.toISOString(),
    });
    setApplications((current) => current.map((item) => (item.id === application.id ? { ...item, ...updated } : item)));
  }

  async function handleCandidateAction(application: Application, action: CandidateKanbanAction) {
    const stage = resolveApplicationStage(application);
    if (action === 'resume') {
      setCandidateDrawerTab('curriculo');
      setSelectedCandidate(application);
      return;
    }
    if (action === 'comment') {
      setCandidateDrawerTab('comentarios');
      setSelectedCandidate(application);
      return;
    }
    if (action === 'schedule') {
      await scheduleInterview(application);
      return;
    }
    if (action === 'disqualify') {
      await moveCandidate(application, 'desclassificados', 0);
      return;
    }
    const target =
      action === 'next'
        ? getNextApplicationStage(stage)
        : action === 'previous'
          ? getPreviousApplicationStage(stage)
          : action === 'finalist'
            ? 'finalistas'
            : action === 'hire'
              ? 'contratacao'
              : null;
    if (target) await moveCandidate(application, target, 0);
  }

  async function handleBulkAction(
    selected: Application[],
    action: 'next' | 'schedule' | 'disqualify',
  ) {
    if (!selected.length) return;
    if (action === 'schedule') {
      const suggested = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      const value = window.prompt('Data e hora para os candidatos selecionados:', suggested);
      if (!value) return;
      for (const application of selected) await scheduleInterview(application, value);
      return;
    }
    if (action === 'disqualify') {
      const reason = window.prompt('Motivo da desclassificação em massa:')?.trim();
      if (!reason) {
        window.alert('O motivo da desclassificação é obrigatório.');
        return;
      }
      for (const application of selected) {
        const updated = await updateApplicationStage(application.id, 'desclassificados', 0, reason);
        setApplications((current) =>
          current.map((item) => (item.id === application.id ? { ...item, ...updated } : item)),
        );
      }
      return;
    }
    for (const application of selected) {
      const next = getNextApplicationStage(resolveApplicationStage(application));
      if (next) await moveCandidate(application, next, 0);
    }
  }

  async function updateProcessStatus(status: ProcessStatus) {
    const updated = await upsertJob({ ...job!, company: undefined, process_status: status });
    setJob({ ...job!, ...updated, company: job!.company });
  }

  async function saveProcess(values: JobFormValues) {
    const updated = await upsertJob(toJobPayload(values, job));
    setJob({ ...job!, ...updated, company: job!.company });
    setEditOpen(false);
  }

  if (loading) return <LoadingState label="Carregando processo seletivo..." />;
  if (forbidden) return <EmptyState title="Você não tem acesso a este processo seletivo." />;
  if (!job) return <EmptyState title="Processo seletivo não encontrado." />;

  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-ink-500">
        <Link to={listPaths[scope]} className="hover:text-redde-700">Processos seletivos</Link>
        <span>/</span>
        <span className="truncate">#{job.id.slice(0, 8).toUpperCase()} - {job.title}</span>
        <span>/</span>
        <span className="text-ink-900">{processTabs.find((tab) => tab.id === activeTab)?.label}</span>
      </div>

      <section className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
        <ProcessHeader
          job={job}
          applications={applications}
          onStatusChange={canManage ? updateProcessStatus : undefined}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => window.print()} aria-label="Imprimir processo">
                <Printer size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  window.alert('Link do processo copiado.');
                }}
              >
                <Share2 size={16} />
                Compartilhar
              </Button>
              {canManage ? (
                <>
                  <Button size="sm" onClick={() => setCandidateModalOpen(true)}>
                    <UserPlus size={16} />
                    Adicionar candidato
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                    <Settings size={16} />
                  </Button>
                  <ActionMenu label="icon">
                    <ActionMenuItem onClick={() => setEditOpen(true)}>
                      <Edit size={15} />
                      Editar requisição
                    </ActionMenuItem>
                    <ActionMenuItem onClick={() => changeTab('faturamento')}>
                      <BriefcaseBusiness size={15} />
                      Ver faturamento
                    </ActionMenuItem>
                    <ActionMenuItem onClick={() => window.print()}>
                      <MoreHorizontal size={15} />
                      Imprimir resumo
                    </ActionMenuItem>
                  </ActionMenu>
                </>
              ) : null}
            </>
          }
        />
        <div className="px-4 sm:px-5">
          <ProcessTabs activeTab={activeTab} counts={tabCounts} onChange={changeTab} />
        </div>
      </section>

      {activeTab === 'requisicao' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-3">
            <RequirementSection title="Cliente e negociação" open onEdit={canManage ? () => setEditOpen(true) : undefined}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-ink-500">Cliente</dt>
                  <dd className="text-ink-900">{job.company?.name ?? '-'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink-500">Contrato</dt>
                  <dd className="text-ink-900">{contractTypeLabels[job.contract_type]}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink-500">Faixa salarial</dt>
                  <dd className="text-ink-900">{formatJobSalary(job) ?? 'Não informada'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink-500">Posições</dt>
                  <dd className="text-ink-900">{job.open_positions}</dd>
                </div>
              </dl>
            </RequirementSection>
            <RequirementSection title="Processo" onEdit={canManage ? () => setEditOpen(true) : undefined}>
              <p>{job.about_job ?? job.description}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-ink-500">Modalidade</dt>
                  <dd>{modalityLabels[job.modality]}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink-500">Prazo</dt>
                  <dd>{formatDate(job.application_deadline)}</dd>
                </div>
              </dl>
            </RequirementSection>
            <RequirementSection title="Responsáveis" onEdit={canManage ? () => setEditOpen(true) : undefined}>
              <p>{job.responsible_name ?? 'Responsável ainda não definido.'}</p>
            </RequirementSection>
            <RequirementSection title="Requisitos" onEdit={canManage ? () => setEditOpen(true) : undefined}>
              <div className="grid gap-4">
                <div>
                  <p className="font-black text-ink-900">Obrigatórios</p>
                  <p className="mt-1 whitespace-pre-wrap">{job.requirements ?? 'Não informado.'}</p>
                </div>
                <div>
                  <p className="font-black text-ink-900">Desejáveis</p>
                  <p className="mt-1 whitespace-pre-wrap">{job.desirable_requirements ?? 'Não informado.'}</p>
                </div>
              </div>
            </RequirementSection>
            <RequirementSection title="Configurações" onEdit={canManage ? () => setEditOpen(true) : undefined}>
              <p className="whitespace-pre-wrap">{job.internal_notes ?? 'Nenhuma observação interna.'}</p>
            </RequirementSection>
          </div>

          <Card className="h-fit overflow-hidden">
            <div className="grid grid-cols-4 border-b border-surface-200">
              {[
                ['comments', 'Comentários'],
                ['files', 'Arquivos'],
                ['history', 'Histórico'],
                ['emails', 'E-mails'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`px-2 py-3 text-xs font-black ${
                    sideTab === value ? 'bg-redde-50 text-redde-700' : 'text-ink-500 hover:bg-surface-50'
                  }`}
                  onClick={() => setSideTab(value as typeof sideTab)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-4">
              {sideTab === 'comments' ? (
                <div className="grid gap-4">
                  <CommentComposer
                    placeholder="Registre um alinhamento sobre o processo..."
                    onSubmit={async (comment) => {
                      await addProcessComment(job.id, comment);
                      setComments(await listProcessComments(job.id));
                    }}
                  />
                  <div className="grid gap-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-surface-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-ink-900">
                            {comment.author?.full_name ?? 'Equipe People Jobs'}
                          </p>
                          <span className="text-xs text-ink-500">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{comment.comment}</p>
                      </div>
                    ))}
                    {!comments.length ? <p className="text-sm text-ink-500">Nenhum comentário no processo.</p> : null}
                  </div>
                </div>
              ) : null}
              {sideTab === 'files' ? (
                <div className="grid gap-3 text-sm text-ink-500">
                  <Paperclip className="text-redde-700" />
                  <p>{applications.length} currículos vinculados ao processo.</p>
                  <p>Arquivos adicionais poderão ser centralizados nesta área.</p>
                </div>
              ) : null}
              {sideTab === 'history' ? (
                <HistoryTimeline
                  items={[
                    ...applications.slice(0, 8).map((application) => ({
                      id: application.id,
                      title: `${application.candidate_name} · ${applicationStageLabels[application.stage]}`,
                      description: 'Última atualização do candidato',
                      createdAt: application.updated_at,
                    })),
                    {
                      id: `process-${job.id}`,
                      title: 'Processo criado',
                      description: job.company?.name,
                      createdAt: job.created_at,
                    },
                  ]}
                />
              ) : null}
              {sideTab === 'emails' ? (
                <div className="grid gap-3 text-sm text-ink-500">
                  <Mail className="text-redde-700" />
                  <p>Os contatos individuais ficam disponíveis no drawer de cada candidato.</p>
                  <p>{applications.length} candidatos podem ser contatados neste processo.</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'hunting' ? (
        <div className="grid gap-4">
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-black text-ink-900">Banco de talentos</h2>
                <p className="mt-1 text-sm text-ink-500">Busque perfis já recebidos pela unidade e importe-os para este processo.</p>
              </div>
              {canManage ? (
                <Button onClick={() => setCandidateModalOpen(true)}>
                  <UserPlus size={17} />
                  Novo perfil
                </Button>
              ) : null}
            </div>
            <label className="relative mt-5 block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" size={17} />
              <input
                value={talentSearch}
                onChange={(event) => setTalentSearch(event.target.value)}
                placeholder="Buscar por nome, cidade, habilidade ou e-mail"
                className="focus-ring h-11 w-full rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-sm text-ink-900 focus:border-redde-500"
              />
            </label>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {huntingCandidates.map((application) => (
              <Card key={application.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-ink-900">{application.candidate_name}</h3>
                    <p className="mt-1 truncate text-sm text-ink-500">{application.candidate_email}</p>
                    <p className="mt-1 text-xs text-ink-500">{application.candidate_city ?? 'Cidade não informada'}</p>
                  </div>
                  <Badge>{application.adhesion_score ?? application.match_score ?? 0}%</Badge>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink-700">
                  {application.professional_summary || application.message || 'Perfil disponível no banco de talentos.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {application.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-bold text-ink-500">{skill}</span>
                  ))}
                </div>
                {canManage ? (
                  <Button
                    className="mt-5 w-full"
                    size="sm"
                    onClick={() =>
                      void (async () => {
                        await createApplication({
                          job_id: job.id,
                          company_id: job.company_id,
                          franchise_id: job.franchise_id,
                          candidate_name: application.candidate_name,
                          candidate_email: application.candidate_email,
                          candidate_phone: application.candidate_phone,
                          candidate_city: application.candidate_city,
                          linkedin_url: application.linkedin_url,
                          portfolio_url: application.portfolio_url,
                          salary_expectation: application.salary_expectation,
                          availability: application.availability,
                          message: `Perfil importado do banco de talentos. ${application.message ?? ''}`.trim(),
                          resume_file_path: application.resume_file_path,
                          lgpd_consent: application.lgpd_consent,
                          source: 'hunting',
                        });
                        await load();
                      })()
                    }
                  >
                    <UserPlus size={16} />
                    Adicionar ao processo
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
          {!huntingCandidates.length ? (
            <EmptyState title={talentSearch ? 'Nenhum perfil encontrado para esta busca.' : 'Não há outros perfis disponíveis no banco de talentos.'} />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'triagem' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {screening.map((application) => (
            <CandidateMiniCard
              key={application.id}
              application={application}
              onClick={() => {
                setCandidateDrawerTab('sobre');
                setSelectedCandidate(application);
              }}
            />
          ))}
          {!screening.length ? <EmptyState title="Nenhum candidato aguardando triagem." /> : null}
        </div>
      ) : null}

      {activeTab === 'selecao' ? (
        <div className="grid min-w-0 max-w-full gap-4">
          {!activeApplications.length ? (
            <div className="rounded-xl border border-redde-100 bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">
              Ainda não há candidatos ativos neste processo.
            </div>
          ) : null}
          <CandidateKanbanBoard
            applications={activeApplications}
            canManage={canManage}
            onOpenCandidate={(application) => {
              setCandidateDrawerTab('sobre');
              setSelectedCandidate(application);
            }}
            onCandidateAction={handleCandidateAction}
            onBulkAction={handleBulkAction}
            onMoveCandidate={(application, stage, order, positions) =>
              moveCandidate(application, stage, order, positions)
            }
          />
        </div>
      ) : null}

      {activeTab === 'desclassificados' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {disqualified.map((application) => (
            <CandidateMiniCard
              key={application.id}
              application={application}
              onClick={() => {
                setCandidateDrawerTab('sobre');
                setSelectedCandidate(application);
              }}
            />
          ))}
          {!disqualified.length ? <EmptyState title="Nenhum candidato desclassificado." /> : null}
        </div>
      ) : null}

      {activeTab === 'faturamento' ? (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'Valor previsto',
                value: formatCurrency(job.billing_amount),
                icon: FileText,
              },
              {
                label: 'Posições contratadas',
                value: applications.filter((item) => resolveApplicationStage(item) === 'contratacao').length,
                icon: Users,
              },
              {
                label: 'Comissão da franquia',
                value: job.franchise_commission === null ? 'Não informada' : `${job.franchise_commission}%`,
                icon: BriefcaseBusiness,
              },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <Icon size={20} className="text-redde-700" />
                <p className="mt-4 text-2xl font-black text-ink-900">{value}</p>
                <p className="mt-1 text-sm font-semibold text-ink-500">{label}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-ink-500">Controle financeiro</p>
                <h2 className="mt-1 text-xl font-black text-ink-900">{job.company?.name ?? 'Cliente não informado'}</h2>
              </div>
              <Badge
                variant={
                  job.billing_status === 'paid'
                    ? 'success'
                    : job.billing_status === 'overdue'
                      ? 'danger'
                      : job.billing_status === 'invoiced'
                        ? 'info'
                        : 'warning'
                }
              >
                {{
                  not_started: 'Não iniciado',
                  pending: 'Pendente',
                  invoiced: 'Faturado',
                  paid: 'Pago',
                  overdue: 'Vencido',
                  cancelled: 'Cancelado',
                }[job.billing_status]}
              </Badge>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-ink-500">Tipo</dt>
                <dd className="mt-1 font-bold text-ink-900">
                  {{
                    fixed: 'Valor fixo',
                    success_fee: 'Success fee',
                    monthly: 'Mensal',
                    other: 'Outro',
                  }[job.billing_type]}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-ink-500">Vencimento</dt>
                <dd className="mt-1 font-bold text-ink-900">{formatDate(job.billing_due_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-ink-500">Responsável financeiro</dt>
                <dd className="mt-1 font-bold text-ink-900">{job.finance_responsible ?? 'Não definido'}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-ink-500">Vagas abertas</dt>
                <dd className="mt-1 font-bold text-ink-900">{job.open_positions}</dd>
              </div>
            </dl>
            {canManage ? (
              <Button className="mt-5" variant="secondary" onClick={() => setEditOpen(true)}>
                <Edit size={16} />
                Editar faturamento
              </Button>
            ) : null}
          </Card>
          <Card className="p-5">
            <p className="text-xs font-black uppercase tracking-wide text-ink-500">Candidatos contratados</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {applications
                .filter((application) => resolveApplicationStage(application) === 'contratacao')
                .map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    className="rounded-xl border border-surface-200 p-4 text-left hover:border-redde-200 hover:bg-redde-50"
                    onClick={() => {
                      setCandidateDrawerTab('sobre');
                      setSelectedCandidate(application);
                    }}
                  >
                    <p className="font-black text-ink-900">{application.candidate_name}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      {application.candidate_city ?? 'Localização não informada'} ·{' '}
                      {application.adhesion_score ?? application.match_score ?? 0}% aderência
                    </p>
                  </button>
                ))}
              {!applications.some(
                (application) => resolveApplicationStage(application) === 'contratacao',
              ) ? (
                <p className="text-sm text-ink-500">Nenhuma contratação registrada neste processo.</p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      <CandidateProfileDrawer
        application={selectedCandidate}
        initialTab={candidateDrawerTab}
        canDownload={canDownload}
        onApplicationUpdate={(updated) => {
          setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          setSelectedCandidate(updated);
        }}
        onClose={() => setSelectedCandidate(null)}
        onStageChange={canManage ? (application, stage) => moveCandidate(application, stage, 0) : undefined}
      />

      <Modal
        open={editOpen}
        title="Editar requisição"
        description="Atualize os dados operacionais, publicação e faturamento do processo."
        onClose={() => setEditOpen(false)}
      >
        <JobForm job={job} companies={companies} onSubmit={saveProcess} submitLabel="Salvar alterações" />
      </Modal>

      <Modal
        open={candidateModalOpen}
        title="Adicionar candidato"
        description="Cadastre um candidato manualmente na etapa de qualificação."
        onClose={() => setCandidateModalOpen(false)}
      >
        <div className="grid gap-4">
          <Input
            label="Nome"
            value={manualCandidate.name}
            onChange={(event) => setManualCandidate((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            value={manualCandidate.email}
            onChange={(event) => setManualCandidate((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            label="Telefone"
            value={manualCandidate.phone}
            onChange={(event) => setManualCandidate((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            label="Cidade/UF"
            value={manualCandidate.city}
            onChange={(event) => setManualCandidate((current) => ({ ...current, city: event.target.value }))}
          />
          <Button
            disabled={!manualCandidate.name.trim() || !manualCandidate.email.trim() || !manualCandidate.phone.trim()}
            onClick={async () => {
              await createManualApplication({
                job,
                candidate_name: manualCandidate.name,
                candidate_email: manualCandidate.email,
                candidate_phone: manualCandidate.phone,
                candidate_city: manualCandidate.city,
              });
              setCandidateModalOpen(false);
              setManualCandidate({ name: '', email: '', phone: '', city: '' });
              await load();
            }}
          >
            <UserPlus size={16} />
            Adicionar à qualificação
          </Button>
        </div>
      </Modal>
    </div>
  );
}
