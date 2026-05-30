import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SentryIssue = {
  id?: string
  shortId?: string
  title?: string
  culprit?: string
  level?: string
  status?: string
  platform?: string
  firstSeen?: string
  lastSeen?: string
  count?: string | number
  userCount?: number
  permalink?: string
  project?: {
    slug?: string
    name?: string
  }
  metadata?: Record<string, unknown>
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

function parseCount(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
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
      p_feature: 'sentry',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: 'sentry_issue_snapshots',
      p_entity_id: null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/sync-sentry-issues',
    })
  } catch (error) {
    console.warn('[MegaPromo][sentry][systemLogFailed]', error)
  }
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

function buildSentryUrl(
  baseUrl: string,
  orgSlug: string,
  query: string,
  limit: number,
  projectSlug?: string,
) {
  const url = new URL(
    projectSlug
      ? `/api/0/projects/${orgSlug}/${projectSlug}/issues/`
      : `/api/0/organizations/${orgSlug}/issues/`,
    baseUrl,
  )
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort', 'date')
  if (query.trim()) url.searchParams.set('query', query.trim())
  return url
}

function sentryApiErrorMessage(
  status: number,
  payload: unknown,
  orgSlug: string,
  projectSlug: string | undefined,
) {
  const payloadText = payload == null
    ? 'Réponse vide'
    : JSON.stringify(payload).slice(0, 500)

  if (status === 404) {
    return projectSlug
      ? `Sentry API indisponible: projet introuvable. Vérifie SENTRY_ORG_SLUG="${orgSlug}" et SENTRY_PROJECT_SLUG="${projectSlug}". Détail: ${payloadText}`
      : `Sentry API indisponible: organisation introuvable. Vérifie SENTRY_ORG_SLUG="${orgSlug}". Ce n’est pas le DSN ni l’ID du projet, c’est le slug de l’organisation visible dans l’URL Sentry. Détail: ${payloadText}`
  }

  if (status === 401 || status === 403) {
    return `Sentry API non autorisée: vérifie SENTRY_AUTH_TOKEN et ses scopes. Détail: ${payloadText}`
  }

  return `Sentry API indisponible: ${status}. Détail: ${payloadText}`
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
  const sentryProjectSlug = Deno.env.get('SENTRY_PROJECT_SLUG') ?? undefined
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
      query?: string
      limit?: number
    }
    const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 100)
    const query = body.query ?? 'is:unresolved'
    const sentryUrl = buildSentryUrl(
      sentryBaseUrl,
      sentryOrgSlug,
      query,
      limit,
      sentryProjectSlug,
    )

    const sentryResponse = await fetch(sentryUrl, {
      headers: {
        Authorization: `Bearer ${sentryToken}`,
        Accept: 'application/json',
      },
    })

    const sentryPayload = await sentryResponse.json().catch(() => null)
    if (!sentryResponse.ok || !Array.isArray(sentryPayload)) {
      throw new Error(
        sentryApiErrorMessage(
          sentryResponse.status,
          sentryPayload,
          sentryOrgSlug,
          sentryProjectSlug,
        ),
      )
    }

    const now = new Date().toISOString()
    const rows = (sentryPayload as SentryIssue[])
      .filter((issue) => issue.id)
      .map((issue) => ({
        issue_id: String(issue.id),
        short_id: issue.shortId ?? null,
        title: issue.title ?? 'Erreur Sentry sans titre',
        culprit: issue.culprit ?? null,
        level: issue.level ?? null,
        status: issue.status ?? null,
        platform: issue.platform ?? null,
        project_slug: issue.project?.slug ?? null,
        project_name: issue.project?.name ?? null,
        first_seen: normalizeDate(issue.firstSeen),
        last_seen: normalizeDate(issue.lastSeen),
        event_count: parseCount(issue.count),
        user_count: parseCount(issue.userCount),
        permalink: issue.permalink ?? null,
        metadata: issue.metadata ?? {},
        raw: issue,
        is_archived: issue.status === 'resolved' || issue.status === 'archived',
        synced_at: now,
        updated_at: now,
      }))

    if (rows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('sentry_issue_snapshots')
        .upsert(rows, { onConflict: 'issue_id' })
      if (upsertError) throw upsertError
    }

    await logSystemEvent(supabaseAdmin, {
      action: 'sync_issues',
      message: 'Synchronisation des issues Sentry.',
      adminId,
      metadata: {
        query,
        limit,
        synced_count: rows.length,
        sentry_status: sentryResponse.status,
        sentry_org_slug: sentryOrgSlug,
        sentry_project_slug: sentryProjectSlug ?? null,
      },
    })

    return jsonResponse({
      ok: true,
      query,
      synced_count: rows.length,
      issues: rows,
    })
  } catch (error) {
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'sync_issues_failed',
      message: 'Echec synchronisation Sentry.',
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
