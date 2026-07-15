import {
  closestCorners,
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileUp,
  FileText,
  GripVertical,
  KanbanSquare,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  completePostSaleContact,
  createAccountPayable,
  createReceivableInstallment,
  createSalesOpportunity,
  deleteDocument,
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
  updateInvoice,
  updateReceivableInstallment,
  updateSalesOpportunity,
  type BriefingPayload,
  type FranchiseWorkspaceData,
  type GeneratedJobDescription,
  type SalesOpportunity,
  type SalesStage,
} from '../../lib/franchiseOps';
import { getPersistedApplicationRanking } from '../../lib/ranking';
import { getJobPath } from '../../lib/jobUrls';
import { applicationStatusLabels, formatOperationalValue, jobStatusLabels } from '../../lib/formatters';
import { createFranchiseFileSignedUrl, uploadFranchiseFile } from '../../lib/storage';
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
  dashboard: 'Painel',
  crm: 'Gestão de vendas',
  clientes: 'Clientes',
  projetos: 'Projetos',
  vagas: 'Vagas',
  candidatos: 'Candidatos',
  agenda: 'Agenda',
  chat: 'Conversas',
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

const crmStageVisuals: Record<
  SalesStage,
  { dot: string; accent: string; badge: string; soft: string }
> = {
  new_lead: {
    dot: 'bg-violet-500',
    accent: 'border-t-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    soft: 'from-violet-50/90',
  },
  first_contact: {
    dot: 'bg-blue-500',
    accent: 'border-t-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    soft: 'from-blue-50/90',
  },
  qualification: {
    dot: 'bg-cyan-500',
    accent: 'border-t-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700',
    soft: 'from-cyan-50/90',
  },
  proposal_sent: {
    dot: 'bg-amber-500',
    accent: 'border-t-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    soft: 'from-amber-50/90',
  },
  contract_entry: {
    dot: 'bg-orange-500',
    accent: 'border-t-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    soft: 'from-orange-50/90',
  },
  won: {
    dot: 'bg-emerald-500',
    accent: 'border-t-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    soft: 'from-emerald-50/90',
  },
  lost: {
    dot: 'bg-rose-500',
    accent: 'border-t-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    soft: 'from-rose-50/90',
  },
};

function CrmStageDropZone({ stage, children }: { stage: SalesStage; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: 'crm-stage', stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column-scroll flex-1 space-y-3 overflow-y-auto p-3 transition duration-200 ${
        isOver ? 'bg-redde-50/80 ring-2 ring-inset ring-redde-200' : ''
      }`}
    >
      {children}
    </div>
  );
}

function CrmDraggableOpportunity({ opportunity, children }: { opportunity: SalesOpportunity; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { type: 'crm-opportunity', stage: opportunity.stage },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`relative touch-none transition ${isDragging ? 'z-50 scale-[1.02] opacity-80 drop-shadow-xl' : ''}`}
    >
      <button
        type="button"
        aria-label={`Arrastar ${opportunity.company_name}`}
        title="Arrastar para outra etapa"
        className="absolute right-3 top-3 z-10 cursor-grab rounded-lg p-1.5 text-ink-500 transition hover:bg-surface-100 hover:text-redde-700 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={17} />
      </button>
      {children}
    </div>
  );
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function publicUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function whatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
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
            label="Situação do contrato"
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
          <Input label="Endereço do contrato assinado" {...field(form, 'signed_contract_url', setForm)} />
          <Input label="Endereço de pagamento" {...field(form, 'payment_link', setForm)} />
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
  submitting,
  onClose,
  onConfirm,
}: {
  opportunity: SalesOpportunity | null;
  open: boolean;
  submitting: boolean;
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
            label="Situação do contrato"
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
            label="Situação da entrada"
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
          <Input label="Endereço de pagamento" value={form.payment_link ?? ''} onChange={(event) => update('payment_link', event.target.value)} />
        </div>
        <Textarea label="Observações comerciais" rows={3} value={form.notes ?? ''} onChange={(event) => update('notes', event.target.value)} />
        {formalizationMissing.length ? (
          <div className="rounded-lg bg-redde-50 p-3 text-sm font-semibold text-redde-700">
            Pendências: {formalizationMissing.join(', ')}.
          </div>
        ) : null}
        <Button type="submit" disabled={formalizationMissing.length > 0 || submitting}>
          <BriefcaseBusiness size={18} />
          {submitting ? 'Iniciando projeto...' : 'Marcar ganho e iniciar projeto'}
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
    <Modal open={open} title="Levantamento da vaga" description="Dados nativos da plataforma, preenchidos pelo franqueado ou cliente." onClose={onClose}>
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
              { label: 'Autônomo', value: 'freelancer' },
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
  const navigate = useNavigate();
  const moduleKey = ((params.moduleKey as ModuleKey | undefined) ?? 'dashboard') in moduleTitles ? ((params.moduleKey as ModuleKey) ?? 'dashboard') : 'dashboard';
  const [franchiseName, setFranchiseName] = useState('Franqueado');
  const [data, setData] = useState<FranchiseWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [formalizingOpportunityId, setFormalizingOpportunityId] = useState<string | null>(null);
  const [convertingOpportunity, setConvertingOpportunity] = useState(false);
  const [briefingProjectId, setBriefingProjectId] = useState<string | null>(null);
  const [descriptionId, setDescriptionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [chatPhone, setChatPhone] = useState('');
  const [chatTitle, setChatTitle] = useState('Atendimento comercial');
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [crmSearch, setCrmSearch] = useState('');
  const crmSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
      screening: data.applications.filter((item) => item.stage === 'qualificacao').length,
      internalInterviews: data.applications.filter((item) => item.stage === 'entrevista').length,
      finalists: data.applications.filter((item) => item.stage === 'finalistas').length,
      hired: data.applications.filter((item) => item.stage === 'contratacao').length,
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
      const message =
        actionError instanceof Error
          ? actionError.message
          : actionError && typeof actionError === 'object' && 'message' in actionError
            ? String(actionError.message)
            : 'Não foi possível concluir a ação.';
      setError(message);
    }
  }

  async function openStoredFile(pathOrUrl: string) {
    const target = window.open('about:blank', '_blank');
    if (target) target.opener = null;
    try {
      const url = await createFranchiseFileSignedUrl(pathOrUrl);
      if (url === '#') throw new Error('Arquivo indisponível neste ambiente.');
      if (target) target.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (fileError) {
      target?.close();
      setError(fileError instanceof Error ? fileError.message : 'Não foi possível abrir o arquivo.');
    }
  }

  function handleCrmDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const opportunity = data?.opportunities.find((item) => item.id === active.id);
    const targetStage = over.id as SalesStage;
    if (!opportunity || !(targetStage in salesStageLabels) || opportunity.stage === targetStage) return;

    if (targetStage === 'won') {
      setFormalizingOpportunityId(opportunity.id);
      return;
    }

    void safeAction(() => updateSalesOpportunity(opportunity.id, { stage: targetStage }));
  }

  function openWorkspaceAlert(type: string) {
    const destination: Record<string, string> = {
      lead_followup: '/admin/franqueado/crm',
      briefing: '/admin/franqueado/projetos',
      description: '/admin/franqueado/projetos',
      application: '/admin/franqueado/candidatos',
      confirmation: '/admin/franqueado/agenda',
      receivable: '/admin/franqueado/financeiro',
      client_inactive: '/admin/franqueado/clientes',
    };
    navigate(destination[type] ?? '/admin/franqueado');
  }

  const renderDashboard = () => (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Potenciais clientes em aberto" value={stats.openLeads} icon={UsersRound} />
        <AdminStatCard title="Oportunidades em negociação" value={stats.negotiation} icon={KanbanSquare} />
        <AdminStatCard title="Oportunidades ganhas no mês" value={stats.wonThisMonth} icon={CheckCircle2} />
        <AdminStatCard title="Projetos ativos" value={stats.activeProjects} icon={BriefcaseBusiness} />
        <AdminStatCard title="Vagas abertas" value={stats.openJobs} icon={FileText} />
        <AdminStatCard title="Candidatos recebidos" value={stats.applications} icon={UsersRound} />
        <AdminStatCard title="Candidatos em triagem" value={stats.screening} icon={ClipboardCheck} />
        <AdminStatCard title="Entrevistas internas" value={stats.internalInterviews} icon={CalendarDays} />
        <AdminStatCard title="Finalistas" value={stats.finalists} icon={Send} />
        <AdminStatCard title="Contratados" value={stats.hired} icon={CheckCircle2} />
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
              <button
                key={`${alert.type}-${alert.id}`}
                type="button"
                onClick={() => openWorkspaceAlert(alert.type)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-surface-200 p-3 text-left transition hover:border-redde-200 hover:bg-redde-50"
              >
                <span className="text-sm font-semibold text-ink-700">{alert.title}</span>
                <span className="flex items-center gap-2">
                  <Badge>{formatOperationalValue(alert.type)}</Badge>
                  <ArrowRight size={15} className="text-redde-700" />
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-ink-500">Nenhuma ação crítica pendente agora.</p>
          )}
        </div>
      </Card>
    </div>
  );

  const renderCrm = () => {
    const stages = Object.keys(salesStageLabels) as SalesStage[];
    const normalizedSearch = crmSearch.trim().toLocaleLowerCase('pt-BR');
    const visibleOpportunities = normalizedSearch
      ? data.opportunities.filter((item) =>
          [item.company_name, item.contact_name, item.contact_phone, item.contact_email, item.source]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(normalizedSearch),
        )
      : data.opportunities;
    const activeOpportunities = data.opportunities.filter((item) => !['won', 'lost'].includes(item.stage));
    const pipelineValue = activeOpportunities.reduce((sum, item) => sum + item.negotiated_value, 0);
    const wonValue = data.opportunities
      .filter((item) => item.stage === 'won')
      .reduce((sum, item) => sum + item.negotiated_value, 0);
    const conversionBase = data.opportunities.filter((item) => ['won', 'lost'].includes(item.stage)).length;
    const conversionRate = conversionBase
      ? Math.round((data.opportunities.filter((item) => item.stage === 'won').length / conversionBase) * 100)
      : 0;

    return (
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">Funil de vendas aberto</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <BadgeDollarSign size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">{money(pipelineValue)}</p>
            <p className="mt-1 text-xs font-medium text-ink-500">Em {activeOpportunities.length} oportunidades ativas</p>
          </div>
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">Em negociação</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <KanbanSquare size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">{stats.negotiation}</p>
            <p className="mt-1 text-xs font-medium text-ink-500">Da qualificação ao contrato</p>
          </div>
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">Receita ganha</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">{money(wonValue)}</p>
            <p className="mt-1 text-xs font-medium text-ink-500">Oportunidades convertidas</p>
          </div>
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">Taxa de conversão</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Sparkles size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-ink-900">{conversionRate}%</p>
            <p className="mt-1 text-xs font-medium text-ink-500">Entre negócios encerrados</p>
          </div>
        </div>

        <DndContext sensors={crmSensors} collisionDetection={closestCorners} onDragEnd={handleCrmDragEnd}>
          <section className="overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-card">
          <div className="flex flex-col gap-4 border-b border-surface-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-ink-900">Funil de oportunidades</h2>
                <span className="rounded-full bg-redde-50 px-2.5 py-1 text-xs font-bold text-redde-700">
                  {visibleOpportunities.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">Arraste os leads entre as colunas ou selecione a próxima etapa.</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" size={17} />
              <input
                value={crmSearch}
                onChange={(event) => setCrmSearch(event.target.value)}
                placeholder="Buscar empresa ou contato"
                className="focus-ring h-11 w-full rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-sm text-ink-900 transition placeholder:text-ink-500 focus:border-redde-500 focus:bg-white"
              />
            </label>
          </div>

          <div className="kanban-scroll overflow-x-auto bg-surface-50/70 p-4 sm:p-5">
            <div className="grid min-w-max auto-cols-[280px] grid-flow-col gap-4">
              {stages.map((stage) => {
                const stageOpportunities = visibleOpportunities.filter((item) => item.stage === stage);
                const stageTotal = stageOpportunities.reduce((sum, item) => sum + item.negotiated_value, 0);
                const visual = crmStageVisuals[stage];

                return (
                  <div
                    key={stage}
                    className={`flex max-h-[680px] min-h-[440px] w-[280px] flex-col overflow-hidden rounded-2xl border border-surface-200 border-t-4 bg-gradient-to-b ${visual.accent} ${visual.soft} to-white shadow-sm`}
                  >
                    <div className="border-b border-surface-200/80 bg-white/80 px-4 py-3.5 backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${visual.dot}`} />
                          <h3 className="truncate text-sm font-black text-ink-900">{salesStageLabels[stage]}</h3>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${visual.badge}`}>
                          {stageOpportunities.length}
                        </span>
                      </div>
                      <p className="mt-2 pl-5 text-xs font-semibold text-ink-500">{money(stageTotal)}</p>
                    </div>

                    <CrmStageDropZone stage={stage}>
                      {stageOpportunities.map((opportunity) => {
                        const missing = getConversionMissingFields(opportunity);
                        const initials = opportunity.company_name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toLocaleUpperCase('pt-BR');

                        return (
                          <CrmDraggableOpportunity key={opportunity.id} opportunity={opportunity}>
                            <article className="group rounded-2xl border border-surface-200 bg-white p-4 shadow-sm transition duration-200 hover:border-redde-200 hover:shadow-card">
                            <div className="flex items-start gap-3 pr-7">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-redde-50 text-sm font-black text-redde-700">
                                {initials || 'OP'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-black text-ink-900" title={opportunity.company_name}>
                                  {opportunity.company_name}
                                </p>
                                <p className="mt-0.5 truncate text-xs font-medium text-ink-500">
                                  {opportunity.service_name || 'Serviço não informado'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2 border-y border-surface-100 py-3">
                              <p className="flex items-center gap-2 truncate text-xs font-medium text-ink-500" title={opportunity.contact_name}>
                                <Building2 size={14} className="shrink-0 text-ink-500" />
                                {opportunity.contact_name || 'Contato não informado'}
                              </p>
                              {opportunity.contact_phone ? (
                                <p className="flex items-center gap-2 truncate text-xs font-medium text-ink-500" title={opportunity.contact_phone}>
                                  <Phone size={14} className="shrink-0 text-ink-500" />
                                  {opportunity.contact_phone}
                                </p>
                              ) : null}
                              {opportunity.contact_email ? (
                                <p className="flex items-center gap-2 truncate text-xs font-medium text-ink-500" title={opportunity.contact_email}>
                                  <Mail size={14} className="shrink-0 text-ink-500" />
                                  {opportunity.contact_email}
                                </p>
                              ) : null}
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500">Valor</p>
                                <p className="mt-0.5 text-base font-black text-redde-700">{money(opportunity.negotiated_value)}</p>
                              </div>
                              {opportunity.source ? (
                                <span className="max-w-[105px] truncate rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-bold text-ink-500" title={opportunity.source}>
                                  {opportunity.source}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-2">
                              <Select
                                aria-label={`Etapa de ${opportunity.company_name}`}
                                className="h-10 rounded-xl bg-surface-50 text-xs font-semibold"
                                value={opportunity.stage}
                                onChange={(event) => {
                                  const nextStage = event.target.value as SalesStage;
                                  if (nextStage === 'won') {
                                    setFormalizingOpportunityId(opportunity.id);
                                    return;
                                  }
                                  void safeAction(() => updateSalesOpportunity(opportunity.id, { stage: nextStage }));
                                }}
                                options={stages.map((value) => ({ value, label: salesStageLabels[value] }))}
                              />
                              <Button
                                size="sm"
                                className="w-full rounded-xl shadow-sm"
                                disabled={Boolean(opportunity.converted_project_id)}
                                onClick={() => setFormalizingOpportunityId(opportunity.id)}
                              >
                                <BriefcaseBusiness size={15} />
                                {opportunity.converted_project_id ? 'Projeto iniciado' : 'Ganhar oportunidade'}
                                {!opportunity.converted_project_id ? <ArrowRight size={14} /> : null}
                              </Button>
                              {missing.length ? (
                                <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold leading-relaxed text-rose-700">
                                  Complete: {missing.slice(0, 3).join(', ')}
                                </p>
                              ) : null}
                            </div>
                            </article>
                          </CrmDraggableOpportunity>
                        );
                      })}

                      {!stageOpportunities.length ? (
                        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-surface-200 bg-white/60 px-4 text-center">
                          <p className="text-xs font-semibold leading-relaxed text-ink-500">
                            {normalizedSearch ? 'Nenhum resultado nesta etapa' : 'Arraste uma oportunidade para esta etapa'}
                          </p>
                        </div>
                      ) : null}
                    </CrmStageDropZone>
                  </div>
                );
              })}
            </div>
          </div>
          </section>
        </DndContext>
      </div>
    );
  };

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
                    Levantamento da vaga: <strong>{formatOperationalValue(briefing?.status, 'não criado')}</strong> · Finalistas: <strong>{finalistCount}/3</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {briefing ? (
                    <Button variant="secondary" onClick={() => copyText(publicUrl(`/briefing/${briefing.secure_token}`))}>
                      <Copy size={16} />
                      Copiar endereço do levantamento
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => setBriefingProjectId(project.id)}>
                    <FileCheck2 size={16} />
                    Levantamento da vaga
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
                    <Link to={getJobPath(job.company.slug, job.slug)}>
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
          const ranking = getPersistedApplicationRanking(application, job);
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
                    <Badge>{applicationStatusLabels[application.status]}</Badge>
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
              <Badge variant={job.status === 'open' ? 'success' : 'neutral'}>{jobStatusLabels[job.status]}</Badge>
              {job.company?.slug ? (
                <Button variant="secondary" onClick={() => copyText(publicUrl(getJobPath(job.company!.slug, job.slug)))}>
                  <Copy size={16} />
                  Copiar endereço público
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
    const totalReceived = data.receivableInstallments.filter((item) => item.status === 'received').reduce((sum, item) => sum + item.amount, 0);
    const totalOpen = data.receivableInstallments.filter((item) => ['pending', 'overdue'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
    const futureBalance = data.receivableInstallments.filter((item) => item.status === 'locked').reduce((sum, item) => sum + item.amount, 0);
    const expenses = data.accountsPayable.reduce((sum, item) => sum + item.amount, 0);
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard title="Total a receber" value={money(totalOpen)} icon={ReceiptText} />
          <AdminStatCard title="Total recebido" value={money(totalReceived)} icon={CheckCircle2} />
          <AdminStatCard title="Saldo futuro" value={money(futureBalance)} icon={Sparkles} />
          <AdminStatCard title="Despesas do mês" value={money(expenses)} icon={BadgeDollarSign} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-xl font-black text-ink-900">Contas a receber</h2>
            <div className="mt-4 grid gap-3">
              {data.accountsReceivable.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-surface-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{item.description}</strong>
                    <Badge variant={statusBadge(item.status)}>{formatOperationalValue(item.status)}</Badge>
                  </div>
                  <p className="text-sm text-ink-500">{money(item.total_amount)} · entrada e saldo controlados separadamente</p>
                  <div className="grid gap-2">{data.receivableInstallments.filter((installment) => installment.receivable_id === item.id).map((installment) => (
                    <div key={installment.id} className="rounded-lg bg-surface-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">{installment.description} · {money(installment.amount)}</p><p className="text-xs text-ink-500">{formatOperationalValue(installment.status)} · {installment.due_date ?? 'sem vencimento'} · {formatOperationalValue(installment.release_trigger)}</p></div>
                        <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={installment.status === 'locked'} onClick={() => safeAction(() => updateReceivableInstallment(installment.id, { status: 'received' }))}>Recebida</Button><Button size="sm" variant="ghost" disabled={installment.status === 'locked'} onClick={() => safeAction(() => updateReceivableInstallment(installment.id, { status: 'overdue' }))}>Vencida</Button><Button size="sm" variant="ghost" onClick={() => { const amount = window.prompt('Novo valor da parcela', String(installment.amount)); const dueDate = window.prompt('Novo vencimento (AAAA-MM-DD)', installment.due_date ?? ''); if (amount !== null) void safeAction(() => updateReceivableInstallment(installment.id, { amount: Number(amount), due_date: dueDate || null })); }}>Editar</Button>
                          <label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-xs font-bold">Comprovante<input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void safeAction(async () => updateReceivableInstallment(installment.id, { receipt_url: await uploadFranchiseFile(file, profile.franchise_id!, 'receipts') })); }}/></label></div></div>
                    </div>
                  ))}</div>
                  <form className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const existing = data.receivableInstallments.filter((installment) => installment.receivable_id === item.id); void safeAction(() => createReceivableInstallment({ franchise_id: item.franchise_id, client_id: item.client_id, project_id: item.project_id, service_order_id: item.service_order_id, receivable_id: item.id, installment_number: Math.max(0, ...existing.map((installment) => installment.installment_number)) + 1, description: String(form.get('description') || 'Parcela manual'), amount: Number(form.get('amount') || 0), due_date: String(form.get('due_date') || '') || null, release_trigger: 'manual', released_at: new Date().toISOString(), status: 'pending', paid_at: null, payment_link: null, receipt_url: null, notes: 'Parcela adicionada manualmente.' })); event.currentTarget.reset(); }}><Input name="description" label="Nova parcela" required/><Input name="amount" label="Valor" type="number" min="0" step="0.01" required/><Input name="due_date" label="Vencimento" type="date"/><Button type="submit" size="sm" className="self-end">Adicionar parcela</Button></form>
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
                  <strong>{item.description}</strong> · {money(item.amount)} · {formatOperationalValue(item.status)}
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
        ...data.tasks.map((item) => ({
          id: item.id,
          title: item.title,
          date: item.due_at,
          action: item.status === 'done' ? null : () => safeAction(() => markTaskDone(item.id)),
          actionLabel: 'Concluir tarefa',
          done: item.status === 'done',
        })),
        ...data.schedules.map((item) => ({
          id: item.id,
          title: `Entrevista com cliente (${formatOperationalValue(item.format)})`,
          date: `${item.date} ${item.time}`,
          action: () => navigate('/admin/franqueado/projetos'),
          actionLabel: 'Ver projeto',
          done: Boolean(item.candidate_confirmed_at),
        })),
        ...data.accountsReceivable.map((item) => ({
          id: item.id,
          title: `Vencimento financeiro: ${item.description}`,
          date: item.due_date,
          action: () => navigate('/admin/franqueado/financeiro'),
          actionLabel: 'Abrir financeiro',
          done: item.status === 'received',
        })),
      ];
      return (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-ink-900">{event.title}</p>
                <p className="text-sm text-ink-500">{event.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={event.done ? 'success' : 'warning'}>{event.done ? 'ok' : 'pendente'}</Badge>
                {event.action ? (
                  <Button size="sm" variant="secondary" onClick={event.action}>
                    {event.actionLabel}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (moduleKey === 'chat') {
      return (
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink-900">WhatsApp e histórico de conversas</h2>
          <p className="mt-2 text-sm text-ink-600">
            WhatsApp não configurado. O sistema abre o wa.me como fallback externo e registra a tentativa como manual, sem afirmar envio ou entrega.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (chatPhone.replace(/\D/g, '').length < 10) {
                setError('Informe um WhatsApp válido com DDD.');
                return;
              }
              window.open(whatsappUrl(chatPhone, quickMessage), '_blank', 'noopener,noreferrer');
              void safeAction(() =>
                addChatMessage(profile.franchise_id!, null, quickMessage, chatTitle, {
                  contactPhone: chatPhone,
                  channel: 'whatsapp_ready',
                }),
              );
              setQuickMessage('');
              setChatPhone('');
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Nome da conversa" value={chatTitle} onChange={(event) => setChatTitle(event.target.value)} required />
              <Input label="WhatsApp com DDD" value={chatPhone} onChange={(event) => setChatPhone(event.target.value)} placeholder="(84) 99999-9999" required />
            </div>
            <Select
              label="Template (opcional)"
              defaultValue=""
              onChange={(event) => {
                const template = (data.workflowSettings[0]?.interview_templates ?? []).find((item) => item.id === event.target.value);
                if (template) setQuickMessage(template.body);
              }}
              options={[
                { label: 'Escrever mensagem livre', value: '' },
                ...(data.workflowSettings[0]?.interview_templates ?? []).map((template) => ({ label: template.name, value: template.id })),
              ]}
            />
            <Textarea label="Mensagem" value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} required />
            <Button type="submit" disabled={!quickMessage.trim() || !chatPhone.trim()}>
              <MessageSquareText size={17} />
              Abrir WhatsApp e registrar
            </Button>
          </form>
          <div className="mt-5 grid gap-3">
            {data.conversations.map((conversation) => (
              <div key={conversation.id} className="rounded-lg border border-surface-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{conversation.title}</p>
                  <Badge>{conversation.channel === 'whatsapp_ready' ? 'WhatsApp não configurado' : 'Interno'}</Badge>
                  <Badge variant={conversation.status === 'closed' ? 'neutral' : 'warning'}>{formatOperationalValue(conversation.status)}</Badge>
                </div>
                {conversation.contact_phone ? <p className="mt-1 text-xs font-semibold text-ink-500">{conversation.contact_phone}</p> : null}
                {data.messages
                  .filter((message) => message.conversation_id === conversation.id)
                  .map((message) => <p key={message.id} className="mt-2 text-sm text-ink-500">{message.body} · {message.provider === 'manual_external' ? 'manual externo, entrega não confirmada' : formatOperationalValue(message.delivery_status)}</p>)}
                {conversation.contact_phone ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const latest = data.messages.filter((message) => message.conversation_id === conversation.id).at(-1)?.body ?? '';
                      window.open(whatsappUrl(conversation.contact_phone!, latest), '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <MessageSquareText size={15} />
                    Continuar no WhatsApp
                  </Button>
                ) : null}
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
            <Card key={contract.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-lg font-black text-ink-900">{data.companies.find((item) => item.id === contract.client_id)?.name}</p>
                  <p className="mt-1 text-sm text-ink-500">{contract.provider ? `Provedor: ${contract.provider}` : 'Fluxo manual ou provedor de assinatura configurável'}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {contract.provider_document_id ? `Documento: ${contract.provider_document_id}` : 'Sem identificador externo'} ·{' '}
                    {contract.signed_at ? `Assinado em ${contract.signed_at.slice(0, 10)}` : 'Assinatura pendente'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadge(contract.status)}>{formatOperationalValue(contract.status)}</Badge>
                  {contract.signing_url ? <a href={contract.signing_url} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">Abrir assinatura</Button></a> : null}
                  {contract.contract_file_url ? <Button size="sm" variant="secondary" onClick={() => void openStoredFile(contract.contract_file_url!)}>Ver contrato</Button> : null}
                  {contract.signed_file_url ? <Button size="sm" variant="secondary" onClick={() => void openStoredFile(contract.signed_file_url!)}>Ver assinado</Button> : null}
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
                <summary className="cursor-pointer text-sm font-black text-redde-700">Gerenciar contrato e assinatura</summary>
                <form
                  className="mt-4 grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void safeAction(async () => {
                      const contractFile = form.get('contract_file') as File | null;
                      const signedFile = form.get('signed_file') as File | null;
                      const contractFileUrl = contractFile?.size
                        ? await uploadFranchiseFile(contractFile, profile.franchise_id!, 'contracts')
                        : contract.contract_file_url;
                      const signedFileUrl = signedFile?.size
                        ? await uploadFranchiseFile(signedFile, profile.franchise_id!, 'signed-contracts')
                        : contract.signed_file_url;
                      const status = String(form.get('status') || contract.status) as SalesOpportunity['contract_status'];
                      return updateContract(contract.id, {
                        provider: String(form.get('provider') || '') || null,
                        provider_document_id: String(form.get('provider_document_id') || '') || null,
                        signing_url: String(form.get('signing_url') || '') || null,
                        contract_file_url: contractFileUrl,
                        signed_file_url: signedFileUrl,
                        status,
                        signed_at: status === 'signed' ? contract.signed_at ?? new Date().toISOString() : null,
                        notes: String(form.get('notes') || ''),
                      });
                    });
                  }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input name="provider" label="Provedor" defaultValue={contract.provider ?? ''} placeholder="Clicksign, DocuSign, Autentique..." />
                    <Input name="provider_document_id" label="ID no provedor" defaultValue={contract.provider_document_id ?? ''} />
                    <Input name="signing_url" label="Endereço para assinatura" defaultValue={contract.signing_url ?? ''} />
                    <Select
                      name="status"
                      label="Situação"
                      defaultValue={contract.status}
                      options={[
                        { label: 'Não gerado', value: 'not_generated' },
                        { label: 'Gerado', value: 'generated' },
                        { label: 'Enviado', value: 'sent' },
                        { label: 'Assinado', value: 'signed' },
                        { label: 'Cancelado', value: 'cancelled' },
                      ]}
                    />
                    <label className="text-sm font-semibold text-ink-700">Contrato
                      <input name="contract_file" type="file" accept=".pdf,.doc,.docx" className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-white p-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-ink-700">Contrato assinado
                      <input name="signed_file" type="file" accept=".pdf,.doc,.docx" className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-white p-2 text-sm" />
                    </label>
                  </div>
                  <Textarea name="notes" label="Observações" defaultValue={contract.notes ?? ''} rows={3} />
                  <Button type="submit" className="w-fit"><FileUp size={16} />Salvar contrato</Button>
                </form>
              </details>
            </Card>
          ))}
          {!data.contracts.length ? <EmptyState title="Nenhum contrato criado. Eles serão gerados ao converter oportunidades em projetos." /> : null}
        </div>
      );
    }

    if (moduleKey === 'notas-fiscais') {
      return (
        <div className="grid gap-3">
          <Card className="p-4">
            <h2 className="text-lg font-black text-ink-900">Controle de NFS-e</h2>
            <p className="mt-2 text-sm text-ink-600">
              Registre a emissão feita no sistema fiscal, anexe o arquivo e acompanhe o status da nota.
            </p>
          </Card>
          {data.invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="font-bold text-ink-900">{data.companies.find((item) => item.id === invoice.client_id)?.name}</p>
                  <p className="text-sm text-ink-500">{money(invoice.amount)} · prevista para {invoice.expected_date}</p>
                  {invoice.number ? <p className="mt-1 text-xs font-semibold text-ink-500">NFS-e nº {invoice.number}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadge(invoice.status)}>{invoiceStatusLabels[invoice.status] ?? invoice.status}</Badge>
                  {invoice.file_url ? <Button size="sm" variant="secondary" onClick={() => void openStoredFile(invoice.file_url)}>Abrir nota</Button> : null}
                </div>
              </div>
              <details className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
                <summary className="cursor-pointer text-sm font-black text-redde-700">Atualizar NFS-e</summary>
                <form
                  className="mt-4 grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void safeAction(async () => {
                      const file = form.get('invoice_file') as File | null;
                      const fileUrl = file?.size
                        ? await uploadFranchiseFile(file, profile.franchise_id!, 'invoices')
                        : invoice.file_url;
                      const status = String(form.get('status') || invoice.status) as 'pending' | 'ready_to_issue' | 'issued' | 'cancelled';
                      return updateInvoice(invoice.id, {
                        number: String(form.get('number') || ''),
                        status,
                        file_url: fileUrl,
                        issued_at: status === 'issued' ? invoice.issued_at ?? new Date().toISOString() : null,
                        notes: String(form.get('notes') || ''),
                      });
                    });
                  }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input name="number" label="Número da NFS-e" defaultValue={invoice.number} />
                    <Select
                      name="status"
                      label="Situação"
                      defaultValue={invoice.status}
                      options={Object.entries(invoiceStatusLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <label className="text-sm font-semibold text-ink-700 md:col-span-2">Arquivo da nota
                      <input name="invoice_file" type="file" accept=".pdf,.xml" className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-white p-2 text-sm" />
                    </label>
                  </div>
                  <Textarea name="notes" label="Observações" defaultValue={invoice.notes} rows={3} />
                  <Button type="submit" className="w-fit"><FileUp size={16} />Salvar NFS-e</Button>
                </form>
              </details>
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
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              void safeAction(async () => {
                const storedUrl = documentFile
                  ? await uploadFranchiseFile(documentFile, profile.franchise_id!, 'documents')
                  : documentUrl.trim();
                if (!storedUrl) throw new Error('Selecione um arquivo ou informe um link.');
                await addDocument(profile.franchise_id!, {
                  project_id: null,
                  client_id: null,
                  application_id: null,
                  type: 'administrativo',
                  name: documentName,
                  url: storedUrl,
                  notes: '',
                });
                setDocumentName('');
                setDocumentUrl('');
                setDocumentFile(null);
                formElement.reset();
              });
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Nome" value={documentName} onChange={(event) => setDocumentName(event.target.value)} required />
              <Input label="Endereço externo (opcional)" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://..." />
            </div>
            <label className="rounded-xl border border-dashed border-surface-200 bg-surface-50 p-4 text-sm font-semibold text-ink-700">
              <span className="flex items-center gap-2"><UploadCloud size={18} className="text-redde-700" />Selecionar arquivo de até 20MB</span>
              <input
                type="file"
                className="mt-3 block w-full text-sm"
                onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button type="submit" className="w-fit" disabled={!documentName.trim() || (!documentFile && !documentUrl.trim())}>
              <Plus size={16} />Adicionar documento
            </Button>
          </form>
          <div className="mt-5 grid gap-2">
            {data.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 p-3">
                <button type="button" onClick={() => void openStoredFile(document.url)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink-900 hover:text-redde-700">
                  {document.name}
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => void openStoredFile(document.url)}>Abrir</Button>
                  <Button size="sm" variant="ghost" aria-label={`Excluir ${document.name}`} onClick={() => void safeAction(() => deleteDocument(document.id))}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
            {!data.documents.length ? <p className="text-sm text-ink-500">Nenhum documento adicionado.</p> : null}
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
                  <p className="text-sm text-ink-500">Vencimento {task.due_date} · risco {formatOperationalValue(task.replacement_risk)}</p>
                </div>
              </div>
              <details className="mt-3 rounded-lg border border-surface-200 bg-surface-50 p-3"><summary className="cursor-pointer text-sm font-bold text-redde-700">Registrar contato completo</summary>
                <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void safeAction(() => completePostSaleContact(task.id, {
                  contact_date: String(form.get('contact_date') || ''), contacted_person: String(form.get('contacted_person') || ''),
                  candidate_status: String(form.get('candidate_status') || ''), client_satisfaction: String(form.get('client_satisfaction') || ''), replacement_risk: String(form.get('replacement_risk') || ''),
                  new_position_identified: form.get('new_position_identified') === 'on', referral_received: form.get('referral_received') === 'on', referral_name: String(form.get('referral_name') || ''), referral_contact: String(form.get('referral_contact') || ''),
                  notes: String(form.get('notes') || ''), next_action: String(form.get('next_action') || ''), next_action_date: String(form.get('next_action_date') || '') || null, status: String(form.get('status') || 'done') as 'open' | 'done' | 'snoozed',
                })); }}>
                  <div className="grid gap-3 md:grid-cols-2"><Input name="contact_date" label="Data do contato" type="datetime-local" required/><Input name="contacted_person" label="Pessoa contatada" required/>
                    <Select name="candidate_status" label="Situação do candidato" options={['','ativo','em_adaptacao','com_dificuldades','desligado','pediu_desligamento','nao_iniciou','sem_retorno'].map((value)=>({label:value||'Selecione',value}))} required/>
                    <Select name="client_satisfaction" label="Satisfação do cliente" options={['','muito_satisfeito','satisfeito','neutro','insatisfeito','muito_insatisfeito'].map((value)=>({label:value||'Selecione',value}))} required/>
                    <Select name="replacement_risk" label="Risco de reposição" options={['baixo','medio','alto','reposicao_necessaria'].map((value)=>({label:formatOperationalValue(value),value}))}/><Select name="status" label="Situação da tarefa" options={[{label:'Concluída',value:'done'},{label:'Aberta',value:'open'},{label:'Adiada',value:'snoozed'}]}/></div>
                  <div className="flex flex-wrap gap-5 text-sm font-semibold"><label><input name="new_position_identified" type="checkbox"/> Nova vaga identificada</label><label><input name="referral_received" type="checkbox"/> Indicação recebida</label></div>
                  <div className="grid gap-3 md:grid-cols-2"><Input name="referral_name" label="Nome da indicação"/><Input name="referral_contact" label="Contato da indicação"/></div><Textarea name="notes" label="Observações" required/><div className="grid gap-3 md:grid-cols-2"><Input name="next_action" label="Próxima ação"/><Input name="next_action_date" label="Data da próxima ação" type="date"/></div><Button type="submit" size="sm">Salvar contato</Button>
                </form>
              </details>
              {(task.new_position_identified || task.referral_received) ? <div className="mt-3 flex flex-wrap gap-2">
                {task.new_position_identified ? <Button size="sm" onClick={() => { const project = data.projects.find((item) => item.id === task.project_id); const company = data.companies.find((item) => item.id === task.client_id); const opportunity = data.opportunities.find((item) => item.id === project?.opportunity_id); if (!company) return; void safeAction(() => createSalesOpportunity(profile.franchise_id!, { client_id: company.id, company_name: company.name, contact_name: opportunity?.contact_name ?? 'Contato do cliente', contact_phone: opportunity?.contact_phone ?? '', contact_email: opportunity?.contact_email ?? '', service_name: 'Nova vaga identificada no pós-venda', source: 'Pós-venda', stage: 'new_lead' })); }}>Criar oportunidade vinculada</Button> : null}
                {task.referral_received ? <Button size="sm" variant="secondary" onClick={() => void safeAction(() => createSalesOpportunity(profile.franchise_id!, { company_name: task.referral_name || 'Indicação recebida', contact_name: task.referral_name || 'Contato indicado', contact_phone: task.referral_contact || '', contact_email: '', service_name: 'Contato indicado no pós-venda', source: 'Indicação', stage: 'new_lead' }))}>Criar potencial cliente da indicação</Button> : null}
              </div> : null}
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
    const interviewTemplates = workflowSettings?.interview_templates ?? [];
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
           <p>Configure mensagens reutilizáveis para convites e confirmações de entrevista.</p>
           <p>Régua padrão de pós-venda: 30, 60 e 90 dias após início.</p>
           <p>WhatsApp, contratos, documentos e NFS-e podem ser operados nos módulos correspondentes.</p>
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

        <div className="mt-8 border-t border-surface-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-ink-900">Templates de entrevista</h3>
              <p className="mt-1 text-sm text-ink-500">Use variáveis como {'{{candidato}}'}, {'{{data}}'} e {'{{horario}}'}.</p>
            </div>
            <Badge>{interviewTemplates.length} templates</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {interviewTemplates.map((template) => (
              <div key={template.id} className="rounded-xl border border-surface-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-ink-900">{template.name}</p>
                    <p className="mt-1 text-sm font-semibold text-ink-500">{template.subject}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{template.body}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Excluir template ${template.name}`}
                    onClick={() =>
                      void safeAction(() =>
                        updateWorkflowSettings(profile.franchise_id!, {
                          interview_templates: interviewTemplates.filter((item) => item.id !== template.id),
                        }),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            className="mt-5 grid gap-4 rounded-xl bg-surface-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              const template = {
                id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
                name: String(form.get('template_name') || '').trim(),
                subject: String(form.get('template_subject') || '').trim(),
                body: String(form.get('template_body') || '').trim(),
              };
              void safeAction(async () => {
                await updateWorkflowSettings(profile.franchise_id!, {
                  interview_templates: [...interviewTemplates, template],
                });
                formElement.reset();
              });
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="template_name" label="Nome do template" required />
              <Input name="template_subject" label="Assunto" required />
            </div>
            <Textarea name="template_body" label="Mensagem" rows={4} required />
            <Button type="submit" className="w-fit"><Plus size={16} />Adicionar template</Button>
          </form>
        </div>
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
      <div
        className={
          moduleKey === 'crm'
            ? 'relative overflow-hidden rounded-3xl border border-redde-100 bg-white p-5 shadow-card sm:p-7'
            : 'flex flex-col justify-between gap-4 md:flex-row md:items-end'
        }
      >
        {moduleKey === 'crm' ? (
          <>
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-redde-100/70 blur-3xl" />
            <div className="pointer-events-none absolute right-44 top-20 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />
          </>
        ) : null}
        <div className={moduleKey === 'crm' ? 'relative max-w-2xl' : undefined}>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-redde-700">
            {moduleKey === 'crm' ? <KanbanSquare size={14} /> : null}
            {franchiseName}
          </p>
          <h1 className={moduleKey === 'crm' ? 'mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl' : 'mt-1 text-3xl font-black text-ink-900'}>
            {moduleTitles[moduleKey]}
          </h1>
          <p className="mt-2 text-ink-500">
            {moduleKey === 'crm'
              ? 'Visualize seu funil de vendas, priorize os próximos contatos e transforme oportunidades em projetos.'
              : 'Operação comercial, recrutamento, cliente e financeiro em um só fluxo.'}
          </p>
        </div>
        <div className={moduleKey === 'crm' ? 'relative mt-5 flex flex-wrap gap-2 md:absolute md:bottom-7 md:right-7 md:mt-0' : 'flex flex-wrap gap-2'}>
          <Button variant="secondary" className={moduleKey === 'crm' ? 'rounded-xl shadow-sm' : undefined} onClick={() => refresh()}>
            <RefreshCw size={17} />
            Atualizar
          </Button>
          <Button className={moduleKey === 'crm' ? 'rounded-xl px-5 shadow-lg shadow-redde-500/20' : undefined} onClick={() => setLeadModalOpen(true)}>
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
          safeAction(async () => {
            await createSalesOpportunity(profile.franchise_id!, values as Partial<SalesOpportunity> & Pick<SalesOpportunity, 'company_name' | 'contact_name' | 'contact_phone' | 'contact_email' | 'service_name'>);
            setLeadModalOpen(false);
          })
        }
      />

      <FormalizationModal
        open={Boolean(formalizingOpportunityId)}
        opportunity={formalizingOpportunity}
        submitting={convertingOpportunity}
        onClose={() => {
          if (!convertingOpportunity) setFormalizingOpportunityId(null);
        }}
        onConfirm={(values) => {
          if (convertingOpportunity) return;
          setConvertingOpportunity(true);
          void safeAction(async () => {
            if (!formalizingOpportunity) throw new Error('Oportunidade não encontrada.');
            await updateSalesOpportunity(formalizingOpportunity.id, values);
            await convertOpportunityToProject(formalizingOpportunity.id);
            setFormalizingOpportunityId(null);
          }).finally(() => setConvertingOpportunity(false));
        }}
      />

      <BriefingModal
        open={Boolean(briefingProjectId)}
        payload={selectedBriefing?.payload ?? (selectedOpportunity ? getDefaultBriefingPayload(selectedOpportunity, selectedProject?.title) : null)}
        onClose={() => setBriefingProjectId(null)}
        onSave={(payload, approve) =>
          safeAction(() => {
            if (!selectedBriefing) throw new Error('Levantamento da vaga não encontrado.');
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
