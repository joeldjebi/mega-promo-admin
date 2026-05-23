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
    const message = template.replaceAll('{{ otp }}', otp)

    const safePayload = {
      msisdn,
      sender,
      hasOtp: Boolean(otp),
      isReviewPhone,
      messageLength: message.length,
    }
    console.log('[MegaPromo][auth-sms-mtarget] payload', safePayload)

    if (isReviewPhone && otp !== reviewOtp.code) {
      console.warn(
        '[MegaPromo][auth-sms-mtarget] review phone received a generated OTP. Configure Supabase Auth test OTP: SMS_TEST_OTP=2250700000000:260493.',
      )
    }

    const result = await sendMtargetSms(msisdn, message, sender)
    const response = {
      ok: result.ok,
      sent: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      status: result.status,
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
