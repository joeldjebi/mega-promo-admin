import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PushPayload = {
  userIds?: string[]
  audience?: 'admins' | 'players'
  title: string
  body: string
  type?: string
  data?: Record<string, unknown>
  platforms?: Array<'ios' | 'android' | 'web' | 'unknown'>
}

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id: string
}

const iosBundleId = Deno.env.get('FCM_IOS_BUNDLE_ID') ?? 'com.moyoo.megapromoios'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n')
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

async function createAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claimSet),
  )}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(normalizePrivateKey(serviceAccount.private_key)),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  )
  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const tokenPayload = await response.json()
  if (!response.ok || !tokenPayload.access_token) {
    throw new Error(
      `Impossible de récupérer le token Firebase: ${JSON.stringify(tokenPayload)}`,
    )
  }
  return tokenPayload.access_token as string
}

function getServiceAccount(): ServiceAccount {
  const rawJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as ServiceAccount
    if (parsed.client_email && parsed.private_key && parsed.project_id) return parsed
  }

  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(
      'Secrets Firebase manquants: FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID.',
    )
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
    project_id: projectId,
  }
}

function stringifyData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? '')]),
  )
}

function tokenPreview(token: string) {
  if (token.length <= 18) return token
  return `${token.slice(0, 10)}...${token.slice(-6)}`
}

function firebaseFailureSummary(response: unknown) {
  if (!response || typeof response !== 'object') return 'Erreur Firebase inconnue.'

  const payload = response as {
    error?: {
      code?: number
      status?: string
      message?: string
      details?: Array<{
        errorCode?: string
      }>
    }
  }
  const error = payload.error
  if (!error) return JSON.stringify(response).slice(0, 300)

  const errorCode = error.details?.find((detail) => detail.errorCode)?.errorCode
  return [errorCode, error.status, error.message]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

async function logSystemEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    level?: 'info' | 'warning' | 'error'
    action: string
    message: string
    userId?: string | null
    adminId?: string | null
    entityType?: string | null
    entityId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  try {
    await supabaseAdmin.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: 'edge_function',
      p_feature: 'push',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: payload.userId ?? null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: payload.entityType ?? null,
      p_entity_id: payload.entityId ?? null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/send-push-notifications',
    })
  } catch (error) {
    console.warn('[MegaPromo][push][systemLogFailed]', error)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Missing Supabase configuration' }, 500)
  }

  const authorization = request.headers.get('Authorization') ?? ''
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const token = authorization.replace('Bearer ', '')
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token)

  if (authError || !authData.user) {
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'unauthorized',
      message: 'Appel non autorise de la fonction push.',
      metadata: { reason: authError?.message ?? 'missing_user' },
    })
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  const payload = (await request.json()) as PushPayload
  const title = payload.title?.trim()
  const body = payload.body?.trim()

  if (!title || !body) {
    return jsonResponse({ ok: false, error: 'Titre et message requis.' }, 400)
  }

  console.log('[MegaPromo][push] payload', {
    audience: payload.audience ?? 'users',
    userIdsCount: payload.userIds?.length ?? 0,
    title,
    bodyLength: body.length,
    type: payload.type ?? 'info',
    data: payload.data ?? {},
    platforms: payload.platforms ?? ['ios', 'android'],
  })

  let targetQuery = supabaseAdmin
    .from('users')
    .select('id, fcm_token, fcm_token_platform, role, is_active')
    .not('fcm_token', 'is', null)
    .eq('is_active', true)

  const targetPlatforms = Array.from(
    new Set(payload.platforms?.length ? payload.platforms : ['ios', 'android']),
  )
  targetQuery = targetQuery.in('fcm_token_platform', targetPlatforms)

  if (payload.audience === 'admins') {
    targetQuery = targetQuery.in('role', ['admin', 'super-admin', 'super_admin'])
  } else if (payload.audience === 'players') {
    targetQuery = targetQuery.eq('role', 'player')
  } else {
    const userIds = Array.from(new Set(payload.userIds ?? [])).filter(Boolean)
    if (userIds.length === 0) {
      return jsonResponse({ ok: false, error: 'Aucun destinataire.' }, 400)
    }
    targetQuery = targetQuery.in('id', userIds)
  }

  const { data: users, error: usersError } = await targetQuery.limit(5000)
  if (usersError) {
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'resolve_targets_failed',
      message: 'Echec resolution destinataires push.',
      adminId: authData.user.id,
      metadata: { error: usersError.message, type: payload.type ?? 'info' },
    })
    return jsonResponse({ ok: false, error: usersError.message }, 500)
  }

  const tokens = Array.from(
    new Set(
      (users ?? [])
        .map((user) => user.fcm_token as string | null)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  console.log('[MegaPromo][push] targets', {
    users: users?.length ?? 0,
    tokens: tokens.length,
    platforms: targetPlatforms,
    tokenSamples: tokens.slice(0, 5).map(tokenPreview),
  })

  if (tokens.length === 0) {
    const response = {
      ok: true,
      sent: 0,
      failed: 0,
      targetUsers: users?.length ?? 0,
      message:
        users?.length === 0
          ? `Aucun joueur actif avec fcm_token mobile (${targetPlatforms.join(', ')}).`
          : 'Aucun fcm_token trouvé pour la cible.',
    }
    console.log('[MegaPromo][push] response', response)
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'no_tokens',
      message: 'Push prepare sans token FCM disponible.',
      adminId: authData.user.id,
      metadata: {
        type: payload.type ?? 'info',
        target_users: users?.length ?? 0,
        platforms: targetPlatforms,
        audience: payload.audience ?? 'users',
      },
    })
    return jsonResponse(response)
  }

  try {
    const serviceAccount = getServiceAccount()
    console.log('[MegaPromo][push] firebase project', {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
    })
    const accessToken = await createAccessToken(serviceAccount)
    const data = stringifyData({
      ...(payload.data ?? {}),
      type: payload.type ?? 'info',
      title,
      body,
    })
    const tokenOwners = new Map<string, string[]>()
    for (const user of users ?? []) {
      const fcmToken = user.fcm_token as string | null
      if (!fcmToken) continue
      tokenOwners.set(fcmToken, [...(tokenOwners.get(fcmToken) ?? []), user.id as string])
    }

    const results = await Promise.all(
      tokens.map(async (fcmToken) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: fcmToken,
                notification: { title, body },
                data,
                android: {
                  priority: 'HIGH',
                  notification: {
                    sound: 'default',
                    channel_id: 'mega_promo_push',
                  },
                },
                apns: {
                  headers: {
                    'apns-push-type': 'alert',
                    'apns-priority': '10',
                    'apns-topic': iosBundleId,
                  },
                  payload: {
                    aps: {
                      alert: { title, body },
                      sound: 'default',
                      badge: 1,
                    },
                  },
                },
              },
            }),
          },
        )
        const responsePayload = await response.json()
        if (!response.ok) {
          const ownerIds = tokenOwners.get(fcmToken) ?? []
          await Promise.all(
            ownerIds.map((userId) =>
              supabaseAdmin
                .from('users')
                .update({
                  fcm_token_last_error: JSON.stringify(responsePayload).slice(0, 1000),
                  fcm_token_last_error_at: new Date().toISOString(),
                })
                .eq('id', userId),
            ),
          )
        }
        return {
          ok: response.ok,
          status: response.status,
          token: tokenPreview(fcmToken),
          summary: response.ok
            ? 'Envoyé'
            : firebaseFailureSummary(responsePayload),
          response: responsePayload,
        }
      }),
    )
    const sent = results.filter((result) => result.ok).length
    const failed = results.length - sent
    const response = {
      ok: failed === 0,
      sent,
      failed,
      targetUsers: users?.length ?? 0,
      failedSamples: results.filter((result) => !result.ok).slice(0, 10),
      results,
    }
    console.log('[MegaPromo][push] response', response)
    await logSystemEvent(supabaseAdmin, {
      level: failed === 0 ? 'info' : 'warning',
      action: 'send_batch',
      message: 'Traitement push mobile termine.',
      adminId: authData.user.id,
      metadata: {
        type: payload.type ?? 'info',
        sent,
        failed,
        target_users: users?.length ?? 0,
        tokens: tokens.length,
        platforms: targetPlatforms,
        failed_samples: response.failedSamples?.map((sample) => sample.summary),
      },
    })
    return jsonResponse(response)
  } catch (error) {
    const response = {
      ok: false,
      sent: 0,
      failed: tokens.length,
      error: error instanceof Error ? error.message : 'Push impossible.',
    }
    console.error('[MegaPromo][push] response', response)
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'send_batch_failed',
      message: 'Echec traitement push mobile.',
      adminId: authData.user.id,
      metadata: {
        type: payload.type ?? 'info',
        failed: tokens.length,
        error: response.error,
      },
    })
    return jsonResponse(response, 500)
  }
})
