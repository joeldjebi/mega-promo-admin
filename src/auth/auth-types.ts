export type AdminProfile = {
  id: string
  username: string | null
  role: string | null
  admin_role_id: string | null
  admin_role_name: string | null
  is_active: boolean | null
  avatar_url: string | null
  permissions: string[]
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
