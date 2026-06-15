import type { AppRole, CompanyUserAccess, Profile } from '../types';

export const masterRoles: AppRole[] = ['admin_master', 'redde_super_admin', 'redde_admin'];
export const franchiseRoles: AppRole[] = ['franqueado'];
export const companyRoles: AppRole[] = ['empresa_cliente', 'company_admin', 'company_recruiter'];
export const reddeRoles = masterRoles;

export function isAdminMaster(profile?: Profile | null) {
  return Boolean(profile?.is_active && masterRoles.includes(profile.role));
}

export function isReddeAdmin(profile?: Profile | null) {
  return isAdminMaster(profile);
}

export function isFranchisee(profile?: Profile | null) {
  return Boolean(profile?.is_active && franchiseRoles.includes(profile.role));
}

export function isCompanyUser(profile?: Profile | null) {
  return Boolean(profile?.is_active && companyRoles.includes(profile.role));
}

export function canAccessAdmin(profile?: Profile | null) {
  return isAdminMaster(profile) || isFranchisee(profile) || isCompanyUser(profile);
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
