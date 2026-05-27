import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type CreateCompanyUserPayload = {
  fullName: string;
  email: string;
  password?: string;
  role: 'company_admin' | 'company_recruiter' | 'redde_admin';
  companyId?: string;
  permissions?: {
    can_edit_company_page?: boolean;
    can_manage_jobs?: boolean;
    can_view_applications?: boolean;
    can_download_resumes?: boolean;
  };
};

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

  const payload = (await req.json()) as CreateCompanyUserPayload;
  const password = payload.password ?? crypto.randomUUID();

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName },
  });

  if (createError || !created.user) {
    return Response.json({ error: createError?.message ?? 'Could not create user.' }, { status: 400, headers: corsHeaders });
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: created.user.id,
    full_name: payload.fullName,
    email: payload.email,
    role: payload.role,
    created_by: callerProfile.id,
  });

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400, headers: corsHeaders });
  }

  if (payload.companyId && payload.role !== 'redde_admin') {
    const { error: accessError } = await adminClient.from('company_user_access').insert({
      user_id: created.user.id,
      company_id: payload.companyId,
      can_edit_company_page: payload.permissions?.can_edit_company_page ?? payload.role === 'company_admin',
      can_manage_jobs: payload.permissions?.can_manage_jobs ?? true,
      can_view_applications: payload.permissions?.can_view_applications ?? true,
      can_download_resumes: payload.permissions?.can_download_resumes ?? true,
      created_by: callerProfile.id,
    });

    if (accessError) {
      return Response.json({ error: accessError.message }, { status: 400, headers: corsHeaders });
    }
  }

  return Response.json(
    {
      userId: created.user.id,
      email: payload.email,
      temporaryPasswordReturnedOnlyIfProvided: payload.password ? undefined : password,
    },
    { headers: corsHeaders },
  );
});
