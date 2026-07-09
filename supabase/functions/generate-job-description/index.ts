import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BriefingPayload = Record<string, string>;

function fallbackContent(briefing: BriefingPayload) {
  return {
    title: briefing.title || `Vaga em ${briefing.companyName || 'empresa parceira'}`,
    summary: `${briefing.companyName || 'Empresa parceira'} busca profissional para ${briefing.title || 'nova oportunidade'}, em modelo ${briefing.modality || 'presencial'}.`,
    responsibilities:
      briefing.responsibilities ||
      'Executar as atividades da funcao, apoiar a rotina da area e garantir entregas alinhadas aos objetivos da empresa.',
    mandatoryRequirements:
      briefing.mandatoryRequirements ||
      [briefing.minimumExperience, briefing.education, briefing.technicalSkills].filter(Boolean).join('\n') ||
      'Experiencia compativel com a funcao e disponibilidade para participar das etapas do processo.',
    desirableRequirements: briefing.desirableRequirements || briefing.behavioralSkills || 'Boa comunicacao, organizacao e foco em resultados.',
    benefits: briefing.benefits || 'Beneficios serao apresentados durante o processo.',
    schedule: briefing.schedule || 'Jornada a combinar',
    modality: briefing.modality || 'presencial',
    location: briefing.cityNeighborhood || briefing.workLocation || '',
    applicationInstructions: 'Candidate-se pela plataforma People Jobs com seus dados atualizados e curriculo em anexo.',
    suggestedQuestions: [
      'Descreva sua experiencia mais aderente a esta vaga.',
      'Qual sua disponibilidade de inicio?',
      'Qual sua pretensao salarial?',
    ],
    rankingCriteria: [
      'Experiencia aderente aos requisitos obrigatorios',
      'Conhecimentos tecnicos',
      'Disponibilidade',
      'Localizacao',
      'Pretensao salarial',
    ],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const { briefing } = (await req.json()) as { briefing: BriefingPayload };

    if (!apiKey) {
      return Response.json({ content: fallbackContent(briefing), provider: 'local' }, { headers: corsHeaders });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Voce gera descricoes profissionais de vagas para recrutamento no Brasil. Responda somente JSON valido com as chaves solicitadas.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              briefing,
              outputShape: {
                title: 'string',
                summary: 'string',
                responsibilities: 'string com linhas separadas por \\n',
                mandatoryRequirements: 'string com linhas separadas por \\n',
                desirableRequirements: 'string com linhas separadas por \\n',
                benefits: 'string com linhas separadas por \\n',
                schedule: 'string',
                modality: 'presencial|hibrido|remoto',
                location: 'string',
                applicationInstructions: 'string',
                suggestedQuestions: ['string'],
                rankingCriteria: ['string'],
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ content: fallbackContent(briefing), provider: 'local' }, { headers: corsHeaders });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : fallbackContent(briefing);
    return Response.json({ content: parsed, provider: 'openai' }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, { status: 500, headers: corsHeaders });
  }
});
