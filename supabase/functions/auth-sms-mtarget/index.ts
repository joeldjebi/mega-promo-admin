import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

type AuthSmsPayload = {
  user?: {
    phone?: string
  }
  sms?: {
    otp?: string
    message?: string
  }
}

type OtpDeliveryChannel = 'sms' | 'whatsapp'

const resendDelaysSeconds = [180, 300, 1800]
const supportUrl = 'https://megapromo.app/#contact'

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

function normalizePhone(value: string) {
  let phone = value.trim().replace(/[\s().-]/g, '')
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`
  if (!phone.startsWith('+')) phone = `+${phone}`
  return phone
}

function normalizePhoneDigits(value: string) {
  return normalizePhone(value).replace(/\D/g, '')
}

function getSupabaseAdminConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return null
  return { supabaseUrl, serviceRoleKey }
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getReviewOtpConfig() {
  return {
    phoneDigits: normalizePhoneDigits(
      Deno.env.get('APP_REVIEW_OTP_PHONE') ?? '+2250700000000',
    ),
    code: Deno.env.get('APP_REVIEW_OTP_CODE') ?? '260493',
  }
}

async function sendMtargetSms(msisdn: string, message: string, sender: string) {
  const url = Deno.env.get('MTARGET_URL') ?? 'https://api-public-2.mtarget.fr/messages'
  const username = Deno.env.get('MTARGET_USERNAME')
  const password = Deno.env.get('MTARGET_PASSWORD')

  if (!username || !password) {
    throw new Error('Secrets mTarget manquants: MTARGET_USERNAME/MTARGET_PASSWORD.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username,
      password,
      msisdn,
      msg: message,
      sender,
    }),
  })
  const text = await response.text()

  return {
    ok: response.ok,
    status: response.status,
    response: text,
  }
}

async function readOtpDeliveryChannel(): Promise<OtpDeliveryChannel> {
  const config = getSupabaseAdminConfig()

  if (!config) return 'sms'

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/app_feature_flags?key=eq.otp_delivery_channel&select=is_enabled,metadata`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    },
  )
  if (!response.ok) return 'sms'

  const rows = await response.json() as Array<{
    is_enabled?: boolean
    metadata?: { channel?: string }
  }>
  const row = rows[0]
  if (!row?.is_enabled) return 'sms'

  return row.metadata?.channel === 'whatsapp' ? 'whatsapp' : 'sms'
}

async function enforceOtpResendDelay(msisdn: string) {
  const config = getSupabaseAdminConfig()
  if (!config) return { allowed: true, phoneHash: '' }

  const salt = Deno.env.get('OTP_RATE_LIMIT_SALT') ?? config.serviceRoleKey
  const phoneHash = await sha256Hex(`${salt}:${normalizePhoneDigits(msisdn)}`)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const url =
    `${config.supabaseUrl}/rest/v1/auth_otp_delivery_attempts` +
    `?phone_hash=eq.${phoneHash}` +
    `&created_at=gte.${encodeURIComponent(since)}` +
    '&select=created_at&order=created_at.desc&limit=5'

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  })

  if (!response.ok) {
    console.warn('[MegaPromo][auth-sms-mtarget] rate limit skipped', {
      status: response.status,
      body: await response.text(),
    })
    return { allowed: true, phoneHash }
  }

  const attempts = await response.json() as Array<{ created_at?: string }>
  if (attempts.length >= 4) {
    return {
      allowed: false,
      phoneHash,
      status: 429,
      message:
        `Trop de codes demandés. Contacte le service client MegaPromo: ${supportUrl}`,
    }
  }

  const nextDelay = resendDelaysSeconds[attempts.length - 1] ?? 0
  const lastAttemptAt = attempts[0]?.created_at
    ? new Date(attempts[0].created_at).getTime()
    : 0
  const elapsedSeconds = lastAttemptAt <= 0
    ? Number.POSITIVE_INFINITY
    : Math.floor((Date.now() - lastAttemptAt) / 1000)

  if (nextDelay > 0 && elapsedSeconds < nextDelay) {
    return {
      allowed: false,
      phoneHash,
      status: 429,
      message: `Patiente encore ${nextDelay - elapsedSeconds}s avant de renvoyer le code.`,
    }
  }

  return { allowed: true, phoneHash }
}

async function recordOtpDeliveryAttempt(
  phoneHash: string,
  channel: OtpDeliveryChannel,
  status: number,
  ok: boolean,
) {
  const config = getSupabaseAdminConfig()
  if (!config || !phoneHash) return

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/auth_otp_delivery_attempts`,
    {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        phone_hash: phoneHash,
        channel,
        provider_status: status,
        delivered: ok,
      }),
    },
  )

  if (!response.ok) {
    console.warn('[MegaPromo][auth-sms-mtarget] attempt log failed', {
      status: response.status,
      body: await response.text(),
    })
  }
}

async function sendWasenderWhatsApp(to: string, text: string) {
  const token = Deno.env.get('WASENDER_API_TOKEN')
  const url =
    Deno.env.get('WASENDER_API_URL') ??
    'https://wasenderapi.com/api/send-message'

  if (!token) {
    throw new Error('Secret Wasender manquant: WASENDER_API_TOKEN.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, text }),
  })
  const body = await response.text()

  return {
    ok: response.ok,
    status: response.status,
    response: body,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')
    if (!hookSecret) {
      return jsonResponse(
        {
          error: {
            http_code: 500,
            message: 'Secret SEND_SMS_HOOK_SECRET manquant.',
          },
        },
        500,
      )
    }

    const rawPayload = await request.text()
    const headers = Object.fromEntries(request.headers)
    const webhook = new Webhook(hookSecret.replace('v1,whsec_', ''))
    const payload = webhook.verify(rawPayload, headers) as AuthSmsPayload
    const phone = payload.user?.phone
    const otp = payload.sms?.otp
    const sender = (Deno.env.get('MTARGET_AUTH_SENDER') || Deno.env.get('MTARGET_SENDER') || 'MEGAPROMO')
      .slice(0, 20)

    if (!phone || !otp) {
      return jsonResponse({ ok: false, error: 'Payload Auth SMS incomplet.' }, 400)
    }

    const msisdn = normalizePhone(phone)
    const reviewOtp = getReviewOtpConfig()
    const isReviewPhone = normalizePhoneDigits(msisdn) === reviewOtp.phoneDigits
    const template =
      Deno.env.get('MTARGET_AUTH_MESSAGE_TEMPLATE') ??
      'Ton code MegaPromo est {{ otp }}. Ne le partage avec personne.'
    const smsMessage = template.replaceAll('{{ otp }}', otp)
    const whatsappTemplate =
      Deno.env.get('WASENDER_AUTH_MESSAGE_TEMPLATE') ??
      'Votre code MegaPromo est : {{ otp }}\n\nCe code expire dans 5 minutes. Ne le partagez avec personne.'
    const whatsappMessage = whatsappTemplate.replaceAll('{{ otp }}', otp)
    const channel = await readOtpDeliveryChannel()
    const rateLimit = await enforceOtpResendDelay(msisdn)

    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          error: {
            http_code: rateLimit.status ?? 429,
            message: rateLimit.message,
          },
        },
        rateLimit.status ?? 429,
      )
    }

    const safePayload = {
      msisdn,
      sender,
      hasOtp: Boolean(otp),
      isReviewPhone,
      channel,
      messageLength: channel === 'whatsapp' ? whatsappMessage.length : smsMessage.length,
    }
    console.log('[MegaPromo][auth-sms-mtarget] payload', safePayload)

    if (isReviewPhone && otp !== reviewOtp.code) {
      console.warn(
        '[MegaPromo][auth-sms-mtarget] review phone received a generated OTP. Configure Supabase Auth test OTP: SMS_TEST_OTP=2250700000000:260493.',
      )
    }

    const result = channel === 'whatsapp'
      ? await sendWasenderWhatsApp(msisdn, whatsappMessage)
      : await sendMtargetSms(msisdn, smsMessage, sender)
    await recordOtpDeliveryAttempt(
      rateLimit.phoneHash,
      channel,
      result.status,
      result.ok,
    )
    const response = {
      ok: result.ok,
      sent: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      status: result.status,
      channel,
      response: result.response,
    }
    console.log('[MegaPromo][auth-sms-mtarget] response', response)

    if (!result.ok) {
      return jsonResponse(response, 500)
    }

    return jsonResponse({})
  } catch (error) {
    const response = {
      error: {
        http_code: 401,
        message: error instanceof Error ? error.message : 'SMS Auth impossible.',
      },
    }
    console.error('[MegaPromo][auth-sms-mtarget] response', response)
    return jsonResponse(response, 401)
  }
})
