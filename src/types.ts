export type AppRole = 'redde_super_admin' | 'redde_admin' | 'company_admin' | 'company_recruiter';

export type CompanyPageStatus = 'draft' | 'published' | 'archived';
export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived';
export type JobModality = 'presencial' | 'hibrido' | 'remoto';
export type JobContractType = 'clt' | 'pj' | 'estagio' | 'temporario' | 'freelancer' | 'outro';
export type ApplicationStatus =
  | 'novo'
  | 'em_analise'
  | 'selecionado'
  | 'entrevista'
  | 'reprovado'
  | 'contratado';

export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  employees_range: string | null;
  website_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  short_description: string | null;
  about_text: string | null;
  why_work_here: string | null;
  culture_text: string | null;
  page_status: CompanyPageStatus;
  is_featured: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanySummary = Pick<Company, 'id' | 'name' | 'slug' | 'logo_url' | 'segment' | 'city' | 'state' | 'about_text'>;

export type Job = {
  id: string;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company?: CompanySummary;
};

export type Application = {
  id: string;
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
  lgpd_consent: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, 'id' | 'title' | 'slug'>;
  company?: Pick<Company, 'id' | 'name' | 'slug'>;
};

export type Profile = {
  id: string;
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
