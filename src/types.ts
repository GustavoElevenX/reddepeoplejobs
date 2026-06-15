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
  lgpd_consent: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, 'id' | 'title' | 'slug'>;
  company?: Pick<Company, 'id' | 'name' | 'slug'>;
};

export type ApplicationNote = {
  id: string;
  application_id: string;
  note: string;
  created_by: string;
  created_at: string;
  author?: Pick<Profile, 'id' | 'full_name'>;
};

export type ApplicationStageHistory = {
  id: string;
  application_id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  moved_by: string | null;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'full_name'>;
};

export type ProcessComment = {
  id: string;
  job_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<Profile, 'id' | 'full_name'>;
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
