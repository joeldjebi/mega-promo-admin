import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SmsPayload = {
  userIds?: string[]
  phoneNumbers?: string[]
  audience?: 'all' | 'active' | 'premium'
  message: string
  sender?: string
}

type SmsRecipient = {
  id?: string
  phone: string
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

function uniqRecipients(recipients: SmsRecipient[]) {
  const seen = new Set<string>()
  return recipients
    .map((recipient) => ({
      ...recipient,
      phone: normalizePhone(recipient.phone),
    }))
    .filter((recipient) => {
      if (recipient.phone.length < 8 || seen.has(recipient.phone)) return false
      seen.add(recipient.phone)
      return true
    })
}

async function assertSuperAdmin(
  supabaseAdmin: ReturnType<typeof createClient>,
  authorization: string,
) {
  const token = authorization.replace('Bearer ', '')
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token)

  if (authError || !authData.user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) throw profileError

  const role = String(profile?.role ?? '')
  const isAdmin = ['admin', 'super-admin', 'super_admin'].includes(role)
  if (!isAdmin || profile?.is_active === false) {
    throw new Error('Forbidden')
  }
}

async function resolveRecipients(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: SmsPayload,
) {
  const explicitPhones = (payload.phoneNumbers ?? [])
    .filter(Boolean)
    .map((phone) => ({ phone }))

  if (explicitPhones.length > 0) {
    return uniqRecipients(explicitPhones)
  }

  const userIds = Array.from(new Set(payload.userIds ?? [])).filter(Boolean)
  let query = supabaseAdmin
    .from('users')
    .select('id, phone')
    .eq('role', 'player')
    .eq('is_active', true)
    .not('phone', 'is', null)

  if (userIds.length > 0) {
    query = query.in('id', userIds)
  } else if (payload.audience === 'premium') {
    query = query.eq('is_premium', true)
  } else if (payload.audience !== 'all' && payload.audience !== 'active') {
    return []
  }

  const { data, error } = await query.limit(5000)
  if (error) throw error

  return uniqRecipients(
    (data ?? []).map((user) => ({
      id: user.id as string,
      phone: user.phone as string,
    })),
  )
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

async function logSystemEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    level?: 'info' | 'warning' | 'error'
    action: string
    message: string
    adminId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  try {
    await supabaseAdmin.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: 'edge_function',
      p_feature: 'sms',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: null,
      p_entity_id: null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/send-sms-mtarget',
    })
  } catch (error) {
    console.warn('[MegaPromo][sms-mtarget][systemLogFailed]', error)
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    await assertSuperAdmin(
      supabaseAdmin,
      request.headers.get('Authorization') ?? '',
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'unauthorized',
      message: 'Appel non autorise de la fonction SMS.',
      metadata: { reason: message },
    })
    return jsonResponse({ ok: false, error: message }, message === 'Forbidden' ? 403 : 401)
  }

  try {
    const payload = (await request.json()) as SmsPayload
    const message = payload.message?.trim()
    const sender = (payload.sender?.trim() || Deno.env.get('MTARGET_SENDER') || 'MEGAPROMO')
      .slice(0, 20)

    if (!message || message.length < 3) {
      return jsonResponse({ ok: false, error: 'Message SMS requis.' }, 400)
    }

    const recipients = await resolveRecipients(supabaseAdmin, payload)
    if (recipients.length === 0) {
      return jsonResponse({ ok: false, error: 'Aucun destinataire SMS.' }, 400)
    }

    const safePayload = {
      audience: payload.audience,
      userIds: payload.userIds,
      phoneNumbersCount: payload.phoneNumbers?.length ?? 0,
      recipients: recipients.length,
      sender,
      messageLength: message.length,
    }
    console.log('[MegaPromo][sms-mtarget] payload', safePayload)

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const result = await sendMtargetSms(recipient.phone, message, sender)
          return {
            id: recipient.id,
            msisdn: recipient.phone,
            ...result,
          }
        } catch (error) {
          return {
            id: recipient.id,
            msisdn: recipient.phone,
            ok: false,
            status: 0,
            response: error instanceof Error ? error.message : 'SMS impossible.',
          }
        }
      }),
    )

    const sent = results.filter((result) => result.ok).length
    const failed = results.length - sent
    const response = {
      ok: failed === 0,
      sent,
      failed,
      targetUsers: recipients.length,
      results,
    }
    console.log('[MegaPromo][sms-mtarget] response', response)
    await logSystemEvent(supabaseAdmin, {
      level: failed === 0 ? 'info' : 'warning',
      action: 'send_batch',
      message: 'Traitement SMS termine.',
      metadata: {
        audience: payload.audience,
        recipients: recipients.length,
        sent,
        failed,
        sender,
        message_length: message.length,
      },
    })
    return jsonResponse(response, failed === 0 ? 200 : 207)
  } catch (error) {
    const response = {
      ok: false,
      sent: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'SMS impossible.',
    }
    console.error('[MegaPromo][sms-mtarget] response', response)
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'send_batch_failed',
      message: 'Echec traitement SMS.',
      metadata: { error: response.error },
    })
    return jsonResponse(response, 500)
  }
})
