import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useLocation } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { registerAdminWebPushToken } from '../lib/webPush'
import {
  resolveSuperAdminSession,
  signInSuperAdmin,
  signOutSuperAdmin,
} from './admin-auth'
import type { AdminProfile, AuthStatus } from './auth-types'
import { AdminAuthContext } from './admin-auth-context'
import type { AdminAuthContextValue } from './admin-auth-context'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const isPartnerArea =
    location.pathname === '/' ||
    location.pathname === '/partner' ||
    location.pathname.startsWith('/auth/partner')

  const loadSession = useCallback(async () => {
    if (isPartnerArea) {
      setUser(null)
      setProfile(null)
      setStatus('unauthenticated')
      return
    }

    if (!isSupabaseConfigured) {
      setUser(null)
      setProfile(null)
      setStatus('unauthenticated')
      return
    }

    setStatus('loading')
    try {
      const { data } = await supabase.auth.getSession()
      const resolved = await resolveSuperAdminSession(data.session?.user ?? null)
      setUser(resolved?.user ?? null)
      setProfile(resolved?.profile ?? null)
      setStatus(resolved ? 'authenticated' : 'unauthenticated')
      if (resolved?.user) {
        void registerAdminWebPushToken(resolved.user.id).catch((error) => {
          console.warn('[MegaPromo][FCM][web] token non enregistré', error)
        })
      }
    } catch (error) {
      console.warn('[MegaPromo][SA Auth] session rejected', error)
      setUser(null)
      setProfile(null)
      setStatus('unauthenticated')
    }
  }, [isPartnerArea])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession()

    if (!isSupabaseConfigured || isPartnerArea) return undefined

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          const resolved = await resolveSuperAdminSession(session?.user ?? null)
          setUser(resolved?.user ?? null)
          setProfile(resolved?.profile ?? null)
          setStatus(resolved ? 'authenticated' : 'unauthenticated')
          if (resolved?.user) {
            void registerAdminWebPushToken(resolved.user.id).catch((error) => {
              console.warn('[MegaPromo][FCM][web] token non enregistré', error)
            })
          }
        } catch (error) {
          console.warn('[MegaPromo][SA Auth] auth state rejected', error)
          setUser(null)
          setProfile(null)
          setStatus('unauthenticated')
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [isPartnerArea, loadSession])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status,
      user,
      profile,
      login: async (email, password) => {
        const result = await signInSuperAdmin(email, password)
        setUser(result.user)
        setProfile(result.profile)
        setStatus('authenticated')
        void registerAdminWebPushToken(result.user.id).catch((error) => {
          console.warn('[MegaPromo][FCM][web] token non enregistré', error)
        })
      },
      logout: async () => {
        await signOutSuperAdmin()
        setUser(null)
        setProfile(null)
        setStatus('unauthenticated')
      },
      refresh: loadSession,
    }),
    [loadSession, profile, status, user],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
