import {
  mockAccess,
  mockApplications,
  mockCompanies,
  mockJobs,
  mockProfiles,
  mockSiteContents,
} from './mockData';
import type { Application, Company, CompanyUserAccess, Job, Profile, SiteContent } from '../types';

type StoreShape = {
  companies: Company[];
  jobs: Job[];
  applications: Application[];
  profiles: Profile[];
  access: CompanyUserAccess[];
  siteContents: SiteContent[];
};

const STORE_KEY = 'redde_people_jobs_mvp_store_v2';
const SESSION_KEY = 'redde_people_jobs_current_profile_id';

const seed: StoreShape = {
  companies: mockCompanies,
  jobs: mockJobs,
  applications: mockApplications,
  profiles: mockProfiles,
  access: mockAccess,
  siteContents: mockSiteContents,
};

function cloneSeed(): StoreShape {
  return JSON.parse(JSON.stringify(seed)) as StoreShape;
}

export function getLocalStore(): StoreShape {
  if (typeof window === 'undefined') return cloneSeed();

  const stored = window.localStorage.getItem(STORE_KEY);
  if (!stored) {
    const initial = cloneSeed();
    window.localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    return initial;
  }

  return JSON.parse(stored) as StoreShape;
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
