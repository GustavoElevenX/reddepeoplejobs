import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://recruitfy.com.br').replace(/\/+$/, '');

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function jobUrl(companySlug: string, jobSlug: string) {
  return `${siteUrl}/empresa/${encodeURIComponent(companySlug)}/vagas/${encodeURIComponent(jobSlug)}`;
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
    .select('slug, published_at, updated_at, companies!inner(slug, page_status, franchises!inner(status))')
    .eq('status', 'open')
    .eq('distribution_google_enabled', true)
    .eq('companies.page_status', 'published')
    .eq('companies.franchises.status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const urls = (data ?? [])
    .map((job) => {
      const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
      if (!company?.slug) return '';
      return [
        '  <url>',
        `    <loc>${escapeXml(jobUrl(company.slug, job.slug))}</loc>`,
        `    <lastmod>${escapeXml(job.updated_at ?? job.published_at)}</lastmod>`,
        '  </url>',
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
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
