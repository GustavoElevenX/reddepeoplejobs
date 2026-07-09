import { getLocalStore, setCurrentLocalProfileId } from './localDb';
import { hasSupabaseConfig, supabase } from './supabase';
import type { Profile } from '../types';

async function getFranchiseAccessIssue(profile: Profile) {
  if (profile.role !== 'franqueado') return null;
  if (!profile.franchise_id) {
    return 'Este usuário de franqueado ainda não está vinculado a uma unidade. Entre como Admin Master, vá em Usuários e vincule o usuário a uma franquia ativa.';
  }
  if (!supabase) return 'Supabase não configurado.';

  const { data, error } = await supabase
    .from('franchises')
    .select('id, name, status')
    .eq('id', profile.franchise_id)
    .maybeSingle();

  if (error) return 'Não foi possível validar a unidade vinculada a este usuário.';
  if (!data) return 'A unidade vinculada a este usuário não foi encontrada.';
  if (data.status !== 'active') return `A unidade ${data.name} está inativa. Ative a unidade no Admin Master.`;
  return null;
}

export async function signIn(email: string, password: string) {
  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error('Login não retornou usuário.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    const currentProfile = profile as Profile;
    if (!currentProfile.is_active) {
      await supabase.auth.signOut();
      throw new Error('Este acesso está inativo. Fale com o Admin Master.');
    }

    const franchiseIssue = await getFranchiseAccessIssue(currentProfile);
    if (franchiseIssue) {
      await supabase.auth.signOut();
      throw new Error(franchiseIssue);
    }

    return currentProfile;
  }

  throw new Error('Supabase não configurado. Configure as variáveis de ambiente para usar o painel.');
}

export async function signOut() {
  if (hasSupabaseConfig && supabase) {
    await supabase.auth.signOut();
    return;
  }

  setCurrentLocalProfileId(null);
}

export async function getCurrentProfile() {
  if (hasSupabaseConfig && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    const profile = data as Profile;
    if (!profile.is_active || (await getFranchiseAccessIssue(profile))) {
      await supabase.auth.signOut();
      return null;
    }
    return profile;
  }

  return null;
}

export async function getCompanyAccessForCurrentUser() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('company_user_access')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  const store = getLocalStore();
  return store.access.find((item) => item.user_id === profile.id) ?? null;
}

export async function getCurrentFranchise() {
  const profile = await getCurrentProfile();
  if (!profile?.franchise_id) return null;

  if (hasSupabaseConfig && supabase) {
    const { data, error } = await supabase
      .from('franchises')
      .select('*')
      .eq('id', profile.franchise_id)
      .eq('status', 'active')
      .maybeSingle();
    if (error) return null;
    return data;
  }

  return (
    getLocalStore().franchises.find(
      (franchise) => franchise.id === profile.franchise_id && franchise.status === 'active',
    ) ?? null
  );
}

export function getAdminRedirectPath(profile: Profile) {
  if (['admin_master', 'redde_super_admin', 'redde_admin'].includes(profile.role)) {
    return '/admin/master';
  }

  if (profile.role === 'franqueado') {
    return '/admin/franqueado';
  }

  return '/admin/empresa';
}
