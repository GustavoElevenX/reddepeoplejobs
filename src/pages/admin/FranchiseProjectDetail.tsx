import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  ReceiptText,
  Send,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { listFranchiseWorkspace, projectStageLabels, type FranchiseWorkspaceData } from '../../lib/franchiseOps';
import { createApplicationRanking } from '../../lib/ranking';
import { useAdminProfile } from '../../routes/ProtectedRoute';

const tabs = [
  'Resumo',
  'Cliente',
  'Contrato / OS / Financeiro',
  'Briefing',
  'Descrição da vaga',
  'Vaga publicada',
  'Candidatos',
  'Ranking',
  'Triagem',
  'Entrevistas internas',
  'Finalistas',
  'Aprovação do cliente',
  'Agenda',
  'Aprovação final',
  'NPS',
  'Pós-venda',
  'Documentos',
  'Timeline',
] as const;

type Tab = (typeof tabs)[number];

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

export function FranchiseProjectDetail() {
  const profile = useAdminProfile();
  const { projectId } = useParams();
  const [data, setData] = useState<FranchiseWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Resumo');

  useEffect(() => {
    async function load() {
      if (!profile.franchise_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setData(await listFranchiseWorkspace(profile.franchise_id));
      setLoading(false);
    }

    void load();
  }, [profile.franchise_id]);

  const model = useMemo(() => {
    const project = data?.projects.find((item) => item.id === projectId) ?? null;
    if (!data || !project) return null;
    const company = data.companies.find((item) => item.id === project.client_id) ?? null;
    const opportunity = data.opportunities.find((item) => item.id === project.opportunity_id) ?? null;
    const briefing = data.briefings.find((item) => item.project_id === project.id) ?? null;
    const description = data.jobDescriptions.find((item) => item.project_id === project.id) ?? null;
    const job = data.jobs.find((item) => item.id === project.job_id) ?? null;
    const applications = data.applications.filter((item) => item.job_id === project.job_id);
    const finalists = data.finalists.filter((item) => item.project_id === project.id);
    const schedules = data.schedules.filter((item) => item.project_id === project.id);
    const decisions = data.hiringDecisions.filter((item) => item.project_id === project.id);
    const serviceOrder = data.serviceOrders.find((item) => item.project_id === project.id) ?? null;
    const receivables = data.accountsReceivable.filter((item) => item.project_id === project.id);
    const invoices = data.invoices.filter((item) => item.project_id === project.id);
    const postSaleTasks = data.postSaleTasks.filter((item) => item.project_id === project.id);
    const documents = data.documents.filter((item) => item.project_id === project.id || item.client_id === project.client_id);
    const nps = data.npsResponses.find((item) => item.project_id === project.id) ?? null;
    const contract = data.contracts.find((item) => item.project_id === project.id) ?? null;
    return {
      project,
      company,
      opportunity,
      briefing,
      description,
      job,
      applications,
      finalists,
      schedules,
      decisions,
      serviceOrder,
      receivables,
      invoices,
      postSaleTasks,
      documents,
      nps,
      contract,
    };
  }, [data, projectId]);

  if (loading) return <LoadingState label="Carregando projeto..." />;
  if (!model) return <EmptyState title="Projeto não encontrado." />;

  const rows = [
    ['Resumo', `${model.company?.name ?? 'Cliente'} · ${projectStageLabels[model.project.stage]} · ${model.project.next_step}`],
    ['Cliente', `${model.company?.name ?? '-'} · ${model.company?.legal_name ?? '-'} · ${model.company?.city ?? '-'}`],
    [
      'Contrato / OS / Financeiro',
      `Contrato: ${model.contract?.status ?? '-'} · OS: ${model.serviceOrder?.description ?? '-'} · Recebível: ${money(
        model.receivables.reduce((sum, item) => sum + item.total_amount, 0),
      )}`,
    ],
    ['Briefing', `Status: ${model.briefing?.status ?? '-'} · Vaga: ${model.briefing?.payload.title ?? '-'}`],
    ['Descrição da vaga', `Status: ${model.description?.status ?? '-'} · Provedor: ${model.description?.ai_provider ?? '-'}`],
    ['Vaga publicada', model.job ? `${model.job.title} · ${model.job.status}` : 'Ainda não publicada'],
    ['Candidatos', `${model.applications.length} candidatura(s) recebida(s)`],
    [
      'Ranking',
      model.applications
        .map((application) => `${application.candidate_name}: ${createApplicationRanking(application, model.job).score}%`)
        .join(' · ') || 'Sem ranking disponível',
    ],
    ['Triagem', `${model.applications.filter((item) => ['novo', 'triagem', 'em_analise'].includes(item.status)).length} em triagem`],
    ['Entrevistas internas', 'Pareceres e entrevistas internas ficam vinculados às anotações e próximos passos do candidato.'],
    ['Finalistas', `${model.finalists.length}/3 finalista(s)`],
    ['Aprovação do cliente', `${model.finalists.filter((item) => item.status === 'released_to_client').length} liberado(s) no portal`],
    ['Agenda', `${model.schedules.length} entrevista(s) com cliente`],
    ['Aprovação final', `${model.decisions.length} decisão(ões) registrada(s)`],
    ['NPS', model.nps ? `Nota ${model.nps.score}/10 · ${model.nps.comment || 'sem comentário'}` : 'Pendente'],
    ['Pós-venda', `${model.postSaleTasks.filter((item) => item.status !== 'done').length} tarefa(s) pendente(s)`],
    ['Documentos', `${model.documents.length} documento(s) vinculado(s)`],
    [
      'Timeline',
      [
        `Projeto criado em ${new Date(model.project.created_at).toLocaleDateString('pt-BR')}`,
        model.briefing?.filled_at ? `Briefing preenchido em ${new Date(model.briefing.filled_at).toLocaleDateString('pt-BR')}` : '',
        model.job?.published_at ? `Vaga publicada em ${new Date(model.job.published_at).toLocaleDateString('pt-BR')}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    ],
  ] as Array<[Tab, string]>;

  const activeRow = rows.find(([tab]) => tab === activeTab);
  const summaryCards: Array<[string, LucideIcon, string]> = [
    ['Projeto', BriefcaseBusiness, projectStageLabels[model.project.stage]],
    ['Financeiro', BadgeDollarSign, money(model.receivables.reduce((sum, item) => sum + item.total_amount, 0))],
    ['Briefing', ClipboardCheck, model.briefing?.status ?? '-'],
    ['Candidatos', UsersRound, String(model.applications.length)],
    ['Agenda', CalendarDays, String(model.schedules.length)],
    ['NFS-e', ReceiptText, model.invoices[0]?.status ?? '-'],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin/franqueado/projetos" className="text-sm font-bold text-redde-600">
            Voltar para projetos
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black text-ink-900">{model.project.title}</h1>
            <Badge>{projectStageLabels[model.project.stage]}</Badge>
          </div>
          <p className="mt-2 text-ink-500">{model.company?.name ?? 'Cliente não informado'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{model.applications.length} candidatos</Badge>
          <Badge>{model.finalists.length}/3 finalistas</Badge>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(([title, Icon, value]) => (
          <Card key={String(title)} className="p-4">
            <Icon className="text-redde-600" size={20} />
            <p className="mt-3 text-xs font-bold uppercase text-ink-500">{title}</p>
            <p className="mt-1 text-lg font-black text-ink-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-w-max rounded-lg px-3 py-2 text-sm font-bold ${
                activeTab === tab ? 'bg-redde-500 text-white' : 'bg-surface-50 text-ink-700 hover:bg-redde-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-redde-50 text-redde-600">
            {activeTab === 'Candidatos' || activeTab === 'Ranking' ? (
              <UsersRound size={20} />
            ) : activeTab === 'Agenda' ? (
              <CalendarDays size={20} />
            ) : activeTab === 'Documentos' ? (
              <FileText size={20} />
            ) : activeTab === 'Aprovação do cliente' ? (
              <Send size={20} />
            ) : activeTab === 'Aprovação final' ? (
              <CheckCircle2 size={20} />
            ) : (
              <MessageSquareText size={20} />
            )}
          </span>
          <div>
            <h2 className="text-xl font-black text-ink-900">{activeTab}</h2>
            <p className="text-sm text-ink-500">{activeRow?.[1]}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {activeTab === 'Candidatos' || activeTab === 'Ranking' || activeTab === 'Triagem' ? (
            model.applications.map((application) => {
              const ranking = createApplicationRanking(application, model.job);
              return (
                <div key={application.id} className="rounded-lg border border-surface-200 p-3">
                  <p className="font-bold text-ink-900">{application.candidate_name}</p>
                  <p className="mt-1 text-sm text-ink-500">
                    {application.status} · {ranking.score}% aderência · {ranking.summary}
                  </p>
                </div>
              );
            })
          ) : activeTab === 'Finalistas' || activeTab === 'Aprovação do cliente' ? (
            model.finalists.map((finalist) => (
              <div key={finalist.id} className="rounded-lg border border-surface-200 p-3">
                <p className="font-bold text-ink-900">
                  {model.applications.find((item) => item.id === finalist.application_id)?.candidate_name ?? 'Finalista'}
                </p>
                <p className="mt-1 text-sm text-ink-500">{finalist.status} · {finalist.ai_report}</p>
              </div>
            ))
          ) : activeTab === 'Agenda' ? (
            model.schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-lg border border-surface-200 p-3">
                <p className="font-bold text-ink-900">{schedule.date} às {schedule.time}</p>
                <p className="mt-1 text-sm text-ink-500">{schedule.format} · {schedule.location_or_link}</p>
              </div>
            ))
          ) : activeTab === 'Documentos' ? (
            model.documents.map((document) => (
              <a key={document.id} href={document.url} target="_blank" rel="noreferrer" className="rounded-lg border border-surface-200 p-3 font-bold text-ink-900">
                {document.name}
              </a>
            ))
          ) : (
            <p className="leading-7 text-ink-600">{activeRow?.[1]}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
