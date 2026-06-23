import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type DashboardNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

type DashboardStat = {
  label: string
  value: string
  change: string
  detail: string
}

type ReviewItem = {
  title: string
  description: string
  meta: string
  tone: 'blue' | 'gold' | 'red'
}

type HealthItem = {
  label: string
  value: string
  level: number
}

type AppFeatureFlagState = {
  isEnabled: boolean
  updatedAt: string
}

export type ChartPoint = {
  label: string
  value: number
}

export type BreakdownItem = {
  label: string
  value: number
  meta: string
  tone: 'blue' | 'gold' | 'red' | 'green'
}

type RevenueSummary = {
  subscriptionsTotal: number
  pendingSubscriptions: number
  prizesTotal: number
}

type SignupStats = {
  todayCount: number
  weekCount: number
  currentMonthCount: number
  previousMonthCount: number
}

export type EngagementSummary = {
  views: number
  shares: number
  participations: number
  completionRate: number
}

type DashboardData = {
  stats: DashboardStat[]
  reviewQueue: ReviewItem[]
  platformHealth: HealthItem[]
  recentEvents: string[]
  participationTrend: ChartPoint[]
  contestTypeBreakdown: BreakdownItem[]
  contestStatusBreakdown: BreakdownItem[]
  revenue: RevenueSummary
  engagement: EngagementSummary
}

type SupabaseResponseWithError = {
  error: unknown
}

const quickActions = [
  {
    title: 'Valider partenaires',
    description: 'Contrôler les nouveaux comptes marques.',
  },
  {
    title: 'Modérer concours',
    description: 'Vérifier contenus, dates et lots.',
  },
  {
    title: 'Traiter gains',
    description: 'Mettre à jour les statuts gagnants.',
  },
]

const emptyDashboardData: DashboardData = {
  stats: [
    { label: 'Joueurs actifs', value: '0', change: 'Réel', detail: 'chargement' },
    { label: 'Concours actifs', value: '0', change: 'Réel', detail: 'chargement' },
    { label: 'Partenaires', value: '0', change: 'Réel', detail: 'chargement' },
    { label: 'Gains à traiter', value: '0', change: 'Réel', detail: 'chargement' },
  ],
  reviewQueue: [],
  platformHealth: [],
  recentEvents: [],
  participationTrend: [],
  contestTypeBreakdown: [],
  contestStatusBreakdown: [],
  revenue: {
    subscriptionsTotal: 0,
    pendingSubscriptions: 0,
    prizesTotal: 0,
  },
  engagement: {
    views: 0,
    shares: 0,
    participations: 0,
    completionRate: 0,
  },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function formatMoney(value: number | null) {
  if (!value) return '0 FCFA'
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
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

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    signupStatsResponse,
    playersCountResponse,
    activeContestsCountResponse,
    partnersCountResponse,
    pendingWinsCountResponse,
    pendingPartners,
    pendingContests,
    pendingWins,
    notificationsResponse,
    usersResponse,
    contestsResponse,
    participationsResponse,
    winnersResponse,
    partnerSubscriptionsResponse,
    playerSubscriptionsResponse,
  ] = await Promise.all([
    supabase.rpc('get_sa_signup_stats'),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'player')
      .eq('is_active', true),
    supabase
      .from('contests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('partners')
      .select('id', { count: 'exact', head: true })
      .eq('is_validated', true)
      .eq('is_active', true),
    supabase
      .from('winners')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'en_attente', 'en attente']),
    supabase
      .from('partners')
      .select('id, company_name, sector, created_at')
      .or('is_validated.is.false,is_validated.is.null')
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('contests')
      .select('id, title, prize_value, status, created_at')
      .in('status', ['pending', 'draft', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('winners')
      .select('id, prize_description, prize_value, status, created_at')
      .in('status', ['pending', 'en_attente', 'en attente'])
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('notifications')
      .select('id, title, body, created_at')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('users')
      .select('id, role, is_active, is_premium, created_at'),
    supabase
      .from('contests')
      .select('id, type, status, prize_value, views_count, shares_count, created_at'),
    supabase
      .from('participations')
      .select('id, score, completed, participated_at'),
    supabase
      .from('winners')
      .select('id, status, prize_value, created_at'),
    supabase
      .from('partner_subscriptions')
      .select('id, amount, status, created_at'),
    supabase
      .from('player_subscriptions')
      .select('id, amount, status, created_at'),
  ])

  const responses = [
    signupStatsResponse,
    playersCountResponse,
    activeContestsCountResponse,
    partnersCountResponse,
    pendingWinsCountResponse,
    pendingPartners,
    pendingContests,
    pendingWins,
    notificationsResponse,
    usersResponse,
    contestsResponse,
    participationsResponse,
    winnersResponse,
    partnerSubscriptionsResponse,
    playerSubscriptionsResponse,
  ] as SupabaseResponseWithError[]
  const failedResponse = responses.find((response) => response.error)
  if (failedResponse?.error) throw failedResponse.error

  const signupStatsData = (signupStatsResponse.data?.[0] ?? null) as
    | {
        today_count?: number | null
        week_count?: number | null
        current_month_count?: number | null
        previous_month_count?: number | null
      }
    | null
  const signupStats: SignupStats = {
    todayCount: signupStatsData?.today_count ?? 0,
    weekCount: signupStatsData?.week_count ?? 0,
    currentMonthCount: signupStatsData?.current_month_count ?? 0,
    previousMonthCount: signupStatsData?.previous_month_count ?? 0,
  }
  const playersCount = playersCountResponse.count ?? 0
  const activeContestsCount = activeContestsCountResponse.count ?? 0
  const partnersCount = partnersCountResponse.count ?? 0
  const pendingWinsCount = pendingWinsCountResponse.count ?? 0
  const users = usersResponse.data ?? []
  const contests = contestsResponse.data ?? []
  const participations = participationsResponse.data ?? []
  const winners = winnersResponse.data ?? []
  const subscriptions = [
    ...(partnerSubscriptionsResponse.data ?? []),
    ...(playerSubscriptionsResponse.data ?? []),
  ]
  const premiumPlayersCount = users.filter(
    (user) => user.role === 'player' && user.is_premium === true,
  ).length
  const totalParticipations = participations.length
  const completedParticipations = participations.filter(
    (participation) => participation.completed === true,
  ).length
  const pointsDistributed = participations.reduce(
    (sum, participation) => sum + ((participation.score as number | null) ?? 0),
    0,
  )
  const totalViews = contests.reduce(
    (sum, contest) => sum + ((contest.views_count as number | null) ?? 0),
    0,
  )
  const totalShares = contests.reduce(
    (sum, contest) => sum + ((contest.shares_count as number | null) ?? 0),
    0,
  )
  const prizesTotal = winners.reduce(
    (sum, winner) => sum + ((winner.prize_value as number | null) ?? 0),
    0,
  )
  const subscriptionsTotal = subscriptions
    .filter((subscription) => subscription.status === 'active')
    .reduce(
      (sum, subscription) => sum + ((subscription.amount as number | null) ?? 0),
      0,
    )
  const pendingSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === 'pending',
  ).length
  const participationTrend = buildLastSevenDaysTrend(
    participations.map((participation) => participation.participated_at as string | null),
  )
  const contestTypeBreakdown = buildBreakdown(
    contests.map((contest) => (contest.type as string | null) ?? 'autre'),
  )
  const contestStatusBreakdown = buildBreakdown(
    contests.map((contest) => (contest.status as string | null) ?? 'unknown'),
  )

  const reviewQueue: ReviewItem[] = [
    ...(pendingPartners.data ?? []).map((partner) => ({
      title: (partner.company_name as string | null) ?? 'Partenaire',
      description: 'Partenaire en attente de validation',
      meta: (partner.sector as string | null) ?? 'Nouveau dossier',
      tone: 'blue' as const,
    })),
    ...(pendingContests.data ?? []).map((contest) => ({
      title: (contest.title as string | null) ?? 'Concours',
      description: 'Concours soumis pour modération',
      meta: formatMoney(contest.prize_value as number | null),
      tone: 'gold' as const,
    })),
    ...(pendingWins.data ?? []).map((winner) => ({
      title: (winner.prize_description as string | null) ?? 'Gain à traiter',
      description: 'Gain en attente de traitement',
      meta: formatMoney(winner.prize_value as number | null),
      tone: 'red' as const,
    })),
  ].slice(0, 4)

  const recentEvents = (notificationsResponse.data ?? []).map((notification) => {
    const title = (notification.title as string | null) ?? 'Notification'
    const body = (notification.body as string | null) ?? ''
    return body ? `${title} - ${body}` : title
  })

  return {
    stats: [
      {
        label: 'Joueurs actifs',
        value: formatNumber(playersCount),
        change: 'Réel',
        detail: 'comptes player actifs',
      },
      {
        label: 'Inscrits aujourd’hui',
        value: formatNumber(signupStats.todayCount),
        change: 'Nouveaux',
        detail: 'depuis 00:00',
      },
      {
        label: 'Inscrits cette semaine',
        value: formatNumber(signupStats.weekCount),
        change: 'Semaine',
        detail: 'depuis lundi',
      },
      {
        label: 'Inscrits ce mois',
        value: formatNumber(signupStats.currentMonthCount),
        change: 'Mois en cours',
        detail: 'nouveaux comptes',
      },
      {
        label: 'Inscrits mois précédent',
        value: formatNumber(signupStats.previousMonthCount),
        change: 'Mois passé',
        detail: 'nouveaux comptes',
      },
      {
        label: 'Concours actifs',
        value: formatNumber(activeContestsCount),
        change: 'Live',
        detail: 'status active',
      },
      {
        label: 'Partenaires',
        value: formatNumber(partnersCount),
        change: 'Validés',
        detail: 'comptes actifs',
      },
      {
        label: 'Gains à traiter',
        value: formatNumber(pendingWinsCount),
        change: pendingWinsCount > 0 ? 'Urgent' : 'OK',
        detail: 'statut pending',
      },
      {
        label: 'Participations',
        value: formatNumber(totalParticipations),
        change: `${completedParticipations} complétées`,
        detail: `${pointsDistributed} points distribués`,
      },
      {
        label: 'Joueurs premium',
        value: formatNumber(premiumPlayersCount),
        change: 'Abonnés',
        detail: 'is_premium actif',
      },
      {
        label: 'Revenus abonnements',
        value: formatMoney(subscriptionsTotal),
        change: `${pendingSubscriptions} pending`,
        detail: 'partenaires + joueurs',
      },
      {
        label: 'Engagement',
        value: formatNumber(totalViews + totalShares),
        change: `${formatNumber(totalViews)} vues`,
        detail: `${formatNumber(totalShares)} partages`,
      },
    ],
    reviewQueue,
    platformHealth: [
      { label: 'Auth Supabase', value: 'Connecté', level: 96 },
      {
        label: 'Concours actifs',
        value: formatNumber(activeContestsCount),
        level: Math.min(100, activeContestsCount * 12),
      },
      {
        label: 'Notifications',
        value: `${recentEvents.length} récentes`,
        level: recentEvents.length > 0 ? 72 : 35,
      },
      {
        label: 'Complétion jeux',
        value: `${Math.round((completedParticipations / Math.max(1, totalParticipations)) * 100)}%`,
        level: Math.round((completedParticipations / Math.max(1, totalParticipations)) * 100),
      },
    ],
    recentEvents,
    participationTrend,
    contestTypeBreakdown,
    contestStatusBreakdown,
    revenue: {
      subscriptionsTotal,
      pendingSubscriptions,
      prizesTotal,
    },
    engagement: {
      views: totalViews,
      shares: totalShares,
      participations: totalParticipations,
      completionRate: Math.round(
        (completedParticipations / Math.max(1, totalParticipations)) * 100,
      ),
    },
  }
}

export function buildLastSevenDaysTrend(values: Array<string | null>): ChartPoint[] {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })
  const today = new Date()
  const points: ChartPoint[] = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today)
    day.setHours(0, 0, 0, 0)
    day.setDate(today.getDate() - offset)
    const nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)
    const value = values.filter((rawDate) => {
      if (!rawDate) return false
      const date = new Date(rawDate)
      return date >= day && date < nextDay
    }).length

    points.push({
      label: formatter.format(day),
      value,
    })
  }

  return points
}

export function buildBreakdown(values: string[]): BreakdownItem[] {
  const tones: Array<BreakdownItem['tone']> = ['blue', 'gold', 'green', 'red']
  const counts = new Map<string, number>()
  for (const value of values) {
    const label = value || 'unknown'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const total = Math.max(1, values.length)
  return Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value,
      meta: `${Math.round((value / total) * 100)}%`,
      tone: tones[index % tones.length],
    }))
}

function getVisibleDashboardNavItems(
  permissions: string[] | undefined,
  navItems: DashboardNavItem[],
) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

export function DashboardTrendCard({
  data,
  loading,
  title,
}: {
  data: ChartPoint[]
  loading: boolean
  title: string
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.value))

  return (
    <article className="panel analytics-card analytics-card-wide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Activité</p>
          <h2>{title}</h2>
        </div>
        <span className="pill">{loading ? 'Chargement' : '7 jours'}</span>
      </div>
      <div className="bar-chart" aria-label={title}>
        {data.map((item) => (
          <div className="bar-chart-column" key={item.label}>
            <span>{item.value}</span>
            <i style={{ height: `${Math.max(8, (item.value / maxValue) * 100)}%` }} />
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </article>
  )
}

export function DashboardBreakdownCard({
  data,
  loading,
  title,
}: {
  data: BreakdownItem[]
  loading: boolean
  title: string
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.value))

  return (
    <article className="panel analytics-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Concours</p>
          <h2>{title}</h2>
        </div>
        <span className="pill">{loading ? '...' : `${data.length} types`}</span>
      </div>
      <div className="breakdown-list">
        {data.length > 0 ? (
          data.map((item) => (
            <div className="breakdown-row" key={item.label}>
              <div>
                <span className={`review-dot ${item.tone}`} />
                <strong>{item.label}</strong>
                <small>{item.meta}</small>
              </div>
              <i>
                <b style={{ width: `${(item.value / maxValue) * 100}%` }} />
              </i>
              <em>{item.value}</em>
            </div>
          ))
        ) : (
          <p className="empty-panel-text">Aucune donnée à afficher.</p>
        )}
      </div>
    </article>
  )
}

function DashboardRevenueCard({ data }: { data: RevenueSummary }) {
  return (
    <article className="panel analytics-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>Revenus & lots</h2>
        </div>
        <span className="status-pill active">Réel</span>
      </div>
      <div className="finance-stack">
        <div>
          <span>Abonnements validés</span>
          <strong>{formatMoney(data.subscriptionsTotal)}</strong>
        </div>
        <div>
          <span>Lots gagnants</span>
          <strong>{formatMoney(data.prizesTotal)}</strong>
        </div>
        <div>
          <span>Demandes à valider</span>
          <strong>{formatNumber(data.pendingSubscriptions)}</strong>
        </div>
      </div>
    </article>
  )
}

export function DashboardEngagementCard({ data }: { data: EngagementSummary }) {
  const total = Math.max(1, data.views + data.shares + data.participations)

  return (
    <article className="panel analytics-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Engagement</p>
          <h2>Vues, partages, jeux</h2>
        </div>
        <span className="pill">{data.completionRate}% complété</span>
      </div>
      <div className="engagement-meter" aria-hidden="true">
        <span
          className="views"
          style={{ width: `${(data.views / total) * 100}%` }}
        />
        <span
          className="shares"
          style={{ width: `${(data.shares / total) * 100}%` }}
        />
        <span
          className="plays"
          style={{ width: `${(data.participations / total) * 100}%` }}
        />
      </div>
      <div className="engagement-grid">
        <div>
          <span>Vues</span>
          <strong>{formatNumber(data.views)}</strong>
        </div>
        <div>
          <span>Partages</span>
          <strong>{formatNumber(data.shares)}</strong>
        </div>
        <div>
          <span>Jeux</span>
          <strong>{formatNumber(data.participations)}</strong>
        </div>
      </div>
    </article>
  )
}

export function SuperAdminDashboard({
  authRoute,
  navItems,
  notificationsRoute,
  rootRoute,
}: {
  authRoute: string
  navItems: DashboardNavItem[]
  notificationsRoute: string
  rootRoute: string
}) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const visibleNavItems = getVisibleDashboardNavItems(
    adminAuth.profile?.permissions,
    navItems,
  )
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(emptyDashboardData)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [dashboardNotice, setDashboardNotice] = useState('')
  const [reviewSafeFlag, setReviewSafeFlag] = useState<AppFeatureFlagState>({
    isEnabled: true,
    updatedAt: '',
  })
  const [isReviewSafeSaving, setIsReviewSafeSaving] = useState(false)

  const loadDashboard = useCallback(async () => {
    setIsDashboardLoading(true)
    setDashboardError('')

    try {
      const nextDashboardData = await fetchDashboardData()
      setDashboardData(nextDashboardData)
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les données du dashboard.',
      )
    } finally {
      setIsDashboardLoading(false)
    }
  }, [])

  const loadReviewSafeFlag = useCallback(async () => {
    try {
      setReviewSafeFlag(await fetchAppFeatureFlag('app_review_safe', true))
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le mode review safe.',
      )
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void fetchDashboardData()
      .then((nextDashboardData) => {
        if (isMounted) setDashboardData(nextDashboardData)
      })
      .catch((error) => {
        if (!isMounted) return
        setDashboardError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les données du dashboard.',
        )
      })
      .finally(() => {
        if (isMounted) setIsDashboardLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    void loadReviewSafeFlag()
  }, [loadReviewSafeFlag])

  const refreshDashboardRealtime = useCallback(async () => {
    await Promise.all([loadDashboard(), loadReviewSafeFlag()])
  }, [loadDashboard, loadReviewSafeFlag])

  useRealtimeRefresh(
    'sa-dashboard-realtime',
    [
      'users',
      'partners',
      'contests',
      'participations',
      'winners',
      'notifications',
      'player_subscriptions',
      'partner_subscriptions',
      'app_feature_flags',
    ],
    refreshDashboardRealtime,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleToggleReviewSafeMode() {
    const nextIsEnabled = !reviewSafeFlag.isEnabled
    setDashboardError('')
    setDashboardNotice('')
    setIsReviewSafeSaving(true)

    const { error } = await supabase.from('app_feature_flags').upsert({
      key: 'app_review_safe',
      name: 'Mode review safe',
      description:
        'Active la présentation de conformité pour les stores: montants masqués, forfaits masqués, tirages et pronostics masqués.',
      is_enabled: nextIsEnabled,
      updated_at: new Date().toISOString(),
    })

    setIsReviewSafeSaving(false)

    if (error) {
      void logError({
        feature: 'review_safe',
        action: 'toggle_failed',
        message: 'Echec de mise a jour du mode review safe.',
        entityType: 'app_feature_flag',
        entityId: 'app_review_safe',
        metadata: { next_is_enabled: nextIsEnabled, error: error.message },
      })
      setDashboardError(error.message)
      return
    }

    setReviewSafeFlag({
      isEnabled: nextIsEnabled,
      updatedAt: new Date().toISOString(),
    })
    setDashboardNotice(
      nextIsEnabled
        ? 'Mode review safe activé en temps réel sur l’application.'
        : 'Mode review safe désactivé en temps réel sur l’application.',
    )
    void logAdminAction({
      feature: 'review_safe',
      action: nextIsEnabled ? 'enabled' : 'disabled',
      message: nextIsEnabled
        ? 'Mode review safe active par le SA.'
        : 'Mode review safe desactive par le SA.',
      entityType: 'app_feature_flag',
      entityId: 'app_review_safe',
      metadata: { is_enabled: nextIsEnabled },
    })
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
          <span>Prochaine étape</span>
          <strong>CRUD Catégories</strong>
          <p>Créer, modifier et désactiver les catégories de concours.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Vue générale</p>
            <h1>Super Admin</h1>
            <p className="page-subtitle">
              Pilotage opérationnel des concours, partenaires et gains.
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
            <button
              className="primary-button"
              onClick={() => navigate(notificationsRoute)}
              type="button"
            >
              Nouvelle notification
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Statistiques globales">
          {dashboardData.stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <div className="stat-card-header">
                <span>{item.label}</span>
                <small>{item.change}</small>
              </div>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        {dashboardError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Données Supabase indisponibles</strong>
              <p>{dashboardError}</p>
            </div>
            <button onClick={loadDashboard} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {dashboardNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Action appliquée</strong>
              <p>{dashboardNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel hero-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Conformité stores</p>
              <h2>Mode review safe</h2>
            </div>
            <span
              className={`status-pill ${
                reviewSafeFlag.isEnabled ? 'active' : 'inactive'
              }`}
            >
              {reviewSafeFlag.isEnabled ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <p className="page-subtitle">
            Active ce mode pendant les revues App Store / Play Store. Il masque
            les montants, les forfaits et les campagnes sensibles dans l’app.
            {reviewSafeFlag.updatedAt
              ? ` Dernière mise à jour : ${formatDate(reviewSafeFlag.updatedAt)}.`
              : ''}
          </p>
          <div className="contest-actions">
            <button
              className={
                reviewSafeFlag.isEnabled
                  ? 'table-action-button danger'
                  : 'primary-button'
              }
              disabled={isReviewSafeSaving}
              onClick={handleToggleReviewSafeMode}
              type="button"
            >
              {isReviewSafeSaving
                ? 'Mise à jour...'
                : reviewSafeFlag.isEnabled
                  ? 'Désactiver le review safe'
                  : 'Activer le review safe'}
            </button>
          </div>
        </section>

        <section className="dashboard-analytics-grid">
          <DashboardTrendCard
            data={dashboardData.participationTrend}
            loading={isDashboardLoading}
            title="Participations sur 7 jours"
          />
          <DashboardBreakdownCard
            data={dashboardData.contestTypeBreakdown}
            loading={isDashboardLoading}
            title="Répartition des concours"
          />
          <DashboardRevenueCard data={dashboardData.revenue} />
          <DashboardEngagementCard data={dashboardData.engagement} />
        </section>

        <section className="dashboard-grid">
          <div className="panel hero-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">File de validation</p>
                <h2>Actions prioritaires</h2>
              </div>
              <span className="pill">
                {isDashboardLoading
                  ? 'Chargement'
                  : `${dashboardData.reviewQueue.length} éléments`}
              </span>
            </div>

            <div className="review-list">
              {dashboardData.reviewQueue.length > 0 ? (
                dashboardData.reviewQueue.map((item) => (
                  <article className="review-card" key={item.title}>
                    <span className={`review-dot ${item.tone}`} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <small>{item.meta}</small>
                  </article>
                ))
              ) : (
                <p className="empty-panel-text">
                  {isDashboardLoading
                    ? 'Chargement des validations...'
                    : 'Aucune action prioritaire pour le moment.'}
                </p>
              )}
            </div>
          </div>

          <aside className="panel health-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Plateforme</p>
                <h2>Santé système</h2>
              </div>
            </div>

            <div className="health-list">
              {dashboardData.platformHealth.length > 0 ? (
                dashboardData.platformHealth.map((item) => (
                  <div className="health-item" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="health-track">
                      <i style={{ width: `${item.level}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-panel-text">
                  {isDashboardLoading
                    ? 'Lecture de la plateforme...'
                    : 'Aucune donnée système à afficher.'}
                </p>
              )}
            </div>
          </aside>

          <div className="panel actions-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Raccourcis</p>
                <h2>Widgets d’action</h2>
              </div>
            </div>

            <div className="quick-action-grid">
              {quickActions.map((action) => (
                <button className="quick-action-card" key={action.title} type="button">
                  <span />
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </button>
              ))}
            </div>
          </div>

          <aside className="panel activity-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Activité récente</p>
                <h2>Journal</h2>
              </div>
            </div>
            <div className="event-list">
              {dashboardData.recentEvents.length > 0 ? (
                dashboardData.recentEvents.map((event) => (
                  <div className="event-item" key={event}>
                    <span />
                    <p>{event}</p>
                  </div>
                ))
              ) : (
                <p className="empty-panel-text">
                  {isDashboardLoading
                    ? 'Chargement du journal...'
                    : 'Aucune activité récente.'}
                </p>
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  )
}
