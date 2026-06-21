import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { landingStyle } from './landingStyles'

type StoreLinks = {
  androidStoreUrl: string
  iosStoreUrl: string
}

type DeviceTarget = 'android' | 'ios' | 'desktop'

function detectDeviceTarget(): DeviceTarget {
  if (typeof window === 'undefined') return 'desktop'

  const userAgent = window.navigator.userAgent || ''
  const platform = window.navigator.platform || ''
  const isAndroid = /Android/i.test(userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const isIPadOS = /Mac/i.test(platform) && window.navigator.maxTouchPoints > 1

  if (isAndroid) return 'android'
  if (isIOS || isIPadOS) return 'ios'
  return 'desktop'
}

async function fetchStoreLinks(): Promise<StoreLinks> {
  const { data, error } = await supabase.rpc('get_public_app_store_links')
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return {
    androidStoreUrl: (row?.android_store_url as string | null) ?? '',
    iosStoreUrl: (row?.ios_store_url as string | null) ?? '',
  }
}

function redirectTo(url: string) {
  window.location.replace(url)
}

export function StoreRedirectPage() {
  const [error, setError] = useState('')
  const target = useMemo(detectDeviceTarget, [])

  useEffect(() => {
    let cancelled = false

    async function redirect() {
      if (target === 'desktop') {
        redirectTo('/')
        return
      }

      try {
        const links = await fetchStoreLinks()
        if (cancelled) return

        const storeUrl = target === 'android'
          ? links.androidStoreUrl.trim()
          : links.iosStoreUrl.trim()

        redirectTo(storeUrl || '/')
      } catch (unknownError) {
        console.warn('[MegaPromo][store-redirect] unavailable', unknownError)
        if (!cancelled) {
          setError('Impossible de récupérer le lien du store pour le moment.')
          window.setTimeout(() => redirectTo('/'), 1800)
        }
      }
    }

    void redirect()

    return () => {
      cancelled = true
    }
  }, [target])

  const label = target === 'android'
    ? 'Google Play'
    : target === 'ios'
      ? 'App Store'
      : 'MegaPromo'

  return (
    <main className="lp-page">
      <style>{landingStyle}</style>
      <section className="lp-maintenance-page">
        <div className="lp-maintenance-card">
          <img src="/megapromologo.png" alt="MegaPromo" className="lp-maintenance-logo" />
          <span className="lp-maintenance-badge">Redirection</span>
          <h1>Ouverture de {label}</h1>
          <p>Nous te redirigeons automatiquement vers le bon endroit.</p>
          {error ? <p>{error}</p> : null}
          <div className="lp-maintenance-actions">
            <a className="lp-button outline" href="/">Retour à l’accueil</a>
          </div>
        </div>
      </section>
    </main>
  )
}
