import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type JobRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string;
  about_job: string | null;
  responsibilities: string | null;
  requirements: string | null;
  desirable_requirements: string | null;
  benefits: string | null;
  about_company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  modality: string;
  contract_type: string;
  salary_range: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_unit: string | null;
  published_at: string | null;
  created_at: string;
  companies:
    | {
        name: string;
        slug: string;
        page_status: string;
        franchises: { status: string } | Array<{ status: string }>;
      }
    | Array<{
        name: string;
        slug: string;
        page_status: string;
        franchises: { status: string } | Array<{ status: string }>;
      }>;
};

const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://recruitfy.com.br').replace(/\/+$/, '');

function cdata(value: unknown) {
  return `<![CDATA[${String(value ?? '').replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

function plainText(value?: string | null) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jobUrl(companySlug: string, jobSlug: string) {
  const url = new URL(
    `${siteUrl}/empresa/${encodeURIComponent(companySlug)}/vagas/${encodeURIComponent(jobSlug)}`,
  );
  url.searchParams.set('utm_source', 'indeed');
  url.searchParams.set('utm_medium', 'jobboard');
  url.searchParams.set('utm_campaign', 'job_distribution');
  return url.toString();
}

function description(job: JobRow) {
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
    .map(plainText)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join('\n\n');
}

function salary(job: JobRow) {
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

function jobType(contractType: string) {
  return (
    {
      clt: 'fulltime',
      pj: 'contract',
      estagio: 'internship',
      temporario: 'temporary',
      freelancer: 'contract',
      outro: 'other',
    }[contractType] ?? 'other'
  );
}

serve(async (request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing Supabase env vars.', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from('jobs')
    .select(
      `
        id,
        title,
        slug,
        short_description,
        description,
        about_job,
        responsibilities,
        requirements,
        desirable_requirements,
        benefits,
        about_company,
        city,
        state,
        country,
        postal_code,
        modality,
        contract_type,
        salary_range,
        salary_min,
        salary_max,
        salary_currency,
        salary_unit,
        published_at,
        created_at,
        companies!inner(name, slug, page_status, franchises!inner(status))
      `,
    )
    .eq('status', 'open')
    .or('distribution_indeed_enabled.eq.true,distribution_glassdoor_enabled.eq.true')
    .eq('companies.page_status', 'published')
    .eq('companies.franchises.status', 'active')
    .order('published_at', { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const jobs = ((data ?? []) as JobRow[])
    .map((job) => {
      const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
      if (!company?.slug) return '';

      return [
        '  <job>',
        `    <title>${cdata(job.title.trim())}</title>`,
        `    <date>${cdata(job.published_at ?? job.created_at)}</date>`,
        `    <referencenumber>${cdata(job.id)}</referencenumber>`,
        `    <requisitionid>${cdata(job.id)}</requisitionid>`,
        `    <url>${cdata(jobUrl(company.slug, job.slug))}</url>`,
        `    <company>${cdata(company.name)}</company>`,
        `    <sourcename>${cdata('Recruitfy')}</sourcename>`,
        `    <city>${cdata(job.city)}</city>`,
        `    <state>${cdata(job.state)}</state>`,
        `    <country>${cdata(job.country ?? 'BR')}</country>`,
        `    <postalcode>${cdata(job.postal_code)}</postalcode>`,
        `    <description>${cdata(description(job))}</description>`,
        `    <salary>${cdata(salary(job))}</salary>`,
        `    <jobtype>${cdata(jobType(job.contract_type))}</jobtype>`,
        job.modality === 'remoto' ? `    <remotetype>${cdata('remote')}</remotetype>` : '',
        '  </job>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .filter(Boolean)
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<source>',
    `  <publisher>${cdata('Recruitfy')}</publisher>`,
    `  <publisherurl>${cdata(siteUrl)}</publisherurl>`,
    jobs,
    '</source>',
  ]
    .filter(Boolean)
    .join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
