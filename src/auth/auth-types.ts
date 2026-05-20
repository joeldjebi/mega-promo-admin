export type AdminProfile = {
  id: string
  username: string | null
  role: string | null
  is_active: boolean | null
  avatar_url: string | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
