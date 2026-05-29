import { formatISO, subDays } from 'date-fns';
import { getLocalStore, makeId, setLocalStore } from './localDb';
import { hasSupabaseConfig, supabase } from './supabase';
import type {
  Application,
  ApplicationStatus,
  Company,
  CompanyPageStatus,
  CompanyUserAccess,
  DashboardStats,
  Job,
  JobContractType,
  JobModality,
  JobStatus,
  Profile,
  SiteContent,
} from '../types';

export type UserPermissionInput = {
  can_edit_company_page: boolean;
  can_manage_jobs: boolean;
  can_view_applications: boolean;
  can_download_resumes: boolean;
};

export type CreateAdminUserInput = {
  fullName: string;
  email: string;
  password?: string;
  role: 'redde_admin' | 'company_admin' | 'company_recruiter';
  companyId?: string;
  permissions: UserPermissionInput;
};

type JobRow = Omit<Job, 'company'> & {
  companies?: Job['company'] | null;
};

type ApplicationRow = Omit<Application, 'company' | 'job'> & {
  companies?: Application['company'] | null;
  jobs?: Application['job'] | null;
};

type CompanyFilters = {
  search?: string;
  city?: string;
  segment?: string;
  status?: CompanyPageStatus | 'all';
  publishedOnly?: boolean;
  featuredOnly?: boolean;
};

type JobFilters = {
  search?: string;
  city?: string;
  modality?: JobModality | 'all';
  contractType?: JobContractType | 'all';
  status?: JobStatus | 'all';
  companyId?: string;
  openOnly?: boolean;
  limit?: number;
};

type ApplicationFilters = {
  companyId?: string;
  jobId?: string;
  status?: ApplicationStatus | 'all';
};

function normalizeBrandText(value: string | null) {
  return value
    ?.replaceAll('Redde People Jobs', 'People Jobs')
    .replaceAll('Redde People', 'People Jobs')
    .replaceAll('reddepeople.com.br', 'peoplejobs.com.br') ?? null;
}

function normalizeSiteContent(content: SiteContent | null): SiteContent | null {
  if (!content) return null;

  return {
    ...content,
    title: normalizeBrandText(content.title) ?? content.title,
    subtitle: normalizeBrandText(content.subtitle),
    body: normalizeBrandText(content.body),
    button_label: normalizeBrandText(content.button_label),
    button_url: normalizeBrandText(content.button_url),
  };
}

function normalizeJob(row: JobRow): Job {
  const { companies, ...job } = row;
  return {
    ...job,
    company: companies ?? undefined,
  };
}

function normalizeApplication(row: ApplicationRow): Application {
  const { companies, jobs, ...application } = row;
  return {
    ...application,
    company: companies ?? undefined,
    job: jobs ?? undefined,
  };
}

function withCompany(job: Job, companies: Company[]): Job {
  return {
    ...job,
    company: job.company ?? companies.find((company) => company.id === job.company_id),
  };
}

function filterCompanies(companies: Company[], filters: CompanyFilters = {}) {
  const search = filters.search?.trim().toLowerCase();

  return companies
    .filter((company) => !filters.publishedOnly || company.page_status === 'published')
    .filter((company) => !filters.featuredOnly || company.is_featured)
    .filter((company) => !filters.status || filters.status === 'all' || company.page_status === filters.status)
    .filter((company) => !search || company.name.toLowerCase().includes(search))
    .filter((company) => !filters.city || company.city?.toLowerCase().includes(filters.city.toLowerCase()))
    .filter(
      (company) =>
        !filters.segment || company.segment?.toLowerCase().includes(filters.segment.toLowerCase()),
    )
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.name.localeCompare(b.name));
}

function filterJobs(jobs: Job[], filters: JobFilters = {}) {
  const store = getLocalStore();
  const search = filters.search?.trim().toLowerCase();

  return jobs
    .map((job) => withCompany(job, store.companies))
    .filter((job) => !filters.openOnly || job.status === 'open')
    .filter((job) => !filters.companyId || job.company_id === filters.companyId)
    .filter((job) => !filters.status || filters.status === 'all' || job.status === filters.status)
    .filter((job) => !filters.city || job.city?.toLowerCase().includes(filters.city.toLowerCase()))
    .filter((job) => !filters.modality || filters.modality === 'all' || job.modality === filters.modality)
    .filter(
      (job) => !filters.contractType || filters.contractType === 'all' || job.contract_type === filters.contractType,
    )
    .filter((job) => {
      if (!search) return true;
      return (
        job.title.toLowerCase().includes(search) ||
        job.company?.name.toLowerCase().includes(search) ||
        job.short_description?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, filters.limit ?? Number.POSITIVE_INFINITY);
}

export async function listCompanies(filters: CompanyFilters = {}) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase.from('companies').select('*').order('created_at', { ascending: false });

    if (filters.publishedOnly) query = query.eq('page_status', 'published');
    if (filters.featuredOnly) query = query.eq('is_featured', true);
    if (filters.status && filters.status !== 'all') query = query.eq('page_status', filters.status);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.segment) query = query.ilike('segment', `%${filters.segment}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data as Company[];
  }

  return filterCompanies(getLocalStore().companies, filters);
}

export async function getCompanyBySlug(slug: string, publishedOnly = true) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase.from('companies').select('*').eq('slug', slug);
    if (publishedOnly) query = query.eq('page_status', 'published');

    const { data, error } = await query.single();
    if (error) throw error;
    return data as Company;
  }

  return (
    getLocalStore().companies.find(
      (company) => company.slug === slug && (!publishedOnly || company.page_status === 'published'),
    ) ?? null
  );
}

export async function getCompanyById(id: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Company;
  }

  return getLocalStore().companies.find((company) => company.id === id) ?? null;
}

export async function upsertCompany(values: Partial<Company> & Pick<Company, 'name' | 'slug'>) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const payload = {
      ...values,
      updated_at: timestamp,
    };
    const { data, error } = values.id
      ? await supabase.from('companies').update(payload).eq('id', values.id).select('*').single()
      : await supabase.from('companies').insert(payload).select('*').single();

    if (error) throw error;
    return data as Company;
  }

  const store = getLocalStore();
  const existingIndex = values.id ? store.companies.findIndex((company) => company.id === values.id) : -1;
  const nextCompany: Company = {
    id: values.id ?? makeId(),
    name: values.name,
    slug: values.slug,
    logo_url: values.logo_url ?? null,
    cover_image_url: values.cover_image_url ?? null,
    segment: values.segment ?? null,
    city: values.city ?? null,
    state: values.state ?? 'MA',
    employees_range: values.employees_range ?? null,
    website_url: values.website_url ?? null,
    instagram_url: values.instagram_url ?? null,
    linkedin_url: values.linkedin_url ?? null,
    short_description: values.short_description ?? null,
    about_text: values.about_text ?? null,
    why_work_here: values.why_work_here ?? null,
    culture_text: values.culture_text ?? null,
    page_status: values.page_status ?? 'draft',
    is_featured: values.is_featured ?? false,
    created_by: values.created_by ?? null,
    created_at: values.created_at ?? timestamp,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) store.companies[existingIndex] = nextCompany;
  else store.companies.unshift(nextCompany);

  setLocalStore(store);
  return nextCompany;
}

export async function updateCompanyImages(
  companyId: string,
  values: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>>,
) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...values, updated_at: timestamp })
      .eq('id', companyId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Company;
  }

  const store = getLocalStore();
  const index = store.companies.findIndex((company) => company.id === companyId);
  if (index < 0) throw new Error('Empresa não encontrada.');

  store.companies[index] = {
    ...store.companies[index],
    ...values,
    updated_at: timestamp,
  };
  setLocalStore(store);
  return store.companies[index];
}

export async function listJobs(filters: JobFilters = {}) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase
      .from('jobs')
      .select(
        `
          *,
          companies (
            id,
            name,
            slug,
            logo_url,
            segment,
            city,
            state,
            about_text
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (filters.openOnly) query = query.eq('status', 'open');
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.modality && filters.modality !== 'all') query = query.eq('modality', filters.modality);
    if (filters.contractType && filters.contractType !== 'all') {
      query = query.eq('contract_type', filters.contractType);
    }
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data as JobRow[]).map(normalizeJob);
  }

  return filterJobs(getLocalStore().jobs, filters);
}

export async function getJobByCompanyAndSlug(companySlug: string, jobSlug: string) {
  if (hasSupabaseConfig && supabase) {
    const company = await getCompanyBySlug(companySlug, true);
    if (!company) return null;

    const { data, error } = await supabase
      .from('jobs')
      .select(
        `
          *,
          companies (
            id,
            name,
            slug,
            logo_url,
            segment,
            city,
            state,
            about_text
          )
        `,
      )
      .eq('company_id', company.id)
      .eq('slug', jobSlug)
      .eq('status', 'open')
      .single();

    if (error) throw error;
    return normalizeJob(data as JobRow);
  }

  const store = getLocalStore();
  const company = store.companies.find((item) => item.slug === companySlug && item.page_status === 'published');
  if (!company) return null;
  const job = store.jobs.find((item) => item.company_id === company.id && item.slug === jobSlug && item.status === 'open');
  return job ? withCompany(job, store.companies) : null;
}

export async function upsertJob(values: Partial<Job> & Pick<Job, 'company_id' | 'title' | 'slug' | 'description'>) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const payload = {
      ...values,
      updated_at: timestamp,
    };
    const { data, error } = values.id
      ? await supabase.from('jobs').update(payload).eq('id', values.id).select('*').single()
      : await supabase.from('jobs').insert(payload).select('*').single();

    if (error) throw error;
    return data as Job;
  }

  const store = getLocalStore();
  const existingIndex = values.id ? store.jobs.findIndex((job) => job.id === values.id) : -1;
  const nextJob: Job = {
    id: values.id ?? makeId(),
    company_id: values.company_id,
    title: values.title,
    slug: values.slug,
    short_description: values.short_description ?? null,
    description: values.description,
    responsibilities: values.responsibilities ?? null,
    requirements: values.requirements ?? null,
    benefits: values.benefits ?? null,
    salary_range: values.salary_range ?? null,
    seniority: values.seniority ?? null,
    education_level: values.education_level ?? null,
    work_schedule: values.work_schedule ?? null,
    about_company: values.about_company ?? null,
    city: values.city ?? null,
    state: values.state ?? 'MA',
    modality: values.modality ?? 'presencial',
    contract_type: values.contract_type ?? 'clt',
    status: values.status ?? 'draft',
    is_featured: values.is_featured ?? false,
    application_deadline: values.application_deadline ?? null,
    created_by: values.created_by ?? null,
    created_at: values.created_at ?? timestamp,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) store.jobs[existingIndex] = nextJob;
  else store.jobs.unshift(nextJob);

  setLocalStore(store);
  return withCompany(nextJob, store.companies);
}

export async function deleteJob(jobId: string) {
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) throw error;
    return;
  }

  const store = getLocalStore();
  store.jobs = store.jobs.filter((job) => job.id !== jobId);
  store.applications = store.applications.filter((application) => application.job_id !== jobId);
  setLocalStore(store);
}

export async function listApplications(filters: ApplicationFilters = {}) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase
      .from('applications')
      .select(
        `
          *,
          companies (
            id,
            name,
            slug
          ),
          jobs (
            id,
            title,
            slug
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    if (filters.jobId) query = query.eq('job_id', filters.jobId);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ApplicationRow[]).map(normalizeApplication);
  }

  const store = getLocalStore();
  return store.applications
    .map((application) => ({
      ...application,
      company: application.company ?? store.companies.find((company) => company.id === application.company_id),
      job: application.job ?? store.jobs.find((job) => job.id === application.job_id),
    }))
    .filter((application) => !filters.companyId || application.company_id === filters.companyId)
    .filter((application) => !filters.jobId || application.job_id === filters.jobId)
    .filter((application) => !filters.status || filters.status === 'all' || application.status === filters.status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createApplication(
  values: Pick<
    Application,
    | 'job_id'
    | 'company_id'
    | 'candidate_name'
    | 'candidate_email'
    | 'candidate_phone'
    | 'candidate_city'
    | 'linkedin_url'
    | 'portfolio_url'
    | 'salary_expectation'
    | 'availability'
    | 'message'
    | 'resume_file_path'
    | 'lgpd_consent'
  >,
) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('applications').insert(values).select('*').single();
    if (error) throw error;
    return data as Application;
  }

  const store = getLocalStore();
  const job = store.jobs.find((item) => item.id === values.job_id);
  if (!job || job.status !== 'open') {
    throw new Error('Esta vaga não está aberta para candidatura.');
  }

  const timestamp = new Date().toISOString();
  const application: Application = {
    id: makeId(),
    ...values,
    status: 'novo',
    source: 'portal_publico',
    created_at: timestamp,
    updated_at: timestamp,
    job,
    company: store.companies.find((company) => company.id === values.company_id),
  };

  store.applications.unshift(application);
  setLocalStore(store);
  return application;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: timestamp })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Application;
  }

  const store = getLocalStore();
  const index = store.applications.findIndex((application) => application.id === id);
  if (index < 0) throw new Error('Candidatura não encontrada.');

  store.applications[index] = {
    ...store.applications[index],
    status,
    updated_at: timestamp,
  };
  setLocalStore(store);
  return store.applications[index];
}

export async function listProfiles() {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Profile[];
  }

  return getLocalStore().profiles;
}

export async function listCompanyAccess() {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('company_user_access').select('*');
    if (error) throw error;
    return data as CompanyUserAccess[];
  }

  return getLocalStore().access;
}

export async function createAdminUser(values: CreateAdminUserInput) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.functions.invoke('create-company-user', {
      body: {
        fullName: values.fullName,
        email: values.email,
        password: values.password || undefined,
        role: values.role,
        companyId: values.companyId || undefined,
        permissions: values.permissions,
      },
    });

    if (error) throw error;
    return data as { userId: string; email: string; temporaryPassword?: string };
  }

  const store = getLocalStore();
  const timestamp = new Date().toISOString();
  const existing = store.profiles.find((profile) => profile.email.toLowerCase() === values.email.toLowerCase());

  if (existing) {
    throw new Error('Já existe um usuário com este e-mail.');
  }

  const profile: Profile = {
    id: makeId(),
    full_name: values.fullName,
    email: values.email,
    role: values.role,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  };

  store.profiles.unshift(profile);

  if (values.companyId && values.role !== 'redde_admin') {
    store.access.unshift({
      id: makeId(),
      user_id: profile.id,
      company_id: values.companyId,
      ...values.permissions,
      created_at: timestamp,
    });
  }

  setLocalStore(store);

  return {
    userId: profile.id,
    email: profile.email,
    temporaryPassword: values.password || undefined,
  };
}

export async function assignCompanyAccess(
  userId: string,
  companyId: string,
  permissions: UserPermissionInput,
) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('company_user_access')
      .upsert(
        {
          user_id: userId,
          company_id: companyId,
          ...permissions,
        },
        { onConflict: 'user_id,company_id' },
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as CompanyUserAccess;
  }

  const store = getLocalStore();
  const timestamp = new Date().toISOString();
  const existingIndex = store.access.findIndex((item) => item.user_id === userId && item.company_id === companyId);
  const nextAccess: CompanyUserAccess = {
    id: existingIndex >= 0 ? store.access[existingIndex].id : makeId(),
    user_id: userId,
    company_id: companyId,
    ...permissions,
    created_at: existingIndex >= 0 ? store.access[existingIndex].created_at : timestamp,
  };

  if (existingIndex >= 0) store.access[existingIndex] = nextAccess;
  else store.access.unshift(nextAccess);

  setLocalStore(store);
  return nextAccess;
}

export async function updateCompanyAccess(
  accessId: string,
  permissions: UserPermissionInput,
) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('company_user_access')
      .update(permissions)
      .eq('id', accessId)
      .select('*')
      .single();

    if (error) throw error;
    return data as CompanyUserAccess;
  }

  const store = getLocalStore();
  const index = store.access.findIndex((item) => item.id === accessId);

  if (index < 0) throw new Error('Acesso não encontrado.');

  store.access[index] = {
    ...store.access[index],
    ...permissions,
  };
  setLocalStore(store);
  return store.access[index];
}

export async function getSiteContent(key: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('site_contents')
      .select('*')
      .eq('key', key)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return normalizeSiteContent(data as SiteContent | null);
  }

  return normalizeSiteContent(getLocalStore().siteContents.find((content) => content.key === key && content.is_active) ?? null);
}

export async function getDashboardStats(companyId?: string): Promise<DashboardStats> {
  const [companies, jobs, applications] = await Promise.all([
    listCompanies(companyId ? { publishedOnly: false } : {}),
    listJobs(companyId ? { companyId } : {}),
    listApplications(companyId ? { companyId } : {}),
  ]);

  const sevenDaysAgo = subDays(new Date(), 7);

  return {
    totalCompanies: companyId ? 1 : companies.length,
    publishedCompanies: companies.filter((company) => company.page_status === 'published').length,
    openJobs: jobs.filter((job) => job.status === 'open').length,
    totalApplications: applications.length,
    applicationsLast7Days: applications.filter((application) => application.created_at >= formatISO(sevenDaysAgo)).length,
  };
}

export async function deleteUser(userId: string) {
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });
    if (error) throw error;
    return;
  }

  const store = getLocalStore();
  store.profiles = store.profiles.filter((profile) => profile.id !== userId);
  store.access = store.access.filter((item) => item.user_id !== userId);
  setLocalStore(store);
}
