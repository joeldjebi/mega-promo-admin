import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ReviewLoginPayload = {
  phone?: string
  code?: string
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

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1
  const perPage = 1000

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    )
    if (foundUser) return foundUser
    if (data.users.length < perPage) return null

    page += 1
  }

  return null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const reviewPhone = Deno.env.get('APP_REVIEW_OTP_PHONE') ?? '+2250700000000'
    const reviewCode = Deno.env.get('APP_REVIEW_OTP_CODE') ?? '260493'
    const reviewEmail =
      Deno.env.get('APP_REVIEW_EMAIL') ?? 'app-review@megapromo.ci'
    const reviewPassword = Deno.env.get('APP_REVIEW_PASSWORD')

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !reviewPassword) {
      return jsonResponse(
        {
          ok: false,
          error: 'Configuration reviewer indisponible.',
        },
        500,
      )
    }

    const payload = (await request.json().catch(() => ({}))) as ReviewLoginPayload
    const phone = payload.phone ?? ''
    const code = payload.code ?? ''
    const isAllowedPhone =
      normalizePhoneDigits(phone) === normalizePhoneDigits(reviewPhone)
    const isAllowedCode = code.trim() === reviewCode

    if (!isAllowedPhone || !isAllowedCode) {
      return jsonResponse({ ok: false, error: 'Code invalide.' }, 403)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const authClient = createClient(supabaseUrl, anonKey)
    const normalizedReviewPhone = normalizePhone(reviewPhone)

    const existingUser = await findAuthUserByEmail(supabaseAdmin, reviewEmail)
    const authUser = existingUser
      ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: reviewPassword,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata ?? {}),
            source: 'app_review',
          },
        })
      : await supabaseAdmin.auth.admin.createUser({
          email: reviewEmail,
          password: reviewPassword,
          email_confirm: true,
          user_metadata: {
            source: 'app_review',
          },
        })

    if (authUser.error || !authUser.data.user) {
      return jsonResponse(
        { ok: false, error: 'Compte reviewer indisponible.' },
        500,
      )
    }

    const { data: existingPhoneProfiles, error: existingPhoneError } =
      await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', normalizedReviewPhone)

    if (existingPhoneError) {
      console.warn(
        '[MegaPromo][app-review-login] phone lookup warning',
        existingPhoneError,
      )
    }

    for (const profile of existingPhoneProfiles ?? []) {
      if (profile.id === authUser.data.user.id) continue
      const { error: releasePhoneError } = await supabaseAdmin
        .from('users')
        .update({ phone: null })
        .eq('id', profile.id)

      if (releasePhoneError) {
        console.warn(
          '[MegaPromo][app-review-login] phone release warning',
          releasePhoneError,
        )
      }
    }

    const { error: profileError } = await supabaseAdmin.from('users').upsert({
      id: authUser.data.user.id,
      phone: normalizedReviewPhone,
      username: 'AppReview',
      avatar_url: 'avatar_1',
      role: 'player',
      is_premium: false,
      points_total: 0,
      participations_today: 0,
      last_participation_date: new Date().toISOString().slice(0, 10),
      is_active: true,
      account_status: 'active',
      deletion_requested_at: null,
      deletion_scheduled_at: null,
      deleted_at: null,
      active_device_session_id: null,
      active_device_info: {},
      active_device_seen_at: null,
    })

    if (profileError) {
      console.error('[MegaPromo][app-review-login] profile error', profileError)
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: reviewEmail,
      password: reviewPassword,
    })

    if (error || !data.session) {
      return jsonResponse(
        { ok: false, error: 'Session reviewer indisponible.' },
        500,
      )
    }

    if (data.user?.id !== authUser.data.user.id) {
      console.error('[MegaPromo][app-review-login] session user mismatch', {
        expected: authUser.data.user.id,
        actual: data.user?.id,
      })
      return jsonResponse(
        { ok: false, error: 'Session reviewer incohérente.' },
        500,
      )
    }

    return jsonResponse({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    })
  } catch (error) {
    console.error('[MegaPromo][app-review-login] error', error)
    return jsonResponse({ ok: false, error: 'Connexion reviewer impossible.' }, 500)
  }
})
