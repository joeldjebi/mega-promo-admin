import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useLocation } from 'react-router-dom'
import {
  adminPermissionDeniedEvent,
  isSupabaseConfigured,
  setSupabaseAdminPermissions,
  supabase,
} from '../lib/supabase'
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
  const [permissionPopup, setPermissionPopup] = useState<{
    feature: string
    label: string
  } | null>(null)
  const isPartnerArea =
    location.pathname === '/' ||
    location.pathname === '/partner' ||
    location.pathname.startsWith('/auth/partner')

  const loadSession = useCallback(async () => {
    if (isPartnerArea) {
      setUser(null)
      setProfile(null)
      setSupabaseAdminPermissions(null)
      setStatus('unauthenticated')
      return
    }

    if (!isSupabaseConfigured) {
      setUser(null)
      setProfile(null)
      setSupabaseAdminPermissions(null)
      setStatus('unauthenticated')
      return
    }

    setStatus('loading')
    try {
      const { data } = await supabase.auth.getSession()
      const resolved = await resolveSuperAdminSession(data.session?.user ?? null)
      setUser(resolved?.user ?? null)
      setProfile(resolved?.profile ?? null)
      setSupabaseAdminPermissions(resolved?.profile?.permissions ?? null)
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
      setSupabaseAdminPermissions(null)
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
          setSupabaseAdminPermissions(resolved?.profile?.permissions ?? null)
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
          setSupabaseAdminPermissions(null)
          setStatus('unauthenticated')
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [isPartnerArea, loadSession])

  useEffect(() => {
    function handlePermissionDenied(event: Event) {
      const detail = (event as CustomEvent<{
        feature?: string
        label?: string
      }>).detail
      setPermissionPopup({
        feature: detail?.feature ?? '',
        label: detail?.label ?? '',
      })
    }

    window.addEventListener(adminPermissionDeniedEvent, handlePermissionDenied)
    return () => {
      window.removeEventListener(
        adminPermissionDeniedEvent,
        handlePermissionDenied,
      )
    }
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status,
      user,
      profile,
      login: async (email, password) => {
        const result = await signInSuperAdmin(email, password)
        setUser(result.user)
        setProfile(result.profile)
        setSupabaseAdminPermissions(result.profile.permissions)
        setStatus('authenticated')
        void registerAdminWebPushToken(result.user.id).catch((error) => {
          console.warn('[MegaPromo][FCM][web] token non enregistré', error)
        })
      },
      logout: async () => {
        await signOutSuperAdmin()
        setUser(null)
        setProfile(null)
        setSupabaseAdminPermissions(null)
        setStatus('unauthenticated')
      },
      refresh: loadSession,
    }),
    [loadSession, profile, status, user],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
      {permissionPopup ? (
        <div
          className="modal-backdrop permission-denied-backdrop"
          role="presentation"
          onClick={() => setPermissionPopup(null)}
        >
          <section
            aria-labelledby="permission-denied-title"
            aria-modal="true"
            className="category-modal permission-denied-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="permission-denied-icon">!</div>
            <div>
              <p className="eyebrow">Accès refusé</p>
              <h2 id="permission-denied-title">
                Autorisations insuffisantes
              </h2>
              <p>
                Ton rôle permet la consultation, mais pas la création, la
                modification ou la suppression sur ce module.
              </p>
              {permissionPopup.feature ? (
                <small>
                  Permission requise: {permissionPopup.feature}.write
                </small>
              ) : null}
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => setPermissionPopup(null)}
              >
                Compris
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AdminAuthContext.Provider>
  )
}
