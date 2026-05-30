import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function resolveAdmin(
  supabaseAdmin: ReturnType<typeof createClient>,
  authorization: string,
) {
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Session admin manquante.')

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) throw new Error('Session admin invalide.')

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error('Profil admin introuvable.')

  const role = String(profile.role ?? 'player')
  if (
    !['admin', 'super_admin', 'super-admin', 'sa'].includes(role) ||
    profile.is_active === false
  ) {
    throw new Error('Acces reserve au super admin.')
  }

  return userData.user.id
}

async function logSystemEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    level?: 'info' | 'warning' | 'error'
    action: string
    message: string
    adminId?: string | null
    entityId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  try {
    await supabaseAdmin.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: 'edge_function',
      p_feature: 'sentry',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: 'sentry_issue_snapshots',
      p_entity_id: payload.entityId ?? null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/get-sentry-issue-detail',
    })
  } catch (error) {
    console.warn('[MegaPromo][sentry-detail][systemLogFailed]', error)
  }
}

async function sentryFetch<T>(
  url: URL,
  token: string,
  label: string,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      `${label} indisponible: ${response.status}. Détail: ${
        payload == null ? 'Réponse vide' : JSON.stringify(payload).slice(0, 500)
      }`,
    )
  }
  return payload as T
}

function latestEventIdFromList(payload: unknown) {
  if (!Array.isArray(payload)) return ''
  const first = payload[0] as Record<string, unknown> | undefined
  return String(first?.eventID ?? first?.eventId ?? first?.id ?? '')
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
  const sentryToken = Deno.env.get('SENTRY_AUTH_TOKEN')
  const sentryOrgSlug = Deno.env.get('SENTRY_ORG_SLUG')
  const sentryBaseUrl = Deno.env.get('SENTRY_BASE_URL') ?? 'https://sentry.io'

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({
      ok: false,
      error: 'Configuration Supabase manquante dans l’Edge Function.',
    })
  }

  if (!sentryToken || !sentryOrgSlug) {
    return jsonResponse({
      ok: false,
      error: 'Secrets Sentry manquants: SENTRY_AUTH_TOKEN et SENTRY_ORG_SLUG.',
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  let adminId: string | null = null

  try {
    adminId = await resolveAdmin(
      supabaseAdmin,
      request.headers.get('Authorization') ?? '',
    )

    const body = await request.json().catch(() => ({})) as {
      issueId?: string
    }
    const issueId = String(body.issueId ?? '').trim()
    if (!issueId) throw new Error('issueId est obligatoire.')

    const issueUrl = new URL(
      `/api/0/organizations/${sentryOrgSlug}/issues/${issueId}/`,
      sentryBaseUrl,
    )
    const eventsUrl = new URL(
      `/api/0/organizations/${sentryOrgSlug}/issues/${issueId}/events/`,
      sentryBaseUrl,
    )
    eventsUrl.searchParams.set('limit', '1')

    const issue = await sentryFetch<Record<string, unknown>>(
      issueUrl,
      sentryToken,
      'Issue Sentry',
    )
    const events = await sentryFetch<unknown[]>(
      eventsUrl,
      sentryToken,
      'Events Sentry',
    )
    const latestEventId = latestEventIdFromList(events)

    let latestEvent: Record<string, unknown> = {}
    if (latestEventId) {
      const eventUrl = new URL(
        `/api/0/organizations/${sentryOrgSlug}/issues/${issueId}/events/${latestEventId}/`,
        sentryBaseUrl,
      )
      latestEvent = await sentryFetch<Record<string, unknown>>(
        eventUrl,
        sentryToken,
        'Event Sentry',
      )
    }

    const now = new Date().toISOString()
    const raw = {
      issue,
      latestEvent,
      latestEventId,
      fetchedAt: now,
    }
    const metadata = {
      ...(typeof issue.metadata === 'object' && issue.metadata !== null
        ? issue.metadata as Record<string, unknown>
        : {}),
      latest_event_id: latestEventId || null,
      detail_fetched_at: now,
    }

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('sentry_issue_snapshots')
      .update({
        raw,
        metadata,
        updated_at: now,
        synced_at: now,
      })
      .eq('issue_id', issueId)
      .select(
        'id, issue_id, short_id, title, culprit, level, status, platform, project_slug, project_name, first_seen, last_seen, event_count, user_count, permalink, metadata, raw, synced_at',
      )

    if (updateError) throw updateError

    await logSystemEvent(supabaseAdmin, {
      action: 'fetch_issue_detail',
      message: 'Detail Sentry recupere pour une issue.',
      adminId,
      entityId: issueId,
      metadata: {
        issue_id: issueId,
        latest_event_id: latestEventId || null,
      },
    })

    return jsonResponse({
      ok: true,
      issue: updatedRows?.[0] ?? null,
      raw,
      metadata,
    })
  } catch (error) {
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'fetch_issue_detail_failed',
      message: 'Echec recuperation detail Sentry.',
      adminId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
