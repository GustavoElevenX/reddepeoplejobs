import {
  mockAccess,
  mockApplications,
  mockCompanies,
  mockFranchises,
  mockJobs,
  mockProfiles,
  mockSiteContents,
} from './mockData';
import { resolveApplicationStage } from './applicationStages';
import type {
  Application,
  ApplicationNote,
  ApplicationStageHistory,
  Company,
  CompanyUserAccess,
  Franchise,
  Job,
  JobDistribution,
  ProcessComment,
  Profile,
  SiteContent,
} from '../types';

type StoreShape = {
  franchises: Franchise[];
  companies: Company[];
  jobs: Job[];
  applications: Application[];
  applicationNotes: ApplicationNote[];
  applicationStageHistory: ApplicationStageHistory[];
  processComments: ProcessComment[];
  distributions: JobDistribution[];
  profiles: Profile[];
  access: CompanyUserAccess[];
  siteContents: SiteContent[];
};

const STORE_KEY = 'people_jobs_mvp_store_v5';
const SESSION_KEY = 'people_jobs_current_profile_id';

const seed: StoreShape = {
  franchises: mockFranchises,
  companies: mockCompanies,
  jobs: mockJobs,
  applications: mockApplications,
  applicationNotes: [],
  applicationStageHistory: [],
  processComments: [],
  distributions: [],
  profiles: mockProfiles,
  access: mockAccess,
  siteContents: mockSiteContents,
};

function cloneSeed(): StoreShape {
  return JSON.parse(JSON.stringify(seed)) as StoreShape;
}

function normalizeCompany(company: Company): Company {
  return {
    ...company,
    franchise_id: company.franchise_id ?? null,
    commercial_status: company.commercial_status ?? 'active_client',
    legal_name: company.legal_name ?? null,
    same_as_url: company.same_as_url ?? null,
  };
}

function normalizeJob(job: Job, companies: Company[]): Job {
  return {
    ...job,
    franchise_id:
      job.franchise_id ??
      companies.find((company) => company.id === job.company_id)?.franchise_id ??
      null,
    published_at: job.published_at ?? (job.status === 'open' ? job.created_at : null),
    expires_at:
      job.expires_at ??
      job.application_deadline ??
      (job.status === 'open'
        ? new Date(new Date(job.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null),
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
    company: companies.find((company) => company.id === job.company_id) ?? job.company,
  };
}

function normalizeStore(store: StoreShape): StoreShape {
  const franchises = store.franchises ?? mockFranchises;
  const companies = (store.companies ?? []).map((company) => {
    const normalized = normalizeCompany(company);
    return {
      ...normalized,
      franchise: franchises.find((franchise) => franchise.id === normalized.franchise_id),
    };
  });
  return {
    ...store,
    franchises,
    companies,
    jobs: (store.jobs ?? []).map((job) => normalizeJob(job, companies)),
    applications: (store.applications ?? []).map((application) => ({
      ...application,
      franchise_id:
        application.franchise_id ??
        (store.jobs ?? []).find((job) => job.id === application.job_id)?.franchise_id ??
        null,
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
    })),
    applicationNotes: store.applicationNotes ?? [],
    applicationStageHistory: store.applicationStageHistory ?? [],
    processComments: store.processComments ?? [],
    distributions: store.distributions ?? [],
    profiles: (store.profiles ?? []).map((profile) => ({
      ...profile,
      franchise_id: profile.franchise_id ?? null,
    })),
    access: store.access ?? [],
    siteContents: store.siteContents ?? [],
  };
}

export function getLocalStore(): StoreShape {
  if (typeof window === 'undefined') return cloneSeed();

  const stored = window.localStorage.getItem(STORE_KEY);
  if (!stored) {
    const initial = cloneSeed();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    return initial;
  }

  const normalized = normalizeStore(JSON.parse(stored) as StoreShape);
  window.localStorage.setItem(STORE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function setLocalStore(store: StoreShape) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getCurrentLocalProfileId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setCurrentLocalProfileId(profileId: string | null) {
  if (typeof window === 'undefined') return;

  if (!profileId) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, profileId);
}

export function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
