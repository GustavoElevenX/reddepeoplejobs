import {
  BriefcaseBusiness,
  CalendarClock,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addApplicationNote,
  listApplicationNotes,
  listApplicationStageHistory,
  updateApplicationDetails,
} from '../../lib/data';
import { applicationStageLabels, formatDate, formatOperationalValue } from '../../lib/formatters';
import { createResumeSignedUrl } from '../../lib/storage';
import {
  assignTestsToApplication,
  completeCandidateScreening,
  completeInternalInterview,
  getCandidateWorkspace,
  getOrCreateCandidateScreening,
  getOrCreateInternalInterview,
  generateCandidateFinalistReport,
  prepareCandidateFinalist,
  saveCandidateFinalistReport,
  scheduleInternalInterview,
  updateTestResult,
  waiveResumeAnalysis,
} from '../../lib/recruitmentPipeline';
import type {
  Application,
  ApplicationNote,
  ApplicationStage,
  ApplicationStageHistory,
  ApplicationTestAssignment,
  CandidateWorkspace,
} from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { CommentComposer } from './CommentComposer';
import { HistoryTimeline } from './HistoryTimeline';

export type CandidateDrawerTab =
  | 'sobre'
  | 'profissional'
  | 'diversidade'
  | 'conhecimentos'
  | 'experiencias'
  | 'curriculo'
  | 'perguntas'
  | 'comentarios'
  | 'email'
  | 'arquivos'
  | 'historico';

const tabs: { id: CandidateDrawerTab; label: string }[] = [
  { id: 'sobre', label: 'Visão geral' },
  { id: 'curriculo', label: 'Currículo' },
  { id: 'profissional', label: 'Análise e aderência' },
  { id: 'perguntas', label: 'Triagem' },
  { id: 'conhecimentos', label: 'Testes' },
  { id: 'experiencias', label: 'Entrevista interna' },
  { id: 'diversidade', label: 'Finalista / parecer' },
  { id: 'comentarios', label: 'Comentários' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'email', label: 'Comunicação' },
  { id: 'historico', label: 'Histórico' },
];

type CandidateProfileDrawerProps = {
  application: Application | null;
  initialTab?: CandidateDrawerTab;
  canDownload?: boolean;
  canManage?: boolean;
  noteVisibility?: ApplicationNote['visibility'];
  onApplicationUpdate?: (application: Application) => void;
  onStageChange?: (application: Application, stage: ApplicationStage) => Promise<void> | void;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Não agendada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function EmptyInfo({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed border-surface-200 p-4 text-sm text-ink-500">{children}</p>;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CandidateTestEditor({ assignment, canManage, onSaved }: {
  assignment: ApplicationTestAssignment;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(assignment.status);
  const [score, setScore] = useState(assignment.score?.toString() ?? '');
  const [maxScore, setMaxScore] = useState(assignment.max_score?.toString() ?? '');
  const [notes, setNotes] = useState(assignment.notes ?? '');
  const [waiverReason, setWaiverReason] = useState(assignment.waiver_reason ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (status === 'waived' && !waiverReason.trim()) {
      window.alert('Informe a justificativa da dispensa.');
      return;
    }
    setSaving(true);
    try {
      await updateTestResult({
        id: assignment.id,
        status,
        score: score === '' ? null : Number(score),
        max_score: maxScore === '' ? null : Number(maxScore),
        notes: notes.trim() || null,
        waiver_reason: status === 'waived' ? waiverReason.trim() : null,
      });
      await onSaved();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel salvar o teste.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="grid gap-3 rounded-xl bg-surface-50 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-bold text-ink-900">{assignment.job_test?.name ?? 'Teste'}</p><p className="text-xs text-ink-500">{assignment.job_test?.description ?? 'Sem descriÃ§Ã£o.'}</p></div>
      <Badge variant={status === 'approved' ? 'success' : status === 'failed' ? 'danger' : 'warning'}>{formatOperationalValue(status)}</Badge>
    </div>
    {canManage ? <>
      <Select label="Resultado" value={status} onChange={(event) => setStatus(event.target.value as ApplicationTestAssignment['status'])} options={[
        { value: 'pending', label: 'Pendente' }, { value: 'sent', label: 'Enviado' }, { value: 'in_progress', label: 'Em andamento' },
        { value: 'completed', label: 'ConcluÃ­do' }, { value: 'approved', label: 'Aprovado' }, { value: 'failed', label: 'Reprovado' },
        { value: 'waived', label: 'Dispensado' }, { value: 'cancelled', label: 'Cancelado' },
      ]} />
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Nota" type="number" value={score} onChange={(event) => setScore(event.target.value)} /><Input label="Nota mÃ¡xima" type="number" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} /></div>
      {status === 'waived' ? <Textarea label="Justificativa da dispensa" value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} /> : null}
      <Textarea label="ObservaÃ§Ãµes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Salvando...' : 'Salvar resultado'}</Button>
    </> : <p className="text-sm text-ink-600">{assignment.score === null ? 'Sem nota registrada.' : `Nota ${assignment.score}${assignment.max_score ? `/${assignment.max_score}` : ''}`}</p>}
  </div>;
}

export function CandidateProfileDrawer({
  application,
  initialTab = 'sobre',
  canDownload = true,
  canManage = true,
  noteVisibility = 'internal',
  onApplicationUpdate,
  onStageChange,
  onClose,
}: CandidateProfileDrawerProps) {
  const applicationId = application?.id;
  const initialOpinion = application?.recruiter_opinion ?? '';
  const [activeTab, setActiveTab] = useState<CandidateDrawerTab>(initialTab);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [history, setHistory] = useState<ApplicationStageHistory[]>([]);
  const [workspace, setWorkspace] = useState<CandidateWorkspace | null>(null);
  const [opinion, setOpinion] = useState('');
  const [savingOpinion, setSavingOpinion] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');
  const [finalistReport, setFinalistReport] = useState('');

  useEffect(() => {
    if (!applicationId) return;
    setActiveTab(initialTab);
    setOpinion(initialOpinion);
    setWorkspaceLoading(true);
    setWorkspaceError('');
    void Promise.all([
      listApplicationNotes(applicationId),
      listApplicationStageHistory(applicationId),
      getCandidateWorkspace(applicationId),
    ]).then(([noteItems, historyItems, candidateWorkspace]) => {
      setNotes(noteItems);
      setHistory(historyItems);
      setWorkspace(candidateWorkspace);
      setFinalistReport(candidateWorkspace.finalist?.ai_report ?? candidateWorkspace.finalist?.franchise_opinion ?? '');
    }).catch((error) => {
      setWorkspace(null);
      setWorkspaceError(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel carregar os dados do candidato.');
    }).finally(() => setWorkspaceLoading(false));
  }, [applicationId, initialOpinion, initialTab]);

  if (!application) return null;
  const currentApplication = application;
  const score = application.adhesion_score ?? application.match_score ?? 0;

  async function refreshWorkspace() {
    const candidateWorkspace = await getCandidateWorkspace(currentApplication.id);
    setWorkspace(candidateWorkspace);
    setFinalistReport(candidateWorkspace.finalist?.ai_report ?? candidateWorkspace.finalist?.franchise_opinion ?? '');
    onApplicationUpdate?.({ ...currentApplication, ...candidateWorkspace.application });
  }

  async function runWorkspaceMutation(action: () => Promise<unknown>) {
    setWorkspaceSaving(true);
    setWorkspaceError('');
    try {
      await action();
      await refreshWorkspace();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.');
    } finally {
      setWorkspaceSaving(false);
    }
  }

  function updateScreeningField(field: string, value: unknown) {
    setWorkspace((current) => current?.screening ? { ...current, screening: { ...current.screening, [field]: value } } : current);
  }

  function updateInterviewField(field: string, value: unknown) {
    setWorkspace((current) => current?.interview ? { ...current, interview: { ...current.interview, [field]: value } } : current);
  }

  async function downloadResume() {
    if (!currentApplication.resume_file_path) {
      window.alert('Este candidato foi cadastrado manualmente e ainda não possui currículo anexado.');
      return;
    }
    const url = await createResumeSignedUrl(currentApplication.resume_file_path);
    if (url === '#') {
      window.alert('O download real de currículos fica disponível no ambiente publicado.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function saveOpinion() {
    setSavingOpinion(true);
    try {
      const updated = await updateApplicationDetails(currentApplication.id, {
        recruiter_opinion: opinion.trim() || null,
      });
      onApplicationUpdate?.({ ...currentApplication, ...updated });
    } finally {
      setSavingOpinion(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/45" onMouseDown={onClose}>
      <aside
        className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-surface-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-black text-ink-900">{application.candidate_name}</h2>
                {application.is_new ? <Badge variant="info">Novo</Badge> : null}
                <Badge variant={score >= 70 ? 'success' : score >= 45 ? 'warning' : 'neutral'}>
                  {score}% aderência
                </Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-redde-700">{applicationStageLabels[application.stage]}</p>
            </div>
            <Button variant="ghost" size="sm" aria-label="Fechar candidato" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-ink-500 sm:grid-cols-2">
            <a href={`tel:${application.candidate_phone}`} className="flex items-center gap-2 hover:text-redde-700">
              <Phone size={15} />
              {application.candidate_phone}
            </a>
            <a href={`mailto:${application.candidate_email}`} className="flex items-center gap-2 hover:text-redde-700">
              <Mail size={15} />
              {application.candidate_email}
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={15} />
              {application.candidate_city ?? 'Localização não informada'}
            </span>
            <span className="flex items-center gap-2">
              <CalendarClock size={15} />
              {formatDateTime(application.interview_scheduled_at)}
            </span>
          </div>
          {onStageChange ? (
            <Select
              className="mt-4"
              aria-label="Etapa do candidato"
              value={application.stage}
              onChange={(event) => void onStageChange(application, event.target.value as ApplicationStage)}
              options={Object.entries(applicationStageLabels).map(([value, label]) => ({ value, label }))}
            />
          ) : null}
        </header>

        <div className="overflow-x-auto border-b border-surface-200 px-4">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`border-b-2 px-3 py-3 text-sm font-bold ${
                  activeTab === tab.id
                    ? 'border-redde-500 text-redde-700'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {workspaceLoading ? <p className="mb-4 rounded-xl bg-surface-50 p-3 text-sm font-semibold text-ink-600">Carregando dados operacionais...</p> : null}
          {workspaceError ? <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"><span>{workspaceError}</span><Button size="sm" variant="secondary" onClick={() => void refreshWorkspace().catch((error) => setWorkspaceError(error instanceof Error ? error.message : 'Falha ao recarregar.'))}>Tentar novamente</Button></div> : null}
          {activeTab === 'sobre' ? (
            <div className="grid gap-4">
              <section className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <h3 className="font-black text-ink-900">Apresentação</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                  {application.message ?? 'O candidato não adicionou uma apresentação.'}
                </p>
              </section>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Origem', application.source ?? 'Não informada'],
                  ['Disponibilidade', application.availability ?? 'Não informada'],
                  ['Pretensão', application.salary_expectation ?? 'Não informada'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-surface-200 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-ink-500">{label}</p>
                    <p className="mt-2 text-sm font-bold text-ink-900">{value}</p>
                  </div>
                ))}
              </div>
              {canManage ? <section className="rounded-xl border border-surface-200 p-4">
                <h3 className="font-black text-ink-900">Marcadores</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {application.tags.length ? (
                    application.tags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)
                  ) : (
                    <span className="text-sm text-ink-500">Nenhum marcador aplicado.</span>
                  )}
                </div>
              </section> : <section className="rounded-xl border border-surface-200 p-4"><h3 className="font-black text-ink-900">Parecer do recrutador</h3><p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{opinion || 'Nenhum parecer compartilhado.'}</p></section>}
            </div>
          ) : null}

          {activeTab === 'profissional' ? (
            <div className="grid gap-4">
              <section className="rounded-xl border border-surface-200 p-4">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness size={18} className="text-redde-700" />
                  <h3 className="font-black text-ink-900">Resumo profissional</h3>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                  {application.professional_summary ?? 'Resumo profissional não informado.'}
                </p>
              </section>
              <section className="rounded-xl border border-redde-100 bg-redde-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-redde-700">Aderência ao processo</p>
                    <p className="mt-1 text-3xl font-black text-redde-700">{score}%</p>
                  </div>
                  <Sparkles size={28} className="text-redde-500" />
                </div>
                <p className="mt-3 text-sm text-redde-800">
                  Indicador consolidado do perfil, experiência e requisitos registrados para a vaga.
                </p>
              </section>
              <section className="rounded-xl border border-surface-200 p-4">
                <Textarea
                  label="Parecer do recrutador"
                  rows={6}
                  value={opinion}
                  placeholder="Registre pontos fortes, riscos e recomendação para a próxima etapa..."
                  onChange={(event) => setOpinion(event.target.value)}
                />
                <Button className="mt-3" size="sm" disabled={savingOpinion} onClick={saveOpinion}>
                  {savingOpinion ? 'Salvando...' : 'Salvar parecer'}
                </Button>
              </section>
            </div>
          ) : null}

          {activeTab === 'diversidade' ? (
            <div className="grid gap-4">
              <section className="rounded-xl border border-surface-200 p-4">
                <h3 className="font-black text-ink-900">Parecer do finalista</h3>
                {workspace?.finalist ? canManage ? <div className="mt-3 grid gap-3"><Textarea label="Parecer para o cliente" rows={8} value={finalistReport} onChange={(event) => setFinalistReport(event.target.value)} /><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(async () => { const result = await generateCandidateFinalistReport(workspace.finalist!.project_id, application.id); if (result.finalist?.ai_report) setFinalistReport(result.finalist.ai_report); })}>Gerar parecer</Button><Button variant="secondary" disabled={workspaceSaving || !finalistReport.trim()} onClick={() => void runWorkspaceMutation(() => saveCandidateFinalistReport(workspace.finalist!.id, finalistReport))}>Salvar revisão</Button><Button disabled={workspaceSaving || !finalistReport.trim()} onClick={() => void runWorkspaceMutation(() => saveCandidateFinalistReport(workspace.finalist!.id, finalistReport, true))}>Aprovar parecer</Button></div></div> : <p className="mt-2 text-sm leading-6 text-ink-700">{workspace.finalist.ai_report || workspace.finalist.franchise_opinion || 'Parecer em preparação.'}</p> : canManage ? <div className="mt-3"><Button disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => prepareCandidateFinalist(application.id))}>Preparar finalista</Button></div> : <p className="mt-2 text-sm text-ink-500">O parecer ainda não foi preparado.</p>}
              </section>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Status do parecer</p>
                  <p className="mt-2 font-black text-ink-900">{formatOperationalValue(workspace?.finalist?.ai_report_status, 'Pendente')}</p>
                </div>
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Seleção</p>
                  <p className="mt-2 font-black text-ink-900">{formatOperationalValue(workspace?.finalist?.status, 'Ainda não selecionado')}</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'conhecimentos' ? (
            <div className="grid gap-4">
              <section className="rounded-xl border border-surface-200 p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="font-black text-ink-900">Testes atribuídos</h3>{canManage ? <Button size="sm" variant="secondary" disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => assignTestsToApplication(application.id))}>Atribuir testes da vaga</Button> : null}</div>
                <div className="mt-3 grid gap-3">{workspace?.tests.length ? workspace.tests.map((assignment) => <CandidateTestEditor key={assignment.id} assignment={assignment} canManage={canManage} onSaved={refreshWorkspace} />) : <EmptyInfo>Nenhum teste atribuído.</EmptyInfo>}</div>
              </section>
            </div>
          ) : null}

          {activeTab === 'experiencias' ? (
            <section className="grid gap-4 rounded-xl border border-surface-200 p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-black text-ink-900">Entrevista interna</h3>{canManage && !workspace?.interview ? <Button size="sm" variant="secondary" disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => getOrCreateInternalInterview(application.id))}>Iniciar registro</Button> : null}</div>
              {workspace?.interview ? <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><p className="text-xs font-black uppercase text-ink-500">Situação</p><p className="mt-1 font-bold">{formatOperationalValue(workspace.interview.status)}</p></div>
                  <div><p className="text-xs font-black uppercase text-ink-500">Agendamento</p><p className="mt-1 font-bold">{formatDateTime(workspace.interview.scheduled_at)}</p></div>
                </div>
                {canManage ? <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input label="Data e horário" type="datetime-local" value={toLocalDateTime(workspace.interview.scheduled_at)} onInput={(event) => updateInterviewField('scheduled_at', event.currentTarget.value ? new Date(event.currentTarget.value).toISOString() : null)} onChange={(event) => updateInterviewField('scheduled_at', event.target.value ? new Date(event.target.value).toISOString() : null)} /><Button className="self-end" variant="secondary" disabled={workspaceSaving || !workspace.interview.scheduled_at} onClick={() => void runWorkspaceMutation(() => scheduleInternalInterview(application.id, workspace.interview!.scheduled_at!))}>Agendar</Button></div>
                  <div className="grid gap-3 sm:grid-cols-2"><Input label="Nota técnica" type="number" min="0" max="10" value={workspace.interview.technical_score ?? ''} onChange={(event) => updateInterviewField('technical_score', event.target.value === '' ? null : Number(event.target.value))} /><Input label="Nota comportamental" type="number" min="0" max="10" value={workspace.interview.behavioral_score ?? ''} onChange={(event) => updateInterviewField('behavioral_score', event.target.value === '' ? null : Number(event.target.value))} /><Input label="Comunicação" type="number" min="0" max="10" value={workspace.interview.communication_score ?? ''} onChange={(event) => updateInterviewField('communication_score', event.target.value === '' ? null : Number(event.target.value))} /><Input label="Aderência cultural" type="number" min="0" max="10" value={workspace.interview.culture_score ?? ''} onChange={(event) => updateInterviewField('culture_score', event.target.value === '' ? null : Number(event.target.value))} /></div>
                  <Textarea label="Pontos fortes" value={workspace.interview.strengths} onChange={(event) => updateInterviewField('strengths', event.target.value)} />
                  <Textarea label="Riscos" value={workspace.interview.risks} onChange={(event) => updateInterviewField('risks', event.target.value)} />
                  <Textarea label="Conclusão" value={workspace.interview.conclusion} onChange={(event) => updateInterviewField('conclusion', event.target.value)} />
                  <Select label="Recomendação" value={workspace.interview.recommendation ?? ''} onChange={(event) => updateInterviewField('recommendation', event.target.value || null)} options={[{ value: '', label: 'Selecione' }, { value: 'strong_yes', label: 'Recomendo fortemente' }, { value: 'yes', label: 'Recomendo' }, { value: 'with_reservations', label: 'Com ressalvas' }, { value: 'no', label: 'Não recomendo' }]} />
                  <Button disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => completeInternalInterview(workspace.interview!))}>{workspaceSaving ? 'Salvando...' : 'Concluir entrevista'}</Button>
                </> : <div className="grid gap-2 text-sm text-ink-700"><p><strong>Recomendação:</strong> {workspace.interview.recommendation ?? 'Pendente'}</p><p><strong>Conclusão:</strong> {workspace.interview.conclusion || 'Pendente'}</p></div>}
              </> : <EmptyInfo>Entrevista ainda não iniciada.</EmptyInfo>}
            </section>
          ) : null}

          {activeTab === 'curriculo' ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Aderência</p>
                  <p className="mt-2 text-3xl font-black text-redde-700">{score}%</p>
                </div>
                <div className="rounded-xl border border-surface-200 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ink-500">Disponibilidade</p>
                  <p className="mt-2 text-lg font-black text-ink-900">{application.availability ?? 'Não informada'}</p>
                </div>
              </div>
              <Button onClick={downloadResume} disabled={!canDownload}>
                <Download size={17} />
                {application.resume_file_path ? 'Baixar currículo' : 'Currículo não anexado'}
              </Button>
              <section className="rounded-xl border border-surface-200 p-4">
                <h3 className="font-black text-ink-900">Análise do currículo</h3>
                <p className="mt-1 text-sm text-ink-600">Situação: {formatOperationalValue(application.resume_analysis_status)}{application.resume_analysis_waived_at ? ' · dispensada com justificativa' : ''}</p>
                {application.resume_analysis_waiver_reason ? <p className="mt-2 text-sm text-ink-700">{application.resume_analysis_waiver_reason}</p> : null}
                {canManage && application.resume_analysis_status !== 'completed' && !application.resume_analysis_waived_at ? <div className="mt-3 grid gap-3"><Textarea label="Justificativa da dispensa" value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} /><Button size="sm" variant="secondary" disabled={workspaceSaving || !waiverReason.trim()} onClick={() => void runWorkspaceMutation(() => waiveResumeAnalysis(application.id, waiverReason))}>Dispensar análise</Button></div> : null}
              </section>
            </div>
          ) : null}

          {activeTab === 'perguntas' ? (
            <section className="grid gap-4 rounded-xl border border-surface-200 p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-black text-ink-900">Triagem manual</h3>{canManage && !workspace?.screening ? <Button size="sm" variant="secondary" disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => getOrCreateCandidateScreening(application.id))}>Iniciar triagem</Button> : null}</div>
              {workspace?.screening ? canManage ? <>
                <label className="flex items-center gap-2 text-sm font-bold text-ink-800"><input type="checkbox" checked={workspace.screening.mandatory_requirements_confirmed} onChange={(event) => updateScreeningField('mandatory_requirements_confirmed', event.target.checked)} /> Requisitos obrigatórios confirmados</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([['salary_compatible', 'Compatibilidade salarial'], ['availability_compatible', 'Disponibilidade'], ['location_compatible', 'Localização']] as const).map(([field, label]) => <Select key={field} label={label} value={workspace.screening?.[field] === null ? '' : workspace.screening?.[field] ? 'yes' : 'no'} onChange={(event) => updateScreeningField(field, event.target.value === '' ? null : event.target.value === 'yes')} options={[{ value: '', label: 'Não avaliada' }, { value: 'yes', label: 'Compatível' }, { value: 'no', label: 'Incompatível' }]} />)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2"><Input label="Nota técnica" type="number" min="0" max="10" value={workspace.screening.technical_score ?? ''} onChange={(event) => updateScreeningField('technical_score', event.target.value === '' ? null : Number(event.target.value))} /><Input label="Nota comportamental" type="number" min="0" max="10" value={workspace.screening.behavioral_score ?? ''} onChange={(event) => updateScreeningField('behavioral_score', event.target.value === '' ? null : Number(event.target.value))} /></div>
                <Textarea label="Observações da triagem" value={workspace.screening.recruiter_notes} onChange={(event) => updateScreeningField('recruiter_notes', event.target.value)} />
                <Textarea label="Motivo da reprovação" value={workspace.screening.rejection_reason ?? ''} onChange={(event) => updateScreeningField('rejection_reason', event.target.value || null)} />
                <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={workspaceSaving} onClick={() => void runWorkspaceMutation(() => completeCandidateScreening({ ...workspace.screening!, status: 'draft' }))}>Salvar rascunho</Button><Button disabled={workspaceSaving || !workspace.screening.mandatory_requirements_confirmed} onClick={() => void runWorkspaceMutation(() => completeCandidateScreening({ ...workspace.screening!, status: 'completed' }))}>Concluir e aprovar</Button><Button variant="danger" disabled={workspaceSaving || !workspace.screening.rejection_reason?.trim()} onClick={() => void runWorkspaceMutation(() => completeCandidateScreening({ ...workspace.screening!, status: 'rejected' }))}>Reprovar</Button></div>
              </> : <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-black uppercase text-ink-500">Situação</dt><dd className="mt-1 font-bold">{formatOperationalValue(workspace.screening.status)}</dd></div><div><dt className="text-xs font-black uppercase text-ink-500">Requisitos</dt><dd className="mt-1 font-bold">{workspace.screening.mandatory_requirements_confirmed ? 'Confirmados' : 'Pendentes'}</dd></div></dl> : <EmptyInfo>Triagem manual ainda não iniciada.</EmptyInfo>}
            </section>
          ) : null}

          {activeTab === 'comentarios' ? (
            <div className="grid gap-5">
              <CommentComposer
                onSubmit={async (comment) => {
                  await addApplicationNote(application.id, comment, noteVisibility);
                  setNotes(await listApplicationNotes(application.id));
                }}
              />
              <div className="grid gap-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-surface-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-black text-ink-900">{note.author?.full_name ?? 'Equipe Recruitify'}<Badge variant={note.visibility === 'shared' ? 'info' : 'neutral'}>{note.visibility === 'shared' ? 'Compartilhado' : 'Interno'}</Badge></p>
                      <span className="text-xs text-ink-500">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{note.note}</p>
                  </div>
                ))}
                {!notes.length ? <p className="text-sm text-ink-500">Nenhum comentário sobre este candidato.</p> : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'email' ? (
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-5">
              <Mail className="text-redde-700" size={24} />
              <h3 className="mt-3 text-lg font-black text-ink-900">Entrar em contato</h3>
              <p className="mt-1 text-sm text-ink-500">Abra seu cliente de e-mail com o endereço preenchido.</p>
              <a href={`mailto:${application.candidate_email}?subject=Processo seletivo - ${application.job?.title ?? ''}`}>
                <Button className="mt-4">Escrever e-mail</Button>
              </a>
            </div>
          ) : null}

          {activeTab === 'arquivos' ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={downloadResume}
                disabled={!canDownload || !application.resume_file_path}
                className="flex items-center justify-between rounded-xl border border-surface-200 p-4 text-left hover:bg-surface-50 disabled:opacity-60"
              >
                <span>
                  <span className="block font-black text-ink-900">Currículo</span>
                  <span className="text-sm text-ink-500">
                    {application.resume_file_path ? 'Arquivo enviado na candidatura' : 'Ainda não anexado'}
                  </span>
                </span>
                <Download size={18} />
              </button>
              {application.portfolio_url ? (
                <a href={application.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-surface-200 p-4 hover:bg-surface-50">
                  <span>
                    <span className="block font-black text-ink-900">Portfólio</span>
                    <span className="text-sm text-ink-500">{application.portfolio_url}</span>
                  </span>
                  <ExternalLink size={18} />
                </a>
              ) : null}
              {application.linkedin_url ? (
                <a href={application.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-surface-200 p-4 hover:bg-surface-50">
                  <span>
                    <span className="block font-black text-ink-900">LinkedIn</span>
                    <span className="text-sm text-ink-500">{application.linkedin_url}</span>
                  </span>
                  <ExternalLink size={18} />
                </a>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'historico' ? (
            <HistoryTimeline
              items={[
                ...history.map((item) => ({
                  id: item.id,
                  title: `Movido para ${applicationStageLabels[item.to_stage]}`,
                  description: item.from_stage
                    ? `Etapa anterior: ${applicationStageLabels[item.from_stage]} · ${item.actor?.full_name ?? 'Equipe'}`
                    : item.actor?.full_name,
                  createdAt: item.created_at,
                })),
                {
                  id: `created-${application.id}`,
                  title: 'Candidatura recebida',
                  description: application.source ? `Origem: ${application.source}` : null,
                  createdAt: application.created_at,
                },
              ]}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
