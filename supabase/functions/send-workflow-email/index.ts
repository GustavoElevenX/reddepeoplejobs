import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type EmailPayload = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  franchiseId?: string | null;
  projectId?: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderBody(template: string, data: Record<string, unknown>) {
  const titleByTemplate: Record<string, string> = {
    briefing_link: 'Briefing disponivel',
    finalists_link: 'Finalistas disponiveis',
    candidate_confirmation: 'Confirme sua presenca',
    interview_guidelines: 'Orientacoes da entrevista',
    hiring_approved_candidate: 'Aprovacao no processo seletivo',
    hiring_approved_internal: 'Candidato aprovado',
  };

  const rows = Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`)
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#151515">
      <h2>${escapeHtml(titleByTemplate[template] ?? 'People Jobs')}</h2>
      ${rows}
      ${data.url ? `<p><a href="${escapeHtml(data.url)}" style="display:inline-block;padding:12px 18px;background:#8300ea;color:#fff;text-decoration:none;border-radius:8px">Acessar</a></p>` : ''}
    </div>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'People Jobs <no-reply@peoplejobs.com.br>';

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase env vars.' }, { status: 500, headers: corsHeaders });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const payload = (await req.json()) as EmailPayload;

  if (!payload.to || !payload.subject || !payload.template) {
    return Response.json({ error: 'Invalid email payload.' }, { status: 400, headers: corsHeaders });
  }

  const logBase = {
    franchise_id: payload.franchiseId ?? null,
    project_id: payload.projectId ?? null,
    recipient: payload.to,
    subject: payload.subject,
    template: payload.template,
    payload: payload.data ?? {},
  };

  if (!resendKey) {
    await adminClient.from('email_logs').insert({
      ...logBase,
      status: 'manual_required',
      error_message: 'RESEND_API_KEY not configured.',
    });
    return Response.json({ status: 'manual_required' }, { headers: corsHeaders });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: renderBody(payload.template, payload.data ?? {}),
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  await adminClient.from('email_logs').insert({
    ...logBase,
    status: response.ok ? 'sent' : 'failed',
    provider_message_id: responseBody.id ?? null,
    error_message: response.ok ? null : JSON.stringify(responseBody),
    sent_at: response.ok ? new Date().toISOString() : null,
  });

  return Response.json(
    response.ok ? { status: 'sent', providerMessageId: responseBody.id } : { status: 'failed', error: responseBody },
    { status: response.ok ? 200 : 502, headers: corsHeaders },
  );
});
