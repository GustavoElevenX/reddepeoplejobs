import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const scoreProperties = {
  overall_score: { type: 'integer', minimum: 0, maximum: 100 },
  mandatory_requirements_score: { type: 'integer', minimum: 0, maximum: 100 },
  experience_score: { type: 'integer', minimum: 0, maximum: 100 },
  technical_skills_score: { type: 'integer', minimum: 0, maximum: 100 },
  education_score: { type: 'integer', minimum: 0, maximum: 100 },
  location_score: { type: 'integer', minimum: 0, maximum: 100 },
  availability_score: { type: 'integer', minimum: 0, maximum: 100 },
  salary_score: { type: 'integer', minimum: 0, maximum: 100 },
  behavioral_indicators_score: { type: 'integer', minimum: 0, maximum: 100 },
};

const stringList = { type: 'array', items: { type: 'string' } };
const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['resume_analysis', 'ranking'],
  properties: {
    resume_analysis: {
      type: 'object',
      additionalProperties: false,
      required: [
        'professional_summary', 'skills', 'education', 'experiences', 'languages', 'certifications',
        'total_experience_months', 'current_role', 'location', 'salary_expectation_found',
        'availability_found', 'evidence',
      ],
      properties: {
        professional_summary: { type: 'string' },
        skills: stringList,
        education: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['course', 'institution', 'level', 'status', 'start_year', 'end_year'],
            properties: {
              course: { type: 'string' }, institution: { type: 'string' }, level: { type: 'string' },
              status: { type: 'string' }, start_year: { type: ['integer', 'null'] }, end_year: { type: ['integer', 'null'] },
            },
          },
        },
        experiences: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false,
            required: ['role', 'company', 'start_date', 'end_date', 'current', 'description'],
            properties: {
              role: { type: 'string' }, company: { type: 'string' }, start_date: { type: 'string' },
              end_date: { type: 'string' }, current: { type: 'boolean' }, description: { type: 'string' },
            },
          },
        },
        languages: stringList,
        certifications: stringList,
        total_experience_months: { type: 'integer', minimum: 0 },
        current_role: { type: 'string' },
        location: { type: 'string' },
        salary_expectation_found: { type: 'string' },
        availability_found: { type: 'string' },
        evidence: stringList,
      },
    },
    ranking: {
      type: 'object',
      additionalProperties: false,
      required: [
        ...Object.keys(scoreProperties), 'met_requirements', 'missing_requirements', 'strengths', 'risks', 'evidence', 'summary',
      ],
      properties: {
        ...scoreProperties,
        met_requirements: stringList, missing_requirements: stringList, strengths: stringList,
        risks: stringList, evidence: stringList, summary: { type: 'string' },
      },
    },
  },
};

type AnalysisResult = {
  resume_analysis: {
    professional_summary: string;
    skills: string[];
    education: unknown[];
    experiences: unknown[];
    languages: string[];
    certifications: string[];
    total_experience_months: number;
    current_role: string;
    location: string;
    salary_expectation_found: string;
    availability_found: string;
    evidence: string[];
  };
  ranking: Record<string, unknown> & { overall_score: number };
};

function responseText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === 'string') return record.output_text;
  if (!Array.isArray(record.output)) return '';
  for (const item of record.output) {
    if (!item || typeof item !== 'object' || !Array.isArray((item as { content?: unknown }).content)) continue;
    for (const content of (item as { content: unknown[] }).content) {
      if (content && typeof content === 'object' && typeof (content as { text?: unknown }).text === 'string') {
        return (content as { text: string }).text;
      }
    }
  }
  return '';
}

function validateResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as { resume_analysis?: unknown; ranking?: unknown };
  if (!result.resume_analysis || typeof result.resume_analysis !== 'object' || !result.ranking || typeof result.ranking !== 'object') return false;
  const score = (result.ranking as { overall_score?: unknown }).overall_score;
  return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 100;
}

function mimeFromPath(path: string) {
  const extension = path.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'doc') return 'application/msword';
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  throw new Error('Formato de currículo não suportado. Envie PDF, DOC ou DOCX.');
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

  let applicationId = '';
  const admin = createClient(supabaseUrl, serviceRoleKey);
  try {
    const body = await req.json() as { applicationId?: unknown };
    if (typeof body.applicationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.applicationId)) {
      return Response.json({ error: 'applicationId inválido.' }, { status: 400, headers: corsHeaders });
    }
    applicationId = body.applicationId;
    const authorization = req.headers.get('Authorization');
    if (!authorization) return Response.json({ error: 'Autenticação obrigatória.' }, { status: 401, headers: corsHeaders });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return Response.json({ error: 'Sessão inválida.' }, { status: 401, headers: corsHeaders });

    const [{ data: profile }, { data: application, error: applicationError }] = await Promise.all([
      admin.from('profiles').select('id,role,franchise_id,is_active').eq('id', userData.user.id).single(),
      admin.from('applications').select('*').eq('id', applicationId).single(),
    ]);
    if (applicationError || !application) return Response.json({ error: 'Candidatura não encontrada.' }, { status: 404, headers: corsHeaders });
    const isAdmin = profile?.is_active && ['admin_master', 'redde_super_admin', 'redde_admin'].includes(profile.role);
    const isOwner = profile?.is_active && profile.role === 'franqueado' && profile.franchise_id === application.franchise_id;
    if (!isAdmin && !isOwner) return Response.json({ error: 'Sem permissão para analisar esta candidatura.' }, { status: 403, headers: corsHeaders });
    if (!application.resume_file_path) throw new Error('A candidatura não possui currículo anexado.');

    await admin.from('applications').update({
      resume_analysis_status: 'processing', resume_analysis_error: null, updated_at: new Date().toISOString(),
    }).eq('id', applicationId);

    const [{ data: job, error: jobError }, { data: project }] = await Promise.all([
      admin.from('jobs').select('*').eq('id', application.job_id).single(),
      admin.from('projects').select('id,title').eq('job_id', application.job_id).maybeSingle(),
    ]);
    if (jobError || !job) throw new Error('Vaga vinculada à candidatura não encontrada.');
    const { data: file, error: fileError } = await admin.storage.from('resumes').download(application.resume_file_path);
    if (fileError || !file) throw new Error('Não foi possível baixar o currículo privado.');
    if (file.size > 32 * 1024 * 1024) throw new Error('O currículo excede o limite de 32 MB para análise.');

    const mime = mimeFromPath(application.resume_file_path);
    const base64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
    const context = {
      project: project ?? null,
      job: {
        title: job.title, description: job.description, responsibilities: job.responsibilities,
        mandatory_requirements: job.requirements, desirable_requirements: job.desirable_requirements,
        education: job.education_level, location: [job.city, job.state].filter(Boolean).join('/'),
        modality: job.modality, salary: job.salary_range, salary_min: job.salary_min, salary_max: job.salary_max,
        work_schedule: job.work_schedule,
      },
      candidate_declared_data: {
        city: application.candidate_city, salary_expectation: application.salary_expectation,
        availability: application.availability, message: application.message,
      },
    };
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        input: [{
          role: 'user',
          content: [
            { type: 'input_file', filename: application.resume_file_path.split('/').pop() || 'curriculo', file_data: `data:${mime};base64,${base64}` },
            { type: 'input_text', text: `Analise o currículo contra a vaga. Não invente fatos. Ausência de informação deve ser registrada como ausência. Requisitos obrigatórios têm maior peso. Toda conclusão relevante precisa de evidência. O score apenas apoia a triagem humana. Contexto: ${JSON.stringify(context)}` },
          ],
        }],
        text: { format: { type: 'json_schema', name: 'candidate_resume_analysis', strict: true, schema: analysisSchema } },
      }),
    });
    const openAiPayload: unknown = await openAiResponse.json();
    if (!openAiResponse.ok) throw new Error('A OpenAI não conseguiu analisar o currículo neste momento.');
    const parsed: unknown = JSON.parse(responseText(openAiPayload));
    if (!validateResult(parsed)) throw new Error('A análise retornou um formato inválido.');

    const now = new Date().toISOString();
    const { error: saveError } = await admin.from('applications').update({
      resume_analysis: parsed.resume_analysis,
      ranking_details: parsed.ranking,
      ai_match_score: parsed.ranking.overall_score,
      match_score: parsed.ranking.overall_score,
      professional_summary: parsed.resume_analysis.professional_summary,
      skills: parsed.resume_analysis.skills,
      education: parsed.resume_analysis.education,
      experiences: parsed.resume_analysis.experiences,
      resume_analysis_status: 'completed', resume_analysis_error: null,
      resume_analyzed_at: now, ranking_generated_at: now, updated_at: now,
    }).eq('id', applicationId);
    if (saveError) throw saveError;
    return Response.json({ status: 'completed', score: parsed.ranking.overall_score }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada ao analisar o currículo.';
    if (applicationId) await admin.from('applications').update({
      resume_analysis_status: 'failed', resume_analysis_error: message, updated_at: new Date().toISOString(),
    }).eq('id', applicationId);
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
