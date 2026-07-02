import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type SupabaseLikeError = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
}

type UsersNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

type PlayerUserItem = {
  id: string
  phone: string
  username: string
  avatarUrl: string
  role: string
  fcmToken: string
  fcmTokenPlatform: string
  fcmTokenUpdatedAt: string
  fcmTokenLastError: string
  fcmTokenLastErrorAt: string
  isPremium: boolean
  premiumExpiresAt: string
  pointsTotal: number
  participationsToday: number
  lastParticipationDate: string
  deviceInfo: Record<string, unknown>
  locationInfo: Record<string, unknown>
  deviceLastSeenAt: string
  isActive: boolean
  accountStatus: string
  deletionRequestedAt: string
  deletionScheduledAt: string
  deletedAt: string
  anonymizedRef: string
  createdAt: string
}

type UserRoleFilter = 'player' | 'partner' | 'all_non_admin'
type UserStatusFilter = 'all' | 'active' | 'inactive'
type UserPlanFilter = 'all' | 'premium' | 'standard'
type UserPushFilter = 'all' | 'enabled' | 'disabled'
type UserAppVersionFilter = 'all' | 'latest' | 'outdated'

type PlayersData = {
  users: PlayerUserItem[]
  totalCount: number
}

type AppUpdateConfigSummary = {
  latestAndroidBuild: number
  latestIosBuild: number
  updatedAt: string
}

type AppFeatureFlagState = {
  isEnabled: boolean
  updatedAt: string
}

type UserDeletionAction =
  | 'schedule_deletion'
  | 'cancel_deletion'
  | 'anonymize_now'
  | 'hard_delete_now'

type UserDeletionDialogState = {
  user: PlayerUserItem
  action: UserDeletionAction
}

const userRoleFilterLabels: Record<UserRoleFilter, string> = {
  player: 'joueurs',
  partner: 'partenaires',
  all_non_admin: 'comptes',
}

const userDeletionActionConfig: Record<
  UserDeletionAction,
  {
    title: string
    eyebrow: string
    description: string
    confirmation: string
    rpc: string
    notice: string
    logAction: string
    logMessage: string
    dangerLevel: 'medium' | 'high' | 'critical'
  }
> = {
  schedule_deletion: {
    title: 'Programmer la suppression',
    eyebrow: 'Délai de sécurité de 30 jours',
    description:
      'Le compte sera désactivé immédiatement. La suppression définitive restera programmable après le délai de récupération.',
    confirmation: 'PROGRAMMER',
    rpc: 'admin_schedule_user_deletion',
    notice: 'Suppression programmée dans 30 jours.',
    logAction: 'schedule_deletion',
    logMessage: 'Suppression utilisateur programmée par le SA.',
    dangerLevel: 'medium',
  },
  cancel_deletion: {
    title: 'Annuler la suppression planifiée',
    eyebrow: 'Réactivation du compte joueur',
    description:
      'Le compte sera remis en actif et les dates de suppression programmée seront effacées. L’historique du joueur reste conservé.',
    confirmation: 'ANNULER',
    rpc: 'admin_cancel_user_deletion',
    notice: 'Suppression planifiée annulée. Le compte est réactivé.',
    logAction: 'cancel_deletion',
    logMessage: 'Suppression utilisateur planifiée annulée par le SA.',
    dangerLevel: 'medium',
  },
  anonymize_now: {
    title: 'Anonymiser définitivement',
    eyebrow: 'Données personnelles retirées',
    description:
      'Le compte devient inutilisable et les données personnelles visibles sont retirées, tout en conservant l’historique métier nécessaire.',
    confirmation: 'ANONYMISER',
    rpc: 'admin_anonymize_user_now',
    notice: 'Utilisateur anonymisé définitivement.',
    logAction: 'anonymize_now',
    logMessage: 'Utilisateur anonymisé définitivement par le SA.',
    dangerLevel: 'high',
  },
  hard_delete_now: {
    title: 'Suppression définitive sans délai',
    eyebrow: 'Action irréversible',
    description:
      'Cette action supprime le compte, ses accès Auth Google/Apple/téléphone et les données rattachées par user_id. Elle ne peut pas être annulée.',
    confirmation: 'SUPPRIMER DEFINITIVEMENT',
    rpc: 'admin_hard_delete_user_now',
    notice: 'Utilisateur supprimé définitivement sans délai.',
    logAction: 'hard_delete_now',
    logMessage: 'Utilisateur supprimé définitivement sans délai par le SA.',
    dangerLevel: 'critical',
  },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const supabaseError = error as SupabaseLikeError
    const message = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code,
    ]
      .filter((item) => typeof item === 'string' && item.length > 0)
      .join(' · ')
    return message || fallback
  }
  return fallback
}

function textFromRecord(
  source: Record<string, unknown>,
  keys: string[],
  fallback = '',
) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function numberFromRecord(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function normalizeMobilePlatform(user: PlayerUserItem) {
  return textFromRecord(user.deviceInfo, ['os', 'platform'], user.fcmTokenPlatform)
    .toLowerCase()
}

function userLatestBuildTarget(
  user: PlayerUserItem,
  appUpdateConfig: AppUpdateConfigSummary | null,
) {
  if (!appUpdateConfig) return 0
  const platform = normalizeMobilePlatform(user)
  if (platform.includes('ios') || platform.includes('apple')) {
    return appUpdateConfig.latestIosBuild
  }
  if (platform.includes('android')) return appUpdateConfig.latestAndroidBuild
  return Math.max(appUpdateConfig.latestAndroidBuild, appUpdateConfig.latestIosBuild)
}

function userAppBuild(user: PlayerUserItem) {
  return numberFromRecord(user.deviceInfo, [
    'app_build',
    'build_number',
    'buildNumber',
    'version_code',
    'versionCode',
  ])
}

function userAppVersionLabel(user: PlayerUserItem) {
  const version = textFromRecord(user.deviceInfo, ['app_version', 'version'])
  const build = userAppBuild(user)
  if (version && build > 0) return `v${version} (${build})`
  if (version) return `v${version}`
  if (build > 0) return `build ${build}`
  return 'Version inconnue'
}

function isUserOnLatestAppVersion(
  user: PlayerUserItem,
  appUpdateConfig: AppUpdateConfigSummary | null,
) {
  const currentBuild = userAppBuild(user)
  const latestBuild = userLatestBuildTarget(user, appUpdateConfig)
  return currentBuild > 0 && latestBuild > 0 && currentBuild >= latestBuild
}

function getVisibleUsersNavItems(
  permissions: string[] | undefined,
  navItems: UsersNavItem[],
) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onRefresh: () => void | Promise<void>,
) {
  const tablesKey = tables.join('|')

  useEffect(() => {
    let refreshTimeout = 0
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void onRefresh()
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
  // tablesKey intentionally represents the table list to avoid resubscribing
  // when callers pass a new array literal with the same content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, tablesKey, onRefresh])
}

async function fetchPlayersData({
  page,
  pageSize,
  search,
  roleFilter,
}: {
  page: number
  pageSize: number
  search: string
  roleFilter: UserRoleFilter
}): Promise<PlayersData> {
  const from = page * pageSize
  const to = from + pageSize - 1
  let usersQuery = supabase
    .from('users')
    .select(
      'id, phone, username, avatar_url, role, fcm_token, fcm_token_platform, fcm_token_updated_at, fcm_token_last_error, fcm_token_last_error_at, is_premium, premium_expires_at, points_total, participations_today, last_participation_date, device_info, location_info, device_last_seen_at, is_active, account_status, deletion_requested_at, deletion_scheduled_at, deleted_at, anonymized_ref, created_at',
      { count: 'exact' },
    )
    .neq('role', 'admin')
    .order('created_at', { ascending: false })
    .range(from, to)
  const cleanedSearch = search.trim()

  if (roleFilter !== 'all_non_admin') {
    usersQuery = usersQuery.eq('role', roleFilter)
  }

  if (cleanedSearch) {
    const escapedSearch = cleanedSearch.replaceAll('%', '\\%').replaceAll('_', '\\_')
    usersQuery = usersQuery.or(
      `username.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%,role.ilike.%${escapedSearch}%`,
    )
  }

  const usersResponse = await usersQuery

  if (usersResponse.error) throw usersResponse.error

  return {
    totalCount: usersResponse.count ?? 0,
    users: (usersResponse.data ?? []).map((user) => ({
      id: user.id as string,
      phone: (user.phone as string | null) ?? '',
      username: (user.username as string | null) ?? '',
      avatarUrl: (user.avatar_url as string | null) ?? '',
      role: (user.role as string | null) ?? 'player',
      fcmToken: (user.fcm_token as string | null) ?? '',
      fcmTokenPlatform: (user.fcm_token_platform as string | null) ?? '',
      fcmTokenUpdatedAt: (user.fcm_token_updated_at as string | null) ?? '',
      fcmTokenLastError: (user.fcm_token_last_error as string | null) ?? '',
      fcmTokenLastErrorAt: (user.fcm_token_last_error_at as string | null) ?? '',
      isPremium: (user.is_premium as boolean | null) ?? false,
      premiumExpiresAt: (user.premium_expires_at as string | null) ?? '',
      pointsTotal: (user.points_total as number | null) ?? 0,
      participationsToday: (user.participations_today as number | null) ?? 0,
      lastParticipationDate:
        (user.last_participation_date as string | null) ?? '',
      deviceInfo: ((user.device_info as Record<string, unknown> | null) ?? {}),
      locationInfo: ((user.location_info as Record<string, unknown> | null) ?? {}),
      deviceLastSeenAt: (user.device_last_seen_at as string | null) ?? '',
      isActive: (user.is_active as boolean | null) ?? true,
      accountStatus: (user.account_status as string | null) ?? 'active',
      deletionRequestedAt: (user.deletion_requested_at as string | null) ?? '',
      deletionScheduledAt: (user.deletion_scheduled_at as string | null) ?? '',
      deletedAt: (user.deleted_at as string | null) ?? '',
      anonymizedRef: (user.anonymized_ref as string | null) ?? '',
      createdAt: (user.created_at as string | null) ?? '',
    })),
  }
}

async function fetchAppFeatureFlag(
  key: string,
  defaultEnabled = true,
): Promise<AppFeatureFlagState> {
  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('is_enabled, updated_at')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error

  return {
    isEnabled: (data?.is_enabled as boolean | null) ?? defaultEnabled,
    updatedAt: (data?.updated_at as string | null) ?? '',
  }
}

async function fetchAppUpdateConfigSummary(): Promise<AppUpdateConfigSummary | null> {
  const { data, error } = await supabase
    .from('app_update_config')
    .select('latest_android_build, latest_ios_build, updated_at')
    .eq('key', 'main')
    .maybeSingle()

  if (error) {
    console.warn('[MegaPromo][SA users][appUpdateConfig]', error)
    return null
  }

  if (!data) return null

  return {
    latestAndroidBuild: (data.latest_android_build as number | null) ?? 0,
    latestIosBuild: (data.latest_ios_build as number | null) ?? 0,
    updatedAt: (data.updated_at as string | null) ?? '',
  }
}

export function SuperAdminUsersPage({
  authRoute,
  navItems,
  rootRoute,
  usersRoute,
}: {
  authRoute: string
  navItems: UsersNavItem[]
  rootRoute: string
  usersRoute: string
}) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const visibleNavItems = getVisibleUsersNavItems(
    adminAuth.profile?.permissions,
    navItems,
  )
  const pageSize = 10
  const [playersData, setPlayersData] = useState<PlayersData>({
    users: [],
    totalCount: 0,
  })
  const [appUpdateConfig, setAppUpdateConfig] =
    useState<AppUpdateConfigSummary | null>(null)
  const [usersSearch, setUsersSearch] = useState('')
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('player')
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all')
  const [userPlanFilter, setUserPlanFilter] = useState<UserPlanFilter>('all')
  const [userPushFilter, setUserPushFilter] = useState<UserPushFilter>('all')
  const [userAppVersionFilter, setUserAppVersionFilter] =
    useState<UserAppVersionFilter>('all')
  const [usersPage, setUsersPage] = useState(0)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [usersNotice, setUsersNotice] = useState('')
  const [deletionDialog, setDeletionDialog] =
    useState<UserDeletionDialogState | null>(null)
  const [deletionConfirmation, setDeletionConfirmation] = useState('')
  const [isDeletionSubmitting, setIsDeletionSubmitting] = useState(false)
  const [coordinatesFlag, setCoordinatesFlag] = useState<AppFeatureFlagState>({
    isEnabled: true,
    updatedAt: '',
  })
  const [isCoordinatesFlagSaving, setIsCoordinatesFlagSaving] = useState(false)

  const totalPages = Math.max(1, Math.ceil(playersData.totalCount / pageSize))
  const resultsStart = playersData.totalCount === 0 ? 0 : usersPage * pageSize + 1
  const resultsEnd = Math.min(
    playersData.totalCount,
    usersPage * pageSize + playersData.users.length,
  )
  const paginationPages = useMemo(() => {
    const firstPage = Math.max(0, usersPage - 2)
    const lastPage = Math.min(totalPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [totalPages, usersPage])
  const filteredUsers = useMemo(() => {
    return playersData.users.filter((user) => {
      if (userStatusFilter === 'active' && !user.isActive) return false
      if (userStatusFilter === 'inactive' && user.isActive) return false
      if (userPlanFilter === 'premium' && !user.isPremium) return false
      if (userPlanFilter === 'standard' && user.isPremium) return false
      if (userPushFilter === 'enabled' && !user.fcmToken) return false
      if (userPushFilter === 'disabled' && user.fcmToken) return false
      if (
        userAppVersionFilter === 'latest' &&
        !isUserOnLatestAppVersion(user, appUpdateConfig)
      ) {
        return false
      }
      if (
        userAppVersionFilter === 'outdated' &&
        isUserOnLatestAppVersion(user, appUpdateConfig)
      ) {
        return false
      }
      return true
    })
  }, [
    appUpdateConfig,
    playersData.users,
    userAppVersionFilter,
    userPlanFilter,
    userPushFilter,
    userStatusFilter,
  ])

  const loadUsers = useCallback(async (nextPage = usersPage) => {
    setIsUsersLoading(true)
    setUsersError('')

    try {
      const nextPlayersData = await fetchPlayersData({
        page: nextPage,
        pageSize,
        search: debouncedUsersSearch,
        roleFilter: userRoleFilter,
      })
      setPlayersData(nextPlayersData)
    } catch (error) {
      setUsersError(formatUnknownError(error, 'Impossible de charger les joueurs.'))
    } finally {
      setIsUsersLoading(false)
    }
  }, [debouncedUsersSearch, pageSize, userRoleFilter, usersPage])

  const loadCoordinatesFlag = useCallback(async () => {
    try {
      setCoordinatesFlag(
        await fetchAppFeatureFlag('player_profile_coordinates', true),
      )
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le réglage des coordonnées.',
      )
    }
  }, [])

  const loadAppUpdateConfig = useCallback(async () => {
    setAppUpdateConfig(await fetchAppUpdateConfigSummary())
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setUsersPage(0)
      setDebouncedUsersSearch(usersSearch)
    }, 350)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [usersSearch])

  useEffect(() => {
    setUsersPage(0)
  }, [userRoleFilter])

  useEffect(() => {
    setUsersPage(0)
  }, [userAppVersionFilter, userPlanFilter, userPushFilter, userStatusFilter])

  useEffect(() => {
    let isMounted = true

    void fetchPlayersData({
      page: usersPage,
      pageSize,
      search: debouncedUsersSearch,
      roleFilter: userRoleFilter,
    })
      .then((nextPlayersData) => {
        if (!isMounted) return
        setPlayersData(nextPlayersData)
        void loadAppUpdateConfig()
      })
      .catch((error) => {
        if (!isMounted) return
        setUsersError(formatUnknownError(error, 'Impossible de charger les joueurs.'))
      })
      .finally(() => {
        if (isMounted) setIsUsersLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [debouncedUsersSearch, loadAppUpdateConfig, pageSize, userRoleFilter, usersPage])

  useEffect(() => {
    void loadCoordinatesFlag()
  }, [loadCoordinatesFlag])

  const refreshUsersRealtime = useCallback(async () => {
    await Promise.all([loadUsers(), loadCoordinatesFlag(), loadAppUpdateConfig()])
  }, [loadAppUpdateConfig, loadCoordinatesFlag, loadUsers])

  useRealtimeRefresh(
    'sa-users-realtime',
    [
      'users',
      'participations',
      'winners',
      'player_subscriptions',
      'user_badges',
      'app_feature_flags',
      'app_update_config',
    ],
    refreshUsersRealtime,
  )

  async function handleToggleCoordinatesAccess() {
    const nextIsEnabled = !coordinatesFlag.isEnabled
    setUsersError('')
    setUsersNotice('')
    setIsCoordinatesFlagSaving(true)

    const { error } = await supabase.from('app_feature_flags').upsert({
      key: 'player_profile_coordinates',
      name: 'Coordonnées profil joueur',
      description:
        'Affiche ou masque le bouton Coordonnées dans le profil joueur mobile.',
      is_enabled: nextIsEnabled,
      updated_at: new Date().toISOString(),
    })

    setIsCoordinatesFlagSaving(false)

    if (error) {
      void logError({
        feature: 'profile_sections',
        action: 'toggle_coordinates_failed',
        message: 'Echec changement visibilite Coordonnees profil joueur.',
        entityType: 'app_feature_flag',
        entityId: 'player_profile_coordinates',
        metadata: { next_is_enabled: nextIsEnabled, error: error.message },
      })
      setUsersError(error.message)
      return
    }

    setCoordinatesFlag({
      isEnabled: nextIsEnabled,
      updatedAt: new Date().toISOString(),
    })
    setUsersNotice(
      nextIsEnabled
        ? 'Le bouton Coordonnées est visible dans le profil joueur.'
        : 'Le bouton Coordonnées est masqué dans le profil joueur.',
    )
    void logAdminAction({
      feature: 'profile_sections',
      action: nextIsEnabled ? 'coordinates_enabled' : 'coordinates_disabled',
      message: 'Visibilite Coordonnees profil joueur modifiee par le SA.',
      entityType: 'app_feature_flag',
      entityId: 'player_profile_coordinates',
      metadata: { is_enabled: nextIsEnabled },
    })
  }

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleToggleUserStatus(user: PlayerUserItem) {
    setUsersError('')
    setUsersNotice('')

    const { error } = await supabase
      .from('users')
      .update({ is_active: !user.isActive })
      .eq('id', user.id)

    if (error) {
      setUsersError(error.message)
      return
    }

    await loadUsers()
    setUsersNotice(
      user.isActive ? 'Le joueur a été désactivé.' : 'Le joueur a été réactivé.',
    )
  }

  async function handleTogglePremium(user: PlayerUserItem) {
    setUsersError('')
    setUsersNotice('')

    const nextPremiumState = !user.isPremium
    const premiumExpiresAt = nextPremiumState
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null
    const { error } = await supabase
      .from('users')
      .update({
        is_premium: nextPremiumState,
        premium_expires_at: premiumExpiresAt,
      })
      .eq('id', user.id)

    if (error) {
      setUsersError(error.message)
      return
    }

    await loadUsers()
    setUsersNotice(
      nextPremiumState
        ? 'Premium activé pour 30 jours.'
        : 'Premium retiré pour ce joueur.',
    )
  }

  function openDeletionDialog(user: PlayerUserItem, action: UserDeletionAction) {
    setUsersError('')
    setUsersNotice('')
    setDeletionConfirmation('')
    setDeletionDialog({ user, action })
  }

  function closeDeletionDialog() {
    if (isDeletionSubmitting) return
    setDeletionDialog(null)
    setDeletionConfirmation('')
  }

  async function submitDeletionDialog() {
    if (!deletionDialog) return

    const config = userDeletionActionConfig[deletionDialog.action]
    if (deletionConfirmation.trim().toUpperCase() !== config.confirmation) {
      setUsersError(`Confirmation invalide. Écris ${config.confirmation}.`)
      return
    }

    setUsersError('')
    setUsersNotice('')
    setIsDeletionSubmitting(true)

    try {
      const { error } = await supabase.rpc(config.rpc, {
        p_user_id: deletionDialog.user.id,
        p_confirmation: deletionConfirmation.trim(),
      })
      if (error) throw error

      await loadUsers()
      setUsersNotice(config.notice)
      void logAdminAction({
        feature: 'users',
        action: config.logAction,
        message: config.logMessage,
        entityType: 'user',
        entityId: deletionDialog.user.id,
        metadata: {
          username: deletionDialog.user.username,
          phone_present: Boolean(deletionDialog.user.phone),
          danger_level: config.dangerLevel,
        },
      })
      setDeletionDialog(null)
      setDeletionConfirmation('')
    } catch (error) {
      setUsersError(
        formatUnknownError(
          error,
          'Action de suppression impossible pour cet utilisateur.',
        ),
      )
    } finally {
      setIsDeletionSubmitting(false)
    }
  }

  function handleUserTableAction(user: PlayerUserItem, action: string) {
    if (!action) return

    if (action === 'detail') {
      navigate(`${usersRoute}/${user.id}`)
      return
    }

    if (action === 'status') {
      void handleToggleUserStatus(user)
      return
    }

    if (action === 'premium') {
      void handleTogglePremium(user)
      return
    }

    if (action === 'schedule_deletion') {
      openDeletionDialog(user, 'schedule_deletion')
      return
    }

    if (action === 'cancel_deletion') {
      openDeletionDialog(user, 'cancel_deletion')
      return
    }

    if (action === 'anonymize_now') {
      openDeletionDialog(user, 'anonymize_now')
      return
    }

    if (action === 'hard_delete_now') {
      openDeletionDialog(user, 'hard_delete_now')
    }
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
          {visibleNavItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Utilisateurs</span>
          <strong>{formatNumber(playersData.totalCount)} comptes</strong>
          <p>Filtre les joueurs, partenaires et autres comptes sans afficher les SA.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communauté</p>
            <h1>Utilisateurs</h1>
            <p className="page-subtitle">
              Vue filtrée des comptes. Les super administrateurs ne sont jamais listés ici.
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

        {usersError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Joueurs indisponibles</strong>
              <p>{usersError}</p>
            </div>
            <button onClick={() => loadUsers()} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {usersNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Action appliquée</strong>
              <p>{usersNotice}</p>
            </div>
          </div>
        ) : null}

        {deletionDialog ? (
          <UserDeletionConfirmModal
            confirmation={deletionConfirmation}
            isSubmitting={isDeletionSubmitting}
            onCancel={closeDeletionDialog}
            onChangeConfirmation={setDeletionConfirmation}
            onConfirm={() => void submitDeletionDialog()}
            state={deletionDialog}
          />
        ) : null}

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Profil mobile</p>
              <h2>Coordonnées dans le profil joueur</h2>
            </div>
            <span
              className={`status-pill ${
                coordinatesFlag.isEnabled ? 'active' : 'inactive'
              }`}
            >
              {coordinatesFlag.isEnabled ? 'Visible' : 'Masqué'}
            </span>
          </div>
          <p className="page-subtitle">
            Contrôle l’affichage du bouton Coordonnées dans la page profil de
            l’application mobile.
            {coordinatesFlag.updatedAt
              ? ` Dernière mise à jour : ${formatDate(coordinatesFlag.updatedAt)}.`
              : ''}
          </p>
          <div className="contest-actions">
            <button
              className={
                coordinatesFlag.isEnabled
                  ? 'table-action-button danger'
                  : 'primary-button'
              }
              disabled={isCoordinatesFlagSaving}
              onClick={handleToggleCoordinatesAccess}
              type="button"
            >
              {isCoordinatesFlagSaving
                ? 'Mise à jour...'
                : coordinatesFlag.isEnabled
                  ? 'Désactiver les coordonnées'
                  : 'Activer les coordonnées'}
            </button>
          </div>
        </section>

        <section className="panel users-table-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Base {userRoleFilterLabels[userRoleFilter]}</p>
              <h2>Tableau des utilisateurs</h2>
            </div>
            <span className="pill">
              {isUsersLoading
                ? 'Chargement'
                : `${playersData.users.length} / ${formatNumber(playersData.totalCount)}`}
            </span>
          </div>

          <div className="user-filters">
            <input
              onChange={(event) => setUsersSearch(event.target.value)}
              placeholder="Rechercher pseudo, téléphone, rôle..."
              value={usersSearch}
            />
            <select
              onChange={(event) => setUserRoleFilter(event.target.value as UserRoleFilter)}
              value={userRoleFilter}
            >
              <option value="player">Joueurs</option>
              <option value="partner">Partenaires</option>
              <option value="all_non_admin">Tous hors SA</option>
            </select>
            <select
              onChange={(event) => setUserStatusFilter(event.target.value as UserStatusFilter)}
              value={userStatusFilter}
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <select
              onChange={(event) => setUserPlanFilter(event.target.value as UserPlanFilter)}
              value={userPlanFilter}
            >
              <option value="all">Tous forfaits</option>
              <option value="premium">Premium</option>
              <option value="standard">Standard</option>
            </select>
            <select
              onChange={(event) => setUserPushFilter(event.target.value as UserPushFilter)}
              value={userPushFilter}
            >
              <option value="all">Toutes notifs</option>
              <option value="enabled">Push activé</option>
              <option value="disabled">Push non activé</option>
            </select>
            <select
              onChange={(event) =>
                setUserAppVersionFilter(event.target.value as UserAppVersionFilter)
              }
              value={userAppVersionFilter}
            >
              <option value="all">Toutes versions</option>
              <option value="latest">App à jour</option>
              <option value="outdated">App à vérifier</option>
            </select>
          </div>

          <div className="premium-user-table">
            <div className="premium-user-head">
              <span>Utilisateur</span>
              <span>Rôle</span>
              <span>Activité</span>
              <span>Forfait</span>
              <span>Mobile</span>
              <span>Création</span>
              <span>Actions</span>
            </div>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  className="premium-user-row"
                  key={user.id}
                >
                  <button
                    className="user-table-identity"
                    onClick={() => navigate(`${usersRoute}/${user.id}`)}
                    type="button"
                  >
                    <span className="player-avatar">
                      {(user.username || user.phone || 'J').slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{user.username || 'Pseudo non défini'}</strong>
                      <p>{user.phone || 'Téléphone non défini'}</p>
                    </span>
                  </button>
                  <div>
                    <strong>{user.role}</strong>
                    <p>{formatNumber(user.pointsTotal)} pts</p>
                  </div>
                  <div>
                    <span
                      className={`status-pill ${
                        user.accountStatus === 'deleted'
                          ? 'inactive'
                          : user.accountStatus === 'pending_deletion'
                            ? 'warning'
                            : user.isActive
                              ? 'active'
                              : 'inactive'
                      }`}
                    >
                      {user.accountStatus === 'deleted'
                        ? 'Supprimé'
                        : user.accountStatus === 'pending_deletion'
                          ? 'Suppression planifiée'
                          : user.isActive
                            ? 'Actif'
                            : 'Inactif'}
                    </span>
                    <p>
                      {user.accountStatus === 'pending_deletion' && user.deletionScheduledAt
                        ? `Fin ${formatDate(user.deletionScheduledAt)}`
                        : `${user.participationsToday} aujourd’hui`}
                    </p>
                  </div>
                  <div>
                    <span className={`status-pill ${user.isPremium ? 'sent' : 'inactive'}`}>
                      {user.isPremium ? 'Premium' : 'Standard'}
                    </span>
                    <p>{user.premiumExpiresAt ? formatDate(user.premiumExpiresAt) : 'Sans échéance'}</p>
                  </div>
                  <div>
                    {user.fcmToken ? (
                      <span className="status-pill sent push-token-pill">
                        Notifs activées
                      </span>
                    ) : (
                      <span className="status-pill inactive push-token-pill">
                        Notifs off
                      </span>
                    )}
                    <p>{user.fcmTokenPlatform || normalizeMobilePlatform(user) || 'Plateforme inconnue'}</p>
                    <span
                      className={`status-pill push-token-pill ${
                        isUserOnLatestAppVersion(user, appUpdateConfig)
                          ? 'active'
                          : 'warning'
                      }`}
                    >
                      {isUserOnLatestAppVersion(user, appUpdateConfig)
                        ? 'Dernière version'
                        : 'Version à vérifier'}
                    </span>
                    <p>
                      {userAppVersionLabel(user)}
                      {userLatestBuildTarget(user, appUpdateConfig) > 0
                        ? ` / latest ${userLatestBuildTarget(user, appUpdateConfig)}`
                        : ''}
                    </p>
                  </div>
                  <div>
                    <strong>{formatDate(user.createdAt)}</strong>
                    <p>Vu {formatDate(user.deviceLastSeenAt)}</p>
                    {user.fcmTokenLastError ? (
                      <p className="push-token-error" title={user.fcmTokenLastError}>
                        Push erreur {formatDate(user.fcmTokenLastErrorAt)}
                      </p>
                    ) : user.fcmTokenUpdatedAt ? (
                      <p>Push sync {formatDate(user.fcmTokenUpdatedAt)}</p>
                    ) : null}
                  </div>
                  <div className="table-actions compact">
                    <select
                      aria-label={`Actions pour ${user.username || user.phone || 'utilisateur'}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handleUserTableAction(user, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="detail">Voir détails</option>
                      <option value="status">
                        {user.isActive ? 'Désactiver' : 'Activer'}
                      </option>
                      <option value="premium">
                        {user.isPremium ? 'Retirer premium' : 'Activer premium'}
                      </option>
                      <option value="schedule_deletion">
                        Programmer suppression
                      </option>
                      {user.accountStatus === 'pending_deletion' ? (
                        <option value="cancel_deletion">
                          Annuler suppression planifiée
                        </option>
                      ) : null}
                      <option value="anonymize_now">
                        Anonymiser définitivement
                      </option>
                      <option value="hard_delete_now">
                        Suppression définitive sans délai
                      </option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-panel-text">
                {isUsersLoading
                  ? `Chargement des ${userRoleFilterLabels[userRoleFilter]}...`
                  : `Aucun ${userRoleFilterLabels[userRoleFilter]} trouvé.`}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(resultsStart)}-{formatNumber(resultsEnd)} sur{' '}
              {formatNumber(playersData.totalCount)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={usersPage === 0 || isUsersLoading}
                onClick={() => setUsersPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={usersPage === 0 || isUsersLoading}
                onClick={() => setUsersPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {paginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === usersPage ? 'active' : ''}`}
                    disabled={isUsersLoading}
                    key={page}
                    onClick={() => setUsersPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={usersPage + 1 >= totalPages || isUsersLoading}
                onClick={() => setUsersPage((page) => Math.min(totalPages - 1, page + 1))}
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={usersPage + 1 >= totalPages || isUsersLoading}
                onClick={() => setUsersPage(totalPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

function UserDeletionConfirmModal({
  confirmation,
  isSubmitting,
  onCancel,
  onChangeConfirmation,
  onConfirm,
  state,
}: {
  confirmation: string
  isSubmitting: boolean
  onCancel: () => void
  onChangeConfirmation: (value: string) => void
  onConfirm: () => void
  state: UserDeletionDialogState
}) {
  const config = userDeletionActionConfig[state.action]
  const userLabel = state.user.username || state.user.phone || state.user.id
  const isValid =
    confirmation.trim().toUpperCase() === config.confirmation.toUpperCase()

  return (
    <div className="modal-backdrop user-delete-modal-backdrop" role="presentation">
      <section
        aria-labelledby="user-delete-title"
        aria-modal="true"
        className={`user-delete-confirm-modal ${config.dangerLevel}`}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{config.eyebrow}</p>
            <h2 id="user-delete-title">{config.title}</h2>
            <p className="modal-subtitle">{config.description}</p>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="user-delete-summary">
          <span className="player-avatar">
            {(state.user.username || state.user.phone || 'U').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{userLabel}</strong>
            <p>
              {state.user.phone || 'Téléphone non défini'} · {formatNumber(state.user.pointsTotal)} pts
            </p>
          </div>
        </div>

        <div className="user-delete-warning">
          <strong>Confirmation requise</strong>
          <p>
            Pour éviter une action accidentelle, écris exactement{' '}
            <code>{config.confirmation}</code>.
          </p>
        </div>

        <label className="user-delete-confirm-field">
          <span>Texte de confirmation</span>
          <input
            autoFocus
            disabled={isSubmitting}
            onChange={(event) => onChangeConfirmation(event.target.value)}
            placeholder={config.confirmation}
            value={confirmation}
          />
        </label>

        <div className="modal-actions">
          <button
            className="table-action-button"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={!isValid || isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? 'Traitement...' : config.title}
          </button>
        </div>
      </section>
    </div>
  )
}
