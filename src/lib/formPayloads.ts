import type { CompanyFormValues } from '../components/admin/CompanyForm';
import type { JobFormValues } from '../components/admin/JobForm';
import type { Company, Job } from '../types';
import { formatSalaryRange } from './formatters';

function emptyToNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function numberToNull(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateTimeToNull(value?: string) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function toCompanyPayload(values: CompanyFormValues, existing?: Company | null): Partial<Company> & Pick<Company, 'name' | 'slug'> {
  return {
    id: existing?.id,
    franchise_id: emptyToNull(values.franchise_id) ?? existing?.franchise_id ?? null,
    name: values.name.trim(),
    slug: values.slug.trim(),
    logo_url: emptyToNull(values.logo_url) ?? existing?.logo_url ?? null,
    cover_image_url: emptyToNull(values.cover_image_url) ?? existing?.cover_image_url ?? null,
    segment: emptyToNull(values.segment),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state) ?? 'MA',
    employees_range: emptyToNull(values.employees_range),
    website_url: emptyToNull(values.website_url),
    legal_name: emptyToNull(values.legal_name),
    same_as_url: emptyToNull(values.same_as_url),
    instagram_url: emptyToNull(values.instagram_url),
    linkedin_url: emptyToNull(values.linkedin_url),
    short_description: emptyToNull(values.short_description),
    about_text: emptyToNull(values.about_text),
    why_work_here: emptyToNull(values.why_work_here),
    culture_text: emptyToNull(values.culture_text),
    commercial_status: values.commercial_status,
    page_status: values.page_status,
    is_featured: values.is_featured,
    created_at: existing?.created_at,
  };
}

export function toJobPayload(values: JobFormValues, existing?: Job | null): Partial<Job> & Pick<Job, 'company_id' | 'title' | 'slug' | 'description'> {
  return {
    id: existing?.id,
    company_id: values.company_id,
    title: values.title.trim(),
    slug: values.slug.trim(),
    short_description: emptyToNull(values.short_description),
    description:
      emptyToNull(values.description) ??
      emptyToNull(values.about_job) ??
      emptyToNull(values.short_description) ??
      emptyToNull(values.responsibilities) ??
      values.title.trim(),
    about_job: emptyToNull(values.about_job),
    responsibilities: emptyToNull(values.responsibilities),
    requirements: emptyToNull(values.requirements),
    desirable_requirements: emptyToNull(values.desirable_requirements),
    benefits: emptyToNull(values.benefits),
    salary_range: formatSalaryRange(values.salary_range),
    education_level: emptyToNull(values.education_level),
    work_schedule: emptyToNull(values.work_schedule),
    about_company: emptyToNull(values.about_company),
    neighborhood: emptyToNull(values.neighborhood),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state) ?? 'MA',
    modality: values.modality,
    contract_type: values.contract_type,
    seniority: emptyToNull(values.seniority),
    status: values.status,
    is_featured: values.is_featured,
    application_deadline: emptyToNull(values.application_deadline),
    published_at: dateTimeToNull(values.published_at),
    expires_at: dateTimeToNull(values.expires_at),
    distribution_google_enabled: values.distribution_google_enabled,
    distribution_indeed_enabled: values.distribution_indeed_enabled,
    distribution_glassdoor_enabled: values.distribution_glassdoor_enabled,
    distribution_infojobs_enabled: values.distribution_infojobs_enabled,
    external_apply_url: emptyToNull(values.external_apply_url),
    direct_apply: values.direct_apply,
    country: emptyToNull(values.country) ?? 'BR',
    street_address: emptyToNull(values.street_address),
    postal_code: emptyToNull(values.postal_code),
    salary_min: numberToNull(values.salary_min),
    salary_max: numberToNull(values.salary_max),
    salary_currency: emptyToNull(values.salary_currency) ?? 'BRL',
    salary_unit: emptyToNull(values.salary_unit) ?? 'MONTH',
    seo_title: emptyToNull(values.seo_title),
    seo_description: emptyToNull(values.seo_description),
    responsible_name: emptyToNull(values.responsible_name),
    open_positions: values.open_positions,
    approved_positions: values.approved_positions,
    process_status: values.process_status,
    internal_notes: emptyToNull(values.internal_notes),
    billing_amount: numberToNull(values.billing_amount),
    billing_type: values.billing_type,
    billing_status: values.billing_status,
    billing_due_date: emptyToNull(values.billing_due_date),
    finance_responsible: emptyToNull(values.finance_responsible),
    franchise_commission: numberToNull(values.franchise_commission),
    created_at: existing?.created_at,
  };
}
