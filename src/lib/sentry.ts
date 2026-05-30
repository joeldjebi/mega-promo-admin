import * as Sentry from '@sentry/react'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
const sentryEnvironment =
  (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ??
  import.meta.env.MODE
const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE as string | undefined

let sentryEnabled = false

function isExpectedNonFatalError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const errorRecord = error as { name?: string; message?: string }
  return errorRecord.name === 'AdminAuthError'
}

function parseSampleRate(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(1, Math.max(0, parsed))
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return [
    'token',
    'password',
    'passcode',
    'authorization',
    'otp',
    'pin',
    'document',
    'identity',
    'secret',
    'api_key',
    'apikey',
    'fcm',
    'phone',
    'email',
    'msisdn',
    'mobile_money',
    'payment_number',
    'account_number',
  ].some((item) => normalizedKey.includes(item))
}

function maskSensitiveText(value: string) {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    const [name, domain] = value.split('@')
    return `${name.slice(0, 2)}***@${domain}`
  }
  const compact = value.replace(/\s+/g, '')
  if (/^\+?\d{8,16}$/.test(compact)) {
    return compact.length <= 6
      ? compact
      : `${compact.slice(0, 6)}******${compact.slice(-2)}`
  }
  return value
}

function sanitizeContext(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'string') return maskSensitiveText(value).slice(0, 500)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 30).map(sanitizeContext)
  if (typeof value === 'object') {
    const clean: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (isSensitiveKey(key)) return
      clean[key] = sanitizeContext(item)
    })
    return clean
  }
  return String(value).slice(0, 500)
}

export function initializeSentry() {
  if (!sentryDsn) {
    console.info('[MegaPromo][Sentry] disabled: VITE_SENTRY_DSN missing')
    return false
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    release: sentryRelease,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      if (isExpectedNonFatalError(hint.originalException)) return null
      return event
    },
    tracesSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined,
      0.1,
    ),
  })
  sentryEnabled = true
  return true
}

export function isSentryEnabled() {
  return sentryEnabled
}

export function setSentryUser(userId: string | null, role?: string | null) {
  if (!sentryEnabled) return
  Sentry.setUser(userId ? { id: userId, role: role ?? undefined } : null)
}

export function captureSentryException(
  error: unknown,
  context: {
    feature?: string
    action?: string
    level?: 'debug' | 'info' | 'warning' | 'error'
    metadata?: Record<string, unknown>
  } = {},
) {
  if (!sentryEnabled) return
  if (isExpectedNonFatalError(error)) return
  Sentry.withScope((scope) => {
    if (context.feature) scope.setTag('feature', context.feature)
    if (context.action) scope.setTag('action', context.action)
    if (context.level) scope.setLevel(context.level === 'warning' ? 'warning' : 'error')
    if (context.metadata) {
      scope.setContext('metadata', sanitizeContext(context.metadata) as Record<string, unknown>)
    }
    Sentry.captureException(error)
  })
}

export const SentryErrorBoundary = Sentry.ErrorBoundary
