import {
  BadgeDollarSign,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileText,
  KanbanSquare,
  MessageSquareText,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { EmptyState } from '../../components/public/EmptyState';
import { LoadingState } from '../../components/public/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { getCurrentFranchise } from '../../lib/auth';
import {
  addChatMessage,
  addDocument,
  approveJobDescriptionAndPublish,
  convertOpportunityToProject,
  createAccountPayable,
  createSalesOpportunity,
  generateJobDescription,
  getConversionMissingFields,
  getDefaultBriefingPayload,
  getWorkspaceAlerts,
  listFranchiseWorkspace,
  markTaskDone,
  projectStageLabels,
  releaseFinalistsToClient,
  salesStageLabels,
  saveBriefing,
  selectFinalist,
  updateWorkflowSettings,
  updateContract,
  updatePostSaleTask,
  updateReceivable,
  updateSalesOpportunity,
  type BriefingPayload,
  type FranchiseWorkspaceData,
  type GeneratedJobDescription,
  type SalesOpportunity,
  type SalesStage,
} from '../../lib/franchiseOps';
import { createApplicationRanking } from '../../lib/ranking';
import { getJobUrl } from '../../lib/jobUrls';
import { useAdminProfile } from '../../routes/ProtectedRoute';

type ModuleKey =
  | 'dashboard'
  | 'crm'
  | 'clientes'
  | 'projetos'
  | 'vagas'
  | 'candidatos'
  | 'agenda'
  | 'chat'
  | 'contratos'
  | 'financeiro'
  | 'notas-fiscais'
  | 'documentos'
  | 'pos-venda'
  | 'relatorios'
  | 'configuracoes';

const moduleTitles: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM de vendas',
  clientes: 'Clientes',
  projetos: 'Projetos',
  vagas: 'Vagas',
  candidatos: 'Candidatos',
  agenda: 'Agenda',
  chat: 'Chat',
  contratos: 'Contratos',
  financeiro: 'Financeiro',
  'notas-fiscais': 'Notas fiscais',
  documentos: 'Documentos',
  'pos-venda': 'Pos-venda',
  relatorios: 'Relatorios',
  configuracoes: 'Configuracoes',
};

const leadSources = [
  'Prospecção ativa',
  'Indicação',
  'Tráfego pago',
  'Instagram',
  'WhatsApp',
  'Site / formulário',
  'Cliente antigo',
  'Outro',
];

const blankOpportunity = {
  company_name: '',
  legal_name: '',
  document: '',
  segment: '',
  contact_name: '',
  contact_role: '',
  contact_phone: '',
  contact_email: '',
  city: '',
  source: 'Prospecção ativa',
  campaign: '',
  need: '',
  estimated_positions: 1,
  service_name: 'Recrutamento e seleção',
  negotiated_value: 0,
  payment_terms: '50_50',
  contract_status: 'not_generated',
  initial_payment_status: 'pending',
  signed_contract_url: '',
  payment_link: '',
  stage: 'new_lead' as SalesStage,
  next_follow_up: '',
  notes: '',
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function publicUrl(path: string) {
  return `${window.location.origin}${path}`;
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function field<K extends keyof typeof blankOpportunity>(
  form: typeof blankOpportunity,
  key: K,
  setForm: (form: typeof blankOpportunity) => void,
) {
  return {
    value: String(form[key] ?? ''),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({
        ...form,
        [key]: key === 'estimated_positions' || key === 'negotiated_value' ? Number(event.target.value) : event.target.value,
      }),
  };
}

function statusBadge(status: string) {
  if (['paid', 'received', 'signed', 'issued', 'approved', 'done', 'open'].includes(status)) return 'success';
  if (['pending', 'sent', 'generated', 'ready_to_issue'].includes(status)) return 'warning';
  if (['overdue', 'cancelled', 'rejected'].includes(status)) return 'danger';
  return 'neutral';
}

const invoiceStatusLabels: Record<string, string> = {
  ready_to_issue: 'Pronta para emissao',
  pending: 'Pendente',
  issued: 'Emitida/registrada',
  cancelled: 'Cancelada',
};

function LeadModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: typeof blankOpportunity) => void;
}) {
  const [form, setForm] = useState(blankOpportunity);

  useEffect(() => {
    if (open) setForm(blankOpportunity);
  }, [open]);

  return (
    <Modal open={open} title="Nova oportunidade" description="Cadastre o lead comercial e acompanhe ate virar projeto." onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome fantasia" required {...field(form, 'company_name', setForm)} />
          <Input label="Razão social" {...field(form, 'legal_name', setForm)} />
          <Input label="CNPJ" {...field(form, 'document', setForm)} />
          <Input label="Segmento" {...field(form, 'segment', setForm)} />
          <Input label="Responsável principal" required {...field(form, 'contact_name', setForm)} />
          <Input label="Cargo" {...field(form, 'contact_role', setForm)} />
          <Input label="WhatsApp" required {...field(form, 'contact_phone', setForm)} />
          <Input label="E-mail" type="email" required {...field(form, 'contact_email', setForm)} />
          <Input label="Cidade" {...field(form, 'city', setForm)} />
          <Select
            label="Origem"
            options={leadSources.map((source) => ({ label: source, value: source }))}
            {...field(form, 'source', setForm)}
          />
          <Input label="Campanha/origem detalhada" {...field(form, 'campaign', setForm)} />
          <Input label="Serviço contratado" required {...field(form, 'service_name', setForm)} />
          <Input label="Quantidade de vagas estimadas" type="number" min="1" {...field(form, 'estimated_positions', setForm)} />
          <Input label="Valor negociado" type="number" min="0" step="0.01" {...field(form, 'negotiated_value', setForm)} />
          <Select
            label="Condição de pagamento"
            options={[
              { label: '50% de entrada e 50% ao final', value: '50_50' },
              { label: '3 vezes no cartão', value: 'cartao_3x' },
              { label: 'Pagamento à vista', value: 'avista' },
              { label: 'Condição personalizada', value: 'personalizada' },
            ]}
            {...field(form, 'payment_terms', setForm)}
          />
          <Select
            label="Status do contrato"
            options={[
              { label: 'Não gerado', value: 'not_generated' },
              { label: 'Gerado', value: 'generated' },
              { label: 'Enviado', value: 'sent' },
              { label: 'Assinado', value: 'signed' },
              { label: 'Cancelado', value: 'cancelled' },
            ]}
            {...field(form, 'contract_status', setForm)}
          />
          <Select
            label="Pagamento inicial"
            options={[
              { label: 'Pendente', value: 'pending' },
              { label: 'Pago', value: 'paid' },
              { label: 'Dispensado', value: 'waived' },
              { label: 'Vencido', value: 'overdue' },
            ]}
            {...field(form, 'initial_payment_status', setForm)}
          />
          <Input label="Link do contrato assinado" {...field(form, 'signed_contract_url', setForm)} />
          <Input label="Link de pagamento" {...field(form, 'payment_link', setForm)} />
          <Input label="Próximo follow-up" type="date" {...field(form, 'next_follow_up', setForm)} />
        </div>
        <Textarea label="Necessidade da empresa" rows={3} {...field(form, 'need', setForm)} />
        <Textarea label="Observações" rows={3} {...field(form, 'notes', setForm)} />
        <Button type="submit">
          <Plus size={18} />
          Criar oportunidade
        </Button>
      </form>
    </Modal>
  );
}

function FormalizationModal({
  opportunity,
  open,
  onClose,
  onConfirm,
}: {
  opportunity: SalesOpportunity | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (values: Partial<SalesOpportunity>) => void;
}) {
  const [form, setForm] = useState<Partial<SalesOpportunity>>({});

  useEffect(() => {
    setForm(opportunity ?? {});
  }, [opportunity]);

  if (!opportunity) return null;

  const update = (key: keyof SalesOpportunity, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const missing = getConversionMissingFields({ ...opportunity, ...form } as SalesOpportunity);
  const formalizationMissing = [
    ...(missing.length ? missing : []),
    form.contract_status !== 'signed' ? 'contrato comercial assinado' : '',
    !['paid', 'waived'].includes(String(form.initial_payment_status)) ? 'entrada paga ou dispensada' : '',
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      title="Marcar ganho e iniciar projeto"
      description="Formalize contrato e entrada antes de criar projeto, OS, financeiro, contrato e briefing."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(form);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome fantasia" value={form.company_name ?? ''} onChange={(event) => update('company_name', event.target.value)} required />
          <Input label="Razão social" value={form.legal_name ?? ''} onChange={(event) => update('legal_name', event.target.value)} />
          <Input label="CNPJ" value={form.document ?? ''} onChange={(event) => update('document', event.target.value)} required />
          <Input label="Responsável principal" value={form.contact_name ?? ''} onChange={(event) => update('contact_name', event.target.value)} required />
          <Input label="E-mail" type="email" value={form.contact_email ?? ''} onChange={(event) => update('contact_email', event.target.value)} required />
          <Input label="WhatsApp" value={form.contact_phone ?? ''} onChange={(event) => update('contact_phone', event.target.value)} required />
          <Input label="Serviço contratado" value={form.service_name ?? ''} onChange={(event) => update('service_name', event.target.value)} required />
          <Input
            label="Valor negociado"
            type="number"
            min="0"
            step="0.01"
            value={form.negotiated_value ?? 0}
            onChange={(event) => update('negotiated_value', Number(event.target.value))}
            required
          />
          <Select
            label="Condição de pagamento"
            value={form.payment_terms ?? '50_50'}
            onChange={(event) => update('payment_terms', event.target.value)}
            options={[
              { label: '50% de entrada e 50% ao final', value: '50_50' },
              { label: '3 vezes no cartão', value: 'cartao_3x' },
              { label: 'Pagamento à vista', value: 'avista' },
              { label: 'Condição personalizada', value: 'personalizada' },
            ]}
          />
          <Select
            label="Status do contrato"
            value={form.contract_status ?? 'not_generated'}
            onChange={(event) => update('contract_status', event.target.value)}
            options={[
              { label: 'Não gerado', value: 'not_generated' },
              { label: 'Gerado', value: 'generated' },
              { label: 'Enviado', value: 'sent' },
              { label: 'Assinado', value: 'signed' },
              { label: 'Cancelado', value: 'cancelled' },
            ]}
          />
          <Select
            label="Status da entrada"
            value={form.initial_payment_status ?? 'pending'}
            onChange={(event) => update('initial_payment_status', event.target.value)}
            options={[
              { label: 'Pendente', value: 'pending' },
              { label: 'Paga', value: 'paid' },
              { label: 'Dispensada', value: 'waived' },
              { label: 'Vencida', value: 'overdue' },
            ]}
          />
          <Input label="Contrato assinado (link/anexo)" value={form.signed_contract_url ?? ''} onChange={(event) => update('signed_contract_url', event.target.value)} />
          <Input label="Link de pagamento" value={form.payment_link ?? ''} onChange={(event) => update('payment_link', event.target.value)} />
        </div>
        <Textarea label="Observações comerciais" rows={3} value={form.notes ?? ''} onChange={(event) => update('notes', event.target.value)} />
        {formalizationMissing.length ? (
          <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">
            Pendências: {formalizationMissing.join(', ')}.
          </div>
        ) : null}
        <Button type="submit" disabled={formalizationMissing.length > 0}>
          <BriefcaseBusiness size={18} />
          Marcar ganho e iniciar projeto
        </Button>
      </form>
    </Modal>
  );
}

function BriefingModal({
  open,
  payload,
  onClose,
  onSave,
}: {
  open: boolean;
  payload: BriefingPayload | null;
  onClose: () => void;
  onSave: (payload: BriefingPayload, approve: boolean) => void;
}) {
  const [form, setForm] = useState<BriefingPayload | null>(payload);

  useEffect(() => setForm(payload), [payload]);

  if (!form) return null;
  const update = (key: keyof BriefingPayload, value: string) => setForm({ ...form, [key]: value });

  return (
    <Modal open={open} title="Briefing da vaga" description="Dados nativos da plataforma, preenchidos pelo franqueado ou cliente." onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form, true);
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['companyName', 'Empresa'],
            ['document', 'CNPJ'],
            ['contactName', 'Responsável'],
            ['contactEmail', 'E-mail'],
            ['contactPhone', 'WhatsApp'],
            ['segment', 'Segmento'],
            ['title', 'Título da vaga'],
            ['positions', 'Quantidade de vagas'],
            ['department', 'Setor'],
            ['managerName', 'Gestor responsável'],
            ['cityNeighborhood', 'Cidade/bairro'],
            ['schedule', 'Jornada/horário'],
            ['salary', 'Salário'],
            ['benefits', 'Benefícios'],
            ['desiredStartDate', 'Data desejada de início'],
            ['education', 'Escolaridade'],
            ['minimumExperience', 'Experiência mínima'],
            ['companyInterviewers', 'Quem entrevista na empresa'],
            ['interviewAvailability', 'Disponibilidade para entrevistas'],
            ['requiredDocuments', 'Documentos exigidos'],
          ].map(([key, label]) => (
            <Input
              key={key}
              label={label}
              value={String(form[key as keyof BriefingPayload] ?? '')}
              onChange={(event) => update(key as keyof BriefingPayload, event.target.value)}
            />
          ))}
          <Select
            label="Tipo de contratação"
            value={form.contractType}
            onChange={(event) => update('contractType', event.target.value)}
            options={[
              { label: 'CLT', value: 'clt' },
              { label: 'PJ', value: 'pj' },
              { label: 'Estágio', value: 'estagio' },
              { label: 'Temporário', value: 'temporario' },
              { label: 'Freelancer', value: 'freelancer' },
              { label: 'Outro', value: 'outro' },
            ]}
          />
          <Select
            label="Modalidade"
            value={form.modality}
            onChange={(event) => update('modality', event.target.value)}
            options={[
              { label: 'Presencial', value: 'presencial' },
              { label: 'Híbrida', value: 'hibrido' },
              { label: 'Remota', value: 'remoto' },
            ]}
          />
        </div>
        {[
          ['hiringReason', 'Motivo da contratação'],
          ['mandatoryRequirements', 'Requisitos obrigatórios'],
          ['desirableRequirements', 'Requisitos desejáveis'],
          ['technicalSkills', 'Competências técnicas'],
          ['behavioralSkills', 'Competências comportamentais'],
          ['responsibilities', 'Principais responsabilidades'],
          ['routine', 'Rotina do cargo'],
          ['goals', 'Metas esperadas'],
          ['challenges', 'Desafios da função'],
          ['successCriteria', 'Critérios de sucesso'],
          ['selectionSteps', 'Etapas previstas'],
          ['additionalNotes', 'Observações adicionais'],
        ].map(([key, label]) => (
          <Textarea
            key={key}
            label={label}
            rows={3}
            value={String(form[key as keyof BriefingPayload] ?? '')}
            onChange={(event) => update(key as keyof BriefingPayload, event.target.value)}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => onSave(form, false)}>
            Salvar rascunho
          </Button>
          <Button type="submit">
            <CheckCircle2 size={18} />
            Aprovar briefing
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DescriptionModal({
  open,
  content,
  onClose,
  onApprove,
}: {
  open: boolean;
  content: GeneratedJobDescription | null;
  onClose: () => void;
  onApprove: (content: GeneratedJobDescription) => void;
}) {
  const [form, setForm] = useState<GeneratedJobDescription | null>(content);
  useEffect(() => setForm(content), [content]);
  if (!form) return null;
  const update = (key: keyof GeneratedJobDescription, value: string) => setForm({ ...form, [key]: value });

  return (
    <Modal open={open} title="Descrição gerada" description="Revise, edite e aprove antes de publicar a vaga." onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onApprove(form);
        }}
      >
        <Input label="Título" value={form.title} onChange={(event) => update('title', event.target.value)} />
        <Textarea label="Resumo" rows={4} value={form.summary} onChange={(event) => update('summary', event.target.value)} />
        <Textarea label="Responsabilidades" rows={5} value={form.responsibilities} onChange={(event) => update('responsibilities', event.target.value)} />
        <Textarea
          label="Requisitos obrigatórios"
          rows={5}
          value={form.mandatoryRequirements}
          onChange={(event) => update('mandatoryRequirements', event.target.value)}
        />
        <Textarea
          label="Diferenciais"
          rows={4}
          value={form.desirableRequirements}
          onChange={(event) => update('desirableRequirements', event.target.value)}
        />
        <Textarea label="Benefícios" rows={4} value={form.benefits} onChange={(event) => update('benefits', event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Jornada" value={form.schedule} onChange={(event) => update('schedule', event.target.value)} />
          <Input label="Local" value={form.location} onChange={(event) => update('location', event.target.value)} />
        </div>
        <Button type="submit">
          <Send size={18} />
          Aprovar e publicar vaga
        </Button>
      </form>
    </Modal>
  );
}

export function FranchiseWorkspace() {
  const profile = useAdminProfile();
  const params = useParams();
  const moduleKey = ((params.moduleKey as ModuleKey | undefined) ?? 'dashboard') in moduleTitles ? ((params.moduleKey as ModuleKey) ?? 'dashboard') : 'dashboard';
  const [franchiseName, setFranchiseName] = useState('Franqueado');
  const [data, setData] = useState<FranchiseWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [formalizingOpportunityId, setFormalizingOpportunityId] = useState<string | null>(null);
  const [briefingProjectId, setBriefingProjectId] = useState<string | null>(null);
  const [descriptionId, setDescriptionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const load = useCallback(async () => {
    if (!profile.franchise_id) return;
    setLoading(true);
    setError('');
    try {
      const franchise = await getCurrentFranchise();
      setFranchiseName(franchise?.name ?? 'Minha franquia');
      setData(await listFranchiseWorkspace(profile.franchise_id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar a operacao.');
    } finally {
      setLoading(false);
    }
  }, [profile.franchise_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    if (!data) return null;
    const alerts = getWorkspaceAlerts(data);
    const month = new Date().toISOString().slice(0, 7);
    return {
      openLeads: data.opportunities.filter((item) => !['won', 'lost'].includes(item.stage)).length,
      negotiation: data.opportunities.filter((item) => ['qualification', 'proposal_sent', 'contract_entry'].includes(item.stage)).length,
      wonThisMonth: data.opportunities.filter((item) => item.stage === 'won' && item.updated_at.startsWith(month)).length,
      activeProjects: data.projects.filter((item) => item.stage !== 'completed').length,
      openJobs: data.jobs.filter((item) => item.status === 'open').length,
      applications: data.applications.length,
      screening: data.applications.filter((item) => ['novo', 'triagem', 'em_analise'].includes(item.status)).length,
      waitingClient: data.projects.filter((item) => item.stage === 'waiting_client').length,
      interviews: data.schedules.length,
      approved: data.hiringDecisions.filter((item) => item.decision === 'approved').length,
      revenueForecast: data.accountsReceivable.reduce((sum, item) => sum + item.total_amount, 0),
      receivable: data.accountsReceivable.filter((item) => item.status !== 'received').reduce((sum, item) => sum + item.remaining_amount + item.entry_amount, 0),
      nps: data.npsResponses.length
        ? Math.round(data.npsResponses.reduce((sum, item) => sum + item.score, 0) / data.npsResponses.length)
        : 0,
      alerts: alerts.length,
    };
  }, [data]);

  if (loading) return <LoadingState label="Carregando visão do franqueado..." />;
  if (!profile.franchise_id) return <EmptyState title="Seu usuário não está vinculado a uma franquia." />;
  if (!data || !stats) return <EmptyState title="Não foi possível carregar a operação." />;

  const alerts = getWorkspaceAlerts(data);
  const selectedBriefing = data.briefings.find((item) => item.project_id === briefingProjectId);
  const selectedProject = data.projects.find((item) => item.id === briefingProjectId);
  const selectedOpportunity = selectedProject ? data.opportunities.find((item) => item.id === selectedProject.opportunity_id) : null;
  const formalizingOpportunity = data.opportunities.find((item) => item.id === formalizingOpportunityId) ?? null;
  const selectedDescription = data.jobDescriptions.find((item) => item.id === descriptionId);
  const refresh = async () => load();

  async function safeAction(action: () => Promise<unknown> | unknown) {
    setError('');
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Nao foi possivel concluir a acao.');
    }
  }

  const renderDashboard = () => (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Leads em aberto" value={stats.openLeads} icon={UsersRound} />
        <AdminStatCard title="Oportunidades em negociação" value={stats.negotiation} icon={KanbanSquare} />
        <AdminStatCard title="Oportunidades ganhas no mês" value={stats.wonThisMonth} icon={CheckCircle2} />
        <AdminStatCard title="Projetos ativos" value={stats.activeProjects} icon={BriefcaseBusiness} />
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={FileText} />
        <AdminStatCard title="Candidatos recebidos" value={stats.applications} icon={UsersRound} />
        <AdminStatCard title="Candidatos em triagem" value={stats.screening} icon={ClipboardCheck} />
        <AdminStatCard title="Finalistas aguardando cliente" value={stats.waitingClient} icon={Send} />
        <AdminStatCard title="Entrevistas agendadas" value={stats.interviews} icon={CalendarDays} />
        <AdminStatCard title="Candidatos aprovados" value={stats.approved} icon={CheckCircle2} />
        <AdminStatCard title="Receita prevista" value={money(stats.revenueForecast)} icon={BadgeDollarSign} />
        <AdminStatCard title="Valores a receber" value={money(stats.receivable)} icon={ReceiptText} />
        <AdminStatCard title="NPS médio" value={stats.nps || '-'} icon={Sparkles} />
        <AdminStatCard title="Alertas pendentes" value={stats.alerts} icon={Bell} />
      </div>
      <Card className="p-5">
        <h2 className="text-xl font-black text-ink-900">Ações de hoje</h2>
        <div className="mt-4 grid gap-3">
          {alerts.length ? (
            alerts.slice(0, 12).map((alert) => (
              <div key={`${alert.type}-${alert.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-3">
                <span className="text-sm font-semibold text-ink-700">{alert.title}</span>
                <Badge>{alert.type}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">Nenhuma ação crítica pendente agora.</p>
          )}
        </div>
      </Card>
    </div>
  );

  const renderCrm = () => (
    <div className="grid gap-4 overflow-x-auto">
      <div className="grid min-w-[1180px] grid-cols-7 gap-3">
        {(Object.keys(salesStageLabels) as SalesStage[]).map((stage) => (
          <div key={stage} className="rounded-lg border border-surface-200 bg-white p-3">
            <h2 className="text-sm font-black text-ink-900">{salesStageLabels[stage]}</h2>
            <div className="mt-3 grid gap-3">
              {data.opportunities
                .filter((item) => item.stage === stage)
                .map((opportunity) => {
                  const missing = getConversionMissingFields(opportunity);
                  return (
                    <div key={opportunity.id} className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                      <p className="font-bold text-ink-900">{opportunity.company_name}</p>
                      <p className="mt-1 text-xs text-ink-500">{opportunity.contact_name} · {opportunity.contact_phone}</p>
                      <p className="mt-2 text-sm font-semibold text-redde-700">{money(opportunity.negotiated_value)}</p>
                      <div className="mt-3 grid gap-2">
                        <Select
                          aria-label="Etapa"
                          value={opportunity.stage}
                          onChange={(event) => {
                            const nextStage = event.target.value as SalesStage;
                            if (nextStage === 'won') {
                              setFormalizingOpportunityId(opportunity.id);
                              return;
                            }
                            void safeAction(() => updateSalesOpportunity(opportunity.id, { stage: nextStage }));
                          }}
                          options={(Object.keys(salesStageLabels) as SalesStage[]).map((value) => ({ value, label: salesStageLabels[value] }))}
                        />
                        <Button
                          size="sm"
                          disabled={Boolean(opportunity.converted_project_id)}
                          onClick={() => setFormalizingOpportunityId(opportunity.id)}
                        >
                          <BriefcaseBusiness size={15} />
                          Marcar ganho e iniciar projeto
                        </Button>
                        {missing.length ? <p className="text-xs font-semibold text-redde-700">Faltam: {missing.slice(0, 3).join(', ')}</p> : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="grid gap-4">
      {data.projects.length ? (
        data.projects.map((project) => {
          const company = data.companies.find((item) => item.id === project.client_id);
          const briefing = data.briefings.find((item) => item.project_id === project.id);
          const draft = data.jobDescriptions.find((item) => item.project_id === project.id);
          const job = data.jobs.find((item) => item.id === project.job_id);
          const finalistCount = data.finalists.filter((item) => item.project_id === project.id).length;
          return (
            <Card key={project.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-ink-900">{project.title}</h2>
                    <Badge>{projectStageLabels[project.stage]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{company?.name ?? 'Cliente'} · {project.next_step}</p>
                  <p className="mt-3 text-sm text-ink-500">
                    Briefing: <strong>{briefing?.status ?? 'nao criado'}</strong> · Finalistas: <strong>{finalistCount}/3</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {briefing ? (
                    <Button variant="secondary" onClick={() => copyText(publicUrl(`/briefing/${briefing.secure_token}`))}>
                      <Copy size={16} />
                      Link briefing
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => setBriefingProjectId(project.id)}>
                    <FileCheck2 size={16} />
                    Briefing
                  </Button>
                  <Link to={`/admin/franqueado/projetos/${project.id}`}>
                    <Button variant="secondary">
                      Detalhe
                    </Button>
                  </Link>
                  <Button onClick={() => safeAction(() => generateJobDescription(project.id))}>
                    <Sparkles size={16} />
                    Gerar descrição
                  </Button>
                  {draft ? (
                    <Button variant="secondary" onClick={() => setDescriptionId(draft.id)}>
                      Revisar descrição
                    </Button>
                  ) : null}
                  {job?.company?.slug ? (
                    <Link to={getJobUrl(job.company.slug, job.slug)}>
                      <Button variant="ghost">Ver vaga</Button>
                    </Link>
                  ) : null}
                  {finalistCount ? (
                    <Button variant="secondary" onClick={() => safeAction(() => releaseFinalistsToClient(project.id))}>
                      <Send size={16} />
                      Liberar portal
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => copyText(publicUrl(`/portal-cliente/${project.client_access_token}`))}>
                    <Copy size={16} />
                    Portal cliente
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <EmptyState title="Nenhum projeto criado. Converta uma oportunidade ganha no CRM." />
      )}
    </div>
  );

  const renderCandidates = () => (
    <div className="grid gap-4">
      {data.applications.length ? (
        data.applications.map((application) => {
          const job = data.jobs.find((item) => item.id === application.job_id);
          const project = data.projects.find((item) => item.job_id === application.job_id);
          const ranking = createApplicationRanking(application, job);
          const isFinalist = data.finalists.some((item) => item.application_id === application.id);
          return (
            <Card key={application.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-ink-900">{application.candidate_name}</h2>
                    <Badge variant={ranking.score >= 75 ? 'success' : ranking.score >= 55 ? 'warning' : 'neutral'}>
                      {ranking.score}% aderência
                    </Badge>
                    <Badge>{application.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">{job?.title ?? 'Vaga'} · {application.candidate_email} · {application.candidate_phone}</p>
                  <p className="mt-3 text-sm text-ink-700">{ranking.summary}</p>
                  <p className="mt-2 text-xs text-ink-500">Pontos fortes: {ranking.strengths.join(', ') || 'validar em triagem'}</p>
                  <p className="mt-1 text-xs text-ink-500">Atenção: {ranking.concerns.join(', ') || 'sem alertas relevantes'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project ? (
                    <Button disabled={isFinalist} onClick={() => safeAction(() => selectFinalist(project.id, application.id))}>
                      <CheckCircle2 size={16} />
                      {isFinalist ? 'Finalista' : 'Marcar finalista'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <EmptyState title="Nenhuma candidatura recebida ainda." />
      )}
    </div>
  );

  const renderClients = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.companies.map((company) => {
        const projects = data.projects.filter((item) => item.client_id === company.id);
        const receivables = data.accountsReceivable.filter((item) => item.client_id === company.id);
        const nps = data.npsResponses.filter((item) => item.client_id === company.id);
        return (
          <Card key={company.id} className="p-5">
            <h2 className="text-lg font-black text-ink-900">{company.name}</h2>
            <p className="mt-1 text-sm text-ink-500">{company.segment ?? 'Segmento não informado'} · {company.city ?? 'Cidade não informada'}</p>
            <div className="mt-4 grid gap-2 text-sm text-ink-600">
              <span>Projetos: <strong>{projects.length}</strong></span>
              <span>Financeiro: <strong>{money(receivables.reduce((sum, item) => sum + item.total_amount, 0))}</strong></span>
              <span>NPS médio: <strong>{nps.length ? Math.round(nps.reduce((sum, item) => sum + item.score, 0) / nps.length) : '-'}</strong></span>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderJobs = () => (
    <div className="grid gap-4">
      {data.jobs.map((job) => (
        <Card key={job.id} className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-ink-900">{job.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{job.company?.name} · {job.city ?? 'Remoto/sem cidade'} · {money(job.billing_amount)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={job.status === 'open' ? 'success' : 'neutral'}>{job.status}</Badge>
              {job.company?.slug ? (
                <Button variant="secondary" onClick={() => copyText(publicUrl(getJobUrl(job.company!.slug, job.slug)))}>
                  <Copy size={16} />
                  Link público
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
      {!data.jobs.length ? <EmptyState title="Nenhuma vaga publicada ainda." /> : null}
    </div>
  );

  const renderFinance = () => {
    const totalReceived = data.accountsReceivable.filter((item) => item.status === 'received').reduce((sum, item) => sum + item.total_amount, 0);
    const expenses = data.accountsPayable.reduce((sum, item) => sum + item.amount, 0);
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard title="Total a receber" value={money(stats.receivable)} icon={ReceiptText} />
          <AdminStatCard title="Total recebido" value={money(totalReceived)} icon={CheckCircle2} />
          <AdminStatCard title="Despesas do mês" value={money(expenses)} icon={BadgeDollarSign} />
          <AdminStatCard title="Resultado previsto" value={money(stats.revenueForecast - expenses)} icon={Sparkles} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Contas a receber</h2>
            <div className="mt-4 grid gap-3">
              {data.accountsReceivable.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-surface-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{item.description}</strong>
                    <Badge variant={statusBadge(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="text-sm text-ink-500">{money(item.total_amount)} · vencimento {item.due_date}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => safeAction(() => updateReceivable(item.id, { status: 'received' }))}>
                      Marcar recebido
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => safeAction(() => updateReceivable(item.id, { status: 'overdue' }))}>
                      Marcar vencido
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Contas a pagar</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void safeAction(() =>
                  createAccountPayable(profile.franchise_id!, {
                    project_id: String(form.get('project_id') || '') || null,
                    description: String(form.get('description') || ''),
                    category: String(form.get('category') || 'outros'),
                    amount: Number(form.get('amount') || 0),
                    due_date: String(form.get('due_date') || new Date().toISOString().slice(0, 10)),
                    status: 'pending',
                    attachment_url: '',
                  }),
                );
                event.currentTarget.reset();
              }}
            >
              <Input name="description" label="Despesa" required />
              <div className="grid gap-3 md:grid-cols-3">
                <Input name="category" label="Categoria" />
                <Input name="amount" label="Valor" type="number" min="0" step="0.01" required />
                <Input name="due_date" label="Vencimento" type="date" required />
              </div>
              <Button type="submit" size="sm">
                <Plus size={16} />
                Lançar despesa
              </Button>
            </form>
            <div className="mt-4 grid gap-2">
              {data.accountsPayable.map((item) => (
                <p key={item.id} className="rounded-lg bg-surface-50 p-3 text-sm">
                  <strong>{item.description}</strong> · {money(item.amount)} · {item.status}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderSimpleLists = () => {
    if (moduleKey === 'agenda') {
      const events = [
        ...data.tasks.map((item) => ({ id: item.id, title: item.title, date: item.due_at, action: () => markTaskDone(item.id), done: item.status === 'done' })),
        ...data.schedules.map((item) => ({ id: item.id, title: `Entrevista com cliente (${item.format})`, date: `${item.date} ${item.time}`, action: null, done: Boolean(item.candidate_confirmed_at) })),
        ...data.accountsReceivable.map((item) => ({ id: item.id, title: `Vencimento financeiro: ${item.description}`, date: item.due_date, action: null, done: item.status === 'received' })),
      ];
      return (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-ink-900">{event.title}</p>
                <p className="text-sm text-ink-500">{event.date}</p>
              </div>
              <Badge variant={event.done ? 'success' : 'warning'}>{event.done ? 'ok' : 'pendente'}</Badge>
            </Card>
          ))}
        </div>
      );
    }

    if (moduleKey === 'chat') {
      return (
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Conversas e templates</h2>
          <p className="mt-2 text-sm text-ink-600">
            Este modulo registra conversas internas e textos preparados para WhatsApp. O envio real por WhatsApp Business API ainda depende de integracao externa.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void safeAction(() => addChatMessage(profile.franchise_id!, null, quickMessage, 'Atendimento comercial'));
              setQuickMessage('');
            }}
          >
            <Textarea label="Nova mensagem interna" value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} required />
            <Button type="submit" disabled={!quickMessage.trim()}>
              <MessageSquareText size={17} />
              Registrar conversa
            </Button>
          </form>
          <div className="mt-5 grid gap-3">
            {data.conversations.map((conversation) => (
              <div key={conversation.id} className="rounded-lg border border-surface-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{conversation.title}</p>
                  <Badge>{conversation.channel === 'whatsapp_ready' ? 'Preparado para WhatsApp' : 'Interno'}</Badge>
                  <Badge variant={conversation.status === 'closed' ? 'neutral' : 'warning'}>{conversation.status}</Badge>
                </div>
                {data.messages
                  .filter((message) => message.conversation_id === conversation.id)
                  .map((message) => <p key={message.id} className="mt-2 text-sm text-ink-500">{message.body}</p>)}
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (moduleKey === 'contratos') {
      return (
        <div className="grid gap-3">
          {data.contracts.map((contract) => (
            <Card key={contract.id} className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
              <div>
                <p className="font-bold text-ink-900">{data.companies.find((item) => item.id === contract.client_id)?.name}</p>
                <p className="text-sm text-ink-500">
                  {contract.provider ? `Provedor: ${contract.provider}` : 'Preparado para Clicksign, Docusign, Autentique, ZapSign ou provedor futuro.'}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {contract.provider_document_id ? `Documento: ${contract.provider_document_id}` : 'Sem documento externo vinculado'} ·{' '}
                  {contract.signed_at ? `Assinado em ${contract.signed_at.slice(0, 10)}` : 'Assinatura ainda nao registrada'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-redde-700">
                  {contract.signing_url ? <a href={contract.signing_url} target="_blank" rel="noreferrer">Link de assinatura</a> : null}
                  {contract.signed_file_url ? <a href={contract.signed_file_url} target="_blank" rel="noreferrer">Arquivo assinado</a> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant={statusBadge(contract.status)}>{contract.status}</Badge>
                <Button size="sm" onClick={() => safeAction(() => updateContract(contract.id, { status: 'signed', signed_at: new Date().toISOString() }))}>
                  Marcar assinado
                </Button>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (moduleKey === 'notas-fiscais') {
      return (
        <div className="grid gap-3">
          <Card className="p-4">
            <h2 className="text-lg font-black text-ink-900">Controle de NFS-e</h2>
            <p className="mt-2 text-sm text-ink-600">
              A plataforma registra a NFS-e como pronta para emissao ao final do servico. Ela nao emite nota automaticamente; o numero, arquivo e status devem ser atualizados apos emissao no sistema fiscal ou integracao futura.
            </p>
          </Card>
          {data.invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-bold text-ink-900">{data.companies.find((item) => item.id === invoice.client_id)?.name}</p>
                  <p className="text-sm text-ink-500">{money(invoice.amount)} · prevista para {invoice.expected_date}</p>
                </div>
                <Badge variant={statusBadge(invoice.status)}>{invoiceStatusLabels[invoice.status] ?? invoice.status}</Badge>
              </div>
            </Card>
          ))}
          {!data.invoices.length ? <EmptyState title="Nenhuma NFS-e pendente. Ela será criada ao final do serviço." /> : null}
        </div>
      );
    }

    if (moduleKey === 'documentos') {
      return (
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">Central de documentos</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void safeAction(() =>
                addDocument(profile.franchise_id!, {
                  project_id: null,
                  client_id: null,
                  application_id: null,
                  type: 'administrativo',
                  name: documentName,
                  url: documentUrl,
                  notes: '',
                }),
              );
              setDocumentName('');
              setDocumentUrl('');
            }}
          >
            <Input label="Nome" value={documentName} onChange={(event) => setDocumentName(event.target.value)} required />
            <Input label="Link/arquivo" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} required />
            <Button type="submit" className="self-end">
              <Plus size={16} />
              Adicionar
            </Button>
          </form>
          <div className="mt-5 grid gap-2">
            {data.documents.map((document) => (
              <a key={document.id} href={document.url} target="_blank" rel="noreferrer" className="rounded-lg border border-surface-200 p-3 text-sm font-semibold">
                {document.name}
              </a>
            ))}
          </div>
        </Card>
      );
    }

    if (moduleKey === 'pos-venda') {
      return (
        <div className="grid gap-3">
          {data.postSaleTasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-bold text-ink-900">{task.title}</p>
                  <p className="text-sm text-ink-500">Vencimento {task.due_date} · risco {task.replacement_risk}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => safeAction(() => updatePostSaleTask(task.id, { status: 'done', contact_date: new Date().toISOString() }))}>
                  Concluir contato
                </Button>
              </div>
            </Card>
          ))}
          {!data.postSaleTasks.length ? <EmptyState title="As tarefas de pós-venda serão criadas após aprovação final do candidato." /> : null}
        </div>
      );
    }

    if (moduleKey === 'relatorios') {
      const bySource = leadSources.map((source) => ({
        source,
        count: data.opportunities.filter((item) => item.source === source).length,
      }));
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Comercial</h2>
            <div className="mt-4 grid gap-2">
              {bySource.map((item) => <p key={item.source} className="text-sm text-ink-600">{item.source}: <strong>{item.count}</strong></p>)}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Operação</h2>
            <p className="mt-4 text-sm text-ink-600">Projetos ativos: <strong>{stats.activeProjects}</strong></p>
            <p className="mt-2 text-sm text-ink-600">Candidaturas por vaga: <strong>{data.jobs.length ? Math.round(data.applications.length / data.jobs.length) : 0}</strong></p>
            <p className="mt-2 text-sm text-ink-600">Finalistas enviados: <strong>{data.finalists.length}</strong></p>
          </Card>
        </div>
      );
    }

    const workflowSettings = data.workflowSettings[0];
    const postSaleDays = workflowSettings?.post_sale_days?.length ? workflowSettings.post_sale_days : [30, 60, 90];
    const saveWorkflowSettings = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const days = String(formData.get('post_sale_days') ?? '')
        .split(/[,\s;]+/)
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0)
        .sort((a, b) => a - b);
      const duration = Number(formData.get('interview_default_duration') ?? 60);
      void safeAction(() => {
        if (!days.length) throw new Error('Informe ao menos um prazo valido de pos-venda.');
        return updateWorkflowSettings(profile.franchise_id!, {
          post_sale_days: days,
          interview_default_duration: Number.isFinite(duration) && duration > 0 ? duration : 60,
        });
      });
    };

    return (
      <Card className="p-5">
        <h2 className="text-xl font-black text-ink-900">Configurações da operação</h2>
        <div className="mt-4 grid gap-3 text-sm text-ink-600">
          <p>Templates de entrevista ativos para confirmação do candidato.</p>
          <p>Régua padrão de pós-venda: 30, 60 e 90 dias após início.</p>
          <p>Integrações futuras preparadas: WhatsApp Business API, assinatura digital, NFS-e e gateway de pagamento.</p>
        </div>
        <form className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={saveWorkflowSettings}>
          <Input
            name="post_sale_days"
            label="Regua de pos-venda em dias"
            defaultValue={postSaleDays.join(', ')}
            placeholder="30, 60, 90"
            required
          />
          <Input
            name="interview_default_duration"
            label="Duracao padrao"
            type="number"
            min="15"
            step="15"
            defaultValue={workflowSettings?.interview_default_duration ?? 60}
            required
          />
          <Button type="submit" className="self-end">
            <Settings size={16} />
            Salvar
          </Button>
        </form>
      </Card>
    );
  };

  const body =
    moduleKey === 'dashboard'
      ? renderDashboard()
      : moduleKey === 'crm'
        ? renderCrm()
        : moduleKey === 'clientes'
          ? renderClients()
          : moduleKey === 'projetos'
            ? renderProjects()
            : moduleKey === 'vagas'
              ? renderJobs()
              : moduleKey === 'candidatos'
                ? renderCandidates()
                : moduleKey === 'financeiro'
                  ? renderFinance()
                  : renderSimpleLists();

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-redde-700">{franchiseName}</p>
          <h1 className="mt-1 text-3xl font-black text-ink-900">{moduleTitles[moduleKey]}</h1>
          <p className="mt-2 text-ink-500">Operação comercial, recrutamento, cliente e financeiro em um só fluxo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => refresh()}>
            <RefreshCw size={17} />
            Atualizar
          </Button>
          <Button onClick={() => setLeadModalOpen(true)}>
            <Plus size={18} />
            Nova oportunidade
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-lg bg-redde-50 px-4 py-3 text-sm font-semibold text-redde-700">{error}</div> : null}

      {body}

      <LeadModal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onSave={(values) =>
          safeAction(() => {
            createSalesOpportunity(profile.franchise_id!, values as Partial<SalesOpportunity> & Pick<SalesOpportunity, 'company_name' | 'contact_name' | 'contact_phone' | 'contact_email' | 'service_name'>);
            setLeadModalOpen(false);
          })
        }
      />

      <FormalizationModal
        open={Boolean(formalizingOpportunityId)}
        opportunity={formalizingOpportunity}
        onClose={() => setFormalizingOpportunityId(null)}
        onConfirm={(values) =>
          safeAction(async () => {
            if (!formalizingOpportunity) throw new Error('Oportunidade não encontrada.');
            await updateSalesOpportunity(formalizingOpportunity.id, values);
            await convertOpportunityToProject(formalizingOpportunity.id);
            setFormalizingOpportunityId(null);
          })
        }
      />

      <BriefingModal
        open={Boolean(briefingProjectId)}
        payload={selectedBriefing?.payload ?? (selectedOpportunity ? getDefaultBriefingPayload(selectedOpportunity, selectedProject?.title) : null)}
        onClose={() => setBriefingProjectId(null)}
        onSave={(payload, approve) =>
          safeAction(() => {
            if (!selectedBriefing) throw new Error('Briefing nao encontrado.');
            saveBriefing(selectedBriefing.id, payload, approve ? 'approved' : 'in_progress', 'franchise');
            setBriefingProjectId(null);
          })
        }
      />

      <DescriptionModal
        open={Boolean(descriptionId)}
        content={selectedDescription?.content ?? null}
        onClose={() => setDescriptionId(null)}
        onApprove={(content) =>
          safeAction(async () => {
            if (!selectedDescription) throw new Error('Descricao nao encontrada.');
            await approveJobDescriptionAndPublish(selectedDescription.id, content);
            setDescriptionId(null);
          })
        }
      />
    </div>
  );
}
