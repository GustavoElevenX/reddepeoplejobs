import type { CompanyFormValues } from '../components/admin/CompanyForm';
import type { JobFormValues } from '../components/admin/JobForm';
import type { Company, Job } from '../types';
import { formatSalaryRange } from './formatters';

function emptyToNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

export function toCompanyPayload(values: CompanyFormValues, existing?: Company | null): Partial<Company> & Pick<Company, 'name' | 'slug'> {
  return {
    id: existing?.id,
    name: values.name.trim(),
    slug: values.slug.trim(),
    logo_url: emptyToNull(values.logo_url) ?? existing?.logo_url ?? null,
    cover_image_url: emptyToNull(values.cover_image_url) ?? existing?.cover_image_url ?? null,
    segment: emptyToNull(values.segment),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state) ?? 'MA',
    employees_range: emptyToNull(values.employees_range),
    website_url: emptyToNull(values.website_url),
    instagram_url: emptyToNull(values.instagram_url),
    linkedin_url: emptyToNull(values.linkedin_url),
    short_description: emptyToNull(values.short_description),
    about_text: emptyToNull(values.about_text),
    why_work_here: emptyToNull(values.why_work_here),
    culture_text: emptyToNull(values.culture_text),
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
    created_at: existing?.created_at,
  };
}
