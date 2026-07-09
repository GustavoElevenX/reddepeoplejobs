import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

type CreateCompanyUserPayload = {
  fullName: string;
  email: string;
  password?: string;
  role:
    | 'admin_master'
    | 'franqueado'
    | 'empresa_cliente'
    | 'company_admin'
    | 'company_recruiter'
    | 'redde_admin';
  franchiseId?: string;
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

  if (
    callerError ||
    !callerProfile?.is_active ||
    !['admin_master', 'redde_super_admin', 'redde_admin'].includes(callerProfile.role)
  ) {
    return Response.json({ error: 'Forbidden.' }, { status: 403, headers: corsHeaders });
  }

  const payload = (await req.json()) as CreateCompanyUserPayload;
  const allowedRoles: CreateCompanyUserPayload['role'][] = [
    'admin_master',
    'franqueado',
    'empresa_cliente',
    'company_admin',
    'company_recruiter',
    'redde_admin',
  ];

  if (!payload.fullName?.trim() || !payload.email?.trim() || !allowedRoles.includes(payload.role)) {
    return Response.json({ error: 'Invalid user data.' }, { status: 400, headers: corsHeaders });
  }

  if (payload.role === 'franqueado' && !payload.franchiseId) {
    return Response.json({ error: 'franchiseId is required for franchise users.' }, { status: 400, headers: corsHeaders });
  }

  if (['empresa_cliente', 'company_admin', 'company_recruiter'].includes(payload.role) && !payload.companyId) {
    return Response.json({ error: 'companyId is required for company users.' }, { status: 400, headers: corsHeaders });
  }

  if (payload.franchiseId) {
    const { data: franchise } = await adminClient
      .from('franchises')
      .select('id')
      .eq('id', payload.franchiseId)
      .maybeSingle();
    if (!franchise) {
      return Response.json({ error: 'Franchise not found.' }, { status: 400, headers: corsHeaders });
    }
  }

  const password = payload.password ?? crypto.randomUUID();

  let createdUserId = '';
  let temporaryPassword: string | undefined = payload.password ? undefined : password;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName },
  });

  if (createError || !created.user) {
    if (!createError?.message?.toLowerCase().includes('already')) {
      return Response.json({ error: createError?.message ?? 'Could not create user.' }, { status: 400, headers: corsHeaders });
    }

    const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((item) => item.email?.toLowerCase() === payload.email.toLowerCase());
    if (listError || !existingUser) {
      return Response.json({ error: 'User already exists in Auth, but could not be loaded.' }, { status: 400, headers: corsHeaders });
    }
    createdUserId = existingUser.id;
    temporaryPassword = undefined;
  } else {
    createdUserId = created.user.id;
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: createdUserId,
    full_name: payload.fullName,
    email: payload.email,
    role: payload.role,
    franchise_id: payload.franchiseId ?? null,
    created_by: callerProfile.id,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });

  if (profileError) {
    if (created?.user) await adminClient.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 400, headers: corsHeaders });
  }

  if (payload.companyId && ['empresa_cliente', 'company_admin', 'company_recruiter'].includes(payload.role)) {
    const { error: accessError } = await adminClient.from('company_user_access').insert({
      user_id: createdUserId,
      company_id: payload.companyId,
      can_edit_company_page: payload.permissions?.can_edit_company_page ?? payload.role === 'company_admin',
      can_manage_jobs: payload.permissions?.can_manage_jobs ?? true,
      can_view_applications: payload.permissions?.can_view_applications ?? true,
      can_download_resumes: payload.permissions?.can_download_resumes ?? true,
      created_by: callerProfile.id,
    });

    if (accessError) {
      if (created?.user) await adminClient.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: accessError.message }, { status: 400, headers: corsHeaders });
    }
  }

  return Response.json(
    {
      userId: createdUserId,
      email: payload.email,
      temporaryPassword,
    },
    { headers: corsHeaders },
  );
});
