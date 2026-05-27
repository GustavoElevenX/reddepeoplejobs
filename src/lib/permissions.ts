import type { AppRole, CompanyUserAccess, Profile } from '../types';

export const reddeRoles: AppRole[] = ['redde_super_admin', 'redde_admin'];
export const companyRoles: AppRole[] = ['company_admin', 'company_recruiter'];

export function isReddeAdmin(profile?: Profile | null) {
  return Boolean(profile?.is_active && reddeRoles.includes(profile.role));
}

export function isCompanyUser(profile?: Profile | null) {
  return Boolean(profile?.is_active && companyRoles.includes(profile.role));
}

export function canAccessAdmin(profile?: Profile | null) {
  return isReddeAdmin(profile) || isCompanyUser(profile);
}

export function canEditCompanyPage(access?: CompanyUserAccess | null) {
  return Boolean(access?.can_edit_company_page);
}

export function canManageJobs(access?: CompanyUserAccess | null) {
  return Boolean(access?.can_manage_jobs);
}

export function canViewApplications(access?: CompanyUserAccess | null) {
  return Boolean(access?.can_view_applications);
}

export function canDownloadResumes(access?: CompanyUserAccess | null) {
  return Boolean(access?.can_download_resumes);
}
