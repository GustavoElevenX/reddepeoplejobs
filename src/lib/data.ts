import { formatISO, startOfMonth, subDays } from 'date-fns';
import { resolveApplicationStage } from './applicationStages';
import { getCurrentLocalProfileId, getLocalStore, makeId, setLocalStore } from './localDb';
import { hasSupabaseConfig, supabase } from './supabase';
import type {
  Application,
  ApplicationNote,
  ApplicationStage,
  ApplicationStageHistory,
  ApplicationStatus,
  Company,
  CompanyCommercialStatus,
  CompanyPageStatus,
  CompanyUserAccess,
  DashboardStats,
  Franchise,
  FranchiseDashboardStats,
  FranchisePerformance,
  FranchiseStatus,
  Job,
  JobContractType,
  JobDistribution,
  JobDistributionChannel,
  JobModality,
  JobStatus,
  NetworkDashboardStats,
  ProcessComment,
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
  role: 'admin_master' | 'franqueado' | 'empresa_cliente' | 'redde_admin' | 'company_admin' | 'company_recruiter';
  franchiseId?: string;
  companyId?: string;
  permissions: UserPermissionInput;
};

type JobRow = Omit<Job, 'company'> & {
  companies?: Job['company'] | null;
};

type CompanyRow = Omit<Company, 'franchise'> & {
  franchises?: Company['franchise'] | null;
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
  franchiseId?: string;
  commercialStatus?: CompanyCommercialStatus | 'all';
};

type JobFilters = {
  search?: string;
  city?: string;
  modality?: JobModality | 'all';
  contractType?: JobContractType | 'all';
  status?: JobStatus | 'all';
  companyId?: string;
  franchiseId?: string;
  openOnly?: boolean;
  limit?: number;
};

type ApplicationFilters = {
  franchiseId?: string;
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
    franchise_id: job.franchise_id ?? companies?.franchise_id ?? null,
    published_at: job.published_at ?? (job.status === 'open' ? job.created_at : null),
    expires_at: job.expires_at ?? job.application_deadline ?? null,
    distribution_google_enabled: job.distribution_google_enabled ?? true,
    distribution_indeed_enabled: job.distribution_indeed_enabled ?? false,
    distribution_glassdoor_enabled: job.distribution_glassdoor_enabled ?? false,
    distribution_infojobs_enabled: job.distribution_infojobs_enabled ?? false,
    external_apply_url: job.external_apply_url ?? null,
    direct_apply: job.direct_apply ?? true,
    country: job.country ?? 'BR',
    street_address: job.street_address ?? null,
    postal_code: job.postal_code ?? null,
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_currency: job.salary_currency ?? 'BRL',
    salary_unit: job.salary_unit ?? 'MONTH',
    seo_title: job.seo_title ?? null,
    seo_description: job.seo_description ?? null,
    responsible_name: job.responsible_name ?? null,
    open_positions: job.open_positions ?? 1,
    approved_positions: job.approved_positions ?? 0,
    process_status: job.process_status ?? (job.status === 'closed' ? 'completed' : 'in_progress'),
    internal_notes: job.internal_notes ?? null,
    billing_amount: job.billing_amount ?? null,
    billing_type: job.billing_type ?? 'fixed',
    billing_status: job.billing_status ?? 'not_started',
    billing_due_date: job.billing_due_date ?? null,
    finance_responsible: job.finance_responsible ?? null,
    franchise_commission: job.franchise_commission ?? null,
    company: companies ?? undefined,
  };
}

function normalizeCompany(row: Company | CompanyRow): Company {
  const { franchises, ...company } = row as CompanyRow;
  return {
    ...company,
    franchise_id: company.franchise_id ?? null,
    commercial_status: company.commercial_status ?? 'active_client',
    legal_name: company.legal_name ?? null,
    same_as_url: company.same_as_url ?? null,
    franchise: franchises ?? ('franchise' in row ? row.franchise : undefined),
  };
}

function normalizeApplication(row: ApplicationRow): Application {
  const { companies, jobs, ...application } = row;
  return {
    ...application,
    stage: resolveApplicationStage(application),
    kanban_order: application.kanban_order ?? 0,
    match_score: application.match_score ?? null,
    adhesion_score: application.adhesion_score ?? null,
    is_new: application.is_new ?? application.status === 'novo',
    rejection_reason: application.rejection_reason ?? null,
    tags: application.tags ?? [],
    interview_scheduled_at: application.interview_scheduled_at ?? null,
    recruiter_opinion: application.recruiter_opinion ?? null,
    professional_summary: application.professional_summary ?? null,
    skills: application.skills ?? [],
    education: application.education ?? [],
    experiences: application.experiences ?? [],
    company: companies ?? undefined,
    job: jobs ?? undefined,
  };
}

function withCompany(job: Job, companies: Company[]): Job {
  return {
    ...job,
    company: companies.find((company) => company.id === job.company_id) ?? job.company,
  };
}

function filterCompanies(companies: Company[], filters: CompanyFilters = {}) {
  const franchises = getLocalStore().franchises;
  const search = filters.search?.trim().toLowerCase();

  return companies
    .filter((company) => !filters.publishedOnly || company.page_status === 'published')
    .filter(
      (company) =>
        !filters.publishedOnly ||
        franchises.some((franchise) => franchise.id === company.franchise_id && franchise.status === 'active'),
    )
    .filter((company) => !filters.featuredOnly || company.is_featured)
    .filter((company) => !filters.franchiseId || company.franchise_id === filters.franchiseId)
    .filter(
      (company) =>
        !filters.commercialStatus ||
        filters.commercialStatus === 'all' ||
        company.commercial_status === filters.commercialStatus,
    )
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
    .filter(
      (job) =>
        !filters.openOnly ||
        (store.companies.some(
          (company) => company.id === job.company_id && company.page_status === 'published',
        ) &&
          store.franchises.some(
            (franchise) => franchise.id === job.franchise_id && franchise.status === 'active',
          )),
    )
    .filter((job) => !filters.franchiseId || job.franchise_id === filters.franchiseId)
    .filter((job) => !filters.companyId || job.company_id === filters.companyId)
    .filter((job) => !filters.status || filters.status === 'all' || job.status === filters.status)
    .filter(
      (job) =>
        !filters.city ||
        job.city?.toLowerCase().includes(filters.city.toLowerCase()) ||
        job.neighborhood?.toLowerCase().includes(filters.city.toLowerCase()),
    )
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

export async function listFranchises(filters: { status?: FranchiseStatus | 'all'; search?: string } = {}) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase.from('franchises').select('*').order('name');
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data as Franchise[];
  }

  const search = filters.search?.trim().toLowerCase();
  return getLocalStore()
    .franchises.filter((franchise) => !filters.status || filters.status === 'all' || franchise.status === filters.status)
    .filter((franchise) => !search || franchise.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFranchiseById(id: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('franchises').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Franchise;
  }

  return getLocalStore().franchises.find((franchise) => franchise.id === id) ?? null;
}

export async function upsertFranchise(
  values: Partial<Franchise> & Pick<Franchise, 'name' | 'slug'>,
) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const payload = { ...values, updated_at: timestamp };
    const { data, error } = values.id
      ? await supabase.from('franchises').update(payload).eq('id', values.id).select('*').single()
      : await supabase.from('franchises').insert(payload).select('*').single();
    if (error) throw error;
    return data as Franchise;
  }

  const store = getLocalStore();
  const existingIndex = values.id
    ? store.franchises.findIndex((franchise) => franchise.id === values.id)
    : -1;
  const franchise: Franchise = {
    id: values.id ?? makeId(),
    name: values.name,
    slug: values.slug,
    legal_name: values.legal_name ?? null,
    document: values.document ?? null,
    contact_name: values.contact_name ?? null,
    contact_email: values.contact_email ?? null,
    contact_phone: values.contact_phone ?? null,
    city: values.city ?? null,
    state: values.state ?? 'MA',
    status: values.status ?? 'active',
    created_by: values.created_by ?? null,
    created_at: values.created_at ?? timestamp,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) store.franchises[existingIndex] = franchise;
  else store.franchises.unshift(franchise);
  setLocalStore(store);
  return franchise;
}

export async function listCompanies(filters: CompanyFilters = {}) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase
      .from('companies')
      .select('*, franchises(id, name, slug, status)')
      .order('created_at', { ascending: false });

    if (filters.publishedOnly) query = query.eq('page_status', 'published');
    if (filters.featuredOnly) query = query.eq('is_featured', true);
    if (filters.franchiseId) query = query.eq('franchise_id', filters.franchiseId);
    if (filters.commercialStatus && filters.commercialStatus !== 'all') {
      query = query.eq('commercial_status', filters.commercialStatus);
    }
    if (filters.status && filters.status !== 'all') query = query.eq('page_status', filters.status);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.city) query = query.or(`city.ilike.%${filters.city}%,neighborhood.ilike.%${filters.city}%`);
    if (filters.segment) query = query.ilike('segment', `%${filters.segment}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data as CompanyRow[]).map(normalizeCompany);
  }

  return filterCompanies(getLocalStore().companies, filters);
}

export async function getCompanyBySlug(slug: string, publishedOnly = true) {
  if (hasSupabaseConfig && supabase) {
    let query = supabase
      .from('companies')
      .select('*, franchises(id, name, slug, status)')
      .eq('slug', slug);
    if (publishedOnly) query = query.eq('page_status', 'published');

    const { data, error } = await query.single();
    if (error) throw error;
    return normalizeCompany(data as Company);
  }

  const store = getLocalStore();
  return (
    store.companies.find(
      (company) =>
        company.slug === slug &&
        (!publishedOnly ||
          (company.page_status === 'published' &&
            store.franchises.some(
              (franchise) => franchise.id === company.franchise_id && franchise.status === 'active',
            ))),
    ) ?? null
  );
}

export async function getCompanyById(id: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('companies')
      .select('*, franchises(id, name, slug, status)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return normalizeCompany(data as Company);
  }

  return getLocalStore().companies.find((company) => company.id === id) ?? null;
}

export async function upsertCompany(values: Partial<Company> & Pick<Company, 'name' | 'slug'>) {
  const timestamp = new Date().toISOString();
  const companyValues = { ...values };
  delete companyValues.franchise;

  if (hasSupabaseConfig && supabase) {
    const payload = {
      ...companyValues,
      updated_at: timestamp,
    };
    const { data, error } = values.id
      ? await supabase.from('companies').update(payload).eq('id', values.id).select('*').single()
      : await supabase.from('companies').insert(payload).select('*').single();

    if (error) throw error;
    return normalizeCompany(data as Company);
  }

  const store = getLocalStore();
  const existingIndex = values.id ? store.companies.findIndex((company) => company.id === values.id) : -1;
  const nextCompany: Company = {
    id: values.id ?? makeId(),
    franchise_id: values.franchise_id ?? null,
    name: values.name,
    slug: values.slug,
    logo_url: values.logo_url ?? null,
    cover_image_url: values.cover_image_url ?? null,
    segment: values.segment ?? null,
    city: values.city ?? null,
    state: values.state ?? 'MA',
    employees_range: values.employees_range ?? null,
    website_url: values.website_url ?? null,
    legal_name: values.legal_name ?? null,
    same_as_url: values.same_as_url ?? null,
    instagram_url: values.instagram_url ?? null,
    linkedin_url: values.linkedin_url ?? null,
    short_description: values.short_description ?? null,
    about_text: values.about_text ?? null,
    why_work_here: values.why_work_here ?? null,
    culture_text: values.culture_text ?? null,
    commercial_status: values.commercial_status ?? 'active_client',
    page_status: values.page_status ?? 'draft',
    is_featured: values.is_featured ?? false,
    created_by: values.created_by ?? null,
    created_at: values.created_at ?? timestamp,
    updated_at: timestamp,
    franchise: store.franchises.find((franchise) => franchise.id === values.franchise_id),
  };

  if (existingIndex >= 0) store.companies[existingIndex] = nextCompany;
  else store.companies.unshift(nextCompany);

  if (values.id) {
    store.jobs = store.jobs.map((job) =>
      job.company_id === values.id ? { ...job, franchise_id: nextCompany.franchise_id } : job,
    );
    store.applications = store.applications.map((application) =>
      application.company_id === values.id
        ? { ...application, franchise_id: nextCompany.franchise_id }
        : application,
    );
  }

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
    return normalizeCompany(data as Company);
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
            about_text,
            website_url,
            legal_name,
            same_as_url,
            franchise_id
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (filters.openOnly) query = query.eq('status', 'open');
    if (filters.franchiseId) query = query.eq('franchise_id', filters.franchiseId);
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

export async function getJobById(jobId: string) {
  if (hasSupabaseConfig && supabase) {
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
            about_text,
            website_url,
            legal_name,
            same_as_url,
            franchise_id
          )
        `,
      )
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return normalizeJob(data as JobRow);
  }

  const store = getLocalStore();
  const job = store.jobs.find((item) => item.id === jobId);
  return job ? withCompany(job, store.companies) : null;
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
            about_text,
            website_url,
            legal_name,
            same_as_url,
            franchise_id
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
  const company = store.companies.find(
    (item) =>
      item.slug === companySlug &&
      item.page_status === 'published' &&
      store.franchises.some(
        (franchise) => franchise.id === item.franchise_id && franchise.status === 'active',
      ),
  );
  if (!company) return null;
  const job = store.jobs.find((item) => item.company_id === company.id && item.slug === jobSlug && item.status === 'open');
  return job ? withCompany(job, store.companies) : null;
}

export async function upsertJob(values: Partial<Job> & Pick<Job, 'company_id' | 'title' | 'slug' | 'description'>) {
  const timestamp = new Date().toISOString();
  const publishedAt = values.status === 'open' ? values.published_at ?? timestamp : values.published_at ?? null;
  const expiresAt =
    values.status === 'open'
      ? values.expires_at ??
        (values.application_deadline
          ? `${values.application_deadline}T23:59:59-03:00`
          : new Date(new Date(publishedAt ?? timestamp).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
      : values.expires_at ?? null;
  const jobValues = { ...values };
  delete jobValues.company;
  const normalizedValues = {
    ...jobValues,
    published_at: publishedAt,
    expires_at: expiresAt,
    distribution_google_enabled: values.distribution_google_enabled ?? true,
    distribution_indeed_enabled: values.distribution_indeed_enabled ?? false,
    distribution_glassdoor_enabled: values.distribution_glassdoor_enabled ?? false,
    distribution_infojobs_enabled: values.distribution_infojobs_enabled ?? false,
    external_apply_url: values.external_apply_url ?? null,
    direct_apply: values.direct_apply ?? true,
    country: values.country ?? 'BR',
    street_address: values.street_address ?? null,
    postal_code: values.postal_code ?? null,
    salary_min: values.salary_min ?? null,
    salary_max: values.salary_max ?? null,
    salary_currency: values.salary_currency ?? 'BRL',
    salary_unit: values.salary_unit ?? 'MONTH',
    seo_title: values.seo_title ?? null,
    seo_description: values.seo_description ?? null,
    responsible_name: values.responsible_name ?? null,
    open_positions: values.open_positions ?? 1,
    approved_positions: values.approved_positions ?? 0,
    process_status: values.process_status ?? (values.status === 'closed' ? 'completed' : 'in_progress'),
    internal_notes: values.internal_notes ?? null,
    billing_amount: values.billing_amount ?? null,
    billing_type: values.billing_type ?? 'fixed',
    billing_status: values.billing_status ?? 'not_started',
    billing_due_date: values.billing_due_date ?? null,
    finance_responsible: values.finance_responsible ?? null,
    franchise_commission: values.franchise_commission ?? null,
  };

  if (hasSupabaseConfig && supabase) {
    const payload = {
      ...normalizedValues,
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
    franchise_id:
      values.franchise_id ??
      store.companies.find((company) => company.id === values.company_id)?.franchise_id ??
      null,
    company_id: values.company_id,
    title: values.title,
    slug: values.slug,
    short_description: values.short_description ?? null,
    description: values.description,
    about_job: values.about_job ?? null,
    responsibilities: values.responsibilities ?? null,
    requirements: values.requirements ?? null,
    desirable_requirements: values.desirable_requirements ?? null,
    benefits: values.benefits ?? null,
    salary_range: values.salary_range ?? null,
    seniority: values.seniority ?? null,
    education_level: values.education_level ?? null,
    work_schedule: values.work_schedule ?? null,
    about_company: values.about_company ?? null,
    neighborhood: values.neighborhood ?? null,
    city: values.city ?? null,
    state: values.state ?? 'MA',
    modality: values.modality ?? 'presencial',
    contract_type: values.contract_type ?? 'clt',
    status: values.status ?? 'draft',
    is_featured: values.is_featured ?? false,
    application_deadline: values.application_deadline ?? null,
    published_at: normalizedValues.published_at,
    expires_at: normalizedValues.expires_at,
    distribution_google_enabled: normalizedValues.distribution_google_enabled,
    distribution_indeed_enabled: normalizedValues.distribution_indeed_enabled,
    distribution_glassdoor_enabled: normalizedValues.distribution_glassdoor_enabled,
    distribution_infojobs_enabled: normalizedValues.distribution_infojobs_enabled,
    external_apply_url: normalizedValues.external_apply_url,
    direct_apply: normalizedValues.direct_apply,
    country: normalizedValues.country,
    street_address: normalizedValues.street_address,
    postal_code: normalizedValues.postal_code,
    salary_min: normalizedValues.salary_min,
    salary_max: normalizedValues.salary_max,
    salary_currency: normalizedValues.salary_currency,
    salary_unit: normalizedValues.salary_unit,
    seo_title: normalizedValues.seo_title,
    seo_description: normalizedValues.seo_description,
    responsible_name: normalizedValues.responsible_name,
    open_positions: normalizedValues.open_positions,
    approved_positions: normalizedValues.approved_positions,
    process_status: normalizedValues.process_status,
    internal_notes: normalizedValues.internal_notes,
    billing_amount: normalizedValues.billing_amount,
    billing_type: normalizedValues.billing_type,
    billing_status: normalizedValues.billing_status,
    billing_due_date: normalizedValues.billing_due_date,
    finance_responsible: normalizedValues.finance_responsible,
    franchise_commission: normalizedValues.franchise_commission,
    created_by: values.created_by ?? null,
    created_at: values.created_at ?? timestamp,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) store.jobs[existingIndex] = nextJob;
  else store.jobs.unshift(nextJob);

  if (values.id) {
    store.applications = store.applications.map((application) =>
      application.job_id === values.id
        ? {
            ...application,
            company_id: nextJob.company_id,
            franchise_id: nextJob.franchise_id,
          }
        : application,
    );
  }

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
  store.distributions = store.distributions.filter((distribution) => distribution.job_id !== jobId);
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
    if (filters.franchiseId) query = query.eq('franchise_id', filters.franchiseId);
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
    .filter((application) => !filters.franchiseId || application.franchise_id === filters.franchiseId)
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
  > &
    Partial<Pick<Application, 'source' | 'franchise_id'>>,
) {
  const timestamp = new Date().toISOString();
  const payload = {
    ...values,
    source: values.source ?? 'direct',
    franchise_id:
      values.franchise_id ??
      (!hasSupabaseConfig
        ? getLocalStore().jobs.find((job) => job.id === values.job_id)?.franchise_id
        : null) ??
      null,
  };

  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase.from('applications').insert(payload);
    if (error) throw error;
    return {
      id: '',
      ...payload,
      status: 'novo',
      stage: 'qualificacao',
      kanban_order: 0,
      match_score: null,
      adhesion_score: null,
      is_new: true,
      rejection_reason: null,
      tags: [],
      interview_scheduled_at: null,
      recruiter_opinion: null,
      professional_summary: null,
      skills: [],
      education: [],
      experiences: [],
      created_at: timestamp,
      updated_at: timestamp,
    } as Application;
  }

  const store = getLocalStore();
  const job = store.jobs.find((item) => item.id === values.job_id);
  const company = store.companies.find((item) => item.id === values.company_id);
  const activeFranchise = store.franchises.some(
    (franchise) => franchise.id === job?.franchise_id && franchise.status === 'active',
  );
  if (!job || job.status !== 'open' || company?.page_status !== 'published' || !activeFranchise) {
    throw new Error('Esta vaga não está aberta para candidatura.');
  }

  const application: Application = {
    id: makeId(),
    ...payload,
    status: 'novo',
    stage: 'qualificacao',
    kanban_order: 0,
    match_score: null,
    adhesion_score: null,
    is_new: true,
    rejection_reason: null,
    tags: [],
    interview_scheduled_at: null,
    recruiter_opinion: null,
    professional_summary: null,
    skills: [],
    education: [],
    experiences: [],
    created_at: timestamp,
    updated_at: timestamp,
    job,
    company,
  };

  store.applications.unshift(application);
  setLocalStore(store);
  return application;
}

export async function createManualApplication(values: {
  job: Job;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  candidate_city?: string | null;
}) {
  const timestamp = new Date().toISOString();
  const payload = {
    job_id: values.job.id,
    company_id: values.job.company_id,
    franchise_id: values.job.franchise_id,
    candidate_name: values.candidate_name.trim(),
    candidate_email: values.candidate_email.trim(),
    candidate_phone: values.candidate_phone.trim(),
    candidate_city: values.candidate_city?.trim() || null,
    linkedin_url: null,
    portfolio_url: null,
    salary_expectation: null,
    availability: null,
    message: 'Candidato adicionado manualmente pela equipe de recrutamento.',
    resume_file_path: '',
    status: 'novo' as const,
    stage: 'qualificacao' as const,
    kanban_order: 0,
    match_score: null,
    adhesion_score: null,
    is_new: true,
    rejection_reason: null,
    tags: ['Adicionado manualmente'],
    interview_scheduled_at: null,
    recruiter_opinion: null,
    professional_summary: null,
    skills: [],
    education: [],
    experiences: [],
    lgpd_consent: false,
    source: 'manual',
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('applications').insert(payload).select('*').single();
    if (error) throw error;
    return normalizeApplication(data as ApplicationRow);
  }

  const store = getLocalStore();
  const application: Application = {
    id: makeId(),
    ...payload,
    job: values.job,
    company: store.companies.find((company) => company.id === values.job.company_id),
  };
  store.applications.unshift(application);
  setLocalStore(store);
  return application;
}

export async function updateApplicationDetails(
  id: string,
  values: Partial<
    Pick<
      Application,
      | 'interview_scheduled_at'
      | 'recruiter_opinion'
      | 'professional_summary'
      | 'skills'
      | 'education'
      | 'experiences'
      | 'tags'
      | 'rejection_reason'
    >
  >,
) {
  const payload = { ...values, updated_at: new Date().toISOString() };

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('applications').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return normalizeApplication(data as ApplicationRow);
  }

  const store = getLocalStore();
  const index = store.applications.findIndex((application) => application.id === id);
  if (index < 0) throw new Error('Candidatura não encontrada.');
  store.applications[index] = { ...store.applications[index], ...payload };
  setLocalStore(store);
  return store.applications[index];
}

export async function getJobDistribution(
  jobId: string,
  channel: JobDistributionChannel,
): Promise<JobDistribution | null> {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('job_distribution_channels')
      .select('*')
      .eq('job_id', jobId)
      .eq('channel', channel)
      .maybeSingle();
    if (error) throw error;
    return data as JobDistribution | null;
  }

  return (
    getLocalStore().distributions.find(
      (distribution) => distribution.job_id === jobId && distribution.channel === channel,
    ) ?? null
  );
}

export async function upsertJobDistribution(
  values: Pick<JobDistribution, 'job_id' | 'channel' | 'status'> &
    Partial<Pick<JobDistribution, 'external_url' | 'last_synced_at' | 'error_message'>>,
) {
  const timestamp = new Date().toISOString();
  const payload = {
    ...values,
    external_url: values.external_url ?? null,
    last_synced_at: values.last_synced_at ?? null,
    error_message: values.error_message ?? null,
    updated_at: timestamp,
  };

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('job_distribution_channels')
      .upsert(payload, { onConflict: 'job_id,channel' })
      .select('*')
      .single();
    if (error) throw error;
    return data as JobDistribution;
  }

  const store = getLocalStore();
  const existingIndex = store.distributions.findIndex(
    (distribution) => distribution.job_id === values.job_id && distribution.channel === values.channel,
  );
  const distribution: JobDistribution = {
    id: existingIndex >= 0 ? store.distributions[existingIndex].id : makeId(),
    ...payload,
    created_at: existingIndex >= 0 ? store.distributions[existingIndex].created_at : timestamp,
  };

  if (existingIndex >= 0) store.distributions[existingIndex] = distribution;
  else store.distributions.unshift(distribution);
  setLocalStore(store);
  return distribution;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const timestamp = new Date().toISOString();
  const stageByStatus: Partial<Record<ApplicationStatus, ApplicationStage>> = {
    novo: 'qualificacao',
    triagem: 'qualificacao',
    em_analise: 'qualificacao',
    teste: 'testes',
    entrevista: 'entrevista',
    selecionado: 'finalistas',
    encaminhado_cliente: 'finalistas',
    aprovado: 'finalistas',
    contratado: 'contratacao',
    reprovado: 'desclassificados',
  };
  const nextStage = stageByStatus[status];

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, ...(nextStage ? { stage: nextStage } : {}), is_new: false, updated_at: timestamp })
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
    ...(nextStage ? { stage: nextStage } : {}),
    is_new: false,
    updated_at: timestamp,
  };
  setLocalStore(store);
  return store.applications[index];
}

const statusByStage: Record<ApplicationStage, ApplicationStatus> = {
  qualificacao: 'triagem',
  testes: 'teste',
  entrevista: 'entrevista',
  finalistas: 'selecionado',
  contratacao: 'contratado',
  desclassificados: 'reprovado',
};

export async function updateApplicationStage(
  id: string,
  stage: ApplicationStage,
  kanbanOrder: number,
  rejectionReason?: string | null,
) {
  const timestamp = new Date().toISOString();
  const payload = {
    stage,
    kanban_order: kanbanOrder,
    status: statusByStage[stage],
    is_new: false,
    rejection_reason: stage === 'desclassificados' ? rejectionReason ?? null : null,
    updated_at: timestamp,
  };

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.from('applications').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return normalizeApplication(data as ApplicationRow);
  }

  const store = getLocalStore();
  const index = store.applications.findIndex((application) => application.id === id);
  if (index < 0) throw new Error('Candidatura não encontrada.');
  const previousStage = store.applications[index].stage;
  store.applications[index] = { ...store.applications[index], ...payload };
  if (previousStage !== stage) {
    const actorId = getCurrentLocalProfileId();
    store.applicationStageHistory.unshift({
      id: makeId(),
      application_id: id,
      from_stage: previousStage,
      to_stage: stage,
      moved_by: actorId,
      created_at: timestamp,
      actor: store.profiles.find((profile) => profile.id === actorId),
    });
  }
  setLocalStore(store);
  return store.applications[index];
}

export async function updateApplicationKanbanOrder(updates: { id: string; kanbanOrder: number }[]) {
  if (!updates.length) return;

  if (hasSupabaseConfig && supabase) {
    const client = supabase;
    const results = await Promise.all(
      updates.map(({ id, kanbanOrder }) =>
        client.from('applications').update({ kanban_order: kanbanOrder }).eq('id', id),
      ),
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
    return;
  }

  const store = getLocalStore();
  const orderById = new Map(updates.map((item) => [item.id, item.kanbanOrder]));
  store.applications = store.applications.map((application) => {
    const kanbanOrder = orderById.get(application.id);
    return kanbanOrder === undefined ? application : { ...application, kanban_order: kanbanOrder };
  });
  setLocalStore(store);
}

export async function listApplicationNotes(applicationId: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('application_notes')
      .select('*, profiles(id, full_name)')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => {
      const { profiles, ...note } = item;
      return { ...note, author: profiles ?? undefined } as ApplicationNote;
    });
  }

  return getLocalStore().applicationNotes.filter((note) => note.application_id === applicationId);
}

export async function addApplicationNote(applicationId: string, note: string) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const { data: authData } = await supabase.auth.getUser();
    const createdBy = authData.user?.id;
    if (!createdBy) throw new Error('Sessão expirada.');
    const { data, error } = await supabase
      .from('application_notes')
      .insert({ application_id: applicationId, note, created_by: createdBy })
      .select('*')
      .single();
    if (error) throw error;
    return data as ApplicationNote;
  }

  const store = getLocalStore();
  const createdBy = getCurrentLocalProfileId() ?? store.profiles[0]?.id;
  if (!createdBy) throw new Error('Usuário não encontrado.');
  const item: ApplicationNote = {
    id: makeId(),
    application_id: applicationId,
    note,
    created_by: createdBy,
    created_at: timestamp,
    author: store.profiles.find((profile) => profile.id === createdBy),
  };
  store.applicationNotes.unshift(item);
  setLocalStore(store);
  return item;
}

export async function listApplicationStageHistory(applicationId: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('application_stage_history')
      .select('*, profiles(id, full_name)')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => {
      const { profiles, ...history } = item;
      return { ...history, actor: profiles ?? undefined } as ApplicationStageHistory;
    });
  }

  return getLocalStore().applicationStageHistory.filter((item) => item.application_id === applicationId);
}

export async function listProcessComments(jobId: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('process_comments')
      .select('*, profiles(id, full_name)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => {
      const { profiles, ...comment } = item;
      return { ...comment, author: profiles ?? undefined } as ProcessComment;
    });
  }

  return getLocalStore().processComments.filter((comment) => comment.job_id === jobId);
}

export async function addProcessComment(jobId: string, comment: string) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseConfig && supabase) {
    const { data: authData } = await supabase.auth.getUser();
    const createdBy = authData.user?.id;
    if (!createdBy) throw new Error('Sessão expirada.');
    const { data, error } = await supabase
      .from('process_comments')
      .insert({ job_id: jobId, comment, created_by: createdBy })
      .select('*')
      .single();
    if (error) throw error;
    return data as ProcessComment;
  }

  const store = getLocalStore();
  const createdBy = getCurrentLocalProfileId() ?? store.profiles[0]?.id;
  if (!createdBy) throw new Error('Usuário não encontrado.');
  const item: ProcessComment = {
    id: makeId(),
    job_id: jobId,
    comment,
    created_by: createdBy,
    created_at: timestamp,
    author: store.profiles.find((profile) => profile.id === createdBy),
  };
  store.processComments.unshift(item);
  setLocalStore(store);
  return item;
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
        franchiseId: values.franchiseId || undefined,
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
    franchise_id: values.franchiseId ?? null,
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

export async function getFranchiseDashboardStats(franchiseId: string): Promise<FranchiseDashboardStats> {
  const [companies, jobs, applications] = await Promise.all([
    listCompanies({ franchiseId }),
    listJobs({ franchiseId }),
    listApplications({ franchiseId }),
  ]);
  const sevenDaysAgo = formatISO(subDays(new Date(), 7));
  const monthStart = formatISO(startOfMonth(new Date()));

  return {
    totalCompanies: companies.length,
    publishedCompanies: companies.filter((company) => company.page_status === 'published').length,
    openJobs: jobs.filter((job) => job.status === 'open').length,
    totalApplications: applications.length,
    applicationsLast7Days: applications.filter((application) => application.created_at >= sevenDaysAgo).length,
    candidatesInScreening: applications.filter((application) =>
      ['triagem', 'em_analise'].includes(application.status),
    ).length,
    candidatesForwarded: applications.filter((application) =>
      ['encaminhado_cliente', 'aprovado', 'contratado'].includes(application.status),
    ).length,
    closedJobsThisMonth: jobs.filter(
      (job) => job.status === 'closed' && job.updated_at >= monthStart,
    ).length,
  };
}

export async function getNetworkDashboardStats(): Promise<NetworkDashboardStats> {
  const [franchises, companies, jobs, applications] = await Promise.all([
    listFranchises(),
    listCompanies(),
    listJobs(),
    listApplications(),
  ]);
  const sevenDaysAgo = formatISO(subDays(new Date(), 7));
  const monthStart = formatISO(startOfMonth(new Date()));

  return {
    totalFranchises: franchises.length,
    activeFranchises: franchises.filter((franchise) => franchise.status === 'active').length,
    totalCompanies: companies.length,
    publishedCompanies: companies.filter((company) => company.page_status === 'published').length,
    openJobs: jobs.filter((job) => job.status === 'open').length,
    totalApplications: applications.length,
    applicationsLast7Days: applications.filter((application) => application.created_at >= sevenDaysAgo).length,
    closedJobsThisMonth: jobs.filter(
      (job) => job.status === 'closed' && job.updated_at >= monthStart,
    ).length,
  };
}

export async function getFranchisePerformance(): Promise<FranchisePerformance[]> {
  const [franchises, companies, jobs, applications] = await Promise.all([
    listFranchises(),
    listCompanies(),
    listJobs(),
    listApplications(),
  ]);

  return franchises
    .map((franchise) => ({
      franchise,
      companies: companies.filter((company) => company.franchise_id === franchise.id).length,
      openJobs: jobs.filter((job) => job.franchise_id === franchise.id && job.status === 'open').length,
      applications: applications.filter((application) => application.franchise_id === franchise.id).length,
      forwardedCandidates: applications.filter(
        (application) =>
          application.franchise_id === franchise.id &&
          ['encaminhado_cliente', 'aprovado', 'contratado'].includes(application.status),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.applications - a.applications ||
        b.openJobs - a.openJobs ||
        a.franchise.name.localeCompare(b.franchise.name),
    );
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
