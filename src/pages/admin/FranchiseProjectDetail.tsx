import {
  BadgeDollarSign, BriefcaseBusiness, CalendarDays, ClipboardCheck,
  MessageSquareText, ReceiptText, Send, Sparkles, UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  analyzeCandidateResume, approveFinalistReport, completeCandidateScreening, completeInternalInterview,
  completePostSaleContact, generateFinalistReport, getOrCreateCandidateScreening, getOrCreateInternalInterview,
  listFranchiseWorkspace, projectStageLabels, rejectCandidateInScreening, releaseFinalistsToClient,
  saveCandidateScreening, saveFinalistReport, saveInternalInterview, scheduleInternalInterview, selectFinalist,
  updateReceivableInstallment, waiveCandidateResumeAnalysis,
  type CandidateScreening, type FinalistAiReport, type FranchiseWorkspaceData, type InternalInterview, type PostSaleTask,
} from '../../lib/franchiseOps';
import { getPersistedApplicationRanking } from '../../lib/ranking';
import { applicationStatusLabels, formatOperationalValue, jobStatusLabels } from '../../lib/formatters';
import { createResumeSignedUrl, uploadFranchiseFile } from '../../lib/storage';
import { useAdminProfile } from '../../routes/ProtectedRoute';

const tabs = [
  'Resumo', 'Cliente', 'Contrato / OS / Financeiro', 'Briefing', 'Descrição da vaga', 'Vaga publicada',
  'Candidatos', 'Ranking', 'Triagem', 'Entrevistas internas', 'Finalistas', 'Aprovação do cliente',
  'Agenda', 'Aprovação final', 'NPS', 'Pós-venda', 'Documentos', 'Timeline',
] as const;
type Tab = (typeof tabs)[number];
const tabLabels: Record<Tab, string> = {
  Resumo: 'Resumo',
  Cliente: 'Cliente',
  'Contrato / OS / Financeiro': 'Contrato / ordem de serviço / financeiro',
  Briefing: 'Levantamento da vaga',
  'Descrição da vaga': 'Descrição da vaga',
  'Vaga publicada': 'Vaga publicada',
  Candidatos: 'Candidatos',
  Ranking: 'Classificação',
  Triagem: 'Triagem',
  'Entrevistas internas': 'Entrevistas internas',
  Finalistas: 'Finalistas',
  'Aprovação do cliente': 'Aprovação do cliente',
  Agenda: 'Agenda',
  'Aprovação final': 'Aprovação final',
  NPS: 'Satisfação do cliente',
  'Pós-venda': 'Pós-venda',
  Documentos: 'Documentos',
  Timeline: 'Linha do tempo',
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}
function answersToText(value: Record<string, string>) {
  return Object.entries(value).map(([question, answer]) => `${question} | ${answer}`).join('\n');
}
function textToAnswers(value: string) {
  return Object.fromEntries(value.split('\n').map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts[0]).map(([question, answer]) => [question, answer ?? '']));
}
function qaToText(value: Array<{ question: string; answer: string }>) {
  return value.map((item) => `${item.question} | ${item.answer}`).join('\n');
}
function textToQa(value: string) {
  return value.split('\n').map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts[0]).map(([question, answer]) => ({ question, answer: answer ?? '' }));
}

export function FranchiseProjectDetail() {
  const profile = useAdminProfile();
  const { projectId } = useParams();
  const [data, setData] = useState<FranchiseWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Resumo');
  const [screening, setScreening] = useState<CandidateScreening | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState('');
  const [interview, setInterview] = useState<InternalInterview | null>(null);
  const [interviewAnswers, setInterviewAnswers] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const [releaseReason, setReleaseReason] = useState('');
  const [postSale, setPostSale] = useState<PostSaleTask | null>(null);

  const load = useCallback(async () => {
    if (!profile.franchise_id) { setLoading(false); return; }
    setLoading(true);
    try { setData(await listFranchiseWorkspace(profile.franchise_id)); }
    finally { setLoading(false); }
  }, [profile.franchise_id]);
  useEffect(() => { void load(); }, [load]);

  const model = useMemo(() => {
    const project = data?.projects.find((item) => item.id === projectId) ?? null;
    if (!data || !project) return null;
    const applications = data.applications.filter((item) => item.job_id === project.job_id);
    const receivables = data.accountsReceivable.filter((item) => item.project_id === project.id);
    return {
      project, applications,
      company: data.companies.find((item) => item.id === project.client_id) ?? null,
      opportunity: data.opportunities.find((item) => item.id === project.opportunity_id) ?? null,
      briefing: data.briefings.find((item) => item.project_id === project.id) ?? null,
      description: data.jobDescriptions.find((item) => item.project_id === project.id) ?? null,
      job: data.jobs.find((item) => item.id === project.job_id) ?? null,
      finalists: data.finalists.filter((item) => item.project_id === project.id),
      screenings: data.screenings.filter((item) => item.project_id === project.id),
      interviews: data.internalInterviews.filter((item) => item.project_id === project.id),
      schedules: data.schedules.filter((item) => item.project_id === project.id),
      decisions: data.hiringDecisions.filter((item) => item.project_id === project.id),
      serviceOrder: data.serviceOrders.find((item) => item.project_id === project.id) ?? null,
      receivables,
      installments: data.receivableInstallments.filter((item) => item.project_id === project.id),
      invoices: data.invoices.filter((item) => item.project_id === project.id),
      postSaleTasks: data.postSaleTasks.filter((item) => item.project_id === project.id),
      documents: data.documents.filter((item) => item.project_id === project.id || item.client_id === project.client_id),
      nps: data.npsResponses.find((item) => item.project_id === project.id) ?? null,
      contract: data.contracts.find((item) => item.project_id === project.id) ?? null,
    };
  }, [data, projectId]);

  const action = useCallback(async (fn: () => Promise<unknown> | unknown, message: string) => {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); setSuccess(message); await load(); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Não foi possível concluir a ação.'); }
    finally { setBusy(false); }
  }, [load]);

  if (loading) return <LoadingState label="Carregando projeto..." />;
  if (!model) return <EmptyState title="Projeto não encontrado." />;

  const openScreening = async (applicationId: string) => {
    await action(async () => {
      const row = await getOrCreateCandidateScreening(model.project.id, applicationId);
      setScreening(row); setScreeningAnswers(answersToText(row.answers));
    }, 'Triagem aberta.');
  };
  const openInterview = async (applicationId: string) => {
    await action(async () => {
      const row = await getOrCreateInternalInterview(model.project.id, applicationId);
      setInterview(row); setInterviewAnswers(qaToText(row.questions_answers));
    }, 'Entrevista interna aberta.');
  };
  const openResume = async (path: string) => {
    await action(async () => window.open(await createResumeSignedUrl(path), '_blank', 'noopener,noreferrer'), 'Currículo aberto com link temporário.');
  };
  const uploadReceipt = async (event: ChangeEvent<HTMLInputElement>, installmentId: string) => {
    const file = event.target.files?.[0]; if (!file || !profile.franchise_id) return;
    await action(async () => updateReceivableInstallment(installmentId, {
      receipt_url: await uploadFranchiseFile(file, profile.franchise_id!, 'receipts'),
    }), 'Comprovante anexado.');
  };

  const received = model.installments.filter((item) => item.status === 'received').reduce((sum, item) => sum + item.amount, 0);
  const open = model.installments.filter((item) => ['pending', 'overdue'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const future = model.installments.filter((item) => item.status === 'locked').reduce((sum, item) => sum + item.amount, 0);
  const activeFinalists = model.finalists.filter((item) => item.status !== 'draft');
  const report = reportId ? model.finalists.find((item) => item.id === reportId) ?? null : null;
  const summaryCards: Array<[string, LucideIcon, string]> = [
    ['Projeto', BriefcaseBusiness, projectStageLabels[model.project.stage]], ['Recebido', BadgeDollarSign, money(received)],
    ['Briefing', ClipboardCheck, model.briefing?.status ?? '-'], ['Candidatos', UsersRound, String(model.applications.length)],
    ['Agenda', CalendarDays, String(model.schedules.length)], ['NFS-e', ReceiptText, model.invoices[0]?.status ?? '-'],
  ];

  const simpleText: Partial<Record<Tab, string>> = {
    Resumo: `${model.company?.name ?? 'Cliente'} · ${projectStageLabels[model.project.stage]} · ${model.project.next_step}`,
    Cliente: `${model.company?.name ?? '-'} · ${model.company?.legal_name ?? '-'} · ${model.company?.city ?? '-'}`,
    Briefing: `Situação: ${formatOperationalValue(model.briefing?.status)} · Vaga: ${model.briefing?.payload.title ?? '-'}`,
    'Descrição da vaga': `Situação: ${formatOperationalValue(model.description?.status)} · Provedor: ${model.description?.ai_provider ?? '-'}`,
    'Vaga publicada': model.job ? `${model.job.title} · ${jobStatusLabels[model.job.status]}` : 'Ainda não publicada',
    Agenda: `${model.schedules.length} entrevista(s) com cliente`,
    Documentos: `${model.documents.length} documento(s) vinculado(s)`,
    Timeline: `Projeto criado em ${new Date(model.project.created_at).toLocaleDateString('pt-BR')}`,
  };

  return <div className="grid gap-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><Link to="/admin/franqueado/projetos" className="text-sm font-bold text-redde-600">Voltar para projetos</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black text-ink-900">{model.project.title}</h1><Badge>{projectStageLabels[model.project.stage]}</Badge></div>
        <p className="mt-2 text-ink-500">{model.company?.name ?? 'Cliente não informado'}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{model.applications.filter((item) => item.stage === 'qualificacao').length} em triagem</Badge>
        <Badge>{model.applications.filter((item) => item.stage === 'entrevista').length} entrevistas</Badge>
        <Badge>{activeFinalists.length}/3 finalistas</Badge>
        <Badge>{model.applications.filter((item) => item.stage === 'contratacao').length} contratados</Badge>
        {model.project.job_id ? <Link to={`/franqueado/processos/${model.project.job_id}?tab=selecao`}><Button size="sm"><UsersRound size={16} />Gerenciar candidatos</Button></Link> : null}
      </div>
    </div>
    {error ? <div className="rounded-lg bg-redde-50 p-3 text-sm font-bold text-redde-700">{error}</div> : null}
    {success ? <div className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{success}</div> : null}
    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">{summaryCards.map(([title, Icon, value]) =>
      <Card key={title} className="p-4"><Icon className="text-redde-600" size={20}/><p className="mt-3 text-xs font-bold uppercase text-ink-500">{title}</p><p className="mt-1 text-lg font-black text-ink-900">{value}</p></Card>)}</div>
    <Card className="p-3"><div className="flex gap-2 overflow-x-auto">{tabs.map((tab) =>
      <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`min-w-max rounded-lg px-3 py-2 text-sm font-bold ${activeTab === tab ? 'bg-redde-500 text-white' : 'bg-surface-50 text-ink-700'}`}>{tabLabels[tab]}</button>)}</div></Card>
    <Card className="p-6">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-redde-50 text-redde-600"><MessageSquareText size={20}/></span>
        <div><h2 className="text-xl font-black text-ink-900">{tabLabels[activeTab]}</h2><p className="text-sm text-ink-500">{simpleText[activeTab]}</p></div></div>

      {(activeTab === 'Candidatos' || activeTab === 'Ranking') ? <div className="mt-5 grid gap-4">{model.applications.map((application) => {
        const ranking = getPersistedApplicationRanking(application, model.job);
        return <div key={application.id} className="rounded-lg border border-surface-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-ink-900">{application.candidate_name}</p>
            <p className="text-sm text-ink-500">{applicationStatusLabels[application.status]} · {ranking.score}% · {ranking.source === 'ai' ? 'Classificação por inteligência artificial' : 'Estimativa preliminar'}</p></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void openResume(application.resume_file_path)}>Currículo</Button>
              <Button size="sm" disabled={busy || application.resume_analysis_status === 'processing'} onClick={() => void action(() => analyzeCandidateResume(application.id), 'Análise concluída.')}>{application.resume_analysis_status === 'completed' ? 'Analisar novamente' : 'Analisar currículo'}</Button>
              {application.resume_analysis_status === 'failed' ? <Button size="sm" variant="secondary" onClick={() => { const reason = window.prompt('Justificativa obrigatória para dispensar a análise:'); if (reason) void action(() => waiveCandidateResumeAnalysis(application.id, reason), 'Dispensa registrada com justificativa.'); }}>Dispensar com justificativa</Button> : null}
              <Button size="sm" variant="secondary" onClick={() => void openScreening(application.id)}>Abrir triagem</Button></div></div>
          {application.resume_analysis_error ? <p className="mt-2 text-sm text-redde-700">{application.resume_analysis_error}</p> : null}
          {activeTab === 'Ranking' ? <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><p className="text-sm font-bold">Requisitos atendidos</p><p className="text-sm text-ink-600">{ranking.metRequirements.join(' · ') || 'Nenhuma evidência registrada'}</p></div>
            <div><p className="text-sm font-bold">Requisitos ausentes</p><p className="text-sm text-ink-600">{ranking.missingRequirements.join(' · ') || 'Nenhum'}</p></div>
            <div className="md:col-span-2"><p className="text-sm font-bold">Evidências</p><p className="text-sm text-ink-600">{ranking.evidence.join(' · ') || ranking.summary}</p></div>
            {Object.entries(ranking.criteria).map(([key, value]) => <div key={key} className="flex justify-between rounded bg-surface-50 p-2 text-sm"><span>{key.replaceAll('_', ' ')}</span><strong>{value}%</strong></div>)}
          </div> : null}
        </div>;
      })}</div> : null}

      {activeTab === 'Triagem' ? <div className="mt-5 grid gap-3">{model.applications.map((application) => {
        const row = model.screenings.find((item) => item.application_id === application.id);
        return <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-bold">{application.candidate_name}</p><p className="text-sm text-ink-500">{formatOperationalValue(row?.status, 'não iniciada')} · análise {formatOperationalValue(application.resume_analysis_status)}</p></div><Button size="sm" onClick={() => void openScreening(application.id)}>Abrir triagem</Button></div>;
      })}</div> : null}

      {activeTab === 'Entrevistas internas' ? <div className="mt-5 grid gap-3">{model.screenings.filter((item) => item.status === 'completed').map((row) => {
        const application = model.applications.find((item) => item.id === row.application_id);
        const current = model.interviews.find((item) => item.application_id === row.application_id);
        return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-bold">{application?.candidate_name}</p><p className="text-sm text-ink-500">{formatOperationalValue(current?.status, 'não iniciada')} · {formatOperationalValue(current?.recommendation, 'sem recomendação')}</p></div><Button size="sm" onClick={() => void openInterview(row.application_id)}>Abrir entrevista</Button></div>;
      })}</div> : null}

      {activeTab === 'Finalistas' ? <div className="mt-5 grid gap-4">{model.interviews.filter((item) => item.status === 'completed' && item.recommendation !== 'no').map((row) => {
        const application = model.applications.find((item) => item.id === row.application_id);
        const finalist = model.finalists.find((item) => item.application_id === row.application_id);
        return <div key={row.id} className="rounded-lg border p-4"><p className="font-black">{application?.candidate_name}</p><p className="mt-1 text-sm text-ink-500">Parecer: {formatOperationalValue(finalist?.ai_report_status, 'não gerado')} · Seleção: {formatOperationalValue(finalist?.status, 'pendente')}</p>
          {finalist?.ai_report ? <p className="mt-3 text-sm leading-6 text-ink-600">{finalist.ai_report}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => void action(() => generateFinalistReport(model.project.id, row.application_id), 'Parecer gerado para revisão.')}><Sparkles size={15}/>Gerar parecer</Button>
            {finalist ? <Button size="sm" variant="secondary" onClick={() => { setReportId(finalist.id); setReportText(finalist.ai_report); }}>Revisar</Button> : null}
            {finalist?.ai_report_status === 'generated' ? <Button size="sm" onClick={() => void action(() => approveFinalistReport(finalist.id), 'Parecer aprovado.')}>Aprovar parecer</Button> : null}
            {finalist?.ai_report_status === 'approved' && finalist.status === 'draft' ? <Button size="sm" onClick={() => void action(() => selectFinalist(model.project.id, row.application_id, 'Processo interno concluído.'), 'Candidato selecionado como finalista.')}>Selecionar finalista</Button> : null}</div>
        </div>;
      })}</div> : null}

      {activeTab === 'Aprovação do cliente' ? <div className="mt-5 grid gap-4"><div className="rounded-lg border p-4"><p className="font-bold">{activeFinalists.length} finalista(s) selecionado(s)</p><p className="text-sm text-ink-500">Todos precisam de parecer aprovado. Para liberar menos de três, registre uma justificativa.</p>
        <Textarea className="mt-3" label="Justificativa para menos de três" value={releaseReason} onChange={(event) => setReleaseReason(event.target.value)}/>
        <div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => void action(() => releaseFinalistsToClient(model.project.id, releaseReason), 'Portal liberado ao cliente.') }><Send size={16}/>Liberar portal</Button>
          <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/portal-cliente/${model.project.client_access_token}`)}>Copiar link</Button></div></div>
        {model.finalists.map((item) => <div key={item.id} className="rounded border p-3 text-sm">{model.applications.find((app) => app.id === item.application_id)?.candidate_name} · {formatOperationalValue(item.status)} · parecer {formatOperationalValue(item.ai_report_status)}</div>)}</div> : null}

      {activeTab === 'Contrato / OS / Financeiro' ? <div className="mt-5 grid gap-4"><div className="grid gap-3 sm:grid-cols-3"><Card className="p-3"><p className="text-xs text-ink-500">Recebido</p><p className="font-black">{money(received)}</p></Card><Card className="p-3"><p className="text-xs text-ink-500">A receber</p><p className="font-black">{money(open)}</p></Card><Card className="p-3"><p className="text-xs text-ink-500">Saldo futuro</p><p className="font-black">{money(future)}</p></Card></div>
        <p className="text-sm text-ink-600">Contrato: {formatOperationalValue(model.contract?.status)} · assinatura {model.contract?.provider ? formatOperationalValue(model.contract.signature_status) : 'externa/manual'} · ordem de serviço {money(model.serviceOrder?.amount)}</p>
        {model.receivables.map((receivable) => <div key={receivable.id} className="rounded-lg border p-4"><p className="font-bold">{receivable.description} · {money(receivable.total_amount)}</p><div className="mt-3 grid gap-3">{model.installments.filter((item) => item.receivable_id === receivable.id).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-surface-50 p-3"><div><p className="font-bold">{item.description} · {money(item.amount)}</p><p className="text-xs text-ink-500">{formatOperationalValue(item.status)} · vencimento {item.due_date ?? '-'} · gatilho {formatOperationalValue(item.release_trigger)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={item.status === 'locked'} onClick={() => void action(() => updateReceivableInstallment(item.id, { status: 'received' }), 'Parcela marcada como recebida.')}>Recebida</Button><Button size="sm" variant="secondary" disabled={item.status === 'locked'} onClick={() => void action(() => updateReceivableInstallment(item.id, { status: 'overdue' }), 'Parcela marcada como vencida.')}>Vencida</Button><label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm font-bold">Comprovante<input className="hidden" type="file" onChange={(event) => void uploadReceipt(event, item.id)}/></label></div></div>)}</div></div>)}</div> : null}

      {activeTab === 'Aprovação final' ? <div className="mt-5 grid gap-3"><p className="font-bold">Situação conjunta: {formatOperationalValue(model.project.client_decision_status)}</p>{model.decisions.map((item) => <div key={item.id} className="rounded border p-3"><p className="font-bold">{model.applications.find((app) => app.id === item.application_id)?.candidate_name} · {formatOperationalValue(item.decision)}</p><p className="text-sm text-ink-500">{item.is_final ? `Finalizada em ${item.finalized_at ? new Date(item.finalized_at).toLocaleString('pt-BR') : '-'}` : 'Decisão salva como rascunho'} · início {item.start_date ?? '-'}</p></div>)}</div> : null}
      {activeTab === 'NPS' ? <div className="mt-5"><p className="font-bold">{model.nps ? `Nota ${model.nps.score}/10` : model.project.nps_released_at ? 'Liberado e aguardando resposta' : 'Bloqueado até a finalização conjunta'}</p>{model.nps ? <p className="text-sm text-ink-500">{model.nps.comment}</p> : null}</div> : null}
      {activeTab === 'Pós-venda' ? <div className="mt-5 grid gap-3">{model.postSaleTasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 rounded border p-3"><div><p className="font-bold">{task.title}</p><p className="text-sm text-ink-500">{formatOperationalValue(task.status)} · {task.due_date}</p></div><Button size="sm" onClick={() => setPostSale(task)}>Registrar contato</Button></div>)}</div> : null}
      {activeTab === 'Agenda' ? <div className="mt-5 grid gap-3">{model.schedules.map((item) => <div key={item.id} className="rounded border p-3"><p className="font-bold">{item.date} às {item.time}</p><p className="text-sm text-ink-500">{formatOperationalValue(item.format)} · {item.location_or_link} · {item.candidate_confirmed_at ? 'confirmada' : 'aguardando confirmação'}</p></div>)}</div> : null}
      {activeTab === 'Documentos' ? <div className="mt-5 grid gap-3">{model.documents.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="rounded border p-3 font-bold">{item.name}</a>)}</div> : null}
      {simpleText[activeTab] && !['Agenda', 'Documentos'].includes(activeTab) ? <p className="mt-5 leading-7 text-ink-600">{simpleText[activeTab]}</p> : null}
    </Card>

    <Modal open={Boolean(screening)} onClose={() => setScreening(null)} title="Triagem manual obrigatória">{screening ? <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2"><Select label="Requisitos obrigatórios" value={screening.mandatory_requirements_confirmed ? 'yes' : 'no'} options={[{label:'Não confirmado',value:'no'},{label:'Confirmado',value:'yes'}]} onChange={(e) => setScreening({...screening,mandatory_requirements_confirmed:e.target.value==='yes'})}/>
        {(['salary_compatible','availability_compatible','location_compatible'] as const).map((key) => <Select key={key} label={key.replaceAll('_',' ')} value={screening[key] === null ? '' : screening[key] ? 'yes':'no'} options={[{label:'Selecione',value:''},{label:'Compatível',value:'yes'},{label:'Incompatível',value:'no'}]} onChange={(e) => setScreening({...screening,[key]:e.target.value ? e.target.value==='yes':null})}/>)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Nota técnica (0-10)" type="number" min="0" max="10" value={screening.technical_score ?? ''} onChange={(e)=>setScreening({...screening,technical_score:e.target.value===''?null:Number(e.target.value)})}/><Input label="Nota comportamental (0-10)" type="number" min="0" max="10" value={screening.behavioral_score ?? ''} onChange={(e)=>setScreening({...screening,behavioral_score:e.target.value===''?null:Number(e.target.value)})}/></div>
      <Textarea label="Perguntas e respostas (pergunta | resposta)" value={screeningAnswers} onChange={(e)=>setScreeningAnswers(e.target.value)}/><Textarea label="Observações do recrutador" value={screening.recruiter_notes} onChange={(e)=>setScreening({...screening,recruiter_notes:e.target.value})}/><Input label="Motivo da reprovação" value={screening.rejection_reason ?? ''} onChange={(e)=>setScreening({...screening,rejection_reason:e.target.value})}/>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void action(() => saveCandidateScreening(screening.id,{...screening,answers:textToAnswers(screeningAnswers)}),'Rascunho salvo.')}>Salvar rascunho</Button><Button onClick={() => void action(() => completeCandidateScreening(screening.id,{...screening,answers:textToAnswers(screeningAnswers)}),'Triagem concluída.')}>Concluir triagem</Button><Button variant="danger" onClick={() => void action(() => rejectCandidateInScreening(screening.id,screening.rejection_reason ?? ''),'Candidato reprovado.')}>Reprovar</Button></div>
    </div> : null}</Modal>

    <Modal open={Boolean(interview)} onClose={() => setInterview(null)} title="Entrevista interna obrigatória">{interview ? <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><Input label="Agendada para" type="datetime-local" value={interview.scheduled_at?.slice(0,16) ?? ''} onChange={(e)=>setInterview({...interview,scheduled_at:e.target.value})}/><Input label="Realizada em" type="datetime-local" value={interview.interviewed_at?.slice(0,16) ?? ''} onChange={(e)=>setInterview({...interview,interviewed_at:e.target.value})}/><Select label="Entrevistador" value={interview.interviewer_id ?? ''} options={[{label:'Selecione',value:''},{label:profile.full_name,value:profile.id}]} onChange={(e)=>setInterview({...interview,interviewer_id:e.target.value||null})}/><Select label="Recomendação" value={interview.recommendation ?? ''} options={[{label:'Selecione',value:''},{label:'Fortemente recomendado',value:'strong_yes'},{label:'Recomendado',value:'yes'},{label:'Com ressalvas',value:'with_reservations'},{label:'Não recomendado',value:'no'}]} onChange={(e)=>setInterview({...interview,recommendation:(e.target.value||null) as InternalInterview['recommendation']})}/></div>
      <Textarea label="Roteiro e respostas (pergunta | resposta)" value={interviewAnswers} onChange={(e)=>setInterviewAnswers(e.target.value)}/><div className="grid gap-3 sm:grid-cols-2"><Textarea label="Pontos fortes" value={interview.strengths} onChange={(e)=>setInterview({...interview,strengths:e.target.value})}/><Textarea label="Riscos" value={interview.risks} onChange={(e)=>setInterview({...interview,risks:e.target.value})}/></div><div className="grid gap-3 sm:grid-cols-4">{(['technical_score','behavioral_score','communication_score','culture_score'] as const).map((key)=><Input key={key} label={key.replaceAll('_',' ')} type="number" min="0" max="10" value={interview[key] ?? ''} onChange={(e)=>setInterview({...interview,[key]:e.target.value===''?null:Number(e.target.value)})}/>)}</div><Textarea label="Conclusão final" value={interview.conclusion} onChange={(e)=>setInterview({...interview,conclusion:e.target.value})}/><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void action(() => saveInternalInterview(interview.id,{...interview,questions_answers:textToQa(interviewAnswers)}),'Entrevista salva.')}>Salvar</Button><Button variant="secondary" onClick={() => void action(() => scheduleInternalInterview(interview.id,interview.scheduled_at ?? ''),'Entrevista agendada.')}>Agendar</Button><Button onClick={() => void action(() => completeInternalInterview(interview.id,{...interview,questions_answers:textToQa(interviewAnswers)}),'Entrevista concluída.')}>Concluir</Button></div></div> : null}</Modal>

    <Modal open={Boolean(report)} onClose={() => setReportId(null)} title="Revisar parecer ao cliente">{report ? <div className="grid gap-4"><Textarea rows={14} label="Parecer aprovado para o cliente" value={reportText} onChange={(e)=>setReportText(e.target.value)}/><Button onClick={() => void action(() => saveFinalistReport(report.id,reportText,{...(report.ai_report_payload as FinalistAiReport),client_facing_report:reportText}),'Parecer revisado.')}>Salvar revisão</Button></div> : null}</Modal>

    <Modal open={Boolean(postSale)} onClose={() => setPostSale(null)} title="Registrar contato de pós-venda">{postSale ? <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><Input label="Data do contato" type="datetime-local" value={postSale.contact_date?.slice(0,16) ?? ''} onChange={(e)=>setPostSale({...postSale,contact_date:e.target.value})}/><Input label="Pessoa contatada" value={postSale.contacted_person} onChange={(e)=>setPostSale({...postSale,contacted_person:e.target.value})}/><Select label="Situação do candidato" value={postSale.candidate_status} options={['','ativo','em_adaptacao','com_dificuldades','desligado','pediu_desligamento','nao_iniciou','sem_retorno'].map(value=>({label:value ? formatOperationalValue(value) : 'Selecione',value}))} onChange={(e)=>setPostSale({...postSale,candidate_status:e.target.value})}/><Select label="Satisfação do cliente" value={postSale.client_satisfaction} options={['','muito_satisfeito','satisfeito','neutro','insatisfeito','muito_insatisfeito'].map(value=>({label:value ? formatOperationalValue(value) : 'Selecione',value}))} onChange={(e)=>setPostSale({...postSale,client_satisfaction:e.target.value})}/><Select label="Risco de reposição" value={postSale.replacement_risk} options={['baixo','medio','alto','reposicao_necessaria'].map(value=>({label:formatOperationalValue(value),value}))} onChange={(e)=>setPostSale({...postSale,replacement_risk:e.target.value})}/><Select label="Situação da tarefa" value={postSale.status} options={[{label:'Aberta',value:'open'},{label:'Concluída',value:'done'},{label:'Adiada',value:'snoozed'}]} onChange={(e)=>setPostSale({...postSale,status:e.target.value as PostSaleTask['status']})}/></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold"><input type="checkbox" checked={postSale.new_position_identified} onChange={(e)=>setPostSale({...postSale,new_position_identified:e.target.checked})}/> Nova vaga identificada</label><label className="text-sm font-semibold"><input type="checkbox" checked={postSale.referral_received} onChange={(e)=>setPostSale({...postSale,referral_received:e.target.checked})}/> Indicação recebida</label></div>{postSale.referral_received ? <div className="grid gap-3 sm:grid-cols-2"><Input label="Nome da indicação" value={postSale.referral_name} onChange={(e)=>setPostSale({...postSale,referral_name:e.target.value})}/><Input label="Contato da indicação" value={postSale.referral_contact} onChange={(e)=>setPostSale({...postSale,referral_contact:e.target.value})}/></div> : null}<Textarea label="Observações" value={postSale.notes} onChange={(e)=>setPostSale({...postSale,notes:e.target.value})}/><div className="grid gap-3 sm:grid-cols-2"><Input label="Próxima ação" value={postSale.next_action} onChange={(e)=>setPostSale({...postSale,next_action:e.target.value})}/><Input label="Data da próxima ação" type="date" value={postSale.next_action_date ?? ''} onChange={(e)=>setPostSale({...postSale,next_action_date:e.target.value||null})}/></div><Button onClick={() => void action(() => completePostSaleContact(postSale.id,postSale),'Contato de pós-venda registrado.')}>Salvar contato</Button></div> : null}</Modal>
  </div>;
}
