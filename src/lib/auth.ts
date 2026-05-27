import { getLocalStore, getCurrentLocalProfileId, setCurrentLocalProfileId } from './localDb';
import { hasSupabaseConfig, supabase } from './supabase';
import type { Profile } from '../types';

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
    return profile as Profile;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const store = getLocalStore();
  const profile =
    store.profiles.find((item) => item.email.toLowerCase() === normalizedEmail) ?? store.profiles[0];

  setCurrentLocalProfileId(profile.id);
  return profile;
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
    return data as Profile;
  }

  const profileId = getCurrentLocalProfileId();
  if (!profileId) return null;
  return getLocalStore().profiles.find((profile) => profile.id === profileId) ?? null;
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

export function getAdminRedirectPath(profile: Profile) {
  if (profile.role === 'redde_super_admin' || profile.role === 'redde_admin') {
    return '/admin/redde';
  }

  return '/admin/empresa';
}
