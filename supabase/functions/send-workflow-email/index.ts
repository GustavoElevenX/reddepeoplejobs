import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type EmailEvent =
  | 'briefing_link' | 'finalists_link' | 'candidate_confirmation' | 'interview_guidelines'
  | 'hiring_approved_candidate' | 'hiring_approved_internal';
type Payload = {
  event: EmailEvent;
  projectId: string;
  scheduleId?: string;
  finalistId?: string;
  portalToken?: string;
  candidateToken?: string;
};
type DerivedEmail = { to: string; subject: string; data: Record<string, unknown> };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const allowedEvents: EmailEvent[] = [
  'briefing_link', 'finalists_link', 'candidate_confirmation', 'interview_guidelines',
  'hiring_approved_candidate', 'hiring_approved_internal',
];

function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function renderBody(event: EmailEvent, data: Record<string, unknown>) {
  const titles: Record<EmailEvent, string> = {
    briefing_link: 'Briefing disponível', finalists_link: 'Finalistas disponíveis',
    candidate_confirmation: 'Confirme sua presença', interview_guidelines: 'Orientações da entrevista',
    hiring_approved_candidate: 'Aprovação no processo seletivo', hiring_approved_internal: 'Candidato aprovado',
  };
  const rows = Object.entries(data).filter(([key, value]) => key !== 'url' && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`).join('');
  const link = data.url ? `<p><a href="${escapeHtml(data.url)}" style="display:inline-block;padding:12px 18px;background:#8300ea;color:#fff;text-decoration:none;border-radius:8px">Acessar</a></p>` : '';
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#151515"><h2>${titles[event]}</h2>${rows}${link}</div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'People Jobs <no-reply@peoplejobs.com.br>';
  const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://peoplejobs.com.br').replace(/\/$/, '');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Configuração segura do backend incompleta.' }, { status: 500, headers: corsHeaders });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);
  try {
    const payload = await req.json() as Payload;
    if (!allowedEvents.includes(payload.event) || typeof payload.projectId !== 'string') {
      return Response.json({ error: 'Evento de e-mail inválido.' }, { status: 400, headers: corsHeaders });
    }
    const { data: project, error: projectError } = await admin.from('projects').select('*').eq('id', payload.projectId).single();
    if (projectError || !project) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404, headers: corsHeaders });

    const publicPortalValid = payload.portalToken && payload.portalToken === project.client_access_token;
    let publicCandidateValid = false;
    if (payload.candidateToken) {
      const { data: tokenSchedule } = await admin.from('client_interview_schedules').select('id,project_id')
        .eq('candidate_confirmation_token', payload.candidateToken).eq('project_id', project.id).maybeSingle();
      publicCandidateValid = Boolean(tokenSchedule);
    }
    let authenticatedAuthorized = false;
    const authorization = req.headers.get('Authorization');
    if (authorization) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
      const { data: userData } = await userClient.auth.getUser();
      if (userData.user) {
        const { data: profile } = await admin.from('profiles').select('role,franchise_id,is_active').eq('id', userData.user.id).single();
        authenticatedAuthorized = Boolean(profile?.is_active && (
          ['admin_master', 'redde_super_admin', 'redde_admin'].includes(profile.role)
          || (profile.role === 'franqueado' && profile.franchise_id === project.franchise_id)
        ));
      }
    }
    const publicEventAuthorized =
      (['candidate_confirmation', 'hiring_approved_candidate', 'hiring_approved_internal'].includes(payload.event) && publicPortalValid)
      || (payload.event === 'interview_guidelines' && publicCandidateValid);
    if (!authenticatedAuthorized && !publicEventAuthorized) {
      return Response.json({ error: 'Sem permissão para este evento.' }, { status: 403, headers: corsHeaders });
    }

    const [{ data: company }, { data: opportunity }, { data: briefing }] = await Promise.all([
      admin.from('companies').select('id,name').eq('id', project.client_id).maybeSingle(),
      admin.from('sales_opportunities').select('contact_email,contact_name').eq('id', project.opportunity_id).maybeSingle(),
      admin.from('job_briefings').select('secure_token').eq('project_id', project.id).maybeSingle(),
    ]);
    const emails: DerivedEmail[] = [];
    if (payload.event === 'briefing_link' && opportunity?.contact_email && briefing?.secure_token) {
      emails.push({ to: opportunity.contact_email, subject: 'Briefing da vaga disponível', data: {
        cliente: company?.name, projeto: project.title, url: `${appUrl}/briefing/${briefing.secure_token}`,
      } });
    } else if (payload.event === 'finalists_link' && opportunity?.contact_email) {
      emails.push({ to: opportunity.contact_email, subject: 'Finalistas disponíveis para análise', data: {
        cliente: company?.name, projeto: project.title, url: `${appUrl}/portal-cliente/${project.client_access_token}`,
      } });
    } else if (payload.event === 'candidate_confirmation' || payload.event === 'interview_guidelines') {
      const scheduleQuery = admin.from('client_interview_schedules').select('*').eq('project_id', project.id);
      const { data: schedule } = payload.scheduleId
        ? await scheduleQuery.eq('id', payload.scheduleId).maybeSingle()
        : await scheduleQuery.eq('candidate_confirmation_token', payload.candidateToken ?? '').maybeSingle();
      if (!schedule) throw new Error('Agendamento não encontrado.');
      const { data: application } = await admin.from('applications').select('candidate_name,candidate_email')
        .eq('id', schedule.application_id).single();
      if (application?.candidate_email) emails.push({
        to: application.candidate_email,
        subject: payload.event === 'candidate_confirmation' ? 'Confirme sua presença na entrevista' : 'Orientações para sua entrevista',
        data: {
          candidato: application.candidate_name, empresa: company?.name, projeto: project.title,
          data: schedule.date, horario: schedule.time, formato: schedule.format,
          local: schedule.location_or_link, orientacoes: schedule.notes,
          ...(payload.event === 'candidate_confirmation' ? { url: `${appUrl}/confirmar-presenca/${schedule.candidate_confirmation_token}` } : {}),
        },
      });
    } else {
      if (project.client_decision_status !== 'finalized') throw new Error('A decisão conjunta ainda não foi finalizada.');
      const { data: decisions } = await admin.from('hiring_decisions').select('*')
        .eq('project_id', project.id).eq('decision', 'approved').eq('is_final', true);
      for (const decision of decisions ?? []) {
        const { data: application } = await admin.from('applications').select('candidate_name,candidate_email,candidate_phone')
          .eq('id', decision.application_id).single();
        const candidateEvent = payload.event === 'hiring_approved_candidate';
        const to = candidateEvent ? application?.candidate_email : decision.internal_responsible_email;
        if (!to) continue;
        emails.push({ to, subject: candidateEvent ? 'Aprovação no processo seletivo' : 'Novo candidato aprovado para admissão', data: {
          candidato: application?.candidate_name, email: application?.candidate_email, telefone: application?.candidate_phone,
          projeto: project.title, inicio: decision.start_date, responsavel: decision.internal_responsible_name,
          observacoes: decision.admission_notes, documentos: decision.required_documents,
        } });
      }
    }
    if (!emails.length) return Response.json({ status: 'skipped', reason: 'Nenhum destinatário válido.' }, { headers: corsHeaders });

    const results = [];
    for (const email of emails) {
      const logBase = { franchise_id: project.franchise_id, project_id: project.id, recipient: email.to,
        subject: email.subject, template: payload.event, payload: email.data };
      if (!resendKey) {
        await admin.from('email_logs').insert({ ...logBase, status: 'manual_required', error_message: 'RESEND_API_KEY not configured.' });
        results.push({ to: email.to, status: 'manual_required' });
        continue;
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: emailFrom, to: email.to, subject: email.subject, html: renderBody(payload.event, email.data) }),
      });
      const responseBody = await response.json().catch(() => ({})) as { id?: string };
      await admin.from('email_logs').insert({ ...logBase, status: response.ok ? 'sent' : 'failed',
        provider_message_id: responseBody.id ?? null, error_message: response.ok ? null : JSON.stringify(responseBody),
        sent_at: response.ok ? new Date().toISOString() : null });
      results.push({ to: email.to, status: response.ok ? 'sent' : 'failed' });
    }
    return Response.json({ status: results.some((item) => item.status === 'failed') ? 'partial_failure' : 'processed', results }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Erro inesperado.' }, { status: 500, headers: corsHeaders });
  }
});
