import type { Job } from '../types';
import { getJobUrl } from './jobUrls';

export function htmlToPlainText(value?: string | null) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapEmploymentType(contractType: Job['contract_type']) {
  const map: Record<Job['contract_type'], string> = {
    clt: 'FULL_TIME',
    pj: 'CONTRACTOR',
    estagio: 'INTERN',
    temporario: 'TEMPORARY',
    freelancer: 'CONTRACTOR',
    outro: 'OTHER',
  };

  return map[contractType];
}

function formatValidThrough(value?: string | null) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59-03:00` : value;
}

export function buildJobPostingSchema(job: Job) {
  const companySlug = job.company?.slug;
  if (!companySlug || job.status !== 'open' || !job.distribution_google_enabled) return null;

  const jobUrl = getJobUrl(companySlug, job.slug);
  const validThrough = job.expires_at ?? job.application_deadline;
  const description = [
    job.short_description,
    job.description,
    job.about_job,
    job.responsibilities,
    job.requirements,
    job.desirable_requirements,
    job.benefits,
    job.about_company,
  ]
    .map(htmlToPlainText)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join('\n\n');

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    datePosted: job.published_at ?? job.created_at,
    validThrough: formatValidThrough(validThrough),
    employmentType: mapEmploymentType(job.contract_type),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company?.legal_name ?? job.company?.name ?? 'Empresa parceira Redde People',
      sameAs: job.company?.same_as_url ?? job.company?.website_url ?? undefined,
      logo: job.company?.logo_url ?? undefined,
    },
    applicantLocationRequirements:
      job.modality === 'remoto'
        ? {
            '@type': 'Country',
            name: job.country ?? 'BR',
          }
        : undefined,
    jobLocationType: job.modality === 'remoto' ? 'TELECOMMUTE' : undefined,
    jobLocation:
      job.modality !== 'remoto'
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              streetAddress: [job.street_address, job.neighborhood].filter(Boolean).join(' - ') || undefined,
              addressLocality: job.city ?? undefined,
              addressRegion: job.state ?? undefined,
              postalCode: job.postal_code ?? undefined,
              addressCountry: job.country ?? 'BR',
            },
          }
        : undefined,
    directApply: job.direct_apply ?? true,
    url: job.external_apply_url || jobUrl,
  };

  if (job.salary_min !== null || job.salary_max !== null) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salary_currency ?? 'BRL',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salary_min ?? undefined,
        maxValue: job.salary_max ?? job.salary_min ?? undefined,
        unitText: job.salary_unit ?? 'MONTH',
      },
    };
  }

  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}
