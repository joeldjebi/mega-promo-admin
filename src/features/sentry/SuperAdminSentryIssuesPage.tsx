import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

type SentryIssueItem = {
  id: string
  issueId: string
  shortId: string
  title: string
  culprit: string
  level: string
  status: string
  platform: string
  projectSlug: string
  projectName: string
  firstSeen: string
  lastSeen: string
  eventCount: number
  userCount: number
  permalink: string
  syncedAt: string
  metadata: Record<string, unknown>
  raw: Record<string, unknown>
}

type SentryIssueFilters = {
  search: string
  status: string
  level: string
  project: string
}

type SentryIssuesData = {
  issues: SentryIssueItem[]
  total: number
}

type SuperAdminSentryIssuesPageProps = {
  authRoute: string
  navItems: FeatureNavItem[]
  systemLogsRoute: string
}

const initialFilters: SentryIssueFilters = {
  search: '',
  status: 'all',
  level: 'all',
  project: '',
}

const pageSizeOptions = [10, 25, 50]
const syncQueryOptions = [
  { label: 'Issues ouvertes', value: 'is:unresolved' },
  { label: 'Erreurs production', value: 'is:unresolved environment:production' },
  { label: 'Dernières 24h', value: 'is:unresolved lastSeen:-24h' },
  { label: 'Toutes non archivées', value: 'is:unresolved OR is:for_review' },
]

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function getVisibleNavItems(
  permissions: string[] | undefined,
  navItems: FeatureNavItem[],
) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

function mapRows(data: unknown[] | null): SentryIssueItem[] {
  return (data ?? []).map((rowValue) => {
    const row = rowValue as Record<string, unknown>
    const metadata = row.metadata
    const raw = row.raw
    return {
      id: row.id as string,
      issueId: (row.issue_id as string | null) ?? '',
      shortId: (row.short_id as string | null) ?? '',
      title: (row.title as string | null) ?? '',
      culprit: (row.culprit as string | null) ?? '',
      level: (row.level as string | null) ?? '',
      status: (row.status as string | null) ?? '',
      platform: (row.platform as string | null) ?? '',
      projectSlug: (row.project_slug as string | null) ?? '',
      projectName: (row.project_name as string | null) ?? '',
      firstSeen: (row.first_seen as string | null) ?? '',
      lastSeen: (row.last_seen as string | null) ?? '',
      eventCount: Number(row.event_count ?? 0),
      userCount: Number(row.user_count ?? 0),
      permalink: (row.permalink as string | null) ?? '',
      syncedAt: (row.synced_at as string | null) ?? '',
      metadata:
        metadata && typeof metadata === 'object' && !Array.isArray(metadata)
          ? metadata as Record<string, unknown>
          : {},
      raw:
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? raw as Record<string, unknown>
          : {},
    }
  })
}

function applyFilters(filters: SentryIssueFilters) {
  let query = supabase
    .from('sentry_issue_snapshots')
    .select(
      'id, issue_id, short_id, title, culprit, level, status, platform, project_slug, project_name, first_seen, last_seen, event_count, user_count, permalink, metadata, raw, synced_at',
      { count: 'exact' },
    )
    .order('last_seen', { ascending: false, nullsFirst: false })

  if (filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.level !== 'all') query = query.eq('level', filters.level)
  if (filters.project.trim()) query = query.ilike('project_slug', `%${filters.project.trim()}%`)

  const search = filters.search.trim()
  if (search) {
    const escaped = search.replace(/[%_]/g, '\\$&')
    query = query.or(
      [
        `title.ilike.%${escaped}%`,
        `culprit.ilike.%${escaped}%`,
        `short_id.ilike.%${escaped}%`,
        `issue_id.ilike.%${escaped}%`,
      ].join(','),
    )
  }

  return query
}

async function fetchSentryIssues(
  filters: SentryIssueFilters,
  page: number,
  pageSize: number,
): Promise<SentryIssuesData> {
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await applyFilters(filters).range(from, to)
  if (error) {
    const message = String(error.message ?? '')
    const code = String(error.code ?? '')
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      message.includes('sentry_issue_snapshots')
    ) {
      throw new Error(
        'La table sentry_issue_snapshots est introuvable. Exécute la migration 202605290009_create_sentry_issue_snapshots.sql puis recharge la page.',
      )
    }
    throw error
  }
  return { issues: mapRows(data), total: count ?? 0 }
}

async function formatFunctionError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Impossible de synchroniser Sentry.'
  }

  const errorRecord = error as {
    message?: string
    context?: {
      clone?: () => Response
      json?: () => Promise<unknown>
      text?: () => Promise<string>
      status?: number
    }
  }

  const response = errorRecord.context
  if (response) {
    try {
      const body = await (response.clone?.() ?? response).json?.()
      if (body && typeof body === 'object') {
        const payload = body as { error?: string; message?: string }
        return payload.error ?? payload.message ?? JSON.stringify(body)
      }
    } catch {
      try {
        const text = await (response.clone?.() ?? response).text?.()
        if (text) return text
      } catch {
        // Keep the generic message below.
      }
    }
  }

  return errorRecord.message ?? 'Impossible de synchroniser Sentry.'
}

function formatSupabaseError(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const payload = error as {
    message?: string
    details?: string
    hint?: string
    code?: string
    error_description?: string
    error?: string
  }
  const message = payload.message ?? payload.error_description ?? payload.error
  if (
    payload.code === 'PGRST202' ||
    message?.includes('Could not find the function') ||
    message?.includes('schema cache')
  ) {
    return [
      'La fonction SQL de suppression n’est pas encore disponible dans Supabase.',
      'Exécute la migration 202605290010_delete_logs_and_sentry_snapshots_rpc.sql puis lance notify pgrst, \'reload schema\'.',
      message,
      payload.details,
      payload.hint,
      payload.code ? `Code: ${payload.code}` : '',
    ].filter(Boolean).join(' · ')
  }
  return [
    message,
    payload.details,
    payload.hint,
    payload.code ? `Code: ${payload.code}` : '',
  ].filter(Boolean).join(' · ') || JSON.stringify(error) || fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function sentryEvent(raw: Record<string, unknown>) {
  return asRecord(raw.latestEvent) && Object.keys(asRecord(raw.latestEvent)).length > 0
    ? asRecord(raw.latestEvent)
    : raw
}

function findBestFrame(raw: Record<string, unknown>) {
  const event = sentryEvent(raw)
  const entries = asArray(event.entries)
  const exceptionEntry = entries.find((entry) =>
    asRecord(entry).type === 'exception',
  )
  const exceptionData = asRecord(asRecord(exceptionEntry).data)
  const values = asArray(exceptionData.values)
  const firstException = asRecord(values[0])
  const stacktrace = asRecord(firstException.stacktrace)
  const frames = asArray(stacktrace.frames).map(asRecord)
  return (
    frames.find((frame) => frame.in_app === true) ??
    frames[frames.length - 1] ??
    {}
  )
}

function extractException(raw: Record<string, unknown>, metadata: Record<string, unknown>) {
  const event = sentryEvent(raw)
  const entries = asArray(event.entries)
  const exceptionEntry = entries.find((entry) =>
    asRecord(entry).type === 'exception',
  )
  const exceptionData = asRecord(asRecord(exceptionEntry).data)
  const values = asArray(exceptionData.values)
  const firstException = asRecord(values[0])
  return {
    type: firstText(firstException.type, metadata.type, raw.type),
    value: firstText(firstException.value, metadata.value, event.title, raw.title),
  }
}

function extractContext(raw: Record<string, unknown>) {
  const event = sentryEvent(raw)
  const metadata = asRecord(event.metadata)
  const tags = asArray(event.tags)
  const tagValue = (key: string) => {
    const tag = tags.find((item) => asRecord(item).key === key)
    return firstText(asRecord(tag).value)
  }
  const contexts = asRecord(event.contexts)
  const browser = asRecord(contexts.browser)
  const os = asRecord(contexts.os)
  const device = asRecord(contexts.device)
  const request = asRecord(event.request)
  return {
    environment: firstText(event.environment, metadata.environment, tagValue('environment')),
    release: firstText(event.release, metadata.release, tagValue('release')),
    route: firstText(
      metadata.route,
      metadata.url,
      request.url,
      tagValue('url'),
      tagValue('route'),
    ),
    browser: firstText(browser.name, browser.version)
      ? `${firstText(browser.name)} ${firstText(browser.version)}`.trim()
      : '',
    os: firstText(os.name, os.version)
      ? `${firstText(os.name)} ${firstText(os.version)}`.trim()
      : '',
    device: firstText(device.model, device.family, device.name),
  }
}

function extractLastBreadcrumb(raw: Record<string, unknown>) {
  const event = sentryEvent(raw)
  const entries = asArray(event.entries)
  const breadcrumbEntry = entries.find((entry) =>
    asRecord(entry).type === 'breadcrumbs',
  )
  const values = asArray(asRecord(asRecord(breadcrumbEntry).data).values)
  const last = asRecord(values[values.length - 1])
  return {
    category: firstText(last.category, last.type),
    message: firstText(last.message, last.data && JSON.stringify(last.data)),
  }
}

function buildDiagnostic(issue: SentryIssueItem) {
  const raw = issue.raw
  const frame = findBestFrame(raw)
  const exception = extractException(raw, issue.metadata)
  const context = extractContext(raw)
  const breadcrumb = extractLastBreadcrumb(raw)
  const file = firstText(frame.filename, frame.abs_path, issue.culprit)
  const line = firstText(frame.lineno)
  const column = firstText(frame.colno)
  const location = [file, line ? `ligne ${line}` : '', column ? `col ${column}` : '']
    .filter(Boolean)
    .join(' · ')
  const functionName = firstText(frame.function, frame.symbol, issue.culprit)

  return {
    exception,
    location,
    functionName,
    context,
    breadcrumb,
  }
}

function SentryIssueDetailModal({
  issue,
  onClose,
}: {
  issue: SentryIssueItem
  onClose: () => void
}) {
  const diagnostic = buildDiagnostic(issue)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Détail erreur Sentry"
        className="contest-modal sentry-detail-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{issue.projectName || issue.projectSlug || 'Sentry'} · {issue.level || 'N/A'}</p>
            <h2>{issue.title}</h2>
            <p className="modal-subtitle">
              {issue.shortId || issue.issueId} · {issue.status || 'Statut inconnu'}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="system-log-detail-grid sentry-detail-grid">
          <article>
            <span>Impact</span>
            <strong>{formatNumber(issue.eventCount)} event(s)</strong>
            <p>{formatNumber(issue.userCount)} utilisateur(s) touchés</p>
          </article>
          <article>
            <span>Projet</span>
            <strong>{issue.projectName || issue.projectSlug || 'Non défini'}</strong>
            <p>{issue.platform || 'Plateforme non définie'}</p>
          </article>
          <article>
            <span>Culprit</span>
            <strong>{issue.culprit || 'Non défini'}</strong>
          </article>
          <article>
            <span>Première occurrence</span>
            <strong>{formatDate(issue.firstSeen)}</strong>
          </article>
          <article>
            <span>Dernière occurrence</span>
            <strong>{formatDate(issue.lastSeen)}</strong>
          </article>
          <article>
            <span>Synchronisation</span>
            <strong>{formatDate(issue.syncedAt)}</strong>
          </article>
        </div>

        <section className="sentry-diagnostic-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Diagnostic rapide</p>
              <h3>Origine probable du problème</h3>
            </div>
          </div>
          <div className="sentry-diagnostic-grid">
            <article>
              <span>Exception</span>
              <strong>{diagnostic.exception.type || issue.title}</strong>
              <p>{diagnostic.exception.value || 'Message non disponible'}</p>
            </article>
            <article>
              <span>Fichier / ligne</span>
              <strong>{diagnostic.location || issue.culprit || 'Non défini'}</strong>
              <p>{diagnostic.functionName || 'Fonction non définie'}</p>
            </article>
            <article>
              <span>Route / écran</span>
              <strong>{diagnostic.context.route || 'Non défini'}</strong>
              <p>{diagnostic.context.release || 'Release non définie'} · {diagnostic.context.environment || 'env inconnue'}</p>
            </article>
            <article>
              <span>Device</span>
              <strong>{diagnostic.context.device || diagnostic.context.browser || 'Non défini'}</strong>
              <p>{diagnostic.context.os || 'OS non défini'}</p>
            </article>
            <article className="wide">
              <span>Dernière action avant erreur</span>
              <strong>{diagnostic.breadcrumb.category || 'Breadcrumb non défini'}</strong>
              <p>{diagnostic.breadcrumb.message || 'Aucune action exploitable synchronisée.'}</p>
            </article>
          </div>
        </section>

        <div className="sentry-detail-actions">
          {issue.permalink ? (
            <a
              className="primary-button"
              href={issue.permalink}
              rel="noreferrer"
              target="_blank"
            >
              Ouvrir dans Sentry
            </a>
          ) : null}
          <button className="secondary-action-button" onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        <div className="system-log-json">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Metadata</p>
              <h3>Contexte Sentry</h3>
            </div>
          </div>
          <pre>{JSON.stringify(issue.metadata, null, 2)}</pre>
        </div>

        <div className="system-log-json">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Raw</p>
              <h3>Snapshot complet</h3>
            </div>
          </div>
          <pre>{JSON.stringify(issue.raw, null, 2)}</pre>
        </div>
      </section>
    </div>
  )
}

function DeleteAllSentrySnapshotsModal({
  isDeleting,
  onClose,
  onConfirm,
}: {
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Confirmation suppression snapshots Sentry"
        className="contest-modal sentry-detail-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Action critique</p>
            <h2>Supprimer les erreurs Sentry</h2>
            <p className="modal-subtitle">
              Les snapshots Sentry stockés dans MegaPromo seront supprimés.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="delete-confirm-summary">
          <strong>Cette action est irréversible côté MegaPromo.</strong>
          <small>
            Elle ne supprime rien dans Sentry. Elle vide uniquement la copie
            locale affichée dans ce dashboard.
          </small>
        </div>

        <div className="modal-actions">
          <button className="secondary-action-button" onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer tous les snapshots'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function SuperAdminSentryIssuesPage({
  authRoute,
  navItems,
  systemLogsRoute,
}: SuperAdminSentryIssuesPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const visibleNavItems = getVisibleNavItems(adminAuth.profile?.permissions, navItems)
  const canSync = hasAdminPermission(adminAuth.profile?.permissions, 'system_logs', 'write')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState<SentryIssuesData>({ issues: [], total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncQuery, setSyncQuery] = useState(syncQueryOptions[0].value)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedIssue, setSelectedIssue] = useState<SentryIssueItem | null>(null)
  const [loadingDetailIssueId, setLoadingDetailIssueId] = useState('')
  const [isDeletingAllSnapshots, setIsDeletingAllSnapshots] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)

  const loadIssues = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setData(await fetchSentryIssues(filters, page, pageSize))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger les erreurs Sentry.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    void loadIssues()
  }, [loadIssues])

  useEffect(() => {
    setPage(0)
  }, [filters, pageSize])

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))
  const pageStart = data.total === 0 ? 0 : page * pageSize + 1
  const pageEnd = Math.min(data.total, (page + 1) * pageSize)
  const stats = useMemo(() => {
    const errors = data.issues.filter((issue) => issue.level === 'error').length
    const fatal = data.issues.filter((issue) => issue.level === 'fatal').length
    const users = data.issues.reduce((sum, issue) => sum + issue.userCount, 0)
    const events = data.issues.reduce((sum, issue) => sum + issue.eventCount, 0)
    return { errors, fatal, users, events }
  }, [data.issues])

  function updateFilter<Key extends keyof SentryIssueFilters>(
    key: Key,
    value: SentryIssueFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  async function handleSync() {
    setIsSyncing(true)
    setError('')
    setNotice('')
    try {
      const { data: response, error: syncError } = await supabase.functions.invoke(
        'sync-sentry-issues',
        {
          body: {
            query: syncQuery,
            limit: 50,
          },
        },
      )
      if (syncError) throw syncError
      const payload = (response ?? {}) as {
        ok?: boolean
        error?: string
        synced_count?: number
      }
      if (!payload.ok) throw new Error(payload.error ?? 'Synchronisation Sentry impossible.')
      setNotice(`${formatNumber(payload.synced_count ?? 0)} issue(s) Sentry synchronisée(s).`)
      void logAdminAction({
        feature: 'system_logs',
        action: 'sync_sentry_issues',
        message: 'Synchronisation Sentry lancee depuis le SA.',
        metadata: {
          query: syncQuery,
          synced_count: payload.synced_count ?? 0,
        },
      })
      await loadIssues()
    } catch (syncError) {
      const formattedError = await formatFunctionError(syncError)
      setError(formattedError)
      void logError({
        feature: 'system_logs',
        action: 'sync_sentry_issues_failed',
        message: 'Echec synchronisation Sentry depuis le SA.',
        captureInSentry: false,
        metadata: {
          query: syncQuery,
          error: formattedError,
        },
      })
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleOpenDetails(issue: SentryIssueItem) {
    setLoadingDetailIssueId(issue.issueId)
    setError('')
    try {
      const { data: response, error: detailError } = await supabase.functions.invoke(
        'get-sentry-issue-detail',
        {
          body: {
            issueId: issue.issueId,
          },
        },
      )
      if (detailError) throw detailError
      const payload = (response ?? {}) as {
        ok?: boolean
        error?: string
        issue?: Record<string, unknown> | null
      }
      if (!payload.ok) throw new Error(payload.error ?? 'Détail Sentry indisponible.')
      const updatedIssue = payload.issue
        ? mapRows([payload.issue])[0]
        : issue
      setSelectedIssue(updatedIssue)
      setData((current) => ({
        ...current,
        issues: current.issues.map((item) =>
          item.issueId === updatedIssue.issueId ? updatedIssue : item,
        ),
      }))
    } catch (detailError) {
      const formattedError = await formatFunctionError(detailError)
      setError(formattedError)
      setSelectedIssue(issue)
    } finally {
      setLoadingDetailIssueId('')
    }
  }

  async function handleDeleteAllSnapshots() {
    setIsDeletingAllSnapshots(true)
    setError('')
    setNotice('')
    try {
      const { data: response, error: deleteError } = await supabase.rpc(
        'admin_delete_all_sentry_issue_snapshots',
      )
      if (deleteError) throw deleteError
      const payload = (response ?? {}) as { deleted_count?: number }
      setIsDeleteAllModalOpen(false)
      setSelectedIssue(null)
      setPage(0)
      setNotice(`${formatNumber(payload.deleted_count ?? 0)} snapshot(s) Sentry supprimé(s).`)
      await loadIssues()
    } catch (deleteError) {
      setError(formatSupabaseError(
        deleteError,
        'Impossible de supprimer les snapshots Sentry.',
      ))
    } finally {
      setIsDeletingAllSnapshots(false)
    }
  }

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {visibleNavItems.slice(0, 6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {visibleNavItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Technique</span>
          <strong>Sentry</strong>
          <p>Issues synchronisées, release, projets et utilisateurs touchés.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Observabilité technique</p>
            <h1>Erreurs Sentry</h1>
            <p className="page-subtitle">
              Une vue SA des erreurs web/mobile synchronisées depuis Sentry.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(systemLogsRoute)}
              type="button"
            >
              Logs système
            </button>
            <button className="secondary-action-button" onClick={() => void loadIssues()} type="button">
              Actualiser
            </button>
            <div className="admin-chip">
              <span>{adminName.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{adminName}</strong>
                <small>Session vérifiée</small>
              </div>
            </div>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {error ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Sentry indisponible</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Synchronisation terminée</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        <section className="settings-overview system-logs-overview">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">Σ</span>
            <div>
              <small>Total filtré</small>
              <strong>{formatNumber(data.total)}</strong>
              <p>{pageStart}-{pageEnd} affichés.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon danger">!</span>
            <div>
              <small>Erreurs page</small>
              <strong>{formatNumber(stats.errors + stats.fatal)}</strong>
              <p>{formatNumber(stats.fatal)} fatal(es).</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">U</span>
            <div>
              <small>Users touchés</small>
              <strong>{formatNumber(stats.users)}</strong>
              <p>Sur la page courante.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">E</span>
            <div>
              <small>Events</small>
              <strong>{formatNumber(stats.events)}</strong>
              <p>Occurrences visibles.</p>
            </div>
          </article>
        </section>

        {canSync ? (
          <section className="panel sentry-sync-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Synchronisation</p>
                <h2>Importer depuis Sentry</h2>
                <p>
                  Le token Sentry reste dans les secrets Supabase. Le SA ne voit
                  qu’un résumé exploitable.
                </p>
              </div>
              <div className="system-logs-retention-actions">
                <select
                  aria-label="Requête Sentry"
                  onChange={(event) => setSyncQuery(event.target.value)}
                  value={syncQuery}
                >
                  {syncQueryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="primary-button"
                  disabled={isSyncing}
                  onClick={() => void handleSync()}
                  type="button"
                >
                  {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
                </button>
                <button
                  className="danger-action-button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  type="button"
                >
                  Delete tout
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="panel sentry-issues-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Issues</p>
              <h2>Erreurs techniques</h2>
              <p>Snapshots Sentry, triés par dernière occurrence.</p>
            </div>
            <span className="pill">
              {isLoading ? 'Chargement' : `${formatNumber(data.total)} issues`}
            </span>
          </div>

          <div className="contest-filter-bar sentry-filters">
            <input
              aria-label="Rechercher une issue"
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Rechercher titre, culprit, issue..."
              type="search"
              value={filters.search}
            />
            <select
              aria-label="Filtrer par statut"
              onChange={(event) => updateFilter('status', event.target.value)}
              value={filters.status}
            >
              <option value="all">Tous statuts</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
            <select
              aria-label="Filtrer par niveau"
              onChange={(event) => updateFilter('level', event.target.value)}
              value={filters.level}
            >
              <option value="all">Tous niveaux</option>
              <option value="fatal">Fatal</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <input
              aria-label="Filtrer par projet"
              onChange={(event) => updateFilter('project', event.target.value)}
              placeholder="Projet"
              type="text"
              value={filters.project}
            />
            <select
              aria-label="Nombre de lignes par page"
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}/page</option>
              ))}
            </select>
          </div>

          <div className="premium-notification-table sentry-issues-table" role="table">
            <div className="premium-notification-head sentry-issues-head" role="row">
              <span>Issue</span>
              <span>Niveau</span>
              <span>Projet</span>
              <span>Impact</span>
              <span>Dernière vue</span>
              <span>Action</span>
            </div>
            {data.issues.length > 0 ? (
              data.issues.map((issue) => (
                <article className="premium-notification-row sentry-issues-row" key={issue.id}>
                  <div>
                    <strong>{issue.title}</strong>
                    <p>{issue.shortId || issue.issueId} · {issue.culprit || 'Culprit non défini'}</p>
                  </div>
                  <span className={`system-log-level ${issue.level || 'info'}`}>
                    {issue.level || 'N/A'}
                  </span>
                  <div>
                    <strong>{issue.projectName || issue.projectSlug || 'Projet'}</strong>
                    <p>{issue.platform || issue.status || 'Sentry'}</p>
                  </div>
                  <div>
                    <strong>{formatNumber(issue.eventCount)} events</strong>
                    <p>{formatNumber(issue.userCount)} user(s) touchés</p>
                  </div>
                  <div>
                    <strong>{formatDate(issue.lastSeen)}</strong>
                    <p>Sync {formatDate(issue.syncedAt)}</p>
                  </div>
                  <div className="table-actions compact sentry-row-actions">
                    <button
                      className="table-action-button"
                      disabled={loadingDetailIssueId === issue.issueId}
                      onClick={() => void handleOpenDetails(issue)}
                      type="button"
                    >
                      {loadingDetailIssueId === issue.issueId ? 'Chargement...' : 'Détails'}
                    </button>
                    {issue.permalink ? (
                      <a
                        className="table-action-button"
                        href={issue.permalink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state compact">
                <strong>{isLoading ? 'Chargement...' : 'Aucune issue Sentry'}</strong>
                <p>Lance une synchronisation ou ajuste les filtres.</p>
              </div>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {pageStart}-{pageEnd} sur {formatNumber(data.total)}
            </span>
            <div className="pagination-controls">
              <button
                className="pagination-page-button"
                disabled={page === 0}
                onClick={() => setPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="pagination-page-button"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                type="button"
              >
                Précédent
              </button>
              <button
                className="pagination-page-button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                type="button"
              >
                Suivant
              </button>
              <button
                className="pagination-page-button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
          </div>
        </section>
      </section>
      {selectedIssue ? (
        <SentryIssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      ) : null}
      {isDeleteAllModalOpen ? (
        <DeleteAllSentrySnapshotsModal
          isDeleting={isDeletingAllSnapshots}
          onClose={() => setIsDeleteAllModalOpen(false)}
          onConfirm={() => void handleDeleteAllSnapshots()}
        />
      ) : null}
    </main>
  )
}
