import { supabase } from './supabase'
import { captureSentryException } from './sentry'

type SystemLogLevel = 'debug' | 'info' | 'warning' | 'error'
type SystemLogSource = 'web_admin' | 'web_partner'

type SystemLogMetadata = Record<string, unknown>

type SystemLogPayload = {
  level?: SystemLogLevel
  source?: SystemLogSource
  feature: string
  action: string
  message: string
  userId?: string | null
  adminId?: string | null
  partnerId?: string | null
  entityType?: string | null
  entityId?: string | null
  metadata?: SystemLogMetadata
  captureInSentry?: boolean
}

const sensitiveKeys = [
  'otp',
  'password',
  'passcode',
  'pin',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'fcm_token',
  'service_role_key',
  'identity_document',
  'document_url',
  'document',
  'secret',
  'api_key',
  'apikey',
  'phone',
  'email',
  'msisdn',
  'mobile_money',
  'payment_number',
  'account_number',
]

function isSensitiveKey(key: string) {
  const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return sensitiveKeys.some((item) => normalizedKey.includes(item))
}

function maskPhone(value: string) {
  const compact = value.replace(/\s+/g, '')
  if (!/^\+?\d{8,16}$/.test(compact)) return value
  if (compact.length <= 6) return compact
  return `${compact.slice(0, 6)}******${compact.slice(-2)}`
}

function maskEmail(value: string) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return value
  const [name, domain] = value.split('@')
  return `${name.slice(0, 2)}***@${domain}`
}

function sanitizeValue(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'string') return maskEmail(maskPhone(value)).slice(0, 500)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.slice(0, 30).map(sanitizeValue)
  if (typeof value === 'object') {
    const sanitized: SystemLogMetadata = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (!key || isSensitiveKey(key)) return
      sanitized[key] = sanitizeValue(item)
    })
    return sanitized
  }
  return String(value).slice(0, 500)
}

function sanitizeMetadata(metadata: SystemLogMetadata = {}) {
  return sanitizeValue(metadata) as SystemLogMetadata
}

function currentPath() {
  if (typeof window === 'undefined') return null
  return `${window.location.pathname}${window.location.search}`
}

function userAgent() {
  if (typeof navigator === 'undefined') return null
  return navigator.userAgent
}

export async function logSystemEvent(payload: SystemLogPayload) {
  try {
    const sessionResult = await supabase.auth.getSession()
    const currentUserId = sessionResult.data.session?.user.id ?? null
    const source = payload.source ?? 'web_admin'
    const metadata = sanitizeMetadata({
      ...(payload.metadata ?? {}),
      page_path: currentPath(),
      app_surface: source,
    })

    const { error } = await supabase.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: source,
      p_feature: payload.feature,
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: payload.userId ?? null,
      p_admin_id: payload.adminId ?? currentUserId,
      p_partner_id: payload.partnerId ?? null,
      p_entity_type: payload.entityType ?? null,
      p_entity_id: payload.entityId ?? null,
      p_metadata: metadata,
      p_ip_address: null,
      p_user_agent: userAgent(),
    })

    if (error) {
      console.warn('[MegaPromo][SystemLog] write failed', error.message)
      if ((payload.level ?? 'info') === 'error') {
        captureSentryException(error, {
          feature: payload.feature,
          action: 'system_log_write_failed',
          level: 'error',
          metadata: {
            original_action: payload.action,
            original_message: payload.message,
          },
        })
      }
    }
  } catch (error) {
    console.warn('[MegaPromo][SystemLog] unavailable', error)
    if ((payload.level ?? 'info') === 'error') {
      captureSentryException(error, {
        feature: payload.feature,
        action: 'system_log_unavailable',
        level: 'error',
        metadata: {
          original_action: payload.action,
          original_message: payload.message,
        },
      })
    }
  }
}

export function logInfo(payload: Omit<SystemLogPayload, 'level'>) {
  return logSystemEvent({ ...payload, level: 'info' })
}

export function logWarning(payload: Omit<SystemLogPayload, 'level'>) {
  return logSystemEvent({ ...payload, level: 'warning' })
}

export function logError(payload: Omit<SystemLogPayload, 'level'>) {
  if (payload.captureInSentry !== false) {
    captureSentryException(new Error(payload.message), {
      feature: payload.feature,
      action: payload.action,
      level: 'error',
      metadata: payload.metadata,
    })
  }
  return logSystemEvent({ ...payload, level: 'error' })
}

export function logAdminAction(
  payload: Omit<SystemLogPayload, 'level' | 'source'>,
) {
  return logSystemEvent({ ...payload, level: 'info', source: 'web_admin' })
}

export function logPartnerAction(
  payload: Omit<SystemLogPayload, 'level' | 'source'>,
) {
  return logSystemEvent({ ...payload, level: 'info', source: 'web_partner' })
}
