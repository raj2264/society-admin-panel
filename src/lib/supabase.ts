import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type CookieOptions } from '@supabase/ssr';

// Create a single instance of the Supabase client for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabaseCookieName() {
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  return `sb-${projectId}-auth-token`;
}

// Create a singleton instance
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'society_admin_auth_token',
      },
      cookieOptions: {
        name: getSupabaseCookieName(),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    });
  }
  return supabaseInstance;
};

// Export the singleton instance
export const supabase = getSupabaseClient();

// Export a function to create a server-side client
export const createServerClient = (cookieStore: any) => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
};

// Types for our database models
export type Society = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
};

export type SocietyAdmin = {
  id: string;
  user_id: string;
  society_id: string;
  username: string;
  created_at: string;
  updated_at: string;
};

// Guard type definition
export type Guard = {
  id: string;
  user_id: string;
  society_id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}; 