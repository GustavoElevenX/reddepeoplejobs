export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://reddepeoplejobs.com.br').replace(/\/+$/, '');

export function getJobPath(companySlug: string, jobSlug: string) {
  return `/empresa/${encodeURIComponent(companySlug)}/vagas/${encodeURIComponent(jobSlug)}`;
}

export function getJobUrl(companySlug: string, jobSlug: string) {
  return `${SITE_URL}${getJobPath(companySlug, jobSlug)}`;
}

export function withUtm(url: string, source: string, medium: string, campaign: string) {
  const parsedUrl = new URL(url, SITE_URL);
  parsedUrl.searchParams.set('utm_source', source);
  parsedUrl.searchParams.set('utm_medium', medium);
  parsedUrl.searchParams.set('utm_campaign', campaign);
  return parsedUrl.toString();
}
