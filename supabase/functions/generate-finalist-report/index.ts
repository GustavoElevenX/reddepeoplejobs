import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const stringList = { type: 'array', items: { type: 'string' } };
const reportSchema = {
  type: 'object', additionalProperties: false,
  required: [
    'executive_summary', 'career_summary', 'job_adherence', 'technical_strengths', 'behavioral_strengths',
    'attention_points', 'mandatory_requirements_evidence', 'interview_summary', 'availability_and_salary',
    'recommendation', 'recommended_client_questions', 'client_facing_report',
  ],
  properties: {
    executive_summary: { type: 'string' }, career_summary: { type: 'string' }, job_adherence: { type: 'string' },
    technical_strengths: stringList, behavioral_strengths: stringList, attention_points: stringList,
    mandatory_requirements_evidence: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['requirement', 'status', 'evidence'],
        properties: {
          requirement: { type: 'string' }, status: { type: 'string', enum: ['met', 'partial', 'not_found'] },
          evidence: { type: 'string' },
        },
      },
    },
    interview_summary: { type: 'string' }, availability_and_salary: { type: 'string' },
    recommendation: { type: 'string', enum: ['strong_yes', 'yes', 'with_reservations', 'no'] },
    recommended_client_questions: stringList, client_facing_report: { type: 'string' },
  },
};

type Report = { client_facing_report: string; recommendation: string } & Record<string, unknown>;

function outputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === 'string') return record.output_text;
  if (!Array.isArray(record.output)) return '';
  for (const item of record.output) {
    const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') return (part as { text: string }).text;
    }
  }
  return '';
}

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== 'object') return false;
  const report = value as { client_facing_report?: unknown; recommendation?: unknown };
  return typeof report.client_facing_report === 'string' && report.client_facing_report.trim().length > 0
    && typeof report.recommendation === 'string';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openAiKey) {
    return Response.json({ error: 'Configuração segura do backend incompleta.' }, { status: 500, headers: corsHeaders });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);
  let finalistId = '';
  try {
    const body = await req.json() as { projectId?: unknown; applicationId?: unknown };
    if (typeof body.projectId !== 'string' || typeof body.applicationId !== 'string') {
      return Response.json({ error: 'projectId e applicationId são obrigatórios.' }, { status: 400, headers: corsHeaders });
    }
    const authorization = req.headers.get('Authorization');
    if (!authorization) return Response.json({ error: 'Autenticação obrigatória.' }, { status: 401, headers: corsHeaders });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return Response.json({ error: 'Sessão inválida.' }, { status: 401, headers: corsHeaders });

    const [{ data: profile }, { data: project, error: projectError }, { data: application, error: appError }] = await Promise.all([
      admin.from('profiles').select('id,role,franchise_id,is_active').eq('id', userData.user.id).single(),
      admin.from('projects').select('*').eq('id', body.projectId).single(),
      admin.from('applications').select('*').eq('id', body.applicationId).single(),
    ]);
    if (projectError || appError || !project || !application || project.job_id !== application.job_id) {
      return Response.json({ error: 'Projeto ou candidatura inválidos.' }, { status: 404, headers: corsHeaders });
    }
    const isAdmin = profile?.is_active && ['admin_master', 'redde_super_admin', 'redde_admin'].includes(profile.role);
    const isOwner = profile?.is_active && profile.role === 'franqueado' && profile.franchise_id === project.franchise_id;
    if (!isAdmin && !isOwner) return Response.json({ error: 'Sem permissão.' }, { status: 403, headers: corsHeaders });

    const [{ data: job }, { data: briefing }, { data: description }, { data: screening }, { data: interview }] = await Promise.all([
      admin.from('jobs').select('*').eq('id', project.job_id).single(),
      admin.from('job_briefings').select('*').eq('project_id', project.id).maybeSingle(),
      admin.from('job_descriptions').select('*').eq('project_id', project.id).maybeSingle(),
      admin.from('candidate_screenings').select('*').eq('project_id', project.id).eq('application_id', application.id).maybeSingle(),
      admin.from('internal_interviews').select('*').eq('project_id', project.id).eq('application_id', application.id).maybeSingle(),
    ]);
    if (screening?.status !== 'completed') throw new Error('Conclua a triagem manual antes de gerar o parecer.');
    if (interview?.status !== 'completed') throw new Error('Conclua a entrevista interna antes de gerar o parecer.');
    if (interview.recommendation === 'no') throw new Error('A entrevista interna possui recomendação negativa.');

    const { data: finalist, error: upsertError } = await admin.from('finalists').upsert({
      franchise_id: project.franchise_id, project_id: project.id, application_id: application.id,
      status: 'draft', ai_report_status: 'generating', ai_report_payload: {}, franchise_opinion: '', client_notes: '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,application_id' }).select('*').single();
    if (upsertError || !finalist) throw upsertError ?? new Error('Não foi possível preparar o parecer.');
    finalistId = finalist.id;

    const safeContext = {
      project: { title: project.title },
      job, briefing: briefing?.payload ?? {}, approved_description: description?.content ?? {},
      candidate: {
        declared_data: {
          candidate_name: application.candidate_name, candidate_city: application.candidate_city,
          salary_expectation: application.salary_expectation, availability: application.availability,
        },
        resume_analysis: application.resume_analysis, ranking: application.ranking_details,
      },
      screening: {
        answers: screening.answers, mandatory_requirements_confirmed: screening.mandatory_requirements_confirmed,
        salary_compatible: screening.salary_compatible, availability_compatible: screening.availability_compatible,
        location_compatible: screening.location_compatible, technical_score: screening.technical_score,
        behavioral_score: screening.behavioral_score, recruiter_notes: screening.recruiter_notes,
      },
      internal_interview: interview,
    };
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{ role: 'user', content: [{ type: 'input_text', text:
          `Gere um parecer profissional aprofundado para revisão do franqueado. Use somente os fatos fornecidos, não invente informações e indique claramente ausências. O campo client_facing_report deve ser adequado para o cliente e não expor notas internas sensíveis. Dados: ${JSON.stringify(safeContext)}` }] }],
        text: { format: { type: 'json_schema', name: 'finalist_report', strict: true, schema: reportSchema } },
      }),
    });
    const payload: unknown = await openAiResponse.json();
    if (!openAiResponse.ok) throw new Error('A OpenAI não conseguiu gerar o parecer neste momento.');
    const report: unknown = JSON.parse(outputText(payload));
    if (!isReport(report)) throw new Error('O parecer retornou um formato inválido.');
    const now = new Date().toISOString();
    const { data: saved, error: saveError } = await admin.from('finalists').update({
      ai_report_payload: report, ai_report: report.client_facing_report, ai_report_status: 'generated',
      ai_report_generated_at: now, franchise_approved_at: null, franchise_approved_by: null, updated_at: now,
    }).eq('id', finalistId).select('*').single();
    if (saveError) throw saveError;
    return Response.json({ finalist: saved }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada ao gerar o parecer.';
    if (finalistId) await admin.from('finalists').update({ ai_report_status: 'failed', updated_at: new Date().toISOString() }).eq('id', finalistId);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
