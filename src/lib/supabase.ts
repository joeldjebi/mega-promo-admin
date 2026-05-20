import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'placeholder-anon-key'

if (!isSupabaseConfigured) {
  console.warn(
    '[MegaPromo][Supabase] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes.',
  )
}

export const supabase = createClient(
  supabaseUrl ?? fallbackSupabaseUrl,
  supabaseAnonKey ?? fallbackSupabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
)
