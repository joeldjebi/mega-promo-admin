import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AdminProfile, AuthStatus } from './auth-types'

export type AdminAuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: AdminProfile | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
