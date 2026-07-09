import { addDays, formatISO, isBefore, parseISO } from 'date-fns';
import { createApplicationRanking } from './ranking';
import { listApplications, listCompanies, listJobs, upsertCompany, upsertJob, updateApplicationStatus } from './data';
import { getLocalStore, makeId } from './localDb';
import { slugify } from './slugify';
import { hasSupabaseConfig, supabase } from './supabase';
import type { Application, Company, Franchise, Job, JobContractType, JobModality } from '../types';

export type SalesStage =
  | 'new_lead'
  | 'first_contact'
  | 'qualification'
  | 'proposal_sent'
  | 'contract_entry'
  | 'won'
  | 'lost';

export type ContractStatus = 'not_generated' | 'generated' | 'sent' | 'signed' | 'cancelled';
export type InitialPaymentStatus = 'pending' | 'paid' | 'waived' | 'overdue';
export type ProjectStage =
  | 'commercial_formalized'
  | 'briefing_pending'
  | 'briefing_received'
  | 'description_review'
  | 'job_published'
  | 'applications_received'
  | 'screening'
  | 'internal_interviews'
  | 'finalists_selected'
  | 'waiting_client'
  | 'client_interviews'
  | 'candidate_approved'
  | 'start_informed'
  | 'nps'
  | 'post_sale'
  | 'completed';
export type BriefingStatus =
  | 'not_sent'
  | 'sent'
  | 'in_progress'
  | 'filled'
  | 'in_review'
  | 'approved'
  | 'needs_adjustment';
export type JobDescriptionStatus = 'generated' | 'edited' | 'approved' | 'rejected' | 'regenerate';
export type ReceivableStatus = 'pending' | 'received' | 'overdue' | 'cancelled';
export type PayableStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceStatus = 'pending' | 'ready_to_issue' | 'issued' | 'cancelled';
export type TaskStatus = 'open' | 'done' | 'snoozed';
export type FinalistStatus = 'draft' | 'approved_by_franchise' | 'released_to_client' | 'interview_scheduled' | 'client_decided';

export type SalesOpportunity = {
  id: string;
  franchise_id: string;
  client_id: string | null;
  company_name: string;
  legal_name: string;
  document: string;
  segment: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  source: string;
  campaign: string;
  need: string;
  estimated_positions: number;
  service_name: string;
  negotiated_value: number;
  payment_terms: string;
  contract_status: ContractStatus;
  initial_payment_status: InitialPaymentStatus;
  stage: SalesStage;
  next_follow_up: string | null;
  notes: string;
  lost_reason: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FranchiseProject = {
  id: string;
  franchise_id: string;
  opportunity_id: string;
  client_id: string;
  job_id: string | null;
  title: string;
  stage: ProjectStage;
  priority: 'low' | 'medium' | 'high';
  next_step: string;
  client_access_token: string;
  created_at: string;
  updated_at: string;
};

export type BriefingPayload = {
  companyName: string;
  document: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  segment: string;
  workLocation: string;
  title: string;
  positions: string;
  department: string;
  managerName: string;
  hiringReason: string;
  contractType: JobContractType;
  modality: JobModality;
  cityNeighborhood: string;
  schedule: string;
  salary: string;
  benefits: string;
  variablePay: string;
  desiredStartDate: string;
  education: string;
  minimumExperience: string;
  mandatoryRequirements: string;
  desirableRequirements: string;
  technicalSkills: string;
  behavioralSkills: string;
  preferredGender: string;
  ageRange: string;
  profileNotes: string;
  responsibilities: string;
  routine: string;
  goals: string;
  challenges: string;
  successCriteria: string;
  selectionSteps: string;
  companyInterviewers: string;
  interviewAvailability: string;
  requiredDocuments: string;
  additionalNotes: string;
};

export type JobBriefing = {
  id: string;
  franchise_id: string;
  project_id: string;
  client_id: string;
  secure_token: string;
  status: BriefingStatus;
  payload: BriefingPayload;
  filled_by: 'franchise' | 'client' | 'mixed' | null;
  sent_at: string | null;
  filled_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedJobDescription = {
  title: string;
  summary: string;
  responsibilities: string;
  mandatoryRequirements: string;
  desirableRequirements: string;
  benefits: string;
  schedule: string;
  modality: JobModality;
  location: string;
  applicationInstructions: string;
  suggestedQuestions: string[];
  rankingCriteria: string[];
};

export type JobDescriptionDraft = {
  id: string;
  franchise_id: string;
  project_id: string;
  briefing_id: string;
  status: JobDescriptionStatus;
  content: GeneratedJobDescription;
  job_id: string | null;
  ai_provider: 'openai' | 'local';
  created_at: string;
  updated_at: string;
};

export type ContractRecord = {
  id: string;
  franchise_id: string;
  client_id: string;
  project_id: string;
  status: ContractStatus;
  provider: string | null;
  signed_file_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ServiceOrder = {
  id: string;
  franchise_id: string;
  client_id: string;
  project_id: string;
  opportunity_id: string;
  description: string;
  amount: number;
  status: 'open' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type AccountReceivable = {
  id: string;
  franchise_id: string;
  client_id: string;
  project_id: string;
  service_order_id: string;
  description: string;
  total_amount: number;
  entry_amount: number;
  remaining_amount: number;
  due_date: string;
  payment_terms: string;
  payment_link: string;
  status: ReceivableStatus;
  created_at: string;
  updated_at: string;
};

export type AccountPayable = {
  id: string;
  franchise_id: string;
  project_id: string | null;
  description: string;
  category: string;
  amount: number;
  due_date: string;
  status: PayableStatus;
  attachment_url: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceRecord = {
  id: string;
  franchise_id: string;
  client_id: string;
  project_id: string;
  service_order_id: string;
  amount: number;
  status: InvoiceStatus;
  expected_date: string;
  issued_at: string | null;
  number: string;
  file_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type NotificationTask = {
  id: string;
  franchise_id: string;
  project_id: string | null;
  opportunity_id: string | null;
  title: string;
  type: string;
  due_at: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type FinalistRecord = {
  id: string;
  franchise_id: string;
  project_id: string;
  application_id: string;
  status: FinalistStatus;
  franchise_opinion: string;
  ai_report: string;
  client_notes: string;
  created_at: string;
  updated_at: string;
};

export type ClientInterviewSchedule = {
  id: string;
  franchise_id: string;
  project_id: string;
  finalist_id: string;
  application_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  format: 'presencial' | 'online' | 'telefone';
  location_or_link: string;
  notes: string;
  candidate_confirmation_token: string;
  candidate_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HiringDecision = {
  id: string;
  franchise_id: string;
  project_id: string;
  finalist_id: string;
  application_id: string;
  decision: 'approved' | 'rejected' | 'undecided';
  start_date: string | null;
  internal_responsible_name: string;
  internal_responsible_email: string;
  internal_responsible_phone: string;
  admission_notes: string;
  required_documents: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
};

export type NpsResponse = {
  id: string;
  franchise_id: string;
  project_id: string;
  client_id: string;
  score: number;
  comment: string;
  positives: string;
  improvements: string;
  referral_possible: boolean;
  referral_contacts: string;
  created_at: string;
};

export type PostSaleTask = {
  id: string;
  franchise_id: string;
  project_id: string;
  client_id: string;
  application_id: string | null;
  title: string;
  due_date: string;
  contact_date: string | null;
  responsible: string;
  candidate_status: string;
  client_satisfaction: string;
  replacement_risk: string;
  new_position_identified: boolean;
  referral_received: boolean;
  notes: string;
  next_action: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type DocumentRecord = {
  id: string;
  franchise_id: string;
  project_id: string | null;
  client_id: string | null;
  application_id: string | null;
  type: string;
  name: string;
  url: string;
  notes: string;
  created_at: string;
};

export type ChatConversation = {
  id: string;
  franchise_id: string;
  client_id: string | null;
  application_id: string | null;
  title: string;
  channel: 'internal' | 'whatsapp_ready';
  status: 'open' | 'waiting' | 'closed';
  tags: string[];
  responsible: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: 'franchise' | 'client' | 'candidate' | 'system';
  body: string;
  created_at: string;
};

type FranchiseOpsStore = {
  opportunities: SalesOpportunity[];
  projects: FranchiseProject[];
  briefings: JobBriefing[];
  jobDescriptions: JobDescriptionDraft[];
  contracts: ContractRecord[];
  serviceOrders: ServiceOrder[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  invoices: InvoiceRecord[];
  tasks: NotificationTask[];
  finalists: FinalistRecord[];
  schedules: ClientInterviewSchedule[];
  hiringDecisions: HiringDecision[];
  npsResponses: NpsResponse[];
  postSaleTasks: PostSaleTask[];
  documents: DocumentRecord[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
};

export type FranchiseWorkspaceData = FranchiseOpsStore & {
  companies: Company[];
  jobs: Job[];
  applications: Application[];
};

export const salesStageLabels: Record<SalesStage, string> = {
  new_lead: 'Novo lead',
  first_contact: 'Primeiro contato',
  qualification: 'Qualificacao',
  proposal_sent: 'Proposta enviada',
  contract_entry: 'Contrato / entrada',
  won: 'Ganho',
  lost: 'Perdido',
};

export const projectStageLabels: Record<ProjectStage, string> = {
  commercial_formalized: 'Comercial formalizado',
  briefing_pending: 'Briefing pendente',
  briefing_received: 'Briefing recebido',
  description_review: 'Descricao em aprovacao',
  job_published: 'Vaga publicada',
  applications_received: 'Candidaturas recebidas',
  screening: 'Triagem',
  internal_interviews: 'Entrevistas internas',
  finalists_selected: 'Finalistas selecionados',
  waiting_client: 'Aguardando cliente',
  client_interviews: 'Entrevistas com cliente',
  candidate_approved: 'Candidato aprovado',
  start_informed: 'Inicio informado',
  nps: 'NPS',
  post_sale: 'Pos-venda',
  completed: 'Concluido',
};

const STORE_KEY = 'people_jobs_franchise_ops_v1';

function emptyStore(): FranchiseOpsStore {
  return {
    opportunities: [],
    projects: [],
    briefings: [],
    jobDescriptions: [],
    contracts: [],
    serviceOrders: [],
    accountsReceivable: [],
    accountsPayable: [],
    invoices: [],
    tasks: [],
    finalists: [],
    schedules: [],
    hiringDecisions: [],
    npsResponses: [],
    postSaleTasks: [],
    documents: [],
    conversations: [],
    messages: [],
  };
}

function readStore(): FranchiseOpsStore {
  if (typeof window === 'undefined') return emptyStore();
  const stored = window.localStorage.getItem(STORE_KEY);
  if (!stored) {
    const initial = emptyStore();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    return initial;
  }

  return { ...emptyStore(), ...(JSON.parse(stored) as Partial<FranchiseOpsStore>) };
}

function writeStore(store: FranchiseOpsStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function todayIso() {
  return new Date().toISOString();
}

function dateOnly(date: Date) {
  return formatISO(date, { representation: 'date' });
}

function normalizeMoney(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitEntry(total: number, paymentTerms: string) {
  if (paymentTerms === 'avista') return { entry: total, remaining: 0 };
  if (paymentTerms === 'cartao_3x') return { entry: total / 3, remaining: (total / 3) * 2 };
  if (paymentTerms === 'personalizada') return { entry: 0, remaining: total };
  return { entry: total / 2, remaining: total / 2 };
}

export function getDefaultBriefingPayload(opportunity: SalesOpportunity, projectTitle?: string): BriefingPayload {
  return {
    companyName: opportunity.company_name,
    document: opportunity.document,
    contactName: opportunity.contact_name,
    contactEmail: opportunity.contact_email,
    contactPhone: opportunity.contact_phone,
    segment: opportunity.segment,
    workLocation: opportunity.city,
    title: projectTitle ?? '',
    positions: String(opportunity.estimated_positions || 1),
    department: '',
    managerName: opportunity.contact_name,
    hiringReason: opportunity.need,
    contractType: 'clt',
    modality: 'presencial',
    cityNeighborhood: opportunity.city,
    schedule: '',
    salary: '',
    benefits: '',
    variablePay: '',
    desiredStartDate: '',
    education: '',
    minimumExperience: '',
    mandatoryRequirements: '',
    desirableRequirements: '',
    technicalSkills: '',
    behavioralSkills: '',
    preferredGender: '',
    ageRange: '',
    profileNotes: '',
    responsibilities: '',
    routine: '',
    goals: '',
    challenges: '',
    successCriteria: '',
    selectionSteps: '',
    companyInterviewers: opportunity.contact_name,
    interviewAvailability: '',
    requiredDocuments: '',
    additionalNotes: '',
  };
}

export async function listFranchiseWorkspace(franchiseId: string): Promise<FranchiseWorkspaceData> {
  const store = readStore();
  const [companies, jobs, applications] = await Promise.all([
    listCompanies({ franchiseId }),
    listJobs({ franchiseId }),
    listApplications({ franchiseId }),
  ]);

  return {
    opportunities: store.opportunities.filter((item) => item.franchise_id === franchiseId),
    projects: store.projects.filter((item) => item.franchise_id === franchiseId),
    briefings: store.briefings.filter((item) => item.franchise_id === franchiseId),
    jobDescriptions: store.jobDescriptions.filter((item) => item.franchise_id === franchiseId),
    contracts: store.contracts.filter((item) => item.franchise_id === franchiseId),
    serviceOrders: store.serviceOrders.filter((item) => item.franchise_id === franchiseId),
    accountsReceivable: store.accountsReceivable.filter((item) => item.franchise_id === franchiseId),
    accountsPayable: store.accountsPayable.filter((item) => item.franchise_id === franchiseId),
    invoices: store.invoices.filter((item) => item.franchise_id === franchiseId),
    tasks: store.tasks.filter((item) => item.franchise_id === franchiseId),
    finalists: store.finalists.filter((item) => item.franchise_id === franchiseId),
    schedules: store.schedules.filter((item) => item.franchise_id === franchiseId),
    hiringDecisions: store.hiringDecisions.filter((item) => item.franchise_id === franchiseId),
    npsResponses: store.npsResponses.filter((item) => item.franchise_id === franchiseId),
    postSaleTasks: store.postSaleTasks.filter((item) => item.franchise_id === franchiseId),
    documents: store.documents.filter((item) => item.franchise_id === franchiseId),
    conversations: store.conversations.filter((item) => item.franchise_id === franchiseId),
    messages: store.messages,
    companies,
    jobs,
    applications: applications.map((application) => {
      const ranking = createApplicationRanking(application, jobs.find((job) => job.id === application.job_id));
      return {
        ...application,
        match_score: application.match_score ?? ranking.score,
        adhesion_score: application.adhesion_score ?? ranking.score,
        professional_summary: application.professional_summary ?? ranking.summary,
      };
    }),
  };
}

export function createSalesOpportunity(
  franchiseId: string,
  input: Partial<SalesOpportunity> &
    Pick<SalesOpportunity, 'company_name' | 'contact_name' | 'contact_phone' | 'contact_email' | 'service_name'>,
) {
  const store = readStore();
  const timestamp = todayIso();
  const opportunity: SalesOpportunity = {
    id: makeId(),
    franchise_id: franchiseId,
    client_id: null,
    company_name: input.company_name.trim(),
    legal_name: input.legal_name?.trim() || input.company_name.trim(),
    document: input.document?.trim() || '',
    segment: input.segment?.trim() || '',
    contact_name: input.contact_name.trim(),
    contact_role: input.contact_role?.trim() || '',
    contact_phone: input.contact_phone.trim(),
    contact_email: input.contact_email.trim(),
    city: input.city?.trim() || '',
    source: input.source || 'Prospecção ativa',
    campaign: input.campaign?.trim() || '',
    need: input.need?.trim() || '',
    estimated_positions: Number(input.estimated_positions || 1),
    service_name: input.service_name.trim(),
    negotiated_value: normalizeMoney(input.negotiated_value),
    payment_terms: input.payment_terms || '50_50',
    contract_status: input.contract_status || 'not_generated',
    initial_payment_status: input.initial_payment_status || 'pending',
    stage: input.stage || 'new_lead',
    next_follow_up: input.next_follow_up || dateOnly(addDays(new Date(), 2)),
    notes: input.notes?.trim() || '',
    lost_reason: null,
    converted_project_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.opportunities.unshift(opportunity);
  writeStore(store);
  return opportunity;
}

export function updateSalesOpportunity(id: string, patch: Partial<SalesOpportunity>) {
  const store = readStore();
  const index = store.opportunities.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Oportunidade nao encontrada.');
  store.opportunities[index] = { ...store.opportunities[index], ...patch, updated_at: todayIso() };
  writeStore(store);
  return store.opportunities[index];
}

export function getConversionMissingFields(opportunity: SalesOpportunity) {
  const fields: Array<[keyof SalesOpportunity, string]> = [
    ['document', 'CNPJ'],
    ['company_name', 'nome da empresa'],
    ['contact_name', 'responsavel principal'],
    ['contact_email', 'e-mail do responsavel'],
    ['contact_phone', 'WhatsApp do responsavel'],
    ['negotiated_value', 'valor negociado'],
    ['payment_terms', 'condicao de pagamento'],
    ['contract_status', 'status do contrato'],
    ['initial_payment_status', 'status do pagamento inicial'],
    ['service_name', 'servico contratado'],
  ];

  return fields
    .filter(([key]) => {
      const value = opportunity[key];
      if (typeof value === 'number') return value > 0 ? false : true;
      return !String(value ?? '').trim();
    })
    .map(([, label]) => label);
}

export async function convertOpportunityToProject(opportunityId: string) {
  const store = readStore();
  const opportunity = store.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) throw new Error('Oportunidade nao encontrada.');

  const missing = getConversionMissingFields(opportunity);
  if (missing.length) {
    throw new Error(`Preencha antes de converter: ${missing.join(', ')}.`);
  }

  const companies = await listCompanies({ franchiseId: opportunity.franchise_id });
  const existingCompany =
    opportunity.client_id ? companies.find((company) => company.id === opportunity.client_id) : null;
  const company =
    existingCompany ??
    (await upsertCompany({
      franchise_id: opportunity.franchise_id,
      name: opportunity.company_name,
      slug: slugify(opportunity.company_name),
      legal_name: opportunity.legal_name,
      segment: opportunity.segment || null,
      city: opportunity.city || null,
      state: 'MA',
      short_description: opportunity.need || null,
      about_text: opportunity.need || null,
      commercial_status: 'active_client',
      page_status: 'published',
    }));

  const timestamp = todayIso();
  const project: FranchiseProject = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    opportunity_id: opportunity.id,
    client_id: company.id,
    job_id: null,
    title: opportunity.service_name || `Processo ${opportunity.company_name}`,
    stage: 'briefing_pending',
    priority: 'medium',
    next_step: 'Enviar ou preencher briefing da vaga',
    client_access_token: makeId(),
    created_at: timestamp,
    updated_at: timestamp,
  };

  const serviceOrder: ServiceOrder = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    client_id: company.id,
    project_id: project.id,
    opportunity_id: opportunity.id,
    description: opportunity.service_name,
    amount: opportunity.negotiated_value,
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
  };

  const entry = splitEntry(opportunity.negotiated_value, opportunity.payment_terms);
  const receivable: AccountReceivable = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    client_id: company.id,
    project_id: project.id,
    service_order_id: serviceOrder.id,
    description: `Entrada - ${opportunity.service_name}`,
    total_amount: opportunity.negotiated_value,
    entry_amount: entry.entry,
    remaining_amount: entry.remaining,
    due_date: dateOnly(addDays(new Date(), 7)),
    payment_terms: opportunity.payment_terms,
    payment_link: '',
    status: opportunity.initial_payment_status === 'paid' ? 'received' : 'pending',
    created_at: timestamp,
    updated_at: timestamp,
  };

  const briefing: JobBriefing = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    project_id: project.id,
    client_id: company.id,
    secure_token: makeId(),
    status: 'sent',
    payload: getDefaultBriefingPayload(opportunity, project.title),
    filled_by: null,
    sent_at: timestamp,
    filled_at: null,
    approved_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const contract: ContractRecord = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    client_id: company.id,
    project_id: project.id,
    status: opportunity.contract_status,
    provider: null,
    signed_file_url: '',
    notes: '',
    created_at: timestamp,
    updated_at: timestamp,
  };

  const task: NotificationTask = {
    id: makeId(),
    franchise_id: opportunity.franchise_id,
    project_id: project.id,
    opportunity_id: opportunity.id,
    title: `Briefing pendente para ${opportunity.company_name}`,
    type: 'briefing_pending',
    due_at: dateOnly(addDays(new Date(), 1)),
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
  };

  store.projects.unshift(project);
  store.serviceOrders.unshift(serviceOrder);
  store.accountsReceivable.unshift(receivable);
  store.briefings.unshift(briefing);
  store.contracts.unshift(contract);
  store.tasks.unshift(task);
  store.opportunities = store.opportunities.map((item) =>
    item.id === opportunity.id
      ? { ...item, client_id: company.id, stage: 'won', converted_project_id: project.id, updated_at: timestamp }
      : item,
  );
  writeStore(store);

  return { project, company, briefing, serviceOrder, receivable, contract };
}

export function saveBriefing(
  briefingIdOrToken: string,
  payload: BriefingPayload,
  status: BriefingStatus = 'filled',
  filledBy: JobBriefing['filled_by'] = 'franchise',
) {
  const store = readStore();
  const index = store.briefings.findIndex(
    (item) => item.id === briefingIdOrToken || item.secure_token === briefingIdOrToken,
  );
  if (index < 0) throw new Error('Briefing nao encontrado.');
  const timestamp = todayIso();
  store.briefings[index] = {
    ...store.briefings[index],
    payload,
    status,
    filled_by: filledBy,
    filled_at: status === 'filled' || status === 'approved' ? timestamp : store.briefings[index].filled_at,
    approved_at: status === 'approved' ? timestamp : store.briefings[index].approved_at,
    updated_at: timestamp,
  };
  store.projects = store.projects.map((project) =>
    project.id === store.briefings[index].project_id
      ? {
          ...project,
          stage: status === 'approved' ? 'briefing_received' : project.stage,
          next_step: status === 'approved' ? 'Gerar descricao da vaga' : project.next_step,
          updated_at: timestamp,
        }
      : project,
  );
  writeStore(store);
  return store.briefings[index];
}

function fallbackJobDescription(briefing: JobBriefing): GeneratedJobDescription {
  const payload = briefing.payload;
  const title = payload.title || `Vaga em ${payload.companyName}`;
  return {
    title,
    summary: `${payload.companyName} busca profissional para ${title}. A oportunidade contempla ${payload.contractType.toUpperCase()} em modelo ${payload.modality}, com atuacao em ${payload.cityNeighborhood || payload.workLocation}.`,
    responsibilities:
      payload.responsibilities ||
      [payload.routine, payload.goals, payload.challenges].filter(Boolean).join('\n') ||
      'Atuar nas rotinas da funcao, apoiar o gestor da area e garantir entregas alinhadas aos indicadores da empresa.',
    mandatoryRequirements:
      payload.mandatoryRequirements ||
      [payload.minimumExperience, payload.education, payload.technicalSkills].filter(Boolean).join('\n') ||
      'Experiencia compativel com a funcao, boa comunicacao e disponibilidade para as etapas do processo.',
    desirableRequirements: payload.desirableRequirements || payload.behavioralSkills || 'Perfil colaborativo e orientado a resultados.',
    benefits: payload.benefits || 'Beneficios serao apresentados durante o processo seletivo.',
    schedule: payload.schedule || 'Jornada a combinar',
    modality: payload.modality,
    location: payload.cityNeighborhood || payload.workLocation,
    applicationInstructions:
      'Candidate-se pela plataforma People Jobs preenchendo seus dados, respostas e anexando o curriculo atualizado.',
    suggestedQuestions: [
      'Descreva sua experiencia mais aderente a esta vaga.',
      'Qual sua disponibilidade para inicio?',
      'Sua pretensao salarial esta alinhada ao informado na vaga?',
    ],
    rankingCriteria: [
      'Experiencia aderente aos requisitos obrigatorios',
      'Conhecimentos tecnicos informados',
      'Disponibilidade e localizacao',
      'Pretensao salarial compativel',
    ],
  };
}

export async function generateJobDescription(projectId: string) {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  const briefing = store.briefings.find((item) => item.project_id === projectId);
  if (!project || !briefing) throw new Error('Projeto ou briefing nao encontrado.');

  let content = fallbackJobDescription(briefing);
  let provider: JobDescriptionDraft['ai_provider'] = 'local';

  if (hasSupabaseConfig && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', {
        body: { briefing: briefing.payload, project },
      });
      if (!error && data?.content) {
        content = data.content as GeneratedJobDescription;
        provider = 'openai';
      }
    } catch {
      provider = 'local';
    }
  }

  const timestamp = todayIso();
  const existingIndex = store.jobDescriptions.findIndex((item) => item.project_id === projectId);
  const draft: JobDescriptionDraft = {
    id: existingIndex >= 0 ? store.jobDescriptions[existingIndex].id : makeId(),
    franchise_id: project.franchise_id,
    project_id: project.id,
    briefing_id: briefing.id,
    status: 'generated',
    content,
    job_id: existingIndex >= 0 ? store.jobDescriptions[existingIndex].job_id : null,
    ai_provider: provider,
    created_at: existingIndex >= 0 ? store.jobDescriptions[existingIndex].created_at : timestamp,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) store.jobDescriptions[existingIndex] = draft;
  else store.jobDescriptions.unshift(draft);
  store.projects = store.projects.map((item) =>
    item.id === projectId
      ? { ...item, stage: 'description_review', next_step: 'Revisar e aprovar descricao da vaga', updated_at: timestamp }
      : item,
  );
  store.tasks.unshift({
    id: makeId(),
    franchise_id: project.franchise_id,
    project_id: project.id,
    opportunity_id: project.opportunity_id,
    title: `Descricao de ${content.title} aguardando aprovacao`,
    type: 'job_description_review',
    due_at: dateOnly(addDays(new Date(), 1)),
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
  });
  writeStore(store);
  return draft;
}

export async function approveJobDescriptionAndPublish(descriptionId: string, content: GeneratedJobDescription) {
  const store = readStore();
  const draft = store.jobDescriptions.find((item) => item.id === descriptionId);
  if (!draft) throw new Error('Descricao nao encontrada.');
  const project = store.projects.find((item) => item.id === draft.project_id);
  const briefing = store.briefings.find((item) => item.id === draft.briefing_id);
  if (!project || !briefing) throw new Error('Projeto ou briefing nao encontrado.');

  const company = await getCompanyForProject(project);
  if (!company) throw new Error('Cliente nao encontrado.');

  if (company.page_status !== 'published') {
    await upsertCompany({ ...company, page_status: 'published', name: company.name, slug: company.slug });
  }

  const job = await upsertJob({
    id: draft.job_id ?? undefined,
    franchise_id: project.franchise_id,
    company_id: project.client_id,
    title: content.title,
    slug: slugify(`${content.title}-${project.id.slice(0, 6)}`),
    short_description: content.summary,
    description: content.summary,
    about_job: content.summary,
    responsibilities: content.responsibilities,
    requirements: content.mandatoryRequirements,
    desirable_requirements: content.desirableRequirements,
    benefits: content.benefits,
    salary_range: briefing.payload.salary || null,
    education_level: briefing.payload.education || null,
    work_schedule: content.schedule,
    about_company: company.about_text,
    city: briefing.payload.cityNeighborhood || company.city,
    state: company.state ?? 'MA',
    modality: content.modality,
    contract_type: briefing.payload.contractType,
    status: 'open',
    process_status: 'in_progress',
    direct_apply: true,
    open_positions: Number(briefing.payload.positions || 1),
    billing_amount: store.serviceOrders.find((item) => item.project_id === project.id)?.amount ?? null,
    billing_status: 'pending',
    published_at: todayIso(),
  });

  const timestamp = todayIso();
  store.jobDescriptions = store.jobDescriptions.map((item) =>
    item.id === descriptionId ? { ...item, content, status: 'approved', job_id: job.id, updated_at: timestamp } : item,
  );
  store.projects = store.projects.map((item) =>
    item.id === project.id
      ? { ...item, job_id: job.id, stage: 'job_published', next_step: 'Acompanhar candidaturas e ranking', updated_at: timestamp }
      : item,
  );
  writeStore(store);
  return job;
}

async function getCompanyForProject(project: FranchiseProject) {
  const companies = await listCompanies({ franchiseId: project.franchise_id });
  return companies.find((company) => company.id === project.client_id) ?? null;
}

export function createAccountPayable(franchiseId: string, input: Omit<AccountPayable, 'id' | 'franchise_id' | 'created_at' | 'updated_at'>) {
  const store = readStore();
  const timestamp = todayIso();
  const item: AccountPayable = { id: makeId(), franchise_id: franchiseId, ...input, created_at: timestamp, updated_at: timestamp };
  store.accountsPayable.unshift(item);
  writeStore(store);
  return item;
}

export function updateReceivable(id: string, patch: Partial<AccountReceivable>) {
  const store = readStore();
  const index = store.accountsReceivable.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Conta a receber nao encontrada.');
  store.accountsReceivable[index] = { ...store.accountsReceivable[index], ...patch, updated_at: todayIso() };
  writeStore(store);
  return store.accountsReceivable[index];
}

export function updateContract(id: string, patch: Partial<ContractRecord>) {
  const store = readStore();
  const index = store.contracts.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Contrato nao encontrado.');
  store.contracts[index] = { ...store.contracts[index], ...patch, updated_at: todayIso() };
  writeStore(store);
  return store.contracts[index];
}

export function updateInvoice(id: string, patch: Partial<InvoiceRecord>) {
  const store = readStore();
  const index = store.invoices.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Nota fiscal nao encontrada.');
  store.invoices[index] = { ...store.invoices[index], ...patch, updated_at: todayIso() };
  writeStore(store);
  return store.invoices[index];
}

export async function selectFinalist(projectId: string, applicationId: string, franchiseOpinion = '') {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error('Projeto nao encontrado.');
  const projectFinalists = store.finalists.filter((item) => item.project_id === projectId);
  if (projectFinalists.length >= 3 && !projectFinalists.some((item) => item.application_id === applicationId)) {
    throw new Error('Cada processo pode ter ate 3 finalistas.');
  }
  const existing = projectFinalists.find((item) => item.application_id === applicationId);
  if (existing) return existing;

  const applications = await listApplications({ franchiseId: project.franchise_id });
  const jobs = await listJobs({ franchiseId: project.franchise_id });
  const application = applications.find((item) => item.id === applicationId);
  const job = jobs.find((item) => item.id === application?.job_id);
  if (!application) throw new Error('Candidato nao encontrado.');
  const ranking = createApplicationRanking(application, job);
  const timestamp = todayIso();
  const finalist: FinalistRecord = {
    id: makeId(),
    franchise_id: project.franchise_id,
    project_id: projectId,
    application_id: applicationId,
    status: 'approved_by_franchise',
    franchise_opinion: franchiseOpinion,
    ai_report: `${application.candidate_name} apresenta ${ranking.score}% de aderencia. Pontos fortes: ${ranking.strengths.join(', ') || 'perfil aderente ao processo'}. Pontos de atencao: ${ranking.concerns.join(', ') || 'validar detalhes em entrevista'}.`,
    client_notes: '',
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.finalists.unshift(finalist);
  store.projects = store.projects.map((item) =>
    item.id === projectId ? { ...item, stage: 'finalists_selected', next_step: 'Liberar finalistas ao cliente', updated_at: timestamp } : item,
  );
  writeStore(store);
  await updateApplicationStatus(applicationId, 'selecionado');
  return finalist;
}

export function releaseFinalistsToClient(projectId: string) {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error('Projeto nao encontrado.');
  const timestamp = todayIso();
  store.finalists = store.finalists.map((item) =>
    item.project_id === projectId && item.status === 'approved_by_franchise'
      ? { ...item, status: 'released_to_client', updated_at: timestamp }
      : item,
  );
  store.projects = store.projects.map((item) =>
    item.id === projectId ? { ...item, stage: 'waiting_client', next_step: 'Cliente analisar finalistas e agendar entrevistas', updated_at: timestamp } : item,
  );
  store.tasks.unshift({
    id: makeId(),
    franchise_id: project.franchise_id,
    project_id: project.id,
    opportunity_id: project.opportunity_id,
    title: 'Finalistas liberados no portal do cliente',
    type: 'client_finalists_released',
    due_at: dateOnly(addDays(new Date(), 2)),
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
  });
  writeStore(store);
  return project.client_access_token;
}

export function scheduleInterview(
  finalistId: string,
  input: Omit<
    ClientInterviewSchedule,
    | 'id'
    | 'franchise_id'
    | 'project_id'
    | 'application_id'
    | 'finalist_id'
    | 'candidate_confirmation_token'
    | 'candidate_confirmed_at'
    | 'created_at'
    | 'updated_at'
  >,
) {
  const store = readStore();
  const finalist = store.finalists.find((item) => item.id === finalistId);
  if (!finalist) throw new Error('Finalista nao encontrado.');
  const conflict = store.schedules.some(
    (item) => item.project_id === finalist.project_id && item.date === input.date && item.time === input.time,
  );
  if (conflict) throw new Error('Ja existe entrevista neste horario para o projeto.');
  const timestamp = todayIso();
  const schedule: ClientInterviewSchedule = {
    id: makeId(),
    franchise_id: finalist.franchise_id,
    project_id: finalist.project_id,
    finalist_id: finalist.id,
    application_id: finalist.application_id,
    candidate_confirmation_token: makeId(),
    candidate_confirmed_at: null,
    ...input,
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.schedules.unshift(schedule);
  store.finalists = store.finalists.map((item) =>
    item.id === finalistId ? { ...item, status: 'interview_scheduled', updated_at: timestamp } : item,
  );
  store.projects = store.projects.map((item) =>
    item.id === finalist.project_id
      ? { ...item, stage: 'client_interviews', next_step: 'Aguardar confirmacao do candidato', updated_at: timestamp }
      : item,
  );
  writeStore(store);
  return schedule;
}

export function confirmCandidatePresence(token: string) {
  const store = readStore();
  const index = store.schedules.findIndex((item) => item.candidate_confirmation_token === token);
  if (index < 0) throw new Error('Entrevista nao encontrada.');
  const timestamp = todayIso();
  store.schedules[index] = { ...store.schedules[index], candidate_confirmed_at: timestamp, updated_at: timestamp };
  store.tasks.unshift({
    id: makeId(),
    franchise_id: store.schedules[index].franchise_id,
    project_id: store.schedules[index].project_id,
    opportunity_id: null,
    title: 'Candidato confirmou presenca na entrevista com o cliente',
    type: 'candidate_confirmed',
    due_at: dateOnly(new Date()),
    status: 'open',
    created_at: timestamp,
    updated_at: timestamp,
  });
  writeStore(store);
  return store.schedules[index];
}

export async function saveHiringDecision(
  finalistId: string,
  input: Omit<HiringDecision, 'id' | 'franchise_id' | 'project_id' | 'application_id' | 'finalist_id' | 'created_at' | 'updated_at'>,
) {
  if (input.decision === 'approved') {
    const required = [
      input.start_date,
      input.internal_responsible_name,
      input.internal_responsible_email,
      input.internal_responsible_phone,
    ];
    if (required.some((value) => !String(value ?? '').trim())) {
      throw new Error('Informe data de inicio e responsavel interno para aprovar o candidato.');
    }
  }

  const store = readStore();
  const finalist = store.finalists.find((item) => item.id === finalistId);
  if (!finalist) throw new Error('Finalista nao encontrado.');
  const project = store.projects.find((item) => item.id === finalist.project_id);
  if (!project) throw new Error('Projeto nao encontrado.');
  const timestamp = todayIso();
  const decision: HiringDecision = {
    id: makeId(),
    franchise_id: finalist.franchise_id,
    project_id: finalist.project_id,
    finalist_id: finalist.id,
    application_id: finalist.application_id,
    ...input,
    created_at: timestamp,
    updated_at: timestamp,
  };

  store.hiringDecisions = store.hiringDecisions.filter((item) => item.finalist_id !== finalistId);
  store.hiringDecisions.unshift(decision);
  store.finalists = store.finalists.map((item) =>
    item.id === finalistId ? { ...item, status: 'client_decided', updated_at: timestamp } : item,
  );

  if (input.decision === 'approved') {
    store.projects = store.projects.map((item) =>
      item.id === finalist.project_id
        ? { ...item, stage: 'candidate_approved', next_step: 'Enviar NPS e iniciar pos-venda', updated_at: timestamp }
        : item,
    );
    const serviceOrder = store.serviceOrders.find((item) => item.project_id === finalist.project_id);
    if (serviceOrder && !store.invoices.some((item) => item.project_id === finalist.project_id)) {
      store.invoices.unshift({
        id: makeId(),
        franchise_id: finalist.franchise_id,
        client_id: project.client_id,
        project_id: project.id,
        service_order_id: serviceOrder.id,
        amount: serviceOrder.amount,
        status: 'ready_to_issue',
        expected_date: dateOnly(addDays(new Date(), 1)),
        issued_at: null,
        number: '',
        file_url: '',
        notes: 'NFS-e preparada ao final do servico.',
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    [30, 60, 90].forEach((days) => {
      store.postSaleTasks.unshift({
        id: makeId(),
        franchise_id: finalist.franchise_id,
        project_id: finalist.project_id,
        client_id: project.client_id,
        application_id: finalist.application_id,
        title: `Fazer pos-venda de ${days} dias`,
        due_date: dateOnly(addDays(input.start_date ? parseISO(input.start_date) : new Date(), days)),
        contact_date: null,
        responsible: input.internal_responsible_name,
        candidate_status: '',
        client_satisfaction: '',
        replacement_risk: 'baixo',
        new_position_identified: false,
        referral_received: false,
        notes: '',
        next_action: '',
        status: 'open',
        created_at: timestamp,
        updated_at: timestamp,
      });
    });
    await updateApplicationStatus(finalist.application_id, 'aprovado');
  } else if (input.decision === 'rejected') {
    await updateApplicationStatus(finalist.application_id, 'reprovado');
  }

  writeStore(store);
  return decision;
}

export function saveNps(projectTokenOrId: string, input: Omit<NpsResponse, 'id' | 'franchise_id' | 'project_id' | 'client_id' | 'created_at'>) {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectTokenOrId || item.client_access_token === projectTokenOrId);
  if (!project) throw new Error('Projeto nao encontrado.');
  const response: NpsResponse = {
    id: makeId(),
    franchise_id: project.franchise_id,
    project_id: project.id,
    client_id: project.client_id,
    ...input,
    created_at: todayIso(),
  };
  store.npsResponses = store.npsResponses.filter((item) => item.project_id !== project.id);
  store.npsResponses.unshift(response);
  store.projects = store.projects.map((item) =>
    item.id === project.id ? { ...item, stage: 'post_sale', next_step: 'Acompanhar tarefas de pos-venda', updated_at: todayIso() } : item,
  );
  writeStore(store);
  return response;
}

export function updatePostSaleTask(id: string, patch: Partial<PostSaleTask>) {
  const store = readStore();
  const index = store.postSaleTasks.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Tarefa de pos-venda nao encontrada.');
  store.postSaleTasks[index] = { ...store.postSaleTasks[index], ...patch, updated_at: todayIso() };
  writeStore(store);
  return store.postSaleTasks[index];
}

export function addDocument(franchiseId: string, input: Omit<DocumentRecord, 'id' | 'franchise_id' | 'created_at'>) {
  const store = readStore();
  const document: DocumentRecord = { id: makeId(), franchise_id: franchiseId, ...input, created_at: todayIso() };
  store.documents.unshift(document);
  writeStore(store);
  return document;
}

export function addChatMessage(franchiseId: string, conversationId: string | null, body: string, title = 'Conversa interna') {
  const store = readStore();
  const timestamp = todayIso();
  let currentConversationId = conversationId;
  if (!currentConversationId) {
    const conversation: ChatConversation = {
      id: makeId(),
      franchise_id: franchiseId,
      client_id: null,
      application_id: null,
      title,
      channel: 'internal',
      status: 'open',
      tags: [],
      responsible: '',
      created_at: timestamp,
      updated_at: timestamp,
    };
    store.conversations.unshift(conversation);
    currentConversationId = conversation.id;
  }
  const message: ChatMessage = {
    id: makeId(),
    conversation_id: currentConversationId,
    sender: 'franchise',
    body,
    created_at: timestamp,
  };
  store.messages.push(message);
  writeStore(store);
  return message;
}

export function markTaskDone(id: string) {
  const store = readStore();
  store.tasks = store.tasks.map((item) => (item.id === id ? { ...item, status: 'done', updated_at: todayIso() } : item));
  writeStore(store);
}

export function getPublicBriefing(token: string) {
  const store = readStore();
  return store.briefings.find((item) => item.secure_token === token) ?? null;
}

export async function getClientPortal(token: string) {
  const store = readStore();
  const project = store.projects.find((item) => item.client_access_token === token);
  if (!project) return null;
  const [companies, jobs, applications] = await Promise.all([
    listCompanies({ franchiseId: project.franchise_id }),
    listJobs({ franchiseId: project.franchise_id }),
    listApplications({ franchiseId: project.franchise_id }),
  ]);
  return {
    project,
    company: companies.find((item) => item.id === project.client_id) ?? null,
    job: jobs.find((item) => item.id === project.job_id) ?? null,
    finalists: store.finalists.filter((item) => item.project_id === project.id),
    schedules: store.schedules.filter((item) => item.project_id === project.id),
    decisions: store.hiringDecisions.filter((item) => item.project_id === project.id),
    nps: store.npsResponses.find((item) => item.project_id === project.id) ?? null,
    applications,
  };
}

export async function getCandidateConfirmation(token: string) {
  const store = readStore();
  const schedule = store.schedules.find((item) => item.candidate_confirmation_token === token);
  if (!schedule) return null;
  const applications = await listApplications({ franchiseId: schedule.franchise_id });
  const projects = store.projects;
  const companies = await listCompanies({ franchiseId: schedule.franchise_id });
  const project = projects.find((item) => item.id === schedule.project_id) ?? null;
  return {
    schedule,
    application: applications.find((item) => item.id === schedule.application_id) ?? null,
    project,
    company: project ? companies.find((item) => item.id === project.client_id) ?? null : null,
  };
}

export function getWorkspaceAlerts(data: FranchiseWorkspaceData) {
  const now = new Date();
  return [
    ...data.opportunities
      .filter((item) => item.stage !== 'won' && item.stage !== 'lost' && item.next_follow_up && isBefore(parseISO(item.next_follow_up), now))
      .map((item) => ({ id: item.id, title: `Lead sem follow-up: ${item.company_name}`, type: 'lead_followup' })),
    ...data.briefings
      .filter((item) => ['sent', 'in_progress', 'needs_adjustment'].includes(item.status))
      .map((item) => ({ id: item.id, title: 'Briefing pendente de preenchimento/aprovacao', type: 'briefing' })),
    ...data.jobDescriptions
      .filter((item) => ['generated', 'edited'].includes(item.status))
      .map((item) => ({ id: item.id, title: `Descricao aguardando aprovacao: ${item.content.title}`, type: 'description' })),
    ...data.applications
      .filter((item) => ['novo', 'triagem', 'em_analise'].includes(item.status))
      .map((item) => ({ id: item.id, title: `Candidato sem triagem final: ${item.candidate_name}`, type: 'application' })),
    ...data.schedules
      .filter((item) => !item.candidate_confirmed_at)
      .map((item) => ({ id: item.id, title: 'Candidato ainda nao confirmou presenca', type: 'confirmation' })),
    ...data.accountsReceivable
      .filter((item) => item.status === 'pending' && isBefore(parseISO(item.due_date), now))
      .map((item) => ({ id: item.id, title: `Conta a receber vencida: ${item.description}`, type: 'receivable' })),
  ];
}

export function getFallbackFranchise(): Franchise | null {
  return getLocalStore().franchises[0] ?? null;
}
