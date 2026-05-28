import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

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
  createdAt: string
}

type UserRoleFilter = 'player' | 'partner' | 'all_non_admin'
type UserStatusFilter = 'all' | 'active' | 'inactive'
type UserPlanFilter = 'all' | 'premium' | 'standard'

type PlayersData = {
  users: PlayerUserItem[]
  totalCount: number
}

type AppFeatureFlagState = {
  isEnabled: boolean
  updatedAt: string
}

const userRoleFilterLabels: Record<UserRoleFilter, string> = {
  player: 'joueurs',
  partner: 'partenaires',
  all_non_admin: 'comptes',
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
      'id, phone, username, avatar_url, role, fcm_token, fcm_token_platform, fcm_token_updated_at, fcm_token_last_error, fcm_token_last_error_at, is_premium, premium_expires_at, points_total, participations_today, last_participation_date, device_info, location_info, device_last_seen_at, is_active, created_at',
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
  const [usersSearch, setUsersSearch] = useState('')
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('player')
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all')
  const [userPlanFilter, setUserPlanFilter] = useState<UserPlanFilter>('all')
  const [usersPage, setUsersPage] = useState(0)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [usersNotice, setUsersNotice] = useState('')
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
      return true
    })
  }, [playersData.users, userPlanFilter, userStatusFilter])

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
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les joueurs.',
      )
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
  }, [userPlanFilter, userStatusFilter])

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
      })
      .catch((error) => {
        if (!isMounted) return
        setUsersError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les joueurs.',
        )
      })
      .finally(() => {
        if (isMounted) setIsUsersLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [debouncedUsersSearch, pageSize, userRoleFilter, usersPage])

  useEffect(() => {
    void loadCoordinatesFlag()
  }, [loadCoordinatesFlag])

  const refreshUsersRealtime = useCallback(async () => {
    await Promise.all([loadUsers(), loadCoordinatesFlag()])
  }, [loadCoordinatesFlag, loadUsers])

  useRealtimeRefresh(
    'sa-users-realtime',
    [
      'users',
      'participations',
      'winners',
      'player_subscriptions',
      'user_badges',
      'app_feature_flags',
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

  async function handleClearPlayerHistory(user: PlayerUserItem) {
    const confirmed = window.confirm(
      `Vider l’historique de jeux de "${user.username || user.phone}" ? Le joueur pourra participer de nouveau aux concours concernés.`,
    )
    if (!confirmed) return

    setUsersError('')
    setUsersNotice('')

    try {
      const { error: deleteError } = await supabase
        .from('participations')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      const { error: updateError } = await supabase
        .from('users')
        .update({
          participations_today: 0,
          last_participation_date: null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      await loadUsers()
      setUsersNotice('Historique de jeux vidé. Le joueur peut rejouer.')
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de vider l’historique du joueur.',
      )
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

    if (action === 'clear_history') {
      void handleClearPlayerHistory(user)
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
          </div>

          <div className="premium-user-table">
            <div className="premium-user-head">
              <span>Utilisateur</span>
              <span>Rôle</span>
              <span>Activité</span>
              <span>Forfait</span>
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
                      {user.fcmToken ? (
                        <span className="status-pill sent push-token-pill">
                          Push {user.fcmTokenPlatform || 'mobile'}
                        </span>
                      ) : (
                        <span className="status-pill inactive push-token-pill">
                          Push absent
                        </span>
                      )}
                    </span>
                  </button>
                  <div>
                    <strong>{user.role}</strong>
                    <p>{formatNumber(user.pointsTotal)} pts</p>
                  </div>
                  <div>
                    <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <p>{user.participationsToday} aujourd’hui</p>
                  </div>
                  <div>
                    <span className={`status-pill ${user.isPremium ? 'sent' : 'inactive'}`}>
                      {user.isPremium ? 'Premium' : 'Standard'}
                    </span>
                    <p>{user.premiumExpiresAt ? formatDate(user.premiumExpiresAt) : 'Sans échéance'}</p>
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
                      <option value="clear_history">Vider historique</option>
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
