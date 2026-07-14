import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BriefingPayload = Record<string, string>;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const { briefing } = (await req.json()) as { briefing: BriefingPayload };

    if (!apiKey) return Response.json(
      { error: 'OPENAI_API_KEY não configurada. A Recruitfy não gera descrições simuladas.' },
      { status: 503, headers: corsHeaders },
    );

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

    if (!response.ok) return Response.json(
      { error: 'A OpenAI não conseguiu gerar a descrição da vaga.' },
      { status: 502, headers: corsHeaders },
    );

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('A OpenAI retornou uma resposta vazia.');
    const parsed = JSON.parse(raw);
    return Response.json({ content: parsed, provider: 'openai' }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, { status: 500, headers: corsHeaders });
  }
});
