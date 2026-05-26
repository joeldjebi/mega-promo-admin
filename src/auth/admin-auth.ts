import type { AuthError, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { allAdminPermissionKeys } from '../features/adminAccess/permissions'
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
    .select('id, username, role, admin_role_id, is_active, avatar_url, admin_roles!users_admin_role_id_fkey(name)')
    .eq('id', userId)
    .maybeSingle<
      Omit<AdminProfile, 'permissions' | 'admin_role_name'> & {
        admin_roles?: { name?: string | null } | null
      }
    >()

  if (error) throw error
  if (!data) return null

  if (!data.admin_role_id) {
    return {
      ...data,
      admin_role_name: 'Super Admin',
      permissions: ['*'],
    }
  }

  const { data: permissionRows, error: permissionsError } = await supabase
    .from('admin_role_permissions')
    .select('permission_key')
    .eq('role_id', data.admin_role_id)

  if (permissionsError) throw permissionsError

  const permissions = (permissionRows ?? [])
    .map((row) => String(row.permission_key ?? '').trim())
    .filter(Boolean)

  return {
    ...data,
    admin_role_name: data.admin_roles?.name ?? null,
    permissions: permissions.includes('*')
      ? ['*', ...allAdminPermissionKeys]
      : permissions,
  }
}

export function adminRoleLabel(profile: AdminProfile | null) {
  if (!profile) return 'Admin'
  if (profile.admin_role_name?.trim()) return profile.admin_role_name.trim()
  if (profile.permissions.includes('*')) return 'Super Admin'
  const role = profile.role ?? 'admin'
  if (role === 'super_admin' || role === 'super-admin' || role === 'sa') {
    return 'Super Admin'
  }
  return role
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

export function assertSuperAdmin(profile: AdminProfile | null) {
  if (!profile) {
    throw new AdminAuthError(
      'Aucun profil MegaPromo ne correspond à ce compte.',
    )
  }

  if (!['admin', 'super_admin', 'super-admin', 'sa'].includes(profile.role ?? '')) {
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
