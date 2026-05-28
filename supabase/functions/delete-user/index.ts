import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase env vars.' }, { status: 500, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return Response.json({ error: 'Missing authorization header.' }, { status: 401, headers: corsHeaders });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verifica se quem está chamando é um super admin ou admin Redde
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders });
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .single();

  if (callerError || !callerProfile?.is_active || !['redde_super_admin', 'redde_admin'].includes(callerProfile.role)) {
    return Response.json({ error: 'Forbidden.' }, { status: 403, headers: corsHeaders });
  }

  const { userId } = (await req.json()) as { userId: string };

  if (!userId) {
    return Response.json({ error: 'userId is required.' }, { status: 400, headers: corsHeaders });
  }

  // Impede que o próprio usuário se delete
  if (userId === user.id) {
    return Response.json({ error: 'Você não pode remover sua própria conta.' }, { status: 400, headers: corsHeaders });
  }

  // Verifica o perfil do usuário alvo para impedir deleção de super admins por admins comuns
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (targetProfile?.role === 'redde_super_admin' && callerProfile.role !== 'redde_super_admin') {
    return Response.json({ error: 'Apenas o administrador principal pode remover outros administradores principais.' }, { status: 403, headers: corsHeaders });
  }

  // Remove acessos de empresa vinculados
  await adminClient.from('company_user_access').delete().eq('user_id', userId);

  // Remove o perfil
  await adminClient.from('profiles').delete().eq('id', userId);

  // Remove o usuário da autenticação
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 400, headers: corsHeaders });
  }

  return Response.json({ success: true }, { headers: corsHeaders });
});
