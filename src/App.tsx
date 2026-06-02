import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { adminRoleLabel } from './auth/admin-auth'
import { useAdminAuth } from './auth/useAdminAuth'
import { SuperAdminAccessPage } from './features/adminAccess/SuperAdminAccessPage'
import { hasAdminPermission } from './features/adminAccess/permissions'
import {
  DashboardBreakdownCard,
  DashboardEngagementCard,
  DashboardTrendCard,
  SuperAdminDashboard,
  buildBreakdown,
  buildLastSevenDaysTrend,
} from './features/dashboard/SuperAdminDashboard'
import { SuperAdminCategoriesPage } from './features/categories/SuperAdminCategoriesPage'
import {
  SuperAdminContestsPage,
  SuperAdminLiveSeriesPage,
} from './features/contests/SuperAdminContestsPage'
import { SuperAdminCountriesPage } from './features/countries/SuperAdminCountriesPage'
import { SuperAdminPartnersPage } from './features/partners/SuperAdminPartnersPage'
import { SuperAdminPlansPage } from './features/plans/SuperAdminPlansPage'
import { SuperAdminQuestionBanksPage } from './features/questionBanks/SuperAdminQuestionBanksPage'
import { SuperAdminRewardCatalogPage } from './features/rewardCatalog/SuperAdminRewardCatalogPage'
import { SuperAdminRewardHistoryPage } from './features/rewardHistory/SuperAdminRewardHistoryPage'
import { SuperAdminSubscriptionHistoryPage } from './features/subscriptionHistory/SuperAdminSubscriptionHistoryPage'
import { SuperAdminPartnerSectorsPage } from './features/sectors/SuperAdminPartnerSectorsPage'
import { SuperAdminLandingPage } from './features/landingAdmin/SuperAdminLandingPage'
import { SuperAdminMaintenancePage } from './features/maintenance/SuperAdminMaintenancePage'
import { SuperAdminNotificationsPage } from './features/notifications/SuperAdminNotificationsPage'
import { SuperAdminSettingsPage } from './features/settings/SuperAdminSettingsPage'
import { SuperAdminSentryIssuesPage } from './features/sentry/SuperAdminSentryIssuesPage'
import { SuperAdminSystemLogsPage } from './features/systemLogs/SuperAdminSystemLogsPage'
import { SuperAdminWinnersPage } from './features/winners/SuperAdminWinnersPage'
import { SuperAdminUsersPage } from './features/users/SuperAdminUsersPage'
import { LandingPage as PublicLandingPage } from './features/landing/LandingPage'
import { LegalPage as PublicLegalPage } from './features/landing/LegalPage'
import { PartnerContestsPanel } from './features/partnerAdmin/contests/PartnerContestsPanel'
import { supabase } from './lib/supabase'
import { logAdminAction, logError, logPartnerAction } from './lib/systemLogger'
import { registerWebPushToken } from './lib/webPush'

type AuthRole = 'super-admin' | 'partner'
type ContestType = string
type ContestStatus = 'draft' | 'pending' | 'active' | 'inactive'
type PlayerPlanAccessKey = 'free' | 'premium' | 'vip'
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
  rewardCatalogId: string
  rewardType: string
  rewardLabel: string
  winnersCount: number
  maxParticipants: number | null
  startsAt: string
  endsAt: string
  isBoosted: boolean
  allowedPlayerPlanKeys: PlayerPlanAccessKey[]
  isLive: boolean
  liveStartsAt: string
  liveStatus: string
  registeredCount: number
  connectedCount: number
  currentQuestionIndex: number
  participants: number
}
type PartnerSession = {
  id: string
  companyName: string
  email: string
  logoUrl: string
  sector: string
  phone: string
  subscriptionPlan: string
  subscriptionExpiresAt: string
  isValidated: boolean
  isActive: boolean
}
type PartnerDashboardContest = {
  id: string
  title: string
  description: string
  category: string
  categoryId: string
  type: string
  status: string
  imageUrl: string
  brandLogoUrl: string
  brandName: string
  prizeDescription: string
  viewsCount: number
  sharesCount: number
  prizeValue: number
  winnersCount: number
  maxParticipants: number | null
  startsAt: string
  endsAt: string
  isBoosted: boolean
  allowedPlayerPlanKeys: PlayerPlanAccessKey[]
  participants: number
  createdAt: string
}
type PartnerParticipationHistoryItem = {
  id: string
  contestId: string
  contestTitle: string
  userId: string
  userLabel: string
  score: number
  rank: number
  completed: boolean
  participatedAt: string
  answers: string
}
type PartnerPlayerItem = {
  id: string
  label: string
  phone: string
  username: string
  avatarUrl: string
  participations: number
  bestScore: number
  lastPlayedAt: string
}
type PartnerSubscriptionHistoryItem = {
  id: string
  planName: string
  amount: number
  status: string
  startsAt: string
  expiresAt: string
  paymentMethod: string
  createdAt: string
}
type PartnerAvailablePlan = {
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
  benefits: string[]
}
type PartnerProfileFormState = {
  companyName: string
  email: string
  logoUrl: string
  sector: string
  phone: string
}
type PartnerPasswordFormState = {
  password: string
  confirmPassword: string
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
  rawAnswers: unknown
}
type ContestHistoryData = {
  contest: ContestItem
  participations: ContestHistoryItem[]
  questions: QuizQuestionItem[]
}
type QuizQuestionItem = {
  id: string
  questionText: string
  questionImageUrl: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionAImageUrl: string
  optionBImageUrl: string
  optionCImageUrl: string
  optionDImageUrl: string
  correctAnswer: string
  points: number
  timeLimit: number
  orderIndex: number
}
type QuizQuestionFormState = {
  questionText: string
  questionImageUrl: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionAImageUrl: string
  optionBImageUrl: string
  optionCImageUrl: string
  optionDImageUrl: string
  correctAnswer: string
  points: string
  timeLimit: string
  orderIndex: string
}
type GeneratedQuizQuestion = {
  question: string
  options: string[]
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: string
  category: string
  time_limit: number
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
  fcmToken: string
  fcmTokenPlatform: string
  fcmTokenUpdatedAt: string
  fcmTokenLastError: string
  fcmTokenLastErrorAt: string
  isPremium: boolean
  premiumExpiresAt: string
  pointsTotal: number
  globalRank: number | null
  participationsToday: number
  lastParticipationDate: string
  deviceInfo: Record<string, unknown>
  locationInfo: Record<string, unknown>
  deviceLastSeenAt: string
  isActive: boolean
  createdAt: string
}
type UserRoleFilter = 'player' | 'partner' | 'all_non_admin'
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
type PlayerKycRequestItem = {
  id: string
  userId: string
  playerName: string
  playerPhone: string
  documentType: string
  documentFrontUrl: string
  documentBackUrl: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  createdAt: string
  reviewedAt: string
}
type SupabaseLikeError = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
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
type PlayerSubscriptionAssignState = {
  planId: string
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
  contestId: string
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
type PlayerSavedPaymentMethodItem = {
  id: string
  operatorName: string
  operatorKey: string
  phone: string
  label: string
  isPrimary: boolean
  isWhatsapp: boolean
  status: string
  createdAt: string
  updatedAt: string
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
  paymentMethods: PlayerSavedPaymentMethodItem[]
  kycRequests: PlayerKycRequestItem[]
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
  rewardCatalogId: string
  rewardType: string
  winnersCount: string
  maxParticipants: string
  startsAt: string
  endsAt: string
  status: ContestStatus
  isBoosted: boolean
  allowedPlayerPlanKeys: PlayerPlanAccessKey[]
  isLive: boolean
  liveStartsAt: string
  liveStatus: string
}

function normalizeAllowedPlayerPlanKeys(value: unknown): PlayerPlanAccessKey[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<PlayerPlanAccessKey>()
  for (const item of value) {
    if (item === 'standard' || item === 'free') allowed.add('free')
    if (item === 'premium') allowed.add('premium')
    if (item === 'vip') allowed.add('vip')
  }
  return Array.from(allowed)
}

const PARTNER_AUTH_ROUTE = '/auth/partner'
const SUPER_ADMIN_AUTH_ROUTE = '/access/mp-sa-console'
const SUPER_ADMIN_ROUTE = '/mp-control/super-admin'
const SUPER_ADMIN_CATEGORIES_ROUTE = `${SUPER_ADMIN_ROUTE}/categories`
const SUPER_ADMIN_COUNTRIES_ROUTE = `${SUPER_ADMIN_ROUTE}/countries`
const SUPER_ADMIN_SECTORS_ROUTE = `${SUPER_ADMIN_ROUTE}/sectors`
const SUPER_ADMIN_CONTESTS_ROUTE = `${SUPER_ADMIN_ROUTE}/contests`
const SUPER_ADMIN_QUESTION_BANKS_ROUTE = `${SUPER_ADMIN_ROUTE}/question-banks`
const SUPER_ADMIN_PARTNERS_ROUTE = `${SUPER_ADMIN_ROUTE}/partners`
const SUPER_ADMIN_PLANS_ROUTE = `${SUPER_ADMIN_ROUTE}/plans`
const SUPER_ADMIN_WINNERS_ROUTE = `${SUPER_ADMIN_ROUTE}/winners`
const SUPER_ADMIN_REWARD_HISTORY_ROUTE = `${SUPER_ADMIN_ROUTE}/reward-history`
const SUPER_ADMIN_SUBSCRIPTION_HISTORY_ROUTE = `${SUPER_ADMIN_ROUTE}/subscription-history`
const SUPER_ADMIN_REWARD_CATALOG_ROUTE = `${SUPER_ADMIN_ROUTE}/reward-catalog`
const SUPER_ADMIN_USERS_ROUTE = `${SUPER_ADMIN_ROUTE}/users`
const SUPER_ADMIN_NOTIFICATIONS_ROUTE = `${SUPER_ADMIN_ROUTE}/notifications`
const SUPER_ADMIN_ACCESS_ROUTE = `${SUPER_ADMIN_ROUTE}/admin-access`
const SUPER_ADMIN_LANDING_ROUTE = `${SUPER_ADMIN_ROUTE}/landing`
const SUPER_ADMIN_SETTINGS_ROUTE = `${SUPER_ADMIN_ROUTE}/settings`
const SUPER_ADMIN_MAINTENANCE_ROUTE = `${SUPER_ADMIN_ROUTE}/maintenance`
const SUPER_ADMIN_SYSTEM_LOGS_ROUTE = `${SUPER_ADMIN_ROUTE}/system-logs`
const SUPER_ADMIN_SENTRY_ROUTE = `${SUPER_ADMIN_SYSTEM_LOGS_ROUTE}/sentry`

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
  // tablesKey intentionally represents the table list to avoid resubscribing
  // when callers pass a new array literal with the same content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

const navItems = [
  { label: 'Dashboard', href: SUPER_ADMIN_ROUTE, icon: 'D', permission: 'dashboard' },
  { label: 'Joueurs', href: SUPER_ADMIN_USERS_ROUTE, icon: 'J', permission: 'users' },
  { label: 'Partenaires', href: SUPER_ADMIN_PARTNERS_ROUTE, icon: 'P', permission: 'partners' },
  { label: 'Concours', href: SUPER_ADMIN_CONTESTS_ROUTE, icon: 'C', permission: 'contests' },
  { label: 'Banques questions', href: SUPER_ADMIN_QUESTION_BANKS_ROUTE, icon: 'Q', permission: 'contests' },
  { label: 'Catégories', href: SUPER_ADMIN_CATEGORIES_ROUTE, icon: 'G', permission: 'categories' },
  { label: 'Pays', href: SUPER_ADMIN_COUNTRIES_ROUTE, icon: 'Y', permission: 'countries' },
  { label: 'Secteurs', href: SUPER_ADMIN_SECTORS_ROUTE, icon: 'T', permission: 'sectors' },
  { label: 'Forfaits', href: SUPER_ADMIN_PLANS_ROUTE, icon: 'F', permission: 'plans' },
  { label: 'Gagnants', href: SUPER_ADMIN_WINNERS_ROUTE, icon: 'W', permission: 'winners' },
  { label: 'Historique des gains', href: SUPER_ADMIN_REWARD_HISTORY_ROUTE, icon: 'H', permission: 'winners' },
  { label: 'Historique des abonnements', href: SUPER_ADMIN_SUBSCRIPTION_HISTORY_ROUTE, icon: 'B', permission: 'users' },
  { label: 'Catalogue des gains', href: SUPER_ADMIN_REWARD_CATALOG_ROUTE, icon: 'R', permission: 'reward_catalog' },
  { label: 'Notifications', href: SUPER_ADMIN_NOTIFICATIONS_ROUTE, icon: 'N', permission: 'notifications' },
  { label: 'Admins', href: SUPER_ADMIN_ACCESS_ROUTE, icon: 'A', permission: 'admin_access' },
  { label: 'Landing', href: SUPER_ADMIN_LANDING_ROUTE, icon: 'L', permission: 'landing' },
  { label: 'Paramètres', href: SUPER_ADMIN_SETTINGS_ROUTE, icon: 'S', permission: 'settings' },
  { label: 'Maintenance', href: SUPER_ADMIN_MAINTENANCE_ROUTE, icon: 'M', permission: 'maintenance' },
  { label: 'Logs système', href: SUPER_ADMIN_SYSTEM_LOGS_ROUTE, icon: 'O', permission: 'system_logs' },
]

function getVisibleNavItems(profile: { permissions?: string[] } | null) {
  return navItems.filter((item) =>
    hasAdminPermission(profile?.permissions, item.permission, 'read'),
  )
}

function mapPartnerSession(partner: Record<string, unknown>): PartnerSession {
  return {
    id: partner.id as string,
    companyName: (partner.company_name as string | null) ?? 'Partenaire',
    email: (partner.email as string | null) ?? '',
    logoUrl: (partner.logo_url as string | null) ?? '',
    sector: (partner.sector as string | null) ?? '',
    phone: (partner.phone as string | null) ?? '',
    subscriptionPlan: (partner.subscription_plan as string | null) ?? 'free',
    subscriptionExpiresAt:
      (partner.subscription_expires_at as string | null) ?? '',
    isValidated: (partner.is_validated as boolean | null) ?? false,
    isActive: (partner.is_active as boolean | null) ?? false,
  }
}

async function resolvePartnerSessionByUser(userId: string, email?: string | null) {
  const partnerFields =
    'id, user_id, company_name, email, logo_url, sector, phone, subscription_plan, subscription_expires_at, is_validated, is_active'

  const { data: partnerData, error } = await supabase
    .from('partners')
    .select(partnerFields)
    .eq('user_id', userId)
    .maybeSingle()
  let data = partnerData

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
  participants = 0,
): PartnerDashboardContest {
  return {
    id: contest.id as string,
    title: (contest.title as string | null) ?? 'Concours',
    description: (contest.description as string | null) ?? '',
    category: (contest.category as string | null) ?? 'Non classe',
    categoryId: (contest.category_id as string | null) ?? '',
    type: (contest.type as string | null) ?? 'concours',
    status: (contest.status as string | null) ?? 'draft',
    imageUrl: (contest.image_url as string | null) ?? '',
    brandLogoUrl: (contest.brand_logo_url as string | null) ?? '',
    brandName: (contest.brand_name as string | null) ?? '',
    prizeDescription: (contest.prize_description as string | null) ?? '',
    viewsCount: Number(contest.views_count ?? 0),
    sharesCount: Number(contest.shares_count ?? 0),
    prizeValue: Number(contest.prize_value ?? 0),
    winnersCount: Number(contest.winners_count ?? 1),
    maxParticipants:
      contest.max_participants === null || contest.max_participants === undefined
        ? null
        : Number(contest.max_participants),
    startsAt: (contest.starts_at as string | null) ?? '',
    endsAt: (contest.ends_at as string | null) ?? '',
    isBoosted: (contest.is_boosted as boolean | null) ?? false,
    allowedPlayerPlanKeys: normalizeAllowedPlayerPlanKeys(
      contest.allowed_player_plan_keys,
    ),
    participants,
    createdAt: (contest.created_at as string | null) ?? '',
  }
}

async function fetchPartnerDashboardContests(partnerId: string) {
  const contestsResponse = await supabase
    .from('contests')
    .select(
      'id, title, description, category, category_id, type, status, image_url, brand_logo_url, brand_name, prize_description, views_count, shares_count, prize_value, winners_count, max_participants, starts_at, ends_at, is_boosted, allowed_player_plan_keys, created_at',
    )
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (contestsResponse.error) throw contestsResponse.error

  const contestIds = (contestsResponse.data ?? []).map(
    (contest) => contest.id as string,
  )
  const participationsResponse =
    contestIds.length > 0
      ? await supabase
          .from('participations')
          .select('contest_id')
          .in('contest_id', contestIds)
      : { data: [], error: null }

  if (participationsResponse.error) throw participationsResponse.error

  const participationsByContest = new Map<string, number>()
  for (const participation of participationsResponse.data ?? []) {
    const contestId = participation.contest_id as string | null
    if (!contestId) continue
    participationsByContest.set(
      contestId,
      (participationsByContest.get(contestId) ?? 0) + 1,
    )
  }

  return (contestsResponse.data ?? []).map((contest) =>
    mapPartnerDashboardContest(
      contest,
      participationsByContest.get(contest.id as string) ?? 0,
    ),
  )
}

async function fetchPartnerParticipations(
  contests: PartnerDashboardContest[],
): Promise<PartnerParticipationHistoryItem[]> {
  const contestIds = contests.map((contest) => contest.id)
  if (contestIds.length === 0) return []

  const { data, error } = await supabase
    .from('participations')
    .select('id, user_id, contest_id, score, answers, completed, participated_at')
    .in('contest_id', contestIds)
    .order('participated_at', { ascending: false })
    .limit(1000)

  if (error) throw error

  const userIds = Array.from(
    new Set(
      (data ?? [])
        .map((participation) => participation.user_id as string | null)
        .filter(Boolean),
    ),
  ) as string[]
  const usersResponse =
    userIds.length > 0
      ? await supabase.from('users').select('id, username, phone, avatar_url').in('id', userIds)
      : { data: [], error: null }

  if (usersResponse.error) throw usersResponse.error

  const userLabels = new Map(
    (usersResponse.data ?? []).map((user) => [
      user.id as string,
      ((user.username as string | null) || (user.phone as string | null) || 'Joueur') as string,
    ]),
  )
  const contestTitles = new Map(contests.map((contest) => [contest.id, contest.title]))
  const rankedByContest = new Map<string, Map<string, number>>()

  for (const contest of contests) {
    const ranked = [...(data ?? [])]
      .filter((participation) => participation.contest_id === contest.id)
      .sort((first, second) => {
        const scoreDiff =
          ((second.score as number | null) ?? 0) -
          ((first.score as number | null) ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        return (
          new Date((first.participated_at as string | null) ?? 0).getTime() -
          new Date((second.participated_at as string | null) ?? 0).getTime()
        )
      })
    rankedByContest.set(
      contest.id,
      new Map(ranked.map((participation, index) => [participation.id as string, index + 1])),
    )
  }

  return (data ?? []).map((participation) => {
    const contestId = (participation.contest_id as string | null) ?? ''
    const userId = (participation.user_id as string | null) ?? ''

    return {
      id: participation.id as string,
      contestId,
      contestTitle: contestTitles.get(contestId) ?? 'Concours',
      userId,
      userLabel: userLabels.get(userId) ?? 'Joueur',
      score: (participation.score as number | null) ?? 0,
      rank: rankedByContest.get(contestId)?.get(participation.id as string) ?? 0,
      completed: (participation.completed as boolean | null) ?? false,
      participatedAt: (participation.participated_at as string | null) ?? '',
      answers: formatParticipationAnswers(participation.answers),
    }
  })
}

function buildPartnerPlayers(
  participations: PartnerParticipationHistoryItem[],
): PartnerPlayerItem[] {
  const players = new Map<string, PartnerPlayerItem>()

  for (const participation of participations) {
    if (!participation.userId) continue
    const existing = players.get(participation.userId)
    if (!existing) {
      players.set(participation.userId, {
        id: participation.userId,
        label: participation.userLabel,
        phone: participation.userLabel,
        username: participation.userLabel,
        avatarUrl: '',
        participations: 1,
        bestScore: participation.score,
        lastPlayedAt: participation.participatedAt,
      })
      continue
    }

    existing.participations += 1
    existing.bestScore = Math.max(existing.bestScore, participation.score)
    if (
      new Date(participation.participatedAt).getTime() >
      new Date(existing.lastPlayedAt).getTime()
    ) {
      existing.lastPlayedAt = participation.participatedAt
    }
  }

  return Array.from(players.values()).sort((first, second) => {
    const participationDiff = second.participations - first.participations
    if (participationDiff !== 0) return participationDiff
    return second.bestScore - first.bestScore
  })
}

async function fetchPartnerSubscriptionHistory(
  partnerId: string,
): Promise<PartnerSubscriptionHistoryItem[]> {
  const [subscriptionsResponse, plansResponse] = await Promise.all([
    supabase
      .from('partner_subscriptions')
      .select('id, plan_id, amount, status, starts_at, expires_at, payment_method, created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('partner_plans').select('id, name'),
  ])

  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (plansResponse.error) throw plansResponse.error

  const planNames = new Map(
    (plansResponse.data ?? []).map((plan) => [
      plan.id as string,
      (plan.name as string | null) ?? 'Forfait',
    ]),
  )

  return (subscriptionsResponse.data ?? []).map((subscription) => ({
    id: subscription.id as string,
    planName: planNames.get((subscription.plan_id as string | null) ?? '') ?? 'Forfait',
    amount: (subscription.amount as number | null) ?? 0,
    status: (subscription.status as string | null) ?? 'pending',
    startsAt: (subscription.starts_at as string | null) ?? '',
    expiresAt: (subscription.expires_at as string | null) ?? '',
    paymentMethod: (subscription.payment_method as string | null) ?? '',
    createdAt: (subscription.created_at as string | null) ?? '',
  }))
}

async function fetchPartnerAvailablePlans(): Promise<PartnerAvailablePlan[]> {
  const [plansResponse, benefitsResponse] = await Promise.all([
    supabase
      .from('partner_plans')
      .select(
        'id, key, name, description, price, duration_days, max_contests, max_boosts, can_create_quiz, can_create_pronostic, can_access_stats, can_be_featured, is_active, order_index',
      )
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('partner_plan_benefits')
      .select('plan_id, label, order_index')
      .order('order_index', { ascending: true }),
  ])

  if (plansResponse.error) throw plansResponse.error
  if (benefitsResponse.error) throw benefitsResponse.error

  const benefitsByPlan = new Map<string, string[]>()
  for (const benefit of benefitsResponse.data ?? []) {
    const planId = benefit.plan_id as string
    const planBenefits = benefitsByPlan.get(planId) ?? []
    const label = (benefit.label as string | null) ?? ''
    if (label) planBenefits.push(label)
    benefitsByPlan.set(planId, planBenefits)
  }

  return (plansResponse.data ?? []).map((plan) => ({
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

function createDefaultPlayerSubscriptionAssignState(
  plans: PlayerPlanItem[] = [],
): PlayerSubscriptionAssignState {
  return {
    planId: plans.find((plan) => plan.isActive)?.id ?? plans[0]?.id ?? '',
    paymentMethod: 'Mobile Money',
    paymentReference: '',
  }
}

function playerKycDocumentLabel(documentType: string): string {
  if (documentType === 'passport') return 'Passport'
  if (documentType === 'driver_license') return 'Permis de conduire'
  return 'Carte Nationale d’Identité'
}

function playerKycStatusLabel(status: PlayerKycRequestItem['status']): string {
  if (status === 'approved') return 'Validée'
  if (status === 'rejected') return 'Rejetée'
  return 'En attente'
}

function playerKycStatusPillClass(status: PlayerKycRequestItem['status']): string {
  if (status === 'approved') return 'active'
  if (status === 'rejected') return 'inactive'
  return 'pending'
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
      fcmToken: (user.fcm_token as string | null) ?? '',
      fcmTokenPlatform: (user.fcm_token_platform as string | null) ?? '',
      fcmTokenUpdatedAt: (user.fcm_token_updated_at as string | null) ?? '',
      fcmTokenLastError: (user.fcm_token_last_error as string | null) ?? '',
      fcmTokenLastErrorAt: (user.fcm_token_last_error_at as string | null) ?? '',
      isPremium: (user.is_premium as boolean | null) ?? false,
      premiumExpiresAt: (user.premium_expires_at as string | null) ?? '',
      pointsTotal: (user.points_total as number | null) ?? 0,
      globalRank: null,
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

async function fetchUserForAdmin(userId: string): Promise<{
  user: PlayerUserItem
  plans: PlayerPlanItem[]
}> {
  const [userResponse, playersData] = await Promise.all([
    supabase
      .from('users')
      .select(
        'id, phone, username, avatar_url, role, fcm_token, fcm_token_platform, fcm_token_updated_at, fcm_token_last_error, fcm_token_last_error_at, is_premium, premium_expires_at, points_total, participations_today, last_participation_date, device_info, location_info, device_last_seen_at, is_active, created_at',
      )
      .eq('id', userId)
      .maybeSingle(),
    fetchPlayersData({
      page: 0,
      pageSize: 1,
      search: '',
      roleFilter: 'all_non_admin',
    }),
  ])

  if (userResponse.error) throw userResponse.error
  if (!userResponse.data) throw new Error('Utilisateur introuvable.')

  const user = userResponse.data
  const pointsTotal = (user.points_total as number | null) ?? 0
  const rankResponse = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .or('role.eq.player,role.is.null')
    .gt('points_total', pointsTotal)

  return {
    plans: playersData.plans,
    user: {
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
      pointsTotal,
      globalRank: rankResponse.error ? null : (rankResponse.count ?? 0) + 1,
      participationsToday: (user.participations_today as number | null) ?? 0,
      lastParticipationDate:
        (user.last_participation_date as string | null) ?? '',
      deviceInfo: ((user.device_info as Record<string, unknown> | null) ?? {}),
      locationInfo: ((user.location_info as Record<string, unknown> | null) ?? {}),
      deviceLastSeenAt: (user.device_last_seen_at as string | null) ?? '',
      isActive: (user.is_active as boolean | null) ?? true,
      createdAt: (user.created_at as string | null) ?? '',
    },
  }
}

async function fetchPlayerDetailData(
  userId: string,
  plans: PlayerPlanItem[],
): Promise<PlayerDetailData> {
  const [
    participationsResponse,
    winnersResponse,
    subscriptionsResponse,
    badgesResponse,
    userBadgesResponse,
    paymentMethodsResponse,
    kycRequestsResponse,
  ] =
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
      supabase
        .from('player_payment_methods')
        .select('id, operator_key, operator_name, phone, label, is_primary, is_whatsapp, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('player_kyc_requests')
        .select('id, user_id, document_type, document_front_url, document_back_url, status, rejection_reason, created_at, reviewed_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])

  if (participationsResponse.error) throw participationsResponse.error
  if (winnersResponse.error) throw winnersResponse.error
  if (subscriptionsResponse.error) throw subscriptionsResponse.error
  if (badgesResponse.error) throw badgesResponse.error
  if (userBadgesResponse.error) throw userBadgesResponse.error
  if (
    paymentMethodsResponse.error &&
    !isMissingTableError(paymentMethodsResponse.error, 'player_payment_methods')
  ) {
    throw paymentMethodsResponse.error
  }
  if (
    kycRequestsResponse.error &&
    !isMissingTableError(kycRequestsResponse.error, 'player_kyc_requests')
  ) {
    throw kycRequestsResponse.error
  }

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
      contestId: (winner.contest_id as string | null) ?? '',
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
    paymentMethods: (paymentMethodsResponse.data ?? []).map((method) => ({
      id: method.id as string,
      operatorName: (method.operator_name as string | null) ?? 'Mobile Money',
      operatorKey: (method.operator_key as string | null) ?? '',
      phone: (method.phone as string | null) ?? '',
      label: (method.label as string | null) ?? '',
      isPrimary: (method.is_primary as boolean | null) ?? false,
      isWhatsapp: (method.is_whatsapp as boolean | null) ?? false,
      status: (method.status as string | null) ?? 'active',
      createdAt: (method.created_at as string | null) ?? '',
      updatedAt: (method.updated_at as string | null) ?? '',
    })),
    kycRequests: (kycRequestsResponse.data ?? []).map((request) => ({
      id: request.id as string,
      userId: (request.user_id as string | null) ?? userId,
      playerName: '',
      playerPhone: '',
      documentType: (request.document_type as string | null) ?? 'national_id',
      documentFrontUrl: (request.document_front_url as string | null) ?? '',
      documentBackUrl: (request.document_back_url as string | null) ?? '',
      status: ((request.status as string | null) ?? 'pending') as PlayerKycRequestItem['status'],
      rejectionReason: (request.rejection_reason as string | null) ?? '',
      createdAt: (request.created_at as string | null) ?? '',
      reviewedAt: (request.reviewed_at as string | null) ?? '',
    })),
  }
}

async function fetchContestHistory(contest: ContestItem): Promise<ContestHistoryData> {
  if (isContestFinished(contest)) {
    try {
      await supabase.rpc('generate_pending_winners_for_contest', {
        p_contest_id: contest.id,
      })
    } catch {
      // Older databases may not have the auto-winner RPC yet.
    }
  }

  const [participationsResponse, questionsResponse] = await Promise.all([
    supabase
      .from('participations')
      .select('id, user_id, score, answers, completed, participated_at')
      .eq('contest_id', contest.id)
      .order('participated_at', { ascending: false })
      .limit(500),
    supabase
      .from('questions')
      .select(
        'id, question_text, question_image_url, option_a, option_b, option_c, option_d, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, correct_answer, points, time_limit, order_index',
      )
      .eq('contest_id', contest.id)
      .order('order_index', { ascending: true }),
  ])

  const participationsData = participationsResponse.data ?? []
  const participationsError = participationsResponse.error
  if (participationsError) throw participationsError
  if (questionsResponse.error) throw questionsResponse.error

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
    questions: (questionsResponse.data ?? []).map(questionRowToItem),
    participations: participationsData.map((participation) => {
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
        rawAnswers: answers,
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
          'id, question_text, question_image_url, option_a, option_b, option_c, option_d, option_a_image_url, option_b_image_url, option_c_image_url, option_d_image_url, correct_answer, points, time_limit, order_index',
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
      questionImageUrl: (question.question_image_url as string | null) ?? '',
      optionA: (question.option_a as string | null) ?? '',
      optionB: (question.option_b as string | null) ?? '',
      optionC: (question.option_c as string | null) ?? '',
      optionD: (question.option_d as string | null) ?? '',
      optionAImageUrl: (question.option_a_image_url as string | null) ?? '',
      optionBImageUrl: (question.option_b_image_url as string | null) ?? '',
      optionCImageUrl: (question.option_c_image_url as string | null) ?? '',
      optionDImageUrl: (question.option_d_image_url as string | null) ?? '',
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

function isContestFinished(contest: ContestItem) {
  const status = contest.status.toLowerCase()
  if (['inactive', 'ended', 'completed', 'finished'].includes(status)) return true
  return contest.endsAt ? new Date(contest.endsAt).getTime() <= Date.now() : false
}

function questionRowToItem(question: Record<string, unknown>): QuizQuestionItem {
  return {
    id: question.id as string,
    questionText: (question.question_text as string | null) ?? '',
    questionImageUrl: (question.question_image_url as string | null) ?? '',
    optionA: (question.option_a as string | null) ?? '',
    optionB: (question.option_b as string | null) ?? '',
    optionC: (question.option_c as string | null) ?? '',
    optionD: (question.option_d as string | null) ?? '',
    optionAImageUrl: (question.option_a_image_url as string | null) ?? '',
    optionBImageUrl: (question.option_b_image_url as string | null) ?? '',
    optionCImageUrl: (question.option_c_image_url as string | null) ?? '',
    optionDImageUrl: (question.option_d_image_url as string | null) ?? '',
    correctAnswer: ((question.correct_answer as string | null) ?? 'A').toUpperCase(),
    points: (question.points as number | null) ?? 0,
    timeLimit: (question.time_limit as number | null) ?? 0,
    orderIndex: (question.order_index as number | null) ?? 0,
  }
}

async function fetchContestById(contestId: string): Promise<ContestItem> {
  const [contestResponse, participationsResponse] = await Promise.all([
    supabase
      .from('contests')
      .select(
        'id, partner_id, title, description, image_url, brand_logo_url, brand_name, type, category, category_id, status, prize_description, prize_value, reward_catalog_id, reward_type, winners_count, max_participants, starts_at, ends_at, is_boosted, allowed_player_plan_keys, is_live, live_starts_at, live_status, registered_count, connected_count, current_question_index',
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
    rewardCatalogId: (contest.reward_catalog_id as string | null) ?? '',
    rewardType: (contest.reward_type as string | null) ?? 'manual',
    rewardLabel:
      (contest.prize_description as string | null) ?? 'Gain non défini',
    winnersCount: (contest.winners_count as number | null) ?? 1,
    maxParticipants: (contest.max_participants as number | null) ?? null,
    startsAt: (contest.starts_at as string | null) ?? '',
    endsAt: (contest.ends_at as string | null) ?? '',
    isBoosted: (contest.is_boosted as boolean | null) ?? false,
    allowedPlayerPlanKeys: normalizeAllowedPlayerPlanKeys(
      contest.allowed_player_plan_keys,
    ),
    isLive: (contest.is_live as boolean | null) ?? false,
    liveStartsAt: (contest.live_starts_at as string | null) ?? '',
    liveStatus: (contest.live_status as string | null) ?? 'scheduled',
    registeredCount: (contest.registered_count as number | null) ?? 0,
    connectedCount: (contest.connected_count as number | null) ?? 0,
    currentQuestionIndex:
      (contest.current_question_index as number | null) ?? 0,
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
    const totalAnswers = Array.isArray(data.items)
      ? data.items.length
      : Object.keys(data).filter(
          (key) => !['type', 'status', 'started_at', 'completed_at'].includes(key),
        ).length
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

function telemetryTextValue(
  data: Record<string, unknown>,
  keys: string[],
  fallback = 'Non défini',
) {
  for (const key of keys) {
    const value = data[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value)
    }
  }
  return fallback
}

function telemetryNumberValue(data: Record<string, unknown>, key: string) {
  const value = data[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function formatTelemetryCoordinate(value: number | null) {
  return value === null ? 'Non défini' : value.toFixed(5)
}

function formatUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const payload = error as SupabaseLikeError
    return [payload.message, payload.details, payload.hint, payload.code]
      .filter((item) => typeof item === 'string' && item.length > 0)
      .join(' · ') || fallback
  }
  return typeof error === 'string' && error.length > 0 ? error : fallback
}

function isMissingTableError(error: unknown, tableName: string) {
  if (!error || typeof error !== 'object') return false
  const payload = error as SupabaseLikeError
  const message = String(payload.message ?? '')
  return payload.code === 'PGRST205' && message.includes(`'public.${tableName}'`)
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
    rewardCatalogId: '',
    rewardType: 'manual',
    winnersCount: '1',
    maxParticipants: '',
    startsAt: toDatetimeLocalValue(now),
    endsAt: toDatetimeLocalValue(tomorrow),
    status: 'draft',
    isBoosted: false,
    allowedPlayerPlanKeys: [],
    isLive: false,
    liveStartsAt: '',
    liveStatus: 'scheduled',
  }
}

function createDefaultQuestionForm(orderIndex = 1): QuizQuestionFormState {
  return {
    questionText: '',
    questionImageUrl: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionAImageUrl: '',
    optionBImageUrl: '',
    optionCImageUrl: '',
    optionDImageUrl: '',
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
    questionImageUrl: question.questionImageUrl,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    optionAImageUrl: question.optionAImageUrl,
    optionBImageUrl: question.optionBImageUrl,
    optionCImageUrl: question.optionCImageUrl,
    optionDImageUrl: question.optionDImageUrl,
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

function ResponsiveMenuControls() {
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isConsoleRoute =
    location.pathname.startsWith(SUPER_ADMIN_ROUTE) || location.pathname === '/partner'

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('admin-menu-open', isMenuOpen)
    return () => {
      document.body.classList.remove('admin-menu-open')
    }
  }, [isMenuOpen])

  if (!isConsoleRoute) return null

  return (
    <>
      <button
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        className="mobile-menu-button"
        onClick={() => setIsMenuOpen((current) => !current)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      <button
        aria-hidden={!isMenuOpen}
        className="mobile-menu-overlay"
        onClick={() => setIsMenuOpen(false)}
        tabIndex={isMenuOpen ? 0 : -1}
        type="button"
      />
    </>
  )
}

function App() {
  return (
    <>
      <ResponsiveMenuControls />
      <Routes>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/legal/terms" element={<PublicLegalPage pageKey="terms" />} />
        <Route path="/legal/privacy" element={<PublicLegalPage pageKey="privacy" />} />
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
          path={SUPER_ADMIN_QUESTION_BANKS_ROUTE}
          element={<ProtectedSuperAdminRoute page="question-banks" />}
        />
        <Route
          path={`${SUPER_ADMIN_CONTESTS_ROUTE}/series/:seriesId`}
          element={<ProtectedSuperAdminRoute page="contest-series" />}
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
          path={SUPER_ADMIN_REWARD_HISTORY_ROUTE}
          element={<ProtectedSuperAdminRoute page="reward-history" />}
        />
        <Route
          path={SUPER_ADMIN_SUBSCRIPTION_HISTORY_ROUTE}
          element={<ProtectedSuperAdminRoute page="subscription-history" />}
        />
        <Route
          path={SUPER_ADMIN_REWARD_CATALOG_ROUTE}
          element={<ProtectedSuperAdminRoute page="reward-catalog" />}
        />
        <Route
          path={SUPER_ADMIN_USERS_ROUTE}
          element={<ProtectedSuperAdminRoute page="users" />}
        />
        <Route
          path={`${SUPER_ADMIN_USERS_ROUTE}/:userId`}
          element={<ProtectedSuperAdminRoute page="user-detail" />}
        />
        <Route
          path={SUPER_ADMIN_NOTIFICATIONS_ROUTE}
          element={<ProtectedSuperAdminRoute page="notifications" />}
        />
        <Route
          path={SUPER_ADMIN_ACCESS_ROUTE}
          element={<ProtectedSuperAdminRoute page="admin-access" />}
        />
        <Route
          path={SUPER_ADMIN_LANDING_ROUTE}
          element={<ProtectedSuperAdminRoute page="landing" />}
        />
        <Route
          path={SUPER_ADMIN_SETTINGS_ROUTE}
          element={<ProtectedSuperAdminRoute page="settings" />}
        />
        <Route
          path={SUPER_ADMIN_MAINTENANCE_ROUTE}
          element={<ProtectedSuperAdminRoute page="maintenance" />}
        />
        <Route
          path={SUPER_ADMIN_SYSTEM_LOGS_ROUTE}
          element={<ProtectedSuperAdminRoute page="system-logs" />}
        />
        <Route
          path={SUPER_ADMIN_SENTRY_ROUTE}
          element={<ProtectedSuperAdminRoute page="sentry" />}
        />
        <Route path="/partner" element={<PartnerPreview />} />
        <Route path="*" element={<Navigate to={PARTNER_AUTH_ROUTE} replace />} />
      </Routes>
    </>
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
    | 'question-banks'
    | 'contest-series'
    | 'contest-history'
    | 'contest-game'
    | 'partners'
    | 'plans'
    | 'winners'
    | 'reward-history'
    | 'subscription-history'
    | 'reward-catalog'
    | 'users'
    | 'user-detail'
    | 'notifications'
    | 'admin-access'
    | 'landing'
    | 'settings'
    | 'maintenance'
    | 'system-logs'
    | 'sentry'
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

  const pagePermission =
    page === 'contest-history' ||
    page === 'contest-game' ||
    page === 'contest-series' ||
    page === 'question-banks'
      ? 'contests'
      : page === 'user-detail'
        ? 'users'
        : page === 'reward-history'
          ? 'winners'
          : page === 'subscription-history'
            ? 'users'
        : page === 'reward-catalog'
          ? 'reward_catalog'
          : page === 'admin-access'
            ? 'admin_access'
            : page === 'system-logs'
              ? 'system_logs'
            : page === 'sentry'
              ? 'system_logs'
            : page

  if (
    typeof pagePermission === 'string' &&
    !hasAdminPermission(adminAuth.profile?.permissions, pagePermission, 'read')
  ) {
    const fallbackRoute =
      getVisibleNavItems(adminAuth.profile).find((item) => item.href !== SUPER_ADMIN_ROUTE)
        ?.href ?? SUPER_ADMIN_AUTH_ROUTE
    return <Navigate to={fallbackRoute} replace />
  }

  if (page === 'categories') {
    return (
      <SuperAdminCategoriesPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'countries') {
    return (
      <SuperAdminCountriesPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'sectors') {
    return (
      <SuperAdminPartnerSectorsPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'contests') {
    return (
      <SuperAdminContestsPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        contestsRoute={SUPER_ADMIN_CONTESTS_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'question-banks') {
    return (
      <SuperAdminQuestionBanksPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'contest-series') {
    return (
      <SuperAdminLiveSeriesPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        contestsRoute={SUPER_ADMIN_CONTESTS_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'contest-history') return <SuperAdminContestHistoryPage />
  if (page === 'contest-game') return <SuperAdminContestGamePage />
  if (page === 'partners') {
    return (
      <SuperAdminPartnersPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'plans') {
    return (
      <SuperAdminPlansPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'winners') {
    return (
      <SuperAdminWinnersPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        contestsRoute={SUPER_ADMIN_CONTESTS_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'reward-history') {
    return (
      <SuperAdminRewardHistoryPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        contestsRoute={SUPER_ADMIN_CONTESTS_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'subscription-history') {
    return (
      <SuperAdminSubscriptionHistoryPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
        usersRoute={SUPER_ADMIN_USERS_ROUTE}
      />
    )
  }
  if (page === 'reward-catalog') {
    return (
      <SuperAdminRewardCatalogPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'users') {
    return (
      <SuperAdminUsersPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
        usersRoute={SUPER_ADMIN_USERS_ROUTE}
      />
    )
  }
  if (page === 'user-detail') return <SuperAdminUserDetailPage />
  if (page === 'notifications') {
    return (
      <SuperAdminNotificationsPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'admin-access') {
    return (
      <SuperAdminAccessPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        settingsRoute={SUPER_ADMIN_SETTINGS_ROUTE}
      />
    )
  }
  if (page === 'landing') {
    return (
      <SuperAdminLandingPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
      />
    )
  }
  if (page === 'settings') {
    return (
      <SuperAdminSettingsPage
        accessRoute={SUPER_ADMIN_ACCESS_ROUTE}
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        categoriesRoute={SUPER_ADMIN_CATEGORIES_ROUTE}
        countriesRoute={SUPER_ADMIN_COUNTRIES_ROUTE}
        maintenanceRoute={SUPER_ADMIN_MAINTENANCE_ROUTE}
        navItems={navItems}
        notificationsRoute={SUPER_ADMIN_NOTIFICATIONS_ROUTE}
        plansRoute={SUPER_ADMIN_PLANS_ROUTE}
        rootRoute={SUPER_ADMIN_ROUTE}
        sectorsRoute={SUPER_ADMIN_SECTORS_ROUTE}
      />
    )
  }
  if (page === 'maintenance') {
    return (
      <SuperAdminMaintenancePage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
        settingsRoute={SUPER_ADMIN_SETTINGS_ROUTE}
      />
    )
  }
  if (page === 'system-logs') {
    return (
      <SuperAdminSystemLogsPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        rootRoute={SUPER_ADMIN_ROUTE}
        sentryRoute={SUPER_ADMIN_SENTRY_ROUTE}
      />
    )
  }
  if (page === 'sentry') {
    return (
      <SuperAdminSentryIssuesPage
        authRoute={SUPER_ADMIN_AUTH_ROUTE}
        navItems={navItems}
        systemLogsRoute={SUPER_ADMIN_SYSTEM_LOGS_ROUTE}
      />
    )
  }
  return (
    <SuperAdminDashboard
      authRoute={SUPER_ADMIN_AUTH_ROUTE}
      navItems={navItems}
      notificationsRoute={SUPER_ADMIN_NOTIFICATIONS_ROUTE}
      rootRoute={SUPER_ADMIN_ROUTE}
    />
  )
}

function SuperAdminUserDetailPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const { userId = '' } = useParams()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [user, setUser] = useState<PlayerUserItem | null>(null)
  const [plans, setPlans] = useState<PlayerPlanItem[]>([])
  const [detail, setDetail] = useState<PlayerDetailData>({
    subscriptions: [],
    participations: [],
    rewards: [],
    badges: [],
    paymentMethods: [],
    kycRequests: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [savingKycRequestId, setSavingKycRequestId] = useState('')
  const [isSavingSubscription, setIsSavingSubscription] = useState(false)
  const [subscriptionAssignForm, setSubscriptionAssignForm] =
    useState<PlayerSubscriptionAssignState>(() =>
      createDefaultPlayerSubscriptionAssignState(),
    )
  const [previewKycRequest, setPreviewKycRequest] =
    useState<PlayerKycRequestItem | null>(null)
  const [showAllParticipations, setShowAllParticipations] = useState(false)
  const [showAllRewards, setShowAllRewards] = useState(false)
  const [selectedParticipationDetail, setSelectedParticipationDetail] =
    useState<PlayerParticipationItem | null>(null)
  const [selectedRewardDetail, setSelectedRewardDetail] =
    useState<PlayerRewardItem | null>(null)

  const loadUserDetail = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError('')

    try {
      const nextUser = await fetchUserForAdmin(userId)
      const nextDetail = await fetchPlayerDetailData(userId, nextUser.plans)
      setUser(nextUser.user)
      setPlans(nextUser.plans)
      setDetail(nextDetail)
      setSubscriptionAssignForm((currentForm) => ({
        planId:
          currentForm.planId &&
          nextUser.plans.some((plan) => plan.id === currentForm.planId)
            ? currentForm.planId
            : createDefaultPlayerSubscriptionAssignState(nextUser.plans).planId,
        paymentMethod: currentForm.paymentMethod || 'Mobile Money',
        paymentReference: currentForm.paymentReference,
      }))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger le détail utilisateur.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadUserDetail()
  }, [loadUserDetail])

  useRealtimeRefresh(
    'sa-user-detail-realtime',
    [
      'users',
      'participations',
      'winners',
      'player_subscriptions',
      'user_badges',
      'player_kyc_requests',
      'player_payment_methods',
    ],
    loadUserDetail,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function copyPlayerDetailValue(value: string, message: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setError('')
      setNotice(message)
    } catch {
      setError('Impossible de copier cette valeur.')
    }
  }

  async function handleUpdatePlayerKycStatus(
    request: PlayerKycRequestItem,
    nextStatus: PlayerKycRequestItem['status'],
  ) {
    setNotice('')
    setError('')

    const rejectionReason =
      nextStatus === 'rejected'
        ? window.prompt('Motif du rejet à afficher au joueur', request.rejectionReason)?.trim() ?? ''
        : ''

    if (nextStatus === 'rejected' && !rejectionReason) {
      setError('Le motif est obligatoire pour rejeter une pièce KYC.')
      return
    }

    setSavingKycRequestId(request.id)
    try {
      const { data: rpcData, error: updateError } = await supabase.rpc(
        'admin_update_player_kyc_status',
        {
          p_request_id: request.id,
          p_status: nextStatus,
          p_rejection_reason: rejectionReason || null,
        },
      )

      if (updateError) throw updateError

      const rpcNotification = (
        rpcData as {
          notification?: {
            user_id?: string
            title?: string
            body?: string
            type?: string
            data?: Record<string, unknown>
          }
        } | null
      )?.notification

      const notificationTitle = rpcNotification?.title ?? playerKycStatusLabel(nextStatus)
      const notificationBody =
        rpcNotification?.body ??
        (nextStatus === 'approved'
          ? 'Ta pièce d’identité a été validée.'
          : nextStatus === 'rejected'
            ? `Ta pièce d’identité a été rejetée. Motif : ${rejectionReason}`
            : 'Ta vérification d’identité est repassée en attente.')
      const notificationData = rpcNotification?.data ?? {
        type: 'kyc',
        source: 'kyc_status_update',
        kyc_request_id: request.id,
        status: nextStatus,
      }
      const targetUserId = rpcNotification?.user_id ?? request.userId

      let pushWarning = ''
      try {
        const { data: pushData, error: pushError } = await supabase.functions.invoke(
          'send-push-notifications',
          {
            body: {
              userIds: [targetUserId],
              title: notificationTitle,
              body: notificationBody,
              type: 'kyc',
              data: notificationData,
              platforms: ['ios', 'android'],
            },
          },
        )

        if (pushError) throw pushError

        const sent = Number((pushData as { sent?: number } | null)?.sent ?? 0)
        const failed = Number((pushData as { failed?: number } | null)?.failed ?? 0)
        if (sent === 0 || failed > 0) {
          const failedSample = (
            pushData as {
              failedSamples?: Array<{ summary?: string; response?: unknown }>
              message?: string
            } | null
          )?.failedSamples?.[0]
          const failedDetail =
            failedSample?.summary ??
            (pushData as { message?: string } | null)?.message ??
            'aucun token push utilisable.'
          pushWarning = ` Push non confirmé: ${failedDetail}`
        }
      } catch (pushError) {
        console.warn('[MegaPromo][kycStatusPush][error]', pushError)
        pushWarning = ` Push non envoyé: ${formatUnknownError(
          pushError,
          'service push indisponible.',
        )}`
      }

      await loadUserDetail()
      void logAdminAction({
        feature: 'users',
        action: 'kyc_status_update',
        message: 'Statut KYC joueur mis a jour par le SA.',
        userId: request.userId,
        entityType: 'kyc_request',
        entityId: request.id,
        metadata: {
          previous_status: request.status,
          next_status: nextStatus,
          push_warning: pushWarning,
        },
      })
      setNotice(
        `Statut KYC mis à jour : ${playerKycStatusLabel(nextStatus)}.${pushWarning}`,
      )
    } catch (updateError) {
      void logError({
        feature: 'users',
        action: 'kyc_status_update_failed',
        message: 'Echec mise a jour statut KYC joueur.',
        userId: request.userId,
        entityType: 'kyc_request',
        entityId: request.id,
        metadata: {
          previous_status: request.status,
          next_status: nextStatus,
          error: formatUnknownError(
            updateError,
            'Impossible de mettre à jour le statut KYC.',
          ),
        },
      })
      setError(
        formatUnknownError(updateError, 'Impossible de mettre à jour le statut KYC.'),
      )
    } finally {
      setSavingKycRequestId('')
    }
  }

  async function handleAssignPlayerSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    setNotice('')
    setError('')

    const selectedPlan = plans.find((plan) => plan.id === subscriptionAssignForm.planId)
    if (!selectedPlan) {
      setError('Choisis le forfait à attribuer au joueur.')
      return
    }

    const paymentMethod = subscriptionAssignForm.paymentMethod.trim()
    const paymentReference = subscriptionAssignForm.paymentReference.trim()
    if (selectedPlan.price > 0 && !paymentReference) {
      setError('Ajoute une référence ou une note de paiement avant de valider.')
      return
    }

    const startsAt = new Date()
    const expiresAt = new Date(
      startsAt.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000,
    )

    setIsSavingSubscription(true)
    try {
      const { error: assignError } = await supabase.rpc(
        'admin_assign_player_subscription',
        {
          p_user_id: user.id,
          p_plan_id: selectedPlan.id,
          p_payment_method: paymentMethod || 'Validation SA',
          p_payment_reference: paymentReference || 'Validation SA',
          p_starts_at: startsAt.toISOString(),
        },
      )

      if (assignError) throw assignError

      setSubscriptionAssignForm({
        planId: selectedPlan.id,
        paymentMethod: paymentMethod || 'Mobile Money',
        paymentReference: '',
      })
      await loadUserDetail()
      void logAdminAction({
        feature: 'subscriptions',
        action: 'assign_player_subscription',
        message: 'Forfait joueur active par le SA.',
        userId: user.id,
        entityType: 'player_plan',
        entityId: selectedPlan.id,
        metadata: {
          plan_name: selectedPlan.name,
          amount: selectedPlan.price,
          duration_days: selectedPlan.durationDays,
          payment_method: paymentMethod || 'Validation SA',
          has_payment_reference: Boolean(paymentReference),
        },
      })
      setNotice(
        `Forfait ${selectedPlan.name} activé jusqu’au ${formatDate(
          expiresAt.toISOString(),
        )}.`,
      )
    } catch (subscriptionError) {
      void logError({
        feature: 'subscriptions',
        action: 'assign_player_subscription_failed',
        message: 'Echec activation forfait joueur par le SA.',
        userId: user.id,
        entityType: 'player_plan',
        entityId: selectedPlan.id,
        metadata: {
          plan_name: selectedPlan.name,
          error: formatUnknownError(
            subscriptionError,
            'Impossible de mettre à jour le forfait du joueur.',
          ),
        },
      })
      setError(
        formatUnknownError(
          subscriptionError,
          'Impossible de mettre à jour le forfait du joueur.',
        ),
      )
    } finally {
      setIsSavingSubscription(false)
    }
  }

  const activeSubscription =
    detail.subscriptions.find((subscription) => subscription.status === 'active') ??
    detail.subscriptions[0] ??
    null
  const selectedSubscriptionPlan =
    plans.find((plan) => plan.id === subscriptionAssignForm.planId) ?? null
  const savedPaymentOptions = detail.paymentMethods.map((method) => ({
    value: `${method.operatorName} ${method.phone}`.trim(),
    label: `${method.operatorName}${method.phone ? ` · ${method.phone}` : ''}`,
  }))
  const visibleParticipations = showAllParticipations
    ? detail.participations
    : detail.participations.slice(0, 5)
  const visibleRewards = showAllRewards ? detail.rewards : detail.rewards.slice(0, 5)

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
          {getVisibleNavItems(adminAuth.profile).slice(0, 6).map((item) => (
            <NavLink
              end={item.href === SUPER_ADMIN_ROUTE}
              key={item.label}
              to={item.href}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {getVisibleNavItems(adminAuth.profile).slice(6).map((item) => (
            <NavLink key={item.label} to={item.href}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Détail utilisateur</span>
          <strong>{user?.username || user?.phone || 'Chargement'}</strong>
          <p>Toutes les informations joueur, activité, gains et forfaits.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communauté</p>
            <h1>Détails utilisateur</h1>
            <p className="page-subtitle">
              Consultation complète du compte sélectionné depuis la liste des utilisateurs.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(SUPER_ADMIN_USERS_ROUTE)}
              type="button"
            >
              Retour utilisateurs
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
              <strong>Détail indisponible</strong>
              <p>{error}</p>
            </div>
            <button onClick={() => loadUserDetail()} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Joueur mis à jour</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        {isLoading || !user ? (
          <section className="panel users-page-panel">
            <p className="empty-panel-text">Chargement du détail utilisateur...</p>
          </section>
        ) : (
          <section className="users-detail-page">
            <article className="panel">
              <div className="player-detail-header">
                <span className="player-avatar large">
                  {(user.username || user.phone || 'J').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="eyebrow">{user.role}</p>
                  <h2>{user.username || 'Pseudo non défini'}</h2>
                  <p>{user.phone || 'Téléphone non défini'}</p>
                </div>
                <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="player-metrics">
                <div>
                  <span>Points</span>
                  <strong>{formatNumber(user.pointsTotal)}</strong>
                </div>
                <div>
                  <span>Classement global</span>
                  <strong>{user.globalRank ? `#${user.globalRank}` : '-'}</strong>
                </div>
                <div>
                  <span>Participations</span>
                  <strong>{detail.participations.length}</strong>
                </div>
                <div>
                  <span>Gains</span>
                  <strong>{detail.rewards.length}</strong>
                </div>
                <div>
                  <span>Badges</span>
                  <strong>{detail.badges.length}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Compte</p>
                  <h2>Informations générales</h2>
                </div>
                <span className={`status-pill ${user.isPremium ? 'sent' : 'inactive'}`}>
                  {user.isPremium ? 'Premium' : 'Standard'}
                </span>
              </div>
              <div className="telemetry-grid">
                <div>
                  <span>ID</span>
                  <strong>{user.id}</strong>
                </div>
                <div>
                  <span>Création</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>
                <div>
                  <span>Dernière participation</span>
                  <strong>{formatDate(user.lastParticipationDate)}</strong>
                </div>
                <div>
                  <span>Participations aujourd’hui</span>
                  <strong>{user.participationsToday}</strong>
                </div>
                <div>
                  <span>Forfait actif</span>
                  <strong>{activeSubscription?.planName ?? 'Aucun'}</strong>
                </div>
                <div>
                  <span>Expire le</span>
                  <strong>
                    {activeSubscription ? formatDate(activeSubscription.expiresAt) : 'Non défini'}
                  </strong>
                </div>
              </div>
              <form
                className="player-subscription-box"
                onSubmit={handleAssignPlayerSubscription}
              >
                <div className="subscription-assign-header">
                  <div>
                    <span>Mise à jour SA</span>
                    <strong>Attribuer un forfait après paiement</strong>
                    <p>
                      Le forfait actuel sera clôturé puis remplacé par un nouvel
                      abonnement actif.
                    </p>
                  </div>
                  {selectedSubscriptionPlan ? (
                    <span className="status-pill sent">
                      {formatMoney(selectedSubscriptionPlan.price)}
                    </span>
                  ) : null}
                </div>

                <div className="subscription-assign-grid">
                  <label>
                    <span>Forfait</span>
                    <select
                      disabled={isSavingSubscription || plans.length === 0}
                      onChange={(event) =>
                        setSubscriptionAssignForm((currentForm) => ({
                          ...currentForm,
                          planId: event.target.value,
                        }))
                      }
                      value={subscriptionAssignForm.planId}
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {formatMoney(plan.price)} · {plan.durationDays}j
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Paiement reçu via</span>
                    <input
                      disabled={isSavingSubscription}
                      list="player-payment-method-options"
                      onChange={(event) =>
                        setSubscriptionAssignForm((currentForm) => ({
                          ...currentForm,
                          paymentMethod: event.target.value,
                        }))
                      }
                      placeholder="Mobile Money, Wave..."
                      value={subscriptionAssignForm.paymentMethod}
                    />
                    <datalist id="player-payment-method-options">
                      {savedPaymentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </datalist>
                  </label>

                  <label>
                    <span>Référence / note</span>
                    <input
                      disabled={isSavingSubscription}
                      onChange={(event) =>
                        setSubscriptionAssignForm((currentForm) => ({
                          ...currentForm,
                          paymentReference: event.target.value,
                        }))
                      }
                      placeholder="Transaction, preuve, note SA..."
                      value={subscriptionAssignForm.paymentReference}
                    />
                  </label>
                </div>

                <div className="subscription-assign-footer">
                  <p>
                    {selectedSubscriptionPlan
                      ? `Expiration automatique prévue après ${selectedSubscriptionPlan.durationDays} jour(s).`
                      : 'Aucun forfait disponible.'}
                  </p>
                  <button
                    className="primary-action-button compact"
                    disabled={
                      isSavingSubscription ||
                      !selectedSubscriptionPlan ||
                      plans.length === 0
                    }
                    type="submit"
                  >
                    {isSavingSubscription ? 'Mise à jour...' : 'Activer le forfait'}
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Device</p>
                  <h2>Appareil & localisation</h2>
                </div>
                <span className="status-pill active">
                  {formatDate(user.deviceLastSeenAt)}
                </span>
              </div>
              <div className="telemetry-grid">
                <div>
                  <span>Appareil</span>
                  <strong>
                    {telemetryTextValue(user.deviceInfo, ['brand', 'name'])}{' '}
                    {telemetryTextValue(user.deviceInfo, ['model'], '')}
                  </strong>
                </div>
                <div>
                  <span>Système</span>
                  <strong>
                    {telemetryTextValue(user.deviceInfo, ['os', 'platform'])}{' '}
                    {telemetryTextValue(user.deviceInfo, ['os_version'], '')}
                  </strong>
                </div>
                <div>
                  <span>App</span>
                  <strong>
                    v{telemetryTextValue(user.deviceInfo, ['app_version'])} (
                    {telemetryTextValue(user.deviceInfo, ['app_build'])})
                  </strong>
                </div>
                <div>
                  <span>Position</span>
                  <strong>
                    {formatTelemetryCoordinate(
                      telemetryNumberValue(user.locationInfo, 'latitude'),
                    )}
                    ,{' '}
                    {formatTelemetryCoordinate(
                      telemetryNumberValue(user.locationInfo, 'longitude'),
                    )}
                  </strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Paiement joueur</p>
                  <h2>Mobile Money enregistrés</h2>
                </div>
                <span className="pill">{detail.paymentMethods.length}/2</span>
              </div>
              <div className="premium-mini-table">
                {detail.paymentMethods.map((method) => (
                  <article key={method.id}>
                    <div>
                      <strong>{method.operatorName}</strong>
                      <p>
                        {method.phone || 'Numéro non défini'}
                      </p>
                    </div>
                    <div className="table-actions compact">
                      <span className={`status-pill ${method.status === 'active' ? 'active' : 'inactive'}`}>
                        {method.isPrimary ? 'Principal' : method.status}
                      </span>
                      <button
                        className="table-action-button"
                        disabled={!method.phone}
                        onClick={() =>
                          copyPlayerDetailValue(
                            method.phone,
                            'Numéro Mobile Money copié.',
                          )
                        }
                        type="button"
                      >
                        Copier
                      </button>
                    </div>
                    <small>{formatDate(method.updatedAt || method.createdAt)}</small>
                  </article>
                ))}
                {detail.paymentMethods.length === 0 ? (
                  <p className="empty-panel-text">Aucun numéro Mobile Money enregistré.</p>
                ) : null}
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Identité</p>
                  <h2>Documents envoyés</h2>
                </div>
                <span className="pill">{detail.kycRequests.length}</span>
              </div>
              <div className="premium-mini-table">
                {detail.kycRequests.map((request) => (
                  <article className="kyc-request-row" key={request.id}>
                    <div>
                      <strong>{playerKycDocumentLabel(request.documentType)}</strong>
                      <p>
                        Envoyé le {formatDate(request.createdAt)}
                        {request.rejectionReason ? ` · ${request.rejectionReason}` : ''}
                      </p>
                    </div>
                    <span className={`status-pill ${playerKycStatusPillClass(request.status)}`}>
                      {playerKycStatusLabel(request.status)}
                    </span>
                    <div className="table-actions compact">
                      <button
                        className="table-action-button"
                        disabled={
                          !request.documentFrontUrl && !request.documentBackUrl
                        }
                        onClick={() => setPreviewKycRequest(request)}
                        type="button"
                      >
                        Voir pièce
                      </button>
                      <button
                        className="table-action-button"
                        disabled={
                          savingKycRequestId === request.id ||
                          request.status === 'approved'
                        }
                        onClick={() => handleUpdatePlayerKycStatus(request, 'approved')}
                        type="button"
                      >
                        Valider
                      </button>
                      <button
                        className="table-action-button"
                        disabled={
                          savingKycRequestId === request.id ||
                          request.status === 'pending'
                        }
                        onClick={() => handleUpdatePlayerKycStatus(request, 'pending')}
                        type="button"
                      >
                        En attente
                      </button>
                      <button
                        className="table-action-button danger"
                        disabled={
                          savingKycRequestId === request.id ||
                          request.status === 'rejected'
                        }
                        onClick={() => handleUpdatePlayerKycStatus(request, 'rejected')}
                        type="button"
                      >
                        Rejeter
                      </button>
                    </div>
                  </article>
                ))}
                {detail.kycRequests.length === 0 ? (
                  <p className="empty-panel-text">Aucun document envoyé.</p>
                ) : null}
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Historique</p>
                  <h2>Participations</h2>
                </div>
                <span className="pill">{detail.participations.length}</span>
              </div>
              <div className="compact-list">
                {visibleParticipations.map((participation) => (
                  <article key={participation.id}>
                    <div>
                      <strong>{participation.contestTitle}</strong>
                      <p>
                        {formatDate(participation.participatedAt)} ·{' '}
                        {participation.completed ? 'Terminé' : 'En cours'}
                      </p>
                    </div>
                    <div className="table-actions compact">
                      <span>
                        Rang #{participation.rank ?? '-'} · {participation.score} pts
                      </span>
                      <button
                        className="table-action-button"
                        onClick={() => setSelectedParticipationDetail(participation)}
                        type="button"
                      >
                        Détail
                      </button>
                      {participation.contestId ? (
                        <button
                          className="table-action-button"
                          onClick={() =>
                            navigate(
                              `${SUPER_ADMIN_CONTESTS_ROUTE}/${participation.contestId}/history`,
                            )
                          }
                          type="button"
                        >
                          Historique
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {detail.participations.length === 0 ? (
                  <p className="empty-panel-text">Aucune participation.</p>
                ) : null}
                {detail.participations.length > 5 ? (
                  <button
                    className="table-action-button"
                    onClick={() => setShowAllParticipations((value) => !value)}
                    type="button"
                  >
                    {showAllParticipations ? 'Voir moins' : 'Voir plus'}
                  </button>
                ) : null}
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Paiements</p>
                  <h2>Gains et abonnements</h2>
                </div>
              </div>
              <div className="dashboard-grid">
                <section>
                  <h3>Gains</h3>
                  <div className="compact-list">
                    {visibleRewards.map((reward) => (
                      <article key={reward.id}>
                        <div>
                          <strong>{reward.contestTitle}</strong>
                          <p>
                            {reward.prizeDescription || 'Gain MegaPromo'} ·{' '}
                            {formatDate(reward.createdAt)}
                          </p>
                        </div>
                        <div className="table-actions compact">
                          <span>{formatMoney(reward.prizeValue)}</span>
                          <span className={`status-pill ${reward.status}`}>
                            {reward.status}
                          </span>
                          <button
                            className="table-action-button"
                            onClick={() => setSelectedRewardDetail(reward)}
                            type="button"
                          >
                            Détail
                          </button>
                        </div>
                      </article>
                    ))}
                    {detail.rewards.length === 0 ? (
                      <p className="empty-panel-text">Aucun gain.</p>
                    ) : null}
                    {detail.rewards.length > 5 ? (
                      <button
                        className="table-action-button"
                        onClick={() => setShowAllRewards((value) => !value)}
                        type="button"
                      >
                        {showAllRewards ? 'Voir moins' : 'Voir plus'}
                      </button>
                    ) : null}
                  </div>
                </section>
                <section>
                  <h3>Abonnements</h3>
                  <div className="compact-list">
                    {detail.subscriptions.map((subscription) => (
                      <article key={subscription.id}>
                        <div>
                          <strong>{subscription.planName}</strong>
                          <p>
                            {subscription.paymentMethod || 'Paiement'} ·{' '}
                            {subscription.paymentReference || 'Référence non définie'}
                          </p>
                        </div>
                        <span className={`status-pill ${subscription.status}`}>
                          {subscription.status}
                        </span>
                      </article>
                    ))}
                    {detail.subscriptions.length === 0 ? (
                      <p className="empty-panel-text">Aucun abonnement.</p>
                    ) : null}
                  </div>
                </section>
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Badges</p>
                  <h2>Récompenses profil</h2>
                </div>
              </div>
              <div className="badge-list">
                {detail.badges.length > 0 ? (
                  detail.badges.map((badge) => <span key={badge.id}>{badge.name}</span>)
                ) : (
                  <p className="empty-panel-text">Aucun badge obtenu.</p>
                )}
              </div>
              <div className="user-detail-plan-count">
                {plans.length} forfait(s) joueur configuré(s)
              </div>
            </article>
          </section>
        )}
      </section>
      {previewKycRequest ? (
        <KycDocumentPreviewModal
          request={previewKycRequest}
          onClose={() => setPreviewKycRequest(null)}
        />
      ) : null}
      {selectedParticipationDetail ? (
        <PlayerParticipationDetailModal
          participation={selectedParticipationDetail}
          onClose={() => setSelectedParticipationDetail(null)}
          onOpenHistory={() => {
            if (!selectedParticipationDetail.contestId) return
            navigate(
              `${SUPER_ADMIN_CONTESTS_ROUTE}/${selectedParticipationDetail.contestId}/history`,
            )
          }}
        />
      ) : null}
      {selectedRewardDetail ? (
        <PlayerRewardDetailModal
          reward={selectedRewardDetail}
          onClose={() => setSelectedRewardDetail(null)}
          onOpenHistory={() => {
            if (!selectedRewardDetail.contestId) return
            navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${selectedRewardDetail.contestId}/history`)
          }}
        />
      ) : null}
    </main>
  )
}

function PlayerParticipationDetailModal({
  participation,
  onClose,
  onOpenHistory,
}: {
  participation: PlayerParticipationItem
  onClose: () => void
  onOpenHistory: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Détail participation joueur"
        aria-modal="true"
        className="category-modal player-detail-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Participation</p>
            <h2>{participation.contestTitle}</h2>
            <p className="modal-subtitle">{formatDate(participation.participatedAt)}</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="telemetry-grid detail-modal-grid">
          <div>
            <span>Rang</span>
            <strong>#{participation.rank ?? '-'}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{participation.score} pts</strong>
          </div>
          <div>
            <span>Statut</span>
            <strong>{participation.completed ? 'Terminé' : 'En cours'}</strong>
          </div>
          <div>
            <span>ID participation</span>
            <strong>{participation.id}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="secondary-action-button"
            disabled={!participation.contestId}
            onClick={onOpenHistory}
            type="button"
          >
            Voir historique du concours
          </button>
        </div>
      </section>
    </div>
  )
}

function PlayerRewardDetailModal({
  reward,
  onClose,
  onOpenHistory,
}: {
  reward: PlayerRewardItem
  onClose: () => void
  onOpenHistory: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Détail gain joueur"
        aria-modal="true"
        className="category-modal player-detail-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Gain</p>
            <h2>{reward.contestTitle}</h2>
            <p className="modal-subtitle">{formatDate(reward.createdAt)}</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="telemetry-grid detail-modal-grid">
          <div>
            <span>Libellé</span>
            <strong>{reward.prizeDescription || 'Gain MegaPromo'}</strong>
          </div>
          <div>
            <span>Valeur</span>
            <strong>{formatMoney(reward.prizeValue)}</strong>
          </div>
          <div>
            <span>Statut</span>
            <strong>{reward.status}</strong>
          </div>
          <div>
            <span>ID gain</span>
            <strong>{reward.id}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="secondary-action-button"
            disabled={!reward.contestId}
            onClick={onOpenHistory}
            type="button"
          >
            Voir historique du concours
          </button>
        </div>
      </section>
    </div>
  )
}

function KycDocumentPreviewModal({
  request,
  onClose,
}: {
  request: PlayerKycRequestItem
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Pièce d'identité"
        aria-modal="true"
        className="kyc-preview-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Pièce d’identité</p>
            <h2>{playerKycDocumentLabel(request.documentType)}</h2>
            <p className="modal-subtitle">
              Statut : {playerKycStatusLabel(request.status)} · Envoyé le{' '}
              {formatDate(request.createdAt)}
            </p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="kyc-preview-grid">
          {request.documentFrontUrl ? (
            <article>
              <div className="kyc-preview-image-frame">
                <img alt="Recto de la pièce d'identité" src={request.documentFrontUrl} />
              </div>
              <a
                className="table-action-button"
                href={request.documentFrontUrl}
                rel="noreferrer"
                target="_blank"
              >
                Ouvrir recto
              </a>
            </article>
          ) : (
            <article className="kyc-preview-empty">
              <strong>Recto absent</strong>
              <p>Aucun fichier recto n’a été envoyé.</p>
            </article>
          )}
          {request.documentBackUrl ? (
            <article>
              <div className="kyc-preview-image-frame">
                <img alt="Verso de la pièce d'identité" src={request.documentBackUrl} />
              </div>
              <a
                className="table-action-button"
                href={request.documentBackUrl}
                rel="noreferrer"
                target="_blank"
              >
                Ouvrir verso
              </a>
            </article>
          ) : (
            <article className="kyc-preview-empty">
              <strong>Verso absent</strong>
              <p>Aucun fichier verso n’a été envoyé.</p>
            </article>
          )}
        </div>
      </section>
    </div>
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
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)

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
    const questionImageUrl = questionForm.questionImageUrl.trim()
    const optionImageUrls = [
      questionForm.optionAImageUrl.trim(),
      questionForm.optionBImageUrl.trim(),
      questionForm.optionCImageUrl.trim(),
      questionForm.optionDImageUrl.trim(),
    ]
    const points = Number(questionForm.points)
    const timeLimit = Number(questionForm.timeLimit)
    const orderIndex = Number(questionForm.orderIndex)
    const hasTextOptions = [
      questionForm.optionA,
      questionForm.optionB,
      questionForm.optionC,
      questionForm.optionD,
    ].every((option) => option.trim().length > 0)
    const hasImageOptions = optionImageUrls.every((url) => url.length > 0)

    if (questionText.length < 3 && questionImageUrl.length < 1) {
      setGameError('Ajoute un texte de question ou une image de question.')
      return
    }

    if (!hasTextOptions && !hasImageOptions) {
      setGameError('Renseigne les 4 réponses en texte ou les 4 images de réponse.')
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
      question_image_url: questionImageUrl || null,
      option_a: questionForm.optionA.trim(),
      option_b: questionForm.optionB.trim(),
      option_c: questionForm.optionC.trim(),
      option_d: questionForm.optionD.trim(),
      option_a_image_url: optionImageUrls[0] || null,
      option_b_image_url: optionImageUrls[1] || null,
      option_c_image_url: optionImageUrls[2] || null,
      option_d_image_url: optionImageUrls[3] || null,
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

  async function handleGenerateQuestionsWithAi() {
    if (!gameData) return

    const questionCountInput = window.prompt(
      'Combien de questions générer ?',
      gameData.questions.length > 0 ? '5' : '10',
    )
    if (questionCountInput === null) return

    const questionCount = Number(questionCountInput)
    if (!Number.isFinite(questionCount) || questionCount < 3 || questionCount > 30) {
      setGameError('Choisis un nombre entre 3 et 30 questions.')
      return
    }

    const difficultyInput = window.prompt(
      'Niveau : facile, moyen ou difficile ?',
      'moyen',
    )
    if (difficultyInput === null) return
    const difficulty = difficultyInput.trim().toLowerCase()
    if (!['facile', 'moyen', 'difficile'].includes(difficulty)) {
      setGameError('Niveau invalide. Utilise facile, moyen ou difficile.')
      return
    }

    const topic =
      window.prompt(
        'Thème précis du Quiz Live ?',
        gameData.contest.category || gameData.contest.title,
      )?.trim() || gameData.contest.category || gameData.contest.title

    setIsGeneratingQuestions(true)
    setGameError('')
    setGameNotice('')

    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-live-quiz-questions',
        {
          body: {
            category: gameData.contest.category,
            topic,
            difficulty,
            questionCount,
            timeLimit: 25,
            locale: 'Côte d’Ivoire et Afrique francophone',
          },
        },
      )

      if (error) {
        const context = (error as { context?: unknown }).context
        if (context instanceof Response) {
          try {
            const payload = await context.json()
            throw new Error(
              formatUnknownError(
                payload,
                'Edge Function generate-live-quiz-questions indisponible.',
              ),
            )
          } catch (payloadError) {
            if (payloadError instanceof Error) throw payloadError
          }
        }
        throw error
      }
      if (!data?.ok || !Array.isArray(data.questions)) {
        throw new Error(data?.error ?? 'Réponse IA invalide.')
      }

      const startOrder = gameData.questions.length + 1
      const rows = (data.questions as GeneratedQuizQuestion[]).map(
        (question, index) => ({
          id: createClientUuid(),
          contest_id: gameData.contest.id,
          question_text: question.question,
          option_a: question.options[0] ?? '',
          option_b: question.options[1] ?? '',
          option_c: question.options[2] ?? '',
          option_d: question.options[3] ?? '',
          correct_answer: question.correct_answer,
          points: 10,
          time_limit: question.time_limit || 25,
          order_index: startOrder + index,
          created_at: new Date().toISOString(),
        }),
      )

      const { error: insertError } = await supabase.from('questions').insert(rows)
      if (insertError) throw insertError

      await loadGame()
      setGameNotice(
        `${rows.length} question(s) générée(s) par IA. Relis-les avant d’activer le live.`,
      )
    } catch (error) {
      setGameError(
        formatUnknownError(error, 'Impossible de générer les questions avec IA.'),
      )
    } finally {
      setIsGeneratingQuestions(false)
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleNavItems(adminAuth.profile).slice(0, 6).map((item) => (
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
          {getVisibleNavItems(adminAuth.profile).slice(6).map((item) => (
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
                {gameData.contest.type === 'quiz' ? (
                  <button
                    className="primary-button"
                    disabled={isGeneratingQuestions}
                    onClick={handleGenerateQuestionsWithAi}
                    type="button"
                  >
                    {isGeneratingQuestions ? 'Génération IA...' : 'Générer avec IA'}
                  </button>
                ) : null}
              </div>

              {gameData.contest.type === 'quiz' ? (
                <div className="game-config-layout">
                  <form className="category-form game-form" onSubmit={handleQuestionSubmit}>
                    <label>
                      <span>Question texte</span>
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

                    <label>
                      <span>Image de question (URL optionnelle)</span>
                      <input
                        onChange={(event) =>
                          setQuestionForm((current) => ({
                            ...current,
                            questionImageUrl: event.target.value,
                          }))
                        }
                        placeholder="https://.../question.png"
                        type="url"
                        value={questionForm.questionImageUrl}
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

                    <div className="form-grid two-columns">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const key = `option${letter}ImageUrl` as keyof QuizQuestionFormState
                        return (
                          <label key={letter}>
                            <span>Image option {letter} (URL)</span>
                            <input
                              onChange={(event) =>
                                setQuestionForm((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              placeholder="https://.../reponse.png"
                              type="url"
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
                                #{question.orderIndex} ·{' '}
                                {question.questionText || 'Question image'}
                              </strong>
                              <p>
                                Réponse {question.correctAnswer} · {question.points} pts ·{' '}
                                {question.timeLimit}s
                                {question.questionImageUrl ? ' · image question' : ''}
                                {question.optionAImageUrl &&
                                question.optionBImageUrl &&
                                question.optionCImageUrl &&
                                question.optionDImageUrl
                                  ? ' · réponses images'
                                  : ''}
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

type ParticipationAnswerRecord = {
  questionId: string
  selectedIndex: number | null
  correctIndex: number | null
  isCorrect: boolean | null
  points: number
  elapsedMs: number
}

function ParticipationAnswerDetailModal({
  participation,
  questions,
  onClose,
}: {
  participation: ContestHistoryItem
  questions: QuizQuestionItem[]
  onClose: () => void
}) {
  const answers = extractParticipationAnswerRecords(participation.rawAnswers)
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="history-modal answer-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Détail des réponses"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Réponses joueur</p>
            <h2>{participation.userLabel}</h2>
            <p>
              Rang #{participation.rank} · {participation.score} pts ·{' '}
              {participation.completed ? 'Terminé' : 'En cours'}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="answer-detail-list">
          {questions.length > 0 ? (
            questions.map((question, index) => {
              const answer = answersByQuestion.get(question.id)
              return (
                <article className="answer-detail-row" key={question.id}>
                  <div className="answer-detail-question">
                    <span>Question {index + 1}</span>
                    <strong>{question.questionText || 'Question image'}</strong>
                    {question.questionImageUrl ? (
                      <a href={question.questionImageUrl} target="_blank" rel="noreferrer">
                        Voir image question
                      </a>
                    ) : null}
                  </div>

                  <div className="answer-detail-grid">
                    <div>
                      <span>Réponse joueur</span>
                      <strong>
                        {answer?.selectedIndex === null || answer?.selectedIndex === undefined
                          ? 'Aucune réponse'
                          : optionTextForIndex(question, answer.selectedIndex)}
                      </strong>
                    </div>
                    <div>
                      <span>Réponse système</span>
                      <strong>{optionTextForIndex(question, correctIndexForQuestion(question))}</strong>
                    </div>
                    <div>
                      <span>Résultat</span>
                      <strong className={answer?.isCorrect ? 'success-text' : 'danger-text'}>
                        {answer?.isCorrect ? 'Correct' : 'Incorrect'}
                      </strong>
                    </div>
                    <div>
                      <span>Points</span>
                      <strong>{answer?.points ?? 0} pts</strong>
                    </div>
                    <div>
                      <span>Temps</span>
                      <strong>{formatDurationMs(answer?.elapsedMs ?? 0)}</strong>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <p className="empty-panel-text">
              Aucune question disponible pour détailler les réponses.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function extractParticipationAnswerRecords(rawAnswers: unknown): ParticipationAnswerRecord[] {
  const payload =
    rawAnswers && typeof rawAnswers === 'object'
      ? (rawAnswers as Record<string, unknown>)
      : null
  const items = Array.isArray(rawAnswers)
    ? rawAnswers
    : Array.isArray(payload?.items)
      ? payload.items
      : []

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      questionId: (item.question_id as string | null) ?? '',
      selectedIndex:
        typeof item.selected_index === 'number' ? item.selected_index : null,
      correctIndex:
        typeof item.correct_index === 'number' ? item.correct_index : null,
      isCorrect: typeof item.is_correct === 'boolean' ? item.is_correct : null,
      points: typeof item.points === 'number' ? item.points : 0,
      elapsedMs: typeof item.elapsed_ms === 'number' ? item.elapsed_ms : 0,
    }))
    .filter((item) => item.questionId)
}

function correctIndexForQuestion(question: QuizQuestionItem) {
  return ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer.toUpperCase())
}

function optionTextForIndex(question: QuizQuestionItem, index: number) {
  const labels = ['A', 'B', 'C', 'D']
  const options = [question.optionA, question.optionB, question.optionC, question.optionD]
  const images = [
    question.optionAImageUrl,
    question.optionBImageUrl,
    question.optionCImageUrl,
    question.optionDImageUrl,
  ]
  if (index < 0 || index >= labels.length) return 'Réponse inconnue'
  return `${labels[index]} · ${options[index] || images[index] || 'Image réponse'}`
}

function formatDurationMs(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Non mesuré'
  return `${(value / 1000).toFixed(2)}s`
}

function SuperAdminContestHistoryPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const { contestId } = useParams()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [historyData, setHistoryData] = useState<ContestHistoryData | null>(null)
  const [selectedParticipation, setSelectedParticipation] =
    useState<ContestHistoryItem | null>(null)
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
        questions: historyData.questions,
      })
      setSelectedParticipation(null)
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleNavItems(adminAuth.profile).slice(0, 6).map((item) => (
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
          {getVisibleNavItems(adminAuth.profile).slice(6).map((item) => (
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
                    <button
                      className="history-row history-row-button"
                      key={participation.id}
                      onClick={() => setSelectedParticipation(participation)}
                      type="button"
                    >
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
                    </button>
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

        {historyData && selectedParticipation ? (
          <ParticipationAnswerDetailModal
            participation={selectedParticipation}
            questions={historyData.questions}
            onClose={() => setSelectedParticipation(null)}
          />
        ) : null}
      </section>
    </main>
  )
}

function PartnerContestModal({
  categories,
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
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
  types: ContestTypeOption[]
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Concours partenaire" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Espace partenaire</p>
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
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Envoyer au Super Admin'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}


function PartnerPreview() {
  const navigate = useNavigate()
  const [partner, setPartner] = useState<PartnerSession | null>(null)
  const [contests, setContests] = useState<PartnerDashboardContest[]>([])
  const [participations, setParticipations] = useState<PartnerParticipationHistoryItem[]>(
    [],
  )
  const [players, setPlayers] = useState<PartnerPlayerItem[]>([])
  const [subscriptionHistory, setSubscriptionHistory] = useState<
    PartnerSubscriptionHistoryItem[]
  >([])
  const [partnerPlans, setPartnerPlans] = useState<PartnerAvailablePlan[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [types, setTypes] = useState<ContestTypeOption[]>([])
  const [contestForm, setContestForm] = useState<ContestFormState>(
    createDefaultContestForm,
  )
  const [isContestModalOpen, setIsContestModalOpen] = useState(false)
  const [editingPartnerContestId, setEditingPartnerContestId] = useState('')
  const [isSavingContest, setIsSavingContest] = useState(false)
  const [contestError, setContestError] = useState('')
  const [partnerNotice, setPartnerNotice] = useState('')
  const [partnerContestSearch, setPartnerContestSearch] = useState('')
  const [partnerContestStatusFilter, setPartnerContestStatusFilter] = useState('all')
  const [partnerContestTypeFilter, setPartnerContestTypeFilter] = useState('all')
  const [partnerHistoryContestId, setPartnerHistoryContestId] = useState('all')
  const [partnerPlayerSearch, setPartnerPlayerSearch] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [subscriptionRequestError, setSubscriptionRequestError] = useState('')
  const [isRequestingSubscription, setIsRequestingSubscription] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [profileForm, setProfileForm] = useState<PartnerProfileFormState>({
    companyName: '',
    email: '',
    logoUrl: '',
    sector: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState<PartnerPasswordFormState>({
    password: '',
    confirmPassword: '',
  })
  const [activePartnerView, setActivePartnerView] = useState<
    'dashboard' | 'contests' | 'players' | 'subscriptions' | 'settings' | 'history'
  >('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const dashboardStats = useMemo(() => {
    const activeContests = contests.filter((contest) => contest.status === 'active')
    const boostedContests = contests.filter((contest) => contest.isBoosted)
    const pendingContests = contests.filter((contest) => contest.status === 'pending')
    const totalViews = contests.reduce(
      (total, contest) => total + contest.viewsCount,
      0,
    )
    const totalShares = contests.reduce(
      (total, contest) => total + contest.sharesCount,
      0,
    )
    const totalPrizeValue = contests.reduce(
      (total, contest) => total + contest.prizeValue,
      0,
    )
    const completedParticipations = participations.filter(
      (participation) => participation.completed,
    ).length

    return {
      activeContests: activeContests.length,
      boostedContests: boostedContests.length,
      completionRate: Math.round(
        (completedParticipations / Math.max(1, participations.length)) * 100,
      ),
      pendingContests: pendingContests.length,
      players: players.length,
      participations: participations.length,
      totalContests: contests.length,
      totalPrizeValue,
      totalShares,
      totalViews,
    }
  }, [contests, participations, players.length])

  const partnerParticipationTrend = useMemo(
    () =>
      buildLastSevenDaysTrend(
        participations.map((participation) => participation.participatedAt),
      ),
    [participations],
  )

  const partnerTypeBreakdown = useMemo(
    () => buildBreakdown(contests.map((contest) => contest.type)),
    [contests],
  )

  const partnerStatusBreakdown = useMemo(
    () => buildBreakdown(contests.map((contest) => contest.status)),
    [contests],
  )

  const topPartnerContests = useMemo(
    () =>
      [...contests]
        .sort((first, second) => {
          const participationDiff = second.participants - first.participants
          if (participationDiff !== 0) return participationDiff
          return second.viewsCount - first.viewsCount
        })
        .slice(0, 5),
    [contests],
  )

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

  const filteredPartnerHistory = useMemo(() => {
    return participations.filter(
      (participation) =>
        partnerHistoryContestId === 'all' ||
        participation.contestId === partnerHistoryContestId,
    )
  }, [participations, partnerHistoryContestId])

  const filteredPartnerPlayers = useMemo(() => {
    const cleanedSearch = partnerPlayerSearch.trim().toLowerCase()
    if (!cleanedSearch) return players

    return players.filter((player) =>
      [player.label, player.phone, player.username]
        .join(' ')
        .toLowerCase()
        .includes(cleanedSearch),
    )
  }, [partnerPlayerSearch, players])

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
      const [nextContests, catalog, nextSubscriptions, nextPartnerPlans] = await Promise.all([
        fetchPartnerDashboardContests(nextPartner.id),
        fetchPartnerContestCatalog(),
        fetchPartnerSubscriptionHistory(nextPartner.id),
        fetchPartnerAvailablePlans(),
      ])
      const nextParticipations = await fetchPartnerParticipations(nextContests)
      if (!isMounted()) return
      setPartner(nextPartner)
      setContests(nextContests)
      setParticipations(nextParticipations)
      setPlayers(buildPartnerPlayers(nextParticipations))
      setSubscriptionHistory(nextSubscriptions)
      setPartnerPlans(nextPartnerPlans)
      setProfileForm({
        companyName: nextPartner.companyName,
        email: nextPartner.email,
        logoUrl: nextPartner.logoUrl,
        sector: nextPartner.sector,
        phone: nextPartner.phone,
      })
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const refreshPartnerDashboard = useCallback(async () => {
    await loadPartnerDashboard(() => true)
  }, [loadPartnerDashboard])

  useRealtimeRefresh(
    'partner-dashboard-realtime',
    [
      'contests',
      'participations',
      'partner_subscriptions',
      'partners',
      'partner_plans',
      'partner_plan_benefits',
    ],
    refreshPartnerDashboard,
  )

  async function handlePartnerLogout() {
    await supabase.auth.signOut()
    navigate(PARTNER_AUTH_ROUTE, { replace: true })
  }

  async function handlePartnerSubscriptionRequest(plan: PartnerAvailablePlan) {
    if (!partner || isRequestingSubscription) return

    setSubscriptionRequestError('')
    setPartnerNotice('')
    setIsRequestingSubscription(true)

    try {
      const { error } = await supabase.rpc('request_partner_subscription', {
        p_partner_id: partner.id,
        p_plan_id: plan.id,
        p_payment_method: 'Demande depuis espace partenaire',
      })

      if (error) throw error

      setPartnerNotice(
        `Demande envoyée pour le forfait ${plan.name}. Le Super Admin pourra la valider après vérification du paiement.`,
      )
      await refreshPartnerDashboard()
      setActivePartnerView('subscriptions')
      void logPartnerAction({
        feature: 'partner_subscriptions',
        action: 'request_subscription',
        message: 'Demande abonnement partenaire envoyee.',
        partnerId: partner.id,
        entityType: 'partner_plan',
        entityId: plan.id,
        metadata: {
          plan_name: plan.name,
          amount: plan.price,
          payment_method: 'Demande depuis espace partenaire',
        },
      })
    } catch (subscriptionError) {
      void logError({
        source: 'web_partner',
        feature: 'partner_subscriptions',
        action: 'request_subscription_failed',
        message: 'Echec demande abonnement partenaire.',
        partnerId: partner.id,
        entityType: 'partner_plan',
        entityId: plan.id,
        metadata: {
          plan_name: plan.name,
          error: subscriptionError instanceof Error
            ? subscriptionError.message
            : String(subscriptionError),
        },
      })
      setSubscriptionRequestError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : 'Impossible d’envoyer la demande d’abonnement.',
      )
    } finally {
      setIsRequestingSubscription(false)
    }
  }

  function openPartnerContestModal() {
    if (!partner) return
    setContestError('')
    setPartnerNotice('')
    setEditingPartnerContestId('')
    setContestForm({
      ...createDefaultContestForm(),
      partnerId: partner.id,
      brandName: partner.companyName,
      brandLogoUrl: partner.logoUrl,
      status: 'pending',
    })
    setIsContestModalOpen(true)
  }

  function openEditPartnerContestModal(contest: PartnerDashboardContest) {
    if (contest.status !== 'pending') {
      setPartnerNotice('Seuls les concours en attente peuvent être modifiés.')
      return
    }

    setContestError('')
    setPartnerNotice('')
    setEditingPartnerContestId(contest.id)
    setContestForm({
      title: contest.title,
      description: contest.description,
      type: contest.type,
      categoryId: contest.categoryId,
      partnerId: partner?.id ?? '',
      imageUrl: contest.imageUrl,
      brandLogoUrl: contest.brandLogoUrl,
      brandName: contest.brandName || partner?.companyName || '',
      prizeDescription: contest.prizeDescription,
      prizeValue: String(contest.prizeValue || ''),
      rewardCatalogId: '',
      rewardType: 'manual',
      winnersCount: String(contest.winnersCount || 1),
      maxParticipants:
        contest.maxParticipants === null ? '' : String(contest.maxParticipants),
      startsAt: contest.startsAt ? isoToDatetimeLocalValue(contest.startsAt) : '',
      endsAt: contest.endsAt ? isoToDatetimeLocalValue(contest.endsAt) : '',
      status: 'pending',
      isBoosted: false,
      allowedPlayerPlanKeys: contest.allowedPlayerPlanKeys,
      isLive: false,
      liveStartsAt: '',
      liveStatus: 'scheduled',
    })
    setIsContestModalOpen(true)
  }

  function openPartnerContestHistory(contestId: string) {
    setPartnerHistoryContestId(contestId)
    setActivePartnerView('history')
  }

  function closePartnerContestModal() {
    if (isSavingContest) return
    setContestError('')
    setEditingPartnerContestId('')
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
      const contestId = editingPartnerContestId || createClientUuid()
      const payload = {
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
        allowed_player_plan_keys: contestForm.allowedPlayerPlanKeys,
        views_count: 0,
        shares_count: 0,
      }
      const saveResponse = editingPartnerContestId
        ? await supabase
            .from('contests')
            .update(payload)
            .eq('id', editingPartnerContestId)
            .eq('partner_id', partner.id)
            .eq('status', 'pending')
        : await supabase.from('contests').insert({
            id: contestId,
            ...payload,
            created_at: new Date().toISOString(),
          })

      if (saveResponse.error) throw saveResponse.error

      const nextContests = await fetchPartnerDashboardContests(partner.id)
      const nextParticipations = await fetchPartnerParticipations(nextContests)
      setContests(nextContests)
      setParticipations(nextParticipations)
      setPlayers(buildPartnerPlayers(nextParticipations))
      if (!editingPartnerContestId) {
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
      }
      setPartnerNotice(
        editingPartnerContestId
          ? 'Concours mis à jour. Il reste en attente de validation.'
          : 'Concours envoyé au Super Admin pour validation.',
      )
      setContestError('')
      setEditingPartnerContestId('')
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

  async function handleUpdatePartnerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!partner) return

    const companyName = profileForm.companyName.trim()
    const email = profileForm.email.trim().toLowerCase()

    setSettingsError('')
    setPartnerNotice('')

    if (companyName.length < 2) {
      setSettingsError('Le nom de la marque doit contenir au moins 2 caractères.')
      return
    }

    if (!email.includes('@')) {
      setSettingsError('Email invalide.')
      return
    }

    setIsProfileSaving(true)
    try {
      if (email !== partner.email.toLowerCase()) {
        const { error: authError } = await supabase.auth.updateUser({ email })
        if (authError) throw authError
      }

      const { error: partnerError } = await supabase
        .from('partners')
        .update({
          company_name: companyName,
          email,
          logo_url: profileForm.logoUrl.trim() || null,
          sector: profileForm.sector.trim() || null,
          phone: profileForm.phone.trim() || null,
        })
        .eq('id', partner.id)

      if (partnerError) throw partnerError

      await refreshPartnerDashboard()
      setPartnerNotice(
        email !== partner.email.toLowerCase()
          ? 'Profil mis à jour. Supabase peut demander une confirmation email.'
          : 'Profil partenaire mis à jour.',
      )
    } catch (error) {
      setSettingsError(formatUnknownError(error, 'Impossible de mettre à jour le profil.'))
    } finally {
      setIsProfileSaving(false)
    }
  }

  async function handleUpdatePartnerPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsError('')
    setPartnerNotice('')

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
      setPartnerNotice('Mot de passe partenaire mis à jour.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour le mot de passe.'),
      )
    } finally {
      setIsPasswordSaving(false)
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
            className={activePartnerView === 'subscriptions' ? 'active' : ''}
            onClick={() => setActivePartnerView('subscriptions')}
            type="button"
          >
            <span className="nav-icon">AB</span>
            Abonnements
          </button>
          <button
            className={activePartnerView === 'players' ? 'active' : ''}
            onClick={() => setActivePartnerView('players')}
            type="button"
          >
            <span className="nav-icon">JR</span>
            Joueurs
          </button>
          <button
            className={activePartnerView === 'settings' ? 'active' : ''}
            onClick={() => setActivePartnerView('settings')}
            type="button"
          >
            <span className="nav-icon">PR</span>
            Paramètres
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
                  : activePartnerView === 'history'
                    ? 'Historique'
                    : activePartnerView === 'players'
                      ? 'Joueurs'
                      : activePartnerView === 'settings'
                        ? 'Paramètres'
                        : 'Abonnements'}
            </h1>
            <p className="page-subtitle">
              {activePartnerView === 'dashboard'
                ? 'Suivi minimum de tes concours, vues et statut d’abonnement.'
                : activePartnerView === 'contests'
                  ? 'Liste des concours enregistrés et création de nouveaux jeux.'
                  : activePartnerView === 'history'
                    ? 'Historique de participation rattaché à tes concours.'
                    : activePartnerView === 'players'
                      ? 'Joueurs ayant participé au moins une fois à tes jeux.'
                      : activePartnerView === 'settings'
                        ? 'Mets à jour le profil partenaire et le mot de passe.'
                        : 'Historique des abonnements du partenaire.'}
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

        {settingsError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Action refusée</strong>
              <p>{settingsError}</p>
            </div>
          </div>
        ) : null}

        {activePartnerView === 'dashboard' ? (
          <>
            <section className="stats-grid" aria-label="Statistiques partenaire">
              <article className="stat-card">
                <span>Concours</span>
                <strong>{formatNumber(dashboardStats.totalContests)}</strong>
                <p>{formatNumber(dashboardStats.pendingContests)} en attente SA.</p>
              </article>
              <article className="stat-card">
                <span>Actifs</span>
                <strong>{formatNumber(dashboardStats.activeContests)}</strong>
                <p>Concours visibles dans l’app mobile.</p>
              </article>
              <article className="stat-card">
                <span>Audience</span>
                <strong>{formatNumber(dashboardStats.totalViews)}</strong>
                <p>{formatNumber(dashboardStats.totalShares)} partage(s).</p>
              </article>
              <article className="stat-card">
                <span>Participations</span>
                <strong>{formatNumber(dashboardStats.participations)}</strong>
                <p>{formatNumber(dashboardStats.players)} joueur(s) unique(s).</p>
              </article>
              <article className="stat-card">
                <span>Complétion</span>
                <strong>{dashboardStats.completionRate}%</strong>
                <p>Parties terminées par les joueurs.</p>
              </article>
              <article className="stat-card">
                <span>Lots</span>
                <strong>{formatMoney(dashboardStats.totalPrizeValue)}</strong>
                <p>Valeur totale déclarée.</p>
              </article>
            </section>

            <section className="dashboard-analytics-grid partner-analytics-grid">
              <DashboardTrendCard
                data={partnerParticipationTrend}
                loading={false}
                title="Participations sur 7 jours"
              />
              <DashboardBreakdownCard
                data={partnerStatusBreakdown}
                loading={false}
                title="Répartition par statut"
              />
              <DashboardBreakdownCard
                data={partnerTypeBreakdown}
                loading={false}
                title="Répartition par type"
              />
              <DashboardEngagementCard
                data={{
                  views: dashboardStats.totalViews,
                  shares: dashboardStats.totalShares,
                  participations: dashboardStats.participations,
                  completionRate: dashboardStats.completionRate,
                }}
              />
            </section>

            <section className="partner-page-section">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Performance</p>
                    <h2>Top concours</h2>
                  </div>
                  <span className="pill">{formatNumber(topPartnerContests.length)} lignes</span>
                </div>
                {topPartnerContests.length === 0 ? (
                  <p className="empty-panel-text">
                    Les performances apparaîtront dès les premières participations.
                  </p>
                ) : (
                  <div className="partner-dashboard-list">
                    {topPartnerContests.map((contest) => (
                      <article className="partner-dashboard-row" key={contest.id}>
                        <div>
                          <strong>{contest.title}</strong>
                          <p>{contest.category} · {contest.type}</p>
                        </div>
                        <span>{formatNumber(contest.participants)} joueur(s)</span>
                        <span>{formatNumber(contest.viewsCount)} vues</span>
                        <span>{formatNumber(contest.sharesCount)} partages</span>
                        <small>{formatDate(contest.endsAt)}</small>
                        <button
                          className="table-action-button"
                          onClick={() => openPartnerContestHistory(contest.id)}
                          type="button"
                        >
                          Historique
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </>
        ) : null}

        {activePartnerView === 'contests' ? (
          <PartnerContestsPanel
            contests={contests}
            filteredContests={filteredPartnerContests}
            onCreate={openPartnerContestModal}
            onEdit={openEditPartnerContestModal}
            onHistory={openPartnerContestHistory}
            onSearchChange={setPartnerContestSearch}
            onStatusFilterChange={setPartnerContestStatusFilter}
            onTypeFilterChange={setPartnerContestTypeFilter}
            search={partnerContestSearch}
            statusFilter={partnerContestStatusFilter}
            typeFilter={partnerContestTypeFilter}
            types={types}
          />
        ) : null}

        {activePartnerView === 'history' ? (
          <section className="partner-page-section">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Participations</p>
                  <h2>Historique des joueurs</h2>
                </div>
                <div className="section-heading-actions">
                  <select
                    onChange={(event) => setPartnerHistoryContestId(event.target.value)}
                    value={partnerHistoryContestId}
                  >
                    <option value="all">Tous les concours</option>
                    {contests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary-action-button"
                    onClick={() => setActivePartnerView('contests')}
                    type="button"
                  >
                    Retour concours
                  </button>
                </div>
              </div>

              {filteredPartnerHistory.length === 0 ? (
                <p className="empty-panel-text">
                  Aucun joueur n’a encore participé à ce concours.
                </p>
              ) : (
                <div className="partner-dashboard-list">
                  {filteredPartnerHistory.map((participation) => (
                    <article className="partner-dashboard-row history-row" key={participation.id}>
                      <div>
                        <strong>{participation.userLabel}</strong>
                        <p>{participation.contestTitle}</p>
                      </div>
                      <span>Score {formatNumber(participation.score)}</span>
                      <span>Rang #{participation.rank || '-'}</span>
                      <span className={`status-pill ${participation.completed ? 'active' : 'pending'}`}>
                        {participation.completed ? 'Terminé' : 'En cours'}
                      </span>
                      <small>{formatDate(participation.participatedAt)}</small>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}

        {activePartnerView === 'players' ? (
          <section className="partner-page-section">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Joueurs</p>
                  <h2>Joueurs ayant déjà joué</h2>
                </div>
                <span className="pill">
                  {formatNumber(filteredPartnerPlayers.length)} / {formatNumber(players.length)}
                </span>
              </div>

              <div className="contest-filter-bar compact">
                <input
                  className="search-input"
                  onChange={(event) => setPartnerPlayerSearch(event.target.value)}
                  placeholder="Rechercher un joueur..."
                  value={partnerPlayerSearch}
                />
              </div>

              {filteredPartnerPlayers.length === 0 ? (
                <p className="empty-panel-text">
                  Aucun joueur n’a encore participé à tes concours.
                </p>
              ) : (
                <div className="partner-dashboard-list">
                  {filteredPartnerPlayers.map((player) => (
                    <article className="partner-dashboard-row" key={player.id}>
                      <div>
                        <strong>{player.label}</strong>
                        <p>Dernière participation : {formatDate(player.lastPlayedAt)}</p>
                      </div>
                      <span>{formatNumber(player.participations)} participation(s)</span>
                      <span>Meilleur score {formatNumber(player.bestScore)}</span>
                      <small>{player.id.slice(0, 8)}</small>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}

        {activePartnerView === 'subscriptions' ? (
          <section className="partner-page-section">
            <article className="panel partner-subscription-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Abonnement</p>
                  <h2>Forfait partenaire</h2>
                </div>
                <span className={`status-pill ${partner.isActive ? 'active' : 'inactive'}`}>
                  {partner.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="partner-subscription-hero">
                <div>
                  <span className="partner-subscription-kicker">Forfait actuel</span>
                  <strong>{partner.subscriptionPlan || 'free'}</strong>
                  <p>
                    {partner.subscriptionExpiresAt
                      ? `Expire le ${formatDate(partner.subscriptionExpiresAt)}`
                      : 'Expiration non définie'}
                  </p>
                </div>
                <div className="partner-subscription-score">
                  <span>{formatNumber(dashboardStats.boostedContests)}</span>
                  <small>concours boosté(s)</small>
                </div>
              </div>

              <div className="partner-subscription-metrics">
                <article>
                  <div>
                    <span>Campagnes</span>
                    <strong>{formatNumber(contests.length)}</strong>
                  </div>
                  <p>Total enregistré</p>
                </article>
                <article>
                  <div>
                    <span>Participants</span>
                    <strong>{formatNumber(dashboardStats.participations)}</strong>
                  </div>
                  <p>Depuis les concours</p>
                </article>
                <article>
                  <div>
                    <span>Secteur</span>
                    <strong>{partner.sector || 'Non renseigné'}</strong>
                  </div>
                  <p>Suivi partenaire</p>
                </article>
              </div>

              <div className="partner-plan-chooser">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Choisir un forfait</p>
                    <h3>Changer ou renouveler</h3>
                  </div>
                  <span className="pill">{formatNumber(partnerPlans.length)} offre(s)</span>
                </div>

                {subscriptionRequestError ? (
                  <div className="dashboard-alert" role="alert">
                    <div>
                      <strong>Demande impossible</strong>
                      <p>{subscriptionRequestError}</p>
                    </div>
                  </div>
                ) : null}

                {partnerPlans.length > 0 ? (
                  <div className="partner-plan-grid">
                    {partnerPlans.map((plan) => {
                      const isCurrentPlan =
                        partner.subscriptionPlan.toLowerCase() === plan.name.toLowerCase()
                          || partner.subscriptionPlan.toLowerCase() === plan.key.toLowerCase()
                      return (
                        <article
                          className={`partner-plan-option ${isCurrentPlan ? 'current' : ''}`}
                          key={plan.id}
                        >
                          <div className="partner-plan-option-head">
                            <div>
                              <span>{plan.key || 'forfait'}</span>
                              <strong>{plan.name}</strong>
                            </div>
                            {isCurrentPlan ? (
                              <small>Actuel</small>
                            ) : null}
                          </div>
                          <p>{plan.description || 'Forfait partenaire MegaPromo.'}</p>
                          <div className="partner-plan-price">
                            <strong>{formatMoney(plan.price)}</strong>
                            <span>{plan.durationDays} jours</span>
                          </div>
                          <div className="partner-plan-limits">
                            <span>
                              {plan.maxContests === null
                                ? 'Concours illimités'
                                : `${formatNumber(plan.maxContests)} concours`}
                            </span>
                            <span>
                              {plan.maxBoosts === null
                                ? 'Boosts illimités'
                                : `${formatNumber(plan.maxBoosts)} boosts`}
                            </span>
                          </div>
                          {plan.benefits.length > 0 ? (
                            <ul>
                              {plan.benefits.slice(0, 4).map((benefit) => (
                                <li key={benefit}>{benefit}</li>
                              ))}
                            </ul>
                          ) : null}
                          <button
                            className={isCurrentPlan ? 'table-action-button' : 'primary-button'}
                            disabled={isRequestingSubscription}
                            onClick={() => handlePartnerSubscriptionRequest(plan)}
                            type="button"
                          >
                            {isRequestingSubscription
                              ? 'Envoi...'
                              : isCurrentPlan
                                ? 'Renouveler'
                                : 'Choisir ce forfait'}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="partner-subscription-empty">
                    <strong>Aucun forfait disponible</strong>
                    <p>Les offres partenaires actives apparaîtront ici après configuration SA.</p>
                  </div>
                )}
              </div>

              <div className="partner-subscription-history">
                <div className="section-heading compact-heading">
                  <div>
                    <p className="eyebrow">Historique</p>
                    <h3>Derniers abonnements</h3>
                  </div>
                  <span className="pill">{formatNumber(subscriptionHistory.length)} lignes</span>
                </div>

                {subscriptionHistory.length > 0 ? (
                  <div className="subscription-list partner-subscription-list">
                    {subscriptionHistory.map((subscription) => (
                      <article className="subscription-row partner-subscription-row" key={subscription.id}>
                        <div>
                          <strong>{subscription.planName}</strong>
                          <p>
                            {subscription.paymentMethod || 'Paiement'} ·{' '}
                            {formatMoney(subscription.amount)}
                          </p>
                          <small>
                            Du {formatDate(subscription.startsAt)} au{' '}
                            {formatDate(subscription.expiresAt)}
                          </small>
                        </div>
                        <span className={`status-pill ${subscription.status}`}>
                          {subscription.status}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="partner-subscription-empty">
                    <strong>Aucun historique d’abonnement</strong>
                    <p>
                      Le forfait actuel est visible ci-dessus. Les renouvellements
                      apparaîtront ici dès leur activation.
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>
        ) : null}

        {activePartnerView === 'settings' ? (
          <section className="partner-page-section dashboard-grid">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Profil</p>
                  <h2>Informations partenaire</h2>
                </div>
              </div>
              <form className="category-form" onSubmit={handleUpdatePartnerProfile}>
                <div className="form-grid two-columns">
                  <label>
                    <span>Marque</span>
                    <input
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          companyName: event.target.value,
                        }))
                      }
                      value={profileForm.companyName}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      type="email"
                      value={profileForm.email}
                    />
                  </label>
                </div>
                <div className="form-grid two-columns">
                  <label>
                    <span>Téléphone</span>
                    <input
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      value={profileForm.phone}
                    />
                  </label>
                  <label>
                    <span>Secteur</span>
                    <input
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          sector: event.target.value,
                        }))
                      }
                      value={profileForm.sector}
                    />
                  </label>
                </div>
                <label>
                  <span>Logo URL</span>
                  <input
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        logoUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    value={profileForm.logoUrl}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    className="inline-action-button"
                    disabled={isProfileSaving}
                    type="submit"
                  >
                    {isProfileSaving ? 'Mise à jour...' : 'Enregistrer le profil'}
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Sécurité</p>
                  <h2>Mot de passe</h2>
                </div>
                <span className="status-pill pending">Sensible</span>
              </div>
              <form className="category-form" onSubmit={handleUpdatePartnerPassword}>
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
                  <span>Confirmer</span>
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
          </section>
        ) : null}
      </section>

      {isContestModalOpen ? (
        <PartnerContestModal
          categories={categories}
          error={contestError}
          form={contestForm}
          isSaving={isSavingContest}
          mode={editingPartnerContestId ? 'edit' : 'create'}
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
