import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  Mail,
  Paperclip,
  Search,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CandidateKanbanBoard } from '../../components/admin/CandidateKanbanBoard';
import { CandidateProfileDrawer } from '../../components/admin/CandidateProfileDrawer';
import { CommentComposer } from '../../components/admin/CommentComposer';
import { HistoryTimeline } from '../../components/admin/HistoryTimeline';
import { ProcessHeader } from '../../components/admin/ProcessHeader';
import { ProcessTabs } from '../../components/admin/ProcessTabs';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { getCompanyAccessForCurrentUser } from '../../lib/auth';
import { activeApplicationStages, resolveApplicationStage } from '../../lib/applicationStages';
import { isProcessTab, type ProcessTab } from '../../lib/processTabs';
import {
  addProcessComment,
  getJobById,
  listApplications,
  listProcessComments,
  updateApplicationKanbanOrder,
  updateApplicationStage,
} from '../../lib/data';
import {
  applicationStageLabels,
  contractTypeLabels,
  formatDate,
  formatJobSalary,
  modalityLabels,
} from '../../lib/formatters';
import { useAdminProfile } from '../../routes/ProtectedRoute';
import type { Application, ApplicationStage, Job, ProcessComment } from '../../types';
import type { ProcessScope } from './Processes';

type ProcessDetailProps = {
  scope: ProcessScope;
};

const listPaths: Record<ProcessScope, string> = {
  master: '/admin/processos',
  franchise: '/franqueado/processos',
  company: '/empresa/processos',
};

function RequirementSection({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-surface-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-4 font-black text-ink-900">{title}</summary>
      <div className="border-t border-surface-200 px-4 py-4 text-sm leading-6 text-ink-700">{children}</div>
    </details>
  );
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
  const [comments, setComments] = useState<ProcessComment[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [sideTab, setSideTab] = useState<'comments' | 'files' | 'history' | 'emails'>('comments');
  const [canDownload, setCanDownload] = useState(true);
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
      }

      const [applicationData, commentData] = await Promise.all([
        listApplications({ jobId: process.id }),
        listProcessComments(process.id).catch(() => []),
      ]);
      setJob(process);
      setApplications(applicationData);
      setComments(commentData);
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
      rejectionReason = window.prompt('Motivo da desclassificação (opcional):')?.trim() || null;
    }
    const updated = await updateApplicationStage(application.id, stage, order, rejectionReason);
    await updateApplicationKanbanOrder(positions.filter((item) => item.id !== application.id));
    setApplications((current) => current.map((item) => (item.id === application.id ? { ...item, ...updated } : item)));
    setSelectedCandidate((current) => (current?.id === application.id ? { ...current, ...updated } : current));
  }

  if (loading) return <LoadingState label="Carregando processo seletivo..." />;
  if (forbidden) return <EmptyState title="Você não tem acesso a este processo seletivo." />;
  if (!job) return <EmptyState title="Processo seletivo não encontrado." />;

  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <Link to={listPaths[scope]} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-ink-500 hover:text-redde-700">
        <ArrowLeft size={16} />
        Voltar aos processos
      </Link>

      <ProcessHeader job={job} applications={applications} />
      <ProcessTabs activeTab={activeTab} counts={tabCounts} onChange={changeTab} />

      {activeTab === 'requisicao' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-3">
            <RequirementSection title="Cliente e negociação" open>
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
            <RequirementSection title="Processo">
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
            <RequirementSection title="Responsáveis">
              <p>{job.responsible_name ?? 'Responsável ainda não definido.'}</p>
            </RequirementSection>
            <RequirementSection title="Requisitos">
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
            <RequirementSection title="Configurações">
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
        <Card className="grid place-items-center p-10 text-center">
          <Search size={32} className="text-redde-700" />
          <h2 className="mt-4 text-xl font-black text-ink-900">Hunting do processo</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-500">
            Área preparada para busca ativa, importação de perfis e formação de listas de talentos.
          </p>
        </Card>
      ) : null}

      {activeTab === 'triagem' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {screening.map((application) => (
            <CandidateMiniCard
              key={application.id}
              application={application}
              onClick={() => setSelectedCandidate(application)}
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
            onOpenCandidate={setSelectedCandidate}
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
              onClick={() => setSelectedCandidate(application)}
            />
          ))}
          {!disqualified.length ? <EmptyState title="Nenhum candidato desclassificado." /> : null}
        </div>
      ) : null}

      {activeTab === 'faturamento' ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Posições contratadas', value: applications.filter((item) => item.stage === 'contratacao').length, icon: Users },
            { label: 'Posições abertas', value: job.open_positions, icon: BriefcaseBusiness },
            { label: 'Documentos do processo', value: applications.length, icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-5">
              <Icon size={20} className="text-redde-700" />
              <p className="mt-4 text-3xl font-black text-ink-900">{value}</p>
              <p className="mt-1 text-sm font-semibold text-ink-500">{label}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <CandidateProfileDrawer
        application={selectedCandidate}
        canDownload={canDownload}
        onClose={() => setSelectedCandidate(null)}
        onStageChange={(application, stage) => moveCandidate(application, stage, 0)}
      />
    </div>
  );
}
