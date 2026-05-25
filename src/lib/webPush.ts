import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { supabase } from './supabase'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null

function hasFirebaseWebConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  )
}

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig)
  }
  return firebaseApp
}

export async function registerWebPushToken(userId: string, context = 'web') {
  if (typeof window === 'undefined') return null

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!hasFirebaseWebConfig() || !vapidKey) {
    console.info(`[MegaPromo][FCM][${context}] configuration manquante`, {
      hasApiKey: Boolean(firebaseConfig.apiKey),
      hasProjectId: Boolean(firebaseConfig.projectId),
      hasMessagingSenderId: Boolean(firebaseConfig.messagingSenderId),
      hasAppId: Boolean(firebaseConfig.appId),
      hasVapidKey: Boolean(vapidKey),
    })
    return null
  }

  if (!('Notification' in window)) {
    console.info(`[MegaPromo][FCM][${context}] notifications non supportées`)
    return null
  }

  const supported = await isSupported()
  if (!supported) {
    console.info(`[MegaPromo][FCM][${context}] messaging non supporté`, {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecureContext: window.isSecureContext,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      hint:
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
          ? 'Vérifie le navigateur et la clé VAPID Firebase.'
          : 'FCM Web demande HTTPS, sauf sur localhost. Sur une IP locale comme 192.168.x.x, utilise HTTPS, ngrok, Cloudflare Tunnel ou localhost.',
    })
    return null
  }

  const permission = await Notification.requestPermission()
  console.info(`[MegaPromo][FCM][${context}] permission`, permission)
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
  )
  const messaging = getMessaging(getFirebaseApp())
  const fcmToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!fcmToken) {
    console.info(`[MegaPromo][FCM][${context}] token vide`)
    return null
  }

  const { error } = await supabase
    .from('users')
    .update({
      fcm_token: fcmToken,
      fcm_token_platform: 'web',
      fcm_token_updated_at: new Date().toISOString(),
      fcm_token_last_error: null,
      fcm_token_last_error_at: null,
    })
    .eq('id', userId)

  if (error) throw error

  console.info(`[MegaPromo][FCM][${context}] token enregistré`, {
    userId,
    tokenPreview: `${fcmToken.slice(0, 12)}...`,
  })
  return fcmToken
}

export function registerAdminWebPushToken(userId: string) {
  return registerWebPushToken(userId, 'admin-web')
}
