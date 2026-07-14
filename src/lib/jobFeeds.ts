import type { Job } from '../types';
import { contractTypeLabels, modalityLabels } from './formatters';
import { htmlToPlainText } from './jobPostingSchema';
import { getJobUrl, SITE_URL, withUtm } from './jobUrls';

function cdata(value: unknown) {
  return `<![CDATA[${String(value ?? '').replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

function salaryText(job: Job) {
  if (job.salary_min === null && job.salary_max === null) return job.salary_range ?? '';

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: job.salary_currency ?? 'BRL',
  });
  const minimum = job.salary_min !== null ? formatter.format(job.salary_min) : '';
  const maximum = job.salary_max !== null ? formatter.format(job.salary_max) : '';
  const range = minimum && maximum && minimum !== maximum ? `${minimum} a ${maximum}` : minimum || maximum;
  const unit = job.salary_unit === 'HOUR' ? 'por hora' : job.salary_unit === 'YEAR' ? 'por ano' : 'por mês';
  return `${range} ${unit}`.trim();
}

function fullDescription(job: Job) {
  return [
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
}

function indeedJobType(job: Job) {
  const map: Record<Job['contract_type'], string> = {
    clt: 'fulltime',
    pj: 'contract',
    estagio: 'internship',
    temporario: 'temporary',
    freelancer: 'contract',
    outro: 'other',
  };
  return map[job.contract_type];
}

export function buildIndeedXml(jobs: Job[]) {
  const entries = jobs
    .filter(
      (job) =>
        job.status === 'open' &&
        (job.distribution_indeed_enabled || job.distribution_glassdoor_enabled) &&
        job.company?.slug,
    )
    .map((job) => {
      const jobUrl = withUtm(
        getJobUrl(job.company!.slug, job.slug),
        'indeed',
        'jobboard',
        'job_distribution',
      );

      return [
        '  <job>',
        `    <title>${cdata(job.title)}</title>`,
        `    <date>${cdata(job.published_at ?? job.created_at)}</date>`,
        `    <referencenumber>${cdata(job.id)}</referencenumber>`,
        `    <requisitionid>${cdata(job.id)}</requisitionid>`,
        `    <url>${cdata(jobUrl)}</url>`,
        `    <company>${cdata(job.company?.name)}</company>`,
        `    <sourcename>${cdata('Recruitfy')}</sourcename>`,
        `    <city>${cdata(job.city)}</city>`,
        `    <state>${cdata(job.state)}</state>`,
        `    <country>${cdata(job.country ?? 'BR')}</country>`,
        `    <postalcode>${cdata(job.postal_code)}</postalcode>`,
        `    <description>${cdata(fullDescription(job))}</description>`,
        `    <salary>${cdata(salaryText(job))}</salary>`,
        `    <jobtype>${cdata(indeedJobType(job))}</jobtype>`,
        job.modality === 'remoto' ? `    <remotetype>${cdata('remote')}</remotetype>` : '',
        '  </job>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<source>',
    `  <publisher>${cdata('Recruitfy')}</publisher>`,
    `  <publisherurl>${cdata(SITE_URL)}</publisherurl>`,
    entries,
    '</source>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildGenericJobXml(jobs: Job[]) {
  const entries = jobs
    .filter(
      (job) =>
        job.status === 'open' &&
        Boolean(job.company?.slug) &&
        (job.distribution_google_enabled ||
          job.distribution_indeed_enabled ||
          job.distribution_glassdoor_enabled ||
          job.distribution_infojobs_enabled),
    )
    .map((job) =>
      [
        '  <job>',
        `    <id>${cdata(job.id)}</id>`,
        `    <title>${cdata(job.title)}</title>`,
        `    <company>${cdata(job.company?.name)}</company>`,
        `    <url>${cdata(getJobUrl(job.company!.slug, job.slug))}</url>`,
        `    <published_at>${cdata(job.published_at ?? job.created_at)}</published_at>`,
        `    <expires_at>${cdata(job.expires_at ?? job.application_deadline)}</expires_at>`,
        `    <location>${cdata([job.city, job.state, job.country ?? 'BR'].filter(Boolean).join(', '))}</location>`,
        `    <modality>${cdata(modalityLabels[job.modality])}</modality>`,
        `    <contract>${cdata(contractTypeLabels[job.contract_type])}</contract>`,
        `    <salary>${cdata(salaryText(job))}</salary>`,
        `    <description>${cdata(fullDescription(job))}</description>`,
        '  </job>',
      ].join('\n'),
    )
    .join('\n');

  return ['<?xml version="1.0" encoding="utf-8"?>', '<jobs>', entries, '</jobs>']
    .filter(Boolean)
    .join('\n');
}
