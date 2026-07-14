import { formatISO, startOfMonth, subDays } from 'date-fns';
import { resolveApplicationStage } from './applicationStages';
import { supabase } from './supabase';
import type { Application, ApplicationNote, ApplicationStage, ApplicationStageHistory, ApplicationStatus, Company, CompanyCommercialStatus, CompanyPageStatus, CompanyUserAccess, DashboardStats, Franchise, FranchiseDashboardStats, FranchisePerformance, FranchiseStatus, Job, JobContractType, JobDistribution, JobDistributionChannel, JobModality, JobStatus, NetworkDashboardStats, ProcessComment, Profile, SiteContent, } from '../types';
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
const OPTIONAL_JOB_BILLING_COLUMNS = [
    'billing_amount',
    'billing_type',
    'billing_status',
    'billing_due_date',
    'finance_responsible',
    'franchise_commission',
] as const;
function isMissingOptionalJobBillingColumnError(error: unknown) {
    if (!error || typeof error !== 'object')
        return false;
    const { code, message } = error as {
        code?: string;
        message?: string;
    };
    return (code === 'PGRST204' &&
        Boolean(message?.includes("column of 'jobs'")) &&
        OPTIONAL_JOB_BILLING_COLUMNS.some((column) => message?.includes(`'${column}'`)));
}
function withoutOptionalJobBillingColumns<T extends Record<string, unknown>>(payload: T) {
    const nextPayload: Record<string, unknown> = { ...payload };
    OPTIONAL_JOB_BILLING_COLUMNS.forEach((column) => {
        delete nextPayload[column];
    });
    return nextPayload;
}
function fixMojibake(value: string) {
    if (!/[ÃÂ]/.test(value))
        return value;
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code > 255)
            return value;
        bytes[index] = code;
    }
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    catch {
        return value;
    }
}
function normalizeBrandText(value: string | null) {
    if (!value)
        return null;
    return fixMojibake(value);
}
function normalizeSiteContent(content: SiteContent | null): SiteContent | null {
    if (!content)
        return null;
    return {
        ...content,
        title: normalizeBrandText(content.title) ?? content.title,
        subtitle: normalizeBrandText(content.subtitle),
        body: normalizeBrandText(content.body),
        button_label: normalizeBrandText(content.button_label),
        button_url: normalizeBrandText(content.button_url),
    };
}
function normalizeCompanySummary(company?: Job['company'] | null): Job['company'] | undefined {
    if (!company)
        return undefined;
    return {
        ...company,
        name: normalizeBrandText(company.name) ?? company.name,
        segment: normalizeBrandText(company.segment),
        city: normalizeBrandText(company.city),
        state: normalizeBrandText(company.state),
        about_text: normalizeBrandText(company.about_text),
        legal_name: normalizeBrandText(company.legal_name),
    };
}
function normalizeJob(row: JobRow): Job {
    const { companies, ...job } = row;
    const company = normalizeCompanySummary(companies);
    return {
        ...job,
        title: normalizeBrandText(job.title) ?? job.title,
        short_description: normalizeBrandText(job.short_description),
        description: normalizeBrandText(job.description) ?? job.description,
        about_job: normalizeBrandText(job.about_job),
        responsibilities: normalizeBrandText(job.responsibilities),
        requirements: normalizeBrandText(job.requirements),
        desirable_requirements: normalizeBrandText(job.desirable_requirements),
        benefits: normalizeBrandText(job.benefits),
        salary_range: normalizeBrandText(job.salary_range),
        seniority: normalizeBrandText(job.seniority),
        education_level: normalizeBrandText(job.education_level),
        work_schedule: normalizeBrandText(job.work_schedule),
        about_company: normalizeBrandText(job.about_company),
        neighborhood: normalizeBrandText(job.neighborhood),
        city: normalizeBrandText(job.city),
        state: normalizeBrandText(job.state),
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
        company,
    };
}
function normalizeCompany(row: Company | CompanyRow): Company {
    const { franchises, ...company } = row as CompanyRow;
    return {
        ...company,
        name: normalizeBrandText(company.name) ?? company.name,
        segment: normalizeBrandText(company.segment),
        city: normalizeBrandText(company.city),
        state: normalizeBrandText(company.state),
        employees_range: normalizeBrandText(company.employees_range),
        short_description: normalizeBrandText(company.short_description),
        about_text: normalizeBrandText(company.about_text),
        why_work_here: normalizeBrandText(company.why_work_here),
        culture_text: normalizeBrandText(company.culture_text),
        franchise_id: company.franchise_id ?? null,
        commercial_status: company.commercial_status ?? 'active_client',
        legal_name: normalizeBrandText(company.legal_name),
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
        resume_analysis_status: application.resume_analysis_status ?? 'pending',
        resume_analysis: application.resume_analysis ?? {
            professional_summary: '', skills: [], education: [], experiences: [], languages: [], certifications: [],
            total_experience_months: 0, current_role: '', location: '', salary_expectation_found: '',
            availability_found: '', evidence: [],
        },
        resume_analysis_error: application.resume_analysis_error ?? null,
        resume_analyzed_at: application.resume_analyzed_at ?? null,
        ai_match_score: application.ai_match_score ?? null,
        ranking_details: application.ranking_details ?? {
            overall_score: 0, mandatory_requirements_score: 0, experience_score: 0, technical_skills_score: 0,
            education_score: 0, location_score: 0, availability_score: 0, salary_score: 0,
            behavioral_indicators_score: 0, met_requirements: [], missing_requirements: [], strengths: [], risks: [],
            evidence: [], summary: '',
        },
        ranking_generated_at: application.ranking_generated_at ?? null,
        resume_analysis_waived_at: application.resume_analysis_waived_at ?? null,
        resume_analysis_waiver_reason: application.resume_analysis_waiver_reason ?? null,
        resume_analysis_waived_by: application.resume_analysis_waived_by ?? null,
        company: companies ?? undefined,
        job: jobs ?? undefined,
    };
}
export async function listFranchises(filters: {
    status?: FranchiseStatus | 'all';
    search?: string;
} = {}) {
    let query = supabase.from('franchises').select('*').order('name');
    if (filters.status && filters.status !== 'all')
        query = query.eq('status', filters.status);
    if (filters.search)
        query = query.ilike('name', `%${filters.search}%`);
    const { data, error } = await query;
    if (error)
        throw error;
    return data as Franchise[];
}
export async function getFranchiseById(id: string) {
    const { data, error } = await supabase.from('franchises').select('*').eq('id', id).single();
    if (error)
        throw error;
    return data as Franchise;
}
export async function upsertFranchise(values: Partial<Franchise> & Pick<Franchise, 'name' | 'slug'>) {
    const timestamp = new Date().toISOString();
    const payload = { ...values, updated_at: timestamp };
    const { data, error } = values.id
        ? await supabase.from('franchises').update(payload).eq('id', values.id).select('*').single()
        : await supabase.from('franchises').insert(payload).select('*').single();
    if (error)
        throw error;
    return data as Franchise;
}
export async function listCompanies(filters: CompanyFilters = {}) {
    let query = supabase
        .from('companies')
        .select('*, franchises(id, name, slug, status)')
        .order('created_at', { ascending: false });
    if (filters.publishedOnly)
        query = query.eq('page_status', 'published');
    if (filters.featuredOnly)
        query = query.eq('is_featured', true);
    if (filters.franchiseId)
        query = query.eq('franchise_id', filters.franchiseId);
    if (filters.commercialStatus && filters.commercialStatus !== 'all') {
        query = query.eq('commercial_status', filters.commercialStatus);
    }
    if (filters.status && filters.status !== 'all')
        query = query.eq('page_status', filters.status);
    if (filters.search)
        query = query.ilike('name', `%${filters.search}%`);
    if (filters.city)
        query = query.or(`city.ilike.%${filters.city}%,neighborhood.ilike.%${filters.city}%`);
    if (filters.segment)
        query = query.ilike('segment', `%${filters.segment}%`);
    const { data, error } = await query;
    if (error)
        throw error;
    const companies = (data as CompanyRow[]).map(normalizeCompany);
    return companies;
}
export async function getCompanyBySlug(slug: string, publishedOnly = true) {
    let query = supabase
        .from('companies')
        .select('*, franchises(id, name, slug, status)')
        .eq('slug', slug);
    if (publishedOnly)
        query = query.eq('page_status', 'published');
    const { data, error } = await query.maybeSingle();
    if (error)
        throw error;
    if (data)
        return normalizeCompany(data as CompanyRow);
    return null;
}
export async function getCompanyById(id: string) {
    const { data, error } = await supabase
        .from('companies')
        .select('*, franchises(id, name, slug, status)')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return normalizeCompany(data as Company);
}
export async function upsertCompany(values: Partial<Company> & Pick<Company, 'name' | 'slug'>) {
    const timestamp = new Date().toISOString();
    const companyValues = { ...values };
    delete companyValues.franchise;
    const payload = {
        ...companyValues,
        updated_at: timestamp,
    };
    const { data, error } = values.id
        ? await supabase.from('companies').update(payload).eq('id', values.id).select('*').single()
        : await supabase.from('companies').insert(payload).select('*').single();
    if (error)
        throw error;
    return normalizeCompany(data as Company);
}
export async function updateCompanyImages(companyId: string, values: Partial<Pick<Company, 'logo_url' | 'cover_image_url'>>) {
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
        .from('companies')
        .update({ ...values, updated_at: timestamp })
        .eq('id', companyId)
        .select('*')
        .single();
    if (error)
        throw error;
    return normalizeCompany(data as Company);
}
export async function listJobs(filters: JobFilters = {}) {
    let query = supabase
        .from('jobs')
        .select(`
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
        `)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    if (filters.openOnly)
        query = query.eq('status', 'open');
    if (filters.franchiseId)
        query = query.eq('franchise_id', filters.franchiseId);
    if (filters.status && filters.status !== 'all')
        query = query.eq('status', filters.status);
    if (filters.companyId)
        query = query.eq('company_id', filters.companyId);
    if (filters.city)
        query = query.ilike('city', `%${filters.city}%`);
    if (filters.modality && filters.modality !== 'all')
        query = query.eq('modality', filters.modality);
    if (filters.contractType && filters.contractType !== 'all') {
        query = query.eq('contract_type', filters.contractType);
    }
    if (filters.search)
        query = query.ilike('title', `%${filters.search}%`);
    if (filters.limit)
        query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error)
        throw error;
    const jobs = (data as JobRow[]).map(normalizeJob);
    return jobs;
}
export async function getJobById(jobId: string) {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
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
        `)
        .eq('id', jobId)
        .single();
    if (error)
        throw error;
    return normalizeJob(data as JobRow);
}
export async function getJobByCompanyAndSlug(companySlug: string, jobSlug: string) {
    const company = await getCompanyBySlug(companySlug, true);
    if (!company)
        return null;
    const { data, error } = await supabase
        .from('jobs')
        .select(`
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
        `)
        .eq('company_id', company.id)
        .eq('slug', jobSlug)
        .eq('status', 'open')
        .maybeSingle();
    if (error)
        throw error;
    if (data)
        return normalizeJob(data as JobRow);
    return null;
}
export async function upsertJob(values: Partial<Job> & Pick<Job, 'company_id' | 'title' | 'slug' | 'description'>) {
    const timestamp = new Date().toISOString();
    const publishedAt = values.status === 'open' ? values.published_at ?? timestamp : values.published_at ?? null;
    const expiresAt = values.status === 'open'
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
    const client = supabase;
    const payload = {
        ...normalizedValues,
        updated_at: timestamp,
    };
    const saveJob = (nextPayload: Record<string, unknown>) => values.id
        ? client.from('jobs').update(nextPayload).eq('id', values.id).select('*').single()
        : client.from('jobs').insert(nextPayload).select('*').single();
    let result = await saveJob(payload);
    if (result.error && isMissingOptionalJobBillingColumnError(result.error)) {
        result = await saveJob(withoutOptionalJobBillingColumns(payload));
    }
    const { data, error } = result;
    if (error)
        throw error;
    return normalizeJob(data as JobRow);
}
export async function deleteJob(jobId: string) {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error)
        throw error;
    return;
}
export async function listApplications(filters: ApplicationFilters = {}) {
    let query = supabase
        .from('applications')
        .select(`
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
        `)
        .order('created_at', { ascending: false });
    if (filters.companyId)
        query = query.eq('company_id', filters.companyId);
    if (filters.franchiseId)
        query = query.eq('franchise_id', filters.franchiseId);
    if (filters.jobId)
        query = query.eq('job_id', filters.jobId);
    if (filters.status && filters.status !== 'all')
        query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error)
        throw error;
    return (data as ApplicationRow[]).map(normalizeApplication);
}
export async function createApplication(values: Pick<Application, 'job_id' | 'company_id' | 'candidate_name' | 'candidate_email' | 'candidate_phone' | 'candidate_city' | 'linkedin_url' | 'portfolio_url' | 'salary_expectation' | 'availability' | 'message' | 'resume_file_path' | 'lgpd_consent'> & Partial<Pick<Application, 'source' | 'franchise_id'>>) {
    const payload = {
        ...values,
        source: values.source ?? 'direct',
        franchise_id: values.franchise_id ?? null,
    };
    const { data, error } = await supabase.from('applications').insert({
        ...payload,
    }).select('*').single();
    if (error)
        throw error;
    const application = normalizeApplication(data as ApplicationRow);
    void supabase.functions.invoke('analyze-candidate-resume', {
        body: {
            applicationId: application.id,
            analysisToken: (data as ApplicationRow & { resume_analysis_token?: string }).resume_analysis_token,
        },
    }).catch(() => undefined);
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
        resume_analysis_status: 'pending' as const,
        resume_analysis: {
            professional_summary: '', skills: [], education: [], experiences: [], languages: [], certifications: [],
            total_experience_months: 0, current_role: '', location: '', salary_expectation_found: '', availability_found: '', evidence: [],
        },
        resume_analysis_error: null,
        resume_analyzed_at: null,
        ai_match_score: null,
        ranking_details: {
            overall_score: 0, mandatory_requirements_score: 0, experience_score: 0, technical_skills_score: 0,
            education_score: 0, location_score: 0, availability_score: 0, salary_score: 0,
            behavioral_indicators_score: 0, met_requirements: [], missing_requirements: [], strengths: [], risks: [], evidence: [], summary: '',
        },
        ranking_generated_at: null,
        resume_analysis_waived_at: null,
        resume_analysis_waiver_reason: null,
        resume_analysis_waived_by: null,
        lgpd_consent: false,
        source: 'manual',
        created_at: timestamp,
        updated_at: timestamp,
    };
    const { data, error } = await supabase.from('applications').insert(payload).select('*').single();
    if (error)
        throw error;
    return normalizeApplication(data as ApplicationRow);
}
export async function updateApplicationDetails(id: string, values: Partial<Pick<Application, 'interview_scheduled_at' | 'recruiter_opinion' | 'professional_summary' | 'skills' | 'education' | 'experiences' | 'tags' | 'rejection_reason'>>) {
    const payload = { ...values, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('applications').update(payload).eq('id', id).select('*').single();
    if (error)
        throw error;
    return normalizeApplication(data as ApplicationRow);
}
export async function getJobDistribution(jobId: string, channel: JobDistributionChannel): Promise<JobDistribution | null> {
    const { data, error } = await supabase
        .from('job_distribution_channels')
        .select('*')
        .eq('job_id', jobId)
        .eq('channel', channel)
        .maybeSingle();
    if (error)
        throw error;
    return data as JobDistribution | null;
}
export async function upsertJobDistribution(values: Pick<JobDistribution, 'job_id' | 'channel' | 'status'> & Partial<Pick<JobDistribution, 'external_url' | 'last_synced_at' | 'error_message'>>) {
    const timestamp = new Date().toISOString();
    const payload = {
        ...values,
        external_url: values.external_url ?? null,
        last_synced_at: values.last_synced_at ?? null,
        error_message: values.error_message ?? null,
        updated_at: timestamp,
    };
    const { data, error } = await supabase
        .from('job_distribution_channels')
        .upsert(payload, { onConflict: 'job_id,channel' })
        .select('*')
        .single();
    if (error)
        throw error;
    return data as JobDistribution;
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
    const { data, error } = await supabase
        .from('applications')
        .update({ status, ...(nextStage ? { stage: nextStage } : {}), is_new: false, updated_at: timestamp })
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data as Application;
}
const statusByStage: Record<ApplicationStage, ApplicationStatus> = {
    qualificacao: 'triagem',
    testes: 'teste',
    entrevista: 'entrevista',
    finalistas: 'selecionado',
    contratacao: 'contratado',
    desclassificados: 'reprovado',
};
export async function updateApplicationStage(id: string, stage: ApplicationStage, kanbanOrder: number, rejectionReason?: string | null) {
    const timestamp = new Date().toISOString();
    const payload = {
        stage,
        kanban_order: kanbanOrder,
        status: statusByStage[stage],
        is_new: false,
        rejection_reason: stage === 'desclassificados' ? rejectionReason ?? null : null,
        updated_at: timestamp,
    };
    const { data, error } = await supabase.from('applications').update(payload).eq('id', id).select('*').single();
    if (error)
        throw error;
    return normalizeApplication(data as ApplicationRow);
}
export async function updateApplicationKanbanOrder(updates: {
    id: string;
    kanbanOrder: number;
}[]) {
    if (!updates.length)
        return;
    const client = supabase;
    const results = await Promise.all(updates.map(({ id, kanbanOrder }) => client.from('applications').update({ kanban_order: kanbanOrder }).eq('id', id)));
    const failed = results.find((result) => result.error);
    if (failed?.error)
        throw failed.error;
    return;
}
export async function listApplicationNotes(applicationId: string) {
    const { data, error } = await supabase
        .from('application_notes')
        .select('*, profiles(id, full_name)')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data ?? []).map((item) => {
        const { profiles, ...note } = item;
        return { ...note, author: profiles ?? undefined } as ApplicationNote;
    });
}
export async function addApplicationNote(applicationId: string, note: string) {
    const { data: authData } = await supabase.auth.getUser();
    const createdBy = authData.user?.id;
    if (!createdBy)
        throw new Error('Sessão expirada.');
    const { data, error } = await supabase
        .from('application_notes')
        .insert({ application_id: applicationId, note, created_by: createdBy })
        .select('*')
        .single();
    if (error)
        throw error;
    return data as ApplicationNote;
}
export async function listApplicationStageHistory(applicationId: string) {
    const { data, error } = await supabase
        .from('application_stage_history')
        .select('*, profiles(id, full_name)')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data ?? []).map((item) => {
        const { profiles, ...history } = item;
        return { ...history, actor: profiles ?? undefined } as ApplicationStageHistory;
    });
}
export async function listProcessComments(jobId: string) {
    const { data, error } = await supabase
        .from('process_comments')
        .select('*, profiles(id, full_name)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data ?? []).map((item) => {
        const { profiles, ...comment } = item;
        return { ...comment, author: profiles ?? undefined } as ProcessComment;
    });
}
export async function addProcessComment(jobId: string, comment: string) {
    const { data: authData } = await supabase.auth.getUser();
    const createdBy = authData.user?.id;
    if (!createdBy)
        throw new Error('Sessão expirada.');
    const { data, error } = await supabase
        .from('process_comments')
        .insert({ job_id: jobId, comment, created_by: createdBy })
        .select('*')
        .single();
    if (error)
        throw error;
    return data as ProcessComment;
}
export async function listProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error)
        throw error;
    return data as Profile[];
}
export async function updateProfileFranchise(userId: string, franchiseId: string | null) {
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
        .from('profiles')
        .update({ franchise_id: franchiseId, updated_at: timestamp })
        .eq('id', userId)
        .select('*')
        .single();
    if (error)
        throw error;
    return data as Profile;
}
export async function listCompanyAccess() {
    const { data, error } = await supabase.from('company_user_access').select('*');
    if (error)
        throw error;
    return data as CompanyUserAccess[];
}
export async function createAdminUser(values: CreateAdminUserInput) {
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
    if (error)
        throw error;
    return data as {
        userId: string;
        email: string;
        temporaryPassword?: string;
    };
}
export async function assignCompanyAccess(userId: string, companyId: string, permissions: UserPermissionInput) {
    const { data, error } = await supabase
        .from('company_user_access')
        .upsert({
        user_id: userId,
        company_id: companyId,
        ...permissions,
    }, { onConflict: 'user_id,company_id' })
        .select('*')
        .single();
    if (error)
        throw error;
    return data as CompanyUserAccess;
}
export async function updateCompanyAccess(accessId: string, permissions: UserPermissionInput) {
    const { data, error } = await supabase
        .from('company_user_access')
        .update(permissions)
        .eq('id', accessId)
        .select('*')
        .single();
    if (error)
        throw error;
    return data as CompanyUserAccess;
}
export async function getSiteContent(key: string) {
    const { data, error } = await supabase
        .from('site_contents')
        .select('*')
        .eq('key', key)
        .eq('is_active', true)
        .maybeSingle();
    if (error)
        throw error;
    return normalizeSiteContent(data as SiteContent | null);
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
        candidatesInScreening: applications.filter((application) => ['triagem', 'em_analise'].includes(application.status)).length,
        candidatesForwarded: applications.filter((application) => ['encaminhado_cliente', 'aprovado', 'contratado'].includes(application.status)).length,
        closedJobsThisMonth: jobs.filter((job) => job.status === 'closed' && job.updated_at >= monthStart).length,
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
        closedJobsThisMonth: jobs.filter((job) => job.status === 'closed' && job.updated_at >= monthStart).length,
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
        forwardedCandidates: applications.filter((application) => application.franchise_id === franchise.id &&
            ['encaminhado_cliente', 'aprovado', 'contratado'].includes(application.status)).length,
    }))
        .sort((a, b) => b.applications - a.applications ||
        b.openJobs - a.openJobs ||
        a.franchise.name.localeCompare(b.franchise.name));
}
export async function deleteUser(userId: string) {
    const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
    });
    if (error)
        throw error;
    return;
}
