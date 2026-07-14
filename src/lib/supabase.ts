import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Recruitfy exige VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. O modo local com dados simulados foi removido.',
  );
}

export const hasSupabaseConfig = true as const;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function requireSupabase() {
  return supabase;
}
