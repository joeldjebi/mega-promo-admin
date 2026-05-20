import type { AuthError, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AdminProfile } from './auth-types'

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

export async function fetchAdminProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, is_active, avatar_url')
    .eq('id', userId)
    .maybeSingle<AdminProfile>()

  if (error) throw error
  return data
}

export function assertSuperAdmin(profile: AdminProfile | null) {
  if (!profile) {
    throw new AdminAuthError(
      'Aucun profil MegaPromo ne correspond à ce compte.',
    )
  }

  if (profile.role !== 'admin') {
    throw new AdminAuthError('Ce compte n’a pas les droits Super Admin.')
  }

  if (profile.is_active === false) {
    throw new AdminAuthError('Ce compte Super Admin est désactivé.')
  }

  return profile
}

export async function signInSuperAdmin(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new AdminAuthError(
      'Supabase n’est pas configuré. Ajoute les variables dans le fichier .env.',
    )
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw mapAuthError(error)

  const user = data.user
  if (!user) throw new AdminAuthError('Connexion impossible.')

  const profile = assertSuperAdmin(await fetchAdminProfile(user.id))
  return { user, profile }
}

export async function resolveSuperAdminSession(user: User | null) {
  if (!user) return null
  const profile = assertSuperAdmin(await fetchAdminProfile(user.id))
  return { user, profile }
}

export async function signOutSuperAdmin() {
  await supabase.auth.signOut()
}

function mapAuthError(error: AuthError) {
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return new AdminAuthError('Email ou mot de passe incorrect.')
  }

  return new AdminAuthError(error.message)
}
