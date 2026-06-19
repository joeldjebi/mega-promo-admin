import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type SupabaseLikeError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onRefresh: () => void | Promise<void>,
) {
  useEffect(() => {
    const channel = supabase.channel(channelName)

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          void onRefresh()
        },
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelName, onRefresh, tables])
}

function formatMoney(value: number | null) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
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
    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code]
      .filter(Boolean)
      .join(' · ') || fallback
  }
  return fallback
}

type SubscriptionHistoryStatus = 'pending' | 'active' | 'expired' | 'cancelled'
type PlayerSubscriptionHistoryItem = {
  id: string
  userId: string
  userLabel: string
  userPhone: string
  planId: string
  planName: string
  amount: number
  status: SubscriptionHistoryStatus
  startsAt: string
  expiresAt: string
  paymentMethod: string
  paymentReference: string
  createdAt: string
}
type PlayerSubscriptionHistoryData = {
  subscriptions: PlayerSubscriptionHistoryItem[]
}
type SuperAdminSubscriptionHistoryPageProps = {
  authRoute: string
  rootRoute: string
  usersRoute: string
  navItems: FeatureNavItem[]
}

function getVisibleSubscriptionHistoryNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

async function fetchPlayerSubscriptionHistoryData(): Promise<PlayerSubscriptionHistoryData> {
  const [subscriptionsResponse, usersResponse, plansResponse] = await Promise.all([
    supabase
      .from('player_subscriptions')
      .select(
        'id, user_id, plan_id, amount, status, starts_at, expires_at, payment_method, payment_reference, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('users')
      .select('id, username, phone')
      .eq('role', 'player')
      .limit(1000),
    supabase.from('player_plans').select('id, name').limit(200),
  ])

  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (usersResponse.error) throw usersResponse.error
  if (plansResponse.error) throw plansResponse.error

  const usersById = new Map(
    (usersResponse.data ?? []).map((user) => [
      user.id as string,
      {
        label:
          (user.username as string | null) ||
          (user.phone as string | null) ||
          'Joueur',
        phone: (user.phone as string | null) ?? '',
      },
    ]),
  )
  const plansById = new Map(
    (plansResponse.data ?? []).map((plan) => [
      plan.id as string,
      (plan.name as string | null) ?? 'Forfait',
    ]),
  )

  return {
    subscriptions: (subscriptionsResponse.data ?? []).map((subscription) => {
      const userId = (subscription.user_id as string | null) ?? ''
      const planId = (subscription.plan_id as string | null) ?? ''
      const user = usersById.get(userId)
      return {
        id: subscription.id as string,
        userId,
        userLabel: user?.label ?? 'Joueur',
        userPhone: user?.phone ?? '',
        planId,
        planName: plansById.get(planId) ?? 'Forfait',
        amount: (subscription.amount as number | null) ?? 0,
        status: ((subscription.status as string | null) ??
          'pending') as SubscriptionHistoryStatus,
        startsAt: (subscription.starts_at as string | null) ?? '',
        expiresAt: (subscription.expires_at as string | null) ?? '',
        paymentMethod: (subscription.payment_method as string | null) ?? '',
        paymentReference: (subscription.payment_reference as string | null) ?? '',
        createdAt: (subscription.created_at as string | null) ?? '',
      }
    }),
  }
}



function subscriptionStatusLabel(status: SubscriptionHistoryStatus) {
  if (status === 'active') return 'actif'
  if (status === 'expired') return 'expiré'
  if (status === 'cancelled') return 'annulé'
  return 'en attente'
}


function subscriptionStatusPillClass(status: SubscriptionHistoryStatus) {
  if (status === 'active') return 'active'
  if (status === 'pending') return 'pending'
  if (status === 'expired') return 'inactive'
  return 'cancelled'
}


export function SuperAdminSubscriptionHistoryPage({ authRoute, rootRoute, usersRoute, navItems }: SuperAdminSubscriptionHistoryPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [historyData, setHistoryData] = useState<PlayerSubscriptionHistoryData>({
    subscriptions: [],
  })
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const [subscriptionSearch, setSubscriptionSearch] = useState('')
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] =
    useState<'all' | SubscriptionHistoryStatus>('all')
  const [subscriptionPage, setSubscriptionPage] = useState(0)
  const [savingSubscriptionId, setSavingSubscriptionId] = useState('')

  const filteredSubscriptions = useMemo(() => {
    const search = subscriptionSearch.trim().toLowerCase()
    return historyData.subscriptions.filter((subscription) => {
      const matchesSearch =
        !search ||
        subscription.userLabel.toLowerCase().includes(search) ||
        subscription.userPhone.toLowerCase().includes(search) ||
        subscription.planName.toLowerCase().includes(search) ||
        subscription.paymentReference.toLowerCase().includes(search)
      const matchesStatus =
        subscriptionStatusFilter === 'all' ||
        subscription.status === subscriptionStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [historyData.subscriptions, subscriptionSearch, subscriptionStatusFilter])
  const subscriptionPageSize = 10
  const totalSubscriptionPages = Math.max(
    1,
    Math.ceil(filteredSubscriptions.length / subscriptionPageSize),
  )
  const paginatedSubscriptions = useMemo(() => {
    const startIndex = subscriptionPage * subscriptionPageSize
    return filteredSubscriptions.slice(startIndex, startIndex + subscriptionPageSize)
  }, [filteredSubscriptions, subscriptionPage])
  const subscriptionResultsStart =
    filteredSubscriptions.length === 0 ? 0 : subscriptionPage * subscriptionPageSize + 1
  const subscriptionResultsEnd = Math.min(
    filteredSubscriptions.length,
    subscriptionPage * subscriptionPageSize + paginatedSubscriptions.length,
  )
  const subscriptionPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, subscriptionPage - 2)
    const lastPage = Math.min(totalSubscriptionPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [subscriptionPage, totalSubscriptionPages])

  useEffect(() => {
    setSubscriptionPage(0)
  }, [subscriptionSearch, subscriptionStatusFilter])

  useEffect(() => {
    if (subscriptionPage + 1 > totalSubscriptionPages) {
      setSubscriptionPage(totalSubscriptionPages - 1)
    }
  }, [subscriptionPage, totalSubscriptionPages])

  const subscriptionStats = useMemo(() => {
    const now = Date.now()
    const pending = historyData.subscriptions.filter(
      (subscription) => subscription.status === 'pending',
    )
    const active = historyData.subscriptions.filter(
      (subscription) => subscription.status === 'active',
    )
    const expired = historyData.subscriptions.filter(
      (subscription) => subscription.status === 'expired',
    )
    const cancelled = historyData.subscriptions.filter(
      (subscription) => subscription.status === 'cancelled',
    )
    const totalAmount = historyData.subscriptions.reduce(
      (total, subscription) => total + subscription.amount,
      0,
    )
    const activeAmount = active.reduce(
      (total, subscription) => total + subscription.amount,
      0,
    )
    const expiringSoon = active.filter((subscription) => {
      if (!subscription.expiresAt) return false
      const expiresAt = new Date(subscription.expiresAt).getTime()
      return Number.isFinite(expiresAt)
        && expiresAt >= now
        && expiresAt <= now + 7 * 24 * 60 * 60 * 1000
    })

    return {
      total: historyData.subscriptions.length,
      pending: pending.length,
      active: active.length,
      expired: expired.length,
      cancelled: cancelled.length,
      totalAmount,
      activeAmount,
      expiringSoon: expiringSoon.length,
    }
  }, [historyData.subscriptions])

  const loadSubscriptionHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setHistoryError('')

    try {
      setHistoryData(await fetchPlayerSubscriptionHistoryData())
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les abonnements.',
      )
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscriptionHistory()
  }, [loadSubscriptionHistory])

  useRealtimeRefresh(
    'sa-subscription-history-realtime',
    ['player_subscriptions', 'users', 'player_plans'],
    loadSubscriptionHistory,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleSubscriptionStatusChange(
    subscription: PlayerSubscriptionHistoryItem,
    nextStatus: SubscriptionHistoryStatus,
  ) {
    if (subscription.status === nextStatus) return

    setHistoryError('')
    setHistoryNotice('')
    setSavingSubscriptionId(subscription.id)

    try {
      const { error } = await supabase.rpc(
        'admin_update_player_subscription_status',
        {
          p_status: nextStatus,
          p_subscription_id: subscription.id,
        },
      )

      if (error) throw error

      await loadSubscriptionHistory()
      const pushWarning = await sendSubscriptionStatusPush(subscription, nextStatus)
      void logAdminAction({
        feature: 'subscriptions',
        action: 'update_status',
        message: 'Statut abonnement joueur mis a jour par le SA.',
        userId: subscription.userId,
        entityType: 'player_subscription',
        entityId: subscription.id,
        metadata: {
          user_label: subscription.userLabel,
          plan_name: subscription.planName,
          previous_status: subscription.status,
          next_status: nextStatus,
          push_warning: pushWarning,
        },
      })
      setHistoryNotice(
        `Statut de l’abonnement ${subscription.planName} mis à jour : ${subscriptionStatusLabel(
          nextStatus,
        )}.${pushWarning}`,
      )
    } catch (error) {
      void logError({
        feature: 'subscriptions',
        action: 'update_status_failed',
        message: 'Echec mise a jour statut abonnement joueur.',
        userId: subscription.userId,
        entityType: 'player_subscription',
        entityId: subscription.id,
        metadata: {
          user_label: subscription.userLabel,
          plan_name: subscription.planName,
          previous_status: subscription.status,
          next_status: nextStatus,
          error: formatUnknownError(
            error,
            'Impossible de mettre à jour le statut de l’abonnement.',
          ),
        },
      })
      setHistoryError(
        formatUnknownError(
          error,
          'Impossible de mettre à jour le statut de l’abonnement.',
        ),
      )
    } finally {
      setSavingSubscriptionId('')
    }
  }

  async function handleDeleteSubscription(
    subscription: PlayerSubscriptionHistoryItem,
  ) {
    const confirmed = window.confirm(
      `Supprimer l'abonnement ${subscription.planName} de ${subscription.userLabel} ? Cette action retire cette ligne de l'historique.`,
    )

    if (!confirmed) return

    setHistoryError('')
    setHistoryNotice('')
    setSavingSubscriptionId(subscription.id)

    try {
      const { error } = await supabase.rpc(
        'admin_delete_player_subscription',
        {
          p_subscription_id: subscription.id,
        },
      )

      if (error) throw error

      await loadSubscriptionHistory()
      void logAdminAction({
        feature: 'subscriptions',
        action: 'delete',
        message: 'Historique abonnement joueur supprime par le SA.',
        userId: subscription.userId,
        entityType: 'player_subscription',
        entityId: subscription.id,
        metadata: {
          user_label: subscription.userLabel,
          plan_name: subscription.planName,
          status: subscription.status,
        },
      })
      setHistoryNotice(
        `Abonnement ${subscription.planName} supprimé pour ${subscription.userLabel}.`,
      )
    } catch (error) {
      void logError({
        feature: 'subscriptions',
        action: 'delete_failed',
        message: 'Echec suppression historique abonnement joueur.',
        userId: subscription.userId,
        entityType: 'player_subscription',
        entityId: subscription.id,
        metadata: {
          user_label: subscription.userLabel,
          plan_name: subscription.planName,
          error: formatUnknownError(
            error,
            "Impossible de supprimer l'abonnement.",
          ),
        },
      })
      setHistoryError(
        formatUnknownError(
          error,
          "Impossible de supprimer l'abonnement.",
        ),
      )
    } finally {
      setSavingSubscriptionId('')
    }
  }

  async function sendSubscriptionStatusPush(
    subscription: PlayerSubscriptionHistoryItem,
    nextStatus: SubscriptionHistoryStatus,
  ): Promise<string> {
    if (!subscription.userId) return ''

    try {
      const { data, error } = await supabase.functions.invoke(
        'send-push-notifications',
        {
          body: {
            userIds: [subscription.userId],
            title: 'Forfait mis à jour',
            body: `Ton forfait ${subscription.planName} est maintenant ${subscriptionStatusLabel(
              nextStatus,
            )}.`,
            type: 'subscription',
            data: {
              type: 'subscription',
              source: 'admin_subscription_status_update',
              subscription_id: subscription.id,
              status: nextStatus,
            },
            platforms: ['ios', 'android'],
          },
        },
      )

      if (error) throw error

      const sent = Number((data as { sent?: number } | null)?.sent ?? 0)
      const failed = Number((data as { failed?: number } | null)?.failed ?? 0)
      if (sent === 0 || failed > 0) {
        return ' Push mobile non confirmé.'
      }
      return ''
    } catch (error) {
      return ` Push non envoyé: ${formatUnknownError(
          error,
          'service push indisponible.',
        )}`
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
          {getVisibleSubscriptionHistoryNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
            <NavLink
              end={item.href === rootRoute}
              key={item.label}
              to={item.href}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {getVisibleSubscriptionHistoryNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink key={item.label} to={item.href}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Abonnements</span>
          <strong>{historyData.subscriptions.length} lignes</strong>
          <p>Historique joueur et mise à jour des statuts sans doublon.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Historique</p>
            <h1>Historique des abonnements</h1>
            <p className="page-subtitle">
              Consulte les paiements de forfaits et mets à jour le statut d’une
              ligne existante.
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

        {historyError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Abonnements indisponibles</strong>
              <p>{historyError}</p>
            </div>
            <button onClick={loadSubscriptionHistory} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {historyNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Abonnement mis à jour</strong>
              <p>{historyNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="settings-overview subscription-history-stats-overview" aria-label="Statistiques des abonnements">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">A</span>
            <div>
              <small>Abonnements</small>
              <strong>{formatNumber(subscriptionStats.total)}</strong>
              <p>
                {formatNumber(subscriptionStats.active)} actifs ·{' '}
                {formatNumber(subscriptionStats.pending)} en attente
              </p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">R</span>
            <div>
              <small>Revenus</small>
              <strong>{formatMoney(subscriptionStats.totalAmount)}</strong>
              <p>{formatMoney(subscriptionStats.activeAmount)} sur les lignes actives.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">E</span>
            <div>
              <small>Expiration</small>
              <strong>{formatNumber(subscriptionStats.expiringSoon)}</strong>
              <p>Actif(s) qui expirent dans les 7 prochains jours.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">S</span>
            <div>
              <small>Statuts fermés</small>
              <strong>{formatNumber(subscriptionStats.expired)}</strong>
              <p>{formatNumber(subscriptionStats.cancelled)} abonnement(s) annulé(s).</p>
            </div>
          </article>
        </section>

        <section className="panel winners-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Forfaits joueurs</p>
              <h2>Abonnements</h2>
            </div>
            <span className="pill">
              {isHistoryLoading
                ? 'Chargement'
                : `${filteredSubscriptions.length}/${historyData.subscriptions.length} entrées`}
            </span>
          </div>

          <div className="winner-filters">
            <input
              aria-label="Rechercher un abonnement"
              onChange={(event) => setSubscriptionSearch(event.target.value)}
              placeholder="Rechercher joueur, forfait, référence..."
              type="search"
              value={subscriptionSearch}
            />
            <select
              aria-label="Filtrer par statut"
              onChange={(event) =>
                setSubscriptionStatusFilter(
                  event.target.value as 'all' | SubscriptionHistoryStatus,
                )
              }
              value={subscriptionStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="expired">Expiré</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="premium-winner-table" role="table" aria-label="Historique des abonnements">
            <div className="premium-winner-head" role="row">
              <span>Joueur</span>
              <span>Forfait</span>
              <span>Paiement</span>
              <span>Période</span>
              <span>Statut</span>
              <span>Action</span>
            </div>
            {paginatedSubscriptions.length > 0 ? (
              paginatedSubscriptions.map((subscription) => (
                <article className="premium-winner-row" key={subscription.id} role="row">
                  <div>
                    <strong>{subscription.userLabel}</strong>
                    <p>{subscription.userPhone || 'Téléphone non défini'}</p>
                  </div>
                  <div>
                    <strong>{subscription.planName}</strong>
                    <p>{formatMoney(subscription.amount)}</p>
                  </div>
                  <div>
                    <strong>{subscription.paymentMethod || 'Paiement'}</strong>
                    <p>{subscription.paymentReference || 'Référence non définie'}</p>
                  </div>
                  <div>
                    <strong>{formatDate(subscription.startsAt)}</strong>
                    <p>Expire le {formatDate(subscription.expiresAt)}</p>
                  </div>
                  <span
                    className={`status-pill ${subscriptionStatusPillClass(
                      subscription.status,
                    )}`}
                  >
                    {subscriptionStatusLabel(subscription.status)}
                  </span>
                  <div className="contest-actions">
                    <select
                      aria-label={`Statut abonnement ${subscription.planName}`}
                      className="table-action-select"
                      disabled={savingSubscriptionId === subscription.id}
                      onChange={(event) =>
                        handleSubscriptionStatusChange(
                          subscription,
                          event.target.value as SubscriptionHistoryStatus,
                        )
                      }
                      value={subscription.status}
                    >
                      <option value="pending">En attente</option>
                      <option value="active">Actif</option>
                      <option value="expired">Expiré</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                    <button
                      className="table-action-button"
                      disabled={savingSubscriptionId === subscription.id}
                      onClick={() => navigate(`${usersRoute}/${subscription.userId}`)}
                      type="button"
                    >
                      Fiche joueur
                    </button>
                    <button
                      className="table-action-button danger"
                      disabled={savingSubscriptionId === subscription.id}
                      onClick={() => handleDeleteSubscription(subscription)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isHistoryLoading
                  ? 'Chargement des abonnements...'
                  : 'Aucun abonnement ne correspond aux filtres.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(subscriptionResultsStart)}-{formatNumber(subscriptionResultsEnd)} sur{' '}
              {formatNumber(filteredSubscriptions.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={subscriptionPage === 0 || isHistoryLoading}
                onClick={() => setSubscriptionPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={subscriptionPage === 0 || isHistoryLoading}
                onClick={() => setSubscriptionPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {subscriptionPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === subscriptionPage ? 'active' : ''}`}
                    disabled={isHistoryLoading}
                    key={page}
                    onClick={() => setSubscriptionPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={subscriptionPage + 1 >= totalSubscriptionPages || isHistoryLoading}
                onClick={() =>
                  setSubscriptionPage((page) =>
                    Math.min(totalSubscriptionPages - 1, page + 1),
                  )
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={subscriptionPage + 1 >= totalSubscriptionPages || isHistoryLoading}
                onClick={() => setSubscriptionPage(totalSubscriptionPages - 1)}
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
