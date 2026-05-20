import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from './auth/useAdminAuth'
import { supabase } from './lib/supabase'
import { registerWebPushToken } from './lib/webPush'

type AuthRole = 'super-admin' | 'partner'
type CategoryItem = {
  id: string
  name: string
  contests: number
  color: string
  description: string
}
type CategoryFormState = Pick<CategoryItem, 'name' | 'color' | 'description'>
type CountryItem = {
  id: string
  flag: string
  phoneDigits: number
  name: string
  dialCode: string
  isActive: boolean
  createdAt: string
}
type CountryFormState = {
  flag: string
  phoneDigits: string
  name: string
  dialCode: string
  isActive: boolean
}
type PartnerSectorItem = {
  id: string
  name: string
  description: string
  isActive: boolean
  orderIndex: number
  createdAt: string
}
type PartnerSectorFormState = {
  name: string
  description: string
  isActive: boolean
  orderIndex: string
}
type NotificationTarget = 'all' | 'active' | 'premium' | 'single' | 'selected'
type NotificationFormState = {
  target: NotificationTarget
  userId: string
  userIds: string[]
  title: string
  body: string
  type: string
  contestId: string
}
type ContestType = string
type ContestStatus = 'draft' | 'pending' | 'active' | 'inactive'
type ContestItem = {
  id: string
  title: string
  description: string
  type: ContestType
  categoryId: string
  category: string
  partnerId: string
  partner: string
  status: string
  imageUrl: string
  brandLogoUrl: string
  brandName: string
  prizeDescription: string
  prizeValue: number
  winnersCount: number
  maxParticipants: number | null
  startsAt: string
  endsAt: string
  isBoosted: boolean
  participants: number
}
type PartnerOption = {
  id: string
  name: string
}
type PartnerItem = {
  id: string
  userId: string
  companyName: string
  email: string
  logoUrl: string
  sector: string
  phone: string
  subscriptionPlan: string
  subscriptionExpiresAt: string
  isValidated: boolean
  isActive: boolean
  createdAt: string
}
type PartnerFormState = {
  companyName: string
  email: string
  password: string
  logoUrl: string
  sector: string
  phone: string
  subscriptionPlan: string
  subscriptionExpiresAt: string
  isValidated: boolean
  isActive: boolean
}
type PartnerAccessFormState = {
  password: string
}
type PartnerSession = {
  id: string
  companyName: string
  email: string
  logoUrl: string
  sector: string
  subscriptionPlan: string
  subscriptionExpiresAt: string
  isValidated: boolean
  isActive: boolean
}
type PartnerDashboardContest = {
  id: string
  title: string
  category: string
  type: string
  status: string
  viewsCount: number
  prizeValue: number
  startsAt: string
  endsAt: string
  isBoosted: boolean
}
type PartnerPlanBenefit = {
  id: string
  label: string
  description: string
  icon: string
  orderIndex: number
}
type PartnerPlanItem = {
  id: string
  key: string
  name: string
  description: string
  price: number
  durationDays: number
  maxContests: number | null
  maxBoosts: number | null
  canCreateQuiz: boolean
  canCreatePronostic: boolean
  canAccessStats: boolean
  canBeFeatured: boolean
  isActive: boolean
  orderIndex: number
  benefits: PartnerPlanBenefit[]
}
type PartnerPlanFormState = {
  key: string
  name: string
  description: string
  price: string
  durationDays: string
  maxContests: string
  maxBoosts: string
  canCreateQuiz: boolean
  canCreatePronostic: boolean
  canAccessStats: boolean
  canBeFeatured: boolean
  isActive: boolean
  orderIndex: string
  benefitsText: string
}
type PartnerSubscriptionItem = {
  id: string
  partnerName: string
  planName: string
  amount: number
  status: string
  startsAt: string
  expiresAt: string
  paymentMethod: string
}
type PartnerPlansData = {
  plans: PartnerPlanItem[]
  subscriptions: PartnerSubscriptionItem[]
}
type WinnerStatus = 'pending' | 'sent' | 'received' | 'cancelled'
type UserOption = {
  id: string
  label: string
}
type ContestOption = {
  id: string
  title: string
  prizeValue: number
  prizeDescription: string
  endsAt: string
}
type WinnerItem = {
  id: string
  userId: string
  userLabel: string
  contestId: string
  contestTitle: string
  prizeDescription: string
  prizeValue: number
  paymentMethod: string
  paymentNumber: string
  status: WinnerStatus
  sentAt: string
  createdAt: string
}
type WinnerFormState = {
  userId: string
  contestId: string
  prizeDescription: string
  prizeValue: string
  paymentMethod: string
  paymentNumber: string
  status: WinnerStatus
  sentAt: string
}
type WinnersData = {
  winners: WinnerItem[]
  users: UserOption[]
  contests: ContestOption[]
}
type ContestParticipationCandidate = {
  user_id: string | null
  score: number | null
  participated_at: string | null
}
type ContestHistoryItem = {
  id: string
  userId: string
  userLabel: string
  score: number
  rank: number
  completed: boolean
  participatedAt: string
  answers: string
}
type ContestHistoryData = {
  contest: ContestItem
  participations: ContestHistoryItem[]
}
type QuizQuestionItem = {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  points: number
  timeLimit: number
  orderIndex: number
}
type QuizQuestionFormState = {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  points: string
  timeLimit: string
  orderIndex: string
}
type DrawSettingsState = {
  standardTickets: string
  premiumTickets: string
  confirmationMessage: string
  winnerAnnouncementAt: string
  rules: string
}
type PredictionSettingsState = {
  homeTeam: string
  awayTeam: string
  matchLabel: string
  matchDate: string
  homeScore: string
  awayScore: string
  status: string
  pointsExactScore: string
  pointsCorrectResult: string
}
type ContestGameData = {
  contest: ContestItem
  questions: QuizQuestionItem[]
  drawSettings: DrawSettingsState
  predictionSettings: PredictionSettingsState
}
type PlayerUserItem = {
  id: string
  phone: string
  username: string
  avatarUrl: string
  role: string
  isPremium: boolean
  premiumExpiresAt: string
  pointsTotal: number
  participationsToday: number
  lastParticipationDate: string
  isActive: boolean
  createdAt: string
}
type PlayerPlanItem = {
  id: string
  key: string
  name: string
  description: string
  price: number
  durationDays: number
  dailyParticipationLimit: number
  bonusTickets: number
  badgeMultiplier: number
  isActive: boolean
  orderIndex: number
  benefits: string[]
}
type PlayerPlanFormState = {
  key: string
  name: string
  description: string
  price: string
  durationDays: string
  dailyParticipationLimit: string
  bonusTickets: string
  badgeMultiplier: string
  isActive: boolean
  orderIndex: string
  benefitsText: string
}
type PlayerSubscriptionItem = {
  id: string
  userId: string
  planId: string
  planName: string
  amount: number
  status: string
  startsAt: string
  expiresAt: string
  paymentMethod: string
  paymentReference: string
}
type PlayerParticipationItem = {
  id: string
  contestId: string
  contestTitle: string
  score: number
  rank: number | null
  completed: boolean
  participatedAt: string
}
type PlayerRewardItem = {
  id: string
  contestTitle: string
  prizeDescription: string
  prizeValue: number
  status: string
  createdAt: string
}
type PlayerBadgeItem = {
  id: string
  name: string
  description: string
  earnedAt: string
}
type PlayersData = {
  users: PlayerUserItem[]
  plans: PlayerPlanItem[]
  totalCount: number
}
type PlayerDetailData = {
  subscriptions: PlayerSubscriptionItem[]
  participations: PlayerParticipationItem[]
  rewards: PlayerRewardItem[]
  badges: PlayerBadgeItem[]
}
type PlayerParticipationHistoryRow = {
  participation_id: string
  contest_id: string | null
  contest_title: string | null
  score: number | null
  rank: number | null
  completed: boolean | null
  participated_at: string | null
}
type CategoryOption = {
  id: string
  name: string
}
type ContestTypeOption = {
  key: string
  name: string
  description: string
}
type ContestFormState = {
  title: string
  description: string
  type: ContestType
  categoryId: string
  partnerId: string
  imageUrl: string
  brandLogoUrl: string
  brandName: string
  prizeDescription: string
  prizeValue: string
  winnersCount: string
  maxParticipants: string
  startsAt: string
  endsAt: string
  status: ContestStatus
  isBoosted: boolean
}
type ContestsData = {
  contests: ContestItem[]
  categories: CategoryOption[]
  partners: PartnerOption[]
  types: ContestTypeOption[]
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
type ChartPoint = {
  label: string
  value: number
}
type BreakdownItem = {
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
type EngagementSummary = {
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

const PARTNER_AUTH_ROUTE = '/auth/partner'
const SUPER_ADMIN_AUTH_ROUTE = '/access/mp-sa-console'
const SUPER_ADMIN_ROUTE = '/mp-control/super-admin'
const SUPER_ADMIN_CATEGORIES_ROUTE = `${SUPER_ADMIN_ROUTE}/categories`
const SUPER_ADMIN_COUNTRIES_ROUTE = `${SUPER_ADMIN_ROUTE}/countries`
const SUPER_ADMIN_SECTORS_ROUTE = `${SUPER_ADMIN_ROUTE}/sectors`
const SUPER_ADMIN_CONTESTS_ROUTE = `${SUPER_ADMIN_ROUTE}/contests`
const SUPER_ADMIN_PARTNERS_ROUTE = `${SUPER_ADMIN_ROUTE}/partners`
const SUPER_ADMIN_PLANS_ROUTE = `${SUPER_ADMIN_ROUTE}/plans`
const SUPER_ADMIN_WINNERS_ROUTE = `${SUPER_ADMIN_ROUTE}/winners`
const SUPER_ADMIN_USERS_ROUTE = `${SUPER_ADMIN_ROUTE}/users`
const SUPER_ADMIN_NOTIFICATIONS_ROUTE = `${SUPER_ADMIN_ROUTE}/notifications`
const SUPER_ADMIN_SETTINGS_ROUTE = `${SUPER_ADMIN_ROUTE}/settings`
const SUPER_ADMIN_MAINTENANCE_ROUTE = `${SUPER_ADMIN_ROUTE}/maintenance`

type MaintenanceScope =
  | 'game_history'
  | 'rewards_notifications'
  | 'badges'
  | 'subscriptions'
  | 'contests'
  | 'all_test_data'

type MaintenanceAction = {
  scope: MaintenanceScope
  title: string
  description: string
  keeps: string
  danger: 'medium' | 'high'
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

const roleContent: Record<
  AuthRole,
  {
    label: string
    title: string
    subtitle: string
    destination: string
    accessHint: string
  }
> = {
  'super-admin': {
    label: 'Super Admin',
    title: 'Connexion Super Admin',
    subtitle: 'Accède au pilotage global de MegaPromo.',
    destination: SUPER_ADMIN_ROUTE,
    accessHint: 'Validation partenaires, concours, gains et notifications.',
  },
  partner: {
    label: 'Partenaire',
    title: 'Connexion partenaire',
    subtitle: 'Gère tes campagnes, statistiques et boosts.',
    destination: '/partner',
    accessHint: 'Campagnes, questions, performances et abonnements.',
  },
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

const navItems = [
  { label: 'Dashboard', href: SUPER_ADMIN_ROUTE, icon: 'D' },
  { label: 'Joueurs', href: SUPER_ADMIN_USERS_ROUTE, icon: 'J' },
  { label: 'Partenaires', href: SUPER_ADMIN_PARTNERS_ROUTE, icon: 'P' },
  { label: 'Concours', href: SUPER_ADMIN_CONTESTS_ROUTE, icon: 'C' },
  { label: 'Catégories', href: SUPER_ADMIN_CATEGORIES_ROUTE, icon: 'G' },
  { label: 'Pays', href: SUPER_ADMIN_COUNTRIES_ROUTE, icon: 'Y' },
  { label: 'Secteurs', href: SUPER_ADMIN_SECTORS_ROUTE, icon: 'T' },
  { label: 'Forfaits', href: SUPER_ADMIN_PLANS_ROUTE, icon: 'F' },
  { label: 'Gagnants', href: SUPER_ADMIN_WINNERS_ROUTE, icon: 'W' },
  { label: 'Notifications', href: SUPER_ADMIN_NOTIFICATIONS_ROUTE, icon: 'N' },
  { label: 'Paramètres', href: SUPER_ADMIN_SETTINGS_ROUTE, icon: 'S' },
  { label: 'Maintenance', href: SUPER_ADMIN_MAINTENANCE_ROUTE, icon: 'M' },
]

const maintenanceActions: MaintenanceAction[] = [
  {
    scope: 'game_history',
    title: 'Vider historiques de jeu',
    description:
      'Supprime toutes les participations et remet les points ainsi que les compteurs journaliers des joueurs à zéro.',
    keeps: 'Conserve concours, gagnants, abonnements, configurations.',
    danger: 'medium',
  },
  {
    scope: 'rewards_notifications',
    title: 'Vider gagnants et notifications',
    description:
      'Supprime les lignes gagnants et toutes les notifications envoyées pendant les tests.',
    keeps: 'Conserve concours, joueurs, participations, forfaits.',
    danger: 'medium',
  },
  {
    scope: 'badges',
    title: 'Vider badges attribués',
    description: 'Retire les badges gagnés par les joueurs pendant les tests.',
    keeps: 'Conserve les définitions de badges.',
    danger: 'medium',
  },
  {
    scope: 'subscriptions',
    title: 'Vider abonnements test',
    description:
      'Supprime les abonnements joueurs/partenaires et réinitialise les statuts premium.',
    keeps: 'Conserve les forfaits et avantages configurés.',
    danger: 'high',
  },
  {
    scope: 'contests',
    title: 'Vider concours test',
    description:
      'Supprime concours, jeux, questions, boosts, participations, gagnants associés et remet les points joueurs à zéro.',
    keeps: 'Conserve catégories, types, plans, joueurs et partenaires.',
    danger: 'high',
  },
  {
    scope: 'all_test_data',
    title: 'Nettoyage complet hors configuration',
    description:
      'Vide concours, jeux, participations, gagnants, notifications, badges attribués, abonnements et points joueurs.',
    keeps:
      'Conserve users, partners, catégories, pays, types, forfaits, avantages et badges.',
    danger: 'high',
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

async function fetchDashboardData(): Promise<DashboardData> {
  const [
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
  ]
  const failedResponse = responses.find((response) => response.error)
  if (failedResponse?.error) throw failedResponse.error

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

function buildLastSevenDaysTrend(values: Array<string | null>): ChartPoint[] {
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

function buildBreakdown(values: string[]): BreakdownItem[] {
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

function DashboardTrendCard({
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

function DashboardBreakdownCard({
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

function DashboardEngagementCard({ data }: { data: EngagementSummary }) {
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

async function fetchCategoriesData(): Promise<CategoryItem[]> {
  const [categoriesResponse, contestCategoriesResponse] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, description, color, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('contests').select('category_id'),
  ])

  if (categoriesResponse.error) throw categoriesResponse.error
  if (contestCategoriesResponse.error) throw contestCategoriesResponse.error

  const contestsByCategory = new Map<string, number>()
  for (const contest of contestCategoriesResponse.data ?? []) {
    const categoryId = contest.category_id as string | null
    if (!categoryId) continue
    contestsByCategory.set(categoryId, (contestsByCategory.get(categoryId) ?? 0) + 1)
  }

  return (categoriesResponse.data ?? []).map((category) => ({
    id: category.id as string,
    name: (category.name as string | null) ?? 'Catégorie',
    description: (category.description as string | null) ?? '',
    color: (category.color as string | null) || '#6b7fff',
    contests: contestsByCategory.get(category.id as string) ?? 0,
  }))
}

async function fetchCountriesData(): Promise<CountryItem[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, flag, phone_digits, name, dial_code, is_active, created_at')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((country) => ({
    id: country.id as string,
    flag: (country.flag as string | null) ?? '',
    phoneDigits: (country.phone_digits as number | null) ?? 0,
    name: (country.name as string | null) ?? '',
    dialCode: (country.dial_code as string | null) ?? '',
    isActive: (country.is_active as boolean | null) ?? false,
    createdAt: (country.created_at as string | null) ?? '',
  }))
}

async function fetchPartnerSectorsData(): Promise<PartnerSectorItem[]> {
  const { data, error } = await supabase
    .from('partner_sectors')
    .select('id, name, description, is_active, order_index, created_at')
    .order('order_index', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((sector) => ({
    id: sector.id as string,
    name: (sector.name as string | null) ?? '',
    description: (sector.description as string | null) ?? '',
    isActive: (sector.is_active as boolean | null) ?? true,
    orderIndex: (sector.order_index as number | null) ?? 0,
    createdAt: (sector.created_at as string | null) ?? '',
  }))
}

async function fetchPartnersData(): Promise<PartnerItem[]> {
  const { data, error } = await supabase
    .from('partners')
    .select(
      'id, user_id, company_name, email, logo_url, sector, phone, subscription_plan, subscription_expires_at, is_validated, is_active, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((partner) => ({
    id: partner.id as string,
    userId: (partner.user_id as string | null) ?? '',
    companyName: (partner.company_name as string | null) ?? 'Partenaire',
    email: (partner.email as string | null) ?? '',
    logoUrl: (partner.logo_url as string | null) ?? '',
    sector: (partner.sector as string | null) ?? '',
    phone: (partner.phone as string | null) ?? '',
    subscriptionPlan: (partner.subscription_plan as string | null) ?? '',
    subscriptionExpiresAt: (partner.subscription_expires_at as string | null) ?? '',
    isValidated: (partner.is_validated as boolean | null) ?? false,
    isActive: (partner.is_active as boolean | null) ?? false,
    createdAt: (partner.created_at as string | null) ?? '',
  }))
}

function mapPartnerSession(partner: Record<string, unknown>): PartnerSession {
  return {
    id: partner.id as string,
    companyName: (partner.company_name as string | null) ?? 'Partenaire',
    email: (partner.email as string | null) ?? '',
    logoUrl: (partner.logo_url as string | null) ?? '',
    sector: (partner.sector as string | null) ?? '',
    subscriptionPlan: (partner.subscription_plan as string | null) ?? 'free',
    subscriptionExpiresAt:
      (partner.subscription_expires_at as string | null) ?? '',
    isValidated: (partner.is_validated as boolean | null) ?? false,
    isActive: (partner.is_active as boolean | null) ?? false,
  }
}

async function resolvePartnerSessionByUser(userId: string, email?: string | null) {
  const partnerFields =
    'id, user_id, company_name, email, logo_url, sector, subscription_plan, subscription_expires_at, is_validated, is_active'

  let { data, error } = await supabase
    .from('partners')
    .select(partnerFields)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data && email) {
    const emailResponse = await supabase
      .from('partners')
      .select(partnerFields)
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (emailResponse.error) throw emailResponse.error
    data = emailResponse.data
  }

  if (!data) {
    throw new Error('Aucun partenaire MegaPromo ne correspond à ce compte.')
  }

  if ((data.is_active as boolean | null) === false) {
    throw new Error('Ce compte partenaire est désactivé.')
  }

  if ((data.is_validated as boolean | null) === false) {
    throw new Error('Ce partenaire doit être validé par le Super Admin.')
  }

  if (!data.user_id) {
    const { error: linkError } = await supabase
      .from('partners')
      .update({ user_id: userId })
      .eq('id', data.id as string)

    if (linkError) throw linkError
  }

  return mapPartnerSession(data)
}

function mapPartnerDashboardContest(
  contest: Record<string, unknown>,
): PartnerDashboardContest {
  return {
    id: contest.id as string,
    title: (contest.title as string | null) ?? 'Concours',
    category: (contest.category as string | null) ?? 'Non classe',
    type: (contest.type as string | null) ?? 'concours',
    status: (contest.status as string | null) ?? 'draft',
    viewsCount: Number(contest.views_count ?? 0),
    prizeValue: Number(contest.prize_value ?? 0),
    startsAt: (contest.starts_at as string | null) ?? '',
    endsAt: (contest.ends_at as string | null) ?? '',
    isBoosted: (contest.is_boosted as boolean | null) ?? false,
  }
}

async function fetchPartnerDashboardContests(partnerId: string) {
  const { data, error } = await supabase
    .from('contests')
    .select(
      'id, title, category, type, status, views_count, prize_value, starts_at, ends_at, is_boosted, created_at',
    )
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error
  return (data ?? []).map((contest) => mapPartnerDashboardContest(contest))
}

async function fetchPartnerContestCatalog() {
  const [categoriesResponse, typesResponse] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('contest_types')
      .select('key, name, description')
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
  ])

  if (categoriesResponse.error) throw categoriesResponse.error
  if (typesResponse.error) throw typesResponse.error

  return {
    categories: (categoriesResponse.data ?? []).map((category) => ({
      id: category.id as string,
      name: (category.name as string | null) ?? 'Catégorie',
    })),
    types: (typesResponse.data ?? []).map((type) => ({
      key: (type.key as string | null) ?? 'quiz',
      name: (type.name as string | null) ?? 'Quiz',
      description: (type.description as string | null) ?? '',
    })),
  }
}

async function signInPartner(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  if (!data.user) throw new Error('Connexion partenaire impossible.')

  try {
    return await resolvePartnerSessionByUser(data.user.id, data.user.email)
  } catch (error) {
    await supabase.auth.signOut()
    throw error
  }
}

async function sendPartnerAccessEmail({
  partnerId,
  userId,
  companyName,
  email,
  password,
}: {
  partnerId: string
  userId?: string
  companyName: string
  email: string
  password?: string
}) {
  const loginUrl = `${window.location.origin}${PARTNER_AUTH_ROUTE}`
  const { data, error } = await supabase.functions.invoke('send-partner-access', {
    body: {
      partnerId,
      userId,
      companyName,
      email,
      password,
      loginUrl,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('failed to send')) {
      throw new Error(
        'Edge Function send-partner-access introuvable ou non déployée. Déploie-la puis configure les secrets Resend.',
      )
    }

    throw error
  }

  const result = data as {
    ok?: boolean
    error?: string
    details?: unknown
    emailSent?: boolean
    emailError?: string
  } | null

  if (result?.ok === false) {
    const detail =
      typeof result.details === 'string'
        ? ` · ${result.details}`
        : ''
    throw new Error(`${result.error ?? 'Erreur Edge Function'}${detail}`)
  }

  return result
}

async function fetchPartnerPlansData(): Promise<PartnerPlansData> {
  const [plansResponse, benefitsResponse, subscriptionsResponse, partnersResponse] =
    await Promise.all([
      supabase
        .from('partner_plans')
        .select(
          'id, key, name, description, price, duration_days, max_contests, max_boosts, can_create_quiz, can_create_pronostic, can_access_stats, can_be_featured, is_active, order_index',
        )
        .order('order_index', { ascending: true }),
      supabase
        .from('partner_plan_benefits')
        .select('id, plan_id, label, description, icon, order_index')
        .order('order_index', { ascending: true }),
      supabase
        .from('partner_subscriptions')
        .select(
          'id, partner_id, plan_id, amount, status, starts_at, expires_at, payment_method, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('partners').select('id, company_name'),
    ])

  if (plansResponse.error) throw plansResponse.error
  if (benefitsResponse.error) throw benefitsResponse.error
  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (partnersResponse.error) throw partnersResponse.error

  const benefitsByPlan = new Map<string, PartnerPlanBenefit[]>()
  for (const benefit of benefitsResponse.data ?? []) {
    const planId = benefit.plan_id as string
    const planBenefits = benefitsByPlan.get(planId) ?? []
    planBenefits.push({
      id: benefit.id as string,
      label: (benefit.label as string | null) ?? '',
      description: (benefit.description as string | null) ?? '',
      icon: (benefit.icon as string | null) ?? '',
      orderIndex: (benefit.order_index as number | null) ?? 0,
    })
    benefitsByPlan.set(planId, planBenefits)
  }

  const plans = (plansResponse.data ?? []).map((plan) => ({
    id: plan.id as string,
    key: (plan.key as string | null) ?? '',
    name: (plan.name as string | null) ?? 'Forfait',
    description: (plan.description as string | null) ?? '',
    price: (plan.price as number | null) ?? 0,
    durationDays: (plan.duration_days as number | null) ?? 30,
    maxContests: (plan.max_contests as number | null) ?? null,
    maxBoosts: (plan.max_boosts as number | null) ?? null,
    canCreateQuiz: (plan.can_create_quiz as boolean | null) ?? false,
    canCreatePronostic: (plan.can_create_pronostic as boolean | null) ?? false,
    canAccessStats: (plan.can_access_stats as boolean | null) ?? false,
    canBeFeatured: (plan.can_be_featured as boolean | null) ?? false,
    isActive: (plan.is_active as boolean | null) ?? true,
    orderIndex: (plan.order_index as number | null) ?? 0,
    benefits: benefitsByPlan.get(plan.id as string) ?? [],
  }))

  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]))
  const partnerNames = new Map(
    (partnersResponse.data ?? []).map((partner) => [
      partner.id as string,
      (partner.company_name as string | null) ?? 'Partenaire',
    ]),
  )

  return {
    plans,
    subscriptions: (subscriptionsResponse.data ?? []).map((subscription) => ({
      id: subscription.id as string,
      partnerName:
        partnerNames.get(subscription.partner_id as string) ?? 'Partenaire',
      planName: planNames.get(subscription.plan_id as string) ?? 'Forfait',
      amount: (subscription.amount as number | null) ?? 0,
      status: (subscription.status as string | null) ?? 'active',
      startsAt: (subscription.starts_at as string | null) ?? '',
      expiresAt: (subscription.expires_at as string | null) ?? '',
      paymentMethod: (subscription.payment_method as string | null) ?? '',
    })),
  }
}

async function fetchWinnersData(): Promise<WinnersData> {
  const [winnersResponse, usersResponse, contestsResponse] = await Promise.all([
    supabase
      .from('winners')
      .select(
        'id, user_id, contest_id, prize_description, prize_value, payment_method, payment_number, status, sent_at, created_at',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, username, phone')
      .eq('role', 'player')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('contests')
      .select('id, title, prize_value, prize_description, ends_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (winnersResponse.error) throw winnersResponse.error
  if (usersResponse.error) throw usersResponse.error
  if (contestsResponse.error) throw contestsResponse.error

  const users = (usersResponse.data ?? []).map((user) => {
    const username = user.username as string | null
    const phone = user.phone as string | null
    return {
      id: user.id as string,
      label: username || phone || 'Joueur',
    }
  })
  const contests = (contestsResponse.data ?? []).map((contest) => ({
    id: contest.id as string,
    title: (contest.title as string | null) ?? 'Concours',
    prizeValue: (contest.prize_value as number | null) ?? 0,
    prizeDescription: (contest.prize_description as string | null) ?? '',
    endsAt: (contest.ends_at as string | null) ?? '',
  }))
  const userLabels = new Map(users.map((user) => [user.id, user.label]))
  const contestLabels = new Map(contests.map((contest) => [contest.id, contest.title]))

  return {
    users,
    contests,
    winners: (winnersResponse.data ?? []).map((winner) => ({
      id: winner.id as string,
      userId: (winner.user_id as string | null) ?? '',
      userLabel:
        userLabels.get((winner.user_id as string | null) ?? '') ?? 'Joueur',
      contestId: (winner.contest_id as string | null) ?? '',
      contestTitle:
        contestLabels.get((winner.contest_id as string | null) ?? '') ??
        'Concours',
      prizeDescription: (winner.prize_description as string | null) ?? '',
      prizeValue: (winner.prize_value as number | null) ?? 0,
      paymentMethod: (winner.payment_method as string | null) ?? '',
      paymentNumber: (winner.payment_number as string | null) ?? '',
      status: ((winner.status as string | null) ?? 'pending') as WinnerStatus,
      sentAt: (winner.sent_at as string | null) ?? '',
      createdAt: (winner.created_at as string | null) ?? '',
    })),
  }
}

async function fetchPlayerPlansForAdmin(): Promise<PlayerPlanItem[]> {
  const [plansResponse, benefitsResponse] = await Promise.all([
    supabase
      .from('player_plans')
      .select(
        'id, key, name, description, price, duration_days, daily_participation_limit, bonus_tickets, badge_multiplier, is_active, order_index',
      )
      .order('order_index', { ascending: true }),
    supabase
      .from('player_plan_benefits')
      .select('id, plan_id, label, order_index')
      .order('order_index', { ascending: true }),
  ])

  if (plansResponse.error) throw plansResponse.error
  if (benefitsResponse.error) throw benefitsResponse.error

  const benefitsByPlan = new Map<string, string[]>()
  for (const benefit of benefitsResponse.data ?? []) {
    const planId = benefit.plan_id as string
    const currentBenefits = benefitsByPlan.get(planId) ?? []
    currentBenefits.push((benefit.label as string | null) ?? 'Avantage')
    benefitsByPlan.set(planId, currentBenefits)
  }

  return (plansResponse.data ?? []).map((plan) => ({
    id: plan.id as string,
    key: (plan.key as string | null) ?? '',
    name: (plan.name as string | null) ?? 'Forfait',
    description: (plan.description as string | null) ?? '',
    price: (plan.price as number | null) ?? 0,
    durationDays: (plan.duration_days as number | null) ?? 30,
    dailyParticipationLimit:
      (plan.daily_participation_limit as number | null) ?? 3,
    bonusTickets: (plan.bonus_tickets as number | null) ?? 0,
    badgeMultiplier: Number((plan.badge_multiplier as number | string | null) ?? 1),
    isActive: (plan.is_active as boolean | null) ?? true,
    orderIndex: (plan.order_index as number | null) ?? 0,
    benefits: benefitsByPlan.get(plan.id as string) ?? [],
  }))
}

async function fetchPlayersData({
  page,
  pageSize,
  search,
}: {
  page: number
  pageSize: number
  search: string
}): Promise<PlayersData> {
  const from = page * pageSize
  const to = from + pageSize - 1
  let usersQuery = supabase
    .from('users')
    .select(
      'id, phone, username, avatar_url, role, is_premium, premium_expires_at, points_total, participations_today, last_participation_date, is_active, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)
  const cleanedSearch = search.trim()

  if (cleanedSearch) {
    const escapedSearch = cleanedSearch.replaceAll('%', '\\%').replaceAll('_', '\\_')
    usersQuery = usersQuery.or(
      `username.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%,role.ilike.%${escapedSearch}%`,
    )
  }

  const [usersResponse, plansResponse, benefitsResponse] = await Promise.all([
    usersQuery,
    supabase
      .from('player_plans')
      .select(
        'id, key, name, description, price, duration_days, daily_participation_limit, bonus_tickets, badge_multiplier, is_active, order_index',
      )
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('player_plan_benefits')
      .select('id, plan_id, label, order_index')
      .order('order_index', { ascending: true }),
  ])

  if (usersResponse.error) throw usersResponse.error
  if (plansResponse.error) throw plansResponse.error
  if (benefitsResponse.error) throw benefitsResponse.error

  const benefitsByPlan = new Map<string, string[]>()

  for (const benefit of benefitsResponse.data ?? []) {
    const planId = benefit.plan_id as string
    const currentBenefits = benefitsByPlan.get(planId) ?? []
    currentBenefits.push((benefit.label as string | null) ?? 'Avantage')
    benefitsByPlan.set(planId, currentBenefits)
  }

  const plans = (plansResponse.data ?? []).map((plan) => ({
    id: plan.id as string,
    key: (plan.key as string | null) ?? '',
    name: (plan.name as string | null) ?? 'Forfait',
    description: (plan.description as string | null) ?? '',
    price: (plan.price as number | null) ?? 0,
    durationDays: (plan.duration_days as number | null) ?? 30,
    dailyParticipationLimit:
      (plan.daily_participation_limit as number | null) ?? 3,
    bonusTickets: (plan.bonus_tickets as number | null) ?? 0,
    badgeMultiplier: (plan.badge_multiplier as number | null) ?? 1,
    isActive: (plan.is_active as boolean | null) ?? true,
    orderIndex: (plan.order_index as number | null) ?? 0,
    benefits: benefitsByPlan.get(plan.id as string) ?? [],
  }))
  return {
    plans,
    totalCount: usersResponse.count ?? 0,
    users: (usersResponse.data ?? []).map((user) => ({
      id: user.id as string,
      phone: (user.phone as string | null) ?? '',
      username: (user.username as string | null) ?? '',
      avatarUrl: (user.avatar_url as string | null) ?? '',
      role: (user.role as string | null) ?? 'player',
      isPremium: (user.is_premium as boolean | null) ?? false,
      premiumExpiresAt: (user.premium_expires_at as string | null) ?? '',
      pointsTotal: (user.points_total as number | null) ?? 0,
      participationsToday: (user.participations_today as number | null) ?? 0,
      lastParticipationDate:
        (user.last_participation_date as string | null) ?? '',
      isActive: (user.is_active as boolean | null) ?? true,
      createdAt: (user.created_at as string | null) ?? '',
    })),
  }
}

async function fetchPlayerDetailData(
  userId: string,
  plans: PlayerPlanItem[],
): Promise<PlayerDetailData> {
  const [participationsResponse, winnersResponse, subscriptionsResponse, badgesResponse, userBadgesResponse] =
    await Promise.all([
      supabase
        .rpc('get_player_participation_history', {
          row_limit: 50,
          target_user_id: userId,
        }),
      supabase
        .from('winners')
        .select('id, user_id, contest_id, prize_description, prize_value, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('player_subscriptions')
        .select(
          'id, user_id, plan_id, amount, status, starts_at, expires_at, payment_method, payment_reference, created_at',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('badges').select('id, name, description'),
      supabase
        .from('user_badges')
        .select('id, user_id, badge_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
    ])

  if (participationsResponse.error) throw participationsResponse.error
  if (winnersResponse.error) throw winnersResponse.error
  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (badgesResponse.error) throw badgesResponse.error
  if (userBadgesResponse.error) throw userBadgesResponse.error

  const contestIds = Array.from(
    new Set(
      [
        ...((participationsResponse.data ?? []) as PlayerParticipationHistoryRow[]).map(
          (item) => item.contest_id,
        ),
        ...(winnersResponse.data ?? []).map((item) => item.contest_id as string | null),
      ].filter(Boolean),
    ),
  ) as string[]
  const contestResponse =
    contestIds.length > 0
      ? await supabase.from('contests').select('id, title').in('id', contestIds)
      : { data: [], error: null }

  if (contestResponse.error) throw contestResponse.error

  const contestTitles = new Map(
    (contestResponse.data ?? []).map((contest) => [
      contest.id as string,
      (contest.title as string | null) ?? 'Concours',
    ]),
  )
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]))
  const badgesById = new Map(
    (badgesResponse.data ?? []).map((badge) => [
      badge.id as string,
      {
        name: (badge.name as string | null) ?? 'Badge',
        description: (badge.description as string | null) ?? '',
      },
    ]),
  )

  return {
    subscriptions: (subscriptionsResponse.data ?? []).map((subscription) => ({
      id: subscription.id as string,
      userId: (subscription.user_id as string | null) ?? '',
      planId: (subscription.plan_id as string | null) ?? '',
      planName: planNames.get((subscription.plan_id as string | null) ?? '') ?? 'Forfait',
      amount: (subscription.amount as number | null) ?? 0,
      status: (subscription.status as string | null) ?? 'active',
      startsAt: (subscription.starts_at as string | null) ?? '',
      expiresAt: (subscription.expires_at as string | null) ?? '',
      paymentMethod: (subscription.payment_method as string | null) ?? '',
      paymentReference: (subscription.payment_reference as string | null) ?? '',
    })),
    participations: ((participationsResponse.data ??
      []) as PlayerParticipationHistoryRow[]).map((participation) => ({
      id: participation.participation_id as string,
      contestId: participation.contest_id ?? '',
      contestTitle: participation.contest_title ?? 'Concours',
      score: participation.score ?? 0,
      rank: participation.rank ?? null,
      completed: participation.completed ?? false,
      participatedAt: participation.participated_at ?? '',
    })),
    rewards: (winnersResponse.data ?? []).map((winner) => ({
      id: winner.id as string,
      contestTitle:
        contestTitles.get((winner.contest_id as string | null) ?? '') ?? 'Concours',
      prizeDescription: (winner.prize_description as string | null) ?? '',
      prizeValue: (winner.prize_value as number | null) ?? 0,
      status: (winner.status as string | null) ?? 'pending',
      createdAt: (winner.created_at as string | null) ?? '',
    })),
    badges: (userBadgesResponse.data ?? []).map((userBadge) => {
      const badge = badgesById.get((userBadge.badge_id as string | null) ?? '')
      return {
        id: userBadge.id as string,
        name: badge?.name ?? 'Badge',
        description: badge?.description ?? '',
        earnedAt: (userBadge.earned_at as string | null) ?? '',
      }
    }),
  }
}

async function fetchContestsData(): Promise<ContestsData> {
  const [
    contestsResponse,
    categoriesResponse,
    partnersResponse,
    typesResponse,
    participationsResponse,
  ] = await Promise.all([
      supabase
        .from('contests')
        .select(
          'id, partner_id, title, description, image_url, brand_logo_url, brand_name, type, category, category_id, status, prize_description, prize_value, winners_count, max_participants, starts_at, ends_at, is_boosted, created_at',
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('partners')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name', { ascending: true }),
      supabase
        .from('contest_types')
        .select('key, name, description')
        .eq('is_active', true)
        .order('order_index', { ascending: true }),
      supabase.from('participations').select('contest_id'),
    ])

  if (contestsResponse.error) throw contestsResponse.error
  if (categoriesResponse.error) throw categoriesResponse.error
  if (partnersResponse.error) throw partnersResponse.error
  if (typesResponse.error) throw typesResponse.error
  if (participationsResponse.error) throw participationsResponse.error

  const categories = (categoriesResponse.data ?? []).map((category) => ({
    id: category.id as string,
    name: (category.name as string | null) ?? 'Catégorie',
  }))
  const partners = (partnersResponse.data ?? []).map((partner) => ({
    id: partner.id as string,
    name: (partner.company_name as string | null) ?? 'Partenaire',
  }))
  const types = (typesResponse.data ?? []).map((type) => ({
    key: (type.key as string | null) ?? 'quiz',
    name: (type.name as string | null) ?? 'Quiz',
    description: (type.description as string | null) ?? '',
  }))
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const partnerNames = new Map(partners.map((partner) => [partner.id, partner.name]))
  const participationsByContest = new Map<string, number>()

  for (const participation of participationsResponse.data ?? []) {
    const contestId = participation.contest_id as string | null
    if (!contestId) continue
    participationsByContest.set(
      contestId,
      (participationsByContest.get(contestId) ?? 0) + 1,
    )
  }

  return {
    categories,
    partners,
    types,
    contests: (contestsResponse.data ?? []).map((contest) => {
      const id = contest.id as string
      const categoryId = contest.category_id as string | null
      const partnerId = contest.partner_id as string | null

      return {
        id,
        title: (contest.title as string | null) ?? 'Concours',
        description: (contest.description as string | null) ?? '',
        type: ((contest.type as string | null) ?? 'quiz') as ContestType,
        categoryId: categoryId ?? '',
        category:
          (categoryId ? categoryNames.get(categoryId) : null) ??
          (contest.category as string | null) ??
          'Sans catégorie',
        partnerId: partnerId ?? '',
        partner: (partnerId ? partnerNames.get(partnerId) : null) ?? 'MegaPromo',
        status: (contest.status as string | null) ?? 'draft',
        imageUrl: (contest.image_url as string | null) ?? '',
        brandLogoUrl: (contest.brand_logo_url as string | null) ?? '',
        brandName: (contest.brand_name as string | null) ?? '',
        prizeDescription: (contest.prize_description as string | null) ?? '',
        prizeValue: (contest.prize_value as number | null) ?? 0,
        winnersCount: (contest.winners_count as number | null) ?? 1,
        maxParticipants: (contest.max_participants as number | null) ?? null,
        startsAt: (contest.starts_at as string | null) ?? '',
        endsAt: (contest.ends_at as string | null) ?? '',
        isBoosted: (contest.is_boosted as boolean | null) ?? false,
        participants: participationsByContest.get(id) ?? 0,
      }
    }),
  }
}

async function fetchContestHistory(contest: ContestItem): Promise<ContestHistoryData> {
  const { data: participationsData, error: participationsError } = await supabase
    .from('participations')
    .select('id, user_id, score, answers, completed, participated_at')
    .eq('contest_id', contest.id)
    .order('participated_at', { ascending: false })
    .limit(500)

  if (participationsError) throw participationsError

  const userIds = Array.from(
    new Set(
      (participationsData ?? [])
        .map((participation) => participation.user_id as string | null)
        .filter(Boolean),
    ),
  ) as string[]
  const usersResponse =
    userIds.length > 0
      ? await supabase.from('users').select('id, username, phone').in('id', userIds)
      : { data: [], error: null }

  if (usersResponse.error) throw usersResponse.error

  const userLabels = new Map(
    (usersResponse.data ?? []).map((user) => [
      user.id as string,
      ((user.username as string | null) || (user.phone as string | null) || 'Joueur') as string,
    ]),
  )
  const rankedParticipations = [...(participationsData ?? [])].sort((first, second) => {
    const scoreDiff =
      ((second.score as number | null) ?? 0) - ((first.score as number | null) ?? 0)
    if (scoreDiff !== 0) return scoreDiff
    return (
      new Date((first.participated_at as string | null) ?? 0).getTime() -
      new Date((second.participated_at as string | null) ?? 0).getTime()
    )
  })
  const ranks = new Map<string, number>()
  rankedParticipations.forEach((participation, index) => {
    ranks.set(participation.id as string, index + 1)
  })

  return {
    contest,
    participations: (participationsData ?? []).map((participation) => {
      const userId = (participation.user_id as string | null) ?? ''
      const answers = participation.answers
      return {
        id: participation.id as string,
        userId,
        userLabel: userLabels.get(userId) ?? 'Joueur',
        score: (participation.score as number | null) ?? 0,
        rank: ranks.get(participation.id as string) ?? 0,
        completed: (participation.completed as boolean | null) ?? false,
        participatedAt: (participation.participated_at as string | null) ?? '',
        answers: formatParticipationAnswers(answers),
      }
    }),
  }
}

async function fetchContestGameData(contestId: string): Promise<ContestGameData> {
  const contest = await fetchContestById(contestId)
  const [questionsResponse, drawSettingsResponse, predictionSettingsResponse] =
    await Promise.all([
      supabase
        .from('questions')
        .select(
          'id, question_text, option_a, option_b, option_c, option_d, correct_answer, points, time_limit, order_index',
        )
        .eq('contest_id', contestId)
        .order('order_index', { ascending: true }),
      supabase
        .from('contest_draw_settings')
        .select(
          'standard_tickets, premium_tickets, confirmation_message, winner_announcement_at, rules',
        )
        .eq('contest_id', contestId)
        .maybeSingle(),
      supabase
        .from('contest_predictions')
        .select(
          'home_team, away_team, match_label, match_date, home_score, away_score, status, points_exact_score, points_correct_result',
        )
        .eq('contest_id', contestId)
        .maybeSingle(),
    ])

  if (questionsResponse.error) throw questionsResponse.error
  if (drawSettingsResponse.error) throw drawSettingsResponse.error
  if (predictionSettingsResponse.error) throw predictionSettingsResponse.error

  const drawSettings = drawSettingsResponse.data
  const predictionSettings = predictionSettingsResponse.data

  return {
    contest,
    questions: (questionsResponse.data ?? []).map((question) => ({
      id: question.id as string,
      questionText: (question.question_text as string | null) ?? '',
      optionA: (question.option_a as string | null) ?? '',
      optionB: (question.option_b as string | null) ?? '',
      optionC: (question.option_c as string | null) ?? '',
      optionD: (question.option_d as string | null) ?? '',
      correctAnswer: (question.correct_answer as string | null) ?? 'A',
      points: (question.points as number | null) ?? 10,
      timeLimit: (question.time_limit as number | null) ?? 30,
      orderIndex: (question.order_index as number | null) ?? 1,
    })),
    drawSettings: drawSettings
      ? {
          standardTickets: String(
            (drawSettings.standard_tickets as number | null) ?? 1,
          ),
          premiumTickets: String(
            (drawSettings.premium_tickets as number | null) ?? 2,
          ),
          confirmationMessage:
            (drawSettings.confirmation_message as string | null) ??
            'Tu participes ! Les gagnants seront annoncés bientôt.',
          winnerAnnouncementAt: drawSettings.winner_announcement_at
            ? isoToDatetimeLocalValue(drawSettings.winner_announcement_at as string)
            : '',
          rules: (drawSettings.rules as string | null) ?? '',
        }
      : createDefaultDrawSettings(),
    predictionSettings: predictionSettings
      ? {
          homeTeam: (predictionSettings.home_team as string | null) ?? '',
          awayTeam: (predictionSettings.away_team as string | null) ?? '',
          matchLabel: (predictionSettings.match_label as string | null) ?? '',
          matchDate: predictionSettings.match_date
            ? isoToDatetimeLocalValue(predictionSettings.match_date as string)
            : '',
          homeScore:
            predictionSettings.home_score === null ||
            predictionSettings.home_score === undefined
              ? ''
              : String(predictionSettings.home_score),
          awayScore:
            predictionSettings.away_score === null ||
            predictionSettings.away_score === undefined
              ? ''
              : String(predictionSettings.away_score),
          status: (predictionSettings.status as string | null) ?? 'open',
          pointsExactScore: String(
            (predictionSettings.points_exact_score as number | null) ?? 50,
          ),
          pointsCorrectResult: String(
            (predictionSettings.points_correct_result as number | null) ?? 20,
          ),
        }
      : createDefaultPredictionSettings(),
  }
}

async function fetchContestById(contestId: string): Promise<ContestItem> {
  const [contestResponse, participationsResponse] = await Promise.all([
    supabase
      .from('contests')
      .select(
        'id, partner_id, title, description, image_url, brand_logo_url, brand_name, type, category, category_id, status, prize_description, prize_value, winners_count, max_participants, starts_at, ends_at, is_boosted',
      )
      .eq('id', contestId)
      .single(),
    supabase
      .from('participations')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contestId),
  ])

  if (contestResponse.error) throw contestResponse.error
  if (participationsResponse.error) throw participationsResponse.error

  const contest = contestResponse.data
  return {
    id: contest.id as string,
    title: (contest.title as string | null) ?? 'Concours',
    description: (contest.description as string | null) ?? '',
    type: ((contest.type as string | null) ?? 'quiz') as ContestType,
    categoryId: (contest.category_id as string | null) ?? '',
    category: (contest.category as string | null) ?? 'Sans catégorie',
    partnerId: (contest.partner_id as string | null) ?? '',
    partner: 'MegaPromo',
      status: (contest.status as string | null) ?? 'draft',
      imageUrl: (contest.image_url as string | null) ?? '',
      brandLogoUrl: (contest.brand_logo_url as string | null) ?? '',
      brandName: (contest.brand_name as string | null) ?? '',
      prizeDescription: (contest.prize_description as string | null) ?? '',
    prizeValue: (contest.prize_value as number | null) ?? 0,
    winnersCount: (contest.winners_count as number | null) ?? 1,
    maxParticipants: (contest.max_participants as number | null) ?? null,
    startsAt: (contest.starts_at as string | null) ?? '',
    endsAt: (contest.ends_at as string | null) ?? '',
    isBoosted: (contest.is_boosted as boolean | null) ?? false,
    participants: participationsResponse.count ?? 0,
  }
}

function formatParticipationAnswers(answers: unknown) {
  if (answers === null || answers === undefined) return 'Aucune réponse'
  if (typeof answers === 'string') return answers || 'Aucune réponse'
  if (Array.isArray(answers)) {
    return answers.length > 0 ? `${answers.length} réponse(s)` : 'Aucune réponse'
  }
  if (typeof answers !== 'object') return String(answers)

  const data = answers as Record<string, unknown>
  const type = typeof data.type === 'string' ? data.type : ''
  const tickets = typeof data.tickets === 'number' ? data.tickets : null
  const ticketLabel =
    tickets === null ? '' : `${tickets} ticket${tickets > 1 ? 's' : ''}`

  if (type === 'pronostic') {
    const score =
      typeof data.score === 'string'
        ? data.score
        : typeof data.predicted_score === 'string'
          ? data.predicted_score
          : ''
    const teams =
      typeof data.match === 'string'
        ? data.match
        : typeof data.home_team === 'string' && typeof data.away_team === 'string'
          ? `${data.home_team} - ${data.away_team}`
          : ''
    return ['Pronostic', teams, score ? `Score: ${score}` : '', ticketLabel]
      .filter(Boolean)
      .join(' · ')
  }

  if (isDrawContestType(type)) {
    return ['Tirage', ticketLabel].filter(Boolean).join(' · ')
  }

  if (type === 'quiz') {
    const totalAnswers = Object.keys(data).filter((key) => key !== 'type').length
    return totalAnswers > 0 ? `Quiz · ${totalAnswers} réponse(s)` : 'Quiz'
  }

  const readableEntries = Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)

  return readableEntries.length > 0 ? readableEntries.join(' · ') : 'Aucune réponse'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function formatMoney(value: number | null) {
  if (!value) return '0 FCFA'
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

function isDrawContestType(type: string) {
  return ['tirage', 'raffle', 'draw'].includes(type.toLowerCase())
}

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function hasContestEnded(endsAt: string) {
  const endDate = new Date(endsAt)
  return !Number.isNaN(endDate.getTime()) && endDate <= new Date()
}

function formatUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const payload = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }
    return [payload.message, payload.details, payload.hint, payload.code]
      .filter((item) => typeof item === 'string' && item.length > 0)
      .join(' · ') || fallback
  }
  return typeof error === 'string' && error.length > 0 ? error : fallback
}

function createDefaultContestForm(): ContestFormState {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    title: '',
    description: '',
    type: '',
    categoryId: '',
    partnerId: '',
    imageUrl: '',
    brandLogoUrl: '',
    brandName: '',
    prizeDescription: '',
    prizeValue: '',
    winnersCount: '1',
    maxParticipants: '',
    startsAt: toDatetimeLocalValue(now),
    endsAt: toDatetimeLocalValue(tomorrow),
    status: 'draft',
    isBoosted: false,
  }
}

function createDefaultPartnerForm(): PartnerFormState {
  return {
    companyName: '',
    email: '',
    password: '',
    logoUrl: '',
    sector: '',
    phone: '',
    subscriptionPlan: 'free',
    subscriptionExpiresAt: '',
    isValidated: true,
    isActive: true,
  }
}

function createDefaultPartnerPlanForm(): PartnerPlanFormState {
  return {
    key: '',
    name: '',
    description: '',
    price: '0',
    durationDays: '30',
    maxContests: '',
    maxBoosts: '',
    canCreateQuiz: true,
    canCreatePronostic: false,
    canAccessStats: false,
    canBeFeatured: false,
    isActive: true,
    orderIndex: '1',
    benefitsText: '',
  }
}

function createDefaultPlayerPlanForm(): PlayerPlanFormState {
  return {
    key: '',
    name: '',
    description: '',
    price: '0',
    durationDays: '30',
    dailyParticipationLimit: '3',
    bonusTickets: '0',
    badgeMultiplier: '1',
    isActive: true,
    orderIndex: '1',
    benefitsText: '',
  }
}

function createDefaultWinnerForm(): WinnerFormState {
  return {
    userId: '',
    contestId: '',
    prizeDescription: '',
    prizeValue: '',
    paymentMethod: 'mobile_money',
    paymentNumber: '',
    status: 'pending',
    sentAt: '',
  }
}

function createDefaultQuestionForm(orderIndex = 1): QuizQuestionFormState {
  return {
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    points: '10',
    timeLimit: '30',
    orderIndex: String(orderIndex),
  }
}

function createDefaultDrawSettings(): DrawSettingsState {
  return {
    standardTickets: '1',
    premiumTickets: '2',
    confirmationMessage: 'Tu participes ! Les gagnants seront annoncés bientôt.',
    winnerAnnouncementAt: '',
    rules: '',
  }
}

function createDefaultPredictionSettings(): PredictionSettingsState {
  return {
    homeTeam: '',
    awayTeam: '',
    matchLabel: '',
    matchDate: '',
    homeScore: '',
    awayScore: '',
    status: 'open',
    pointsExactScore: '50',
    pointsCorrectResult: '20',
  }
}

function questionToForm(question: QuizQuestionItem): QuizQuestionFormState {
  return {
    questionText: question.questionText,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctAnswer: question.correctAnswer,
    points: String(question.points),
    timeLimit: String(question.timeLimit),
    orderIndex: String(question.orderIndex),
  }
}

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function isoToDatetimeLocalValue(value: string) {
  if (!value) return ''
  return toDatetimeLocalValue(new Date(value))
}

function contestToForm(contest: ContestItem): ContestFormState {
  return {
    title: contest.title,
    description: contest.description,
    type: contest.type,
    categoryId: contest.categoryId,
    partnerId: contest.partnerId,
    imageUrl: contest.imageUrl,
    brandLogoUrl: contest.brandLogoUrl,
    brandName: contest.brandName,
    prizeDescription: contest.prizeDescription,
    prizeValue: String(contest.prizeValue || ''),
    winnersCount: String(contest.winnersCount || 1),
    maxParticipants: contest.maxParticipants ? String(contest.maxParticipants) : '',
    startsAt: isoToDatetimeLocalValue(contest.startsAt),
    endsAt: isoToDatetimeLocalValue(contest.endsAt),
    status: contest.status as ContestStatus,
    isBoosted: contest.isBoosted,
  }
}

function partnerToForm(partner: PartnerItem): PartnerFormState {
  return {
    companyName: partner.companyName,
    email: partner.email,
    password: '',
    logoUrl: partner.logoUrl,
    sector: partner.sector,
    phone: partner.phone,
    subscriptionPlan: partner.subscriptionPlan || 'free',
    subscriptionExpiresAt: partner.subscriptionExpiresAt
      ? isoToDatetimeLocalValue(partner.subscriptionExpiresAt)
      : '',
    isValidated: partner.isValidated,
    isActive: partner.isActive,
  }
}

function partnerPlanToForm(plan: PartnerPlanItem): PartnerPlanFormState {
  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    price: String(plan.price),
    durationDays: String(plan.durationDays),
    maxContests: plan.maxContests === null ? '' : String(plan.maxContests),
    maxBoosts: plan.maxBoosts === null ? '' : String(plan.maxBoosts),
    canCreateQuiz: plan.canCreateQuiz,
    canCreatePronostic: plan.canCreatePronostic,
    canAccessStats: plan.canAccessStats,
    canBeFeatured: plan.canBeFeatured,
    isActive: plan.isActive,
    orderIndex: String(plan.orderIndex),
    benefitsText: plan.benefits.map((benefit) => benefit.label).join('\n'),
  }
}

function playerPlanToForm(plan: PlayerPlanItem): PlayerPlanFormState {
  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    price: String(plan.price),
    durationDays: String(plan.durationDays),
    dailyParticipationLimit: String(plan.dailyParticipationLimit),
    bonusTickets: String(plan.bonusTickets),
    badgeMultiplier: String(plan.badgeMultiplier),
    isActive: plan.isActive,
    orderIndex: String(plan.orderIndex),
    benefitsText: plan.benefits.join('\n'),
  }
}

function winnerToForm(winner: WinnerItem): WinnerFormState {
  return {
    userId: winner.userId,
    contestId: winner.contestId,
    prizeDescription: winner.prizeDescription,
    prizeValue: String(winner.prizeValue || ''),
    paymentMethod: winner.paymentMethod || 'mobile_money',
    paymentNumber: winner.paymentNumber,
    status: winner.status,
    sentAt: winner.sentAt ? isoToDatetimeLocalValue(winner.sentAt) : '',
  }
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={PARTNER_AUTH_ROUTE} replace />} />
      <Route path="/auth" element={<Navigate to={PARTNER_AUTH_ROUTE} replace />} />
      <Route path={PARTNER_AUTH_ROUTE} element={<AuthPage role="partner" />} />
      <Route
        path={SUPER_ADMIN_AUTH_ROUTE}
        element={<AuthPage role="super-admin" />}
      />
      <Route path={SUPER_ADMIN_ROUTE} element={<ProtectedSuperAdminRoute />} />
      <Route
        path={SUPER_ADMIN_CATEGORIES_ROUTE}
        element={<ProtectedSuperAdminRoute page="categories" />}
      />
      <Route
        path={SUPER_ADMIN_COUNTRIES_ROUTE}
        element={<ProtectedSuperAdminRoute page="countries" />}
      />
      <Route
        path={SUPER_ADMIN_SECTORS_ROUTE}
        element={<ProtectedSuperAdminRoute page="sectors" />}
      />
      <Route
        path={SUPER_ADMIN_CONTESTS_ROUTE}
        element={<ProtectedSuperAdminRoute page="contests" />}
      />
      <Route
        path={`${SUPER_ADMIN_CONTESTS_ROUTE}/:contestId/history`}
        element={<ProtectedSuperAdminRoute page="contest-history" />}
      />
      <Route
        path={`${SUPER_ADMIN_CONTESTS_ROUTE}/:contestId/game`}
        element={<ProtectedSuperAdminRoute page="contest-game" />}
      />
      <Route
        path={SUPER_ADMIN_PARTNERS_ROUTE}
        element={<ProtectedSuperAdminRoute page="partners" />}
      />
      <Route
        path={SUPER_ADMIN_PLANS_ROUTE}
        element={<ProtectedSuperAdminRoute page="plans" />}
      />
      <Route
        path={SUPER_ADMIN_WINNERS_ROUTE}
        element={<ProtectedSuperAdminRoute page="winners" />}
      />
      <Route
        path={SUPER_ADMIN_USERS_ROUTE}
        element={<ProtectedSuperAdminRoute page="users" />}
      />
      <Route
        path={SUPER_ADMIN_NOTIFICATIONS_ROUTE}
        element={<ProtectedSuperAdminRoute page="notifications" />}
      />
      <Route
        path={SUPER_ADMIN_SETTINGS_ROUTE}
        element={<ProtectedSuperAdminRoute page="settings" />}
      />
      <Route
        path={SUPER_ADMIN_MAINTENANCE_ROUTE}
        element={<ProtectedSuperAdminRoute page="maintenance" />}
      />
      <Route path="/partner" element={<PartnerPreview />} />
      <Route path="*" element={<Navigate to={PARTNER_AUTH_ROUTE} replace />} />
    </Routes>
  )
}

function AuthPage({ role }: { role: AuthRole }) {
  const navigate = useNavigate()
  const adminAuth = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedRole = roleContent[role]
  const canSubmit = useMemo(() => {
    return email.trim().includes('@') && password.trim().length >= 6
  }, [email, password])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!canSubmit) {
      setError('Entre un email valide et un mot de passe de 6 caractères minimum.')
      return
    }

    void (async () => {
      setIsLoading(true)
      try {
        if (role === 'super-admin') {
          await adminAuth.login(email.trim(), password)
        } else {
          await signInPartner(email.trim().toLowerCase(), password)
        }
        navigate(selectedRole.destination, { replace: true })
      } catch (error) {
        if (
          role === 'partner' &&
          error instanceof Error &&
          error.message.toLowerCase().includes('invalid login credentials')
        ) {
          setError(
            'Email ou mot de passe partenaire incorrect. Depuis le SA, clique sur "Envoyer accès" et définis un nouveau mot de passe.',
          )
          return
        }

        setError(
          error instanceof Error
            ? error.message
            : 'Impossible de vérifier ce compte.',
        )
      } finally {
        setIsLoading(false)
      }
    })()
  }

  if (role === 'super-admin' && adminAuth.status === 'authenticated') {
    return <Navigate to={SUPER_ADMIN_ROUTE} replace />
  }

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="brand auth-brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Web Console</small>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Plateforme web</p>
          <h1>Un accès sécurisé pour piloter MegaPromo.</h1>
          <p>
            Super admin et partenaires disposent d’un espace clair pour gérer les
            concours, les performances, les gains et les campagnes sponsorisées.
          </p>
        </div>

        <div className="auth-preview-card">
          <div className="preview-header">
            <span>Live control</span>
            <strong>99.8%</strong>
          </div>
          <div className="preview-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-grid">
            <div>
              <strong>18</strong>
              <span>concours</span>
            </div>
            <div>
              <strong>36</strong>
              <span>partenaires</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Connexion">
        <div className="auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow">Authentification</p>
              <h2>{selectedRole.title}</h2>
              <p>{selectedRole.subtitle}</p>
            </div>
          </div>

          <div className="auth-role-badge">
            <span>{selectedRole.label}</span>
            <small>
              {role === 'super-admin'
                ? 'Accès réservé et non public'
                : 'Espace marques partenaires'}
            </small>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email professionnel</span>
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={
                  role === 'super-admin'
                    ? 'admin@megapromo.ci'
                    : 'marque@entreprise.ci'
                }
                type="email"
                value={email}
              />
            </label>

            <label>
              <span>Mot de passe</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </label>

            <div className="auth-options">
              <label className="check-row">
                <input
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                <span>Garder la session</span>
              </label>
              <button type="button">Mot de passe oublié ?</button>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="submit-button" disabled={isLoading} type="submit">
              {isLoading ? 'Vérification...' : 'Se connecter'}
            </button>
          </form>

          <div className="security-note">
            <span />
            <p>{selectedRole.accessHint}</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function ProtectedSuperAdminRoute({
  page = 'dashboard',
}: {
  page?:
    | 'dashboard'
    | 'categories'
    | 'countries'
    | 'sectors'
    | 'contests'
    | 'contest-history'
    | 'contest-game'
    | 'partners'
    | 'plans'
    | 'winners'
    | 'users'
    | 'notifications'
    | 'settings'
    | 'maintenance'
}) {
  const adminAuth = useAdminAuth()

  if (adminAuth.status === 'loading') {
    return (
      <main className="auth-loading">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Vérification session</small>
          </div>
        </div>
      </main>
    )
  }

  if (adminAuth.status !== 'authenticated') {
    return <Navigate to={SUPER_ADMIN_AUTH_ROUTE} replace />
  }

  if (page === 'categories') return <SuperAdminCategoriesPage />
  if (page === 'countries') return <SuperAdminCountriesPage />
  if (page === 'sectors') return <SuperAdminPartnerSectorsPage />
  if (page === 'contests') return <SuperAdminContestsPage />
  if (page === 'contest-history') return <SuperAdminContestHistoryPage />
  if (page === 'contest-game') return <SuperAdminContestGamePage />
  if (page === 'partners') return <SuperAdminPartnersPage />
  if (page === 'plans') return <SuperAdminPlansPage />
  if (page === 'winners') return <SuperAdminWinnersPage />
  if (page === 'users') return <SuperAdminUsersPage />
  if (page === 'notifications') return <SuperAdminNotificationsPage />
  if (page === 'settings') return <SuperAdminSettingsPage />
  if (page === 'maintenance') return <SuperAdminMaintenancePage />
  return <SuperAdminDashboard />
}

function SuperAdminDashboard() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(emptyDashboardData)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')

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
    ],
    loadDashboard,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
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
            <button className="primary-button" type="button">
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

function SuperAdminCategoriesPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoryModalMode, setCategoryModalMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    color: '#6b7fff',
    description: '',
  })
  const [categoryError, setCategoryError] = useState('')
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true)
    setCategoriesError('')

    try {
      const nextCategories = await fetchCategoriesData()
      setCategories(nextCategories)
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les catégories.',
      )
    } finally {
      setIsCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void fetchCategoriesData()
      .then((nextCategories) => {
        if (isMounted) setCategories(nextCategories)
      })
      .catch((error) => {
        if (!isMounted) return
        setCategoriesError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les catégories.',
        )
      })
      .finally(() => {
        if (isMounted) setIsCategoriesLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openCreateCategory() {
    setCategoryError('')
    setSelectedCategoryId(null)
    setCategoryForm({ name: '', color: '#6b7fff', description: '' })
    setCategoryModalMode('create')
  }

  function openEditCategory(category: CategoryItem) {
    setCategoryError('')
    setSelectedCategoryId(category.id)
    setCategoryForm({
      name: category.name,
      color: category.color,
      description: category.description,
    })
    setCategoryModalMode('edit')
  }

  function closeCategoryModal() {
    if (isSavingCategory) return
    setCategoryModalMode(null)
    setSelectedCategoryId(null)
    setCategoryError('')
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCategoryError('')
    const name = categoryForm.name.trim()
    const description = categoryForm.description.trim()

    if (name.length < 2) {
      setCategoryError('Le nom doit contenir au moins 2 caractères.')
      return
    }

    const duplicate = categories.some((category) => {
      return (
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== selectedCategoryId
      )
    })

    if (duplicate) {
      setCategoryError('Une catégorie avec ce nom existe déjà.')
      return
    }

    setIsSavingCategory(true)

    try {
      const payload = {
        name,
        description,
        color: categoryForm.color,
      }

      if (categoryModalMode === 'edit' && selectedCategoryId) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', selectedCategoryId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert({
          ...payload,
          id: createClientUuid(),
          is_active: true,
        })

        if (error) throw error
      }

      await loadCategories()
      closeCategoryModal()
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer cette catégorie.',
      )
    } finally {
      setIsSavingCategory(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Catalogue</span>
          <strong>{categories.length} catégories</strong>
          <p>Organise les concours pour faciliter le pilotage et le filtrage mobile.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1>Catégories</h1>
            <p className="page-subtitle">
              Crée et maintiens les familles de concours utilisées dans MegaPromo.
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
              onClick={openCreateCategory}
              type="button"
            >
              Nouvelle catégorie
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {categoriesError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Catégories indisponibles</strong>
              <p>{categoriesError}</p>
            </div>
            <button onClick={loadCategories} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRUD</p>
              <h2>Liste des catégories</h2>
            </div>
            <span className="pill">
              {isCategoriesLoading ? 'Chargement' : `${categories.length} entrées`}
            </span>
          </div>

          <div className="category-table">
            {categories.length > 0 ? (
              categories.map((category) => (
                <article className="category-table-row" key={category.id}>
                  <span
                    className="category-color-dot"
                    style={{ background: category.color }}
                  />
                  <div>
                    <strong>{category.name}</strong>
                    <p>{category.description || 'Aucune description'}</p>
                  </div>
                  <small>{category.contests} concours</small>
                  <button onClick={() => openEditCategory(category)} type="button">
                    Modifier
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCategoriesLoading
                  ? 'Chargement des catégories...'
                  : 'Aucune catégorie créée pour le moment.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {categoryModalMode ? (
        <CategoryModal
          error={categoryError}
          form={categoryForm}
          isSaving={isSavingCategory}
          mode={categoryModalMode}
          onChange={setCategoryForm}
          onClose={closeCategoryModal}
          onSubmit={handleCategorySubmit}
        />
      ) : null}
    </main>
  )
}

function SuperAdminCountriesPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [isCountriesLoading, setIsCountriesLoading] = useState(true)
  const [countriesError, setCountriesError] = useState('')
  const [countryModalMode, setCountryModalMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [countryForm, setCountryForm] = useState<CountryFormState>({
    flag: 'orange-white-green',
    phoneDigits: '10',
    name: '',
    dialCode: '+225',
    isActive: true,
  })
  const [countryError, setCountryError] = useState('')
  const [isSavingCountry, setIsSavingCountry] = useState(false)

  const loadCountries = useCallback(async () => {
    setIsCountriesLoading(true)
    setCountriesError('')

    try {
      setCountries(await fetchCountriesData())
    } catch (error) {
      setCountriesError(
        error instanceof Error ? error.message : 'Impossible de charger les pays.',
      )
    } finally {
      setIsCountriesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCountries()
  }, [loadCountries])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openCreateCountry() {
    setCountryError('')
    setSelectedCountryId(null)
    setCountryForm({
      flag: 'orange-white-green',
      phoneDigits: '10',
      name: '',
      dialCode: '+225',
      isActive: true,
    })
    setCountryModalMode('create')
  }

  function openEditCountry(country: CountryItem) {
    setCountryError('')
    setSelectedCountryId(country.id)
    setCountryForm({
      flag: country.flag,
      phoneDigits: String(country.phoneDigits || ''),
      name: country.name,
      dialCode: country.dialCode,
      isActive: country.isActive,
    })
    setCountryModalMode('edit')
  }

  function closeCountryModal() {
    if (isSavingCountry) return
    setCountryModalMode(null)
    setSelectedCountryId(null)
    setCountryError('')
  }

  async function handleCountrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCountryError('')

    const name = countryForm.name.trim()
    const dialCode = countryForm.dialCode.trim()
    const phoneDigits = Number(countryForm.phoneDigits)

    if (name.length < 2) {
      setCountryError('Le nom du pays doit contenir au moins 2 caractères.')
      return
    }

    if (!dialCode.startsWith('+') || dialCode.length < 2) {
      setCountryError('L’indicatif doit commencer par +, exemple +225.')
      return
    }

    if (!Number.isInteger(phoneDigits) || phoneDigits < 4 || phoneDigits > 15) {
      setCountryError('Le nombre de chiffres doit être entre 4 et 15.')
      return
    }

    const duplicate = countries.some((country) => {
      return (
        (country.name.toLowerCase() === name.toLowerCase() ||
          country.dialCode === dialCode) &&
        country.id !== selectedCountryId
      )
    })

    if (duplicate) {
      setCountryError('Un pays avec ce nom ou cet indicatif existe déjà.')
      return
    }

    setIsSavingCountry(true)

    try {
      const payload = {
        flag: countryForm.flag.trim() || 'custom',
        phone_digits: phoneDigits,
        name,
        dial_code: dialCode,
        is_active: countryForm.isActive,
      }

      if (countryModalMode === 'edit' && selectedCountryId) {
        const { error } = await supabase
          .from('countries')
          .update(payload)
          .eq('id', selectedCountryId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('countries').insert({
          ...payload,
          id: createClientUuid(),
        })
        if (error) throw error
      }

      await loadCountries()
      closeCountryModal()
    } catch (error) {
      setCountryError(
        error instanceof Error ? error.message : 'Impossible d’enregistrer ce pays.',
      )
    } finally {
      setIsSavingCountry(false)
    }
  }

  async function handleToggleCountry(country: CountryItem) {
    const { error } = await supabase
      .from('countries')
      .update({ is_active: !country.isActive })
      .eq('id', country.id)

    if (error) {
      setCountriesError(error.message)
      return
    }

    await loadCountries()
  }

  async function handleDeleteCountry(country: CountryItem) {
    const confirmed = window.confirm(`Supprimer le pays "${country.name}" ?`)
    if (!confirmed) return

    const { error } = await supabase.from('countries').delete().eq('id', country.id)
    if (error) {
      setCountriesError(error.message)
      return
    }

    await loadCountries()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Territoires</span>
          <strong>{countries.length} pays</strong>
          <p>Contrôle les indicatifs et longueurs de numéros autorisés.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1>Pays</h1>
            <p className="page-subtitle">
              Manage les pays disponibles à l’inscription mobile.
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
            <button className="primary-button" onClick={openCreateCountry} type="button">
              Nouveau pays
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {countriesError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Pays indisponibles</strong>
              <p>{countriesError}</p>
            </div>
            <button onClick={loadCountries} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRUD</p>
              <h2>Liste des pays</h2>
            </div>
            <span className="pill">
              {isCountriesLoading ? 'Chargement' : `${countries.length} entrées`}
            </span>
          </div>

          <div className="category-table countries-table">
            {countries.length > 0 ? (
              countries.map((country) => (
                <article className="category-table-row country-table-row" key={country.id}>
                  <CountryFlagPreview flag={country.flag} />
                  <div>
                    <strong>{country.name}</strong>
                    <p>
                      {country.dialCode} · {country.phoneDigits} chiffres
                    </p>
                  </div>
                  <span className={`status-pill ${country.isActive ? 'active' : 'inactive'}`}>
                    {country.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="table-action-row">
                    <button onClick={() => openEditCountry(country)} type="button">
                      Modifier
                    </button>
                    <button onClick={() => handleToggleCountry(country)} type="button">
                      {country.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteCountry(country)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCountriesLoading ? 'Chargement des pays...' : 'Aucun pays créé.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {countryModalMode ? (
        <CountryModal
          error={countryError}
          form={countryForm}
          isSaving={isSavingCountry}
          mode={countryModalMode}
          onChange={setCountryForm}
          onClose={closeCountryModal}
          onSubmit={handleCountrySubmit}
        />
      ) : null}
    </main>
  )
}

function SuperAdminPartnerSectorsPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [sectors, setSectors] = useState<PartnerSectorItem[]>([])
  const [isSectorsLoading, setIsSectorsLoading] = useState(true)
  const [sectorsError, setSectorsError] = useState('')
  const [sectorModalMode, setSectorModalMode] = useState<'create' | 'edit' | null>(
    null,
  )
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null)
  const [sectorForm, setSectorForm] = useState<PartnerSectorFormState>({
    name: '',
    description: '',
    isActive: true,
    orderIndex: '0',
  })
  const [sectorError, setSectorError] = useState('')
  const [isSavingSector, setIsSavingSector] = useState(false)

  const loadSectors = useCallback(async () => {
    setIsSectorsLoading(true)
    setSectorsError('')

    try {
      setSectors(await fetchPartnerSectorsData())
    } catch (error) {
      setSectorsError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les secteurs.',
      )
    } finally {
      setIsSectorsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSectors()
  }, [loadSectors])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openCreateSector() {
    setSectorError('')
    setSelectedSectorId(null)
    setSectorForm({
      name: '',
      description: '',
      isActive: true,
      orderIndex: String(sectors.length + 1),
    })
    setSectorModalMode('create')
  }

  function openEditSector(sector: PartnerSectorItem) {
    setSectorError('')
    setSelectedSectorId(sector.id)
    setSectorForm({
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      orderIndex: String(sector.orderIndex),
    })
    setSectorModalMode('edit')
  }

  function closeSectorModal() {
    if (isSavingSector) return
    setSectorModalMode(null)
    setSelectedSectorId(null)
    setSectorError('')
  }

  async function handleSectorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSectorError('')

    const name = sectorForm.name.trim()
    const orderIndex = Number(sectorForm.orderIndex)

    if (name.length < 2) {
      setSectorError('Le nom du secteur doit contenir au moins 2 caractères.')
      return
    }

    if (!Number.isInteger(orderIndex)) {
      setSectorError('L’ordre doit être un nombre entier.')
      return
    }

    const duplicate = sectors.some(
      (sector) =>
        sector.name.toLowerCase() === name.toLowerCase() &&
        sector.id !== selectedSectorId,
    )

    if (duplicate) {
      setSectorError('Ce secteur existe déjà.')
      return
    }

    setIsSavingSector(true)

    try {
      const payload = {
        name,
        description: sectorForm.description.trim() || null,
        is_active: sectorForm.isActive,
        order_index: orderIndex,
      }

      if (sectorModalMode === 'edit' && selectedSectorId) {
        const { error } = await supabase
          .from('partner_sectors')
          .update(payload)
          .eq('id', selectedSectorId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('partner_sectors').insert({
          ...payload,
          id: createClientUuid(),
        })
        if (error) throw error
      }

      await loadSectors()
      closeSectorModal()
    } catch (error) {
      setSectorError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce secteur.',
      )
    } finally {
      setIsSavingSector(false)
    }
  }

  async function handleToggleSector(sector: PartnerSectorItem) {
    const { error } = await supabase
      .from('partner_sectors')
      .update({ is_active: !sector.isActive })
      .eq('id', sector.id)

    if (error) {
      setSectorsError(error.message)
      return
    }

    await loadSectors()
  }

  async function handleDeleteSector(sector: PartnerSectorItem) {
    const confirmed = window.confirm(`Supprimer le secteur "${sector.name}" ?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('partner_sectors')
      .delete()
      .eq('id', sector.id)
    if (error) {
      setSectorsError(error.message)
      return
    }

    await loadSectors()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Référentiel</span>
          <strong>{sectors.length} secteurs</strong>
          <p>Contrôle les secteurs sélectionnables pour les marques partenaires.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1>Secteurs partenaires</h1>
            <p className="page-subtitle">
              Manage le référentiel utilisé lors de la création des partenaires.
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
            <button className="primary-button" onClick={openCreateSector} type="button">
              Nouveau secteur
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {sectorsError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Secteurs indisponibles</strong>
              <p>{sectorsError}</p>
            </div>
            <button onClick={loadSectors} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRUD</p>
              <h2>Liste des secteurs</h2>
            </div>
            <span className="pill">
              {isSectorsLoading ? 'Chargement' : `${sectors.length} entrées`}
            </span>
          </div>

          <div className="category-table">
            {sectors.length > 0 ? (
              sectors.map((sector) => (
                <article className="category-table-row" key={sector.id}>
                  <span className="settings-module-icon">T</span>
                  <div>
                    <strong>{sector.name}</strong>
                    <p>{sector.description || 'Aucune description'}</p>
                  </div>
                  <small>Ordre {sector.orderIndex}</small>
                  <span className={`status-pill ${sector.isActive ? 'active' : 'inactive'}`}>
                    {sector.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="table-action-row">
                    <button onClick={() => openEditSector(sector)} type="button">
                      Modifier
                    </button>
                    <button onClick={() => handleToggleSector(sector)} type="button">
                      {sector.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteSector(sector)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isSectorsLoading
                  ? 'Chargement des secteurs...'
                  : 'Aucun secteur créé.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {sectorModalMode ? (
        <PartnerSectorModal
          error={sectorError}
          form={sectorForm}
          isSaving={isSavingSector}
          mode={sectorModalMode}
          onChange={setSectorForm}
          onClose={closeSectorModal}
          onSubmit={handleSectorSubmit}
        />
      ) : null}
    </main>
  )
}

function SuperAdminPartnersPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [partners, setPartners] = useState<PartnerItem[]>([])
  const [partnerSectors, setPartnerSectors] = useState<PartnerSectorItem[]>([])
  const [isPartnersLoading, setIsPartnersLoading] = useState(true)
  const [partnersError, setPartnersError] = useState('')
  const [partnersNotice, setPartnersNotice] = useState('')
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [accessPartner, setAccessPartner] = useState<PartnerItem | null>(null)
  const [accessForm, setAccessForm] = useState<PartnerAccessFormState>({
    password: '',
  })
  const [accessError, setAccessError] = useState('')
  const [isSendingAccess, setIsSendingAccess] = useState(false)
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null)
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(
    createDefaultPartnerForm,
  )
  const [partnerError, setPartnerError] = useState('')
  const [isSavingPartner, setIsSavingPartner] = useState(false)

  const loadPartners = useCallback(async () => {
    setIsPartnersLoading(true)
    setPartnersError('')

    try {
      const [nextPartners, nextSectors] = await Promise.all([
        fetchPartnersData(),
        fetchPartnerSectorsData(),
      ])
      setPartners(nextPartners)
      setPartnerSectors(nextSectors)
    } catch (error) {
      setPartnersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les partenaires.',
      )
    } finally {
      setIsPartnersLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void Promise.all([fetchPartnersData(), fetchPartnerSectorsData()])
      .then(([nextPartners, nextSectors]) => {
        if (!isMounted) return
        setPartners(nextPartners)
        setPartnerSectors(nextSectors)
      })
      .catch((error) => {
        if (!isMounted) return
        setPartnersError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les partenaires.',
        )
      })
      .finally(() => {
        if (isMounted) setIsPartnersLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openPartnerModal() {
    setPartnerError('')
    setEditingPartnerId(null)
    setPartnerForm(createDefaultPartnerForm())
    setIsPartnerModalOpen(true)
  }

  function openEditPartnerModal(partner: PartnerItem) {
    setPartnerError('')
    setEditingPartnerId(partner.id)
    setPartnerForm(partnerToForm(partner))
    setIsPartnerModalOpen(true)
  }

  function closePartnerModal() {
    if (isSavingPartner) return
    setPartnerError('')
    setEditingPartnerId(null)
    setIsPartnerModalOpen(false)
  }

  function openAccessModal(partner: PartnerItem) {
    setAccessPartner(partner)
    setAccessForm({ password: '' })
    setAccessError('')
    setPartnersError('')
    setPartnersNotice('')
  }

  function closeAccessModal() {
    if (isSendingAccess) return
    setAccessPartner(null)
    setAccessForm({ password: '' })
    setAccessError('')
  }

  async function handlePartnerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPartnerError('')
    setPartnersNotice('')

    const companyName = partnerForm.companyName.trim()
    const email = partnerForm.email.trim().toLowerCase()

    if (companyName.length < 2) {
      setPartnerError('Le nom de la marque doit contenir au moins 2 caractères.')
      return
    }

    if (!email.includes('@')) {
      setPartnerError('Entre un email valide.')
      return
    }

    if (!editingPartnerId && partnerForm.password.trim().length < 8) {
      setPartnerError('Le mot de passe partenaire doit contenir au moins 8 caractères.')
      return
    }

    setIsSavingPartner(true)

    try {
      const payload = {
        company_name: companyName,
        email,
        logo_url: partnerForm.logoUrl.trim() || null,
        sector: partnerForm.sector.trim() || null,
        phone: partnerForm.phone.trim() || null,
        subscription_plan: partnerForm.subscriptionPlan.trim() || null,
        subscription_expires_at: partnerForm.subscriptionExpiresAt
          ? new Date(partnerForm.subscriptionExpiresAt).toISOString()
          : null,
        is_validated: partnerForm.isValidated,
        is_active: partnerForm.isActive,
      }
      if (editingPartnerId) {
        const { error } = await supabase
          .from('partners')
          .update(payload)
          .eq('id', editingPartnerId)
        if (error) throw error
        setPartnersNotice(`Partenaire ${companyName} mis à jour.`)
      } else {
        const partnerId = createClientUuid()
        const { error } = await supabase.from('partners').insert({
          ...payload,
          id: partnerId,
          created_at: new Date().toISOString(),
        })

        if (error) throw error

        try {
          const accessResult = await sendPartnerAccessEmail({
            partnerId,
            companyName,
            email,
            password: partnerForm.password.trim(),
          })
          if (accessResult?.emailSent === false) {
            setPartnersNotice(
              `Partenaire ${companyName} créé. Le mot de passe a été appliqué, mais l’email n’a pas été envoyé : ${accessResult.emailError ?? 'erreur Resend'}.`,
            )
          } else {
            setPartnersNotice(
              `Partenaire ${companyName} créé. Les accès ont été envoyés à ${email}.`,
            )
          }
        } catch (emailError) {
          setPartnersError(
            formatUnknownError(
              emailError,
              `Partenaire ${companyName} créé, mais l’email d’accès n’a pas pu être envoyé.`,
            ),
          )
          setPartnersNotice(
            `Partenaire ${companyName} créé. Vérifie la configuration email puis renvoie les accès.`,
          )
        }
      }

      await loadPartners()
      closePartnerModal()
    } catch (error) {
      setPartnerError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce partenaire.',
      )
    } finally {
      setIsSavingPartner(false)
    }
  }

  async function handleValidatePartner(partner: PartnerItem) {
    const { error } = await supabase
      .from('partners')
      .update({ is_validated: !partner.isValidated })
      .eq('id', partner.id)

    if (error) {
      setPartnersError(error.message)
      return
    }

    await loadPartners()
  }

  async function handleTogglePartnerStatus(partner: PartnerItem) {
    const { error } = await supabase
      .from('partners')
      .update({ is_active: !partner.isActive })
      .eq('id', partner.id)

    if (error) {
      setPartnersError(error.message)
      return
    }

    await loadPartners()
  }

  async function handleSendPartnerAccess(partner: PartnerItem, password?: string) {
    setPartnersError('')
    setPartnersNotice('')

    try {
      const accessResult = await sendPartnerAccessEmail({
        partnerId: partner.id,
        userId: partner.userId || undefined,
        companyName: partner.companyName,
        email: partner.email,
        password,
      })
      if (accessResult?.emailSent === false) {
        setPartnersNotice(
          `Mot de passe appliqué pour ${partner.email}, mais l’email n’a pas été envoyé : ${accessResult.emailError ?? 'erreur Resend'}.`,
        )
      } else {
        setPartnersNotice(`Accès envoyés à ${partner.email}.`)
      }
      await loadPartners()
    } catch (error) {
      setPartnersError(
        formatUnknownError(
          error,
          'Impossible d’envoyer les accès partenaire.',
        ),
      )
    }
  }

  async function handleAccessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessPartner) return

    const password = accessForm.password.trim()
    setAccessError('')

    if (password.length < 8) {
      setAccessError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setIsSendingAccess(true)
    try {
      await handleSendPartnerAccess(accessPartner, password)
      closeAccessModal()
    } catch {
      // handleSendPartnerAccess affiche deja l'erreur principale.
    } finally {
      setIsSendingAccess(false)
    }
  }

  async function handleDeletePartner(partner: PartnerItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement le partenaire "${partner.companyName}" ?`,
    )
    if (!confirmed) return

    const { error } = await supabase.from('partners').delete().eq('id', partner.id)

    if (error) {
      setPartnersError(error.message)
      return
    }

    await loadPartners()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Partenaires</span>
          <strong>{partners.length} marques</strong>
          <p>Gère les marques, validations et abonnements partenaires.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Business</p>
            <h1>Partenaires</h1>
            <p className="page-subtitle">
              Crée, valide et administre les marques partenaires de MegaPromo.
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
            <button className="primary-button" onClick={openPartnerModal} type="button">
              Nouveau partenaire
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {partnersError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Partenaires indisponibles</strong>
              <p>{partnersError}</p>
            </div>
            <button onClick={loadPartners} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {partnersNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Partenaires</strong>
              <p>{partnersNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel partners-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRM</p>
              <h2>Liste des partenaires</h2>
            </div>
            <span className="pill">
              {isPartnersLoading ? 'Chargement' : `${partners.length} entrées`}
            </span>
          </div>

          <div className="partner-table">
            {partners.length > 0 ? (
              partners.map((partner) => (
                <article className="partner-table-row" key={partner.id}>
                  <div>
                    <strong>{partner.companyName}</strong>
                    <p>{partner.email}</p>
                  </div>
                  <span>{partner.sector || 'Secteur non défini'}</span>
                  <small>{partner.subscriptionPlan || 'free'}</small>
                  <span className={`status-pill ${partner.isValidated ? 'active' : 'pending'}`}>
                    {partner.isValidated ? 'Validé' : 'À valider'}
                  </span>
                  <span className={`status-pill ${partner.isActive ? 'active' : 'inactive'}`}>
                    {partner.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="contest-actions">
                    <button
                      className="table-action-button"
                      onClick={() => openEditPartnerModal(partner)}
                      type="button"
                    >
                      Modifier
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleValidatePartner(partner)}
                      type="button"
                    >
                      {partner.isValidated ? 'Dévalider' : 'Valider'}
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleTogglePartnerStatus(partner)}
                      type="button"
                    >
                      {partner.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => openAccessModal(partner)}
                      type="button"
                    >
                      Envoyer accès
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeletePartner(partner)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isPartnersLoading
                  ? 'Chargement des partenaires...'
                  : 'Aucun partenaire créé pour le moment.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {isPartnerModalOpen ? (
        <PartnerModal
          error={partnerError}
          form={partnerForm}
          isSaving={isSavingPartner}
          mode={editingPartnerId ? 'edit' : 'create'}
          onChange={setPartnerForm}
          onClose={closePartnerModal}
          onSubmit={handlePartnerSubmit}
          sectors={partnerSectors}
        />
      ) : null}

      {accessPartner ? (
        <PartnerAccessModal
          error={accessError}
          form={accessForm}
          isSaving={isSendingAccess}
          onChange={setAccessForm}
          onClose={closeAccessModal}
          onSubmit={handleAccessSubmit}
          partner={accessPartner}
        />
      ) : null}
    </main>
  )
}

function SuperAdminPlansPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [plansData, setPlansData] = useState<PartnerPlansData>({
    plans: [],
    subscriptions: [],
  })
  const [playerPlans, setPlayerPlans] = useState<PlayerPlanItem[]>([])
  const [plansScope, setPlansScope] = useState<'partners' | 'players'>('partners')
  const [isPlansLoading, setIsPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState<PartnerPlanFormState>(
    createDefaultPartnerPlanForm,
  )
  const [isPlayerPlanModalOpen, setIsPlayerPlanModalOpen] = useState(false)
  const [editingPlayerPlanId, setEditingPlayerPlanId] = useState<string | null>(null)
  const [playerPlanForm, setPlayerPlanForm] = useState<PlayerPlanFormState>(
    createDefaultPlayerPlanForm,
  )
  const [planError, setPlanError] = useState('')
  const [isSavingPlan, setIsSavingPlan] = useState(false)

  const loadPlans = useCallback(async () => {
    setIsPlansLoading(true)
    setPlansError('')

    try {
      const [nextPartnerPlans, nextPlayerPlans] = await Promise.all([
        fetchPartnerPlansData(),
        fetchPlayerPlansForAdmin(),
      ])
      setPlansData(nextPartnerPlans)
      setPlayerPlans(nextPlayerPlans)
    } catch (error) {
      setPlansError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les forfaits.',
      )
    } finally {
      setIsPlansLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void Promise.all([fetchPartnerPlansData(), fetchPlayerPlansForAdmin()])
      .then(([nextPlansData, nextPlayerPlans]) => {
        if (!isMounted) return
        setPlansData(nextPlansData)
        setPlayerPlans(nextPlayerPlans)
      })
      .catch((error) => {
        if (!isMounted) return
        setPlansError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les forfaits.',
        )
      })
      .finally(() => {
        if (isMounted) setIsPlansLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openPlanModal() {
    setPlanError('')
    setEditingPlanId(null)
    setPlanForm(createDefaultPartnerPlanForm())
    setIsPlanModalOpen(true)
  }

  function openPlayerPlanModal() {
    setPlanError('')
    setEditingPlayerPlanId(null)
    setPlayerPlanForm(createDefaultPlayerPlanForm())
    setIsPlayerPlanModalOpen(true)
  }

  function openEditPlanModal(plan: PartnerPlanItem) {
    setPlanError('')
    setEditingPlanId(plan.id)
    setPlanForm(partnerPlanToForm(plan))
    setIsPlanModalOpen(true)
  }

  function openEditPlayerPlanModal(plan: PlayerPlanItem) {
    setPlanError('')
    setEditingPlayerPlanId(plan.id)
    setPlayerPlanForm(playerPlanToForm(plan))
    setIsPlayerPlanModalOpen(true)
  }

  function closePlanModal() {
    if (isSavingPlan) return
    setPlanError('')
    setEditingPlanId(null)
    setIsPlanModalOpen(false)
  }

  function closePlayerPlanModal() {
    if (isSavingPlan) return
    setPlanError('')
    setEditingPlayerPlanId(null)
    setIsPlayerPlanModalOpen(false)
  }

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPlanError('')

    const key = planForm.key.trim().toLowerCase()
    const name = planForm.name.trim()
    const price = Number(planForm.price)
    const durationDays = Number(planForm.durationDays)
    const maxContests = planForm.maxContests ? Number(planForm.maxContests) : null
    const maxBoosts = planForm.maxBoosts ? Number(planForm.maxBoosts) : null

    if (!/^[a-z0-9_]+$/.test(key)) {
      setPlanError('La clé doit contenir uniquement lettres, chiffres ou underscore.')
      return
    }

    if (name.length < 2) {
      setPlanError('Le nom du forfait doit contenir au moins 2 caractères.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setPlanError('Le prix doit être supérieur ou égal à 0.')
      return
    }

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      setPlanError('La durée doit être supérieure à 0.')
      return
    }

    setIsSavingPlan(true)

    try {
      const payload = {
        key,
        name,
        description: planForm.description.trim() || null,
        price,
        duration_days: durationDays,
        max_contests: maxContests,
        max_boosts: maxBoosts,
        can_create_quiz: planForm.canCreateQuiz,
        can_create_pronostic: planForm.canCreatePronostic,
        can_access_stats: planForm.canAccessStats,
        can_be_featured: planForm.canBeFeatured,
        is_active: planForm.isActive,
        order_index: Number(planForm.orderIndex) || 0,
      }
      const planId = editingPlanId ?? createClientUuid()
      const { error } = editingPlanId
        ? await supabase.from('partner_plans').update(payload).eq('id', editingPlanId)
        : await supabase.from('partner_plans').insert({
            ...payload,
            id: planId,
            created_at: new Date().toISOString(),
          })

      if (error) throw error

      const benefits = planForm.benefitsText
        .split('\n')
        .map((label) => label.trim())
        .filter(Boolean)

      await supabase.from('partner_plan_benefits').delete().eq('plan_id', planId)

      if (benefits.length > 0) {
        const { error: benefitsError } = await supabase
          .from('partner_plan_benefits')
          .insert(
            benefits.map((label, index) => ({
              id: createClientUuid(),
              plan_id: planId,
              label,
              description: null,
              icon: null,
              order_index: index + 1,
              created_at: new Date().toISOString(),
            })),
          )

        if (benefitsError) throw benefitsError
      }

      await loadPlans()
      closePlanModal()
    } catch (error) {
      setPlanError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce forfait.',
      )
    } finally {
      setIsSavingPlan(false)
    }
  }

  async function handlePlayerPlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPlanError('')

    const key = playerPlanForm.key.trim().toLowerCase()
    const name = playerPlanForm.name.trim()
    const price = Number(playerPlanForm.price)
    const durationDays = Number(playerPlanForm.durationDays)
    const dailyParticipationLimit = Number(playerPlanForm.dailyParticipationLimit)
    const bonusTickets = Number(playerPlanForm.bonusTickets)
    const badgeMultiplier = Number(playerPlanForm.badgeMultiplier)

    if (!/^[a-z0-9_]+$/.test(key)) {
      setPlanError('La clé doit contenir uniquement lettres, chiffres ou underscore.')
      return
    }

    if (name.length < 2) {
      setPlanError('Le nom du forfait doit contenir au moins 2 caractères.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setPlanError('Le prix doit être supérieur ou égal à 0.')
      return
    }

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      setPlanError('La durée doit être supérieure à 0.')
      return
    }

    if (!Number.isFinite(dailyParticipationLimit) || dailyParticipationLimit < 1) {
      setPlanError('La limite journalière doit être au moins 1.')
      return
    }

    if (!Number.isFinite(bonusTickets) || bonusTickets < 0) {
      setPlanError('Les tickets bonus doivent être supérieurs ou égaux à 0.')
      return
    }

    if (!Number.isFinite(badgeMultiplier) || badgeMultiplier < 1) {
      setPlanError('Le multiplicateur badge doit être au moins 1.')
      return
    }

    setIsSavingPlan(true)

    try {
      const payload = {
        key,
        name,
        description: playerPlanForm.description.trim() || null,
        price,
        duration_days: durationDays,
        daily_participation_limit: dailyParticipationLimit,
        bonus_tickets: bonusTickets,
        badge_multiplier: badgeMultiplier,
        is_active: playerPlanForm.isActive,
        order_index: Number(playerPlanForm.orderIndex) || 0,
      }
      const planId = editingPlayerPlanId ?? createClientUuid()
      const { error } = editingPlayerPlanId
        ? await supabase.from('player_plans').update(payload).eq('id', editingPlayerPlanId)
        : await supabase.from('player_plans').insert({
            ...payload,
            id: planId,
            created_at: new Date().toISOString(),
          })

      if (error) throw error

      const benefits = playerPlanForm.benefitsText
        .split('\n')
        .map((label) => label.trim())
        .filter(Boolean)

      await supabase.from('player_plan_benefits').delete().eq('plan_id', planId)

      if (benefits.length > 0) {
        const { error: benefitsError } = await supabase
          .from('player_plan_benefits')
          .insert(
            benefits.map((label, index) => ({
              id: createClientUuid(),
              plan_id: planId,
              label,
              description: null,
              icon: null,
              order_index: index + 1,
              created_at: new Date().toISOString(),
            })),
          )

        if (benefitsError) throw benefitsError
      }

      await loadPlans()
      closePlayerPlanModal()
    } catch (error) {
      setPlanError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce forfait joueur.',
      )
    } finally {
      setIsSavingPlan(false)
    }
  }

  async function handleTogglePlan(plan: PartnerPlanItem) {
    const { error } = await supabase
      .from('partner_plans')
      .update({ is_active: !plan.isActive })
      .eq('id', plan.id)

    if (error) {
      setPlansError(error.message)
      return
    }

    await loadPlans()
  }

  async function handleTogglePlayerPlan(plan: PlayerPlanItem) {
    const { error } = await supabase
      .from('player_plans')
      .update({ is_active: !plan.isActive })
      .eq('id', plan.id)

    if (error) {
      setPlansError(error.message)
      return
    }

    await loadPlans()
  }

  async function handleDeletePlan(plan: PartnerPlanItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement le forfait "${plan.name}" ?`,
    )
    if (!confirmed) return

    const { error } = await supabase.from('partner_plans').delete().eq('id', plan.id)

    if (error) {
      setPlansError(error.message)
      return
    }

    await loadPlans()
  }

  async function handleDeletePlayerPlan(plan: PlayerPlanItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement le forfait joueur "${plan.name}" ?`,
    )
    if (!confirmed) return

    const { error } = await supabase.from('player_plans').delete().eq('id', plan.id)

    if (error) {
      setPlansError(error.message)
      return
    }

    await loadPlans()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Monétisation</span>
          <strong>{plansData.plans.length + playerPlans.length} forfaits</strong>
          <p>Gère les offres partenaires, joueurs, avantages et abonnements.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Monétisation</p>
            <h1>Forfaits</h1>
            <p className="page-subtitle">
              Administre les forfaits partenaires et joueurs, leurs avantages et les abonnements.
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
              onClick={plansScope === 'partners' ? openPlanModal : openPlayerPlanModal}
              type="button"
            >
              {plansScope === 'partners' ? 'Nouveau forfait' : 'Nouveau forfait joueur'}
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {plansError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Forfaits indisponibles</strong>
              <p>{plansError}</p>
            </div>
            <button onClick={loadPlans} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="plans-layout">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Plans</p>
                <h2>{plansScope === 'partners' ? 'Forfaits partenaires' : 'Forfaits joueurs'}</h2>
              </div>
              <span className="pill">
                {isPlansLoading
                  ? 'Chargement'
                  : plansScope === 'partners'
                    ? `${plansData.plans.length} offres`
                    : `${playerPlans.length} offres`}
              </span>
            </div>

            <div className="segmented-control">
              <button
                className={plansScope === 'partners' ? 'active' : ''}
                onClick={() => setPlansScope('partners')}
                type="button"
              >
                Partenaires
              </button>
              <button
                className={plansScope === 'players' ? 'active' : ''}
                onClick={() => setPlansScope('players')}
                type="button"
              >
                Joueurs
              </button>
            </div>

            <div className="plan-grid">
              {plansScope === 'partners' && plansData.plans.length > 0 ? (
                plansData.plans.map((plan) => (
                  <article className="plan-card" key={plan.id}>
                    <div className="plan-card-header">
                      <div>
                        <span>{plan.key}</span>
                        <strong>{plan.name}</strong>
                      </div>
                      <small>{formatMoney(plan.price)}</small>
                    </div>
                    <p>{plan.description || 'Aucune description'}</p>
                    <div className="plan-limits">
                      <span>{plan.durationDays} jours</span>
                      <span>
                        {plan.maxContests === null
                          ? 'Concours illimités'
                          : `${plan.maxContests} concours`}
                      </span>
                      <span>
                        {plan.maxBoosts === null
                          ? 'Boosts illimités'
                          : `${plan.maxBoosts} boosts`}
                      </span>
                    </div>
                    <ul>
                      {plan.benefits.slice(0, 5).map((benefit) => (
                        <li key={benefit.id}>{benefit.label}</li>
                      ))}
                    </ul>
                    <div className="contest-actions">
                      <button
                        className="table-action-button"
                        onClick={() => openEditPlanModal(plan)}
                        type="button"
                      >
                        Modifier
                      </button>
                      <button
                        className="table-action-button"
                        onClick={() => handleTogglePlan(plan)}
                        type="button"
                      >
                        {plan.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="table-action-button danger"
                        onClick={() => handleDeletePlan(plan)}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))
              ) : plansScope === 'players' && playerPlans.length > 0 ? (
                playerPlans.map((plan) => (
                  <article className="plan-card" key={plan.id}>
                    <div className="plan-card-header">
                      <div>
                        <span>{plan.key}</span>
                        <strong>{plan.name}</strong>
                      </div>
                      <small>{formatMoney(plan.price)}</small>
                    </div>
                    <p>{plan.description || 'Aucune description'}</p>
                    <div className="plan-limits">
                      <span>{plan.durationDays} jours</span>
                      <span>{plan.dailyParticipationLimit}/jour</span>
                      <span>+{plan.bonusTickets} tickets</span>
                      <span>x{plan.badgeMultiplier} badges</span>
                    </div>
                    <ul>
                      {plan.benefits.slice(0, 5).map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                    <div className="contest-actions">
                      <button
                        className="table-action-button"
                        onClick={() => openEditPlayerPlanModal(plan)}
                        type="button"
                      >
                        Modifier
                      </button>
                      <button
                        className="table-action-button"
                        onClick={() => handleTogglePlayerPlan(plan)}
                        type="button"
                      >
                        {plan.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="table-action-button danger"
                        onClick={() => handleDeletePlayerPlan(plan)}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-panel-text">
                  {isPlansLoading
                    ? 'Chargement des forfaits...'
                    : plansScope === 'partners'
                      ? 'Aucun forfait partenaire créé.'
                      : 'Aucun forfait joueur créé.'}
                </p>
              )}
            </div>
          </div>

          <aside className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Historique</p>
                <h2>Abonnements récents</h2>
              </div>
            </div>
            <div className="subscription-list">
              {plansData.subscriptions.length > 0 ? (
                plansData.subscriptions.map((subscription) => (
                  <article className="subscription-row" key={subscription.id}>
                    <div>
                      <strong>{subscription.partnerName}</strong>
                      <p>
                        {subscription.planName} · {formatMoney(subscription.amount)}
                      </p>
                    </div>
                    <span className={`status-pill ${subscription.status}`}>
                      {subscription.status}
                    </span>
                    <small>{formatDate(subscription.expiresAt)}</small>
                  </article>
                ))
              ) : (
                <p className="empty-panel-text">
                  {isPlansLoading
                    ? 'Chargement des abonnements...'
                    : 'Aucun abonnement enregistré.'}
                </p>
              )}
            </div>
          </aside>
        </section>
      </section>

      {isPlanModalOpen ? (
        <PartnerPlanModal
          error={planError}
          form={planForm}
          isSaving={isSavingPlan}
          mode={editingPlanId ? 'edit' : 'create'}
          onChange={setPlanForm}
          onClose={closePlanModal}
          onSubmit={handlePlanSubmit}
        />
      ) : null}

      {isPlayerPlanModalOpen ? (
        <PlayerPlanModal
          error={planError}
          form={playerPlanForm}
          isSaving={isSavingPlan}
          mode={editingPlayerPlanId ? 'edit' : 'create'}
          onChange={setPlayerPlanForm}
          onClose={closePlayerPlanModal}
          onSubmit={handlePlayerPlanSubmit}
        />
      ) : null}
    </main>
  )
}

function SuperAdminUsersPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const pageSize = 25
  const [playersData, setPlayersData] = useState<PlayersData>({
    users: [],
    plans: [],
    totalCount: 0,
  })
  const [playerDetail, setPlayerDetail] = useState<PlayerDetailData>({
    subscriptions: [],
    participations: [],
    rewards: [],
    badges: [],
  })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [usersSearch, setUsersSearch] = useState('')
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState('')
  const [usersPage, setUsersPage] = useState(0)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [isPlayerDetailLoading, setIsPlayerDetailLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [usersNotice, setUsersNotice] = useState('')

  const selectedUser = useMemo(() => {
    return playersData.users.find((user) => user.id === selectedUserId) ?? null
  }, [playersData.users, selectedUserId])
  const selectedParticipations = playerDetail.participations
  const selectedRewards = playerDetail.rewards
  const selectedBadges = playerDetail.badges
  const selectedSubscriptions = playerDetail.subscriptions
  const activeSubscription =
    selectedSubscriptions.find((subscription) => subscription.status === 'active') ??
    selectedSubscriptions[0] ??
    null
  const totalPages = Math.max(1, Math.ceil(playersData.totalCount / pageSize))

  const loadUsers = useCallback(async (nextPage = usersPage) => {
    setIsUsersLoading(true)
    setUsersError('')

    try {
      const nextPlayersData = await fetchPlayersData({
        page: nextPage,
        pageSize,
        search: debouncedUsersSearch,
      })
      setPlayersData(nextPlayersData)
      setSelectedUserId((currentUserId) => {
        if (currentUserId && nextPlayersData.users.some((user) => user.id === currentUserId)) {
          return currentUserId
        }
        return nextPlayersData.users[0]?.id ?? ''
      })
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les joueurs.',
      )
    } finally {
      setIsUsersLoading(false)
    }
  }, [debouncedUsersSearch, pageSize, usersPage])

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
    let isMounted = true

    void fetchPlayersData({
      page: usersPage,
      pageSize,
      search: debouncedUsersSearch,
    })
      .then((nextPlayersData) => {
        if (!isMounted) return
        setPlayersData(nextPlayersData)
        setSelectedUserId((currentUserId) => {
          if (currentUserId && nextPlayersData.users.some((user) => user.id === currentUserId)) {
            return currentUserId
          }
          return nextPlayersData.users[0]?.id ?? ''
        })
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
  }, [debouncedUsersSearch, pageSize, usersPage])

  useEffect(() => {
    if (!selectedUserId) return

    let isMounted = true
    void fetchPlayerDetailData(selectedUserId, playersData.plans)
      .then((nextDetail) => {
        if (isMounted) setPlayerDetail(nextDetail)
      })
      .catch((error) => {
        if (!isMounted) return
        setUsersError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger la fiche joueur.',
        )
      })
      .finally(() => {
        if (isMounted) setIsPlayerDetailLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [playersData.plans, selectedUserId])

  const refreshUsersRealtime = useCallback(async () => {
    await loadUsers()
    if (!selectedUserId) return

    try {
      setPlayerDetail(await fetchPlayerDetailData(selectedUserId, playersData.plans))
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger la fiche joueur.',
      )
    }
  }, [loadUsers, playersData.plans, selectedUserId])

  useRealtimeRefresh(
    'sa-users-realtime',
    ['users', 'participations', 'winners', 'player_subscriptions', 'user_badges'],
    refreshUsersRealtime,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
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

  async function handleAssignPlan() {
    setUsersError('')
    setUsersNotice('')

    if (!selectedUser) {
      setUsersError('Choisis un joueur.')
      return
    }

    const plan = playersData.plans.find((item) => item.id === selectedPlanId)
    if (!plan) {
      setUsersError('Choisis un forfait joueur.')
      return
    }

    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

    const { error: subscriptionError } = await supabase
      .from('player_subscriptions')
      .insert({
        id: createClientUuid(),
        user_id: selectedUser.id,
        plan_id: plan.id,
        amount: plan.price,
        status: 'active',
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method: 'manual_admin',
        payment_reference: `SA-${Date.now()}`,
        created_at: new Date().toISOString(),
      })

    if (subscriptionError) {
      setUsersError(subscriptionError.message)
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .update({
        is_premium: plan.key !== 'free',
        premium_expires_at: plan.key !== 'free' ? expiresAt.toISOString() : null,
      })
      .eq('id', selectedUser.id)

    if (userError) {
      setUsersError(userError.message)
      return
    }

    await loadUsers()
    setUsersNotice(`Forfait ${plan.name} attribué à ${selectedUser.username || selectedUser.phone}.`)
  }

  async function handleApproveSubscription(subscription: PlayerSubscriptionItem) {
    setUsersError('')
    setUsersNotice('')

    if (!selectedUser) {
      setUsersError('Choisis un joueur.')
      return
    }

    const plan = playersData.plans.find((item) => item.id === subscription.planId)
    if (!plan) {
      setUsersError('Forfait introuvable.')
      return
    }

    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

    const { error: subscriptionError } = await supabase
      .from('player_subscriptions')
      .update({
        status: 'active',
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', subscription.id)

    if (subscriptionError) {
      setUsersError(subscriptionError.message)
      return
    }

    const { error: userError } = await supabase
      .from('users')
      .update({
        is_premium: plan.key !== 'free',
        premium_expires_at: plan.key !== 'free' ? expiresAt.toISOString() : null,
      })
      .eq('id', selectedUser.id)

    if (userError) {
      setUsersError(userError.message)
      return
    }

    await loadUsers()
    setIsPlayerDetailLoading(true)
    try {
      setPlayerDetail(await fetchPlayerDetailData(selectedUser.id, playersData.plans))
    } finally {
      setIsPlayerDetailLoading(false)
    }
    setUsersNotice(
      `Abonnement ${plan.name} validé pour ${selectedUser.username || selectedUser.phone}.`,
    )
  }

  async function handleClearPlayerHistory(user: PlayerUserItem) {
    const confirmed = window.confirm(
      `Vider l’historique de jeux de "${user.username || user.phone}" ? Le joueur pourra participer de nouveau aux concours concernés.`,
    )
    if (!confirmed) return

    setUsersError('')
    setUsersNotice('')
    setIsPlayerDetailLoading(true)

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
      setPlayerDetail((currentDetail) => ({
        ...currentDetail,
        participations: [],
      }))
      setUsersNotice('Historique de jeux vidé. Le joueur peut rejouer.')
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : 'Impossible de vider l’historique du joueur.',
      )
    } finally {
      setIsPlayerDetailLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Joueurs</span>
          <strong>{formatNumber(playersData.totalCount)} comptes</strong>
          <p>Analyse les profils, abonnements, participations, gains et badges.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communauté</p>
            <h1>Joueurs</h1>
            <p className="page-subtitle">
              Vue complète des utilisateurs, forfaits premium, historiques et récompenses.
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

        <section className="players-layout">
          <div className="panel players-list-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Base joueurs</p>
                <h2>Liste des utilisateurs</h2>
              </div>
              <span className="pill">
                {isUsersLoading
                  ? 'Chargement'
                  : `${playersData.users.length} / ${formatNumber(playersData.totalCount)}`}
              </span>
            </div>

            <input
              className="search-input"
              onChange={(event) => setUsersSearch(event.target.value)}
              placeholder="Rechercher pseudo, téléphone, rôle..."
              value={usersSearch}
            />

            <div className="player-list">
              {playersData.users.length > 0 ? (
                playersData.users.map((user) => (
                    <button
                      className={`player-row ${selectedUserId === user.id ? 'selected' : ''}`}
                      key={user.id}
                      onClick={() => {
                        setIsPlayerDetailLoading(true)
                        setSelectedUserId(user.id)
                      }}
                      type="button"
                    >
                      <span className="player-avatar">
                        {(user.username || user.phone || 'J').slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{user.username || 'Pseudo non défini'}</strong>
                        <p>{user.phone || 'Téléphone non défini'}</p>
                      </div>
                      <small>{formatNumber(user.pointsTotal)} pts</small>
                      <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <p>
                        {user.isPremium ? 'Premium' : 'Standard'} · créé le {formatDate(user.createdAt)}
                      </p>
                    </button>
                  ))
              ) : (
                <p className="empty-panel-text">
                  {isUsersLoading ? 'Chargement des joueurs...' : 'Aucun joueur trouvé.'}
                </p>
              )}
            </div>

            <div className="pagination-row">
              <button
                className="table-action-button"
                disabled={usersPage === 0 || isUsersLoading}
                onClick={() => setUsersPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <span>
                Page {usersPage + 1} / {totalPages}
              </span>
              <button
                className="table-action-button"
                disabled={usersPage + 1 >= totalPages || isUsersLoading}
                onClick={() => setUsersPage((page) => page + 1)}
                type="button"
              >
                Suivant
              </button>
            </div>
          </div>

          <aside className="panel player-detail-panel">
            {selectedUser && !isPlayerDetailLoading ? (
              <>
                <div className="player-detail-header">
                  <span className="player-avatar large">
                    {(selectedUser.username || selectedUser.phone || 'J')
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <div>
                    <p className="eyebrow">Fiche joueur</p>
                    <h2>{selectedUser.username || 'Pseudo non défini'}</h2>
                    <p>{selectedUser.phone || 'Téléphone non défini'}</p>
                  </div>
                  <span className={`status-pill ${selectedUser.isPremium ? 'sent' : 'inactive'}`}>
                    {selectedUser.isPremium ? 'Premium' : 'Standard'}
                  </span>
                </div>

                <div className="player-metrics">
                  <div>
                    <span>Points</span>
                    <strong>{formatNumber(selectedUser.pointsTotal)}</strong>
                  </div>
                  <div>
                    <span>Aujourd’hui</span>
                    <strong>{selectedUser.participationsToday}</strong>
                  </div>
                  <div>
                    <span>Gains</span>
                    <strong>{selectedRewards.length}</strong>
                  </div>
                </div>

                <div className="contest-actions player-actions">
                  <button
                    className="table-action-button"
                    onClick={() => handleToggleUserStatus(selectedUser)}
                    type="button"
                  >
                    {selectedUser.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    className="table-action-button"
                    onClick={() => handleTogglePremium(selectedUser)}
                    type="button"
                  >
                    {selectedUser.isPremium ? 'Retirer premium' : 'Activer premium'}
                  </button>
                  <button
                    className="table-action-button danger"
                    disabled={selectedParticipations.length === 0}
                    onClick={() => handleClearPlayerHistory(selectedUser)}
                    type="button"
                  >
                    Vider historique
                  </button>
                </div>

                <div className="player-subscription-box">
                  <div>
                    <span>Abonnement actuel</span>
                    <strong>{activeSubscription?.planName ?? 'Aucun forfait actif'}</strong>
                    <p>
                      {activeSubscription
                        ? `Expire le ${formatDate(activeSubscription.expiresAt)}`
                        : 'Attribue un forfait pour activer les avantages.'}
                    </p>
                  </div>
                  <div className="subscription-assign-row">
                    <select
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      value={selectedPlanId}
                    >
                      <option value="">Choisir un forfait</option>
                      {playersData.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {formatMoney(plan.price)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="inline-action-button"
                      onClick={handleAssignPlan}
                      type="button"
                    >
                      Attribuer
                    </button>
                  </div>
                </div>

                <div className="player-sections">
                  <section>
                    <div className="section-inline-heading">
                      <h3>Historique concours</h3>
                      <button
                        className="table-action-button danger"
                        disabled={selectedParticipations.length === 0}
                        onClick={() => handleClearPlayerHistory(selectedUser)}
                        type="button"
                      >
                        Vider l’historique de jeux
                      </button>
                    </div>
                    <div className="compact-list">
                      {selectedParticipations.slice(0, 6).map((participation) => (
                        <article key={participation.id}>
                          <div>
                            <strong>{participation.contestTitle}</strong>
                            <p>{formatDate(participation.participatedAt)}</p>
                          </div>
                          <span>
                            #{participation.rank ?? '-'} · {participation.score} pts
                          </span>
                        </article>
                      ))}
                      {selectedParticipations.length === 0 ? (
                        <p className="empty-panel-text">Aucune participation.</p>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <h3>Gains</h3>
                    <div className="compact-list">
                      {selectedRewards.slice(0, 5).map((reward) => (
                        <article key={reward.id}>
                          <div>
                            <strong>{reward.contestTitle}</strong>
                            <p>{reward.prizeDescription || 'Gain MegaPromo'}</p>
                          </div>
                          <span>{formatMoney(reward.prizeValue)}</span>
                        </article>
                      ))}
                      {selectedRewards.length === 0 ? (
                        <p className="empty-panel-text">Aucun gain enregistré.</p>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <h3>Badges</h3>
                    <div className="badge-list">
                      {selectedBadges.length > 0 ? (
                        selectedBadges.map((badge) => (
                          <span key={badge.id}>{badge.name}</span>
                        ))
                      ) : (
                        <p className="empty-panel-text">Aucun badge obtenu.</p>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3>Abonnements</h3>
                    <div className="compact-list">
                      {selectedSubscriptions.slice(0, 5).map((subscription) => (
                        <article key={subscription.id}>
                          <div>
                            <strong>{subscription.planName}</strong>
                            <p>
                              {subscription.paymentMethod || 'Paiement'} ·{' '}
                              {subscription.paymentReference || 'Référence non définie'}
                            </p>
                          </div>
                          <div className="table-actions compact">
                            <span className={`status-pill ${subscription.status}`}>
                              {subscription.status}
                            </span>
                            {subscription.status === 'pending' ? (
                              <button
                                className="table-action-button"
                                onClick={() => handleApproveSubscription(subscription)}
                                type="button"
                              >
                                Valider
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                      {selectedSubscriptions.length === 0 ? (
                        <p className="empty-panel-text">Aucun abonnement.</p>
                      ) : null}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <p className="empty-panel-text">
                {isUsersLoading || isPlayerDetailLoading
                  ? 'Chargement de la fiche joueur...'
                  : 'Sélectionne un joueur.'}
              </p>
            )}
          </aside>
        </section>
      </section>
    </main>
  )
}

function SuperAdminSettingsPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const adminEmail = adminAuth.user?.email ?? 'Email non défini'
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '')
  const hasAnonKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
  const [notice, setNotice] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [profileForm, setProfileForm] = useState({
    username: adminAuth.profile?.username ?? '',
    email: adminAuth.user?.email ?? '',
    avatarUrl: adminAuth.profile?.avatar_url ?? '',
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    setProfileForm({
      username: adminAuth.profile?.username ?? '',
      email: adminAuth.user?.email ?? '',
      avatarUrl: adminAuth.profile?.avatar_url ?? '',
    })
  }, [adminAuth.profile, adminAuth.user?.email])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function copyValue(value: string, message: string) {
    setNotice('')
    if (!value) {
      setNotice('Valeur indisponible.')
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setNotice(message)
    } catch {
      setNotice(value)
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentUser = adminAuth.user
    if (!currentUser) return

    const nextUsername = profileForm.username.trim()
    const nextEmail = profileForm.email.trim()
    const nextAvatarUrl = profileForm.avatarUrl.trim()

    setNotice('')
    setSettingsError('')

    if (!nextEmail.includes('@')) {
      setSettingsError('Email invalide.')
      return
    }

    setIsProfileSaving(true)
    try {
      if (nextEmail !== currentUser.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: nextEmail,
        })
        if (authError) throw authError
      }

      const { error: profileError } = await supabase
        .from('users')
        .update({
          username: nextUsername || null,
          avatar_url: nextAvatarUrl || null,
        })
        .eq('id', currentUser.id)

      if (profileError) throw profileError

      await adminAuth.refresh()
      setNotice(
        nextEmail !== currentUser.email
          ? 'Profil mis à jour. Supabase peut demander une confirmation email avant changement définitif.'
          : 'Profil administrateur mis à jour.',
      )
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour le profil.'),
      )
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const password = passwordForm.password.trim()
    const confirmPassword = passwordForm.confirmPassword.trim()

    if (password.length < 8) {
      setSettingsError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setSettingsError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setIsPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setPasswordForm({ password: '', confirmPassword: '' })
      setNotice('Mot de passe administrateur mis à jour.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour le mot de passe.'),
      )
    } finally {
      setIsPasswordSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Configuration</span>
          <strong>Console SA</strong>
          <p>Contrôle session, accès, variables et actions sensibles.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Système</p>
            <h1>Paramètres</h1>
            <p className="page-subtitle">
              Paramètres opérationnels du Super Admin et état de configuration.
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

        {notice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Paramètres</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        {settingsError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Paramètres refusés</strong>
              <p>{settingsError}</p>
            </div>
          </div>
        ) : null}

        <section className="dashboard-grid">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Compte</p>
                <h2>Profil administrateur</h2>
              </div>
              <span className="status-pill active">Actif</span>
            </div>
            <div className="player-detail-header">
              <span className="player-avatar large">
                {adminName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{adminName}</strong>
                <p>{adminEmail}</p>
              </div>
            </div>
            <div className="contest-actions">
              <button
                className="table-action-button"
                onClick={() => copyValue(adminEmail, 'Email admin copié.')}
                type="button"
              >
                Copier email
              </button>
              <button className="table-action-button danger" onClick={handleLogout} type="button">
                Fermer session
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Identité</p>
                <h2>Modifier mon profil</h2>
              </div>
            </div>
            <form className="category-form" onSubmit={handleUpdateProfile}>
              <label>
                <span>Nom affiché</span>
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Nom Super Admin"
                  value={profileForm.username}
                />
              </label>
              <label>
                <span>Email de connexion</span>
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="admin@megapromo.ci"
                  type="email"
                  value={profileForm.email}
                />
              </label>
              <label>
                <span>Avatar URL</span>
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      avatarUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  value={profileForm.avatarUrl}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  disabled={isProfileSaving}
                  type="button"
                  onClick={() =>
                    setProfileForm({
                      username: adminAuth.profile?.username ?? '',
                      email: adminAuth.user?.email ?? '',
                      avatarUrl: adminAuth.profile?.avatar_url ?? '',
                    })
                  }
                >
                  Réinitialiser
                </button>
                <button
                  className="inline-action-button"
                  disabled={isProfileSaving}
                  type="submit"
                >
                  {isProfileSaving ? 'Mise à jour...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Sécurité</p>
                <h2>Changer le mot de passe</h2>
              </div>
              <span className="status-pill pending">Sensible</span>
            </div>
            <form className="category-form" onSubmit={handleUpdatePassword}>
              <label>
                <span>Nouveau mot de passe</span>
                <input
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="8 caractères minimum"
                  type="password"
                  value={passwordForm.password}
                />
              </label>
              <label>
                <span>Confirmer le mot de passe</span>
                <input
                  autoComplete="new-password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Répéter le mot de passe"
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="inline-action-button"
                  disabled={isPasswordSaving}
                  type="submit"
                >
                  {isPasswordSaving ? 'Mise à jour...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Environnement</p>
                <h2>Supabase</h2>
              </div>
              <span className={`status-pill ${supabaseUrl && hasAnonKey ? 'active' : 'pending'}`}>
                {supabaseUrl && hasAnonKey ? 'Configuré' : 'Incomplet'}
              </span>
            </div>
            <div className="compact-list">
              <article>
                <div>
                  <strong>URL projet</strong>
                  <p>{supabaseUrl || 'VITE_SUPABASE_URL manquant'}</p>
                </div>
                <button
                  className="table-action-button"
                  onClick={() => copyValue(supabaseUrl, 'URL Supabase copiée.')}
                  type="button"
                >
                  Copier
                </button>
              </article>
              <article>
                <div>
                  <strong>Anon key</strong>
                  <p>{hasAnonKey ? 'Présente dans .env' : 'VITE_SUPABASE_ANON_KEY manquant'}</p>
                </div>
                <span className={`status-pill ${hasAnonKey ? 'active' : 'pending'}`}>
                  {hasAnonKey ? 'OK' : 'Manquant'}
                </span>
              </article>
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Sécurité</p>
                <h2>Accès Super Admin</h2>
              </div>
            </div>
            <div className="compact-list">
              <article>
                <div>
                  <strong>Route de connexion</strong>
                  <p>{SUPER_ADMIN_AUTH_ROUTE}</p>
                </div>
                <button
                  className="table-action-button"
                  onClick={() =>
                    copyValue(SUPER_ADMIN_AUTH_ROUTE, 'Route SA copiée.')
                  }
                  type="button"
                >
                  Copier
                </button>
              </article>
              <article>
                <div>
                  <strong>Rôle requis</strong>
                  <p>users.role = admin et is_active = true</p>
                </div>
                <span className="status-pill active">RLS</span>
              </article>
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Modules</p>
                <h2>Configuration fonctionnelle</h2>
              </div>
            </div>
            <div className="settings-module-grid">
              <button
                className="settings-module-card"
                onClick={() => navigate(SUPER_ADMIN_PLANS_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">F</span>
                <span className="settings-module-content">
                  <strong>Forfaits</strong>
                  <small>Plans joueurs et partenaires</small>
                </span>
                <span className="status-pill active">Actif</span>
              </button>
              <button
                className="settings-module-card"
                onClick={() => navigate(SUPER_ADMIN_NOTIFICATIONS_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">N</span>
                <span className="settings-module-content">
                  <strong>Notifications</strong>
                  <small>Push groupé ou individuel</small>
                </span>
                <span className="status-pill pending">FCM</span>
              </button>
              <button
                className="settings-module-card"
                onClick={() => navigate(SUPER_ADMIN_COUNTRIES_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">P</span>
                <span className="settings-module-content">
                  <strong>Pays</strong>
                  <small>Indicatifs, drapeaux et statuts</small>
                </span>
                <span className="status-pill active">OK</span>
              </button>
              <button
                className="settings-module-card"
                onClick={() => navigate(SUPER_ADMIN_SECTORS_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">T</span>
                <span className="settings-module-content">
                  <strong>Secteurs</strong>
                  <small>Référentiel partenaires</small>
                </span>
                <span className="status-pill active">OK</span>
              </button>
              <button
                className="settings-module-card"
                onClick={() => navigate(SUPER_ADMIN_CATEGORIES_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">C</span>
                <span className="settings-module-content">
                  <strong>Catégories</strong>
                  <small>Segments et couleurs concours</small>
                </span>
                <span className="status-pill active">OK</span>
              </button>
              <button
                className="settings-module-card danger"
                onClick={() => navigate(SUPER_ADMIN_MAINTENANCE_ROUTE)}
                type="button"
              >
                <span className="settings-module-icon">M</span>
                <span className="settings-module-content">
                  <strong>Maintenance</strong>
                  <small>Nettoyage avant production</small>
                </span>
                <span className="status-pill cancelled">Sensible</span>
              </button>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}

function SuperAdminMaintenancePage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [confirmation, setConfirmation] = useState('')
  const [activeScope, setActiveScope] = useState<MaintenanceScope | null>(null)
  const [pendingAction, setPendingAction] = useState<MaintenanceAction | null>(
    null,
  )
  const [maintenanceError, setMaintenanceError] = useState('')
  const [maintenanceNotice, setMaintenanceNotice] = useState('')

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function handleRunMaintenance(action: MaintenanceAction) {
    setMaintenanceError('')
    setMaintenanceNotice('')
    setActiveScope(action.scope)
    try {
      const { data, error } = await supabase.rpc('admin_maintenance_clear', {
        p_scope: action.scope,
        p_confirmation: confirmation,
      })

      if (error) throw error

      const result = data as { deleted?: number; message?: string } | null
      setMaintenanceNotice(
        `${result?.message ?? 'Maintenance appliquée.'} Lignes impactées : ${
          result?.deleted ?? 0
        }.`,
      )
      setConfirmation('')
      setPendingAction(null)
    } catch (error) {
      setMaintenanceError(
        formatUnknownError(
          error,
          'Impossible d’exécuter cette action de maintenance.',
        ),
      )
      setConfirmation('')
      setPendingAction(null)
    } finally {
      setActiveScope(null)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card danger">
          <span>Production</span>
          <strong>Nettoyage</strong>
          <p>Vide uniquement les données de test, jamais les configurations de base.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Système</p>
            <h1>Maintenance production</h1>
            <p className="page-subtitle">
              Actions sensibles pour nettoyer les données de test avant lancement.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(SUPER_ADMIN_SETTINGS_ROUTE)}
              type="button"
            >
              Paramètres
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

        {maintenanceError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Maintenance refusée</strong>
              <p>{maintenanceError}</p>
            </div>
          </div>
        ) : null}

        {maintenanceNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Maintenance appliquée</strong>
              <p>{maintenanceNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel maintenance-guard-panel">
          <div>
            <p className="eyebrow">Confirmation forte</p>
            <h2>Sélectionne une action pour confirmer</h2>
            <p>
              Les actions ci-dessous sont irréversibles. Une confirmation dédiée
              sera demandée avant chaque nettoyage.
            </p>
          </div>
          <span className="status-pill cancelled">Zone sensible</span>
        </section>

        <section className="maintenance-grid">
          {maintenanceActions.map((action) => {
            const isRunning = activeScope === action.scope
            const canRun = !activeScope

            return (
              <article
                className={`panel maintenance-card ${action.danger === 'high' ? 'high' : ''}`}
                key={action.scope}
              >
                <div className="maintenance-card-header">
                  <span className="maintenance-icon">
                    {action.danger === 'high' ? '!' : 'M'}
                  </span>
                  <span className={`status-pill ${action.danger === 'high' ? 'cancelled' : 'pending'}`}>
                    {action.danger === 'high' ? 'Très sensible' : 'Sensible'}
                  </span>
                </div>
                <h2>{action.title}</h2>
                <p>{action.description}</p>
                <small>{action.keeps}</small>
                <button
                  className={`table-action-button ${
                    action.danger === 'high' ? 'danger' : ''
                  }`}
                  disabled={!canRun}
                  onClick={() => {
                    setConfirmation('')
                    setMaintenanceError('')
                    setMaintenanceNotice('')
                    setPendingAction(action)
                  }}
                  type="button"
                >
                  {isRunning ? 'Nettoyage...' : 'Préparer'}
                </button>
              </article>
            )
          })}
        </section>
      </section>

      {pendingAction ? (
        <MaintenanceConfirmModal
          action={pendingAction}
          confirmation={confirmation}
          isRunning={activeScope === pendingAction.scope}
          onChangeConfirmation={setConfirmation}
          onClose={() => {
            if (activeScope) return
            setPendingAction(null)
            setConfirmation('')
          }}
          onConfirm={() => handleRunMaintenance(pendingAction)}
        />
      ) : null}
    </main>
  )
}

function MaintenanceConfirmModal({
  action,
  confirmation,
  isRunning,
  onChangeConfirmation,
  onClose,
  onConfirm,
}: {
  action: MaintenanceAction
  confirmation: string
  isRunning: boolean
  onChangeConfirmation: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const canConfirm = confirmation === 'CONFIRMER' && !isRunning

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="category-modal maintenance-confirm-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Confirmation maintenance</p>
            <h2>{action.title}</h2>
          </div>
          <button disabled={isRunning} onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        <div className="maintenance-confirm-body">
          <span className={`status-pill ${action.danger === 'high' ? 'cancelled' : 'pending'}`}>
            {action.danger === 'high' ? 'Action très sensible' : 'Action sensible'}
          </span>
          <p>{action.description}</p>
          <small>{action.keeps}</small>
          <div className="maintenance-confirm-code">
            <strong>Écris CONFIRMER pour exécuter</strong>
            <input
              autoFocus
              onChange={(event) => onChangeConfirmation(event.target.value)}
              placeholder="CONFIRMER"
              value={confirmation}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button disabled={isRunning} onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {isRunning ? 'Nettoyage...' : 'Exécuter le nettoyage'}
          </button>
        </div>
      </section>
    </div>
  )
}

function SuperAdminWinnersPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [winnersData, setWinnersData] = useState<WinnersData>({
    winners: [],
    users: [],
    contests: [],
  })
  const [isWinnersLoading, setIsWinnersLoading] = useState(true)
  const [winnersError, setWinnersError] = useState('')
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false)
  const [editingWinnerId, setEditingWinnerId] = useState<string | null>(null)
  const [winnerForm, setWinnerForm] = useState<WinnerFormState>(
    createDefaultWinnerForm,
  )
  const [winnerError, setWinnerError] = useState('')
  const [isSavingWinner, setIsSavingWinner] = useState(false)

  const loadWinners = useCallback(async () => {
    setIsWinnersLoading(true)
    setWinnersError('')

    try {
      setWinnersData(await fetchWinnersData())
    } catch (error) {
      setWinnersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les gagnants.',
      )
    } finally {
      setIsWinnersLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void fetchWinnersData()
      .then((nextWinnersData) => {
        if (isMounted) setWinnersData(nextWinnersData)
      })
      .catch((error) => {
        if (!isMounted) return
        setWinnersError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les gagnants.',
        )
      })
      .finally(() => {
        if (isMounted) setIsWinnersLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useRealtimeRefresh(
    'sa-winners-realtime',
    ['winners', 'users', 'contests'],
    loadWinners,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openWinnerModal() {
    setWinnerError('')
    setEditingWinnerId(null)
    setWinnerForm(createDefaultWinnerForm())
    setIsWinnerModalOpen(true)
  }

  function openEditWinnerModal(winner: WinnerItem) {
    setWinnerError('')
    setEditingWinnerId(winner.id)
    setWinnerForm(winnerToForm(winner))
    setIsWinnerModalOpen(true)
  }

  function closeWinnerModal() {
    if (isSavingWinner) return
    setWinnerError('')
    setEditingWinnerId(null)
    setIsWinnerModalOpen(false)
  }

  function handleWinnerContestChange(contestId: string) {
    const contest = winnersData.contests.find((item) => item.id === contestId)
    setWinnerForm({
      ...winnerForm,
      contestId,
      prizeValue: contest?.prizeValue ? String(contest.prizeValue) : winnerForm.prizeValue,
      prizeDescription: contest?.prizeDescription || winnerForm.prizeDescription,
    })
  }

  async function handleWinnerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWinnerError('')

    const prizeValue = Number(winnerForm.prizeValue)

    if (!winnerForm.userId) {
      setWinnerError('Choisis un joueur.')
      return
    }

    if (!winnerForm.contestId) {
      setWinnerError('Choisis un concours.')
      return
    }

    const selectedContest = winnersData.contests.find(
      (contest) => contest.id === winnerForm.contestId,
    )

    if (!editingWinnerId && !hasContestEnded(selectedContest?.endsAt ?? '')) {
      setWinnerError(
        'Ajout manuel possible uniquement quand le concours est terminé.',
      )
      return
    }

    if (!Number.isFinite(prizeValue) || prizeValue < 0) {
      setWinnerError('La valeur du gain doit être supérieure ou égale à 0.')
      return
    }

    setIsSavingWinner(true)

    try {
      const shouldSetSentAt =
        winnerForm.status === 'sent' || winnerForm.status === 'received'
      const payload = {
        user_id: winnerForm.userId,
        contest_id: winnerForm.contestId,
        prize_description: winnerForm.prizeDescription.trim() || null,
        prize_value: prizeValue,
        payment_method: winnerForm.paymentMethod.trim() || null,
        payment_number: winnerForm.paymentNumber.trim() || null,
        status: winnerForm.status,
        sent_at: winnerForm.sentAt
          ? new Date(winnerForm.sentAt).toISOString()
          : shouldSetSentAt
            ? new Date().toISOString()
            : null,
      }
      const { error } = editingWinnerId
        ? await supabase.from('winners').update(payload).eq('id', editingWinnerId)
        : await supabase.from('winners').insert({
            ...payload,
            id: createClientUuid(),
            created_at: new Date().toISOString(),
          })

      if (error) throw error

      await loadWinners()
      closeWinnerModal()
    } catch (error) {
      setWinnerError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce gagnant.',
      )
    } finally {
      setIsSavingWinner(false)
    }
  }

  async function handleWinnerStatus(winner: WinnerItem, status: WinnerStatus) {
    const { error } = await supabase
      .from('winners')
      .update({
        status,
        sent_at:
          status === 'sent' || status === 'received'
            ? winner.sentAt || new Date().toISOString()
            : null,
      })
      .eq('id', winner.id)

    if (error) {
      setWinnersError(error.message)
      return
    }

    await loadWinners()
  }

  async function handleDeleteWinner(winner: WinnerItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement le gain de "${winner.userLabel}" ?`,
    )
    if (!confirmed) return

    const { error } = await supabase.from('winners').delete().eq('id', winner.id)

    if (error) {
      setWinnersError(error.message)
      return
    }

    await loadWinners()
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Récompenses</span>
          <strong>{winnersData.winners.length} gains</strong>
          <p>Attribue les récompenses et suis leur statut d’envoi.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Récompenses</p>
            <h1>Gagnants</h1>
            <p className="page-subtitle">
              Crée, confirme et trace les gains envoyés aux joueurs.
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
            <button className="primary-button" onClick={openWinnerModal} type="button">
              Nouveau gagnant
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {winnersError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Gagnants indisponibles</strong>
              <p>{winnersError}</p>
            </div>
            <button onClick={loadWinners} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel winners-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Payouts</p>
              <h2>Liste des gagnants</h2>
            </div>
            <span className="pill">
              {isWinnersLoading
                ? 'Chargement'
                : `${winnersData.winners.length} entrées`}
            </span>
          </div>

          <div className="winner-table">
            {winnersData.winners.length > 0 ? (
              winnersData.winners.map((winner) => (
                <article className="winner-table-row" key={winner.id}>
                  <div>
                    <strong>{winner.userLabel}</strong>
                    <p>{winner.contestTitle}</p>
                  </div>
                  <small>{formatMoney(winner.prizeValue)}</small>
                  <span>{winner.paymentMethod || 'Méthode non définie'}</span>
                  <span>{winner.paymentNumber || 'Numéro non défini'}</span>
                  <span className={`status-pill ${winner.status}`}>
                    {winner.status}
                  </span>
                  <div className="contest-actions">
                    <button
                      className="table-action-button"
                      onClick={() => openEditWinnerModal(winner)}
                      type="button"
                    >
                      Modifier
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() =>
                        navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${winner.contestId}/history`)
                      }
                      type="button"
                    >
                      Historique
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleWinnerStatus(winner, 'sent')}
                      type="button"
                    >
                      Envoyé
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleWinnerStatus(winner, 'received')}
                      type="button"
                    >
                      Reçu
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteWinner(winner)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isWinnersLoading
                  ? 'Chargement des gagnants...'
                  : 'Aucun gagnant enregistré pour le moment.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {isWinnerModalOpen ? (
        <WinnerModal
          contests={winnersData.contests}
          error={winnerError}
          form={winnerForm}
          isSaving={isSavingWinner}
          mode={editingWinnerId ? 'edit' : 'create'}
          onChange={setWinnerForm}
          onClose={closeWinnerModal}
          onContestChange={handleWinnerContestChange}
          onSubmit={handleWinnerSubmit}
          users={winnersData.users}
        />
      ) : null}
    </main>
  )
}

function SuperAdminContestsPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [contestsData, setContestsData] = useState<ContestsData>({
    contests: [],
    categories: [],
    partners: [],
    types: [],
  })
  const [isContestsLoading, setIsContestsLoading] = useState(true)
  const [contestsError, setContestsError] = useState('')
  const [contestsNotice, setContestsNotice] = useState('')
  const [isContestModalOpen, setIsContestModalOpen] = useState(false)
  const [editingContestId, setEditingContestId] = useState<string | null>(null)
  const [contestForm, setContestForm] = useState<ContestFormState>(
    createDefaultContestForm,
  )
  const [contestError, setContestError] = useState('')
  const [isSavingContest, setIsSavingContest] = useState(false)
  const [contestSearch, setContestSearch] = useState('')
  const [contestStatusFilter, setContestStatusFilter] = useState('all')
  const [contestTypeFilter, setContestTypeFilter] = useState('all')
  const [contestCategoryFilter, setContestCategoryFilter] = useState('all')

  const filteredContests = useMemo(() => {
    const cleanedSearch = contestSearch.trim().toLowerCase()

    return contestsData.contests.filter((contest) => {
      const matchesSearch =
        cleanedSearch.length === 0 ||
        [contest.title, contest.partner, contest.category, contest.type]
          .join(' ')
          .toLowerCase()
          .includes(cleanedSearch)
      const matchesStatus =
        contestStatusFilter === 'all' || contest.status === contestStatusFilter
      const matchesType =
        contestTypeFilter === 'all' || contest.type === contestTypeFilter
      const matchesCategory =
        contestCategoryFilter === 'all' || contest.categoryId === contestCategoryFilter

      return matchesSearch && matchesStatus && matchesType && matchesCategory
    })
  }, [
    contestCategoryFilter,
    contestSearch,
    contestStatusFilter,
    contestTypeFilter,
    contestsData.contests,
  ])

  const loadContests = useCallback(async () => {
    setIsContestsLoading(true)
    setContestsError('')
    setContestsNotice('')

    try {
      setContestsData(await fetchContestsData())
    } catch (error) {
      setContestsError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les concours.',
      )
    } finally {
      setIsContestsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void fetchContestsData()
      .then((nextContestsData) => {
        if (isMounted) setContestsData(nextContestsData)
      })
      .catch((error) => {
        if (!isMounted) return
        setContestsError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les concours.',
        )
      })
      .finally(() => {
        if (isMounted) setIsContestsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useRealtimeRefresh(
    'sa-contests-realtime',
    ['contests', 'participations', 'winners', 'categories', 'partners', 'contest_types'],
    loadContests,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openContestModal() {
    setContestError('')
    setEditingContestId(null)
    setContestForm(createDefaultContestForm())
    setIsContestModalOpen(true)
  }

  function openEditContestModal(contest: ContestItem) {
    setContestError('')
    setEditingContestId(contest.id)
    setContestForm(contestToForm(contest))
    setIsContestModalOpen(true)
  }

  function closeContestModal() {
    if (isSavingContest) return
    setContestError('')
    setEditingContestId(null)
    setIsContestModalOpen(false)
  }

  async function handleContestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setContestError('')

    const title = contestForm.title.trim()
    const description = contestForm.description.trim()
    const prizeDescription = contestForm.prizeDescription.trim()
    const prizeValue = Number(contestForm.prizeValue)
    const winnersCount = Number(contestForm.winnersCount)
    const maxParticipants = contestForm.maxParticipants
      ? Number(contestForm.maxParticipants)
      : null
    const startsAt = new Date(contestForm.startsAt)
    const endsAt = new Date(contestForm.endsAt)
    const selectedCategory = contestsData.categories.find(
      (category) => category.id === contestForm.categoryId,
    )
    const selectedType = contestsData.types.find(
      (type) => type.key === contestForm.type,
    )

    if (title.length < 3) {
      setContestError('Le titre doit contenir au moins 3 caractères.')
      return
    }

    if (!contestForm.categoryId || !selectedCategory) {
      setContestError('Choisis une catégorie.')
      return
    }

    if (!contestForm.type || !selectedType) {
      setContestError('Choisis un type de concours.')
      return
    }

    if (!Number.isFinite(prizeValue) || prizeValue <= 0) {
      setContestError('La valeur du prix doit être supérieure à 0.')
      return
    }

    if (!Number.isFinite(winnersCount) || winnersCount <= 0) {
      setContestError('Le nombre de gagnants doit être supérieur à 0.')
      return
    }

    if (maxParticipants !== null && (!Number.isFinite(maxParticipants) || maxParticipants <= 0)) {
      setContestError('La limite de participants doit être vide ou supérieure à 0.')
      return
    }

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setContestError('Renseigne les dates de début et de fin.')
      return
    }

    if (endsAt <= startsAt) {
      setContestError('La date de fin doit être après la date de début.')
      return
    }

    setIsSavingContest(true)

    try {
      const payload = {
        partner_id: contestForm.partnerId || null,
        title,
        description,
        image_url: contestForm.imageUrl.trim() || null,
        type: contestForm.type,
        category: selectedCategory.name,
        category_id: contestForm.categoryId,
        status: contestForm.status,
        prize_description: prizeDescription || null,
        brand_logo_url: contestForm.brandLogoUrl.trim() || null,
        brand_name: contestForm.brandName.trim() || null,
        prize_value: prizeValue,
        winners_count: winnersCount,
        max_participants: maxParticipants,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_boosted: contestForm.isBoosted,
      }
      const { error } = editingContestId
        ? await supabase.from('contests').update(payload).eq('id', editingContestId)
        : await supabase.from('contests').insert({
            ...payload,
            id: createClientUuid(),
            views_count: 0,
            shares_count: 0,
            created_at: new Date().toISOString(),
          })

      if (error) throw error

      await loadContests()
      closeContestModal()
    } catch (error) {
      setContestError(
        error instanceof Error
          ? error.message
          : 'Impossible de créer ce concours.',
      )
    } finally {
      setIsSavingContest(false)
    }
  }

  async function handleToggleContestStatus(contest: ContestItem) {
    setContestsNotice('')
    const nextStatus = contest.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('contests')
      .update({ status: nextStatus })
      .eq('id', contest.id)

    if (error) {
      setContestsError(error.message)
      return
    }

    if (nextStatus === 'active' && contest.partnerId) {
      try {
        const { data: partnerRow, error: partnerError } = await supabase
          .from('partners')
          .select('user_id, company_name')
          .eq('id', contest.partnerId)
          .maybeSingle()

        if (partnerError) throw partnerError

        const partnerUserId = partnerRow?.user_id as string | null | undefined
        if (partnerUserId) {
          const pushPayload = {
            userIds: [partnerUserId],
            title: 'Concours validé',
            body: `Ton concours "${contest.title}" a été validé par le Super Admin.`,
            type: 'partner_contest_approved',
            data: {
              contest_id: contest.id,
              contestId: contest.id,
              partner_id: contest.partnerId,
              type: 'partner_contest_approved',
              source: 'partner_contest_validation',
            },
          }
          console.info('[MegaPromo][contestValidation][pushPayload]', pushPayload)
          const pushResponse = await supabase.functions.invoke(
            'send-push-notifications',
            { body: pushPayload },
          )
          console.info('[MegaPromo][contestValidation][pushResponse]', pushResponse)
        }
      } catch (pushError) {
        console.warn('[MegaPromo][contestValidation][pushError]', pushError)
      }
    }

    await loadContests()
  }

  async function handleDeleteContest(contest: ContestItem) {
    setContestsNotice('')
    const confirmed = window.confirm(
      `Supprimer definitivement le concours "${contest.title}" ?`,
    )
    if (!confirmed) return

    const { error } = await supabase.from('contests').delete().eq('id', contest.id)

    if (error) {
      setContestsError(error.message)
      return
    }

    await loadContests()
  }

  async function handleGenerateWinners(contest: ContestItem) {
    setContestsError('')
    setContestsNotice('')

    if (!hasContestEnded(contest.endsAt)) {
      setContestsError(
        'Les gagnants peuvent être générés uniquement après la fin du concours.',
      )
      return
    }

    try {
      const [participationsResponse, existingWinnersResponse] = await Promise.all([
        supabase
          .from('participations')
          .select('user_id, score, participated_at')
          .eq('contest_id', contest.id)
          .eq('completed', true),
        supabase.from('winners').select('user_id').eq('contest_id', contest.id),
      ])

      if (participationsResponse.error) throw participationsResponse.error
      if (existingWinnersResponse.error) throw existingWinnersResponse.error

      const existingUserIds = new Set(
        (existingWinnersResponse.data ?? [])
          .map((winner) => winner.user_id as string | null)
          .filter(Boolean),
      )
      const candidates = ((participationsResponse.data ??
        []) as ContestParticipationCandidate[]).filter(
        (participation) =>
          participation.user_id && !existingUserIds.has(participation.user_id),
      )

      if (candidates.length === 0) {
        setContestsNotice(
          'Aucun nouveau participant éligible à proposer pour ce concours.',
        )
        return
      }

      const winnerLimit = Math.max(1, contest.winnersCount || 1)
      const rankedCandidates =
        isDrawContestType(contest.type)
          ? [...candidates].sort(() => Math.random() - 0.5)
          : [...candidates].sort((first, second) => {
              const scoreDiff = (second.score ?? 0) - (first.score ?? 0)
              if (scoreDiff !== 0) return scoreDiff
              return (
                new Date(first.participated_at ?? 0).getTime() -
                new Date(second.participated_at ?? 0).getTime()
              )
            })
      const selectedCandidates = rankedCandidates.slice(0, winnerLimit)
      const now = new Date().toISOString()
      const payload = selectedCandidates.map((candidate) => ({
        id: createClientUuid(),
        user_id: candidate.user_id,
        contest_id: contest.id,
        prize_description: contest.prizeDescription || contest.title,
        prize_value: contest.prizeValue,
        payment_method: null,
        payment_number: null,
        status: 'pending',
        sent_at: null,
        created_at: now,
      }))

      const { error } = await supabase.from('winners').insert(payload)
      if (error) throw error

      await loadContests()
      setContestsNotice(
        `${payload.length} gagnant(s) candidat(s) généré(s). Valide-les dans l’onglet Gagnants.`,
      )
    } catch (error) {
      setContestsError(
        error instanceof Error
          ? error.message
          : 'Impossible de générer les gagnants.',
      )
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Concours</span>
          <strong>{contestsData.contests.length} campagnes</strong>
          <p>Crée les campagnes visibles dans l’application mobile MegaPromo.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Opérations</p>
            <h1>Concours</h1>
            <p className="page-subtitle">
              Crée et supervise les quiz, tirages et pronostics de la plateforme.
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
            <button className="primary-button" onClick={openContestModal} type="button">
              Nouveau concours
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {contestsError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Concours indisponibles</strong>
              <p>{contestsError}</p>
            </div>
            <button onClick={loadContests} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {contestsNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Opération terminée</strong>
              <p>{contestsNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel contests-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2>Liste des concours</h2>
            </div>
            <span className="pill">
              {isContestsLoading ? 'Chargement' : `${filteredContests.length} / ${contestsData.contests.length}`}
            </span>
          </div>

          <div className="contest-filter-bar">
            <input
              className="search-input"
              onChange={(event) => setContestSearch(event.target.value)}
              placeholder="Rechercher par titre, partenaire, catégorie..."
              value={contestSearch}
            />
            <select
              onChange={(event) => setContestStatusFilter(event.target.value)}
              value={contestStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Draft</option>
              <option value="pending">En attente</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <select
              onChange={(event) => setContestTypeFilter(event.target.value)}
              value={contestTypeFilter}
            >
              <option value="all">Tous les types</option>
              {contestsData.types.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              onChange={(event) => setContestCategoryFilter(event.target.value)}
              value={contestCategoryFilter}
            >
              <option value="all">Toutes les catégories</option>
              {contestsData.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="contest-table">
            {filteredContests.length > 0 ? (
              filteredContests.map((contest) => (
                <article className="contest-table-row" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <p>
                      {contest.partner} · {contest.category}
                    </p>
                  </div>
                  <span className="contest-type-pill">{contest.type}</span>
                  <small>{formatMoney(contest.prizeValue)}</small>
                  <p>{contest.participants} participants</p>
                  <p>{formatDate(contest.endsAt)}</p>
                  <span className={`status-pill ${contest.status}`}>
                    {contest.status}
                  </span>
                  <div className="contest-actions">
                    <button
                      className="table-action-button"
                      onClick={() => openEditContestModal(contest)}
                      type="button"
                    >
                      Modifier
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() =>
                        navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${contest.id}/game`)
                      }
                      type="button"
                    >
                      Configurer
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() =>
                        navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${contest.id}/history`)
                      }
                      type="button"
                    >
                      Historique
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleGenerateWinners(contest)}
                      type="button"
                    >
                      Générer
                    </button>
                    <button
                      className="table-action-button"
                      onClick={() => handleToggleContestStatus(contest)}
                      type="button"
                    >
                      {contest.status === 'active' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteContest(contest)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isContestsLoading
                  ? 'Chargement des concours...'
                  : contestsData.contests.length > 0
                    ? 'Aucun concours ne correspond aux filtres.'
                    : 'Aucun concours créé pour le moment.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {isContestModalOpen ? (
        <ContestModal
          categories={contestsData.categories}
          error={contestError}
          form={contestForm}
          isSaving={isSavingContest}
          mode={editingContestId ? 'edit' : 'create'}
          onChange={setContestForm}
          onClose={closeContestModal}
        onSubmit={handleContestSubmit}
        partners={contestsData.partners}
        types={contestsData.types}
      />
      ) : null}

    </main>
  )
}

function SuperAdminContestGamePage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const { contestId } = useParams()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [gameData, setGameData] = useState<ContestGameData | null>(null)
  const [isGameLoading, setIsGameLoading] = useState(true)
  const [gameError, setGameError] = useState('')
  const [gameNotice, setGameNotice] = useState('')
  const [questionForm, setQuestionForm] = useState<QuizQuestionFormState>(
    createDefaultQuestionForm,
  )
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [drawSettings, setDrawSettings] = useState<DrawSettingsState>(
    createDefaultDrawSettings,
  )
  const [predictionSettings, setPredictionSettings] =
    useState<PredictionSettingsState>(createDefaultPredictionSettings)
  const [isSavingGame, setIsSavingGame] = useState(false)

  const loadGame = useCallback(async () => {
    if (!contestId) {
      setGameError('Concours introuvable.')
      setIsGameLoading(false)
      return
    }

    setIsGameLoading(true)
    setGameError('')

    try {
      const nextGameData = await fetchContestGameData(contestId)
      setGameData(nextGameData)
      setDrawSettings(nextGameData.drawSettings)
      setPredictionSettings(nextGameData.predictionSettings)
      setQuestionForm(createDefaultQuestionForm(nextGameData.questions.length + 1))
      setEditingQuestionId(null)
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger la configuration du jeu.',
      )
    } finally {
      setIsGameLoading(false)
    }
  }, [contestId])

  useEffect(() => {
    let isMounted = true

    void fetchContestGameData(contestId ?? '')
      .then((nextGameData) => {
        if (!isMounted) return
        setGameData(nextGameData)
        setDrawSettings(nextGameData.drawSettings)
        setPredictionSettings(nextGameData.predictionSettings)
        setQuestionForm(createDefaultQuestionForm(nextGameData.questions.length + 1))
      })
      .catch((error) => {
        if (!isMounted) return
        setGameError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger la configuration du jeu.',
        )
      })
      .finally(() => {
        if (isMounted) setIsGameLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [contestId])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!gameData) return

    const questionText = questionForm.questionText.trim()
    const points = Number(questionForm.points)
    const timeLimit = Number(questionForm.timeLimit)
    const orderIndex = Number(questionForm.orderIndex)

    if (questionText.length < 3) {
      setGameError('La question doit contenir au moins 3 caractères.')
      return
    }

    if (
      [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD]
        .some((option) => option.trim().length < 1)
    ) {
      setGameError('Les 4 options doivent être renseignées.')
      return
    }

    if (!Number.isFinite(points) || points <= 0) {
      setGameError('Les points doivent être supérieurs à 0.')
      return
    }

    if (!Number.isFinite(timeLimit) || timeLimit <= 0) {
      setGameError('Le temps limite doit être supérieur à 0.')
      return
    }

    setIsSavingGame(true)
    setGameError('')
    setGameNotice('')

    const payload = {
      contest_id: gameData.contest.id,
      question_text: questionText,
      option_a: questionForm.optionA.trim(),
      option_b: questionForm.optionB.trim(),
      option_c: questionForm.optionC.trim(),
      option_d: questionForm.optionD.trim(),
      correct_answer: questionForm.correctAnswer,
      points,
      time_limit: timeLimit,
      order_index: Number.isFinite(orderIndex)
        ? orderIndex
        : gameData.questions.length + 1,
    }

    try {
      const { error } = editingQuestionId
        ? await supabase.from('questions').update(payload).eq('id', editingQuestionId)
        : await supabase.from('questions').insert({
            ...payload,
            id: createClientUuid(),
            created_at: new Date().toISOString(),
          })

      if (error) throw error
      await loadGame()
      setGameNotice(editingQuestionId ? 'Question modifiée.' : 'Question ajoutée.')
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : 'Impossible de sauvegarder cette question.',
      )
    } finally {
      setIsSavingGame(false)
    }
  }

  async function handleDeleteQuestion(question: QuizQuestionItem) {
    const confirmed = window.confirm(`Supprimer la question "${question.questionText}" ?`)
    if (!confirmed) return

    setIsSavingGame(true)
    setGameError('')
    setGameNotice('')

    try {
      const { error } = await supabase.from('questions').delete().eq('id', question.id)
      if (error) throw error
      await loadGame()
      setGameNotice('Question supprimée.')
    } catch (error) {
      setGameError(
        error instanceof Error ? error.message : 'Impossible de supprimer cette question.',
      )
    } finally {
      setIsSavingGame(false)
    }
  }

  async function handleDrawSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!gameData) return

    const standardTickets = Number(drawSettings.standardTickets)
    const premiumTickets = Number(drawSettings.premiumTickets)

    if (!Number.isFinite(standardTickets) || standardTickets <= 0) {
      setGameError('Le nombre de tickets standard doit être supérieur à 0.')
      return
    }

    if (!Number.isFinite(premiumTickets) || premiumTickets < standardTickets) {
      setGameError('Les tickets premium doivent être au moins égaux aux tickets standard.')
      return
    }

    setIsSavingGame(true)
    setGameError('')
    setGameNotice('')

    try {
      const { error } = await supabase.from('contest_draw_settings').upsert(
        {
          contest_id: gameData.contest.id,
          standard_tickets: standardTickets,
          premium_tickets: premiumTickets,
          confirmation_message: drawSettings.confirmationMessage.trim() || null,
          winner_announcement_at: drawSettings.winnerAnnouncementAt
            ? new Date(drawSettings.winnerAnnouncementAt).toISOString()
            : null,
          rules: drawSettings.rules.trim() || null,
        },
        { onConflict: 'contest_id' },
      )

      if (error) throw error
      await loadGame()
      setGameNotice('Configuration du tirage sauvegardée.')
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : 'Impossible de sauvegarder ce tirage.',
      )
    } finally {
      setIsSavingGame(false)
    }
  }

  async function handlePredictionSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!gameData) return

    const exactScore = Number(predictionSettings.pointsExactScore)
    const correctResult = Number(predictionSettings.pointsCorrectResult)

    if (!predictionSettings.homeTeam.trim() || !predictionSettings.awayTeam.trim()) {
      setGameError('Renseigne les deux équipes.')
      return
    }

    if (!Number.isFinite(exactScore) || exactScore <= 0) {
      setGameError('Le barème score exact doit être supérieur à 0.')
      return
    }

    if (!Number.isFinite(correctResult) || correctResult <= 0) {
      setGameError('Le barème résultat juste doit être supérieur à 0.')
      return
    }

    setIsSavingGame(true)
    setGameError('')
    setGameNotice('')

    try {
      const { error } = await supabase.from('contest_predictions').upsert(
        {
          contest_id: gameData.contest.id,
          home_team: predictionSettings.homeTeam.trim(),
          away_team: predictionSettings.awayTeam.trim(),
          match_label: predictionSettings.matchLabel.trim() || null,
          match_date: predictionSettings.matchDate
            ? new Date(predictionSettings.matchDate).toISOString()
            : null,
          home_score: predictionSettings.homeScore
            ? Number(predictionSettings.homeScore)
            : null,
          away_score: predictionSettings.awayScore
            ? Number(predictionSettings.awayScore)
            : null,
          status: predictionSettings.status,
          points_exact_score: exactScore,
          points_correct_result: correctResult,
        },
        { onConflict: 'contest_id' },
      )

      if (error) throw error
      await loadGame()
      setGameNotice('Configuration du pronostic sauvegardée.')
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : 'Impossible de sauvegarder ce pronostic.',
      )
    } finally {
      setIsSavingGame(false)
    }
  }

  const nextQuestionOrder = (gameData?.questions.length ?? 0) + 1

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Jeu</span>
          <strong>{gameData?.contest.type ?? 'Configuration'}</strong>
          <p>Paramètre l’expérience réelle jouée dans l’application mobile.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration jeu</p>
            <h1>{gameData?.contest.title ?? 'Concours'}</h1>
            <p className="page-subtitle">
              Questions, tickets ou pronostic selon le type du concours.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(SUPER_ADMIN_CONTESTS_ROUTE)}
              type="button"
            >
              Retour concours
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

        {gameError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Configuration indisponible</strong>
              <p>{gameError}</p>
            </div>
            <button onClick={loadGame} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {gameNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Sauvegardé</strong>
              <p>{gameNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel contest-game-panel">
          {gameData ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Type {gameData.contest.type}</p>
                  <h2>Configurer le jeu</h2>
                </div>
                <button
                  className="secondary-action-button"
                  disabled={isGameLoading}
                  onClick={loadGame}
                  type="button"
                >
                  Actualiser
                </button>
              </div>

              {gameData.contest.type === 'quiz' ? (
                <div className="game-config-layout">
                  <form className="category-form game-form" onSubmit={handleQuestionSubmit}>
                    <label>
                      <span>Question</span>
                      <textarea
                        onChange={(event) =>
                          setQuestionForm((current) => ({
                            ...current,
                            questionText: event.target.value,
                          }))
                        }
                        placeholder="Quelle équipe a remporté... ?"
                        rows={3}
                        value={questionForm.questionText}
                      />
                    </label>

                    <div className="form-grid two-columns">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const key = `option${letter}` as keyof QuizQuestionFormState
                        return (
                          <label key={letter}>
                            <span>Option {letter}</span>
                            <input
                              onChange={(event) =>
                                setQuestionForm((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              value={questionForm[key]}
                            />
                          </label>
                        )
                      })}
                    </div>

                    <div className="form-grid three-columns">
                      <label>
                        <span>Bonne réponse</span>
                        <select
                          onChange={(event) =>
                            setQuestionForm((current) => ({
                              ...current,
                              correctAnswer: event.target.value,
                            }))
                          }
                          value={questionForm.correctAnswer}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </label>
                      <label>
                        <span>Points</span>
                        <input
                          min="1"
                          onChange={(event) =>
                            setQuestionForm((current) => ({
                              ...current,
                              points: event.target.value,
                            }))
                          }
                          type="number"
                          value={questionForm.points}
                        />
                      </label>
                      <label>
                        <span>Temps limite</span>
                        <input
                          min="1"
                          onChange={(event) =>
                            setQuestionForm((current) => ({
                              ...current,
                              timeLimit: event.target.value,
                            }))
                          }
                          type="number"
                          value={questionForm.timeLimit}
                        />
                      </label>
                    </div>

                    <label>
                      <span>Ordre</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setQuestionForm((current) => ({
                            ...current,
                            orderIndex: event.target.value,
                          }))
                        }
                        type="number"
                        value={questionForm.orderIndex}
                      />
                    </label>

                    <div className="modal-actions">
                      {editingQuestionId ? (
                        <button
                          className="secondary-action-button"
                          onClick={() => {
                            setEditingQuestionId(null)
                            setQuestionForm(createDefaultQuestionForm(nextQuestionOrder))
                          }}
                          type="button"
                        >
                          Annuler
                        </button>
                      ) : null}
                      <button className="submit-button compact" disabled={isSavingGame} type="submit">
                        {editingQuestionId ? 'Modifier la question' : 'Ajouter la question'}
                      </button>
                    </div>
                  </form>

                  <div className="game-side-card">
                    <div className="section-heading compact">
                      <div>
                        <p className="eyebrow">Questions</p>
                        <h3>{gameData.questions.length} enregistrée(s)</h3>
                      </div>
                    </div>
                    <div className="question-list">
                      {gameData.questions.length > 0 ? (
                        gameData.questions.map((question) => (
                          <article className="question-row" key={question.id}>
                            <div>
                              <strong>
                                #{question.orderIndex} · {question.questionText}
                              </strong>
                              <p>
                                Réponse {question.correctAnswer} · {question.points} pts ·{' '}
                                {question.timeLimit}s
                              </p>
                            </div>
                            <div>
                              <button
                                className="table-action-button"
                                onClick={() => {
                                  setEditingQuestionId(question.id)
                                  setQuestionForm(questionToForm(question))
                                }}
                                type="button"
                              >
                                Modifier
                              </button>
                              <button
                                className="table-action-button danger"
                                onClick={() => handleDeleteQuestion(question)}
                                type="button"
                              >
                                Supprimer
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="empty-panel-text">Aucune question ajoutée.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {isDrawContestType(gameData.contest.type) ? (
                <form className="category-form game-form" onSubmit={handleDrawSettingsSubmit}>
                  <div className="form-grid two-columns">
                    <label>
                      <span>Tickets standard</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setDrawSettings((current) => ({
                            ...current,
                            standardTickets: event.target.value,
                          }))
                        }
                        type="number"
                        value={drawSettings.standardTickets}
                      />
                    </label>
                    <label>
                      <span>Tickets premium</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setDrawSettings((current) => ({
                            ...current,
                            premiumTickets: event.target.value,
                          }))
                        }
                        type="number"
                        value={drawSettings.premiumTickets}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Date d’annonce gagnants</span>
                    <input
                      onChange={(event) =>
                        setDrawSettings((current) => ({
                          ...current,
                          winnerAnnouncementAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={drawSettings.winnerAnnouncementAt}
                    />
                  </label>
                  <label>
                    <span>Message de confirmation</span>
                    <textarea
                      onChange={(event) =>
                        setDrawSettings((current) => ({
                          ...current,
                          confirmationMessage: event.target.value,
                        }))
                      }
                      rows={3}
                      value={drawSettings.confirmationMessage}
                    />
                  </label>
                  <label>
                    <span>Règles du tirage</span>
                    <textarea
                      onChange={(event) =>
                        setDrawSettings((current) => ({
                          ...current,
                          rules: event.target.value,
                        }))
                      }
                      placeholder="Ex : 1 participation par joueur, gagnants tirés après la date de fin..."
                      rows={4}
                      value={drawSettings.rules}
                    />
                  </label>
                  <div className="modal-actions">
                    <button className="submit-button compact" disabled={isSavingGame} type="submit">
                      Sauvegarder le tirage
                    </button>
                  </div>
                </form>
              ) : null}

              {gameData.contest.type === 'pronostic' ? (
                <form
                  className="category-form game-form"
                  onSubmit={handlePredictionSettingsSubmit}
                >
                  <div className="form-grid two-columns">
                    <label>
                      <span>Équipe 1</span>
                      <input
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            homeTeam: event.target.value,
                          }))
                        }
                        placeholder="Côte d’Ivoire"
                        value={predictionSettings.homeTeam}
                      />
                    </label>
                    <label>
                      <span>Équipe 2</span>
                      <input
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            awayTeam: event.target.value,
                          }))
                        }
                        placeholder="Adversaire"
                        value={predictionSettings.awayTeam}
                      />
                    </label>
                  </div>
                  <div className="form-grid two-columns">
                    <label>
                      <span>Libellé du match</span>
                      <input
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            matchLabel: event.target.value,
                          }))
                        }
                        placeholder="Premier match Coupe du Monde 2026"
                        value={predictionSettings.matchLabel}
                      />
                    </label>
                    <label>
                      <span>Date du match</span>
                      <input
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            matchDate: event.target.value,
                          }))
                        }
                        type="datetime-local"
                        value={predictionSettings.matchDate}
                      />
                    </label>
                  </div>
                  <div className="form-grid three-columns">
                    <label>
                      <span>Statut</span>
                      <select
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                        value={predictionSettings.status}
                      >
                        <option value="open">Ouvert</option>
                        <option value="locked">Verrouillé</option>
                        <option value="scored">Noté</option>
                      </select>
                    </label>
                    <label>
                      <span>Score équipe 1</span>
                      <input
                        min="0"
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            homeScore: event.target.value,
                          }))
                        }
                        type="number"
                        value={predictionSettings.homeScore}
                      />
                    </label>
                    <label>
                      <span>Score équipe 2</span>
                      <input
                        min="0"
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            awayScore: event.target.value,
                          }))
                        }
                        type="number"
                        value={predictionSettings.awayScore}
                      />
                    </label>
                  </div>
                  <div className="form-grid two-columns">
                    <label>
                      <span>Points score exact</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            pointsExactScore: event.target.value,
                          }))
                        }
                        type="number"
                        value={predictionSettings.pointsExactScore}
                      />
                    </label>
                    <label>
                      <span>Points résultat juste</span>
                      <input
                        min="1"
                        onChange={(event) =>
                          setPredictionSettings((current) => ({
                            ...current,
                            pointsCorrectResult: event.target.value,
                          }))
                        }
                        type="number"
                        value={predictionSettings.pointsCorrectResult}
                      />
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button className="submit-button compact" disabled={isSavingGame} type="submit">
                      Sauvegarder le pronostic
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : (
            <p className="empty-panel-text">
              {isGameLoading
                ? 'Chargement de la configuration...'
                : 'Aucune configuration à afficher.'}
            </p>
          )}
        </section>
      </section>
    </main>
  )
}

function SuperAdminContestHistoryPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const { contestId } = useParams()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [historyData, setHistoryData] = useState<ContestHistoryData | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')

  const loadHistory = useCallback(async () => {
    if (!contestId) {
      setHistoryError('Concours introuvable.')
      setIsHistoryLoading(false)
      return
    }

    setIsHistoryLoading(true)
    setHistoryError('')

    try {
      const contest = await fetchContestById(contestId)
      setHistoryData(await fetchContestHistory(contest))
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger l’historique du concours.',
      )
    } finally {
      setIsHistoryLoading(false)
    }
  }, [contestId])

  useEffect(() => {
    let isMounted = true

    void fetchContestById(contestId ?? '')
      .then((contest) => fetchContestHistory(contest))
      .then((nextHistoryData) => {
        if (isMounted) setHistoryData(nextHistoryData)
      })
      .catch((error) => {
        if (!isMounted) return
        setHistoryError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger l’historique du concours.',
        )
      })
      .finally(() => {
        if (isMounted) setIsHistoryLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [contestId])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function handleClearHistory() {
    if (!historyData) return

    const confirmed = window.confirm(
      `Vider tout l’historique de participation du concours "${historyData.contest.title}" ? Cette action supprime les lignes participations.`,
    )
    if (!confirmed) return

    setHistoryError('')
    setHistoryNotice('')
    setIsHistoryLoading(true)

    try {
      const { error } = await supabase
        .from('participations')
        .delete()
        .eq('contest_id', historyData.contest.id)

      if (error) throw error

      setHistoryData({
        contest: { ...historyData.contest, participants: 0 },
        participations: [],
      })
      setHistoryNotice('Historique de participation vidé pour ce concours.')
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Impossible de vider cet historique.',
      )
    } finally {
      setIsHistoryLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Historique</span>
          <strong>{historyData?.participations.length ?? 0} lignes</strong>
          <p>Analyse les joueurs, scores et réponses d’un concours.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Historique concours</p>
            <h1>{historyData?.contest.title ?? 'Concours'}</h1>
            <p className="page-subtitle">
              Participants, scores, rangs, dates et réponses enregistrées.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(SUPER_ADMIN_CONTESTS_ROUTE)}
              type="button"
            >
              Retour concours
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

        {historyError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Historique indisponible</strong>
              <p>{historyError}</p>
            </div>
            <button onClick={loadHistory} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {historyNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Action appliquée</strong>
              <p>{historyNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel contest-history-page-panel">
          {historyData ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Participations</p>
                  <h2>Historique de jeu</h2>
                </div>
                <div className="history-actions compact">
                  <button
                    className="secondary-action-button"
                    disabled={isHistoryLoading}
                    onClick={loadHistory}
                    type="button"
                  >
                    Actualiser
                  </button>
                  <button
                    className="table-action-button danger"
                    disabled={isHistoryLoading || historyData.participations.length === 0}
                    onClick={handleClearHistory}
                    type="button"
                  >
                    Vider l’historique
                  </button>
                </div>
              </div>

              <div className="history-summary">
                <div>
                  <span>Participants</span>
                  <strong>{historyData.participations.length}</strong>
                </div>
                <div>
                  <span>Terminés</span>
                  <strong>
                    {
                      historyData.participations.filter(
                        (participation) => participation.completed,
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Meilleur score</span>
                  <strong>
                    {Math.max(
                      0,
                      ...historyData.participations.map(
                        (participation) => participation.score,
                      ),
                    )}
                  </strong>
                </div>
              </div>

              <div className="history-list page-history-list">
                {historyData.participations.length > 0 ? (
                  historyData.participations.map((participation) => (
                    <article className="history-row" key={participation.id}>
                      <div>
                        <strong>
                          #{participation.rank} · {participation.userLabel}
                        </strong>
                        <p>{formatDate(participation.participatedAt)}</p>
                        <small>{participation.answers}</small>
                      </div>
                      <span>{participation.score} pts</span>
                      <span className={`status-pill ${participation.completed ? 'active' : 'pending'}`}>
                        {participation.completed ? 'Terminé' : 'En cours'}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="empty-panel-text">
                    {isHistoryLoading
                      ? 'Chargement de l’historique...'
                      : 'Aucune participation pour ce concours.'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="empty-panel-text">
              {isHistoryLoading
                ? 'Chargement de l’historique...'
                : 'Aucun concours à afficher.'}
            </p>
          )}
        </section>
      </section>
    </main>
  )
}

function CategoryModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: CategoryFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: CategoryFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={mode === 'create' ? 'Créer une catégorie' : 'Modifier la catégorie'}
        className="category-modal"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Catégories</p>
            <h2>
              {mode === 'create' ? 'Nouvelle catégorie' : 'Modifier catégorie'}
            </h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form" onSubmit={onSubmit}>
          <label>
            <span>Nom</span>
            <input
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Ex: Beauté"
              value={form.name}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Courte description de la catégorie"
              rows={4}
              value={form.description}
            />
          </label>

          <label>
            <span>Couleur</span>
            <div className="color-input-row">
              <input
                aria-label="Couleur"
                onChange={(event) =>
                  onChange({ ...form, color: event.target.value })
                }
                type="color"
                value={form.color}
              />
              <input
                onChange={(event) =>
                  onChange({ ...form, color: event.target.value })
                }
                value={form.color}
              />
            </div>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ContestModal({
  categories,
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
  partners,
  types,
}: {
  categories: CategoryOption[]
  error: string
  form: ContestFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: ContestFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  partners: PartnerOption[]
  types: ContestTypeOption[]
}) {
  const [logoUploadError, setLogoUploadError] = useState('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setLogoUploadError('')

    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Le logo ne doit pas dépasser 2 Mo.')
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoUploadError('Format accepté : PNG, JPG, WEBP ou SVG.')
      return
    }

    setIsUploadingLogo(true)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const path = `contest-logos/${createClientUuid()}-${safeName || 'logo'}.${extension}`
      const { error } = await supabase.storage
        .from('brand-assets')
        .upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        })

      if (error) throw error

      const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
      onChange({ ...form, brandLogoUrl: data.publicUrl })
    } catch (error) {
      setLogoUploadError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger ce logo.',
      )
    } finally {
      setIsUploadingLogo(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Créer un concours" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Concours</p>
            <h2>{mode === 'create' ? 'Nouveau concours' : 'Modifier concours'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="form-grid two-columns">
            <label>
              <span>Titre</span>
              <input
                onChange={(event) => onChange({ ...form, title: event.target.value })}
                placeholder="Grand Tirage MTN CI"
                value={form.title}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, type: event.target.value as ContestType })
                }
                value={form.type}
              >
                <option value="">Choisir</option>
                {types.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.type === 'pronostic' ? (
            <div className="contest-context-note">
              <strong>Pronostic sportif</strong>
              <p>
                Pour le premier match d’une équipe à la Coupe du Monde 2026,
                renseigne les règles dans la description. La participation mobile
                stockera ensuite le score ou choix du joueur dans
                <code>participations.answers</code>.
              </p>
            </div>
          ) : null}

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Explique le principe du concours"
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Catégorie</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, categoryId: event.target.value })
                }
                value={form.categoryId}
              >
                <option value="">Choisir</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Partenaire</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, partnerId: event.target.value })
                }
                value={form.partnerId}
              >
                <option value="">MegaPromo</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Image URL</span>
            <input
              onChange={(event) => onChange({ ...form, imageUrl: event.target.value })}
              placeholder="https://..."
              value={form.imageUrl}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Nom marque campagne</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, brandName: event.target.value })
                }
                placeholder="Ex : MTN CI, Orange, MegaPromo"
                value={form.brandName}
              />
            </label>

            <label>
              <span>Logo marque URL</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, brandLogoUrl: event.target.value })
                }
                placeholder="https://..."
                value={form.brandLogoUrl}
              />
            </label>
          </div>

          <div className="logo-upload-row">
            <div>
              <strong>Logo du concours</strong>
              <p>PNG, JPG, WEBP ou SVG. Taille maximum 2 Mo.</p>
              {logoUploadError ? <small>{logoUploadError}</small> : null}
            </div>
            {form.brandLogoUrl ? (
              <img alt="Logo concours" src={form.brandLogoUrl} />
            ) : null}
            <label className="secondary-action-button">
              {isUploadingLogo ? 'Chargement...' : 'Charger un logo'}
              <input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isSaving || isUploadingLogo}
                hidden
                onChange={handleLogoUpload}
                type="file"
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Valeur du prix</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, prizeValue: event.target.value })
                }
                placeholder="50000"
                type="number"
                value={form.prizeValue}
              />
            </label>

            <label>
              <span>Nombre de gagnants</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, winnersCount: event.target.value })
                }
                type="number"
                value={form.winnersCount}
              />
            </label>
          </div>

          <label>
            <span>Description du prix</span>
            <input
              onChange={(event) =>
                onChange({ ...form, prizeDescription: event.target.value })
              }
              placeholder="Cash, téléphone, bon d’achat..."
              value={form.prizeDescription}
            />
          </label>

          <div className="form-grid three-columns">
            <label>
              <span>Début</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, startsAt: event.target.value })
                }
                type="datetime-local"
                value={form.startsAt}
              />
            </label>

            <label>
              <span>Fin</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, endsAt: event.target.value })
                }
                type="datetime-local"
                value={form.endsAt}
              />
            </label>

            <label>
              <span>Statut</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, status: event.target.value as ContestStatus })
                }
                value={form.status}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Limite participants</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, maxParticipants: event.target.value })
                }
                placeholder="Illimité"
                type="number"
                value={form.maxParticipants}
              />
            </label>

            <label className="switch-row">
              <span>Boosté</span>
              <input
                checked={form.isBoosted}
                onChange={(event) =>
                  onChange({ ...form, isBoosted: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le concours'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PartnerContestModal({
  categories,
  error,
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
  types,
}: {
  categories: CategoryOption[]
  error: string
  form: ContestFormState
  isSaving: boolean
  onChange: (next: ContestFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  types: ContestTypeOption[]
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Créer un concours partenaire" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Espace partenaire</p>
            <h2>Nouveau concours</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="contest-context-note">
            <strong>Validation Super Admin</strong>
            <p>
              Le concours sera enregistré en attente. Il deviendra visible dans
              l’app mobile uniquement après validation du Super Admin.
            </p>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Titre</span>
              <input
                onChange={(event) => onChange({ ...form, title: event.target.value })}
                placeholder="Grand jeu Orange CI"
                value={form.title}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, type: event.target.value as ContestType })
                }
                value={form.type}
              >
                <option value="">Choisir</option>
                {types.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Explique le principe du concours et les conditions."
              rows={4}
              value={form.description}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Catégorie</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, categoryId: event.target.value })
                }
                value={form.categoryId}
              >
                <option value="">Choisir</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Image URL</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, imageUrl: event.target.value })
                }
                placeholder="https://..."
                value={form.imageUrl}
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Valeur du prix</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, prizeValue: event.target.value })
                }
                placeholder="50000"
                type="number"
                value={form.prizeValue}
              />
            </label>

            <label>
              <span>Nombre de gagnants</span>
              <input
                inputMode="numeric"
                min="1"
                onChange={(event) =>
                  onChange({ ...form, winnersCount: event.target.value })
                }
                type="number"
                value={form.winnersCount}
              />
            </label>
          </div>

          <label>
            <span>Description du prix</span>
            <input
              onChange={(event) =>
                onChange({ ...form, prizeDescription: event.target.value })
              }
              placeholder="Cash, téléphone, bon d’achat..."
              value={form.prizeDescription}
            />
          </label>

          <div className="form-grid three-columns">
            <label>
              <span>Début</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, startsAt: event.target.value })
                }
                type="datetime-local"
                value={form.startsAt}
              />
            </label>

            <label>
              <span>Fin</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, endsAt: event.target.value })
                }
                type="datetime-local"
                value={form.endsAt}
              />
            </label>

            <label>
              <span>Limite participants</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, maxParticipants: event.target.value })
                }
                placeholder="Illimité"
                type="number"
                value={form.maxParticipants}
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Envoi...' : 'Envoyer au Super Admin'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PartnerSectorModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: PartnerSectorFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: PartnerSectorFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Secteur partenaire" className="category-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Secteurs</p>
            <h2>{mode === 'create' ? 'Nouveau secteur' : 'Modifier secteur'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form" onSubmit={onSubmit}>
          <label>
            <span>Nom</span>
            <input
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Télécom"
              value={form.name}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Opérateurs télécom, internet, mobile money..."
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Ordre</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, orderIndex: event.target.value })
                }
                type="number"
                value={form.orderIndex}
              />
            </label>

            <label className="switch-row">
              <span>Secteur actif</span>
              <input
                checked={form.isActive}
                onChange={(event) =>
                  onChange({ ...form, isActive: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button className="inline-action-button" disabled={isSaving} type="submit">
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PartnerAccessModal({
  error,
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
  partner,
}: {
  error: string
  form: PartnerAccessFormState
  isSaving: boolean
  onChange: (next: PartnerAccessFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  partner: PartnerItem
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Accès partenaire" className="category-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Accès partenaire</p>
            <h2>{partner.companyName}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form" onSubmit={onSubmit}>
          <div className="compact-list">
            <article>
              <div>
                <strong>Email de connexion</strong>
                <p>{partner.email}</p>
              </div>
              <span className="status-pill pending">Auth</span>
            </article>
          </div>

          <label>
            <span>Nouveau mot de passe</span>
            <input
              autoComplete="new-password"
              onChange={(event) => onChange({ password: event.target.value })}
              placeholder="8 caractères minimum"
              type="password"
              value={form.password}
            />
          </label>

          <p className="modal-helper-text">
            Ce mot de passe sera appliqué au compte Auth partenaire puis envoyé
            par email via le template premium.
          </p>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button className="inline-action-button" disabled={isSaving} type="submit">
              {isSaving ? 'Envoi...' : 'Envoyer les accès'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PartnerModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
  sectors,
}: {
  error: string
  form: PartnerFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: PartnerFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  sectors: PartnerSectorItem[]
}) {
  const activeSectors = sectors.filter((sector) => sector.isActive)

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Partenaire" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Partenaires</p>
            <h2>{mode === 'create' ? 'Nouveau partenaire' : 'Modifier partenaire'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="form-grid two-columns">
            <label>
              <span>Nom de la marque</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, companyName: event.target.value })
                }
                placeholder="Ex: Orange CI"
                value={form.companyName}
              />
            </label>

            <label>
              <span>Email</span>
              <input
                inputMode="email"
                onChange={(event) => onChange({ ...form, email: event.target.value })}
                placeholder="contact@marque.ci"
                type="email"
                value={form.email}
              />
            </label>
          </div>

          {mode === 'create' ? (
            <label>
              <span>Mot de passe partenaire</span>
              <input
                autoComplete="new-password"
                onChange={(event) =>
                  onChange({ ...form, password: event.target.value })
                }
                placeholder="8 caractères minimum"
                type="password"
                value={form.password}
              />
            </label>
          ) : null}

          <div className="form-grid two-columns">
            <label>
              <span>Secteur</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, sector: event.target.value })
                }
                value={form.sector}
              >
                <option value="">Sélectionner un secteur</option>
                {activeSectors.map((sector) => (
                  <option key={sector.id} value={sector.name}>
                    {sector.name}
                  </option>
                ))}
                {form.sector &&
                !activeSectors.some((sector) => sector.name === form.sector) ? (
                  <option value={form.sector}>{form.sector}</option>
                ) : null}
              </select>
            </label>

            <label>
              <span>Téléphone</span>
              <input
                inputMode="tel"
                onChange={(event) => onChange({ ...form, phone: event.target.value })}
                placeholder="+225..."
                value={form.phone}
              />
            </label>
          </div>

          <label>
            <span>Logo URL</span>
            <input
              onChange={(event) => onChange({ ...form, logoUrl: event.target.value })}
              placeholder="https://..."
              value={form.logoUrl}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Plan</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, subscriptionPlan: event.target.value })
                }
                value={form.subscriptionPlan}
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label>
              <span>Expiration abonnement</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, subscriptionExpiresAt: event.target.value })
                }
                type="datetime-local"
                value={form.subscriptionExpiresAt}
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label className="switch-row">
              <span>Validé</span>
              <input
                checked={form.isValidated}
                onChange={(event) =>
                  onChange({ ...form, isValidated: event.target.checked })
                }
                type="checkbox"
              />
            </label>

            <label className="switch-row">
              <span>Actif</span>
              <input
                checked={form.isActive}
                onChange={(event) =>
                  onChange({ ...form, isActive: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le partenaire'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PartnerPlanModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: PartnerPlanFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: PartnerPlanFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Forfait partenaire" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Forfaits</p>
            <h2>{mode === 'create' ? 'Nouveau forfait' : 'Modifier forfait'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="form-grid two-columns">
            <label>
              <span>Clé</span>
              <input
                disabled={mode === 'edit'}
                onChange={(event) => onChange({ ...form, key: event.target.value })}
                placeholder="starter"
                value={form.key}
              />
            </label>

            <label>
              <span>Nom</span>
              <input
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="Starter"
                value={form.name}
              />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Description courte du forfait"
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid three-columns">
            <label>
              <span>Prix</span>
              <input
                inputMode="numeric"
                onChange={(event) => onChange({ ...form, price: event.target.value })}
                type="number"
                value={form.price}
              />
            </label>

            <label>
              <span>Durée jours</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, durationDays: event.target.value })
                }
                type="number"
                value={form.durationDays}
              />
            </label>

            <label>
              <span>Ordre</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, orderIndex: event.target.value })
                }
                type="number"
                value={form.orderIndex}
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Max concours</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, maxContests: event.target.value })
                }
                placeholder="Illimité"
                type="number"
                value={form.maxContests}
              />
            </label>

            <label>
              <span>Max boosts</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, maxBoosts: event.target.value })
                }
                placeholder="Illimité"
                type="number"
                value={form.maxBoosts}
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label className="switch-row">
              <span>Quiz</span>
              <input
                checked={form.canCreateQuiz}
                onChange={(event) =>
                  onChange({ ...form, canCreateQuiz: event.target.checked })
                }
                type="checkbox"
              />
            </label>

            <label className="switch-row">
              <span>Pronostic</span>
              <input
                checked={form.canCreatePronostic}
                onChange={(event) =>
                  onChange({ ...form, canCreatePronostic: event.target.checked })
                }
                type="checkbox"
              />
            </label>

            <label className="switch-row">
              <span>Stats</span>
              <input
                checked={form.canAccessStats}
                onChange={(event) =>
                  onChange({ ...form, canAccessStats: event.target.checked })
                }
                type="checkbox"
              />
            </label>

            <label className="switch-row">
              <span>Featured</span>
              <input
                checked={form.canBeFeatured}
                onChange={(event) =>
                  onChange({ ...form, canBeFeatured: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>

          <label className="switch-row">
            <span>Forfait actif</span>
            <input
              checked={form.isActive}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.checked })
              }
              type="checkbox"
            />
          </label>

          <label>
            <span>Avantages, un par ligne</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, benefitsText: event.target.value })
              }
              placeholder={'3 concours par mois\nStatistiques essentielles\n1 boost inclus'}
              rows={6}
              value={form.benefitsText}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le forfait'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PlayerPlanModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: PlayerPlanFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: PlayerPlanFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Forfait joueur" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Forfaits joueurs</p>
            <h2>{mode === 'create' ? 'Nouveau forfait joueur' : 'Modifier forfait joueur'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="form-grid two-columns">
            <label>
              <span>Clé</span>
              <input
                disabled={mode === 'edit'}
                onChange={(event) => onChange({ ...form, key: event.target.value })}
                placeholder="premium"
                value={form.key}
              />
            </label>

            <label>
              <span>Nom</span>
              <input
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="Premium"
                value={form.name}
              />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Description courte du forfait joueur"
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid three-columns">
            <label>
              <span>Prix</span>
              <input
                inputMode="numeric"
                onChange={(event) => onChange({ ...form, price: event.target.value })}
                type="number"
                value={form.price}
              />
            </label>

            <label>
              <span>Durée jours</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, durationDays: event.target.value })
                }
                type="number"
                value={form.durationDays}
              />
            </label>

            <label>
              <span>Ordre</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, orderIndex: event.target.value })
                }
                type="number"
                value={form.orderIndex}
              />
            </label>
          </div>

          <div className="form-grid three-columns">
            <label>
              <span>Participations/jour</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, dailyParticipationLimit: event.target.value })
                }
                type="number"
                value={form.dailyParticipationLimit}
              />
            </label>

            <label>
              <span>Tickets bonus</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, bonusTickets: event.target.value })
                }
                type="number"
                value={form.bonusTickets}
              />
            </label>

            <label>
              <span>Multiplicateur badges</span>
              <input
                inputMode="decimal"
                min="1"
                onChange={(event) =>
                  onChange({ ...form, badgeMultiplier: event.target.value })
                }
                step="0.1"
                type="number"
                value={form.badgeMultiplier}
              />
            </label>
          </div>

          <label className="switch-row">
            <span>Forfait actif</span>
            <input
              checked={form.isActive}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.checked })
              }
              type="checkbox"
            />
          </label>

          <label>
            <span>Avantages, un par ligne</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, benefitsText: event.target.value })
              }
              placeholder={'10 participations par jour\n1 ticket bonus sur les tirages\nProgression badges x1.5'}
              rows={6}
              value={form.benefitsText}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le forfait'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function WinnerModal({
  contests,
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onContestChange,
  onSubmit,
  users,
}: {
  contests: ContestOption[]
  error: string
  form: WinnerFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: WinnerFormState) => void
  onClose: () => void
  onContestChange: (contestId: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  users: UserOption[]
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Gagnant" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Récompenses</p>
            <h2>{mode === 'create' ? 'Nouveau gagnant' : 'Modifier gagnant'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          <div className="form-grid two-columns">
            <label>
              <span>Joueur</span>
              <select
                onChange={(event) => onChange({ ...form, userId: event.target.value })}
                value={form.userId}
              >
                <option value="">Choisir</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Concours</span>
              <select
                onChange={(event) => onContestChange(event.target.value)}
                value={form.contestId}
              >
                <option value="">Choisir</option>
                {contests.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Valeur du gain</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, prizeValue: event.target.value })
                }
                type="number"
                value={form.prizeValue}
              />
            </label>

            <label>
              <span>Statut</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, status: event.target.value as WinnerStatus })
                }
                value={form.status}
              >
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <label>
            <span>Description du gain</span>
            <input
              onChange={(event) =>
                onChange({ ...form, prizeDescription: event.target.value })
              }
              placeholder="Cash, téléphone, bon d’achat..."
              value={form.prizeDescription}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Méthode paiement</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, paymentMethod: event.target.value })
                }
                value={form.paymentMethod}
              >
                <option value="mobile_money">Mobile Money</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Virement</option>
                <option value="gift">Cadeau physique</option>
              </select>
            </label>

            <label>
              <span>Numéro paiement</span>
              <input
                inputMode="tel"
                onChange={(event) =>
                  onChange({ ...form, paymentNumber: event.target.value })
                }
                placeholder="+225..."
                value={form.paymentNumber}
              />
            </label>
          </div>

          <label>
            <span>Date d’envoi</span>
            <input
              onChange={(event) => onChange({ ...form, sentAt: event.target.value })}
              type="datetime-local"
              value={form.sentAt}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le gagnant'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CountryFlagPreview({ flag }: { flag: string }) {
  if (flag === 'orange-white-green') {
    return (
      <span className="country-flag-preview" aria-label="Drapeau Côte d'Ivoire">
        <span style={{ background: '#ff8200' }} />
        <span style={{ background: '#ffffff' }} />
        <span style={{ background: '#009a44' }} />
      </span>
    )
  }

  return <span className="country-flag-code">{flag || 'flag'}</span>
}

function CountryModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: CountryFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: CountryFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Pays" className="category-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Pays</p>
            <h2>{mode === 'create' ? 'Nouveau pays' : 'Modifier pays'}</h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form" onSubmit={onSubmit}>
          <label>
            <span>Nom</span>
            <input
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Cote d'Ivoire"
              value={form.name}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Indicatif</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, dialCode: event.target.value })
                }
                placeholder="+225"
                value={form.dialCode}
              />
            </label>

            <label>
              <span>Nombre de chiffres</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, phoneDigits: event.target.value })
                }
                type="number"
                value={form.phoneDigits}
              />
            </label>
          </div>

          <label>
            <span>Flag</span>
            <input
              onChange={(event) => onChange({ ...form, flag: event.target.value })}
              placeholder="orange-white-green"
              value={form.flag}
            />
          </label>

          <label className="check-row">
            <input
              checked={form.isActive}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.checked })
              }
              type="checkbox"
            />
            <span>Pays actif</span>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button className="inline-action-button" disabled={isSaving} type="submit">
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function SuperAdminNotificationsPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [users, setUsers] = useState<UserOption[]>([])
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
  })

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, phone, is_premium, is_active')
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
        })),
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Impossible de charger les joueurs.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useRealtimeRefresh('sa-notifications-realtime', ['users', 'notifications'], loadUsers)

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const title = form.title.trim()
    const body = form.body.trim()
    if (title.length < 3 || body.length < 3) {
      setError('Titre et message sont obligatoires.')
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

      const notificationData = {
        ...(form.contestId.trim() ? { contest_id: form.contestId.trim() } : {}),
      }

      const { error: insertError } = await supabase.from('notifications').insert(
        targetIds.map((userId) => ({
          id: createClientUuid(),
          user_id: userId,
          title,
          body,
          type: form.type,
          is_read: false,
          data: notificationData,
          created_at: new Date().toISOString(),
        })),
      )

      if (insertError) throw insertError

      try {
        await supabase.functions.invoke('send-push-notifications', {
          body: {
            userIds: targetIds,
            title,
            body,
            type: form.type,
            data: notificationData,
          },
        })
      } catch {
        // La ligne Supabase est créée même si l'Edge Function push n'est pas encore déployée.
      }

      setSuccess(`${targetIds.length} notification(s) créée(s).`)
      setForm({
        target: 'all',
        userId: '',
        userIds: [],
        title: '',
        body: '',
        type: 'info',
        contestId: '',
      })
    } catch (error) {
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              to={item.href}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {navItems.slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Notifications</span>
          <strong>{users.length} joueurs chargés</strong>
          <p>Envoi groupé ou individuel vers l’app mobile.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communication</p>
            <h1>Notifications push</h1>
            <p className="page-subtitle">
              Crée une notification in-app et déclenche le push si l’Edge Function est déployée.
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
          <div className="dashboard-alert success" role="status">
            <div>
              <strong>Envoi préparé</strong>
              <p>{success}</p>
            </div>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Composer</p>
              <h2>Nouvelle notification</h2>
            </div>
            <span className="pill">{isLoading ? 'Chargement' : 'Prêt'}</span>
          </div>

          <form className="category-form contest-form" onSubmit={handleSubmit}>
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
                      {user.label}
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
                      <span>{user.label}</span>
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

            <div className="modal-actions">
              <button className="inline-action-button" disabled={isSending} type="submit">
                {isSending ? 'Envoi...' : 'Créer et envoyer'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  )
}

function PartnerPreview() {
  const navigate = useNavigate()
  const [partner, setPartner] = useState<PartnerSession | null>(null)
  const [contests, setContests] = useState<PartnerDashboardContest[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [types, setTypes] = useState<ContestTypeOption[]>([])
  const [contestForm, setContestForm] = useState<ContestFormState>(
    createDefaultContestForm,
  )
  const [isContestModalOpen, setIsContestModalOpen] = useState(false)
  const [isSavingContest, setIsSavingContest] = useState(false)
  const [contestError, setContestError] = useState('')
  const [partnerNotice, setPartnerNotice] = useState('')
  const [partnerContestSearch, setPartnerContestSearch] = useState('')
  const [partnerContestStatusFilter, setPartnerContestStatusFilter] = useState('all')
  const [partnerContestTypeFilter, setPartnerContestTypeFilter] = useState('all')
  const [activePartnerView, setActivePartnerView] = useState<
    'dashboard' | 'contests' | 'subscription'
  >('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const dashboardStats = useMemo(() => {
    const activeContests = contests.filter((contest) => contest.status === 'active')
    const boostedContests = contests.filter((contest) => contest.isBoosted)
    const totalViews = contests.reduce(
      (total, contest) => total + contest.viewsCount,
      0,
    )
    const totalPrizeValue = contests.reduce(
      (total, contest) => total + contest.prizeValue,
      0,
    )

    return {
      activeContests: activeContests.length,
      boostedContests: boostedContests.length,
      totalContests: contests.length,
      totalPrizeValue,
      totalViews,
    }
  }, [contests])

  const filteredPartnerContests = useMemo(() => {
    const cleanedSearch = partnerContestSearch.trim().toLowerCase()

    return contests.filter((contest) => {
      const matchesSearch =
        cleanedSearch.length === 0 ||
        [contest.title, contest.category, contest.type]
          .join(' ')
          .toLowerCase()
          .includes(cleanedSearch)
      const matchesStatus =
        partnerContestStatusFilter === 'all' ||
        contest.status === partnerContestStatusFilter
      const matchesType =
        partnerContestTypeFilter === 'all' ||
        contest.type === partnerContestTypeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [
    contests,
    partnerContestSearch,
    partnerContestStatusFilter,
    partnerContestTypeFilter,
  ])

  const loadPartnerDashboard = useCallback(
    async (isMounted: () => boolean) => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        navigate(PARTNER_AUTH_ROUTE, { replace: true })
        return
      }

      const nextPartner = await resolvePartnerSessionByUser(
        data.user.id,
        data.user.email,
      )
      const [nextContests, catalog] = await Promise.all([
        fetchPartnerDashboardContests(nextPartner.id),
        fetchPartnerContestCatalog(),
      ])
      if (!isMounted()) return
      setPartner(nextPartner)
      setContests(nextContests)
      setCategories(catalog.categories)
      setTypes(catalog.types)
      void registerWebPushToken(data.user.id, 'partner-web').catch((error) => {
        console.warn('[MegaPromo][FCM][partner-web] token non enregistré', error)
      })
    },
    [navigate],
  )

  useEffect(() => {
    let isMounted = true

    void loadPartnerDashboard(() => isMounted)
      .catch((error) => {
        if (!isMounted) return
        setError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger cet espace partenaire.',
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [loadPartnerDashboard])

  async function handlePartnerLogout() {
    await supabase.auth.signOut()
    navigate(PARTNER_AUTH_ROUTE, { replace: true })
  }

  function openPartnerContestModal() {
    if (!partner) return
    setContestError('')
    setPartnerNotice('')
    setContestForm({
      ...createDefaultContestForm(),
      partnerId: partner.id,
      brandName: partner.companyName,
      brandLogoUrl: partner.logoUrl,
      status: 'pending',
    })
    setIsContestModalOpen(true)
  }

  function closePartnerContestModal() {
    if (isSavingContest) return
    setContestError('')
    setIsContestModalOpen(false)
  }

  async function handlePartnerContestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!partner) return

    setContestError('')
    setPartnerNotice('')

    const title = contestForm.title.trim()
    const description = contestForm.description.trim()
    const prizeDescription = contestForm.prizeDescription.trim()
    const prizeValue = Number(contestForm.prizeValue)
    const winnersCount = Number(contestForm.winnersCount)
    const maxParticipants = contestForm.maxParticipants
      ? Number(contestForm.maxParticipants)
      : null
    const startsAt = new Date(contestForm.startsAt)
    const endsAt = new Date(contestForm.endsAt)
    const selectedCategory = categories.find(
      (category) => category.id === contestForm.categoryId,
    )
    const selectedType = types.find((type) => type.key === contestForm.type)

    if (title.length < 3) {
      setContestError('Le titre doit contenir au moins 3 caractères.')
      return
    }

    if (!description) {
      setContestError('Ajoute une description du concours.')
      return
    }

    if (!selectedCategory) {
      setContestError('Choisis une catégorie.')
      return
    }

    if (!selectedType) {
      setContestError('Choisis un type de concours.')
      return
    }

    if (!Number.isFinite(prizeValue) || prizeValue <= 0) {
      setContestError('La valeur du prix doit être supérieure à 0.')
      return
    }

    if (!Number.isFinite(winnersCount) || winnersCount <= 0) {
      setContestError('Le nombre de gagnants doit être supérieur à 0.')
      return
    }

    if (maxParticipants !== null && (!Number.isFinite(maxParticipants) || maxParticipants <= 0)) {
      setContestError('La limite de participants doit être vide ou supérieure à 0.')
      return
    }

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setContestError('Renseigne les dates de début et de fin.')
      return
    }

    if (endsAt <= startsAt) {
      setContestError('La date de fin doit être après la date de début.')
      return
    }

    setIsSavingContest(true)

    try {
      const contestId = createClientUuid()
      const { error } = await supabase.from('contests').insert({
        id: contestId,
        partner_id: partner.id,
        title,
        description,
        image_url: contestForm.imageUrl.trim() || null,
        type: contestForm.type,
        category: selectedCategory.name,
        category_id: selectedCategory.id,
        status: 'pending',
        prize_description: prizeDescription || null,
        brand_logo_url: contestForm.brandLogoUrl.trim() || null,
        brand_name: contestForm.brandName.trim() || partner.companyName,
        prize_value: prizeValue,
        winners_count: winnersCount,
        max_participants: maxParticipants,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_boosted: false,
        views_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      setContests(await fetchPartnerDashboardContests(partner.id))
      const pushPayload = {
        audience: 'admins',
        title: 'Concours partenaire à valider',
        body: `${partner.companyName} a soumis le concours "${title}".`,
        type: 'partner_contest_review',
        data: {
          contest_id: contestId,
          contestId,
          partner_id: partner.id,
          type: 'partner_contest_review',
          source: 'partner_contest_submission',
        },
      }
      console.info('[MegaPromo][partnerContest][pushPayload]', pushPayload)
      try {
        const pushResponse = await supabase.functions.invoke(
          'send-push-notifications',
          {
            body: pushPayload,
          },
        )
        console.info('[MegaPromo][partnerContest][pushResponse]', pushResponse)
      } catch (pushError) {
        console.warn('[MegaPromo][partnerContest][pushError]', pushError)
      }
      setPartnerNotice('Concours envoyé au Super Admin pour validation.')
      setContestError('')
      setIsContestModalOpen(false)
      setActivePartnerView('contests')
    } catch (error) {
      setContestError(
        error instanceof Error
          ? error.message
          : 'Impossible de créer ce concours.',
      )
    } finally {
      setIsSavingContest(false)
    }
  }

  if (isLoading || error || !partner) {
    return (
      <main className="preview-page">
        <div className="preview-card">
          <p className="eyebrow">Espace partenaire</p>
          {isLoading ? (
            <>
              <h1>Chargement de ton espace...</h1>
              <p>Vérification du compte partenaire en cours.</p>
            </>
          ) : (
            <>
              <h1>Accès partenaire refusé.</h1>
              <p>{error || 'Impossible de charger cet espace partenaire.'}</p>
              <button
                className="primary-link"
                onClick={handlePartnerLogout}
                type="button"
              >
                Retour connexion
              </button>
            </>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar partner-sidebar">
        <div className="brand">
          <div className="brand-mark">
            {partner.logoUrl ? (
              <img alt="" className="partner-brand-image" src={partner.logoUrl} />
            ) : (
              partner.companyName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <strong>MegaPromo</strong>
            <small>Espace partenaire</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation partenaire">
          <span className="nav-section-label">Partenaire</span>
          <button
            className={activePartnerView === 'dashboard' ? 'active' : ''}
            onClick={() => setActivePartnerView('dashboard')}
            type="button"
          >
            <span className="nav-icon">DB</span>
            Dashboard
          </button>
          <button
            className={activePartnerView === 'contests' ? 'active' : ''}
            onClick={() => setActivePartnerView('contests')}
            type="button"
          >
            <span className="nav-icon">CX</span>
            Concours
          </button>
          <button
            className={activePartnerView === 'subscription' ? 'active' : ''}
            onClick={() => setActivePartnerView('subscription')}
            type="button"
          >
            <span className="nav-icon">AB</span>
            Abonnement
          </button>
        </nav>

        <div className="sidebar-card">
          <span>Compte partenaire</span>
          <strong>{partner.subscriptionPlan || 'free'}</strong>
          <div className="partner-sidebar-metrics">
            <small>
              <b>{formatNumber(dashboardStats.totalContests)}</b>
              concours
            </small>
            <small>
              <b>{formatNumber(dashboardStats.totalViews)}</b>
              vues
            </small>
          </div>
          <p>
            {partner.subscriptionExpiresAt
              ? `Expire le ${formatDate(partner.subscriptionExpiresAt)}`
              : 'Aucune date d’expiration définie.'}
          </p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Espace partenaire</p>
            <h1>
              {activePartnerView === 'dashboard'
                ? partner.companyName
                : activePartnerView === 'contests'
                  ? 'Concours'
                  : 'Abonnement'}
            </h1>
            <p className="page-subtitle">
              {activePartnerView === 'dashboard'
                ? 'Suivi minimum de tes concours, vues et statut d’abonnement.'
                : activePartnerView === 'contests'
                  ? 'Liste des concours enregistrés et création de nouveaux jeux.'
                  : 'Statut du compte partenaire et informations de forfait.'}
            </p>
          </div>

          <div className="topbar-actions">
            <div className="admin-chip">
              <span>{partner.companyName.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{partner.companyName}</strong>
                <small>{partner.email}</small>
              </div>
            </div>
            <button className="logout-button" onClick={handlePartnerLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {partnerNotice ? (
          <div className="dashboard-success">
            <span />
            <p>{partnerNotice}</p>
          </div>
        ) : null}

        {activePartnerView === 'dashboard' ? (
          <section className="stats-grid" aria-label="Statistiques partenaire">
            <article className="stat-card">
              <span>Concours</span>
              <strong>{formatNumber(dashboardStats.totalContests)}</strong>
              <p>Total créé pour ce partenaire.</p>
            </article>
            <article className="stat-card">
              <span>Actifs</span>
              <strong>{formatNumber(dashboardStats.activeContests)}</strong>
              <p>Concours actuellement visibles.</p>
            </article>
            <article className="stat-card">
              <span>Vues</span>
              <strong>{formatNumber(dashboardStats.totalViews)}</strong>
              <p>Somme des vues enregistrées.</p>
            </article>
            <article className="stat-card">
              <span>Lots</span>
              <strong>{formatMoney(dashboardStats.totalPrizeValue)}</strong>
              <p>Valeur totale des lots déclarés.</p>
            </article>
          </section>
        ) : null}

        {activePartnerView === 'contests' ? (
          <section className="partner-page-section">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Mes concours</p>
                  <h2>Liste des concours enregistrés</h2>
                </div>
                <div className="section-heading-actions">
                  <span className="pill">
                    {formatNumber(filteredPartnerContests.length)} / {formatNumber(contests.length)}
                  </span>
                  <button
                    className="primary-button"
                    onClick={openPartnerContestModal}
                    type="button"
                  >
                    Créer un concours
                  </button>
                </div>
              </div>

              <div className="contest-filter-bar compact">
                <input
                  className="search-input"
                  onChange={(event) => setPartnerContestSearch(event.target.value)}
                  placeholder="Rechercher un concours..."
                  value={partnerContestSearch}
                />
                <select
                  onChange={(event) => setPartnerContestStatusFilter(event.target.value)}
                  value={partnerContestStatusFilter}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  onChange={(event) => setPartnerContestTypeFilter(event.target.value)}
                  value={partnerContestTypeFilter}
                >
                  <option value="all">Tous les types</option>
                  {types.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredPartnerContests.length === 0 ? (
                <p className="empty-panel-text">
                  {contests.length > 0
                    ? 'Aucun concours ne correspond aux filtres.'
                    : 'Aucun concours n’est encore rattaché à ce partenaire.'}
                </p>
              ) : (
                <div className="partner-dashboard-list">
                  {filteredPartnerContests.map((contest) => (
                    <article className="partner-dashboard-row" key={contest.id}>
                      <div>
                        <strong>{contest.title}</strong>
                        <p>
                          {contest.category} · {contest.type} · {formatMoney(contest.prizeValue)}
                        </p>
                      </div>
                      <span className={`status-pill ${contest.status}`}>
                        {contest.status}
                      </span>
                      <span>{formatNumber(contest.viewsCount)} vues</span>
                      <span>{contest.isBoosted ? 'Boosté' : 'Standard'}</span>
                      <small>{formatDate(contest.endsAt)}</small>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}

        {activePartnerView === 'subscription' ? (
          <section className="partner-page-section">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Abonnement</p>
                  <h2>Statut du compte</h2>
                </div>
                <span className="status-pill active">Validé</span>
              </div>

              <div className="compact-list">
                <article>
                  <div>
                    <strong>Forfait</strong>
                    <p>{partner.subscriptionPlan || 'free'}</p>
                  </div>
                  <span>{dashboardStats.boostedContests} boost</span>
                </article>
                <article>
                  <div>
                    <strong>Secteur</strong>
                    <p>{partner.sector || 'Non renseigné'}</p>
                  </div>
                  <span>Actif</span>
                </article>
                <article>
                  <div>
                    <strong>Expiration</strong>
                    <p>
                      {partner.subscriptionExpiresAt
                        ? formatDate(partner.subscriptionExpiresAt)
                        : 'Non définie'}
                    </p>
                  </div>
                  <span>Suivi SA</span>
                </article>
              </div>
            </article>
          </section>
        ) : null}
      </section>

      {isContestModalOpen ? (
        <PartnerContestModal
          categories={categories}
          error={contestError}
          form={contestForm}
          isSaving={isSavingContest}
          onChange={setContestForm}
          onClose={closePartnerContestModal}
          onSubmit={handlePartnerContestSubmit}
          types={types}
        />
      ) : null}
    </main>
  )
}

export default App
