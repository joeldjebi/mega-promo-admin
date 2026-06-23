import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type NotificationTarget = 'all' | 'active' | 'premium' | 'single' | 'selected'
type PushDeviceTarget = 'all' | 'ios' | 'android'
type NotificationFormState = {
  target: NotificationTarget
  userId: string
  userIds: string[]
  title: string
  body: string
  type: string
  contestId: string
  sendPush: boolean
  pushDeviceTarget: PushDeviceTarget
  sendSms: boolean
  smsMessage: string
}
type UserOption = {
  id: string
  label: string
  hasPushToken?: boolean
  pushPlatform?: string
  pushLastError?: string
  pushLastErrorAt?: string
}
type NotificationHistoryRecipient = {
  notificationId: string
  userId: string
  label: string
  isRead: boolean
  hasPushToken: boolean
  pushPlatform: string
  pushLastError: string
  createdAt: string
}
type NotificationHistoryBatch = {
  id: string
  title: string
  body: string
  type: string
  targetLabel: string
  createdAt: string
  pushSummary: string
  smsSummary: string
  recipients: NotificationHistoryRecipient[]
}
type SupabaseLikeError = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
}
type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}
type SuperAdminNotificationsPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
}

function getVisibleFeatureNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

function formatUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const supabaseError = error as SupabaseLikeError
    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code]
      .filter((item) => typeof item === 'string' && item.length > 0)
      .join(' · ') || fallback
  }
  return fallback
}

function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onRefresh: () => void | Promise<void>,
) {
  const refreshRef = useRef(onRefresh)
  const tablesKey = tables.join('|')

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    let refreshTimeout = 0
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void refreshRef.current()
      }, 350)
    }

    const channel = supabase.channel(channelName)
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      )
    })

    channel.subscribe()

    return () => {
      window.clearTimeout(refreshTimeout)
      void supabase.removeChannel(channel)
    }
  }, [channelName, tablesKey])
}

function createClientUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomValues =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(16))
      : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))

  randomValues[6] = (randomValues[6] & 0x0f) | 0x40
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80

  const hex = Array.from(randomValues, (value) =>
    value.toString(16).padStart(2, '0'),
  )

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function notificationTargetLabel(target: NotificationTarget) {
  if (target === 'active') return 'Joueurs actifs'
  if (target === 'premium') return 'Joueurs premium'
  if (target === 'single') return 'Un joueur'
  if (target === 'selected') return 'Sélection'
  return 'Tous les joueurs actifs'
}

function pushDeviceTargetLabel(target: PushDeviceTarget) {
  if (target === 'ios') return 'iOS uniquement'
  if (target === 'android') return 'Android uniquement'
  return 'iOS et Android'
}

function pushPlatformsForTarget(target: PushDeviceTarget): Array<'ios' | 'android'> {
  if (target === 'ios') return ['ios']
  if (target === 'android') return ['android']
  return ['ios', 'android']
}

function parseNotificationData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

async function fetchNotificationHistory(): Promise<NotificationHistoryBatch[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, type, is_read, data, created_at')
    .order('created_at', { ascending: false })
    .limit(800)

  if (error) throw error

  const notifications = data ?? []
  const userIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.user_id as string | null)
        .filter(Boolean),
    ),
  ) as string[]
  const usersResponse =
    userIds.length > 0
      ? await supabase
          .from('users')
          .select(
            'id, username, phone, fcm_token, fcm_token_platform, fcm_token_last_error',
          )
          .in('id', userIds)
      : { data: [], error: null }

  if (usersResponse.error) throw usersResponse.error

  const usersById = new Map(
    (usersResponse.data ?? []).map((user) => [
      user.id as string,
      {
        label:
          (user.username as string | null) ??
          (user.phone as string | null) ??
          'Joueur',
        hasPushToken: Boolean(user.fcm_token),
        pushPlatform: (user.fcm_token_platform as string | null) ?? '',
        pushLastError: (user.fcm_token_last_error as string | null) ?? '',
      },
    ]),
  )
  const batches = new Map<string, NotificationHistoryBatch>()

  for (const notification of notifications) {
    const dataPayload = parseNotificationData(notification.data)
    const adminSend = parseNotificationData(dataPayload.admin_send)
    const batchId =
      typeof adminSend.batch_id === 'string' && adminSend.batch_id
        ? adminSend.batch_id
        : [
            notification.created_at,
            notification.title,
            notification.body,
            notification.type,
          ].join('|')
    const createdAt = (notification.created_at as string | null) ?? ''
    const targetLabel =
      typeof adminSend.target_label === 'string' && adminSend.target_label
        ? adminSend.target_label
        : 'Envoi historique'
    const pushSummary =
      typeof adminSend.push_summary === 'string' ? adminSend.push_summary : ''
    const smsSummary =
      typeof adminSend.sms_summary === 'string' ? adminSend.sms_summary : ''

    if (!batches.has(batchId)) {
      batches.set(batchId, {
        id: batchId,
        title: (notification.title as string | null) ?? 'Notification',
        body: (notification.body as string | null) ?? '',
        type: (notification.type as string | null) ?? 'info',
        targetLabel,
        createdAt,
        pushSummary,
        smsSummary,
        recipients: [],
      })
    }

    const userId = (notification.user_id as string | null) ?? ''
    const user = usersById.get(userId)
    batches.get(batchId)?.recipients.push({
      notificationId: notification.id as string,
      userId,
      label: user?.label ?? 'Joueur',
      isRead: (notification.is_read as boolean | null) ?? false,
      hasPushToken: user?.hasPushToken ?? false,
      pushPlatform: user?.pushPlatform ?? '',
      pushLastError: user?.pushLastError ?? '',
      createdAt,
    })
  }

  return Array.from(batches.values()).sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

function NotificationHistoryDetailModal({
  history,
  onClose,
}: {
  history: NotificationHistoryBatch
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="contest-modal notification-history-modal" aria-label="Détail notification">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Historique notification</p>
            <h2>{history.title}</h2>
            <p className="modal-subtitle">{formatDate(history.createdAt)}</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="notification-message-detail">
          <span className="contest-type-pill">{history.type}</span>
          <p>{history.body}</p>
          <small>
            {history.pushSummary || 'Push non tracé'} ·{' '}
            {history.smsSummary || 'SMS non tracé'}
          </small>
        </div>

        <div className="premium-notification-recipient-table">
          <div className="premium-notification-recipient-head">
            <span>Joueur</span>
            <span>In-app</span>
            <span>Lecture</span>
            <span>Push</span>
          </div>
          {history.recipients.map((recipient) => (
            <article className="premium-notification-recipient-row" key={recipient.notificationId}>
              <div>
                <strong>{recipient.label}</strong>
                <p>{recipient.userId.slice(0, 8)}</p>
              </div>
              <span className="status-pill sent">Reçue</span>
              <span className={`status-pill ${recipient.isRead ? 'active' : 'pending'}`}>
                {recipient.isRead ? 'Lue' : 'Non lue'}
              </span>
              <div>
                <strong>
                  {recipient.hasPushToken
                    ? `Disponible ${recipient.pushPlatform || 'mobile'}`
                    : 'Non disponible'}
                </strong>
                <p>{recipient.pushLastError || 'Aucune erreur récente'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export function SuperAdminNotificationsPage({ authRoute, rootRoute, navItems }: SuperAdminNotificationsPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [users, setUsers] = useState<UserOption[]>([])
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryBatch[]>([])
  const [selectedHistory, setSelectedHistory] = useState<NotificationHistoryBatch | null>(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all')
  const [historyPage, setHistoryPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<NotificationFormState>({
    target: 'all',
    userId: '',
    userIds: [],
    title: '',
    body: '',
    type: 'info',
    contestId: '',
    sendPush: false,
    pushDeviceTarget: 'all',
    sendSms: false,
    smsMessage: '',
  })

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, username, phone, is_premium, is_active, fcm_token, fcm_token_platform, fcm_token_last_error, fcm_token_last_error_at',
        )
        .eq('role', 'player')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      setUsers(
        (data ?? []).map((user) => ({
          id: user.id as string,
          label:
            (user.username as string | null) ??
            (user.phone as string | null) ??
            'Joueur',
          hasPushToken: Boolean(user.fcm_token),
          pushPlatform: (user.fcm_token_platform as string | null) ?? '',
          pushLastError: (user.fcm_token_last_error as string | null) ?? '',
          pushLastErrorAt: (user.fcm_token_last_error_at as string | null) ?? '',
        })),
      )
      setNotificationHistory(await fetchNotificationHistory())
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Impossible de charger les joueurs.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers()
  }, [loadUsers])

  useRealtimeRefresh('sa-notifications-realtime', ['users', 'notifications'], loadUsers)

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const title = form.title.trim()
    const body = form.body.trim()
    const smsMessage = form.smsMessage.trim() || body
    if (title.length < 3 || body.length < 3) {
      setError('Titre et message sont obligatoires.')
      return
    }

    if (form.sendSms && smsMessage.length < 3) {
      setError('Le message SMS doit contenir au moins 3 caractères.')
      return
    }

    if (form.target === 'single' && !form.userId) {
      setError('Choisis un joueur pour un envoi individuel.')
      return
    }

    if (form.target === 'selected' && form.userIds.length === 0) {
      setError('Sélectionne au moins un joueur.')
      return
    }

    setIsSending(true)

    try {
      let targetIds: string[] = []

      if (form.target === 'selected') {
        targetIds = form.userIds
      } else {
        let query = supabase
          .from('users')
          .select('id')
          .eq('role', 'player')
          .eq('is_active', true)

        if (form.target === 'premium') {
          query = query.eq('is_premium', true)
        }

        if (form.target === 'single') {
          query = query.eq('id', form.userId)
        }

        const { data: targetUsers, error: usersError } = await query.limit(5000)
        if (usersError) throw usersError

        targetIds = (targetUsers ?? []).map((user) => user.id as string)
      }

      targetIds = Array.from(new Set(targetIds))
      if (targetIds.length === 0) {
        setError('Aucun joueur trouvé pour cette cible.')
        return
      }

      const batchId = createClientUuid()
      const notificationIds = targetIds.map(() => createClientUuid())
      const createdAt = new Date().toISOString()
      const notificationData = {
        ...(form.contestId.trim() ? { contest_id: form.contestId.trim() } : {}),
        admin_send: {
          batch_id: batchId,
          target: form.target,
          target_label: notificationTargetLabel(form.target),
          target_count: targetIds.length,
          send_push: form.sendPush,
          push_device_target: form.pushDeviceTarget,
          push_device_label: pushDeviceTargetLabel(form.pushDeviceTarget),
          send_sms: form.sendSms,
        },
      }

      const { error: insertError } = await supabase.from('notifications').insert(
        targetIds.map((userId, index) => ({
          id: notificationIds[index],
          user_id: userId,
          title,
          body,
          type: form.type,
          is_read: false,
          data: notificationData,
          created_at: createdAt,
        })),
      )

      if (insertError) throw insertError

      let pushSummary = ' Push mobile: désactivé.'
      if (form.sendPush) {
        try {
          console.info('[MegaPromo][SA notifications][pushRequest]', {
            target: form.target,
            targetCount: targetIds.length,
            type: form.type,
            hasContestId: Boolean(form.contestId.trim()),
            pushDeviceTarget: form.pushDeviceTarget,
          })
          const { data: pushData, error: pushError } =
            await supabase.functions.invoke('send-push-notifications', {
              body: {
                userIds: targetIds,
                title,
                body,
                type: form.type,
                data: notificationData,
                platforms: pushPlatformsForTarget(form.pushDeviceTarget),
              },
            })
          console.info('[MegaPromo][SA notifications][pushResponse]', {
            data: pushData,
            error: pushError,
          })
          if (pushError) throw pushError
          const sent = Number((pushData as { sent?: number } | null)?.sent ?? 0)
          const failed = Number((pushData as { failed?: number } | null)?.failed ?? 0)
          const targetUsers = Number(
            (pushData as { targetUsers?: number } | null)?.targetUsers ??
              targetIds.length,
          )
          const pushMessage = (pushData as { message?: string } | null)?.message ?? ''
          const failedSample = (
            pushData as {
              failedSamples?: Array<{ summary?: string; response?: unknown }>
            } | null
          )?.failedSamples?.[0]
          const failedDetail =
            failed > 0 && failedSample
              ? ` Détail: ${
                  failedSample.summary ??
                  JSON.stringify(failedSample.response).slice(0, 180)
                }`
              : pushMessage
                ? ` ${pushMessage}`
                : ''
          pushSummary = ` Push mobile: ${sent}/${targetUsers} envoyé(s), ${failed} échec(s).${failedDetail}`
        } catch (pushError) {
          console.warn('[MegaPromo][SA notifications][pushError]', pushError)
          // La ligne Supabase est créée même si l'Edge Function push n'est pas encore déployée.
          pushSummary = ` Push mobile non envoyé: ${formatUnknownError(
            pushError,
            'Edge Function indisponible.',
          )}`
        }
      }

      let smsSummary = ''
      if (form.sendSms) {
        try {
          const { data: smsData, error: smsError } = await supabase.functions.invoke(
            'send-sms-mtarget',
            {
              body: {
                userIds: targetIds,
                message: smsMessage,
                sender: 'MEGAPROMO',
              },
            },
          )
          if (smsError) throw smsError

          const sent = Number((smsData as { sent?: number } | null)?.sent ?? 0)
          const failed = Number((smsData as { failed?: number } | null)?.failed ?? 0)
          smsSummary = ` SMS: ${sent} envoyé(s), ${failed} échec(s).`
        } catch (error) {
          smsSummary = ` SMS non envoyé: ${
            error instanceof Error ? error.message : 'Edge Function indisponible.'
          }`
        }
      }

      const finalNotificationData = {
        ...notificationData,
        admin_send: {
          ...notificationData.admin_send,
          push_summary: pushSummary.trim(),
          sms_summary: smsSummary.trim(),
        },
      }
      const { error: updateHistoryError } = await supabase
        .from('notifications')
        .update({ data: finalNotificationData })
        .in('id', notificationIds)

      if (updateHistoryError) {
        console.warn('[MegaPromo][SA notifications][historyUpdateError]', updateHistoryError)
      }

      setSuccess(
        `${targetIds.length} notification(s) créée(s).${pushSummary}${smsSummary}`,
      )
      void logAdminAction({
        feature: 'notifications',
        action: 'send_batch',
        message: 'Notification envoyee depuis le SA.',
        entityType: 'notification_batch',
        entityId: batchId,
        metadata: {
          target: form.target,
          type: form.type,
          target_count: targetIds.length,
          send_push: form.sendPush,
          push_device_target: form.pushDeviceTarget,
          push_device_label: pushDeviceTargetLabel(form.pushDeviceTarget),
          send_sms: form.sendSms,
          push_summary: pushSummary.trim(),
          sms_summary: smsSummary.trim(),
          has_contest_id: Boolean(form.contestId.trim()),
        },
      })
      setNotificationHistory(await fetchNotificationHistory())
      setForm({
        target: 'all',
        userId: '',
        userIds: [],
        title: '',
        body: '',
        type: 'info',
        contestId: '',
        sendPush: false,
        pushDeviceTarget: 'all',
        sendSms: false,
        smsMessage: '',
      })
    } catch (error) {
      void logError({
        feature: 'notifications',
        action: 'send_batch_failed',
        message: 'Echec envoi notification depuis le SA.',
        metadata: {
          target: form.target,
          type: form.type,
          send_push: form.sendPush,
          push_device_target: form.pushDeviceTarget,
          push_device_label: pushDeviceTargetLabel(form.pushDeviceTarget),
          send_sms: form.sendSms,
          error: formatUnknownError(error, 'Envoi impossible.'),
        },
      })
      setError(error instanceof Error ? error.message : 'Envoi impossible.')
    } finally {
      setIsSending(false)
    }
  }

  function toggleSelectedUser(userId: string) {
    setForm((currentForm) => {
      const exists = currentForm.userIds.includes(userId)
      return {
        ...currentForm,
        userIds: exists
          ? currentForm.userIds.filter((id) => id !== userId)
          : [...currentForm.userIds, userId],
      }
    })
  }

  function selectAllLoadedUsers() {
    setForm((currentForm) => ({
      ...currentForm,
      userIds: users.map((user) => user.id),
    }))
  }

  function clearSelectedUsers() {
    setForm((currentForm) => ({ ...currentForm, userIds: [] }))
  }

  const pushReadyCount = users.filter((user) => user.hasPushToken).length
  const notificationHistoryTypes = useMemo(
    () => Array.from(new Set(notificationHistory.map((history) => history.type))).sort(),
    [notificationHistory],
  )
  const filteredNotificationHistory = useMemo(() => {
    const search = historySearch.trim().toLowerCase()
    return notificationHistory.filter((history) => {
      const matchesSearch =
        !search ||
        history.title.toLowerCase().includes(search) ||
        history.body.toLowerCase().includes(search) ||
        history.targetLabel.toLowerCase().includes(search) ||
        history.recipients.some((recipient) =>
          recipient.label.toLowerCase().includes(search),
        )
      const matchesType =
        historyTypeFilter === 'all' || history.type === historyTypeFilter
      return matchesSearch && matchesType
    })
  }, [historySearch, historyTypeFilter, notificationHistory])
  const historyPageSize = 10
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredNotificationHistory.length / historyPageSize),
  )
  const paginatedNotificationHistory = useMemo(() => {
    const startIndex = historyPage * historyPageSize
    return filteredNotificationHistory.slice(startIndex, startIndex + historyPageSize)
  }, [filteredNotificationHistory, historyPage])
  const historyResultsStart =
    filteredNotificationHistory.length === 0 ? 0 : historyPage * historyPageSize + 1
  const historyResultsEnd = Math.min(
    filteredNotificationHistory.length,
    historyPage * historyPageSize + paginatedNotificationHistory.length,
  )
  const historyPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, historyPage - 2)
    const lastPage = Math.min(totalHistoryPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [historyPage, totalHistoryPages])
  const historyStats = useMemo(() => {
    const totalRecipients = notificationHistory.reduce(
      (total, history) => total + history.recipients.length,
      0,
    )
    const readRecipients = notificationHistory.reduce(
      (total, history) =>
        total + history.recipients.filter((recipient) => recipient.isRead).length,
      0,
    )
    const pushReadyRecipients = notificationHistory.reduce(
      (total, history) =>
        total + history.recipients.filter((recipient) => recipient.hasPushToken).length,
      0,
    )

    return {
      totalBatches: notificationHistory.length,
      totalRecipients,
      readRecipients,
      pushReadyRecipients,
    }
  }, [notificationHistory])
  const selectedCount =
    form.target === 'selected' ? form.userIds.length : form.target === 'single' && form.userId ? 1 : 0
  const previewTitle = form.title.trim() || 'Titre de la notification'
  const previewBody =
    form.body.trim() ||
    'Le message que les joueurs verront dans l’application apparaîtra ici.'

  useEffect(() => {
    setHistoryPage(0)
  }, [historySearch, historyTypeFilter])

  useEffect(() => {
    if (historyPage + 1 > totalHistoryPages) {
      setHistoryPage(totalHistoryPages - 1)
    }
  }, [historyPage, totalHistoryPages])

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
          {getVisibleFeatureNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
            <NavLink
              end={item.href === rootRoute}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {getVisibleFeatureNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Notifications</span>
          <strong>{users.length} joueurs chargés</strong>
          <p>Envoi groupé ou individuel vers l’app mobile, push optionnel et SMS.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communication</p>
            <h1>Notifications push</h1>
            <p className="page-subtitle">
              Crée une notification in-app, puis déclenche le push mobile ou le SMS seulement si tu l’actives.
            </p>
          </div>

          <div className="topbar-actions">
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
              <strong>Notification indisponible</strong>
              <p>{error}</p>
            </div>
            {isLoading ? null : <button onClick={loadUsers}>Réessayer</button>}
          </div>
        ) : null}

        {success ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Envoi préparé</strong>
              <p>{success}</p>
            </div>
          </div>
        ) : null}

        <section className="notification-summary-grid" aria-label="Résumé notifications">
          <article>
            <span>Joueurs chargés</span>
            <strong>{users.length}</strong>
            <p>Comptes joueurs actifs ou récents.</p>
          </article>
          <article>
            <span>Push prêt</span>
            <strong>{pushReadyCount}</strong>
            <p>Joueurs avec token mobile enregistré.</p>
          </article>
          <article>
            <span>Cible actuelle</span>
            <strong>{form.target === 'all' ? 'Tous' : selectedCount || 'Auto'}</strong>
            <p>{form.sendPush ? 'Push mobile activé.' : 'Notification in-app uniquement.'}</p>
          </article>
          <article>
            <span>Historique</span>
            <strong>{formatNumber(historyStats.totalBatches)}</strong>
            <p>{formatNumber(historyStats.totalRecipients)} destinataire(s) enregistrés.</p>
          </article>
        </section>

        <section className="panel categories-page-panel notification-composer-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Composer</p>
              <h2>Nouvelle notification</h2>
            </div>
            <span className="pill">{isLoading ? 'Chargement' : 'Prêt'}</span>
          </div>

          <div className="notification-console-grid">
            <form className="category-form contest-form notification-form" onSubmit={handleSubmit}>
              <div className="form-grid two-columns">
              <label>
                <span>Cible</span>
                <select
                  onChange={(event) => {
                    const target = event.target.value as NotificationTarget
                    setForm({
                      ...form,
                      target,
                      userId: target === 'single' ? form.userId : '',
                      userIds: target === 'selected' ? form.userIds : [],
                    })
                  }}
                  value={form.target}
                >
                  <option value="all">Tous les joueurs actifs</option>
                  <option value="premium">Joueurs premium</option>
                  <option value="selected">Plusieurs joueurs</option>
                  <option value="single">Un joueur précis</option>
                </select>
              </label>

              <label>
                <span>Type</span>
                <select
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  value={form.type}
                >
                  <option value="info">Info</option>
                  <option value="contest">Concours</option>
                  <option value="winner">Gagnant</option>
                  <option value="gain">Gain</option>
                  <option value="leaderboard">Classement</option>
                </select>
              </label>
            </div>

            {form.target === 'single' ? (
              <label>
                <span>Joueur</span>
                <select
                  onChange={(event) => setForm({ ...form, userId: event.target.value })}
                  value={form.userId}
                >
                  <option value="">Choisir un joueur</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label} · {user.hasPushToken ? `Push ${user.pushPlatform || 'mobile'}` : 'Push absent'}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.target === 'selected' ? (
              <div className="notification-recipient-panel">
                <div className="notification-recipient-header">
                  <div>
                    <strong>{form.userIds.length} joueur(s) sélectionné(s)</strong>
                    <p>Choisis un ou plusieurs joueurs parmi les comptes chargés.</p>
                  </div>
                  <div className="table-actions compact">
                    <button
                      className="table-action-button"
                      onClick={selectAllLoadedUsers}
                      type="button"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      className="table-action-button"
                      onClick={clearSelectedUsers}
                      type="button"
                    >
                      Vider
                    </button>
                  </div>
                </div>

                <div className="notification-recipient-list">
                  {users.map((user) => (
                    <label className="notification-recipient-row" key={user.id}>
                      <input
                        checked={form.userIds.includes(user.id)}
                        onChange={() => toggleSelectedUser(user.id)}
                        type="checkbox"
                      />
                      <span>
                        {user.label}
                        {user.hasPushToken ? (
                          <small>Push {user.pushPlatform || 'mobile'}</small>
                        ) : (
                          <small>Push absent</small>
                        )}
                      </span>
                    </label>
                  ))}
                  {users.length === 0 ? (
                    <p className="empty-panel-text">
                      {isLoading ? 'Chargement des joueurs...' : 'Aucun joueur chargé.'}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="form-grid two-columns">
              <label>
                <span>Titre</span>
                <input
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Ex: Nouveau concours disponible"
                  value={form.title}
                />
              </label>

              <label>
                <span>ID concours optionnel</span>
                <input
                  onChange={(event) =>
                    setForm({ ...form, contestId: event.target.value })
                  }
                  placeholder="UUID du concours"
                  value={form.contestId}
                />
              </label>
            </div>

            <label>
              <span>Message</span>
              <textarea
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                placeholder="Ton message pour les joueurs"
                rows={5}
                value={form.body}
              />
            </label>

            <label className="notification-recipient-row sms-toggle-row">
              <input
                checked={form.sendPush}
                onChange={(event) =>
                  setForm({ ...form, sendPush: event.target.checked })
                }
                type="checkbox"
              />
              <span>Envoyer aussi un vrai push mobile</span>
            </label>

            <label>
              <span>Device cible push</span>
              <select
                disabled={!form.sendPush}
                onChange={(event) =>
                  setForm({
                    ...form,
                    pushDeviceTarget: event.target.value as PushDeviceTarget,
                  })
                }
                value={form.pushDeviceTarget}
              >
                <option value="all">iOS et Android</option>
                <option value="ios">iOS uniquement</option>
                <option value="android">Android uniquement</option>
              </select>
              {!form.sendPush ? (
                <small>Active le push mobile pour utiliser ce ciblage.</small>
              ) : null}
            </label>

            <label className="notification-recipient-row sms-toggle-row">
              <input
                checked={form.sendSms}
                onChange={(event) =>
                  setForm({ ...form, sendSms: event.target.checked })
                }
                type="checkbox"
              />
              <span>Envoyer aussi par SMS avec mTarget</span>
            </label>

            {form.sendSms ? (
              <label>
                <span>Message SMS</span>
                <textarea
                  maxLength={480}
                  onChange={(event) =>
                    setForm({ ...form, smsMessage: event.target.value })
                  }
                  placeholder="Laisse vide pour reprendre le message principal"
                  rows={3}
                  value={form.smsMessage}
                />
                <small className="form-help">
                  Les SMS utilisent le numéro enregistré dans le profil joueur.
                </small>
              </label>
            ) : null}

              <div className="modal-actions">
                <button className="inline-action-button" disabled={isSending} type="submit">
                  {isSending ? 'Envoi...' : 'Créer la notification'}
                </button>
              </div>
            </form>

            <aside className="notification-preview-panel" aria-label="Aperçu notification">
              <div className="notification-preview-phone">
                <div className="notification-preview-status">
                  <span />
                  <span />
                </div>
                <article className="notification-preview-card">
                  <small>MegaPromo</small>
                  <strong>{previewTitle}</strong>
                  <p>{previewBody}</p>
                  <div>
                    <span>{form.type}</span>
                    <span>{form.sendPush ? 'Push mobile' : 'In-app'}</span>
                  </div>
                </article>
              </div>
              <div className="notification-preview-help">
                <strong>Aperçu joueur</strong>
                <p>
                  Prévisualise rapidement le rendu avant création. Le push mobile reste optionnel
                  pour éviter les envois accidentels.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="panel notification-history-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Notifications envoyées</h2>
            </div>
            <span className="pill">
              {isLoading
                ? 'Chargement'
                : `${formatNumber(filteredNotificationHistory.length)} / ${formatNumber(historyStats.totalBatches)}`}
            </span>
          </div>

          <section className="settings-overview notification-history-stats" aria-label="Statistiques historique notifications">
            <article className="settings-overview-card featured">
              <span className="settings-overview-icon">N</span>
              <div>
                <small>Envois</small>
                <strong>{formatNumber(historyStats.totalBatches)}</strong>
                <p>Groupes de notifications reconstruits depuis la base.</p>
              </div>
            </article>
            <article className="settings-overview-card">
              <span className="settings-overview-icon">U</span>
              <div>
                <small>Destinataires</small>
                <strong>{formatNumber(historyStats.totalRecipients)}</strong>
                <p>{formatNumber(historyStats.readRecipients)} notification(s) lue(s).</p>
              </div>
            </article>
            <article className="settings-overview-card">
              <span className="settings-overview-icon">P</span>
              <div>
                <small>Push disponible</small>
                <strong>{formatNumber(historyStats.pushReadyRecipients)}</strong>
                <p>Destinataires avec token mobile enregistré.</p>
              </div>
            </article>
            <article className="settings-overview-card">
              <span className="settings-overview-icon">M</span>
              <div>
                <small>Messages</small>
                <strong>{notificationHistory[0]?.type ?? 'info'}</strong>
                <p>Dernier type de notification envoyé.</p>
              </div>
            </article>
          </section>

          <div className="contest-filter-bar compact notification-history-filters">
            <input
              className="search-input"
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Rechercher message, cible ou joueur..."
              type="search"
              value={historySearch}
            />
            <select
              aria-label="Filtrer par type de notification"
              onChange={(event) => setHistoryTypeFilter(event.target.value)}
              value={historyTypeFilter}
            >
              <option value="all">Tous les types</option>
              {notificationHistoryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="premium-notification-table">
            <div className="premium-notification-head">
              <span>Message</span>
              <span>Cible</span>
              <span>Destinataires</span>
              <span>Push / SMS</span>
              <span>Date</span>
              <span>Action</span>
            </div>
            {paginatedNotificationHistory.length > 0 ? (
              paginatedNotificationHistory.map((history) => {
                const readCount = history.recipients.filter((recipient) => recipient.isRead).length
                const pushReady = history.recipients.filter((recipient) => recipient.hasPushToken).length
                return (
                  <article className="premium-notification-row" key={history.id}>
                    <div>
                      <strong>{history.title}</strong>
                      <p>{history.body}</p>
                    </div>
                    <span className="contest-type-pill">{history.targetLabel}</span>
                    <div>
                      <strong>{formatNumber(history.recipients.length)}</strong>
                      <p>{formatNumber(readCount)} lu(s) · {formatNumber(pushReady)} push prêt(s)</p>
                    </div>
                    <div>
                      <strong>{history.pushSummary || 'Push non tracé'}</strong>
                      <p>{history.smsSummary || 'SMS non activé / non tracé'}</p>
                    </div>
                    <p>{formatDate(history.createdAt)}</p>
                    <button
                      className="table-action-button"
                      onClick={() => setSelectedHistory(history)}
                      type="button"
                    >
                      Voir détails
                    </button>
                  </article>
                )
              })
            ) : (
              <p className="empty-panel-text">
                {isLoading
                  ? 'Chargement de l’historique...'
                  : notificationHistory.length > 0
                    ? 'Aucune notification ne correspond au filtre.'
                    : 'Aucune notification envoyée.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(historyResultsStart)}-{formatNumber(historyResultsEnd)} sur{' '}
              {formatNumber(filteredNotificationHistory.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={historyPage === 0 || isLoading}
                onClick={() => setHistoryPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={historyPage === 0 || isLoading}
                onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {historyPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === historyPage ? 'active' : ''}`}
                    disabled={isLoading}
                    key={page}
                    onClick={() => setHistoryPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={historyPage + 1 >= totalHistoryPages || isLoading}
                onClick={() =>
                  setHistoryPage((page) => Math.min(totalHistoryPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={historyPage + 1 >= totalHistoryPages || isLoading}
                onClick={() => setHistoryPage(totalHistoryPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
          </div>
        </section>
      </section>

      {selectedHistory ? (
        <NotificationHistoryDetailModal
          history={selectedHistory}
          onClose={() => setSelectedHistory(null)}
        />
      ) : null}
    </main>
  )
}
