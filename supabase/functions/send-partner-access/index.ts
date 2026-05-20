import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PartnerAccessPayload = {
  partnerId: string
  userId?: string
  email: string
  companyName: string
  password?: string
  loginUrl?: string
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

function handledError(message: string, details?: unknown) {
  return jsonResponse({
    ok: false,
    error: message,
    details,
  })
}

function generateTemporaryPassword() {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$#'
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildPartnerAccessEmail({
  companyName,
  email,
  password,
  loginUrl,
}: {
  companyName: string
  email: string
  password: string
  loginUrl: string
}) {
  const safeCompany = escapeHtml(companyName)
  const safeEmail = escapeHtml(email)
  const safePassword = escapeHtml(password)
  const safeLoginUrl = escapeHtml(loginUrl)

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f6fb;font-family:Montserrat,Inter,Segoe UI,Arial,sans-serif;color:#05060a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe3f1;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(5,6,10,.10);">
            <tr>
              <td style="background:#05060a;padding:28px 30px;color:#ffffff;">
                <div style="display:inline-block;background:#6b7fff;border-radius:16px;width:46px;height:46px;line-height:46px;text-align:center;font-weight:800;font-size:20px;">M</div>
                <h1 style="margin:18px 0 6px;font-size:28px;line-height:1.15;">Bienvenue sur MegaPromo</h1>
                <p style="margin:0;color:#c7cce0;font-size:14px;line-height:1.7;">Votre espace partenaire est prêt pour ${safeCompany}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;color:#3f4355;font-size:15px;line-height:1.7;">
                  Le Super Admin MegaPromo vient de créer votre compte partenaire.
                  Utilisez les accès ci-dessous pour vous connecter et gérer vos campagnes.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;border:1px solid #dfe3f1;border-radius:22px;padding:18px;margin:22px 0;">
                  <tr>
                    <td style="padding:8px 0;color:#6e7284;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Email</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 16px;font-size:17px;font-weight:800;color:#05060a;">${safeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#6e7284;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Mot de passe temporaire</td>
                  </tr>
                  <tr>
                    <td style="padding:0;font-size:20px;font-weight:900;color:#4e5fd8;letter-spacing:.04em;">${safePassword}</td>
                  </tr>
                </table>

                <a href="${safeLoginUrl}" style="display:inline-block;background:#6b7fff;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:14px;font-weight:900;">
                  Ouvrir mon espace partenaire
                </a>

                <p style="margin:24px 0 0;color:#6e7284;font-size:13px;line-height:1.7;">
                  Pour votre sécurité, changez ce mot de passe après votre première connexion.
                  Si vous n’êtes pas à l’origine de cette demande, contactez MegaPromo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'
  const defaultLoginUrl =
    Deno.env.get('PARTNER_LOGIN_URL') ?? 'https://megapromo.app/auth/partner'

  if (!supabaseUrl || !serviceRoleKey) {
    return handledError('Missing server configuration')
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
    return handledError('Unauthorized', authError?.message)
  }

  const { data: adminProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    return handledError(
      'Impossible de vérifier le Super Admin dans public.users.',
      profileError.message,
    )
  }

  if (
    adminProfile?.role !== 'admin' ||
    adminProfile?.is_active === false
  ) {
    return handledError('Forbidden', 'Compte non admin ou desactive.')
  }

  const payload = (await request.json()) as PartnerAccessPayload
  const email = payload.email?.trim().toLowerCase()
  const companyName = payload.companyName?.trim()
  const partnerId = payload.partnerId?.trim()
  const existingUserId = payload.userId?.trim()
  const requestedPassword = payload.password?.trim()
  const loginUrl = payload.loginUrl?.trim() || defaultLoginUrl

  if (!partnerId || !email || !email.includes('@') || !companyName) {
    return handledError('Invalid partner payload')
  }

  if (requestedPassword && requestedPassword.length < 8) {
    return handledError('Le mot de passe doit contenir au moins 8 caractères.')
  }

  const password = requestedPassword || generateTemporaryPassword()
  const authUserId =
    existingUserId || (await findAuthUserByEmail(supabaseAdmin, email))?.id

  if (authUserId && requestedPassword) {
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(authUserId)

    if (deleteUserError) {
      return handledError(deleteUserError.message)
    }
  }

  const authResult =
    authUserId && !requestedPassword
      ? await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role: 'partner',
            company_name: companyName,
          },
        })
      : await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'partner',
        company_name: companyName,
      },
    })

  if (authResult.error) {
    return handledError(authResult.error.message)
  }

  const userId = authResult.data.user?.id
  if (!userId) {
    return handledError('Auth user not created')
  }

  const { error: userProfileError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: userId,
        phone: `p_${userId.replaceAll('-', '').slice(0, 18)}`,
        username: companyName,
        role: 'partner',
        is_active: true,
        points_total: 0,
        participations_today: 0,
      },
      { onConflict: 'id' },
    )

  if (userProfileError) {
    return handledError(
      'Compte Auth cree, mais profil public.users non cree.',
      userProfileError.message,
    )
  }

  const { error: partnerError } = await supabaseAdmin
    .from('partners')
    .update({ user_id: userId, is_validated: true, is_active: true })
    .eq('id', partnerId)

  if (partnerError) {
    return handledError(partnerError.message)
  }

  const emailHtml = buildPartnerAccessEmail({
    companyName,
    email,
    password,
    loginUrl,
  })

  if (!resendApiKey) {
    return jsonResponse({
      ok: true,
      userId,
      emailSent: false,
      emailError: 'RESEND_API_KEY non configure. Compte partenaire cree sans email.',
    })
  }

  let resendResponse: Response
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: `Vos accès partenaire MegaPromo - ${companyName}`,
        html: emailHtml,
      }),
    })
  } catch (error) {
    return jsonResponse({
      ok: true,
      userId,
      emailSent: false,
      emailError:
        error instanceof Error
          ? error.message
          : 'Resend indisponible. Compte partenaire cree sans email.',
    })
  }

  const resendPayload = await resendResponse.json()
  if (!resendResponse.ok) {
    return jsonResponse({
      ok: true,
      userId,
      emailSent: false,
      emailError: resendPayload?.message ?? 'Email failed',
    })
  }

  return jsonResponse({
    ok: true,
    userId,
    emailSent: true,
    emailId: resendPayload?.id ?? null,
  })
})
