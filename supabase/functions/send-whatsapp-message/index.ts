import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { getWhatsAppProvider } from '../_shared/whatsapp-provider.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return Response.json({ error: 'Backend incompleto.' }, { status: 500, headers });
  const authorization = req.headers.get('Authorization');
  if (!authorization) return Response.json({ error: 'Autenticação obrigatória.' }, { status: 401, headers });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return Response.json({ error: 'Sessão inválida.' }, { status: 401, headers });
  const admin = createClient(url, service);
  const { conversationId, body } = await req.json() as { conversationId?: unknown; body?: unknown };
  if (typeof conversationId !== 'string' || typeof body !== 'string' || !body.trim()) return Response.json({ error: 'Mensagem inválida.' }, { status: 400, headers });
  const [{ data: profile }, { data: conversation }] = await Promise.all([
    admin.from('profiles').select('role,franchise_id,is_active').eq('id', userData.user.id).single(),
    admin.from('chat_conversations').select('*').eq('id', conversationId).single(),
  ]);
  const authorized = profile?.is_active && (['admin_master', 'redde_super_admin', 'redde_admin'].includes(profile.role)
    || (profile.role === 'franqueado' && profile.franchise_id === conversation?.franchise_id));
  if (!authorized || !conversation) return Response.json({ error: 'Sem permissão.' }, { status: 403, headers });
  const provider = getWhatsAppProvider();
  if (!provider) {
    const { data: message } = await admin.from('chat_messages').insert({
      conversation_id: conversation.id, franchise_id: conversation.franchise_id, client_id: conversation.client_id,
      project_id: conversation.project_id, application_id: conversation.application_id, sender: 'franchise', body: body.trim(),
      provider: 'manual_external', direction: 'outbound', delivery_status: 'queued',
      error_message: 'WhatsApp não configurado; envio deve ser feito externamente.',
    }).select('*').single();
    return Response.json({ status: 'not_configured', fallback: 'wa.me', message }, { headers });
  }
  if (!conversation.contact_phone) return Response.json({ error: 'Conversa sem telefone.' }, { status: 400, headers });
  const result = await provider.sendMessage({ to: conversation.contact_phone, body: body.trim() });
  const { data: message } = await admin.from('chat_messages').insert({
    conversation_id: conversation.id, franchise_id: conversation.franchise_id, client_id: conversation.client_id,
    project_id: conversation.project_id, application_id: conversation.application_id, sender: 'franchise', body: body.trim(),
    provider: conversation.provider, provider_message_id: result.providerMessageId, direction: 'outbound',
    delivery_status: result.status, sent_at: result.status === 'sent' ? new Date().toISOString() : null,
  }).select('*').single();
  return Response.json({ status: result.status, message }, { headers });
});
