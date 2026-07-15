export type AppRole =
  | 'admin_master'
  | 'franqueado'
  | 'empresa_cliente'
  | 'candidato'
  | 'redde_super_admin'
  | 'redde_admin'
  | 'company_admin'
  | 'company_recruiter';

export type CompanyPageStatus = 'draft' | 'published' | 'archived';
export type FranchiseStatus = 'active' | 'inactive';
export type CompanyCommercialStatus = 'lead' | 'negotiation' | 'active_client' | 'inactive_client';
export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived';
export type JobModality = 'presencial' | 'hibrido' | 'remoto';
export type JobContractType = 'clt' | 'pj' | 'estagio' | 'temporario' | 'freelancer' | 'outro';
export type JobDistributionChannel = 'google_jobs' | 'indeed' | 'glassdoor' | 'infojobs';
export type JobDistributionStatus =
  | 'pending'
  | 'ready'
  | 'published'
  | 'failed'
  | 'removed'
  | 'manual_required';
export type ProcessStatus = 'draft' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type BillingType = 'fixed' | 'success_fee' | 'monthly' | 'other';
export type BillingStatus = 'not_started' | 'pending' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
export type ApplicationStage =
  | 'qualificacao'
  | 'testes'
  | 'entrevista'
  | 'finalistas'
  | 'contratacao'
  | 'desclassificados';
export type ApplicationStatus =
  | 'novo'
  | 'triagem'
  | 'em_analise'
  | 'selecionado'
  | 'entrevista'
  | 'teste'
  | 'encaminhado_cliente'
  | 'aprovado'
  | 'reprovado'
  | 'contratado'
  | 'banco_talentos';

export type ResumeAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ResumeAnalysis = {
  professional_summary: string;
  skills: string[];
  education: CandidateEducation[];
  experiences: CandidateExperience[];
  languages: string[];
  certifications: string[];
  total_experience_months: number;
  current_role: string;
  location: string;
  salary_expectation_found: string;
  availability_found: string;
  evidence: string[];
};

export type RankingDetails = {
  overall_score: number;
  mandatory_requirements_score: number;
  experience_score: number;
  technical_skills_score: number;
  education_score: number;
  location_score: number;
  availability_score: number;
  salary_score: number;
  behavioral_indicators_score: number;
  met_requirements: string[];
  missing_requirements: string[];
  strengths: string[];
  risks: string[];
  evidence: string[];
  summary: string;
};

export type ClientDecisionStatus = 'not_started' | 'in_progress' | 'finalized' | 'reopen_required';

export type Franchise = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  document: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state: string | null;
  status: FranchiseStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type FranchiseSummary = Pick<Franchise, 'id' | 'name' | 'slug' | 'status'>;

export type Company = {
  id: string;
  franchise_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  employees_range: string | null;
  website_url: string | null;
  legal_name: string | null;
  same_as_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  short_description: string | null;
  about_text: string | null;
  why_work_here: string | null;
  culture_text: string | null;
  commercial_status: CompanyCommercialStatus;
  page_status: CompanyPageStatus;
  is_featured: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  franchise?: FranchiseSummary;
};

export type CompanySummary = Pick<
  Company,
  | 'id'
  | 'name'
  | 'slug'
  | 'logo_url'
  | 'segment'
  | 'city'
  | 'state'
  | 'about_text'
  | 'website_url'
  | 'legal_name'
  | 'same_as_url'
  | 'franchise_id'
>;

export type Job = {
  id: string;
  franchise_id: string | null;
  company_id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string;
  about_job: string | null;
  responsibilities: string | null;
  requirements: string | null;
  desirable_requirements: string | null;
  benefits: string | null;
  salary_range: string | null;
  seniority: string | null;
  education_level: string | null;
  work_schedule: string | null;
  about_company: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  modality: JobModality;
  contract_type: JobContractType;
  status: JobStatus;
  is_featured: boolean;
  application_deadline: string | null;
  published_at: string | null;
  expires_at: string | null;
  distribution_google_enabled: boolean;
  distribution_indeed_enabled: boolean;
  distribution_glassdoor_enabled: boolean;
  distribution_infojobs_enabled: boolean;
  external_apply_url: string | null;
  direct_apply: boolean;
  country: string | null;
  street_address: string | null;
  postal_code: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_unit: string | null;
  seo_title: string | null;
  seo_description: string | null;
  responsible_name: string | null;
  open_positions: number;
  approved_positions: number;
  process_status: ProcessStatus;
  internal_notes: string | null;
  billing_amount: number | null;
  billing_type: BillingType;
  billing_status: BillingStatus;
  billing_due_date: string | null;
  finance_responsible: string | null;
  franchise_commission: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company?: CompanySummary;
};

export type JobDistribution = {
  id: string;
  job_id: string;
  channel: JobDistributionChannel;
  status: JobDistributionStatus;
  external_url: string | null;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  franchise_id: string | null;
  job_id: string;
  company_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  candidate_city: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  salary_expectation: string | null;
  availability: string | null;
  message: string | null;
  resume_file_path: string;
  status: ApplicationStatus;
  stage: ApplicationStage;
  kanban_order: number;
  match_score: number | null;
  adhesion_score: number | null;
  is_new: boolean;
  rejection_reason: string | null;
  tags: string[];
  interview_scheduled_at: string | null;
  recruiter_opinion: string | null;
  professional_summary: string | null;
  skills: string[];
  education: CandidateEducation[];
  experiences: CandidateExperience[];
  resume_analysis_status: ResumeAnalysisStatus;
  resume_analysis: ResumeAnalysis;
  resume_analysis_error: string | null;
  resume_analyzed_at: string | null;
  ai_match_score: number | null;
  ranking_details: RankingDetails;
  ranking_generated_at: string | null;
  resume_analysis_waived_at: string | null;
  resume_analysis_waiver_reason: string | null;
  resume_analysis_waived_by: string | null;
  stage_entered_at: string;
  stage_sla_due_at: string | null;
  last_stage_changed_by: string | null;
  hired_at: string | null;
  current_owner_id: string | null;
  lgpd_consent: boolean;
  source: string | null;
  tracking_token?: string | null;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, 'id' | 'title' | 'slug'>;
  company?: Pick<Company, 'id' | 'name' | 'slug'>;
};

export type ApplicationTrackingEvent = {
  stage: ApplicationStage;
  created_at: string;
};

export type PublicApplicationTracking = {
  candidate_first_name: string;
  job_title: string;
  company_name: string;
  company_slug: string;
  job_slug: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
  timeline: ApplicationTrackingEvent[];
};

export type CompanyResponseMetric = {
  company_id: string;
  total_applications: number;
  completed_applications: number;
  response_rate: number;
  average_response_days: number | null;
  last_process_completed_at: string | null;
};

export type CandidateEducation = {
  course: string;
  institution: string;
  level?: string | null;
  status?: string | null;
  start_year?: number | null;
  end_year?: number | null;
};

export type CandidateExperience = {
  role: string;
  company: string;
  start_date?: string | null;
  end_date?: string | null;
  current?: boolean;
  description?: string | null;
};

export type ApplicationNote = {
  id: string;
  application_id: string;
  note: string;
  created_by: string;
  created_at: string;
  visibility: 'internal' | 'shared';
  author?: Pick<Profile, 'id' | 'full_name'>;
};

export type ApplicationStageHistory = {
  id: string;
  application_id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  moved_by: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  from_order: number | null;
  to_order: number | null;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'full_name'>;
};

export type JobTestType = 'manual' | 'external_link' | 'form' | 'file_upload' | 'score_only';
export type ApplicationTestStatus =
  | 'pending'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'failed'
  | 'waived'
  | 'cancelled';

export type JobTest = {
  id: string;
  franchise_id: string;
  job_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  test_type: JobTestType;
  provider: string | null;
  external_url: string | null;
  passing_score: number | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationTestAssignment = {
  id: string;
  franchise_id: string;
  job_id: string;
  application_id: string;
  job_test_id: string;
  status: ApplicationTestStatus;
  score: number | null;
  max_score: number | null;
  result: string | null;
  notes: string | null;
  external_result_url: string | null;
  attachment_url: string | null;
  sent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  waived_at: string | null;
  waived_by: string | null;
  waiver_reason: string | null;
  created_at: string;
  updated_at: string;
  job_test?: JobTest;
};

export type ApplicationDisqualification = {
  id: string;
  franchise_id: string | null;
  job_id: string;
  application_id: string;
  from_stage: ApplicationStage;
  reason: string;
  details: string | null;
  disqualified_by: string | null;
  disqualified_at: string;
  restored_by: string | null;
  restored_at: string | null;
  restore_reason: string | null;
  created_at: string;
  application?: Application;
  actor?: Pick<Profile, 'id' | 'full_name'>;
};

export type AdmissionStatus =
  | 'approved'
  | 'awaiting_documents'
  | 'scheduled_to_start'
  | 'started'
  | 'withdrawn'
  | 'no_show'
  | 'cancelled';

export type ApplicationHire = {
  id: string;
  franchise_id: string | null;
  project_id: string | null;
  job_id: string;
  company_id: string;
  application_id: string;
  hiring_decision_id: string | null;
  approved_at: string | null;
  expected_start_date: string | null;
  actual_start_date: string | null;
  internal_responsible_name: string | null;
  internal_responsible_email: string | null;
  internal_responsible_phone: string | null;
  admission_status: AdmissionStatus;
  required_documents: string | null;
  admission_notes: string | null;
  withdrawal_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  application?: Application;
};

export type JobStageSlaSetting = {
  id: string;
  franchise_id: string | null;
  job_id: string;
  stage: Exclude<ApplicationStage, 'desclassificados'>;
  sla_days: number;
  warning_days: number;
  created_at: string;
  updated_at: string;
};

export type CandidateScreening = {
  id: string;
  franchise_id: string;
  project_id: string | null;
  job_id: string;
  application_id: string;
  status: 'draft' | 'completed' | 'rejected';
  answers: Record<string, unknown>;
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
  project_id: string | null;
  job_id: string;
  application_id: string;
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  scheduled_at: string | null;
  interviewed_at: string | null;
  interviewer_id: string | null;
  template_snapshot: Record<string, unknown>;
  questions_answers: unknown[];
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

export type ProcessFilters = {
  search?: string;
  companyId?: string;
  processStatus?: ProcessStatus;
  responsible?: string;
  city?: string;
  state?: string;
  contractType?: JobContractType;
  deadline?: 'open' | 'overdue' | 'next_7_days';
  hasNewCandidates?: boolean;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type CandidateFilters = {
  search?: string;
  stages?: ApplicationStage[];
  scoreMin?: number;
  scoreMax?: number;
  resumeAnalysisStatus?: ResumeAnalysisStatus;
  city?: string;
  source?: string;
  tags?: string[];
  newOnly?: boolean;
  appliedFrom?: string;
  appliedTo?: string;
  sort?: 'score_desc' | 'score_asc' | 'newest' | 'oldest' | 'stale' | 'name';
};

export type MoveApplicationStagePayload = {
  applicationId: string;
  targetStage: ApplicationStage;
  targetOrder: number;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReorderApplicationPayload = {
  id: string;
  order: number;
};

export type BulkMutationResult = {
  processed: number;
  completed: number;
  failed: { applicationId: string; reason: string }[];
};

export type CandidateWorkspace = {
  application: Application;
  screening: CandidateScreening | null;
  interview: InternalInterview | null;
  tests: ApplicationTestAssignment[];
  disqualifications: ApplicationDisqualification[];
  hire: ApplicationHire | null;
  history: ApplicationStageHistory[];
  notes: ApplicationNote[];
  finalist: {
    id: string;
    project_id: string;
    application_id: string;
    status: string;
    franchise_opinion: string | null;
    ai_report: string | null;
    ai_report_status: string;
    ai_report_payload: Record<string, unknown>;
    franchise_approved_at: string | null;
  } | null;
};

export type ProcessComment = {
  id: string;
  job_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<Profile, 'id' | 'full_name'>;
};

export type ProcessProjectLink = {
  id: string;
  franchise_id: string;
  client_id: string;
  job_id: string | null;
  title: string;
  stage: string;
};

export type ProcessDocument = {
  id: string;
  franchise_id: string;
  project_id: string | null;
  client_id: string | null;
  application_id: string | null;
  job_id: string;
  type: string | null;
  name: string;
  url: string | null;
  notes: string | null;
  created_at: string;
};

export type ProcessStageHistoryItem = ApplicationStageHistory & {
  application?: Pick<Application, 'id' | 'candidate_name' | 'job_id'>;
};

export type Profile = {
  id: string;
  franchise_id: string | null;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyUserAccess = {
  id: string;
  user_id: string;
  company_id: string;
  can_edit_company_page: boolean;
  can_manage_jobs: boolean;
  can_view_applications: boolean;
  can_download_resumes: boolean;
  created_by?: string | null;
  created_at: string;
};

export type SiteContent = {
  id: string;
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  button_label: string | null;
  button_url: string | null;
  is_active: boolean;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  totalCompanies: number;
  publishedCompanies: number;
  openJobs: number;
  totalApplications: number;
  applicationsLast7Days: number;
};

export type FranchiseDashboardStats = DashboardStats & {
  candidatesInScreening: number;
  candidatesForwarded: number;
  closedJobsThisMonth: number;
};

export type NetworkDashboardStats = DashboardStats & {
  totalFranchises: number;
  activeFranchises: number;
  closedJobsThisMonth: number;
};

export type FranchisePerformance = {
  franchise: Franchise;
  companies: number;
  openJobs: number;
  applications: number;
  forwardedCandidates: number;
};
