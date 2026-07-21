import { addDays, formatISO, isBefore, parseISO } from 'date-fns';
import { getPersistedApplicationRanking, normalizeRankingDetails } from './ranking';
import { listApplications, listCompanies, listJobs, upsertCompany, upsertJob } from './data';
import { moveApplicationStage } from './recruitmentPipeline';
import { makeId } from './ids';
import { slugify } from './slugify';
import { supabase } from './supabase';
import type { Application, ClientDecisionStatus, Company, Franchise, Job, JobContractType, JobModality, RankingDetails, ResumeAnalysis, ResumeAnalysisStatus, } from '../types';
export type SalesStage = 'new_lead' | 'first_contact' | 'qualification' | 'proposal_sent' | 'contract_entry' | 'won' | 'lost';
export type ContractStatus = 'not_generated' | 'generated' | 'sent' | 'signed' | 'cancelled';
export type SignatureStatus = 'not_generated' | 'generated' | 'sent' | 'viewed' | 'signed' | 'cancelled' | 'expired' | 'failed';
export type InitialPaymentStatus = 'pending' | 'paid' | 'waived' | 'overdue';
export type ProjectStage = 'commercial_formalized' | 'briefing_pending' | 'briefing_received' | 'description_review' | 'job_published' | 'applications_received' | 'screening' | 'internal_interviews' | 'finalists_selected' | 'waiting_client' | 'client_interviews' | 'candidate_approved' | 'start_informed' | 'nps' | 'post_sale' | 'completed';
export type BriefingStatus = 'not_sent' | 'sent' | 'in_progress' | 'filled' | 'in_review' | 'approved' | 'needs_adjustment';
export type JobDescriptionStatus = 'generated' | 'edited' | 'approved' | 'rejected' | 'regenerate';
export type ReceivableStatus = 'pending' | 'received' | 'overdue' | 'cancelled';
export type InstallmentStatus = 'locked' | 'pending' | 'received' | 'waived' | 'overdue' | 'cancelled';
export type PayableStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceStatus = 'pending' | 'ready_to_issue' | 'issued' | 'cancelled';
export type TaskStatus = 'open' | 'done' | 'snoozed';
export type FinalistStatus = 'draft' | 'selected' | 'approved_by_franchise' | 'released_to_client' | 'interview_scheduled' | 'client_decided';
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
    signed_contract_url: string;
    payment_link: string;
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
    client_decision_status: ClientDecisionStatus;
    client_decision_finalized_at: string | null;
    nps_released_at: string | null;
    process_completed_at: string | null;
    finalists_release_exception_reason: string | null;
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
    respondentName?: string;
    companyNameDisclosure?: string;
    finalistEmail?: string;
    urgency?: string;
    educationArea?: string;
    experienceRequirement?: string;
    driversLicense?: string;
    ownVehicle?: string;
    travelAvailability?: string;
    candidateRegion?: string;
    languages?: string;
    systems?: string;
    certifications?: string;
    managesPeople?: string;
    teamSize?: string;
    previousRoleIssues?: string;
    companyDescription?: string;
    companyValues?: string;
    leadershipRelationship?: string;
    cultureMismatch?: string;
    companyStyle?: string;
    formalValues?: string;
    workDays?: string;
    workHours?: string;
    weeklyHours?: string;
    salaryMin?: string;
    salaryMax?: string;
    variablePayType?: string;
    variablePayDetails?: string;
    healthPlan?: string;
    dentalPlan?: string;
    lifeInsurance?: string;
    benefitDetails?: string;
    benefitSelections?: string;
    nonNegotiables?: string;
    interviewPresentation?: string;
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
    provider_document_id: string | null;
    signing_url: string | null;
    contract_file_url: string | null;
    signed_file_url: string | null;
    signed_at: string | null;
    signature_status: SignatureStatus;
    signature_error: string | null;
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
export type AccountReceivableInstallment = {
    id: string;
    franchise_id: string;
    client_id: string;
    project_id: string;
    service_order_id: string | null;
    receivable_id: string;
    installment_number: number;
    description: string;
    amount: number;
    due_date: string | null;
    release_trigger: 'immediate' | 'final_decision' | 'manual';
    released_at: string | null;
    status: InstallmentStatus;
    paid_at: string | null;
    payment_link: string | null;
    receipt_url: string | null;
    notes: string;
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
    ai_report_status: 'pending' | 'generating' | 'generated' | 'approved' | 'failed';
    ai_report_payload: FinalistAiReport | Record<string, never>;
    ai_report_generated_at: string | null;
    franchise_approved_at: string | null;
    franchise_approved_by: string | null;
    client_notes: string;
    created_at: string;
    updated_at: string;
};
export type FinalistAiReport = {
    executive_summary: string;
    career_summary: string;
    job_adherence: string;
    technical_strengths: string[];
    behavioral_strengths: string[];
    attention_points: string[];
    mandatory_requirements_evidence: Array<{
        requirement: string;
        status: 'met' | 'partial' | 'not_found';
        evidence: string;
    }>;
    interview_summary: string;
    availability_and_salary: string;
    recommendation: 'strong_yes' | 'yes' | 'with_reservations' | 'no';
    recommended_client_questions: string[];
    client_facing_report: string;
};
export type CandidateScreening = {
    id: string;
    franchise_id: string;
    project_id: string;
    job_id: string;
    application_id: string;
    status: 'draft' | 'completed' | 'rejected';
    answers: Record<string, string>;
    mandatory_requirements_confirmed: boolean;
    salary_compatible: boolean | null;
    availability_compatible: boolean | null;
    location_compatible: boolean | null;
    technical_score: number | null;
    behavioral_score: number | null;
    recruiter_notes: string;
    rejection_reason: string | null;
    completed_by: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
};
export type InternalInterview = {
    id: string;
    franchise_id: string;
    project_id: string;
    job_id: string;
    application_id: string;
    status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
    scheduled_at: string | null;
    interviewed_at: string | null;
    interviewer_id: string | null;
    template_snapshot: Record<string, unknown>;
    questions_answers: Array<{
        question: string;
        answer: string;
    }>;
    strengths: string;
    risks: string;
    technical_score: number | null;
    behavioral_score: number | null;
    communication_score: number | null;
    culture_score: number | null;
    recommendation: 'strong_yes' | 'yes' | 'with_reservations' | 'no' | null;
    conclusion: string;
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
    is_final: boolean;
    finalized_at: string | null;
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
    contacted_person: string;
    candidate_status: string;
    client_satisfaction: string;
    replacement_risk: string;
    new_position_identified: boolean;
    referral_received: boolean;
    notes: string;
    next_action: string;
    next_action_date: string | null;
    referral_name: string;
    referral_contact: string;
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
    project_id: string | null;
    title: string;
    channel: 'internal' | 'whatsapp_ready';
    status: 'open' | 'waiting' | 'closed';
    tags: string[];
    responsible: string;
    contact_phone: string | null;
    provider: string;
    provider_conversation_id: string | null;
    provider_error: string | null;
    created_at: string;
    updated_at: string;
};
export type ChatMessage = {
    id: string;
    conversation_id: string;
    sender: 'franchise' | 'client' | 'candidate' | 'system';
    body: string;
    franchise_id: string | null;
    client_id: string | null;
    project_id: string | null;
    application_id: string | null;
    provider: string;
    provider_conversation_id: string | null;
    provider_message_id: string | null;
    direction: 'inbound' | 'outbound';
    delivery_status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    error_message: string | null;
    created_at: string;
};
export type InterviewTemplate = {
    id: string;
    name: string;
    subject: string;
    body: string;
};
export type FranchiseWorkflowSettings = {
    id: string;
    franchise_id: string;
    post_sale_days: number[];
    interview_default_duration: number;
    interview_templates: InterviewTemplate[];
    created_at: string;
    updated_at: string;
};
type FranchiseOpsStore = {
    opportunities: SalesOpportunity[];
    projects: FranchiseProject[];
    briefings: JobBriefing[];
    jobDescriptions: JobDescriptionDraft[];
    contracts: ContractRecord[];
    serviceOrders: ServiceOrder[];
    accountsReceivable: AccountReceivable[];
    receivableInstallments: AccountReceivableInstallment[];
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
    screenings: CandidateScreening[];
    internalInterviews: InternalInterview[];
    workflowSettings: FranchiseWorkflowSettings[];
};
export type FranchiseWorkspaceData = FranchiseOpsStore & {
    companies: Company[];
    jobs: Job[];
    applications: Application[];
    clientLastHiringActivities: ClientLastHiringActivity[];
};
export type ClientLastHiringActivity = {
    client_id: string;
    franchise_id: string;
    last_hiring_at: string | null;
    last_completed_project_at: string | null;
    activity_reference_at: string;
};
export const salesStageLabels: Record<SalesStage, string> = {
    new_lead: 'Novo contato',
    first_contact: 'Primeiro contato',
    qualification: 'Qualificacao',
    proposal_sent: 'Proposta enviada',
    contract_entry: 'Contrato / entrada',
    won: 'Ganho',
    lost: 'Perdido',
};
export const projectStageLabels: Record<ProjectStage, string> = {
    commercial_formalized: 'Comercial formalizado',
    briefing_pending: 'Levantamento da vaga pendente',
    briefing_received: 'Levantamento da vaga recebido',
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
    nps: 'Pesquisa de satisfação',
    post_sale: 'Pos-venda',
    completed: 'Concluido',
};
function asArray<T>(data: T[] | null | undefined) {
    return data ?? [];
}
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function strings(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
export function normalizeResumeAnalysis(value: unknown): ResumeAnalysis {
    const record = isRecord(value) ? value : {};
    return {
        professional_summary: typeof record.professional_summary === 'string' ? record.professional_summary : '',
        skills: strings(record.skills),
        education: Array.isArray(record.education) ? (record.education as ResumeAnalysis['education']) : [],
        experiences: Array.isArray(record.experiences) ? (record.experiences as ResumeAnalysis['experiences']) : [],
        languages: strings(record.languages),
        certifications: strings(record.certifications),
        total_experience_months: typeof record.total_experience_months === 'number' ? Math.max(0, record.total_experience_months) : 0,
        current_role: typeof record.current_role === 'string' ? record.current_role : '',
        location: typeof record.location === 'string' ? record.location : '',
        salary_expectation_found: typeof record.salary_expectation_found === 'string' ? record.salary_expectation_found : '',
        availability_found: typeof record.availability_found === 'string' ? record.availability_found : '',
        evidence: strings(record.evidence),
    };
}
function normalizeApplicationAiData(application: Application): Application {
    const ranking = normalizeRankingDetails(application.ranking_details) ?? ({} as RankingDetails);
    const allowedStatuses: ResumeAnalysisStatus[] = ['pending', 'processing', 'completed', 'failed'];
    return {
        ...application,
        resume_analysis_status: allowedStatuses.includes(application.resume_analysis_status)
            ? application.resume_analysis_status
            : 'pending',
        resume_analysis: normalizeResumeAnalysis(application.resume_analysis),
        resume_analysis_error: application.resume_analysis_error ?? null,
        resume_analyzed_at: application.resume_analyzed_at ?? null,
        ai_match_score: application.ai_match_score ?? null,
        ranking_details: ranking,
        ranking_generated_at: application.ranking_generated_at ?? null,
        resume_analysis_waived_at: application.resume_analysis_waived_at ?? null,
        resume_analysis_waiver_reason: application.resume_analysis_waiver_reason ?? null,
        resume_analysis_waived_by: application.resume_analysis_waived_by ?? null,
    };
}
async function selectByFranchise<T>(table: string, franchiseId: string) {
    if (!supabase)
        return [] as T[];
    const { data, error } = await supabase.from(table).select('*').eq('franchise_id', franchiseId);
    if (error)
        throw error;
    return asArray(data) as T[];
}
function normalizeBriefing(row: JobBriefing): JobBriefing {
    return {
        ...row,
        payload: row.payload ?? ({} as BriefingPayload),
    };
}
function normalizeDescription(row: JobDescriptionDraft): JobDescriptionDraft {
    return {
        ...row,
        content: row.content ?? ({} as GeneratedJobDescription),
    };
}
function defaultWorkflowSettings(franchiseId: string): FranchiseWorkflowSettings {
    const timestamp = todayIso();
    return {
        id: makeId(),
        franchise_id: franchiseId,
        post_sale_days: [30, 60, 90],
        interview_default_duration: 45,
        interview_templates: [
            {
                id: makeId(),
                name: 'Convite para entrevista',
                subject: 'Entrevista do processo seletivo',
                body: 'Olá, {{candidato}}! Gostaríamos de agendar sua entrevista para {{data}} às {{horario}}.',
            },
        ],
        created_at: timestamp,
        updated_at: timestamp,
    };
}
async function getWorkflowSettings(franchiseId: string) {
    const { data, error } = await supabase!
        .from('franchise_workflow_settings')
        .select('*')
        .eq('franchise_id', franchiseId)
        .maybeSingle();
    if (error)
        throw error;
    if (data) {
        const settings = data as FranchiseWorkflowSettings;
        return { ...settings, interview_templates: Array.isArray(settings.interview_templates) ? settings.interview_templates : [] };
    }
    return insertRemote<FranchiseWorkflowSettings>('franchise_workflow_settings', defaultWorkflowSettings(franchiseId));
}
export async function updateWorkflowSettings(franchiseId: string, patch: Partial<Pick<FranchiseWorkflowSettings, 'post_sale_days' | 'interview_default_duration' | 'interview_templates'>>) {
    const current = await getWorkflowSettings(franchiseId);
    return updateRemote<FranchiseWorkflowSettings>('franchise_workflow_settings', current.id, patch as Record<string, unknown>);
}
type WorkflowEmailEvent = 'briefing_link' | 'finalists_link' | 'candidate_confirmation' | 'interview_guidelines' | 'hiring_approved_candidate' | 'hiring_approved_internal';
async function sendWorkflowEmail(payload: {
    event: WorkflowEmailEvent;
    projectId: string;
    scheduleId?: string;
    finalistId?: string;
    portalToken?: string;
    candidateToken?: string;
}) {
    if (!payload.projectId)
        return;
    try {
        await supabase!.functions.invoke('send-workflow-email', {
            body: payload,
        });
    }
    catch {
        // O envio de e-mail é auxiliar e não deve desfazer a operação principal.
    }
}
async function insertRemote<T>(table: string, payload: Record<string, unknown>) {
    if (!supabase)
        throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.from(table).insert(payload).select('*').single();
    if (error)
        throw error;
    return data as T;
}
async function updateRemote<T>(table: string, id: string, patch: Record<string, unknown>) {
    if (!supabase)
        throw new Error('Supabase não configurado.');
    const { data, error } = await supabase
        .from(table)
        .update({ ...patch, updated_at: todayIso() })
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data as T;
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
    if (paymentTerms === 'avista')
        return { entry: total, remaining: 0 };
    if (paymentTerms === 'cartao_3x')
        return { entry: total / 3, remaining: (total / 3) * 2 };
    if (paymentTerms === 'personalizada')
        return { entry: 0, remaining: total };
    return { entry: total / 2, remaining: total / 2 };
}
function buildInitialInstallments(opportunity: SalesOpportunity, project: FranchiseProject, companyId: string, serviceOrderId: string, receivableId: string, timestamp: string): AccountReceivableInstallment[] {
    const totalCents = Math.round(opportunity.negotiated_value * 100);
    const paid = opportunity.initial_payment_status === 'paid';
    const waived = opportunity.initial_payment_status === 'waived';
    const base = (number: number, description: string, cents: number): AccountReceivableInstallment => ({
        id: makeId(),
        franchise_id: opportunity.franchise_id,
        client_id: companyId,
        project_id: project.id,
        service_order_id: serviceOrderId,
        receivable_id: receivableId,
        installment_number: number,
        description,
        amount: cents / 100,
        due_date: dateOnly(addDays(new Date(), number === 1 ? 7 : 30 * (number - 1))),
        release_trigger: 'immediate',
        released_at: timestamp,
        status: 'pending',
        paid_at: null,
        payment_link: opportunity.payment_link || null,
        receipt_url: null,
        notes: '',
        created_at: timestamp,
        updated_at: timestamp,
    });
    if (opportunity.payment_terms === '50_50') {
        const entryCents = waived ? 0 : Math.round(totalCents / 2);
        const entry = base(1, waived ? 'Entrada dispensada' : 'Entrada de 50%', entryCents);
        entry.status = waived ? 'waived' : paid ? 'received' : 'pending';
        entry.paid_at = paid ? timestamp : null;
        const balance = base(2, waived ? 'Saldo integral' : 'Saldo de 50%', totalCents - entryCents);
        balance.release_trigger = 'final_decision';
        balance.released_at = null;
        balance.status = 'locked';
        return [entry, balance];
    }
    if (opportunity.payment_terms === 'cartao_3x') {
        const first = Math.floor(totalCents / 3);
        const second = Math.floor(totalCents / 3);
        return [first, second, totalCents - first - second].map((cents, index) => {
            const installment = base(index + 1, `Parcela ${index + 1} de 3`, cents);
            installment.due_date = dateOnly(addDays(new Date(), 30 * index));
            if (index === 0 && paid) {
                installment.status = 'received';
                installment.paid_at = timestamp;
            }
            return installment;
        });
    }
    if (opportunity.payment_terms === 'personalizada') {
        const installment = base(1, waived ? 'Parcela inicial dispensada' : 'Parcela inicial personalizada', waived ? 0 : totalCents);
        installment.status = waived ? 'waived' : paid ? 'received' : 'pending';
        installment.paid_at = paid ? timestamp : null;
        installment.notes = 'Edite ou adicione parcelas até atingir o total da OS.';
        return [installment];
    }
    const cash = base(1, 'Pagamento à vista', totalCents);
    cash.status = paid ? 'received' : waived ? 'waived' : 'pending';
    cash.paid_at = paid ? timestamp : null;
    return [cash];
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
    const [companies, jobs, applications, opportunities, projects, briefings, jobDescriptions, contracts, serviceOrders, accountsReceivable, receivableInstallments, accountsPayable, invoices, tasks, finalists, schedules, hiringDecisions, npsResponses, postSaleTasks, documents, conversations, screenings, internalInterviews, clientLastHiringActivities,] = await Promise.all([
        listCompanies({ franchiseId }),
        listJobs({ franchiseId }),
        listApplications({ franchiseId }),
        selectByFranchise<SalesOpportunity>('sales_opportunities', franchiseId),
        selectByFranchise<FranchiseProject>('projects', franchiseId),
        selectByFranchise<JobBriefing>('job_briefings', franchiseId),
        selectByFranchise<JobDescriptionDraft>('job_descriptions', franchiseId),
        selectByFranchise<ContractRecord>('contracts', franchiseId),
        selectByFranchise<ServiceOrder>('service_orders', franchiseId),
        selectByFranchise<AccountReceivable>('accounts_receivable', franchiseId),
        selectByFranchise<AccountReceivableInstallment>('accounts_receivable_installments', franchiseId),
        selectByFranchise<AccountPayable>('accounts_payable', franchiseId),
        selectByFranchise<InvoiceRecord>('invoices', franchiseId),
        selectByFranchise<NotificationTask>('notification_tasks', franchiseId),
        selectByFranchise<FinalistRecord>('finalists', franchiseId),
        selectByFranchise<ClientInterviewSchedule>('client_interview_schedules', franchiseId),
        selectByFranchise<HiringDecision>('hiring_decisions', franchiseId),
        selectByFranchise<NpsResponse>('nps_responses', franchiseId),
        selectByFranchise<PostSaleTask>('post_sale_tasks', franchiseId),
        selectByFranchise<DocumentRecord>('documents', franchiseId),
        selectByFranchise<ChatConversation>('chat_conversations', franchiseId),
        selectByFranchise<CandidateScreening>('candidate_screenings', franchiseId),
        selectByFranchise<InternalInterview>('internal_interviews', franchiseId),
        selectByFranchise<ClientLastHiringActivity>('client_last_hiring_activity', franchiseId),
    ]);
    const conversationIds = conversations.map((item) => item.id);
    const messages = conversationIds.length
        ? (((await supabase!
            .from('chat_messages')
            .select('*')
            .in('conversation_id', conversationIds)).data ?? []) as ChatMessage[])
        : [];
    return {
        opportunities,
        projects,
        briefings: briefings.map(normalizeBriefing),
        jobDescriptions: jobDescriptions.map(normalizeDescription),
        contracts,
        serviceOrders,
        accountsReceivable,
        receivableInstallments,
        accountsPayable,
        invoices,
        tasks,
        finalists,
        schedules,
        hiringDecisions,
        npsResponses,
        postSaleTasks,
        documents,
        conversations,
        screenings,
        internalInterviews,
        clientLastHiringActivities,
        workflowSettings: [await getWorkflowSettings(franchiseId)],
        messages,
        companies,
        jobs,
        applications: applications.map((rawApplication) => {
            const application = normalizeApplicationAiData(rawApplication);
            const ranking = getPersistedApplicationRanking(application, jobs.find((job) => job.id === application.job_id));
            return {
                ...application,
                match_score: application.match_score ?? ranking.score,
                adhesion_score: application.adhesion_score ?? ranking.score,
                professional_summary: application.professional_summary ?? ranking.summary,
            };
        }),
    };
}
export function createSalesOpportunity(franchiseId: string, input: Partial<SalesOpportunity> & Pick<SalesOpportunity, 'company_name' | 'contact_name' | 'contact_phone' | 'contact_email' | 'service_name'>) {
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
        signed_contract_url: input.signed_contract_url?.trim() || '',
        payment_link: input.payment_link?.trim() || '',
        stage: input.stage || 'new_lead',
        next_follow_up: input.next_follow_up || dateOnly(addDays(new Date(), 2)),
        notes: input.notes?.trim() || '',
        lost_reason: null,
        converted_project_id: null,
        created_at: timestamp,
        updated_at: timestamp,
    };
    return insertRemote<SalesOpportunity>('sales_opportunities', opportunity);
}
export function updateSalesOpportunity(id: string, patch: Partial<SalesOpportunity>) {
    return updateRemote<SalesOpportunity>('sales_opportunities', id, patch as Record<string, unknown>);
}
export function getConversionMissingFields(opportunity: SalesOpportunity) {
    const fields: Array<[
        keyof SalesOpportunity,
        string
    ]> = [
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
        if (typeof value === 'number')
            return value > 0 ? false : true;
        return !String(value ?? '').trim();
    })
        .map(([, label]) => label);
}
export async function convertOpportunityToProject(opportunityId: string) {
    const { data, error } = await supabase!
        .from('sales_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();
    if (error)
        throw error;
    const opportunity = data as SalesOpportunity;
    if (!opportunity)
        throw new Error('Oportunidade nao encontrada.');
    const missing = getConversionMissingFields(opportunity);
    if (missing.length) {
        throw new Error(`Preencha antes de converter: ${missing.join(', ')}.`);
    }
    if (opportunity.contract_status !== 'signed' || !['paid', 'waived'].includes(opportunity.initial_payment_status)) {
        throw new Error('Para iniciar o projeto, o contrato precisa estar assinado e a entrada registrada como paga ou dispensada.');
    }
    const companies = await listCompanies({ franchiseId: opportunity.franchise_id });
    const existingCompany = opportunity.client_id ? companies.find((company) => company.id === opportunity.client_id) : null;
    const company = existingCompany ??
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
        next_step: 'Enviar ou preencher levantamento da vaga',
        client_access_token: makeId(),
        client_decision_status: 'not_started',
        client_decision_finalized_at: null,
        nps_released_at: null,
        process_completed_at: null,
        finalists_release_exception_reason: null,
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
        payment_link: opportunity.payment_link,
        status: 'pending',
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
        provider_document_id: null,
        signing_url: null,
        contract_file_url: null,
        signed_file_url: opportunity.signed_contract_url,
        signed_at: opportunity.contract_status === 'signed' ? timestamp : null,
        signature_status: opportunity.contract_status === 'signed' ? 'signed' : 'not_generated',
        signature_error: null,
        notes: '',
        created_at: timestamp,
        updated_at: timestamp,
    };
    const task: NotificationTask = {
        id: makeId(),
        franchise_id: opportunity.franchise_id,
        project_id: project.id,
        opportunity_id: opportunity.id,
        title: `Levantamento da vaga pendente para ${opportunity.company_name}`,
        type: 'briefing_pending',
        due_at: dateOnly(addDays(new Date(), 1)),
        status: 'open',
        created_at: timestamp,
        updated_at: timestamp,
    };
    const installments = buildInitialInstallments(opportunity, project, company.id, serviceOrder.id, receivable.id, timestamp);
    await insertRemote<FranchiseProject>('projects', project);
    await insertRemote<ServiceOrder>('service_orders', serviceOrder);
    await insertRemote<AccountReceivable>('accounts_receivable', receivable);
    await Promise.all(installments.map((installment) => insertRemote<AccountReceivableInstallment>('accounts_receivable_installments', installment)));
    await Promise.all([
        insertRemote<JobBriefing>('job_briefings', briefing),
        insertRemote<ContractRecord>('contracts', contract),
        insertRemote<NotificationTask>('notification_tasks', task),
    ]);
    await updateRemote<SalesOpportunity>('sales_opportunities', opportunity.id, {
        client_id: company.id,
        stage: 'won',
        converted_project_id: project.id,
    });
    // O e-mail é auxiliar; a tela pode refletir o projeto assim que os dados
    // operacionais estiverem persistidos.
    void sendWorkflowEmail({
        event: 'briefing_link',
        projectId: project.id,
    });
    return { project, company, briefing, serviceOrder, receivable, installments, contract };
}
export function saveBriefing(briefingIdOrToken: string, payload: BriefingPayload, status: BriefingStatus = 'filled', filledBy: JobBriefing['filled_by'] = 'franchise') {
    if (filledBy === 'client') {
        return (async () => {
            const { data, error } = await supabase!.rpc('save_public_briefing', {
                access_token: briefingIdOrToken,
                next_payload: payload,
            });
            if (error)
                throw error;
            return normalizeBriefing(data as JobBriefing);
        })();
    }
    return (async () => {
        const { data: briefing, error } = await supabase!
            .from('job_briefings')
            .select('*')
            .or(`id.eq.${briefingIdOrToken},secure_token.eq.${briefingIdOrToken}`)
            .single();
        if (error)
            throw error;
        const current = normalizeBriefing(briefing as JobBriefing);
        const timestamp = todayIso();
        const updated = await updateRemote<JobBriefing>('job_briefings', current.id, {
            payload,
            status,
            filled_by: filledBy,
            filled_at: status === 'filled' || status === 'approved' ? timestamp : current.filled_at,
            approved_at: status === 'approved' ? timestamp : current.approved_at,
        });
        await updateRemote<FranchiseProject>('projects', current.project_id, {
            ...(status === 'approved' ? { stage: 'briefing_received' } : {}),
            next_step: status === 'approved'
                ? 'Gerar descricao da vaga'
                : status === 'filled'
                    ? 'Franqueado revisar levantamento da vaga'
                    : undefined,
        });
        return normalizeBriefing(updated);
    })();
}
export async function generateJobDescription(projectId: string) {
    const [{ data: projectData, error: projectError }, { data: briefingData, error: briefingError }] = await Promise.all([
        supabase!.from('projects').select('*').eq('id', projectId).single(),
        supabase!.from('job_briefings').select('*').eq('project_id', projectId).single(),
    ]);
    if (projectError)
        throw projectError;
    if (briefingError)
        throw briefingError;
    const project = projectData as FranchiseProject;
    const briefing = normalizeBriefing(briefingData as JobBriefing);
    if (!project || !briefing)
        throw new Error('Projeto ou levantamento da vaga não encontrado.');
    if (briefing.status !== 'approved') {
        throw new Error('A descrição da vaga só pode ser gerada depois que o levantamento for aprovado pelo franqueado.');
    }
    const { data: generatedData, error } = await supabase.functions.invoke('generate-job-description', {
        body: { briefing: briefing.payload, project },
    });
    if (error)
        throw error;
    if (!generatedData?.content || generatedData.provider !== 'openai') {
        throw new Error(generatedData?.error || 'A descrição não foi gerada pela OpenAI.');
    }
    const content = generatedData.content as GeneratedJobDescription;
    const provider: JobDescriptionDraft['ai_provider'] = 'openai';
    const timestamp = todayIso();
    let existingRemote: JobDescriptionDraft | null = null;
    const { data: existingData } = await supabase!
        .from('job_descriptions')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
    existingRemote = existingData ? normalizeDescription(existingData as JobDescriptionDraft) : null;
    const draft: JobDescriptionDraft = {
        id: existingRemote?.id ?? makeId(),
        franchise_id: project.franchise_id,
        project_id: project.id,
        briefing_id: briefing.id,
        status: 'generated',
        content,
        job_id: existingRemote?.job_id ?? null,
        ai_provider: provider,
        created_at: existingRemote?.created_at ?? timestamp,
        updated_at: timestamp,
    };
    const saved = existingRemote
        ? await updateRemote<JobDescriptionDraft>('job_descriptions', draft.id, {
            status: draft.status,
            content: draft.content,
            ai_provider: draft.ai_provider,
        })
        : await insertRemote<JobDescriptionDraft>('job_descriptions', draft);
    await updateRemote<FranchiseProject>('projects', projectId, {
        stage: 'description_review',
        next_step: 'Revisar e aprovar descricao da vaga',
    });
    await insertRemote<NotificationTask>('notification_tasks', {
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
    return normalizeDescription(saved);
}
export async function approveJobDescriptionAndPublish(descriptionId: string, content: GeneratedJobDescription) {
    const { data, error } = await supabase!.from('job_descriptions').select('*').eq('id', descriptionId).single();
    if (error)
        throw error;
    const draft = normalizeDescription(data as JobDescriptionDraft);
    if (!draft)
        throw new Error('Descricao nao encontrada.');
    const [{ data: projectData, error: projectError }, { data: briefingData, error: briefingError }] = await Promise.all([
        supabase!.from('projects').select('*').eq('id', draft.project_id).single(),
        supabase!.from('job_briefings').select('*').eq('id', draft.briefing_id).single(),
    ]);
    if (projectError)
        throw projectError;
    if (briefingError)
        throw briefingError;
    const project = projectData as FranchiseProject;
    const briefing = normalizeBriefing(briefingData as JobBriefing);
    if (!project || !briefing)
        throw new Error('Projeto ou levantamento da vaga não encontrado.');
    const company = await getCompanyForProject(project);
    if (!company)
        throw new Error('Cliente nao encontrado.');
    if (company.page_status !== 'published') {
        await upsertCompany({ ...company, page_status: 'published', name: company.name, slug: company.slug });
    }
    const job = await upsertJob({
        id: draft.job_id ?? project.job_id ?? undefined,
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
        billing_amount: (((await supabase!
            .from('service_orders')
            .select('amount')
            .eq('project_id', project.id)
            .maybeSingle()).data?.amount as number | null | undefined) ?? null),
        billing_status: 'pending',
        published_at: todayIso(),
    });
    await updateRemote<JobDescriptionDraft>('job_descriptions', descriptionId, {
        content,
        status: 'approved',
        job_id: job.id,
    });
    await updateRemote<FranchiseProject>('projects', project.id, {
        job_id: job.id,
        stage: 'job_published',
        next_step: 'Acompanhar candidaturas e ranking',
    });
    return job;
}
function briefingToJobDescription(project: FranchiseProject, payload: BriefingPayload): GeneratedJobDescription {
    const title = payload.title.trim() || project.title.trim() || 'Nova vaga';
    const summary = payload.hiringReason.trim()
        || payload.profileNotes.trim()
        || `Oportunidade de ${title}.`;
    return {
        title,
        summary,
        responsibilities: payload.responsibilities.trim() || payload.routine.trim() || summary,
        mandatoryRequirements: payload.mandatoryRequirements.trim() || payload.technicalSkills.trim(),
        desirableRequirements: payload.desirableRequirements.trim() || payload.behavioralSkills.trim(),
        benefits: payload.benefits.trim(),
        schedule: payload.schedule.trim(),
        modality: payload.modality,
        location: payload.cityNeighborhood.trim() || payload.workLocation.trim(),
        applicationInstructions: 'Candidate-se pela plataforma.',
        suggestedQuestions: [],
        rankingCriteria: [],
    };
}
export async function approveBriefingAndPublishJob(briefingId: string, nextPayload?: BriefingPayload) {
    const { data, error } = await supabase!.from('job_briefings').select('*').eq('id', briefingId).single();
    if (error)
        throw error;
    const briefing = normalizeBriefing(data as JobBriefing);
    const payload = nextPayload ?? briefing.payload;
    await saveBriefing(briefing.id, payload, 'approved', 'franchise');
    const { data: projectData, error: projectError } = await supabase!
        .from('projects')
        .select('*')
        .eq('id', briefing.project_id)
        .single();
    if (projectError)
        throw projectError;
    const project = projectData as FranchiseProject;
    const { data: descriptionData, error: descriptionError } = await supabase!
        .from('job_descriptions')
        .select('*')
        .eq('project_id', project.id)
        .maybeSingle();
    if (descriptionError)
        throw descriptionError;
    const existingDescription = descriptionData ? normalizeDescription(descriptionData as JobDescriptionDraft) : null;
    const content = existingDescription?.content ?? briefingToJobDescription(project, payload);
    const timestamp = todayIso();
    const description = existingDescription
        ? await updateRemote<JobDescriptionDraft>('job_descriptions', existingDescription.id, {
            content,
            status: 'generated',
            job_id: existingDescription.job_id ?? project.job_id,
        })
        : await insertRemote<JobDescriptionDraft>('job_descriptions', {
            id: makeId(),
            franchise_id: project.franchise_id,
            project_id: project.id,
            briefing_id: briefing.id,
            status: 'generated',
            content,
            job_id: project.job_id,
            ai_provider: 'local',
            created_at: timestamp,
            updated_at: timestamp,
        });
    return approveJobDescriptionAndPublish(description.id, content);
}
async function getCompanyForProject(project: FranchiseProject) {
    const companies = await listCompanies({ franchiseId: project.franchise_id });
    return companies.find((company) => company.id === project.client_id) ?? null;
}
export function createAccountPayable(franchiseId: string, input: Omit<AccountPayable, 'id' | 'franchise_id' | 'created_at' | 'updated_at'>) {
    const timestamp = todayIso();
    const item: AccountPayable = { id: makeId(), franchise_id: franchiseId, ...input, created_at: timestamp, updated_at: timestamp };
    return insertRemote<AccountPayable>('accounts_payable', item);
}
export function updateReceivable(id: string, patch: Partial<AccountReceivable>) {
    return updateRemote<AccountReceivable>('accounts_receivable', id, patch as Record<string, unknown>);
}
export async function listReceivableInstallments(receivableId: string) {
    const { data, error } = await supabase!.from('accounts_receivable_installments').select('*')
        .eq('receivable_id', receivableId).order('installment_number');
    if (error)
        throw error;
    return (data ?? []) as AccountReceivableInstallment[];
}
export function createReceivableInstallment(input: Omit<AccountReceivableInstallment, 'id' | 'created_at' | 'updated_at'>) {
    if (input.amount < 0)
        throw new Error('O valor da parcela não pode ser negativo.');
    const installment: AccountReceivableInstallment = {
        id: makeId(), ...input, created_at: todayIso(), updated_at: todayIso(),
    };
    return insertRemote<AccountReceivableInstallment>('accounts_receivable_installments', installment);
}
export function updateReceivableInstallment(id: string, patch: Partial<AccountReceivableInstallment>) {
    const normalizedPatch = { ...patch };
    if (patch.status === 'received' && !patch.paid_at)
        normalizedPatch.paid_at = todayIso();
    if (patch.status && patch.status !== 'received')
        normalizedPatch.paid_at = null;
    return updateRemote<AccountReceivableInstallment>('accounts_receivable_installments', id, normalizedPatch as Record<string, unknown>);
}
export async function releaseFinalBalance(projectId: string) {
    const { data, error } = await supabase!.from('accounts_receivable_installments')
        .update({ status: 'pending', released_at: todayIso(), updated_at: todayIso() })
        .eq('project_id', projectId).eq('status', 'locked').eq('release_trigger', 'final_decision').select('*');
    if (error)
        throw error;
    return (data ?? []) as AccountReceivableInstallment[];
}
export function updateContract(id: string, patch: Partial<ContractRecord>) {
    return updateRemote<ContractRecord>('contracts', id, patch as Record<string, unknown>);
}
export function updateInvoice(id: string, patch: Partial<InvoiceRecord>) {
    return updateRemote<InvoiceRecord>('invoices', id, patch as Record<string, unknown>);
}
async function currentProfileId() {
    if (!supabase)
        return null;
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
}
export async function analyzeCandidateResume(applicationId: string) {
    const { data, error } = await supabase!.functions.invoke('analyze-candidate-resume', {
        body: { applicationId },
    });
    if (error)
        throw error;
    return data as {
        status: 'completed';
        score: number;
    };
}
export async function waiveCandidateResumeAnalysis(applicationId: string, reason: string) {
    if (!reason.trim())
        throw new Error('Informe a justificativa para dispensar a análise.');
    return updateRemote<Application>('applications', applicationId, {
        resume_analysis_waived_at: todayIso(),
        resume_analysis_waiver_reason: reason.trim(),
        resume_analysis_waived_by: await currentProfileId(),
    });
}
export async function getOrCreateCandidateScreening(projectId: string, applicationId: string) {
    const { data: existing, error: lookupError } = await supabase!.from('candidate_screenings')
        .select('*').eq('project_id', projectId).eq('application_id', applicationId).maybeSingle();
    if (lookupError)
        throw lookupError;
    if (existing)
        return existing as CandidateScreening;
    const { data: project, error: projectError } = await supabase!.from('projects')
        .select('id,franchise_id,job_id').eq('id', projectId).single();
    if (projectError || !project?.job_id)
        throw projectError ?? new Error('Publique a vaga antes de iniciar a triagem.');
    return insertRemote<CandidateScreening>('candidate_screenings', {
        id: makeId(), franchise_id: project.franchise_id, project_id: projectId, job_id: project.job_id,
        application_id: applicationId, status: 'draft', answers: {}, mandatory_requirements_confirmed: false,
        salary_compatible: null, availability_compatible: null, location_compatible: null,
        technical_score: null, behavioral_score: null, recruiter_notes: '', rejection_reason: null,
        completed_by: null, completed_at: null, created_at: todayIso(), updated_at: todayIso(),
    });
}
export function saveCandidateScreening(screeningId: string, patch: Partial<CandidateScreening>) {
    return updateRemote<CandidateScreening>('candidate_screenings', screeningId, patch as Record<string, unknown>);
}
export async function completeCandidateScreening(screeningId: string, payload: Partial<CandidateScreening>) {
    if (!payload.mandatory_requirements_confirmed)
        throw new Error('Confirme os requisitos obrigatórios.');
    for (const value of [payload.technical_score, payload.behavioral_score]) {
        if (typeof value !== 'number' || value < 0 || value > 10)
            throw new Error('Informe notas entre 0 e 10.');
    }
    const completed = await saveCandidateScreening(screeningId, {
        ...payload, status: 'completed', rejection_reason: null,
        completed_by: await currentProfileId(), completed_at: todayIso(),
    });
    await moveApplicationStage({
        applicationId: completed.application_id,
        targetStage: 'testes',
        targetOrder: 0,
        reason: 'Triagem manual concluída e aprovada.',
        metadata: { source: 'project_screening', screening_id: completed.id },
    });
    await updateRemote<FranchiseProject>('projects', completed.project_id, {
        stage: 'internal_interviews', next_step: 'Agendar entrevista interna',
    });
    return completed;
}
export async function rejectCandidateInScreening(screeningId: string, reason: string) {
    if (!reason.trim())
        throw new Error('Informe o motivo da reprovação.');
    const rejected = await saveCandidateScreening(screeningId, {
        status: 'rejected', rejection_reason: reason.trim(), recruiter_notes: reason.trim(),
        completed_by: await currentProfileId(), completed_at: todayIso(),
    });
    await moveApplicationStage({
        applicationId: rejected.application_id,
        targetStage: 'desclassificados',
        targetOrder: 0,
        reason: reason.trim(),
        metadata: { source: 'project_screening', screening_id: rejected.id },
    });
    return rejected;
}
export async function getOrCreateInternalInterview(projectId: string, applicationId: string) {
    const screening = (await supabase!.from('candidate_screenings').select('*').eq('project_id', projectId)
        .eq('application_id', applicationId).eq('status', 'completed').maybeSingle()).data as CandidateScreening | null;
    if (!screening)
        throw new Error('Conclua a triagem antes de abrir a entrevista interna.');
    const { data: existing, error } = await supabase!.from('internal_interviews').select('*')
        .eq('project_id', projectId).eq('application_id', applicationId).maybeSingle();
    if (error)
        throw error;
    if (existing)
        return existing as InternalInterview;
    const settings = await getWorkflowSettings(screening.franchise_id);
    const firstTemplate = settings.interview_templates[0] ?? null;
    return insertRemote<InternalInterview>('internal_interviews', {
        id: makeId(), franchise_id: screening.franchise_id, project_id: projectId, job_id: screening.job_id,
        application_id: applicationId, status: 'draft', scheduled_at: null, interviewed_at: null,
        interviewer_id: null, template_snapshot: firstTemplate ?? {},
        questions_answers: firstTemplate ? [{ question: firstTemplate.body, answer: '' }] : [],
        strengths: '', risks: '', technical_score: null, behavioral_score: null, communication_score: null,
        culture_score: null, recommendation: null, conclusion: '', created_at: todayIso(), updated_at: todayIso(),
    });
}
export function saveInternalInterview(interviewId: string, patch: Partial<InternalInterview>) {
    return updateRemote<InternalInterview>('internal_interviews', interviewId, patch as Record<string, unknown>);
}
export function scheduleInternalInterview(interviewId: string, scheduledAt: string) {
    if (!scheduledAt)
        throw new Error('Informe a data e o horário.');
    return saveInternalInterview(interviewId, { status: 'scheduled', scheduled_at: scheduledAt });
}
export async function completeInternalInterview(interviewId: string, payload: Partial<InternalInterview>) {
    if (!payload.interviewed_at || !payload.interviewer_id || !payload.conclusion?.trim() || !payload.recommendation) {
        throw new Error('Informe data, entrevistador, conclusão e recomendação.');
    }
    if (!payload.questions_answers?.some((item) => item.question.trim() && item.answer.trim())) {
        throw new Error('Registre ao menos uma pergunta e resposta.');
    }
    for (const value of [payload.technical_score, payload.behavioral_score, payload.communication_score, payload.culture_score]) {
        if (typeof value !== 'number' || value < 0 || value > 10)
            throw new Error('Todas as notas devem estar entre 0 e 10.');
    }
    const completed = await saveInternalInterview(interviewId, { ...payload, status: 'completed' });
    if (completed.recommendation === 'no')
        await moveApplicationStage({
            applicationId: completed.application_id,
            targetStage: 'desclassificados',
            targetOrder: 0,
            reason: completed.conclusion,
            metadata: { source: 'internal_interview', interview_id: completed.id },
        });
    return completed;
}
export function cancelInternalInterview(interviewId: string) {
    return saveInternalInterview(interviewId, { status: 'cancelled' });
}
export async function generateFinalistReport(projectId: string, applicationId: string) {
    const { data, error } = await supabase!.functions.invoke('generate-finalist-report', { body: { projectId, applicationId } });
    if (error)
        throw error;
    return data as {
        finalist: FinalistRecord;
    };
}
export function saveFinalistReport(finalistId: string, aiReport: string, payload: FinalistAiReport | Record<string, never>) {
    if (!aiReport.trim())
        throw new Error('O parecer ao cliente não pode ficar vazio.');
    return updateRemote<FinalistRecord>('finalists', finalistId, {
        ai_report: aiReport.trim(), ai_report_payload: payload, ai_report_status: 'generated',
    });
}
export async function approveFinalistReport(finalistId: string) {
    return updateRemote<FinalistRecord>('finalists', finalistId, {
        ai_report_status: 'approved', franchise_approved_at: todayIso(), franchise_approved_by: await currentProfileId(),
    });
}
export async function selectFinalist(projectId: string, applicationId: string, franchiseOpinion = '') {
    const { data, error } = await supabase!.rpc('select_project_finalist', {
        project_uuid: projectId,
        application_uuid: applicationId,
        franchise_opinion_value: franchiseOpinion,
    });
    if (error)
        throw error;
    return data as FinalistRecord;
}
export function releaseFinalistsToClient(projectId: string, allowLessReason = '') {
    return (async () => {
        const { data: project, error } = await supabase!.from('projects').select('*').eq('id', projectId).single();
        if (error)
            throw error;
        const currentProject = project as FranchiseProject;
        const { data: finalistRows, error: finalistError } = await supabase!.from('finalists').select('*')
            .eq('project_id', projectId).eq('status', 'selected');
        if (finalistError)
            throw finalistError;
        const selected = (finalistRows ?? []) as FinalistRecord[];
        if (!selected.length || selected.length > 3)
            throw new Error('Selecione de um a três finalistas.');
        if (selected.some((item) => item.ai_report_status !== 'approved'))
            throw new Error('Todos os pareceres precisam estar aprovados.');
        if (selected.length !== 3 && !allowLessReason.trim()) {
            throw new Error('Informe a justificativa para liberar menos de três finalistas.');
        }
        await supabase!
            .from('finalists')
            .update({ status: 'released_to_client', updated_at: todayIso() })
            .eq('project_id', projectId)
            .eq('status', 'selected');
        await updateRemote<FranchiseProject>('projects', projectId, {
            stage: 'waiting_client',
            next_step: 'Cliente analisar finalistas e agendar entrevistas',
            finalists_release_exception_reason: selected.length === 3 ? null : allowLessReason.trim(),
        });
        await insertRemote<NotificationTask>('notification_tasks', {
            id: makeId(),
            franchise_id: currentProject.franchise_id,
            project_id: currentProject.id,
            opportunity_id: currentProject.opportunity_id,
            title: 'Finalistas liberados no portal do cliente',
            type: 'client_finalists_released',
            due_at: dateOnly(addDays(new Date(), 2)),
            status: 'open',
            created_at: todayIso(),
            updated_at: todayIso(),
        });
        await sendWorkflowEmail({
            event: 'finalists_link',
            projectId: currentProject.id,
        });
        return currentProject.client_access_token;
    })();
}
export function scheduleInterview(finalistId: string, input: Omit<ClientInterviewSchedule, 'id' | 'franchise_id' | 'project_id' | 'application_id' | 'finalist_id' | 'candidate_confirmation_token' | 'candidate_confirmed_at' | 'created_at' | 'updated_at'>, portalToken?: string) {
    return (async () => {
        if (portalToken) {
            const { data, error } = await supabase!.rpc('schedule_client_interview', {
                access_token: portalToken,
                finalist_uuid: finalistId,
                schedule_payload: input,
            });
            if (error)
                throw error;
            const schedule = data as ClientInterviewSchedule;
            await sendWorkflowEmail({
                event: 'candidate_confirmation',
                projectId: schedule.project_id,
                scheduleId: schedule.id,
                portalToken,
            });
            return schedule;
        }
        const { data: finalist, error } = await supabase!.from('finalists').select('*').eq('id', finalistId).single();
        if (error)
            throw error;
        const currentFinalist = finalist as FinalistRecord;
        const { data: conflict } = await supabase!
            .from('client_interview_schedules')
            .select('id')
            .eq('project_id', currentFinalist.project_id)
            .eq('date', input.date)
            .eq('time', input.time)
            .maybeSingle();
        if (conflict)
            throw new Error('Ja existe entrevista neste horario para o projeto.');
        const timestamp = todayIso();
        const schedule = await insertRemote<ClientInterviewSchedule>('client_interview_schedules', {
            id: makeId(),
            franchise_id: currentFinalist.franchise_id,
            project_id: currentFinalist.project_id,
            finalist_id: currentFinalist.id,
            application_id: currentFinalist.application_id,
            candidate_confirmation_token: makeId(),
            candidate_confirmed_at: null,
            ...input,
            created_at: timestamp,
            updated_at: timestamp,
        });
        await updateRemote<FinalistRecord>('finalists', finalistId, { status: 'interview_scheduled' });
        await updateRemote<FranchiseProject>('projects', currentFinalist.project_id, {
            stage: 'client_interviews',
            next_step: 'Aguardar confirmacao do candidato',
        });
        await sendWorkflowEmail({
            event: 'candidate_confirmation',
            projectId: schedule.project_id,
            scheduleId: schedule.id,
        });
        return schedule;
    })();
}
export function confirmCandidatePresence(token: string) {
    return (async () => {
        const { data: schedule, error } = await supabase!.rpc('confirm_candidate_presence', {
            access_token: token,
        });
        if (error)
            throw error;
        const savedSchedule = schedule as ClientInterviewSchedule;
        await sendWorkflowEmail({
            event: 'interview_guidelines',
            projectId: savedSchedule.project_id,
            scheduleId: savedSchedule.id,
            candidateToken: token,
        });
        return savedSchedule;
    })();
}
export async function saveHiringDecision(finalistId: string, input: Omit<HiringDecision, 'id' | 'franchise_id' | 'project_id' | 'application_id' | 'finalist_id' | 'is_final' | 'finalized_at' | 'created_at' | 'updated_at'>, portalToken?: string) {
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
    if (portalToken) {
        const { data, error } = await supabase!.rpc('save_portal_hiring_decision', {
            access_token: portalToken,
            finalist_uuid: finalistId,
            decision_payload: input,
        });
        if (error)
            throw error;
        return data as HiringDecision;
    }
    const { data, error } = await supabase!.from('finalists').select('*').eq('id', finalistId).single();
    if (error)
        throw error;
    const finalist = data as FinalistRecord;
    if (!finalist)
        throw new Error('Finalista nao encontrado.');
    const { data: projectData, error: projectError } = await supabase!.from('projects').select('*').eq('id', finalist.project_id).single();
    if (projectError)
        throw projectError;
    const project = projectData as FranchiseProject;
    if (!project)
        throw new Error('Projeto nao encontrado.');
    const timestamp = todayIso();
    const decision: HiringDecision = {
        id: makeId(),
        franchise_id: finalist.franchise_id,
        project_id: finalist.project_id,
        finalist_id: finalist.id,
        application_id: finalist.application_id,
        ...input,
        is_final: false,
        finalized_at: null,
        created_at: timestamp,
        updated_at: timestamp,
    };
    const saved = await insertRemote<HiringDecision>('hiring_decisions', decision);
    await updateRemote<FinalistRecord>('finalists', finalistId, { status: 'client_decided' });
    if (input.decision === 'approved') {
        await updateRemote<FranchiseProject>('projects', finalist.project_id, {
            stage: 'candidate_approved',
            next_step: 'Enviar pesquisa de satisfação e iniciar pós-venda',
        });
        const { data: serviceOrder } = await supabase!
            .from('service_orders')
            .select('*')
            .eq('project_id', finalist.project_id)
            .maybeSingle();
        const { data: existingInvoice } = await supabase!
            .from('invoices')
            .select('id')
            .eq('project_id', finalist.project_id)
            .maybeSingle();
        if (serviceOrder && !existingInvoice) {
            await insertRemote<InvoiceRecord>('invoices', {
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
        const settings = await getWorkflowSettings(finalist.franchise_id);
        settings.post_sale_days.forEach((days) => {
            void insertRemote<PostSaleTask>('post_sale_tasks', {
                id: makeId(),
                franchise_id: finalist.franchise_id,
                project_id: finalist.project_id,
                client_id: project.client_id,
                application_id: finalist.application_id,
                title: `Fazer pos-venda de ${days} dias`,
                due_date: dateOnly(addDays(input.start_date ? parseISO(input.start_date) : new Date(), days)),
                contact_date: null,
                contacted_person: '',
                responsible: input.internal_responsible_name,
                candidate_status: '',
                client_satisfaction: '',
                replacement_risk: 'baixo',
                new_position_identified: false,
                referral_received: false,
                notes: '',
                next_action: '',
                next_action_date: null,
                referral_name: '',
                referral_contact: '',
                status: 'open',
                created_at: timestamp,
                updated_at: timestamp,
            });
        });
    }
    else if (input.decision === 'rejected') {
        await moveApplicationStage({
            applicationId: finalist.application_id,
            targetStage: 'desclassificados',
            targetOrder: 0,
            reason: input.rejection_reason,
            metadata: { source: 'client_decision', decision_id: saved.id },
        });
    }
    return saved;
}
export async function finalizeHiringDecisions(portalToken: string) {
    const { data, error } = await supabase!.rpc('finalize_portal_hiring_decisions', { access_token: portalToken });
    if (error)
        throw error;
    const result = data as {
        status: 'finalized' | 'reopen_required';
        approved_count: number;
        decisions: unknown[];
    };
    if (result.status === 'finalized') {
        const portal = await getClientPortal(portalToken);
        await Promise.all([
            sendWorkflowEmail({ event: 'hiring_approved_candidate', projectId: portal?.project.id ?? '', portalToken }),
            sendWorkflowEmail({ event: 'hiring_approved_internal', projectId: portal?.project.id ?? '', portalToken }),
        ]);
    }
    return result;
}
export function saveNps(projectTokenOrId: string, input: Omit<NpsResponse, 'id' | 'franchise_id' | 'project_id' | 'client_id' | 'created_at'>) {
    return (async () => {
        const { data, error } = await supabase!.rpc('save_public_nps', {
            access_token: projectTokenOrId,
            nps_payload: input,
        });
        if (error)
            throw error;
        return data as NpsResponse;
    })();
}
export function updatePostSaleTask(id: string, patch: Partial<PostSaleTask>) {
    return updateRemote<PostSaleTask>('post_sale_tasks', id, patch as Record<string, unknown>);
}
export async function completePostSaleContact(taskId: string, payload: Partial<PostSaleTask>) {
    const required = [payload.contact_date, payload.contacted_person, payload.candidate_status,
        payload.client_satisfaction, payload.replacement_risk, payload.notes, payload.status];
    if (required.some((value) => !String(value ?? '').trim()))
        throw new Error('Preencha todos os campos obrigatórios do contato.');
    if (payload.next_action?.trim() && !payload.next_action_date)
        throw new Error('Informe a data da próxima ação.');
    if (payload.referral_received && !payload.referral_name?.trim() && !payload.referral_contact?.trim()
        && !payload.notes?.trim())
        throw new Error('Informe os dados da indicação ou registre-os nas observações.');
    const saved = await updatePostSaleTask(taskId, payload);
    if (payload.next_action?.trim() && payload.next_action_date) {
        const nextTask: PostSaleTask = {
            ...saved, id: makeId(), title: payload.next_action.trim(), due_date: payload.next_action_date,
            contact_date: null, contacted_person: '', candidate_status: '', client_satisfaction: '',
            replacement_risk: 'baixo', notes: '', next_action: '', next_action_date: null,
            new_position_identified: false, referral_received: false, referral_name: '', referral_contact: '',
            status: 'open', created_at: todayIso(), updated_at: todayIso(),
        };
        await insertRemote<PostSaleTask>('post_sale_tasks', nextTask);
    }
    if (payload.replacement_risk === 'reposicao_necessaria') {
        await updateRemote<FranchiseProject>('projects', saved.project_id, {
            stage: 'screening', next_step: 'Iniciar reposição do candidato', process_completed_at: null,
        });
        await insertRemote<NotificationTask>('notification_tasks', {
            id: makeId(), franchise_id: saved.franchise_id, project_id: saved.project_id, opportunity_id: null,
            title: `Reposição urgente: ${saved.title}`, type: 'replacement_required', due_at: todayIso(),
            status: 'open', created_at: todayIso(), updated_at: todayIso(),
        });
    }
    return saved;
}
export function addDocument(franchiseId: string, input: Omit<DocumentRecord, 'id' | 'franchise_id' | 'created_at'>) {
    const document: DocumentRecord = { id: makeId(), franchise_id: franchiseId, ...input, created_at: todayIso() };
    return insertRemote<DocumentRecord>('documents', document);
}
export async function deleteDocument(id: string) {
    const { error } = await supabase!.from('documents').delete().eq('id', id);
    if (error)
        throw error;
    return;
}
export function addChatMessage(franchiseId: string, conversationId: string | null, body: string, title = 'Conversa interna', options: {
    contactPhone?: string;
    channel?: ChatConversation['channel'];
} = {}) {
    return (async () => {
        const timestamp = todayIso();
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const conversation = await insertRemote<ChatConversation>('chat_conversations', {
                id: makeId(),
                franchise_id: franchiseId,
                client_id: null,
                application_id: null,
                project_id: null,
                title,
                channel: options.channel ?? 'internal',
                status: 'open',
                tags: [],
                responsible: '',
                contact_phone: options.contactPhone?.trim() || null,
                provider: options.channel === 'whatsapp_ready' ? 'manual_external' : 'internal',
                provider_conversation_id: null,
                provider_error: options.channel === 'whatsapp_ready' ? 'WhatsApp não configurado; use o fallback externo.' : null,
                created_at: timestamp,
                updated_at: timestamp,
            });
            currentConversationId = conversation.id;
        }
        return insertRemote<ChatMessage>('chat_messages', {
            id: makeId(),
            conversation_id: currentConversationId,
            sender: 'franchise',
            body,
            franchise_id: franchiseId,
            client_id: null,
            project_id: null,
            application_id: null,
            provider: options.channel === 'whatsapp_ready' ? 'manual_external' : 'internal',
            provider_conversation_id: null,
            provider_message_id: null,
            direction: 'outbound',
            delivery_status: 'queued',
            sent_at: null,
            delivered_at: null,
            read_at: null,
            error_message: options.channel === 'whatsapp_ready' ? 'Envio realizado fora do sistema; entrega não confirmada.' : null,
            created_at: timestamp,
        });
    })();
}
export function markTaskDone(id: string) {
    return updateRemote<NotificationTask>('notification_tasks', id, { status: 'done' });
}
export async function getPublicBriefing(token: string) {
    const { data, error } = await supabase!.rpc('get_public_briefing', {
        access_token: token,
    });
    if (error)
        throw error;
    return data ? normalizeBriefing(data as JobBriefing) : null;
}
export async function getClientPortal(token: string) {
    const { data, error } = await supabase!.rpc('get_client_portal', {
        access_token: token,
    });
    if (error)
        throw error;
    if (!data?.project)
        return null;
    return data as {
        project: FranchiseProject;
        company: Company | null;
        job: Job | null;
        finalists: FinalistRecord[];
        schedules: ClientInterviewSchedule[];
        decisions: HiringDecision[];
        nps: NpsResponse | null;
        applications: Application[];
        can_submit_nps: boolean;
        client_decision_status: ClientDecisionStatus;
        decision_finalized_at: string | null;
    };
}
export async function getCandidateConfirmation(token: string) {
    const { data, error } = await supabase!.rpc('get_candidate_confirmation', {
        access_token: token,
    });
    if (error)
        throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.schedule)
        return null;
    return {
        schedule: row.schedule as ClientInterviewSchedule,
        application: (row.application as Application | null) ?? null,
        project: (row.project as FranchiseProject | null) ?? null,
        company: (row.company as Company | null) ?? null,
    };
}
export function getWorkspaceAlerts(data: FranchiseWorkspaceData) {
    const now = new Date();
    const inactiveSince = addDays(now, -180);
    const inactiveClients = data.companies
        .map((company) => {
        const lastActivity = data.clientLastHiringActivities.find((item) => item.client_id === company.id)?.activity_reference_at;
        return { company, lastActivity };
    })
        .filter((item) => item.lastActivity && isBefore(parseISO(item.lastActivity), inactiveSince));
    return [
        ...data.opportunities
            .filter((item) => item.stage !== 'won' && item.stage !== 'lost' && item.next_follow_up && isBefore(parseISO(item.next_follow_up), now))
            .map((item) => ({ id: item.id, title: `Lead sem follow-up: ${item.company_name}`, type: 'lead_followup' })),
        ...data.briefings
            .filter((item) => ['sent', 'in_progress', 'needs_adjustment'].includes(item.status))
            .map((item) => ({ id: item.id, title: 'Levantamento da vaga pendente de preenchimento ou aprovação', type: 'briefing' })),
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
        ...inactiveClients.map(({ company }) => ({
            id: company.id,
            title: `Cliente sem nova contratacao ha 6 meses: ${company.name}`,
            type: 'client_inactive',
        })),
    ];
}
export function getFallbackFranchise(): Franchise | null {
    return null;
}
