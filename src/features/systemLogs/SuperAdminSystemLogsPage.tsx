import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type SystemLogLevel = 'debug' | 'info' | 'warning' | 'error'
type SystemLogSource =
  | 'mobile'
  | 'web_admin'
  | 'web_partner'
  | 'landing'
  | 'edge_function'
  | 'database'

type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

type SystemLogItem = {
  id: string
  level: SystemLogLevel
  source: SystemLogSource
  feature: string
  action: string
  message: string
  userId: string
  adminId: string
  partnerId: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  ipAddress: string
  userAgent: string
  createdAt: string
}

type UserLabel = {
  label: string
  phone: string
}

type SystemLogsData = {
  logs: SystemLogItem[]
  total: number
  userLabels: Map<string, UserLabel>
}

type SystemLogsMaintenanceStatus = {
  key: string
  name: string
  isEnabled: boolean
  retentionDays: number
  runHourUtc: number
  lastRunAt: string
  lastDeletedCount: number
  lastError: string
  nextRunAt: string
  candidateCount: number
  totalCount: number
  updatedAt: string
}

type SystemLogsFilters = {
  search: string
  level: 'all' | SystemLogLevel
  source: 'all' | SystemLogSource
  feature: string
  action: string
  dateFrom: string
  dateTo: string
}

type SuperAdminSystemLogsPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
  sentryRoute: string
}

const pageSizeOptions = [25, 50, 100]
const exportLimit = 5000
const retentionOptions = [30, 60, 90, 180, 365]
const runHourOptions = Array.from({ length: 24 }, (_, hour) => hour)

const initialFilters: SystemLogsFilters = {
  search: '',
  level: 'all',
  source: 'all',
  feature: '',
  action: '',
  dateFrom: '',
  dateTo: '',
}

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

function formatMaintenanceHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00 UTC`
}

function levelLabel(level: SystemLogLevel) {
  return {
    debug: 'Debug',
    info: 'Info',
    warning: 'Warning',
    error: 'Erreur',
  }[level]
}

function sourceLabel(source: SystemLogSource) {
  return {
    mobile: 'Mobile',
    web_admin: 'Web SA',
    web_partner: 'Web AP',
    landing: 'Landing',
    edge_function: 'Edge Function',
    database: 'Base SQL',
  }[source]
}

function getVisibleNavItems(
  permissions: string[] | undefined,
  navItems: FeatureNavItem[],
) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function buildIsoDate(value: string, endOfDay = false) {
  if (!value) return ''
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
}

async function fetchSystemLogs(
  filters: SystemLogsFilters,
  page: number,
  pageSize: number,
): Promise<SystemLogsData> {
  const from = page * pageSize
  const to = from + pageSize - 1
  const query = applySystemLogFilters(filters).range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  const logs = mapSystemLogsRows(data)
  const userLabels = await fetchUserLabels(logs)

  return {
    logs,
    total: count ?? 0,
    userLabels,
  }
}

function applySystemLogFilters(filters: SystemLogsFilters) {
  let query = supabase
    .from('system_logs')
    .select(
      'id, level, source, feature, action, message, user_id, admin_id, partner_id, entity_type, entity_id, metadata, ip_address, user_agent, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (filters.level !== 'all') query = query.eq('level', filters.level)
  if (filters.source !== 'all') query = query.eq('source', filters.source)
  if (filters.feature.trim()) query = query.ilike('feature', `%${filters.feature.trim()}%`)
  if (filters.action.trim()) query = query.ilike('action', `%${filters.action.trim()}%`)
  if (filters.dateFrom) query = query.gte('created_at', buildIsoDate(filters.dateFrom))
  if (filters.dateTo) query = query.lte('created_at', buildIsoDate(filters.dateTo, true))

  const search = filters.search.trim()
  if (search) {
    const escaped = search.replace(/[%_]/g, '\\$&')
    query = query.or(
      [
        `message.ilike.%${escaped}%`,
        `feature.ilike.%${escaped}%`,
        `action.ilike.%${escaped}%`,
        `entity_type.ilike.%${escaped}%`,
        `entity_id.ilike.%${escaped}%`,
      ].join(','),
    )
  }

  return query
}

function mapSystemLogsRows(data: unknown[] | null): SystemLogItem[] {
  return (data ?? []).map((rowValue) => {
    const row = rowValue as Record<string, unknown>
    return {
      id: row.id as string,
      level: ((row.level as string | null) ?? 'info') as SystemLogLevel,
      source: ((row.source as string | null) ?? 'database') as SystemLogSource,
      feature: (row.feature as string | null) ?? '',
      action: (row.action as string | null) ?? '',
      message: (row.message as string | null) ?? '',
      userId: (row.user_id as string | null) ?? '',
      adminId: (row.admin_id as string | null) ?? '',
      partnerId: (row.partner_id as string | null) ?? '',
      entityType: (row.entity_type as string | null) ?? '',
      entityId: (row.entity_id as string | null) ?? '',
      metadata: parseMetadata(row.metadata),
      ipAddress: (row.ip_address as string | null) ?? '',
      userAgent: (row.user_agent as string | null) ?? '',
      createdAt: (row.created_at as string | null) ?? '',
    }
  })
}

async function fetchUserLabels(logs: SystemLogItem[]) {
  const userIds = Array.from(
    new Set(
      logs.flatMap((log) => [log.userId, log.adminId]).filter(Boolean),
    ),
  )
  const userLabels = new Map<string, UserLabel>()
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, phone, role')
      .in('id', userIds)
    if (!usersError) {
      for (const user of users ?? []) {
        const id = user.id as string
        const username = (user.username as string | null) ?? ''
        const phone = (user.phone as string | null) ?? ''
        const role = (user.role as string | null) ?? ''
        userLabels.set(id, {
          label: username || phone || role || id.slice(0, 8),
          phone,
        })
      }
    }
  }
  return userLabels
}

async function fetchSystemLogsForExport(filters: SystemLogsFilters) {
  const query = applySystemLogFilters(filters).range(0, exportLimit - 1)
  const { data, error } = await query
  if (error) throw error
  return mapSystemLogsRows(data)
}

function mapMaintenanceStatus(value: unknown): SystemLogsMaintenanceStatus {
  const row = (value ?? {}) as Record<string, unknown>
  return {
    key: (row.key as string | null) ?? 'system_logs_retention',
    name: (row.name as string | null) ?? 'Rétention des logs système',
    isEnabled: Boolean(row.is_enabled ?? true),
    retentionDays: Number(row.retention_days ?? 90),
    runHourUtc: Number(row.run_hour_utc ?? 2),
    lastRunAt: (row.last_run_at as string | null) ?? '',
    lastDeletedCount: Number(row.last_deleted_count ?? 0),
    lastError: (row.last_error as string | null) ?? '',
    nextRunAt: (row.next_run_at as string | null) ?? '',
    candidateCount: Number(row.candidate_count ?? 0),
    totalCount: Number(row.total_count ?? 0),
    updatedAt: (row.updated_at as string | null) ?? '',
  }
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

async function fetchMaintenanceStatus() {
  const { data, error } = await supabase.rpc('get_system_logs_maintenance_status')
  if (error) throw error
  return mapMaintenanceStatus(data)
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, logs: SystemLogItem[]) {
  const headers = [
    'date',
    'level',
    'source',
    'feature',
    'action',
    'message',
    'user_id',
    'admin_id',
    'partner_id',
    'entity_type',
    'entity_id',
    'metadata',
  ]
  const rows = logs.map((log) => [
    log.createdAt,
    log.level,
    log.source,
    log.feature,
    log.action,
    log.message,
    log.userId,
    log.adminId,
    log.partnerId,
    log.entityType,
    log.entityId,
    JSON.stringify(log.metadata),
  ])
  const csv = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function SystemLogDetailModal({
  log,
  userLabels,
  onClose,
}: {
  log: SystemLogItem
  userLabels: Map<string, UserLabel>
  onClose: () => void
}) {
  const user = log.userId ? userLabels.get(log.userId) : null
  const admin = log.adminId ? userLabels.get(log.adminId) : null

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="contest-modal system-log-modal" aria-label="Détail log système">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{sourceLabel(log.source)} · {levelLabel(log.level)}</p>
            <h2>{log.feature}.{log.action}</h2>
            <p className="modal-subtitle">{formatDate(log.createdAt)}</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="system-log-detail-grid">
          <article>
            <span>Message</span>
            <strong>{log.message}</strong>
          </article>
          <article>
            <span>Utilisateur</span>
            <strong>{user?.label ?? (log.userId || 'Non défini')}</strong>
            {user?.phone ? <p>{user.phone}</p> : null}
          </article>
          <article>
            <span>Admin</span>
            <strong>{admin?.label ?? (log.adminId || 'Non défini')}</strong>
            {admin?.phone ? <p>{admin.phone}</p> : null}
          </article>
          <article>
            <span>Entité</span>
            <strong>{log.entityType || 'Non définie'}</strong>
            <p>{log.entityId || 'Aucun identifiant'}</p>
          </article>
          <article>
            <span>Partenaire</span>
            <strong>{log.partnerId || 'Non défini'}</strong>
          </article>
          <article>
            <span>Origine</span>
            <strong>{log.ipAddress || 'IP non disponible'}</strong>
            <p>{log.userAgent || 'User agent non défini'}</p>
          </article>
        </div>

        <div className="system-log-json">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Metadata</p>
              <h3>Contexte JSON</h3>
            </div>
          </div>
          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
        </div>
      </section>
    </div>
  )
}

function PurgeSystemLogsModal({
  isPurging,
  retentionDays,
  onClose,
  onConfirm,
}: {
  isPurging: boolean
  retentionDays: number
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Confirmation purge logs systeme"
        className="contest-modal system-log-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Action sensible</p>
            <h2>Purger les logs anciens</h2>
            <p className="modal-subtitle">
              Les logs plus anciens que {retentionDays} jours seront supprimés.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="delete-confirm-summary">
          <strong>Cette action est irréversible.</strong>
          <small>
            Les événements récents restent conservés. Une trace de cette purge
            sera automatiquement ajoutée dans le journal système.
          </small>
        </div>

        <div className="modal-actions">
          <button className="secondary-action-button" onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={isPurging}
            onClick={onConfirm}
            type="button"
          >
            {isPurging ? 'Purge...' : 'Confirmer la purge'}
          </button>
        </div>
      </section>
    </div>
  )
}

function DeleteAllSystemLogsModal({
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
        aria-label="Confirmation suppression totale logs systeme"
        className="contest-modal system-log-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Action critique</p>
            <h2>Supprimer tous les logs</h2>
            <p className="modal-subtitle">
              Tout l’historique des logs système sera supprimé.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="delete-confirm-summary">
          <strong>Cette action est irréversible.</strong>
          <small>
            Utilise cette action uniquement pour nettoyer un environnement de
            test ou repartir sur un journal vide.
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
            {isDeleting ? 'Suppression...' : 'Supprimer tous les logs'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function SuperAdminSystemLogsPage({
  authRoute,
  rootRoute,
  navItems,
  sentryRoute,
}: SuperAdminSystemLogsPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [filters, setFilters] = useState<SystemLogsFilters>(initialFilters)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [logsData, setLogsData] = useState<SystemLogsData>({
    logs: [],
    total: 0,
    userLabels: new Map(),
  })
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false)
  const [isMaintaining, setIsMaintaining] = useState(false)
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newEventsCount, setNewEventsCount] = useState(0)
  const [lastRealtimeAt, setLastRealtimeAt] = useState('')
  const [retentionDays, setRetentionDays] = useState(90)
  const [runHourUtc, setRunHourUtc] = useState(2)
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(true)
  const [maintenanceStatus, setMaintenanceStatus] =
    useState<SystemLogsMaintenanceStatus | null>(null)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)
  const refreshTimerRef = useRef<number | null>(null)

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setLogsData(await fetchSystemLogs(filters, page, pageSize))
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Impossible de charger les logs système.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const loadMaintenanceStatus = useCallback(async () => {
    if (!hasAdminPermission(adminAuth.profile?.permissions, 'system_logs', 'write')) return
    try {
      const status = await fetchMaintenanceStatus()
      setMaintenanceStatus(status)
      setRetentionDays(status.retentionDays)
      setRunHourUtc(status.runHourUtc)
      setMaintenanceEnabled(status.isEnabled)
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'Impossible de charger la maintenance des logs.',
      )
    }
  }, [adminAuth.profile?.permissions])

  useEffect(() => {
    void loadMaintenanceStatus()
  }, [loadMaintenanceStatus])

  useEffect(() => {
    setPage(0)
  }, [filters, pageSize])

  useEffect(() => {
    const channel = supabase
      .channel('system-logs-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_logs' },
        () => {
          setLastRealtimeAt(new Date().toISOString())
          setNewEventsCount((current) => current + 1)
          if (refreshTimerRef.current != null) {
            window.clearTimeout(refreshTimerRef.current)
          }
          refreshTimerRef.current = window.setTimeout(() => {
            if (page === 0) void loadLogs()
            refreshTimerRef.current = null
          }, 900)
        },
      )
      .subscribe()

    return () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [loadLogs, page])

  const totalPages = Math.max(1, Math.ceil(logsData.total / pageSize))
  const pageStart = logsData.total === 0 ? 0 : page * pageSize + 1
  const pageEnd = Math.min(logsData.total, (page + 1) * pageSize)
  const pages = useMemo(() => {
    const start = Math.max(0, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [page, totalPages])

  const stats = useMemo(() => {
    const errors = logsData.logs.filter((log) => log.level === 'error').length
    const warnings = logsData.logs.filter((log) => log.level === 'warning').length
    const backend = logsData.logs.filter((log) =>
      log.source === 'database' || log.source === 'edge_function',
    ).length
    const mobile = logsData.logs.filter((log) => log.source === 'mobile').length
    return { errors, warnings, backend, mobile }
  }, [logsData.logs])

  function updateFilter<Key extends keyof SystemLogsFilters>(
    key: Key,
    value: SystemLogsFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  async function handleExportCsv() {
    setIsExporting(true)
    setError('')
    setNotice('')
    try {
      const logs = await fetchSystemLogsForExport(filters)
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      downloadCsv(`mega-promo-system-logs-${stamp}.csv`, logs)
      void logAdminAction({
        feature: 'system_logs',
        action: 'export_csv',
        message: 'Export CSV des logs systeme.',
        metadata: {
          exported_count: logs.length,
          export_limit: exportLimit,
          filters,
        },
      })
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Impossible d’exporter les logs système.',
      )
      void logError({
        feature: 'system_logs',
        action: 'export_csv_failed',
        message: 'Echec export CSV des logs systeme.',
        metadata: {
          filters,
          error: exportError instanceof Error
            ? exportError.message
            : String(exportError),
        },
      })
    } finally {
      setIsExporting(false)
    }
  }

  async function handlePurgeOldLogs() {
    setIsPurging(true)
    setError('')
    setNotice('')
    try {
      const { data, error: purgeError } = await supabase.rpc(
        'admin_purge_system_logs',
        { p_retention_days: retentionDays },
      )
      if (purgeError) throw purgeError
      const payload = (data ?? {}) as {
        deleted_count?: number
        retention_days?: number
      }
      setIsPurgeModalOpen(false)
      setNotice(
        `${formatNumber(payload.deleted_count ?? 0)} log(s) anciens purgés. Rétention conservée: ${payload.retention_days ?? retentionDays} jours.`,
      )
      void loadLogs()
      void loadMaintenanceStatus()
    } catch (purgeError) {
      setError(
        purgeError instanceof Error
          ? purgeError.message
          : 'Impossible de purger les logs système.',
      )
      void logError({
        feature: 'system_logs',
        action: 'purge_old_logs_failed',
        message: 'Echec purge des logs systeme anciens.',
        metadata: {
          retention_days: retentionDays,
          error: purgeError instanceof Error
            ? purgeError.message
            : String(purgeError),
        },
      })
    } finally {
      setIsPurging(false)
    }
  }

  async function handleDeleteAllLogs() {
    setIsDeletingAllLogs(true)
    setError('')
    setNotice('')
    try {
      const { data, error: deleteError } = await supabase.rpc(
        'admin_delete_all_system_logs',
      )
      if (deleteError) throw deleteError
      const payload = (data ?? {}) as { deleted_count?: number }
      setIsDeleteAllModalOpen(false)
      setNotice(`${formatNumber(payload.deleted_count ?? 0)} log(s) supprimés.`)
      setPage(0)
      await loadLogs()
      void loadMaintenanceStatus()
    } catch (deleteError) {
      setError(formatSupabaseError(
        deleteError,
        'Impossible de supprimer tous les logs système.',
      ))
    } finally {
      setIsDeletingAllLogs(false)
    }
  }

  async function handleSaveMaintenanceSettings(nextEnabled = maintenanceEnabled) {
    setIsSavingMaintenance(true)
    setError('')
    setNotice('')
    try {
      const { data, error: saveError } = await supabase.rpc(
        'admin_upsert_system_logs_maintenance',
        {
          p_is_enabled: nextEnabled,
          p_retention_days: retentionDays,
          p_run_hour_utc: runHourUtc,
        },
      )
      if (saveError) throw saveError
      const saved = mapMaintenanceStatus(data)
      setMaintenanceStatus(saved)
      setMaintenanceEnabled(saved.isEnabled)
      setRetentionDays(saved.retentionDays)
      setRunHourUtc(saved.runHourUtc)
      setNotice(
        `Maintenance ${saved.isEnabled ? 'activée' : 'désactivée'} · rétention ${saved.retentionDays} jours · passage ${formatMaintenanceHour(saved.runHourUtc)}.`,
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Impossible d’enregistrer la maintenance des logs.',
      )
      void logError({
        feature: 'system_logs',
        action: 'maintenance_settings_failed',
        message: 'Echec mise a jour configuration maintenance logs.',
        metadata: {
          is_enabled: nextEnabled,
          retention_days: retentionDays,
          run_hour_utc: runHourUtc,
          error: saveError instanceof Error
            ? saveError.message
            : String(saveError),
        },
      })
    } finally {
      setIsSavingMaintenance(false)
    }
  }

  async function handleRunMaintenance(dryRun: boolean) {
    setIsMaintaining(true)
    setError('')
    setNotice('')
    try {
      const { data, error: runError } = await supabase.rpc(
        'admin_run_system_logs_maintenance',
        {
          p_force: true,
          p_dry_run: dryRun,
        },
      )
      if (runError) throw runError
      const payload = (data ?? {}) as {
        candidate_count?: number
        deleted_count?: number
        retention_days?: number
        status?: string
      }
      setNotice(
        dryRun
          ? `${formatNumber(payload.candidate_count ?? 0)} log(s) seraient supprimés avec la rétention actuelle.`
          : `${formatNumber(payload.deleted_count ?? 0)} log(s) supprimés par la maintenance.`,
      )
      await loadMaintenanceStatus()
      if (!dryRun) void loadLogs()
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : 'Impossible d’exécuter la maintenance des logs.',
      )
      void logError({
        feature: 'system_logs',
        action: 'maintenance_run_failed',
        message: 'Echec execution maintenance logs.',
        metadata: {
          dry_run: dryRun,
          error: runError instanceof Error ? runError.message : String(runError),
        },
      })
    } finally {
      setIsMaintaining(false)
    }
  }

  function handleShowNewEvents() {
    setNewEventsCount(0)
    if (page !== 0) {
      setPage(0)
      return
    }
    void loadLogs()
  }

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  const visibleNavItems = getVisibleNavItems(adminAuth.profile?.permissions, navItems)
  const canManageLogs = hasAdminPermission(
    adminAuth.profile?.permissions,
    'system_logs',
    'write',
  )

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
            <NavLink end={item.href === rootRoute} to={item.href} key={item.label}>
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
          <span>Observabilité</span>
          <strong>Logs système</strong>
          <p>Audit SA, mobile, backend et Edge Functions centralisés.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Observabilité</p>
            <h1>Logs système</h1>
            <p className="page-subtitle">
              Suis les événements métier, erreurs backend et actions sensibles.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="primary-button"
              onClick={() => navigate(sentryRoute)}
              type="button"
            >
              Erreurs Sentry
            </button>
            <button
              className="secondary-action-button"
              disabled={isExporting}
              onClick={() => void handleExportCsv()}
              type="button"
            >
              {isExporting ? 'Export...' : 'Exporter CSV'}
            </button>
            <button className="secondary-action-button" onClick={() => void loadLogs()} type="button">
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
              <strong>Logs indisponibles</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Action effectuée</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        <section className="settings-overview system-logs-overview">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">Σ</span>
            <div>
              <small>Total filtré</small>
              <strong>{formatNumber(logsData.total)}</strong>
              <p>{pageStart}-{pageEnd} affichés sur cette vue.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon danger">!</span>
            <div>
              <small>Erreurs page</small>
              <strong>{formatNumber(stats.errors)}</strong>
              <p>{formatNumber(stats.warnings)} warning(s) visibles.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">B</span>
            <div>
              <small>Backend</small>
              <strong>{formatNumber(stats.backend)}</strong>
              <p>Database + Edge Functions sur la page courante.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">M</span>
            <div>
              <small>Mobile</small>
              <strong>{formatNumber(stats.mobile)}</strong>
              <p>Événements app visibles sur la page courante.</p>
            </div>
          </article>
        </section>

        {canManageLogs ? (
          <section className="panel system-logs-automation-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Automatisation</p>
                <h2>Maintenance des logs</h2>
                <p>
                  Planifie une purge quotidienne, garde les événements récents
                  et surveille les logs éligibles au nettoyage.
                </p>
              </div>
              <button
                className={`feature-toggle-button ${maintenanceEnabled ? 'enabled' : ''}`}
                disabled={isSavingMaintenance}
                onClick={() => {
                  const nextEnabled = !maintenanceEnabled
                  setMaintenanceEnabled(nextEnabled)
                  void handleSaveMaintenanceSettings(nextEnabled)
                }}
                type="button"
              >
                {maintenanceEnabled ? 'Automatique actif' : 'Automatique inactif'}
              </button>
            </div>

            <div className="system-logs-automation-grid">
              <article>
                <small>Prochain passage</small>
                <strong>{formatDate(maintenanceStatus?.nextRunAt ?? '')}</strong>
                <p>{formatMaintenanceHour(runHourUtc)} · vérification horaire si cron actif.</p>
              </article>
              <article>
                <small>Logs éligibles</small>
                <strong>{formatNumber(maintenanceStatus?.candidateCount ?? 0)}</strong>
                <p>Sur {formatNumber(maintenanceStatus?.totalCount ?? logsData.total)} log(s) stockés.</p>
              </article>
              <article>
                <small>Dernier passage</small>
                <strong>{formatDate(maintenanceStatus?.lastRunAt ?? '')}</strong>
                <p>{formatNumber(maintenanceStatus?.lastDeletedCount ?? 0)} log(s) supprimés.</p>
              </article>
              <article className={maintenanceStatus?.lastError ? 'danger' : ''}>
                <small>État</small>
                <strong>{maintenanceStatus?.lastError ? 'Erreur' : 'Stable'}</strong>
                <p>{maintenanceStatus?.lastError || 'Aucune erreur récente.'}</p>
              </article>
            </div>

            <div className="system-logs-maintenance-actions">
              <div className="system-logs-retention-actions">
                <select
                  aria-label="Durée de rétention des logs"
                  onChange={(event) => setRetentionDays(Number(event.target.value))}
                  value={retentionDays}
                >
                  {retentionOptions.map((days) => (
                    <option key={days} value={days}>
                      Garder {days} jours
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Heure UTC de maintenance"
                  onChange={(event) => setRunHourUtc(Number(event.target.value))}
                  value={runHourUtc}
                >
                  {runHourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      Passage {formatMaintenanceHour(hour)}
                    </option>
                  ))}
                </select>
                <button
                  className="secondary-action-button"
                  disabled={isSavingMaintenance}
                  onClick={() => void handleSaveMaintenanceSettings()}
                  type="button"
                >
                  {isSavingMaintenance ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
              <div className="system-logs-retention-actions">
                <button
                  className="secondary-action-button"
                  disabled={isMaintaining}
                  onClick={() => void handleRunMaintenance(true)}
                  type="button"
                >
                  Simuler
                </button>
                <button
                  className="danger-action-button"
                  disabled={isMaintaining}
                  onClick={() => void handleRunMaintenance(false)}
                  type="button"
                >
                  {isMaintaining ? 'Maintenance...' : 'Lancer maintenant'}
                </button>
                <button
                  className="danger-action-button ghost"
                  onClick={() => setIsPurgeModalOpen(true)}
                  type="button"
                >
                  Purge manuelle
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

        <section className="panel system-logs-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Journal</p>
              <h2>Événements enregistrés</h2>
              <p>
                Flux temps réel actif
                {lastRealtimeAt ? ` · dernier événement ${formatDate(lastRealtimeAt)}` : ''}
              </p>
            </div>
            <div className="section-heading-actions">
              {newEventsCount > 0 ? (
                <button
                  className="secondary-action-button"
                  onClick={handleShowNewEvents}
                  type="button"
                >
                  {formatNumber(newEventsCount)} nouveau(x)
                </button>
              ) : null}
              <span className="pill">
                {isLoading ? 'Chargement' : `${formatNumber(logsData.total)} lignes`}
              </span>
            </div>
          </div>

          <div className="contest-filter-bar system-logs-filters">
            <input
              aria-label="Rechercher dans les logs"
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Rechercher message, feature, action, entité..."
              type="search"
              value={filters.search}
            />
            <select
              aria-label="Filtrer par niveau"
              onChange={(event) =>
                updateFilter('level', event.target.value as SystemLogsFilters['level'])
              }
              value={filters.level}
            >
              <option value="all">Tous les niveaux</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Erreur</option>
            </select>
            <select
              aria-label="Filtrer par source"
              onChange={(event) =>
                updateFilter('source', event.target.value as SystemLogsFilters['source'])
              }
              value={filters.source}
            >
              <option value="all">Toutes sources</option>
              <option value="mobile">Mobile</option>
              <option value="web_admin">Web SA</option>
              <option value="web_partner">Web AP</option>
              <option value="landing">Landing</option>
              <option value="edge_function">Edge Function</option>
              <option value="database">Base SQL</option>
            </select>
            <input
              aria-label="Filtrer par feature"
              onChange={(event) => updateFilter('feature', event.target.value)}
              placeholder="Feature"
              type="text"
              value={filters.feature}
            />
            <input
              aria-label="Filtrer par action"
              onChange={(event) => updateFilter('action', event.target.value)}
              placeholder="Action"
              type="text"
              value={filters.action}
            />
            <input
              aria-label="Date début"
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              type="date"
              value={filters.dateFrom}
            />
            <input
              aria-label="Date fin"
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              type="date"
              value={filters.dateTo}
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

          <div
            className="premium-notification-table system-logs-table"
            role="table"
            aria-label="Logs système"
          >
            <div className="premium-notification-head system-logs-head" role="row">
              <span>Date</span>
              <span>Niveau</span>
              <span>Source</span>
              <span>Feature / action</span>
              <span>Message</span>
              <span>Entité</span>
              <span>Acteur</span>
              <span>Action</span>
            </div>
            {logsData.logs.length > 0 ? (
              logsData.logs.map((log) => {
                const user = log.userId ? logsData.userLabels.get(log.userId) : null
                const admin = log.adminId ? logsData.userLabels.get(log.adminId) : null
                return (
                  <article
                    className="premium-notification-row system-logs-row"
                    key={log.id}
                    role="row"
                  >
                    <div>
                      <strong>{formatDate(log.createdAt)}</strong>
                      <p>{log.id.slice(0, 8)}</p>
                    </div>
                    <span className={`system-log-level ${log.level}`}>
                      {levelLabel(log.level)}
                    </span>
                    <span className={`system-log-source ${log.source}`}>
                      {sourceLabel(log.source)}
                    </span>
                    <div>
                      <strong>{log.feature}</strong>
                      <p>{log.action}</p>
                    </div>
                    <p className="system-log-message">{log.message}</p>
                    <div>
                      <strong>{log.entityType || 'Aucune'}</strong>
                      <p>{log.entityId || 'Non défini'}</p>
                    </div>
                    <div>
                      <strong>{admin?.label ?? user?.label ?? 'Système'}</strong>
                      <p>{admin ? 'Admin' : user ? 'Joueur' : 'Automatique'}</p>
                    </div>
                    <button
                      className="table-action-button"
                      onClick={() => setSelectedLog(log)}
                      type="button"
                    >
                      Voir
                    </button>
                  </article>
                )
              })
            ) : (
              <div className="empty-state compact">
                <strong>{isLoading ? 'Chargement...' : 'Aucun log trouvé'}</strong>
                <p>Ajuste les filtres ou vérifie que les événements ont bien été générés.</p>
              </div>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {pageStart}-{pageEnd} sur {formatNumber(logsData.total)}
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
              <div className="pagination-pages">
                {pages.map((pageIndex) => (
                  <button
                    className={`pagination-page-button ${pageIndex === page ? 'active' : ''}`}
                    key={pageIndex}
                    onClick={() => setPage(pageIndex)}
                    type="button"
                  >
                    {pageIndex + 1}
                  </button>
                ))}
              </div>
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

      {selectedLog ? (
        <SystemLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          userLabels={logsData.userLabels}
        />
      ) : null}
      {isPurgeModalOpen ? (
        <PurgeSystemLogsModal
          isPurging={isPurging}
          onClose={() => setIsPurgeModalOpen(false)}
          onConfirm={() => void handlePurgeOldLogs()}
          retentionDays={retentionDays}
        />
      ) : null}
      {isDeleteAllModalOpen ? (
        <DeleteAllSystemLogsModal
          isDeleting={isDeletingAllLogs}
          onClose={() => setIsDeleteAllModalOpen(false)}
          onConfirm={() => void handleDeleteAllLogs()}
        />
      ) : null}
    </main>
  )
}
