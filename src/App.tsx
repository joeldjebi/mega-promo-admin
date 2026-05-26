import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from './auth/useAdminAuth'
import { LandingPage as PublicLandingPage } from './features/landing/LandingPage'
import { LegalPage as PublicLegalPage } from './features/landing/LegalPage'
import {
  defaultLandingContent,
  type LandingPageContent,
  mergeLandingContent,
} from './features/landing/landingContent'
import { supabase } from './lib/supabase'
import { registerWebPushToken } from './lib/webPush'

type AuthRole = 'super-admin' | 'partner'
type CategoryItem = {
  id: string
  name: string
  contests: number
  color: string
  description: string
  isActive: boolean
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
  sendPush: boolean
  sendSms: boolean
  smsMessage: string
}
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
  hasPushToken?: boolean
  pushPlatform?: string
  pushLastError?: string
  pushLastErrorAt?: string
}
type ContestOption = {
  id: string
  title: string
  prizeValue: number
  prizeDescription: string
  endsAt: string
  isLive: boolean
}
type WinnerItem = {
  id: string
  userId: string
  userLabel: string
  contestId: string
  contestTitle: string
  isLiveContest: boolean
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
type RewardCatalogType = string
type RewardTypeItem = {
  key: string
  name: string
  description: string
  icon: string
  color: string
  isActive: boolean
  orderIndex: number
}
type RewardTypeFormState = {
  key: string
  name: string
  description: string
  icon: string
  color: string
  isActive: boolean
  orderIndex: string
}
type RewardCatalogItem = {
  id: string
  name: string
  rewardType: RewardCatalogType
  description: string
  valueLabel: string
  estimatedValue: number
  partnerId: string
  partnerName: string
  defaultCode: string
  defaultDeliveryInstructions: string
  terms: string
  stockQuantity: number | null
  usedQuantity: number
  isActive: boolean
  createdAt: string
}
type RewardCatalogData = {
  rewards: RewardCatalogItem[]
  partners: PartnerOption[]
  rewardTypes: RewardTypeItem[]
}
type RewardCatalogFormState = {
  name: string
  rewardType: RewardCatalogType
  description: string
  valueLabel: string
  estimatedValue: string
  partnerId: string
  defaultCode: string
  defaultDeliveryInstructions: string
  terms: string
  stockQuantity: string
  isActive: boolean
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
const userRoleFilterLabels: Record<UserRoleFilter, string> = {
  player: 'joueurs',
  partner: 'partenaires',
  all_non_admin: 'utilisateurs hors SA',
}
type UserStatusFilter = 'all' | 'active' | 'inactive'
type UserPlanFilter = 'all' | 'premium' | 'standard'
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
type PaymentMethodItem = {
  id: string
  name: string
  operatorKey: string
  country: string
  paymentUrl: string
  instructions: string
  proofPhone: string
  isActive: boolean
  orderIndex: number
}
type PaymentMethodFormState = {
  id: string
  name: string
  operatorKey: string
  country: string
  paymentUrl: string
  instructions: string
  proofPhone: string
  isActive: boolean
  orderIndex: string
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
type LegalPageItem = {
  key: 'terms' | 'privacy'
  title: string
  content: string
  isActive: boolean
  updatedAt: string
}
type LegalPageFormState = {
  title: string
  content: string
  isActive: boolean
}
type ContactSettingsItem = {
  whatsappNumber: string
  whatsappMessage: string
  email: string
}
type ContactSettingsFormState = ContactSettingsItem
type ContactMessageItem = {
  id: string
  name: string
  phone: string
  email: string
  subject: string
  message: string
  source: string
  status: string
  createdAt: string
}
type MobileInfoMessageItem = {
  id: string
  title: string
  body: string
  imageUrl: string
  ctaLabel: string
  ctaUrl: string
  backgroundColor: string
  textColor: string
  isActive: boolean
  orderIndex: number
  createdAt: string
}
type MobileInfoMessageFormState = {
  id: string
  title: string
  body: string
  imageUrl: string
  ctaLabel: string
  ctaUrl: string
  backgroundColor: string
  textColor: string
  isActive: boolean
  orderIndex: string
}
type AppUpdateConfigItem = {
  minimumAndroidBuild: number
  latestAndroidBuild: number
  minimumIosBuild: number
  latestIosBuild: number
  androidStoreUrl: string
  iosStoreUrl: string
  title: string
  message: string
  forceUpdate: boolean
  isActive: boolean
  updatedAt: string
}
type AppUpdateConfigFormState = {
  minimumAndroidBuild: string
  latestAndroidBuild: string
  minimumIosBuild: string
  latestIosBuild: string
  androidStoreUrl: string
  iosStoreUrl: string
  title: string
  message: string
  forceUpdate: boolean
  isActive: boolean
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
type ContestsData = {
  contests: ContestItem[]
  categories: CategoryOption[]
  partners: PartnerOption[]
  types: ContestTypeOption[]
  rewards: RewardCatalogItem[]
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
type PlayerPlanAccessPreset = 'all' | 'free' | 'premium' | 'vip' | 'premium_vip'
const playerPlanAccessOptions: Array<{ key: PlayerPlanAccessKey; label: string }> = [
  { key: 'free', label: 'Standard' },
  { key: 'premium', label: 'Premium' },
  { key: 'vip', label: 'VIP' },
]
const playerPlanAccessPresetOptions: Array<{
  value: PlayerPlanAccessPreset
  label: string
  description: string
}> = [
  {
    value: 'all',
    label: 'Tous les joueurs',
    description: 'Standard, Premium et VIP',
  },
  {
    value: 'free',
    label: 'Standard uniquement',
    description: 'Joueurs sans abonnement actif',
  },
  {
    value: 'premium',
    label: 'Premium uniquement',
    description: 'Joueurs Premium seulement',
  },
  {
    value: 'vip',
    label: 'VIP uniquement',
    description: 'Joueurs VIP seulement',
  },
  {
    value: 'premium_vip',
    label: 'Premium + VIP',
    description: 'Exclut les joueurs Standard',
  },
]

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

function formatPlayerPlanAccess(keys: PlayerPlanAccessKey[]) {
  if (keys.length === 0) return 'Tous les joueurs'
  return playerPlanAccessOptions
    .filter((option) => keys.includes(option.key))
    .map((option) => option.label)
    .join(' + ')
}

function playerPlanAccessPresetFromKeys(
  keys: PlayerPlanAccessKey[],
): PlayerPlanAccessPreset {
  if (keys.length === 0) return 'all'
  if (keys.length === 1) return keys[0]
  if (keys.includes('premium') && keys.includes('vip') && !keys.includes('free')) {
    return 'premium_vip'
  }
  return 'all'
}

function playerPlanAccessKeysFromPreset(
  preset: PlayerPlanAccessPreset,
): PlayerPlanAccessKey[] {
  if (preset === 'all') return []
  if (preset === 'premium_vip') return ['premium', 'vip']
  return [preset]
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
const SUPER_ADMIN_REWARD_CATALOG_ROUTE = `${SUPER_ADMIN_ROUTE}/reward-catalog`
const SUPER_ADMIN_USERS_ROUTE = `${SUPER_ADMIN_ROUTE}/users`
const SUPER_ADMIN_NOTIFICATIONS_ROUTE = `${SUPER_ADMIN_ROUTE}/notifications`
const SUPER_ADMIN_LANDING_ROUTE = `${SUPER_ADMIN_ROUTE}/landing`
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
  { label: 'Catalogue des gains', href: SUPER_ADMIN_REWARD_CATALOG_ROUTE, icon: 'R' },
  { label: 'Notifications', href: SUPER_ADMIN_NOTIFICATIONS_ROUTE, icon: 'N' },
  { label: 'Landing', href: SUPER_ADMIN_LANDING_ROUTE, icon: 'L' },
  { label: 'Paramètres', href: SUPER_ADMIN_SETTINGS_ROUTE, icon: 'S' },
  { label: 'Maintenance', href: SUPER_ADMIN_MAINTENANCE_ROUTE, icon: 'M' },
]

const defaultRewardCatalogTypeLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  discount_code: 'Code réduction',
  voucher: 'Bon de réduction',
  concert_ticket: 'Ticket de concert',
  physical_item: 'Lot physique',
  manual: 'Manuel',
}

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
    isActive: (category.is_active as boolean | null) ?? true,
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
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, username, phone')
      .eq('role', 'player')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('contests')
      .select('id, title, prize_value, prize_description, ends_at, is_live')
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
    isLive: (contest.is_live as boolean | null) ?? false,
  }))
  const userLabels = new Map(users.map((user) => [user.id, user.label]))
  const contestLabels = new Map(contests.map((contest) => [contest.id, contest.title]))
  const contestTypes = new Map(contests.map((contest) => [contest.id, contest.isLive]))

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
      isLiveContest: contestTypes.get((winner.contest_id as string | null) ?? '') ?? false,
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


async function fetchRewardCatalogData(): Promise<RewardCatalogData> {
  const [rewardsResponse, partnersResponse, rewardTypesResponse] = await Promise.all([
    supabase
      .from('reward_catalog')
      .select(
        'id, name, reward_type, description, value_label, estimated_value, partner_id, default_code, default_delivery_instructions, terms, stock_quantity, used_quantity, is_active, created_at',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('partners')
      .select('id, company_name')
      .order('company_name', { ascending: true }),
    supabase
      .from('reward_types')
      .select('key, name, description, icon, color, is_active, order_index')
      .order('order_index', { ascending: true })
      .order('name', { ascending: true }),
  ])

  if (rewardsResponse.error) throw rewardsResponse.error
  if (partnersResponse.error) throw partnersResponse.error
  if (rewardTypesResponse.error) throw rewardTypesResponse.error

  const partners = (partnersResponse.data ?? []).map((partner) => ({
    id: partner.id as string,
    name: (partner.company_name as string | null) || 'Partenaire',
  }))
  const partnerNames = new Map(partners.map((partner) => [partner.id, partner.name]))

  const rewardTypes = (rewardTypesResponse.data ?? []).map((type) => ({
    key: type.key as string,
    name: (type.name as string | null) ?? 'Type de gain',
    description: (type.description as string | null) ?? '',
    icon: (type.icon as string | null) ?? '',
    color: (type.color as string | null) ?? '',
    isActive: (type.is_active as boolean | null) ?? true,
    orderIndex: (type.order_index as number | null) ?? 0,
  }))

  return {
    partners,
    rewardTypes,
    rewards: (rewardsResponse.data ?? []).map((reward) => ({
      id: reward.id as string,
      name: (reward.name as string | null) ?? 'Gain',
      rewardType: ((reward.reward_type as string | null) ?? 'manual') as RewardCatalogType,
      description: (reward.description as string | null) ?? '',
      valueLabel: (reward.value_label as string | null) ?? '',
      estimatedValue: (reward.estimated_value as number | null) ?? 0,
      partnerId: (reward.partner_id as string | null) ?? '',
      partnerName:
        partnerNames.get((reward.partner_id as string | null) ?? '') ?? 'MegaPromo',
      defaultCode: (reward.default_code as string | null) ?? '',
      defaultDeliveryInstructions:
        (reward.default_delivery_instructions as string | null) ?? '',
      terms: (reward.terms as string | null) ?? '',
      stockQuantity: (reward.stock_quantity as number | null) ?? null,
      usedQuantity: (reward.used_quantity as number | null) ?? 0,
      isActive: (reward.is_active as boolean | null) ?? true,
      createdAt: (reward.created_at as string | null) ?? '',
    })),
  }
}

function createDefaultRewardCatalogForm(): RewardCatalogFormState {
  return {
    name: '',
    rewardType: 'manual',
    description: '',
    valueLabel: '',
    estimatedValue: '0',
    partnerId: '',
    defaultCode: '',
    defaultDeliveryInstructions: '',
    terms: '',
    stockQuantity: '',
    isActive: true,
  }
}

function rewardCatalogItemToForm(item: RewardCatalogItem): RewardCatalogFormState {
  return {
    name: item.name,
    rewardType: item.rewardType,
    description: item.description,
    valueLabel: item.valueLabel,
    estimatedValue: String(item.estimatedValue),
    partnerId: item.partnerId,
    defaultCode: item.defaultCode,
    defaultDeliveryInstructions: item.defaultDeliveryInstructions,
    terms: item.terms,
    stockQuantity: item.stockQuantity == null ? '' : String(item.stockQuantity),
    isActive: item.isActive,
  }
}


function createDefaultRewardTypeForm(): RewardTypeFormState {
  return {
    key: '',
    name: '',
    description: '',
    icon: 'gift',
    color: '#475569',
    isActive: true,
    orderIndex: '0',
  }
}

function rewardTypeItemToForm(item: RewardTypeItem): RewardTypeFormState {
  return {
    key: item.key,
    name: item.name,
    description: item.description,
    icon: item.icon,
    color: item.color,
    isActive: item.isActive,
    orderIndex: String(item.orderIndex),
  }
}

function rewardTypeLabel(key: string, types: RewardTypeItem[]) {
  return types.find((type) => type.key === key)?.name ?? defaultRewardCatalogTypeLabels[key] ?? key
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

function createDefaultPaymentMethodForm(): PaymentMethodFormState {
  return {
    id: '',
    name: '',
    operatorKey: '',
    country: 'Côte d’Ivoire',
    paymentUrl: '',
    instructions: '',
    proofPhone: '',
    isActive: true,
    orderIndex: '1',
  }
}

function paymentMethodToForm(method: PaymentMethodItem): PaymentMethodFormState {
  return {
    id: method.id,
    name: method.name,
    operatorKey: method.operatorKey,
    country: method.country,
    paymentUrl: method.paymentUrl,
    instructions: method.instructions,
    proofPhone: method.proofPhone,
    isActive: method.isActive,
    orderIndex: String(method.orderIndex),
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

const defaultLegalForms: Record<'terms' | 'privacy', LegalPageFormState> = {
  terms: {
    title: 'Conditions générales d’utilisation',
    content:
      'Bienvenue sur MegaPromo.\n\nEn utilisant MegaPromo, tu acceptes les règles des concours affichées dans l’application.\n\nUn compte joueur est personnel. Toute tentative de fraude peut entraîner une suspension.',
    isActive: true,
  },
  privacy: {
    title: 'Politique de confidentialité',
    content:
      'MegaPromo collecte les informations nécessaires au fonctionnement du service : numéro de téléphone, profil joueur, participations, gains, informations techniques du device et localisation lorsque l’autorisation est donnée.\n\nCes données servent à sécuriser les concours, prévenir la fraude et améliorer l’expérience.',
    isActive: true,
  },
}

const defaultContactSettingsForm: ContactSettingsFormState = {
  whatsappNumber: '2250000000000',
  whatsappMessage: 'Bonjour MegaPromo, j’ai besoin d’informations.',
  email: 'contact@megapromo.ci',
}

function createDefaultMobileInfoMessageForm(): MobileInfoMessageFormState {
  return {
    id: '',
    title: '',
    body: '',
    imageUrl: '',
    ctaLabel: '',
    ctaUrl: '',
    backgroundColor: '#F7C4AD',
    textColor: '#4B1609',
    isActive: true,
    orderIndex: '1',
  }
}

const defaultAppUpdateConfigForm: AppUpdateConfigFormState = {
  minimumAndroidBuild: '1',
  latestAndroidBuild: '1',
  minimumIosBuild: '1',
  latestIosBuild: '1',
  androidStoreUrl: '',
  iosStoreUrl: '',
  title: 'Mise à jour disponible',
  message:
    'Une nouvelle version de MegaPromo est disponible avec des améliorations importantes.',
  forceUpdate: false,
  isActive: true,
}

function appUpdateConfigToForm(
  config: AppUpdateConfigItem,
): AppUpdateConfigFormState {
  return {
    minimumAndroidBuild: String(config.minimumAndroidBuild),
    latestAndroidBuild: String(config.latestAndroidBuild),
    minimumIosBuild: String(config.minimumIosBuild),
    latestIosBuild: String(config.latestIosBuild),
    androidStoreUrl: config.androidStoreUrl,
    iosStoreUrl: config.iosStoreUrl,
    title: config.title,
    message: config.message,
    forceUpdate: config.forceUpdate,
    isActive: config.isActive,
  }
}

function mobileInfoMessageToForm(
  message: MobileInfoMessageItem,
): MobileInfoMessageFormState {
  return {
    id: message.id,
    title: message.title,
    body: message.body,
    imageUrl: message.imageUrl,
    ctaLabel: message.ctaLabel,
    ctaUrl: message.ctaUrl,
    backgroundColor: message.backgroundColor,
    textColor: message.textColor,
    isActive: message.isActive,
    orderIndex: String(message.orderIndex),
  }
}

function legalPageToForm(page: LegalPageItem): LegalPageFormState {
  return {
    title: page.title,
    content: page.content,
    isActive: page.isActive,
  }
}

async function fetchLegalPagesForAdmin(): Promise<LegalPageItem[]> {
  const { data, error } = await supabase
    .from('legal_pages')
    .select('key, title, content, is_active, updated_at')
    .in('key', ['terms', 'privacy'])
    .order('key', { ascending: true })

  if (error) throw error

  return (data ?? []).map((page) => ({
    key: ((page.key as string | null) ?? 'terms') as 'terms' | 'privacy',
    title: (page.title as string | null) ?? '',
    content: (page.content as string | null) ?? '',
    isActive: (page.is_active as boolean | null) ?? true,
    updatedAt: (page.updated_at as string | null) ?? '',
  }))
}

async function fetchLandingContactSettingsForAdmin(): Promise<ContactSettingsItem> {
  const { data, error } = await supabase
    .from('landing_contact_settings')
    .select('whatsapp_number, whatsapp_message, email')
    .eq('key', 'main')
    .maybeSingle()

  if (error) throw error

  return {
    whatsappNumber:
      (data?.whatsapp_number as string | null) ??
      defaultContactSettingsForm.whatsappNumber,
    whatsappMessage:
      (data?.whatsapp_message as string | null) ??
      defaultContactSettingsForm.whatsappMessage,
    email: (data?.email as string | null) ?? defaultContactSettingsForm.email,
  }
}

async function fetchLandingContactMessagesForAdmin(): Promise<ContactMessageItem[]> {
  const { data, error } = await supabase
    .from('landing_contact_messages')
    .select('id, name, phone, email, subject, message, source, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map((message) => ({
    id: message.id as string,
    name: (message.name as string | null) ?? 'Visiteur',
    phone: (message.phone as string | null) ?? '',
    email: (message.email as string | null) ?? '',
    subject: (message.subject as string | null) ?? 'Contact landing',
    message: (message.message as string | null) ?? '',
    source: (message.source as string | null) ?? 'landing',
    status: (message.status as string | null) ?? 'new',
    createdAt: (message.created_at as string | null) ?? '',
  }))
}

async function fetchMobileInfoMessagesForAdmin(): Promise<MobileInfoMessageItem[]> {
  const { data, error } = await supabase
    .from('mobile_info_messages')
    .select(
      'id, title, body, image_url, cta_label, cta_url, background_color, text_color, is_active, order_index, created_at',
    )
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((message) => ({
    id: message.id as string,
    title: (message.title as string | null) ?? '',
    body: (message.body as string | null) ?? '',
    imageUrl: (message.image_url as string | null) ?? '',
    ctaLabel: (message.cta_label as string | null) ?? '',
    ctaUrl: (message.cta_url as string | null) ?? '',
    backgroundColor: (message.background_color as string | null) ?? '#F7C4AD',
    textColor: (message.text_color as string | null) ?? '#4B1609',
    isActive: (message.is_active as boolean | null) ?? true,
    orderIndex: (message.order_index as number | null) ?? 0,
    createdAt: (message.created_at as string | null) ?? '',
  }))
}

async function fetchAppUpdateConfigForAdmin(): Promise<AppUpdateConfigItem | null> {
  const { data, error } = await supabase
    .from('app_update_config')
    .select(
      'minimum_android_build, latest_android_build, minimum_ios_build, latest_ios_build, android_store_url, ios_store_url, title, message, force_update, is_active, updated_at',
    )
    .eq('key', 'main')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    minimumAndroidBuild: (data.minimum_android_build as number | null) ?? 1,
    latestAndroidBuild: (data.latest_android_build as number | null) ?? 1,
    minimumIosBuild: (data.minimum_ios_build as number | null) ?? 1,
    latestIosBuild: (data.latest_ios_build as number | null) ?? 1,
    androidStoreUrl: (data.android_store_url as string | null) ?? '',
    iosStoreUrl: (data.ios_store_url as string | null) ?? '',
    title: (data.title as string | null) ?? 'Mise à jour disponible',
    message:
      (data.message as string | null) ??
      'Une nouvelle version de MegaPromo est disponible.',
    forceUpdate: (data.force_update as boolean | null) ?? false,
    isActive: (data.is_active as boolean | null) ?? true,
    updatedAt: (data.updated_at as string | null) ?? '',
  }
}

async function fetchPaymentMethodsForAdmin(): Promise<PaymentMethodItem[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, operator_key, country, payment_url, instructions, proof_phone, is_active, order_index')
    .order('order_index', { ascending: true })

  if (error) throw error

  return (data ?? []).map((method) => ({
    id: method.id as string,
    name: (method.name as string | null) ?? 'Paiement',
    operatorKey: (method.operator_key as string | null) ?? '',
    country: (method.country as string | null) ?? '',
    paymentUrl: (method.payment_url as string | null) ?? '',
    instructions: (method.instructions as string | null) ?? '',
    proofPhone: (method.proof_phone as string | null) ?? '',
    isActive: (method.is_active as boolean | null) ?? true,
    orderIndex: (method.order_index as number | null) ?? 0,
  }))
}

async function fetchPlayerKycRequestsForAdmin(): Promise<PlayerKycRequestItem[]> {
  const { data, error } = await supabase
    .from('player_kyc_requests')
    .select(
      'id, user_id, document_type, document_front_url, document_back_url, status, rejection_reason, created_at, reviewed_at, users:user_id(username, phone)',
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map((request) => {
    const player = (request.users as { username?: string | null; phone?: string | null } | null) ?? null
    return {
      id: request.id as string,
      userId: request.user_id as string,
      playerName: player?.username ?? 'Joueur',
      playerPhone: player?.phone ?? '',
      documentType: (request.document_type as string | null) ?? 'national_id',
      documentFrontUrl: (request.document_front_url as string | null) ?? '',
      documentBackUrl: (request.document_back_url as string | null) ?? '',
      status: ((request.status as string | null) ?? 'pending') as PlayerKycRequestItem['status'],
      rejectionReason: (request.rejection_reason as string | null) ?? '',
      createdAt: (request.created_at as string | null) ?? '',
      reviewedAt: (request.reviewed_at as string | null) ?? '',
    }
  })
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

async function fetchContestsData(): Promise<ContestsData> {
  const [
    contestsResponse,
    categoriesResponse,
    partnersResponse,
    typesResponse,
    rewardsResponse,
    participationsResponse,
  ] = await Promise.all([
      supabase
        .from('contests')
        .select(
          'id, partner_id, title, description, image_url, brand_logo_url, brand_name, type, category, category_id, status, prize_description, prize_value, reward_catalog_id, reward_type, winners_count, max_participants, starts_at, ends_at, is_boosted, allowed_player_plan_keys, is_live, live_starts_at, live_status, registered_count, connected_count, current_question_index, created_at',
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
      supabase
        .from('reward_catalog')
        .select(
          'id, name, reward_type, description, value_label, estimated_value, partner_id, default_code, default_delivery_instructions, terms, stock_quantity, used_quantity, is_active, created_at',
        )
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase.from('participations').select('contest_id'),
    ])

  if (contestsResponse.error) throw contestsResponse.error
  if (categoriesResponse.error) throw categoriesResponse.error
  if (partnersResponse.error) throw partnersResponse.error
  if (typesResponse.error) throw typesResponse.error
  if (rewardsResponse.error) throw rewardsResponse.error
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
  const rewards = (rewardsResponse.data ?? []).map((reward) => ({
    id: reward.id as string,
    name: (reward.name as string | null) ?? 'Gain',
    rewardType: ((reward.reward_type as string | null) ?? 'manual') as RewardCatalogType,
    description: (reward.description as string | null) ?? '',
    valueLabel: (reward.value_label as string | null) ?? '',
    estimatedValue: (reward.estimated_value as number | null) ?? 0,
    partnerId: (reward.partner_id as string | null) ?? '',
    partnerName:
      partnerNames.get((reward.partner_id as string | null) ?? '') ?? 'MegaPromo',
    defaultCode: (reward.default_code as string | null) ?? '',
    defaultDeliveryInstructions:
      (reward.default_delivery_instructions as string | null) ?? '',
    terms: (reward.terms as string | null) ?? '',
    stockQuantity: (reward.stock_quantity as number | null) ?? null,
    usedQuantity: (reward.used_quantity as number | null) ?? 0,
    isActive: (reward.is_active as boolean | null) ?? true,
    createdAt: (reward.created_at as string | null) ?? '',
  }))
  const rewardLabels = new Map(
    rewards.map((reward) => [reward.id, reward.valueLabel || reward.name]),
  )
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
    rewards,
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
        rewardCatalogId: (contest.reward_catalog_id as string | null) ?? '',
        rewardType: (contest.reward_type as string | null) ?? 'manual',
        rewardLabel:
          rewardLabels.get((contest.reward_catalog_id as string | null) ?? '') ??
          (contest.prize_description as string | null) ??
          'Gain non défini',
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
        participants: participationsByContest.get(id) ?? 0,
      }
    }),
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

function hasContestEnded(endsAt: string) {
  const endDate = new Date(endsAt)
  return !Number.isNaN(endDate.getTime()) && endDate <= new Date()
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
    rewardCatalogId: contest.rewardCatalogId,
    rewardType: contest.rewardType || 'manual',
    winnersCount: String(contest.winnersCount || 1),
    maxParticipants: contest.maxParticipants ? String(contest.maxParticipants) : '',
    startsAt: isoToDatetimeLocalValue(contest.startsAt),
    endsAt: isoToDatetimeLocalValue(contest.endsAt),
    status: contest.status as ContestStatus,
    isBoosted: contest.isBoosted,
    allowedPlayerPlanKeys: contest.allowedPlayerPlanKeys,
    isLive: contest.isLive,
    liveStartsAt: isoToDatetimeLocalValue(contest.liveStartsAt),
    liveStatus: contest.liveStatus || 'scheduled',
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
    status: winner.status === 'received' ? 'sent' : winner.status,
    sentAt: winner.sentAt ? isoToDatetimeLocalValue(winner.sentAt) : '',
  }
}

function winnerStatusLabel(status: WinnerStatus) {
  if (status === 'sent' || status === 'received') return 'payé'
  if (status === 'cancelled') return 'annulé'
  return 'en attente'
}

function App() {
  return (
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
    | 'reward-catalog'
    | 'users'
    | 'user-detail'
    | 'notifications'
    | 'landing'
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
  if (page === 'reward-catalog') return <SuperAdminRewardCatalogPage />
  if (page === 'users') return <SuperAdminUsersPage />
  if (page === 'user-detail') return <SuperAdminUserDetailPage />
  if (page === 'notifications') return <SuperAdminNotificationsPage />
  if (page === 'landing') return <SuperAdminLandingPage />
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
  const pageSize = 10
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
  const [categoryPage, setCategoryPage] = useState(0)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const filteredCategories = useMemo(() => {
    const normalizedSearch = categorySearch.trim().toLowerCase()

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedSearch ||
        [category.name, category.description]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesStatus =
        categoryStatusFilter === 'all' ||
        (categoryStatusFilter === 'active' && category.isActive) ||
        (categoryStatusFilter === 'inactive' && !category.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categories, categorySearch, categoryStatusFilter])

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  )
  const paginatedCategories = useMemo(() => {
    const startIndex = categoryPage * pageSize
    return filteredCategories.slice(startIndex, startIndex + pageSize)
  }, [categoryPage, filteredCategories])
  const categoryResultsStart =
    filteredCategories.length === 0 ? 0 : categoryPage * pageSize + 1
  const categoryResultsEnd = Math.min(
    filteredCategories.length,
    categoryPage * pageSize + paginatedCategories.length,
  )
  const categoryPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, categoryPage - 2)
    const lastPage = Math.min(totalCategoryPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [categoryPage, totalCategoryPages])

  useEffect(() => {
    setCategoryPage(0)
  }, [categorySearch, categoryStatusFilter])

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

  async function handleDeleteCategory(category: CategoryItem) {
    const message =
      category.contests > 0
        ? `Supprimer la catégorie "${category.name}" ? Les ${category.contests} concours liés seront dissociés de cette catégorie.`
        : `Supprimer la catégorie "${category.name}" ?`
    const confirmed = window.confirm(message)
    if (!confirmed) return

    setCategoriesError('')

    try {
      if (category.contests > 0) {
        const { error: unlinkError } = await supabase
          .from('contests')
          .update({ category_id: null })
          .eq('category_id', category.id)

        if (unlinkError) throw unlinkError
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      await loadCategories()
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer cette catégorie.',
      )
    }
  }

  function handleCategoryTableAction(category: CategoryItem, action: string) {
    if (action === 'edit') {
      openEditCategory(category)
      return
    }

    if (action === 'delete') {
      void handleDeleteCategory(category)
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
              {isCategoriesLoading
                ? 'Chargement'
                : `${paginatedCategories.length} / ${filteredCategories.length}`}
            </span>
          </div>

          <div className="contest-filter-bar compact">
            <input
              className="search-input"
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Rechercher une catégorie"
              type="search"
              value={categorySearch}
            />
            <select
              aria-label="Filtrer les catégories par statut"
              onChange={(event) =>
                setCategoryStatusFilter(
                  event.target.value as 'all' | 'active' | 'inactive',
                )
              }
              value={categoryStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>

          <div className="premium-category-table">
            <div className="premium-category-head">
              <span></span>
              <span>Catégorie</span>
              <span>Concours</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {paginatedCategories.length > 0 ? (
              paginatedCategories.map((category) => (
                <div className="premium-category-row" key={category.id}>
                  <span
                    className="category-color-dot"
                    style={{ background: category.color }}
                  />
                  <div>
                    <strong>{category.name}</strong>
                    <p>{category.description || 'Aucune description'}</p>
                  </div>
                  <small>{category.contests} concours</small>
                  <span className={`status-pill ${category.isActive ? 'active' : 'inactive'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="table-actions compact">
                    <select
                      aria-label={`Actions pour ${category.name}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handleCategoryTableAction(category, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="edit">Modifier</option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCategoriesLoading
                  ? 'Chargement des catégories...'
                  : 'Aucune catégorie ne correspond aux filtres.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(categoryResultsStart)}-{formatNumber(categoryResultsEnd)} sur{' '}
              {formatNumber(filteredCategories.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={categoryPage === 0 || isCategoriesLoading}
                onClick={() => setCategoryPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={categoryPage === 0 || isCategoriesLoading}
                onClick={() => setCategoryPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {categoryPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === categoryPage ? 'active' : ''}`}
                    disabled={isCategoriesLoading}
                    key={page}
                    onClick={() => setCategoryPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={categoryPage + 1 >= totalCategoryPages || isCategoriesLoading}
                onClick={() =>
                  setCategoryPage((page) => Math.min(totalCategoryPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={categoryPage + 1 >= totalCategoryPages || isCategoriesLoading}
                onClick={() => setCategoryPage(totalCategoryPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const pageSize = 10
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
  const [sectorPage, setSectorPage] = useState(0)
  const [sectorSearch, setSectorSearch] = useState('')
  const [sectorStatusFilter, setSectorStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const filteredSectors = useMemo(() => {
    const normalizedSearch = sectorSearch.trim().toLowerCase()

    return sectors.filter((sector) => {
      const matchesSearch =
        !normalizedSearch ||
        [sector.name, sector.description]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesStatus =
        sectorStatusFilter === 'all' ||
        (sectorStatusFilter === 'active' && sector.isActive) ||
        (sectorStatusFilter === 'inactive' && !sector.isActive)

      return matchesSearch && matchesStatus
    })
  }, [sectors, sectorSearch, sectorStatusFilter])

  const totalSectorPages = Math.max(
    1,
    Math.ceil(filteredSectors.length / pageSize),
  )
  const paginatedSectors = useMemo(() => {
    const startIndex = sectorPage * pageSize
    return filteredSectors.slice(startIndex, startIndex + pageSize)
  }, [filteredSectors, sectorPage])
  const sectorResultsStart =
    filteredSectors.length === 0 ? 0 : sectorPage * pageSize + 1
  const sectorResultsEnd = Math.min(
    filteredSectors.length,
    sectorPage * pageSize + paginatedSectors.length,
  )
  const sectorPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, sectorPage - 2)
    const lastPage = Math.min(totalSectorPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [sectorPage, totalSectorPages])

  useEffect(() => {
    setSectorPage(0)
  }, [sectorSearch, sectorStatusFilter])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  function handleSectorTableAction(sector: PartnerSectorItem, action: string) {
    if (action === 'edit') {
      openEditSector(sector)
      return
    }

    if (action === 'status') {
      void handleToggleSector(sector)
      return
    }

    if (action === 'delete') {
      void handleDeleteSector(sector)
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
              {isSectorsLoading
                ? 'Chargement'
                : `${paginatedSectors.length} / ${filteredSectors.length}`}
            </span>
          </div>

          <div className="contest-filter-bar compact">
            <input
              className="search-input"
              onChange={(event) => setSectorSearch(event.target.value)}
              placeholder="Rechercher un secteur"
              type="search"
              value={sectorSearch}
            />
            <select
              aria-label="Filtrer les secteurs par statut"
              onChange={(event) =>
                setSectorStatusFilter(
                  event.target.value as 'all' | 'active' | 'inactive',
                )
              }
              value={sectorStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          <div className="premium-sector-table">
            <div className="premium-sector-head">
              <span></span>
              <span>Secteur</span>
              <span>Ordre</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {paginatedSectors.length > 0 ? (
              paginatedSectors.map((sector) => (
                <div className="premium-sector-row" key={sector.id}>
                  <span className="settings-module-icon">T</span>
                  <div>
                    <strong>{sector.name}</strong>
                    <p>{sector.description || 'Aucune description'}</p>
                  </div>
                  <small>Ordre {sector.orderIndex}</small>
                  <span className={`status-pill ${sector.isActive ? 'active' : 'inactive'}`}>
                    {sector.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="table-actions compact">
                    <select
                      aria-label={`Actions pour ${sector.name}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handleSectorTableAction(sector, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="edit">Modifier</option>
                      <option value="status">
                        {sector.isActive ? 'Désactiver' : 'Activer'}
                      </option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-panel-text">
                {isSectorsLoading
                  ? 'Chargement des secteurs...'
                  : 'Aucun secteur ne correspond aux filtres.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(sectorResultsStart)}-{formatNumber(sectorResultsEnd)} sur{' '}
              {formatNumber(filteredSectors.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={sectorPage === 0 || isSectorsLoading}
                onClick={() => setSectorPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={sectorPage === 0 || isSectorsLoading}
                onClick={() => setSectorPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {sectorPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === sectorPage ? 'active' : ''}`}
                    disabled={isSectorsLoading}
                    key={page}
                    onClick={() => setSectorPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={sectorPage + 1 >= totalSectorPages || isSectorsLoading}
                onClick={() =>
                  setSectorPage((page) => Math.min(totalSectorPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={sectorPage + 1 >= totalSectorPages || isSectorsLoading}
                onClick={() => setSectorPage(totalSectorPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
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
  const pageSize = 10
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
  const [partnerPage, setPartnerPage] = useState(0)
  const [partnerSearch, setPartnerSearch] = useState('')
  const [partnerSectorFilter, setPartnerSectorFilter] = useState('all')
  const [partnerValidationFilter, setPartnerValidationFilter] = useState<
    'all' | 'validated' | 'pending'
  >('all')
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const filteredPartners = useMemo(() => {
    const normalizedSearch = partnerSearch.trim().toLowerCase()

    return partners.filter((partner) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          partner.companyName,
          partner.email,
          partner.phone,
          partner.sector,
          partner.subscriptionPlan,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesSector =
        partnerSectorFilter === 'all' || partner.sector === partnerSectorFilter
      const matchesValidation =
        partnerValidationFilter === 'all' ||
        (partnerValidationFilter === 'validated' && partner.isValidated) ||
        (partnerValidationFilter === 'pending' && !partner.isValidated)
      const matchesStatus =
        partnerStatusFilter === 'all' ||
        (partnerStatusFilter === 'active' && partner.isActive) ||
        (partnerStatusFilter === 'inactive' && !partner.isActive)

      return matchesSearch && matchesSector && matchesValidation && matchesStatus
    })
  }, [
    partners,
    partnerSearch,
    partnerSectorFilter,
    partnerStatusFilter,
    partnerValidationFilter,
  ])

  const totalPartnerPages = Math.max(
    1,
    Math.ceil(filteredPartners.length / pageSize),
  )
  const paginatedPartners = useMemo(() => {
    const startIndex = partnerPage * pageSize
    return filteredPartners.slice(startIndex, startIndex + pageSize)
  }, [filteredPartners, partnerPage])
  const partnerResultsStart =
    filteredPartners.length === 0 ? 0 : partnerPage * pageSize + 1
  const partnerResultsEnd = Math.min(
    filteredPartners.length,
    partnerPage * pageSize + paginatedPartners.length,
  )
  const partnerPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, partnerPage - 2)
    const lastPage = Math.min(totalPartnerPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [partnerPage, totalPartnerPages])

  useEffect(() => {
    setPartnerPage(0)
  }, [
    partnerSearch,
    partnerSectorFilter,
    partnerStatusFilter,
    partnerValidationFilter,
  ])

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

  function handlePartnerTableAction(partner: PartnerItem, action: string) {
    if (action === 'edit') {
      openEditPartnerModal(partner)
      return
    }

    if (action === 'validate') {
      void handleValidatePartner(partner)
      return
    }

    if (action === 'status') {
      void handleTogglePartnerStatus(partner)
      return
    }

    if (action === 'access') {
      openAccessModal(partner)
      return
    }

    if (action === 'delete') {
      void handleDeletePartner(partner)
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
              {isPartnersLoading
                ? 'Chargement'
                : `${paginatedPartners.length} / ${filteredPartners.length}`}
            </span>
          </div>

          <div className="contest-filter-bar">
            <input
              className="search-input"
              onChange={(event) => setPartnerSearch(event.target.value)}
              placeholder="Rechercher un partenaire"
              type="search"
              value={partnerSearch}
            />
            <select
              aria-label="Filtrer les partenaires par secteur"
              onChange={(event) => setPartnerSectorFilter(event.target.value)}
              value={partnerSectorFilter}
            >
              <option value="all">Tous les secteurs</option>
              {partnerSectors.map((sector) => (
                <option key={sector.id} value={sector.name}>
                  {sector.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer les partenaires par validation"
              onChange={(event) =>
                setPartnerValidationFilter(
                  event.target.value as 'all' | 'validated' | 'pending',
                )
              }
              value={partnerValidationFilter}
            >
              <option value="all">Toutes validations</option>
              <option value="validated">Validés</option>
              <option value="pending">À valider</option>
            </select>
            <select
              aria-label="Filtrer les partenaires par statut"
              onChange={(event) =>
                setPartnerStatusFilter(
                  event.target.value as 'all' | 'active' | 'inactive',
                )
              }
              value={partnerStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          <div className="premium-partner-table">
            <div className="premium-partner-head">
              <span>Partenaire</span>
              <span>Secteur</span>
              <span>Forfait</span>
              <span>Validation</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {paginatedPartners.length > 0 ? (
              paginatedPartners.map((partner) => (
                <div className="premium-partner-row" key={partner.id}>
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
                    <select
                      aria-label={`Actions pour ${partner.companyName}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handlePartnerTableAction(partner, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="edit">Modifier</option>
                      <option value="validate">
                        {partner.isValidated ? 'Dévalider' : 'Valider'}
                      </option>
                      <option value="status">
                        {partner.isActive ? 'Désactiver' : 'Activer'}
                      </option>
                      <option value="access">Envoyer accès</option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-panel-text">
                {isPartnersLoading
                  ? 'Chargement des partenaires...'
                  : 'Aucun partenaire ne correspond aux filtres.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(partnerResultsStart)}-{formatNumber(partnerResultsEnd)} sur{' '}
              {formatNumber(filteredPartners.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={partnerPage === 0 || isPartnersLoading}
                onClick={() => setPartnerPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={partnerPage === 0 || isPartnersLoading}
                onClick={() => setPartnerPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {partnerPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === partnerPage ? 'active' : ''}`}
                    disabled={isPartnersLoading}
                    key={page}
                    onClick={() => setPartnerPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={partnerPage + 1 >= totalPartnerPages || isPartnersLoading}
                onClick={() =>
                  setPartnerPage((page) => Math.min(totalPartnerPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={partnerPage + 1 >= totalPartnerPages || isPartnersLoading}
                onClick={() => setPartnerPage(totalPartnerPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
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
  const pageSize = 10
  const [playersData, setPlayersData] = useState<PlayersData>({
    users: [],
    plans: [],
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

  const totalPages = Math.max(1, Math.ceil(playersData.totalCount / pageSize))
  const resultsStart = playersData.totalCount === 0 ? 0 : usersPage * pageSize + 1
  const resultsEnd = Math.min(playersData.totalCount, usersPage * pageSize + playersData.users.length)
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

  const refreshUsersRealtime = useCallback(async () => {
    await loadUsers()
  }, [loadUsers])

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
      navigate(`${SUPER_ADMIN_USERS_ROUTE}/${user.id}`)
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
                      onClick={() => navigate(`${SUPER_ADMIN_USERS_ROUTE}/${user.id}`)}
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
      setNotice(
        `Statut KYC mis à jour : ${playerKycStatusLabel(nextStatus)}.${pushWarning}`,
      )
    } catch (updateError) {
      setError(
        formatUnknownError(updateError, 'Impossible de mettre à jour le statut KYC.'),
      )
    } finally {
      setSavingKycRequestId('')
    }
  }

  const activeSubscription =
    detail.subscriptions.find((subscription) => subscription.status === 'active') ??
    detail.subscriptions[0] ??
    null
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
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {navItems.slice(0, 6).map((item) => (
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
          {navItems.slice(6).map((item) => (
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

const landingEditorBlocks: Array<{
  key: keyof LandingPageContent
  title: string
  description: string
}> = [
  { key: 'navItems', title: 'Navigation', description: 'Liens du menu principal.' },
  { key: 'hero', title: 'Hero', description: 'Badge, titre, sous-titre et boutons.' },
  { key: 'stats', title: 'Compteurs', description: 'Valeurs animées sous le hero.' },
  { key: 'steps', title: 'Comment ça marche', description: 'Les trois étapes utilisateur.' },
  { key: 'games', title: 'Types de jeux', description: 'Quiz, tirage, pronostic et tags.' },
  { key: 'liveContests', title: 'Concours en cours', description: 'Cards simulées affichées sur la landing.' },
  { key: 'playerPlans', title: 'Premium joueur', description: 'Offres gratuit et premium.' },
  { key: 'partners', title: 'Espace partenaires', description: 'Avantages et formules partenaires.' },
  { key: 'testimonials', title: 'Témoignages', description: 'Avis gagnants et avatars.' },
  { key: 'faqs', title: 'FAQ', description: 'Questions fréquentes en accordéon.' },
  { key: 'finalCta', title: 'CTA final', description: 'Dernier appel à télécharger l’app.' },
  { key: 'footer', title: 'Footer', description: 'Description et copyright.' },
]

function SuperAdminLandingPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [content, setContent] = useState<LandingPageContent>(defaultLandingContent)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [selectedBlock, setSelectedBlock] = useState<keyof LandingPageContent>('hero')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadLandingContent = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('landing_page_content')
        .select('content')
        .eq('key', 'main')
        .maybeSingle()

      if (error) throw error

      const nextContent = mergeLandingContent(
        (data?.content as Partial<LandingPageContent> | null) ?? null,
      )
      setContent(nextContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(nextContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
    } catch (error) {
      setError(
        formatUnknownError(
          error,
          'Impossible de charger la landing. Exécute le script SQL landing_page_content.',
        ),
      )
      setContent(defaultLandingContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(defaultLandingContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLandingContent()
  }, [loadLandingContent])

  useRealtimeRefresh(
    'sa-landing-realtime',
    ['landing_page_content'],
    loadLandingContent,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  async function handleSaveBlock(blockKey: keyof LandingPageContent) {
    setNotice('')
    setError('')
    setIsSaving(true)

    try {
      const parsedValue = JSON.parse(drafts[blockKey] ?? 'null')
      const nextContent = mergeLandingContent({
        ...content,
        [blockKey]: parsedValue,
      } as Partial<LandingPageContent>)

      const { error } = await supabase.from('landing_page_content').upsert({
        key: 'main',
        content: nextContent,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setContent(nextContent)
      setDrafts((current) => ({
        ...current,
        [blockKey]: JSON.stringify(nextContent[blockKey], null, 2),
      }))
      setNotice(`Bloc "${landingEditorBlocks.find((block) => block.key === blockKey)?.title}" enregistré.`)
    } catch (error) {
      setError(formatUnknownError(error, 'JSON invalide ou sauvegarde impossible.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResetDefaults() {
    if (!window.confirm('Remettre toute la landing aux valeurs par défaut ?')) return
    setNotice('')
    setError('')
    setIsSaving(true)
    try {
      const { error } = await supabase.from('landing_page_content').upsert({
        key: 'main',
        content: defaultLandingContent,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      setContent(defaultLandingContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(defaultLandingContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
      setNotice('Landing réinitialisée avec les valeurs par défaut.')
    } catch (error) {
      setError(formatUnknownError(error, 'Réinitialisation impossible.'))
    } finally {
      setIsSaving(false)
    }
  }

  const currentBlock = landingEditorBlocks.find((block) => block.key === selectedBlock)

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
          <span>Landing</span>
          <strong>{landingEditorBlocks.length} blocs</strong>
          <p>Contenu public modifiable sans redéployer le front.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Site public</p>
            <h1>Landing page</h1>
            <p className="page-subtitle">
              Modifie les textes, listes, offres, témoignages, FAQ et CTA affichés sur la page d’accueil.
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
              <strong>Landing mise à jour</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Landing indisponible</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <section className="dashboard-grid">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Blocs</p>
                <h2>Éléments éditables</h2>
              </div>
              <span className="pill">{isLoading ? 'Chargement' : 'Prêt'}</span>
            </div>
            <div className="settings-module-grid">
              {landingEditorBlocks.map((block) => (
                <button
                  className={`settings-module-card ${selectedBlock === block.key ? 'active' : ''}`}
                  key={block.key}
                  onClick={() => setSelectedBlock(block.key)}
                  type="button"
                >
                  <span>{block.title.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{block.title}</strong>
                    <p>{block.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">JSON</p>
                <h2>{currentBlock?.title ?? 'Bloc'}</h2>
              </div>
              <div className="section-heading-actions">
                <button
                  className="table-action-button"
                  onClick={() =>
                    window.open('/', '_blank', 'noopener,noreferrer')
                  }
                  type="button"
                >
                  Voir la page
                </button>
                <button
                  className="table-action-button danger"
                  disabled={isSaving}
                  onClick={handleResetDefaults}
                  type="button"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            <form
              className="category-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSaveBlock(selectedBlock)
              }}
            >
              <label>
                <span>{currentBlock?.description}</span>
                <textarea
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [selectedBlock]: event.target.value,
                    }))
                  }
                  rows={18}
                  spellCheck={false}
                  value={drafts[selectedBlock] ?? ''}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  disabled={isSaving}
                  onClick={() =>
                    setDrafts((current) => ({
                      ...current,
                      [selectedBlock]: JSON.stringify(content[selectedBlock], null, 2),
                    }))
                  }
                  type="button"
                >
                  Annuler les changements
                </button>
                <button className="inline-action-button" disabled={isSaving} type="submit">
                  {isSaving ? 'Sauvegarde...' : 'Enregistrer ce bloc'}
                </button>
              </div>
            </form>
          </article>
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([])
  const [paymentMethodForm, setPaymentMethodForm] = useState<PaymentMethodFormState>(
    createDefaultPaymentMethodForm(),
  )
  const [isPaymentMethodSaving, setIsPaymentMethodSaving] = useState(false)
  const [playerKycRequests, setPlayerKycRequests] = useState<PlayerKycRequestItem[]>([])
  const [isKycReviewSaving, setIsKycReviewSaving] = useState(false)
  const [legalPages, setLegalPages] = useState<LegalPageItem[]>([])
  const [legalForms, setLegalForms] =
    useState<Record<'terms' | 'privacy', LegalPageFormState>>(defaultLegalForms)
  const [isLegalSaving, setIsLegalSaving] = useState(false)
  const [contactSettingsForm, setContactSettingsForm] =
    useState<ContactSettingsFormState>(defaultContactSettingsForm)
  const [contactMessages, setContactMessages] = useState<ContactMessageItem[]>([])
  const [isContactSettingsSaving, setIsContactSettingsSaving] = useState(false)
  const [mobileInfoMessages, setMobileInfoMessages] = useState<
    MobileInfoMessageItem[]
  >([])
  const [mobileInfoMessageForm, setMobileInfoMessageForm] =
    useState<MobileInfoMessageFormState>(createDefaultMobileInfoMessageForm())
  const [isMobileInfoMessageSaving, setIsMobileInfoMessageSaving] =
    useState(false)
  const [appUpdateConfigForm, setAppUpdateConfigForm] =
    useState<AppUpdateConfigFormState>(defaultAppUpdateConfigForm)
  const [appUpdateConfigUpdatedAt, setAppUpdateConfigUpdatedAt] = useState('')
  const [isAppUpdateConfigSaving, setIsAppUpdateConfigSaving] = useState(false)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm({
      username: adminAuth.profile?.username ?? '',
      email: adminAuth.user?.email ?? '',
      avatarUrl: adminAuth.profile?.avatar_url ?? '',
    })
  }, [adminAuth.profile, adminAuth.user?.email])

  async function loadPaymentMethods() {
    try {
      setPaymentMethods(await fetchPaymentMethodsForAdmin())
    } catch (error) {
      if (isMissingTableError(error, 'payment_methods')) {
        setPaymentMethods([])
        return
      }
      setSettingsError(
        formatUnknownError(error, 'Impossible de charger les méthodes de paiement.'),
      )
    }
  }

  async function loadPlayerKycRequests() {
    try {
      setPlayerKycRequests(await fetchPlayerKycRequestsForAdmin())
    } catch (error) {
      if (isMissingTableError(error, 'player_kyc_requests')) {
        setPlayerKycRequests([])
        return
      }
      setSettingsError(
        formatUnknownError(error, 'Impossible de charger les vérifications joueur.'),
      )
    }
  }

  async function loadLegalPages() {
    try {
      const pages = await fetchLegalPagesForAdmin()
      const nextForms = { ...defaultLegalForms }
      for (const page of pages) {
        nextForms[page.key] = legalPageToForm(page)
      }
      setLegalPages(pages)
      setLegalForms(nextForms)
    } catch (error) {
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de charger les pages légales. Exécute le script SQL legal_pages.',
        ),
      )
    }
  }

  async function loadLandingContact() {
    try {
      const [settings, messages] = await Promise.all([
        fetchLandingContactSettingsForAdmin(),
        fetchLandingContactMessagesForAdmin(),
      ])
      setContactSettingsForm(settings)
      setContactMessages(messages)
    } catch (error) {
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de charger le contact landing. Exécute le script SQL landing_contact_system.',
        ),
      )
    }
  }

  async function loadMobileInfoMessages() {
    try {
      setMobileInfoMessages(await fetchMobileInfoMessagesForAdmin())
    } catch (error) {
      if (isMissingTableError(error, 'mobile_info_messages')) {
        setMobileInfoMessages([])
        return
      }
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de charger les messages info mobile.',
        ),
      )
    }
  }

  async function loadAppUpdateConfig() {
    try {
      const config = await fetchAppUpdateConfigForAdmin()
      if (!config) {
        setAppUpdateConfigForm(defaultAppUpdateConfigForm)
        setAppUpdateConfigUpdatedAt('')
        return
      }
      setAppUpdateConfigForm(appUpdateConfigToForm(config))
      setAppUpdateConfigUpdatedAt(config.updatedAt)
    } catch (error) {
      if (isMissingTableError(error, 'app_update_config')) {
        setAppUpdateConfigForm(defaultAppUpdateConfigForm)
        setAppUpdateConfigUpdatedAt('')
        return
      }
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de charger la configuration de mise à jour app.',
        ),
      )
    }
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadPaymentMethods(),
        loadPlayerKycRequests(),
        loadLegalPages(),
        loadLandingContact(),
        loadMobileInfoMessages(),
        loadAppUpdateConfig(),
      ])
    })()
  }, [])

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

  async function handleSavePaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const name = paymentMethodForm.name.trim()
    const operatorKey = paymentMethodForm.operatorKey.trim().toLowerCase()
    if (!name || !operatorKey) {
      setSettingsError('Nom et clé opérateur sont requis.')
      return
    }

    setIsPaymentMethodSaving(true)
    try {
      const payload = {
        name,
        operator_key: operatorKey,
        country: paymentMethodForm.country.trim() || 'Côte d’Ivoire',
        payment_url: paymentMethodForm.paymentUrl.trim() || null,
        instructions: paymentMethodForm.instructions.trim() || null,
        proof_phone: paymentMethodForm.proofPhone.trim() || null,
        is_active: paymentMethodForm.isActive,
        order_index: Number(paymentMethodForm.orderIndex) || 0,
        updated_at: new Date().toISOString(),
      }

      const response = paymentMethodForm.id
        ? await supabase.from('payment_methods').update(payload).eq('id', paymentMethodForm.id)
        : await supabase.from('payment_methods').insert(payload)

      if (response.error) throw response.error

      setPaymentMethodForm(createDefaultPaymentMethodForm())
      await loadPaymentMethods()
      setNotice('Méthode de paiement enregistrée.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible d’enregistrer la méthode de paiement.'),
      )
    } finally {
      setIsPaymentMethodSaving(false)
    }
  }

  async function handleReviewPlayerKyc(
    request: PlayerKycRequestItem,
    nextStatus: 'approved' | 'rejected',
  ) {
    setNotice('')
    setSettingsError('')

    const rejectionReason =
      nextStatus === 'rejected'
        ? window.prompt('Motif du rejet à afficher au joueur')?.trim() ?? ''
        : ''

    if (nextStatus === 'rejected' && !rejectionReason) {
      setSettingsError('Le motif est obligatoire pour rejeter une pièce.')
      return
    }

    setIsKycReviewSaving(true)
    try {
      const { error } = await supabase
        .from('player_kyc_requests')
        .update({
          status: nextStatus,
          rejection_reason: nextStatus === 'rejected' ? rejectionReason : null,
          reviewed_by: adminAuth.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) throw error

      await loadPlayerKycRequests()
      setNotice(
        nextStatus === 'approved'
          ? 'Identité joueur validée.'
          : 'Identité joueur rejetée avec motif.',
      )
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour la vérification.'),
      )
    } finally {
      setIsKycReviewSaving(false)
    }
  }

  async function handleSaveLegalPage(
    key: 'terms' | 'privacy',
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const form = legalForms[key]
    const title = form.title.trim()
    const content = form.content.trim()

    if (!title || !content) {
      setSettingsError('Le titre et le contenu sont requis.')
      return
    }

    setIsLegalSaving(true)
    try {
      const { error } = await supabase.from('legal_pages').upsert({
        key,
        title,
        content,
        is_active: form.isActive,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadLegalPages()
      setNotice(
        key === 'terms'
          ? 'Conditions générales mises à jour.'
          : 'Politique de confidentialité mise à jour.',
      )
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible d’enregistrer cette page légale.'),
      )
    } finally {
      setIsLegalSaving(false)
    }
  }

  async function handleSaveLandingContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const whatsappNumber = contactSettingsForm.whatsappNumber.replace(/[^\d]/g, '')
    const whatsappMessage = contactSettingsForm.whatsappMessage.trim()
    const email = contactSettingsForm.email.trim()

    if (!whatsappNumber) {
      setSettingsError('Le numéro WhatsApp est requis.')
      return
    }

    setIsContactSettingsSaving(true)
    try {
      const { error } = await supabase.from('landing_contact_settings').upsert({
        key: 'main',
        whatsapp_number: whatsappNumber,
        whatsapp_message:
          whatsappMessage || defaultContactSettingsForm.whatsappMessage,
        email: email || defaultContactSettingsForm.email,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadLandingContact()
      setNotice('Contact landing et numéro WhatsApp mis à jour.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible d’enregistrer le contact landing.'),
      )
    } finally {
      setIsContactSettingsSaving(false)
    }
  }

  async function handleSaveMobileInfoMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const title = mobileInfoMessageForm.title.trim()
    const body = mobileInfoMessageForm.body.trim()
    if (!title || !body) {
      setSettingsError('Titre et message sont requis.')
      return
    }

    setIsMobileInfoMessageSaving(true)
    try {
      const payload = {
        title,
        body,
        image_url: mobileInfoMessageForm.imageUrl.trim() || null,
        cta_label: mobileInfoMessageForm.ctaLabel.trim() || null,
        cta_url: mobileInfoMessageForm.ctaUrl.trim() || null,
        background_color: mobileInfoMessageForm.backgroundColor.trim() || '#F7C4AD',
        text_color: mobileInfoMessageForm.textColor.trim() || '#4B1609',
        is_active: mobileInfoMessageForm.isActive,
        order_index: Number(mobileInfoMessageForm.orderIndex) || 0,
        updated_at: new Date().toISOString(),
      }

      const response = mobileInfoMessageForm.id
        ? await supabase
            .from('mobile_info_messages')
            .update(payload)
            .eq('id', mobileInfoMessageForm.id)
        : await supabase.from('mobile_info_messages').insert(payload)

      if (response.error) throw response.error

      setMobileInfoMessageForm(createDefaultMobileInfoMessageForm())
      await loadMobileInfoMessages()
      setNotice('Message info mobile enregistré.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible d’enregistrer le message info.'),
      )
    } finally {
      setIsMobileInfoMessageSaving(false)
    }
  }

  async function handleSaveAppUpdateConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setSettingsError('')

    const title = appUpdateConfigForm.title.trim()
    const message = appUpdateConfigForm.message.trim()
    if (!title || !message) {
      setSettingsError('Titre et message de mise à jour sont requis.')
      return
    }

    const minimumAndroidBuild =
      Number(appUpdateConfigForm.minimumAndroidBuild) || 1
    const latestAndroidBuild = Number(appUpdateConfigForm.latestAndroidBuild) || 1
    const minimumIosBuild = Number(appUpdateConfigForm.minimumIosBuild) || 1
    const latestIosBuild = Number(appUpdateConfigForm.latestIosBuild) || 1

    setIsAppUpdateConfigSaving(true)
    try {
      const { error } = await supabase.from('app_update_config').upsert({
        key: 'main',
        minimum_android_build: minimumAndroidBuild,
        latest_android_build: Math.max(latestAndroidBuild, minimumAndroidBuild),
        minimum_ios_build: minimumIosBuild,
        latest_ios_build: Math.max(latestIosBuild, minimumIosBuild),
        android_store_url: appUpdateConfigForm.androidStoreUrl.trim() || null,
        ios_store_url: appUpdateConfigForm.iosStoreUrl.trim() || null,
        title,
        message,
        force_update: appUpdateConfigForm.forceUpdate,
        is_active: appUpdateConfigForm.isActive,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadAppUpdateConfig()
      setNotice('Configuration de mise à jour enregistrée.')
    } catch (error) {
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible d’enregistrer la configuration de mise à jour.',
        ),
      )
    } finally {
      setIsAppUpdateConfigSaving(false)
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

        <section className="settings-overview" aria-label="Vue d'ensemble des paramètres">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">S</span>
            <div>
              <small>Session SA</small>
              <strong>{adminName}</strong>
              <p>Compte vérifié, accès système et configuration sensible.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">P</span>
            <div>
              <small>Paiements</small>
              <strong>{paymentMethods.length} méthode(s)</strong>
              <p>Méthodes, preuves et demandes KYC joueurs.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">M</span>
            <div>
              <small>Mobile</small>
              <strong>{mobileInfoMessages.length} message(s)</strong>
              <p>Version app, informations home et contenus légaux.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">C</span>
            <div>
              <small>Configuration</small>
              <strong>{supabaseUrl && hasAnonKey ? 'Complète' : 'À vérifier'}</strong>
              <p>Supabase, modules fonctionnels et accès sensibles.</p>
            </div>
          </article>
        </section>

        <section className="dashboard-grid settings-grid">
          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Compte & sécurité</p>
              <h2>Identité du Super Admin</h2>
            </div>
            <span className="status-pill active">Session vérifiée</span>
          </div>
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
          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Infrastructure</p>
              <h2>Connexion, environnement et accès</h2>
            </div>
            <span className={`status-pill ${supabaseUrl && hasAnonKey ? 'active' : 'pending'}`}>
              {supabaseUrl && hasAnonKey ? 'Configuré' : 'À compléter'}
            </span>
          </div>
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
          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Paiements & joueurs</p>
              <h2>Souscriptions et vérifications</h2>
            </div>
            <span className="status-pill active">
              {
                playerKycRequests.filter((request) => request.status === 'pending')
                  .length
              }{' '}
              KYC en attente
            </span>
          </div>
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Souscriptions</p>
                <h2>Méthodes de paiement</h2>
              </div>
              <span className="status-pill active">{paymentMethods.length} méthode(s)</span>
            </div>
            <form className="category-form" onSubmit={handleSavePaymentMethod}>
              <div className="form-grid two-columns">
                <label>
                  <span>Nom opérateur</span>
                  <input
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Wave"
                    value={paymentMethodForm.name}
                  />
                </label>
                <label>
                  <span>Clé opérateur</span>
                  <input
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        operatorKey: event.target.value,
                      }))
                    }
                    placeholder="wave"
                    value={paymentMethodForm.operatorKey}
                  />
                </label>
                <label>
                  <span>Pays</span>
                  <input
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        country: event.target.value,
                      }))
                    }
                    value={paymentMethodForm.country}
                  />
                </label>
                <label>
                  <span>Téléphone preuve</span>
                  <input
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        proofPhone: event.target.value,
                      }))
                    }
                    placeholder="+225..."
                    value={paymentMethodForm.proofPhone}
                  />
                </label>
              </div>
              <label>
                <span>Lien de paiement</span>
                <input
                  onChange={(event) =>
                    setPaymentMethodForm((current) => ({
                      ...current,
                      paymentUrl: event.target.value,
                    }))
                  }
                  placeholder="https://pay.wave.com/..."
                  value={paymentMethodForm.paymentUrl}
                />
              </label>
              <label>
                <span>Texte du popup mobile</span>
                <textarea
                  onChange={(event) =>
                    setPaymentMethodForm((current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))
                  }
                  rows={4}
                  value={paymentMethodForm.instructions}
                />
              </label>
              <div className="form-grid two-columns">
                <label>
                  <span>Ordre</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        orderIndex: event.target.value,
                      }))
                    }
                    type="number"
                    value={paymentMethodForm.orderIndex}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    checked={paymentMethodForm.isActive}
                    onChange={(event) =>
                      setPaymentMethodForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>Actif dans l’app mobile</span>
                </label>
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  onClick={() => setPaymentMethodForm(createDefaultPaymentMethodForm())}
                  type="button"
                >
                  Nouveau
                </button>
                <button
                  className="inline-action-button"
                  disabled={isPaymentMethodSaving}
                  type="submit"
                >
                  {isPaymentMethodSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
            <div className="compact-list">
              {paymentMethods.map((method) => (
                <article key={method.id}>
                  <div>
                    <strong>{method.name}</strong>
                    <p>
                      {method.operatorKey} · {method.country} ·{' '}
                      {method.proofPhone || 'preuve non définie'}
                    </p>
                  </div>
                  <div className="table-actions compact">
                    <span className={`status-pill ${method.isActive ? 'active' : 'inactive'}`}>
                      {method.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <button
                      className="table-action-button"
                      onClick={() => setPaymentMethodForm(paymentMethodToForm(method))}
                      type="button"
                    >
                      Modifier
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Joueurs</p>
                <h2>Vérifications d’identité</h2>
              </div>
              <span className="status-pill active">
                {
                  playerKycRequests.filter((request) => request.status === 'pending')
                    .length
                }{' '}
                en attente
              </span>
            </div>
            <div className="compact-list">
              {playerKycRequests.length === 0 ? (
                <article>
                  <div>
                    <strong>Aucune demande</strong>
                    <p>Les pièces envoyées par les joueurs apparaîtront ici.</p>
                  </div>
                </article>
              ) : (
                playerKycRequests.map((request) => (
                  <article key={request.id}>
                    <div>
                      <strong>{request.playerName}</strong>
                      <p>
                        {request.playerPhone || request.userId} ·{' '}
                        {playerKycDocumentLabel(request.documentType)}
                      </p>
                      {request.rejectionReason ? (
                        <p>Motif : {request.rejectionReason}</p>
                      ) : null}
                    </div>
                    <div className="table-actions compact">
                      <span
                        className={`status-pill ${
                          request.status === 'approved'
                            ? 'active'
                            : request.status === 'rejected'
                              ? 'inactive'
                              : 'pending'
                        }`}
                      >
                        {request.status === 'approved'
                          ? 'Validée'
                          : request.status === 'rejected'
                            ? 'Rejetée'
                            : 'En attente'}
                      </span>
                      {request.documentFrontUrl ? (
                        <a
                          className="table-action-button"
                          href={request.documentFrontUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Recto
                        </a>
                      ) : null}
                      {request.documentBackUrl ? (
                        <a
                          className="table-action-button"
                          href={request.documentBackUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Verso
                        </a>
                      ) : null}
                      {request.status === 'pending' ? (
                        <>
                          <button
                            className="table-action-button"
                            disabled={isKycReviewSaving}
                            onClick={() => handleReviewPlayerKyc(request, 'approved')}
                            type="button"
                          >
                            Valider
                          </button>
                          <button
                            className="table-action-button danger"
                            disabled={isKycReviewSaving}
                            onClick={() => handleReviewPlayerKyc(request, 'rejected')}
                            type="button"
                          >
                            Rejeter
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Contenu public</p>
              <h2>Légal, contact et landing</h2>
            </div>
            <span className="status-pill active">{legalPages.length} page(s)</span>
          </div>
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Légal mobile</p>
                <h2>CGU et confidentialité</h2>
              </div>
              <span className="status-pill active">{legalPages.length} page(s)</span>
            </div>
            <div className="settings-module-grid">
              {(['terms', 'privacy'] as const).map((legalKey) => {
                const form = legalForms[legalKey]
                return (
                  <form
                    className="category-form"
                    key={legalKey}
                    onSubmit={(event) => handleSaveLegalPage(legalKey, event)}
                  >
                    <div className="section-heading compact">
                      <div>
                        <p className="eyebrow">
                          {legalKey === 'terms' ? 'CGU' : 'Confidentialité'}
                        </p>
                        <h2>{legalKey === 'terms' ? 'Conditions' : 'Politique'}</h2>
                      </div>
                      <label className="checkbox-row compact">
                        <input
                          checked={form.isActive}
                          onChange={(event) =>
                            setLegalForms((current) => ({
                              ...current,
                              [legalKey]: {
                                ...current[legalKey],
                                isActive: event.target.checked,
                              },
                            }))
                          }
                          type="checkbox"
                        />
                        <span>Actif</span>
                      </label>
                    </div>
                    <label>
                      <span>Titre affiché</span>
                      <input
                        onChange={(event) =>
                          setLegalForms((current) => ({
                            ...current,
                            [legalKey]: {
                              ...current[legalKey],
                              title: event.target.value,
                            },
                          }))
                        }
                        value={form.title}
                      />
                    </label>
                    <label>
                      <span>Contenu</span>
                      <textarea
                        onChange={(event) =>
                          setLegalForms((current) => ({
                            ...current,
                            [legalKey]: {
                              ...current[legalKey],
                              content: event.target.value,
                            },
                          }))
                        }
                        rows={9}
                        value={form.content}
                      />
                    </label>
                    <div className="modal-actions">
                      <button
                        className="inline-action-button"
                        disabled={isLegalSaving}
                        type="submit"
                      >
                        {isLegalSaving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </form>
                )
              })}
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Landing</p>
                <h2>Contact & WhatsApp</h2>
              </div>
              <span className="status-pill active">
                {contactMessages.length} message(s)
              </span>
            </div>
            <form className="category-form" onSubmit={handleSaveLandingContact}>
              <div className="form-grid two-columns">
                <label>
                  <span>Numéro WhatsApp</span>
                  <input
                    onChange={(event) =>
                      setContactSettingsForm((current) => ({
                        ...current,
                        whatsappNumber: event.target.value,
                      }))
                    }
                    placeholder="2250700000000"
                    value={contactSettingsForm.whatsappNumber}
                  />
                </label>
                <label>
                  <span>Email contact</span>
                  <input
                    onChange={(event) =>
                      setContactSettingsForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="contact@megapromo.ci"
                    type="email"
                    value={contactSettingsForm.email}
                  />
                </label>
              </div>
              <label>
                <span>Message pré-rempli WhatsApp</span>
                <textarea
                  onChange={(event) =>
                    setContactSettingsForm((current) => ({
                      ...current,
                      whatsappMessage: event.target.value,
                    }))
                  }
                  rows={3}
                  value={contactSettingsForm.whatsappMessage}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  onClick={() => void loadLandingContact()}
                  type="button"
                >
                  Actualiser
                </button>
                <button
                  className="inline-action-button"
                  disabled={isContactSettingsSaving}
                  type="submit"
                >
                  {isContactSettingsSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
            <div className="compact-list">
              {contactMessages.length === 0 ? (
                <article>
                  <div>
                    <strong>Aucun message landing</strong>
                    <p>Les messages du formulaire de contact apparaîtront ici.</p>
                  </div>
                </article>
              ) : (
                contactMessages.map((message) => (
                  <article key={message.id}>
                    <div>
                      <strong>{message.name}</strong>
                      <p>
                        {message.subject} · {formatDate(message.createdAt)}
                      </p>
                      <p>{message.message}</p>
                      <small>
                        {message.phone || 'Téléphone non défini'}
                        {message.email ? ` · ${message.email}` : ''}
                      </small>
                    </div>
                    <span
                      className={`status-pill ${
                        message.status === 'new' ? 'pending' : 'active'
                      }`}
                    >
                      {message.status === 'new' ? 'Nouveau' : message.status}
                    </span>
                  </article>
                ))
              )}
            </div>
          </article>
          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Application mobile</p>
              <h2>Version, messages et expérience joueur</h2>
            </div>
            <span
              className={`status-pill ${
                appUpdateConfigForm.isActive ? 'active' : 'inactive'
              }`}
            >
              {appUpdateConfigForm.isActive ? 'Contrôle actif' : 'Contrôle inactif'}
            </span>
          </div>
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mobile</p>
                <h2>Mise à jour app</h2>
              </div>
              <span
                className={`status-pill ${
                  appUpdateConfigForm.isActive ? 'active' : 'inactive'
                }`}
              >
                {appUpdateConfigForm.forceUpdate ? 'Obligatoire' : 'Configurable'}
              </span>
            </div>
            <form className="category-form" onSubmit={handleSaveAppUpdateConfig}>
              <div className="form-grid two-columns">
                <label>
                  <span>Build minimum Android</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        minimumAndroidBuild: event.target.value,
                      }))
                    }
                    type="number"
                    value={appUpdateConfigForm.minimumAndroidBuild}
                  />
                </label>
                <label>
                  <span>Dernier build Android</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        latestAndroidBuild: event.target.value,
                      }))
                    }
                    type="number"
                    value={appUpdateConfigForm.latestAndroidBuild}
                  />
                </label>
                <label>
                  <span>Build minimum iOS</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        minimumIosBuild: event.target.value,
                      }))
                    }
                    type="number"
                    value={appUpdateConfigForm.minimumIosBuild}
                  />
                </label>
                <label>
                  <span>Dernier build iOS</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        latestIosBuild: event.target.value,
                      }))
                    }
                    type="number"
                    value={appUpdateConfigForm.latestIosBuild}
                  />
                </label>
              </div>
              <div className="form-grid two-columns">
                <label>
                  <span>Lien Play Store</span>
                  <input
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        androidStoreUrl: event.target.value,
                      }))
                    }
                    placeholder="https://play.google.com/store/apps/details?id=..."
                    value={appUpdateConfigForm.androidStoreUrl}
                  />
                </label>
                <label>
                  <span>Lien App Store</span>
                  <input
                    onChange={(event) =>
                      setAppUpdateConfigForm((current) => ({
                        ...current,
                        iosStoreUrl: event.target.value,
                      }))
                    }
                    placeholder="https://apps.apple.com/app/..."
                    value={appUpdateConfigForm.iosStoreUrl}
                  />
                </label>
              </div>
              <label>
                <span>Titre affiché</span>
                <input
                  onChange={(event) =>
                    setAppUpdateConfigForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  value={appUpdateConfigForm.title}
                />
              </label>
              <label>
                <span>Message affiché</span>
                <textarea
                  onChange={(event) =>
                    setAppUpdateConfigForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  rows={3}
                  value={appUpdateConfigForm.message}
                />
              </label>
              <label className="checkbox-row">
                <input
                  checked={appUpdateConfigForm.isActive}
                  onChange={(event) =>
                    setAppUpdateConfigForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Activer le contrôle de version au démarrage</span>
              </label>
              <label className="checkbox-row">
                <input
                  checked={appUpdateConfigForm.forceUpdate}
                  onChange={(event) =>
                    setAppUpdateConfigForm((current) => ({
                      ...current,
                      forceUpdate: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Forcer la mise à jour pour tous les joueurs</span>
              </label>
              <div className="modal-actions">
                <span className="helper-text">
                  {appUpdateConfigUpdatedAt
                    ? `Dernière modification : ${formatDate(appUpdateConfigUpdatedAt)}`
                    : 'Exécute le script SQL app_update_config si la table manque.'}
                </span>
                <button
                  className="inline-action-button"
                  disabled={isAppUpdateConfigSaving}
                  type="submit"
                >
                  {isAppUpdateConfigSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mobile</p>
                <h2>Messages d’information</h2>
              </div>
              <span className="status-pill active">
                {mobileInfoMessages.length} message(s)
              </span>
            </div>
            <form className="category-form" onSubmit={handleSaveMobileInfoMessage}>
              <div className="form-grid two-columns">
                <label>
                  <span>Titre</span>
                  <input
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Nouveau Quiz Live"
                    value={mobileInfoMessageForm.title}
                  />
                </label>
                <label>
                  <span>Ordre</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        orderIndex: event.target.value,
                      }))
                    }
                    type="number"
                    value={mobileInfoMessageForm.orderIndex}
                  />
                </label>
              </div>
              <label>
                <span>Message</span>
                <textarea
                  onChange={(event) =>
                    setMobileInfoMessageForm((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  rows={4}
                  value={mobileInfoMessageForm.body}
                />
              </label>
              <div className="form-grid two-columns">
                <label>
                  <span>CTA label</span>
                  <input
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        ctaLabel: event.target.value,
                      }))
                    }
                    placeholder="Voir les jeux"
                    value={mobileInfoMessageForm.ctaLabel}
                  />
                </label>
                <label>
                  <span>CTA route ou lien</span>
                  <input
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        ctaUrl: event.target.value,
                      }))
                    }
                    placeholder="/contests ou https://apps.apple.com/app/..."
                    value={mobileInfoMessageForm.ctaUrl}
                  />
                </label>
                <label>
                  <span>Couleur fond</span>
                  <input
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        backgroundColor: event.target.value,
                      }))
                    }
                    value={mobileInfoMessageForm.backgroundColor}
                  />
                </label>
                <label>
                  <span>Couleur texte</span>
                  <input
                    onChange={(event) =>
                      setMobileInfoMessageForm((current) => ({
                        ...current,
                        textColor: event.target.value,
                      }))
                    }
                    value={mobileInfoMessageForm.textColor}
                  />
                </label>
              </div>
              <label className="checkbox-row">
                <input
                  checked={mobileInfoMessageForm.isActive}
                  onChange={(event) =>
                    setMobileInfoMessageForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Afficher dans l’app mobile</span>
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  onClick={() =>
                    setMobileInfoMessageForm(createDefaultMobileInfoMessageForm())
                  }
                  type="button"
                >
                  Nouveau
                </button>
                <button
                  className="inline-action-button"
                  disabled={isMobileInfoMessageSaving}
                  type="submit"
                >
                  {isMobileInfoMessageSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
            <div className="compact-list">
              {mobileInfoMessages.length === 0 ? (
                <article>
                  <div>
                    <strong>Aucun message</strong>
                    <p>Ajoute un message pour le carousel de la page home.</p>
                  </div>
                </article>
              ) : (
                mobileInfoMessages.map((message) => (
                  <article key={message.id}>
                    <div>
                      <strong>{message.title}</strong>
                      <p>{message.body}</p>
                      <small>{formatDate(message.createdAt)}</small>
                    </div>
                    <div className="table-actions compact">
                      <span
                        className={`status-pill ${
                          message.isActive ? 'active' : 'inactive'
                        }`}
                      >
                        {message.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <button
                        className="table-action-button"
                        onClick={() =>
                          setMobileInfoMessageForm(
                            mobileInfoMessageToForm(message),
                          )
                        }
                        type="button"
                      >
                        Modifier
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <div className="settings-group-title">
            <div>
              <p className="eyebrow">Modules</p>
              <h2>Raccourcis de configuration</h2>
            </div>
            <span className="status-pill pending">6 modules</span>
          </div>
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


function DeleteAllContestsConfirmModal({
  confirmation,
  contestsCount,
  isDeleting,
  onChangeConfirmation,
  onClose,
  onConfirm,
}: {
  confirmation: string
  contestsCount: number
  isDeleting: boolean
  onChangeConfirmation: (value: string) => void
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  const canConfirm =
    confirmation.trim().toUpperCase() === 'SUPPRIMER' && contestsCount > 0 && !isDeleting

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label="Supprimer tous les jeux concours et Quiz Live"
        aria-modal="true"
        className="category-modal maintenance-confirm-modal delete-contests-confirm-modal"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Suppression globale</p>
            <h2>Supprimer les concours</h2>
          </div>
          <button disabled={isDeleting} onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        <div className="maintenance-confirm-body">
          <span className="status-pill cancelled">Action irréversible</span>
          <p>
            Cette action supprimera tous les jeux concours et Quiz Live visibles dans
            l'administration. Les données liées peuvent aussi être retirées selon les
            règles de cascade de la base.
          </p>

          <div className="delete-confirm-summary">
            <span>
              <strong>{contestsCount}</strong>
              <small>Concours / QL</small>
            </span>
            <span>
              <strong>Jeux</strong>
              <small>Standards inclus</small>
            </span>
            <span>
              <strong>QL</strong>
              <small>Lives inclus</small>
            </span>
          </div>

          <div className="maintenance-confirm-code">
            <strong>Écris SUPPRIMER pour confirmer</strong>
            <input
              autoFocus
              disabled={isDeleting}
              onChange={(event) => onChangeConfirmation(event.target.value)}
              placeholder="SUPPRIMER"
              value={confirmation}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button disabled={isDeleting} onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </section>
    </div>
  )
}


function SuperAdminRewardCatalogPage() {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [catalogData, setCatalogData] = useState<RewardCatalogData>({
    rewards: [],
    partners: [],
    rewardTypes: [],
  })
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [catalogNotice, setCatalogNotice] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | RewardCatalogType>('all')
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [editingCatalogItemId, setEditingCatalogItemId] = useState<string | null>(null)
  const [catalogForm, setCatalogForm] = useState<RewardCatalogFormState>(
    createDefaultRewardCatalogForm,
  )
  const [catalogFormError, setCatalogFormError] = useState('')
  const [isSavingCatalogItem, setIsSavingCatalogItem] = useState(false)
  const [isRewardTypeModalOpen, setIsRewardTypeModalOpen] = useState(false)
  const [rewardTypeForm, setRewardTypeForm] = useState<RewardTypeFormState>(
    createDefaultRewardTypeForm,
  )
  const [rewardTypeFormError, setRewardTypeFormError] = useState('')
  const [isSavingRewardType, setIsSavingRewardType] = useState(false)

  const filteredRewards = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase()
    return catalogData.rewards.filter((reward) => {
      const matchesSearch =
        !search ||
        [reward.name, reward.description, reward.valueLabel, reward.partnerName, reward.defaultCode]
          .join(' ')
          .toLowerCase()
          .includes(search)
      const matchesType =
        catalogTypeFilter === 'all' || reward.rewardType === catalogTypeFilter
      const matchesStatus =
        catalogStatusFilter === 'all' ||
        (catalogStatusFilter === 'active' ? reward.isActive : !reward.isActive)
      return matchesSearch && matchesType && matchesStatus
    })
  }, [catalogData.rewards, catalogSearch, catalogStatusFilter, catalogTypeFilter])

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true)
    setCatalogError('')
    try {
      setCatalogData(await fetchRewardCatalogData())
    } catch (error) {
      setCatalogError(
        formatUnknownError(error, 'Impossible de charger le catalogue des gains.'),
      )
    } finally {
      setIsCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  useRealtimeRefresh('sa-reward-catalog-realtime', ['reward_catalog', 'partners'], loadCatalog)

  async function handleLogout() {
    await adminAuth.logout()
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
  }

  function openCatalogModal(item?: RewardCatalogItem) {
    setCatalogFormError('')
    setEditingCatalogItemId(item?.id ?? null)
    setCatalogForm(item ? rewardCatalogItemToForm(item) : createDefaultRewardCatalogForm())
    setIsCatalogModalOpen(true)
  }

  function closeCatalogModal() {
    if (isSavingCatalogItem) return
    setCatalogFormError('')
    setEditingCatalogItemId(null)
    setIsCatalogModalOpen(false)
  }

  async function handleCatalogSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCatalogFormError('')
    setCatalogNotice('')

    const estimatedValue = Number(catalogForm.estimatedValue || 0)
    const stockQuantity = catalogForm.stockQuantity.trim()
      ? Number(catalogForm.stockQuantity)
      : null

    if (!catalogForm.name.trim()) {
      setCatalogFormError('Le nom du gain est obligatoire.')
      return
    }

    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      setCatalogFormError('La valeur estimée doit être supérieure ou égale à 0.')
      return
    }

    if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) {
      setCatalogFormError('Le stock doit être un nombre entier positif.')
      return
    }

    setIsSavingCatalogItem(true)
    try {
      const rpcName = editingCatalogItemId
        ? 'update_reward_catalog_item'
        : 'create_reward_catalog_item'
      const payload = {
        ...(editingCatalogItemId ? { p_item_id: editingCatalogItemId } : {}),
        p_name: catalogForm.name.trim(),
        p_reward_type: catalogForm.rewardType,
        p_description: catalogForm.description.trim() || null,
        p_value_label: catalogForm.valueLabel.trim() || null,
        p_estimated_value: estimatedValue,
        p_partner_id: catalogForm.partnerId || null,
        p_default_code: catalogForm.defaultCode.trim() || null,
        p_default_delivery_instructions:
          catalogForm.defaultDeliveryInstructions.trim() || null,
        p_terms: catalogForm.terms.trim() || null,
        p_stock_quantity: stockQuantity,
        p_is_active: catalogForm.isActive,
      }
      const { error } = await supabase.rpc(rpcName, payload)
      if (error) throw error

      setCatalogNotice(
        editingCatalogItemId
          ? 'Gain mis à jour dans le catalogue.'
          : 'Gain ajouté au catalogue.',
      )
      await loadCatalog()
      closeCatalogModal()
    } catch (error) {
      setCatalogFormError(
        formatUnknownError(error, 'Impossible d’enregistrer ce gain.'),
      )
    } finally {
      setIsSavingCatalogItem(false)
    }
  }


  function openRewardTypeModal(item?: RewardTypeItem) {
    setRewardTypeFormError('')
    setRewardTypeForm(item ? rewardTypeItemToForm(item) : createDefaultRewardTypeForm())
    setIsRewardTypeModalOpen(true)
  }

  function closeRewardTypeModal() {
    if (isSavingRewardType) return
    setRewardTypeFormError('')
    setIsRewardTypeModalOpen(false)
  }

  async function handleRewardTypeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRewardTypeFormError('')
    setCatalogNotice('')

    const orderIndex = Number(rewardTypeForm.orderIndex || 0)
    if (!rewardTypeForm.key.trim()) {
      setRewardTypeFormError('La clé du type est obligatoire.')
      return
    }
    if (!rewardTypeForm.name.trim()) {
      setRewardTypeFormError('Le nom du type est obligatoire.')
      return
    }
    if (!Number.isInteger(orderIndex)) {
      setRewardTypeFormError('L’ordre doit être un nombre entier.')
      return
    }

    setIsSavingRewardType(true)
    try {
      const { error } = await supabase.rpc('upsert_reward_type', {
        p_key: rewardTypeForm.key.trim(),
        p_name: rewardTypeForm.name.trim(),
        p_description: rewardTypeForm.description.trim() || null,
        p_icon: rewardTypeForm.icon.trim() || null,
        p_color: rewardTypeForm.color.trim() || null,
        p_is_active: rewardTypeForm.isActive,
        p_order_index: orderIndex,
      })
      if (error) throw error

      setCatalogNotice('Type de gain enregistré.')
      await loadCatalog()
      closeRewardTypeModal()
    } catch (error) {
      setRewardTypeFormError(
        formatUnknownError(error, 'Impossible d’enregistrer ce type de gain.'),
      )
    } finally {
      setIsSavingRewardType(false)
    }
  }

  async function handleDisableRewardType(item: RewardTypeItem) {
    const confirmed = window.confirm(
      `Désactiver le type "${item.name}" ? Il restera disponible dans l’historique mais ne sera plus proposé pour les nouveaux gains.`,
    )
    if (!confirmed) return

    setCatalogError('')
    setCatalogNotice('')
    const { error } = await supabase.rpc('disable_reward_type', {
      p_key: item.key,
    })

    if (error) {
      setCatalogError(formatUnknownError(error, 'Impossible de désactiver ce type.'))
      return
    }

    setCatalogNotice('Type de gain désactivé.')
    await loadCatalog()
  }

  async function handleDeleteRewardType(item: RewardTypeItem) {
    const confirmed = window.confirm(
      `Supprimer définitivement le type "${item.name}" ? Cette action est possible uniquement si aucun gain, concours ou gagnant ne l’utilise.`,
    )
    if (!confirmed) return

    setCatalogError('')
    setCatalogNotice('')
    const { error } = await supabase.rpc('delete_reward_type', {
      p_key: item.key,
    })

    if (error) {
      setCatalogError(formatUnknownError(error, 'Impossible de supprimer ce type.'))
      return
    }

    setCatalogNotice('Type de gain supprimé.')
    await loadCatalog()
  }

  async function handleDisableCatalogItem(item: RewardCatalogItem) {
    const confirmed = window.confirm(
      `Désactiver le gain "${item.name}" ? Il ne sera plus proposé lors de la création des prochains concours.`,
    )
    if (!confirmed) return

    setCatalogError('')
    setCatalogNotice('')
    const { error } = await supabase.rpc('disable_reward_catalog_item', {
      p_item_id: item.id,
    })

    if (error) {
      setCatalogError(formatUnknownError(error, 'Impossible de désactiver ce gain.'))
      return
    }

    setCatalogNotice('Gain désactivé dans le catalogue.')
    await loadCatalog()
  }

  async function handleDeleteCatalogItem(item: RewardCatalogItem) {
    const confirmed = window.confirm(
      `Supprimer définitivement le gain "${item.name}" ? Cette action est possible uniquement si aucun concours ou gagnant ne l’utilise.`,
    )
    if (!confirmed) return

    setCatalogError('')
    setCatalogNotice('')
    const { error } = await supabase.rpc('delete_reward_catalog_item', {
      p_item_id: item.id,
    })

    if (error) {
      setCatalogError(formatUnknownError(error, 'Impossible de supprimer ce gain.'))
      return
    }

    setCatalogNotice('Gain supprimé du catalogue.')
    await loadCatalog()
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
          <strong>{catalogData.rewards.length} gains</strong>
          <p>Enregistre les codes, bons, tickets et lots réutilisables.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Récompenses</p>
            <h1>Catalogue des gains</h1>
            <p className="page-subtitle">
              Crée les gains que le SA pourra rattacher aux concours et aux gagnants.
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
              onClick={() => openCatalogModal()}
              type="button"
            >
              Nouveau gain
            </button>
            <button
              className="secondary-action-button"
              onClick={() => openRewardTypeModal()}
              type="button"
            >
              Nouveau type
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {catalogError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Catalogue indisponible</strong>
              <p>{catalogError}</p>
            </div>
            <button onClick={loadCatalog} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        {catalogNotice ? (
          <div className="dashboard-alert success" role="status">
            <div>
              <strong>Catalogue mis à jour</strong>
              <p>{catalogNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2>Liste des gains</h2>
            </div>
            <span className="pill">
              {isCatalogLoading
                ? 'Chargement'
                : `${filteredRewards.length}/${catalogData.rewards.length} entrées`}
            </span>
          </div>

          <div className="winner-filters">
            <input
              aria-label="Rechercher un gain"
              onChange={(event) => setCatalogSearch(event.target.value)}
              placeholder="Rechercher nom, partenaire, code..."
              type="search"
              value={catalogSearch}
            />
            <select
              aria-label="Filtrer par type"
              onChange={(event) =>
                setCatalogTypeFilter(event.target.value as 'all' | RewardCatalogType)
              }
              value={catalogTypeFilter}
            >
              <option value="all">Tous les types</option>
              {catalogData.rewardTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer par statut"
              onChange={(event) =>
                setCatalogStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
              }
              value={catalogStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          <div className="premium-winner-table" role="table" aria-label="Catalogue des gains">
            <div className="premium-winner-head" role="row">
              <span>Gain</span>
              <span>Type</span>
              <span>Partenaire</span>
              <span>Valeur / Stock</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {filteredRewards.length > 0 ? (
              filteredRewards.map((reward) => (
                <article className="premium-winner-row" key={reward.id} role="row">
                  <div>
                    <strong>{reward.name}</strong>
                    <p>{reward.description || reward.valueLabel || 'Gain catalogue'}</p>
                  </div>
                  <div>
                    <strong>{rewardTypeLabel(reward.rewardType, catalogData.rewardTypes)}</strong>
                    <p>{reward.defaultCode ? `Code: ${reward.defaultCode}` : 'Sans code par défaut'}</p>
                  </div>
                  <div>
                    <strong>{reward.partnerName}</strong>
                    <p>{formatDate(reward.createdAt)}</p>
                  </div>
                  <div>
                    <strong>{formatMoney(reward.estimatedValue)}</strong>
                    <p>
                      {reward.stockQuantity == null
                        ? 'Stock illimité'
                        : `${reward.usedQuantity}/${reward.stockQuantity} utilisés`}
                    </p>
                  </div>
                  <span className={`status-pill ${reward.isActive ? 'sent' : 'cancelled'}`}>
                    {reward.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="contest-actions">
                    <button
                      className="table-action-button"
                      onClick={() => openCatalogModal(reward)}
                      type="button"
                    >
                      Modifier
                    </button>
                    {reward.isActive ? (
                      <button
                        className="table-action-button danger"
                        onClick={() => handleDisableCatalogItem(reward)}
                        type="button"
                      >
                        Désactiver
                      </button>
                    ) : null}
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteCatalogItem(reward)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCatalogLoading
                  ? 'Chargement du catalogue...'
                  : 'Aucun gain ne correspond aux filtres.'}
              </p>
            )}
          </div>
        </section>

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Types</p>
              <h2>Types de gains</h2>
            </div>
            <button
              className="inline-action-button"
              onClick={() => openRewardTypeModal()}
              type="button"
            >
              Nouveau type
            </button>
          </div>

          <div className="premium-winner-table" role="table" aria-label="Types de gains">
            <div className="premium-winner-head" role="row">
              <span>Type</span>
              <span>Clé</span>
              <span>Style</span>
              <span>Ordre</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {catalogData.rewardTypes.length > 0 ? (
              catalogData.rewardTypes.map((type) => (
                <article className="premium-winner-row" key={type.key} role="row">
                  <div>
                    <strong>{type.name}</strong>
                    <p>{type.description || 'Type de gain'}</p>
                  </div>
                  <strong>{type.key}</strong>
                  <div>
                    <strong>{type.icon || 'gift'}</strong>
                    <p>{type.color || 'Couleur non définie'}</p>
                  </div>
                  <strong>{type.orderIndex}</strong>
                  <span className={`status-pill ${type.isActive ? 'sent' : 'cancelled'}`}>
                    {type.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="contest-actions">
                    <button
                      className="table-action-button"
                      onClick={() => openRewardTypeModal(type)}
                      type="button"
                    >
                      Modifier
                    </button>
                    {type.isActive ? (
                      <button
                        className="table-action-button danger"
                        onClick={() => handleDisableRewardType(type)}
                        type="button"
                      >
                        Désactiver
                      </button>
                    ) : null}
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteRewardType(type)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">Aucun type de gain enregistré.</p>
            )}
          </div>
        </section>
      </section>

      {isCatalogModalOpen ? (
        <RewardCatalogModal
          error={catalogFormError}
          form={catalogForm}
          isSaving={isSavingCatalogItem}
          mode={editingCatalogItemId ? 'edit' : 'create'}
          onChange={setCatalogForm}
          onClose={closeCatalogModal}
          onSubmit={handleCatalogSubmit}
          partners={catalogData.partners}
          rewardTypes={catalogData.rewardTypes.filter((type) => type.isActive)}
        />
      ) : null}

      {isRewardTypeModalOpen ? (
        <RewardTypeModal
          error={rewardTypeFormError}
          form={rewardTypeForm}
          isSaving={isSavingRewardType}
          onChange={setRewardTypeForm}
          onClose={closeRewardTypeModal}
          onSubmit={handleRewardTypeSubmit}
        />
      ) : null}
    </main>
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
  const [winnerSearch, setWinnerSearch] = useState('')
  const [winnerStatusFilter, setWinnerStatusFilter] = useState<'all' | WinnerStatus>('all')
  const [winnerTypeFilter, setWinnerTypeFilter] = useState<'all' | 'contest' | 'live'>('all')

  const filteredWinners = useMemo(() => {
    const search = winnerSearch.trim().toLowerCase()
    return winnersData.winners.filter((winner) => {
      const matchesSearch =
        !search ||
        winner.userLabel.toLowerCase().includes(search) ||
        winner.contestTitle.toLowerCase().includes(search) ||
        winner.paymentNumber.toLowerCase().includes(search)
      const matchesStatus =
        winnerStatusFilter === 'all' || winner.status === winnerStatusFilter
      const matchesType =
        winnerTypeFilter === 'all' ||
        (winnerTypeFilter === 'live' ? winner.isLiveContest : !winner.isLiveContest)
      return matchesSearch && matchesStatus && matchesType
    })
  }, [winnerSearch, winnerStatusFilter, winnerTypeFilter, winnersData.winners])

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

      const previousWinner = editingWinnerId
        ? winnersData.winners.find((winner) => winner.id === editingWinnerId)
        : null
      const shouldNotifyWinnerStatus =
        winnerForm.status === 'sent' &&
        previousWinner?.status !== winnerForm.status

      if (shouldNotifyWinnerStatus) {
        const selectedUser = winnersData.users.find(
          (user) => user.id === winnerForm.userId,
        )
        await sendWinnerStatusPush({
          userId: winnerForm.userId,
          userLabel: selectedUser?.label ?? 'Joueur',
          contestTitle: selectedContest?.title ?? 'un concours',
          prizeDescription:
            winnerForm.prizeDescription.trim() || 'un gain MegaPromo',
          status: winnerForm.status,
        })
      }

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
    setWinnersError('')

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

    if (
      status === 'sent' &&
      winner.status !== status
    ) {
      await sendWinnerStatusPush({
        userId: winner.userId,
        userLabel: winner.userLabel,
        contestTitle: winner.contestTitle,
        prizeDescription: winner.prizeDescription || 'un gain MegaPromo',
        status,
      })
    }

    await loadWinners()
  }

  async function sendWinnerStatusPush({
    userId,
    userLabel,
    contestTitle,
    prizeDescription,
    status,
  }: {
    userId: string
    userLabel: string
    contestTitle: string
    prizeDescription: string
    status: WinnerStatus
  }) {
    if (!userId) return

    const pushPayload = {
      userIds: [userId],
      title: 'Gain payé',
      body: `${userLabel}, ton gain "${prizeDescription}" pour "${contestTitle}" vient d’être payé.`,
      type: 'winner',
      data: {
        type: 'winner',
        source: 'winner_paid',
        contestTitle,
        prizeDescription,
        status,
      },
    }

    try {
      console.info('[MegaPromo][winnerPush][payload]', pushPayload)
      const pushResponse = await supabase.functions.invoke(
        'send-push-notifications',
        { body: pushPayload },
      )
      console.info('[MegaPromo][winnerPush][response]', pushResponse)
    } catch (pushError) {
      console.warn('[MegaPromo][winnerPush][error]', pushError)
      setWinnersError(
        `Statut mis à jour, mais push non envoyé: ${
          pushError instanceof Error ? pushError.message : 'Edge Function indisponible.'
        }`,
      )
    }
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
                : `${filteredWinners.length}/${winnersData.winners.length} entrées`}
            </span>
          </div>

          <div className="winner-filters">
            <input
              aria-label="Rechercher un gagnant"
              onChange={(event) => setWinnerSearch(event.target.value)}
              placeholder="Rechercher joueur, concours, numéro..."
              type="search"
              value={winnerSearch}
            />
            <select
              aria-label="Filtrer par statut"
              onChange={(event) => setWinnerStatusFilter(event.target.value as 'all' | WinnerStatus)}
              value={winnerStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="sent">Payé</option>
            </select>
            <select
              aria-label="Filtrer par type"
              onChange={(event) => setWinnerTypeFilter(event.target.value as 'all' | 'contest' | 'live')}
              value={winnerTypeFilter}
            >
              <option value="all">Tous les jeux</option>
              <option value="contest">Concours</option>
              <option value="live">Quiz Live</option>
            </select>
          </div>

          <div className="premium-winner-table" role="table" aria-label="Liste des gagnants">
            <div className="premium-winner-head" role="row">
              <span>Joueur</span>
              <span>Jeu</span>
              <span>Gain</span>
              <span>Paiement</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {filteredWinners.length > 0 ? (
              filteredWinners.map((winner) => (
                <article className="premium-winner-row" key={winner.id} role="row">
                  <div>
                    <strong>{winner.userLabel}</strong>
                    <p>{winner.isLiveContest ? 'Quiz Live' : 'Concours'}</p>
                  </div>
                  <div>
                    <strong>{winner.contestTitle}</strong>
                    <p>{formatDate(winner.createdAt)}</p>
                  </div>
                  <strong className="winner-amount">{formatMoney(winner.prizeValue)}</strong>
                  <div>
                    <strong>
                      {winner.paymentMethod || (winner.status === 'pending' ? 'À définir' : 'Non renseignée')}
                    </strong>
                    <p>{winner.paymentNumber || (winner.status === 'pending' ? 'À définir' : 'Non renseigné')}</p>
                  </div>
                  <span className={`status-pill ${winner.status}`}>
                    {winnerStatusLabel(winner.status)}
                  </span>
                  <div className="contest-actions">
                    <button
                      aria-label={`Modifier le gain de ${winner.userLabel}`}
                      className="table-action-button"
                      onClick={() => openEditWinnerModal(winner)}
                      title="Modifier les informations du gain"
                      type="button"
                    >
                      Modifier
                    </button>
                    <button
                      aria-label={`Voir l'historique du concours ${winner.contestTitle}`}
                      className="table-action-button"
                      onClick={() =>
                        navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${winner.contestId}/history`)
                      }
                      title="Voir l'historique du concours et les réponses des joueurs"
                      type="button"
                    >
                      Historique
                    </button>
                    {winner.status !== 'sent' ? (
                      <button
                        aria-label={`Marquer le gain de ${winner.userLabel} comme payé`}
                        className="table-action-button"
                        onClick={() => handleWinnerStatus(winner, 'sent')}
                        title="Marquer ce gain comme payé et envoyer un push au joueur"
                        type="button"
                      >
                        Payé
                      </button>
                    ) : null}
                    <button
                      aria-label={`Supprimer le gain de ${winner.userLabel}`}
                      className="table-action-button danger"
                      onClick={() => handleDeleteWinner(winner)}
                      title="Supprimer définitivement ce gain"
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
                  : 'Aucun gagnant ne correspond aux filtres.'}
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
  const pageSize = 10
  const [contestsData, setContestsData] = useState<ContestsData>({
    contests: [],
    categories: [],
    partners: [],
    types: [],
    rewards: [],
  })
  const [isContestsLoading, setIsContestsLoading] = useState(true)
  const [contestsError, setContestsError] = useState('')
  const [contestsNotice, setContestsNotice] = useState('')
  const [isContestModalOpen, setIsContestModalOpen] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState('')
  const [isDeletingAllContests, setIsDeletingAllContests] = useState(false)
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
  const [contestPage, setContestPage] = useState(0)

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
  const totalContestPages = Math.max(1, Math.ceil(filteredContests.length / pageSize))
  const paginatedContests = useMemo(() => {
    const startIndex = contestPage * pageSize
    return filteredContests.slice(startIndex, startIndex + pageSize)
  }, [contestPage, filteredContests])
  const contestResultsStart = filteredContests.length === 0 ? 0 : contestPage * pageSize + 1
  const contestResultsEnd = Math.min(filteredContests.length, contestPage * pageSize + paginatedContests.length)
  const contestPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, contestPage - 2)
    const lastPage = Math.min(totalContestPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [contestPage, totalContestPages])

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

  useEffect(() => {
    setContestPage(0)
  }, [contestCategoryFilter, contestSearch, contestStatusFilter, contestTypeFilter])

  useRealtimeRefresh(
    'sa-contests-realtime',
    [
      'contests',
      'participations',
      'winners',
      'categories',
      'partners',
      'contest_types',
      'reward_catalog',
    ],
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

  async function sendContestPlayersPush({
    contestId,
    title,
    isLive,
    isUpdate,
  }: {
    contestId: string
    title: string
    isLive: boolean
    isUpdate: boolean
  }) {
    const notificationType = isLive ? 'live_quiz' : 'contest'
    const pushPayload = {
      audience: 'players' as const,
      title: isUpdate
        ? isLive
          ? 'Quiz Live mis à jour'
          : 'Jeu mis à jour'
        : isLive
          ? 'Nouveau Quiz Live'
          : 'Nouveau jeu disponible',
      body: isUpdate
        ? `Le jeu "${title}" a été mis à jour.`
        : isLive
          ? `Un nouveau Quiz Live est disponible : ${title}`
          : `Un nouveau concours est disponible : ${title}`,
      type: notificationType,
      data: {
        contest_id: contestId,
        contestId,
        type: notificationType,
        source: isUpdate ? 'contest_auto_update' : 'contest_auto_publish',
        is_live: isLive,
      },
    }

    try {
      console.info('[MegaPromo][contestPlayers][pushPayload]', pushPayload)
      const pushResponse = await supabase.functions.invoke(
        'send-push-notifications',
        { body: pushPayload },
      )
      console.info('[MegaPromo][contestPlayers][pushResponse]', pushResponse)
    } catch (pushError) {
      console.warn('[MegaPromo][contestPlayers][pushError]', pushError)
    }
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
    const liveStartsAt = contestForm.liveStartsAt
      ? new Date(contestForm.liveStartsAt)
      : startsAt
    const selectedCategory = contestsData.categories.find(
      (category) => category.id === contestForm.categoryId,
    )
    const selectedType = contestsData.types.find(
      (type) => type.key === contestForm.type,
    )
    const selectedReward = contestsData.rewards.find(
      (reward) => reward.id === contestForm.rewardCatalogId,
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

    if (!contestForm.rewardCatalogId || !selectedReward) {
      setContestError('Choisis un gain du catalogue.')
      return
    }

    if (!Number.isFinite(prizeValue) || prizeValue < 0) {
      setContestError('La valeur du prix doit être supérieure ou égale à 0.')
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

    if (
      contestForm.isLive &&
      (Number.isNaN(liveStartsAt.getTime()) || liveStartsAt < startsAt || liveStartsAt > endsAt)
    ) {
      setContestError('La date live doit être comprise entre le début et la fin.')
      return
    }

    if (contestForm.isLive && contestForm.liveStatus !== 'ended') {
      const openLiveQuiz = contestsData.contests.find((contest) => {
        if (contest.id === editingContestId) return false
        if (!contest.isLive) return false
        if (contest.liveStatus === 'ended') return false
        return !['inactive', 'ended', 'completed', 'finished'].includes(contest.status)
      })

      if (openLiveQuiz) {
        setContestError(
          `Termine d'abord le Quiz Live "${openLiveQuiz.title}" avant d'en créer un nouveau.`,
        )
        return
      }
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
        prize_description:
          prizeDescription || selectedReward.valueLabel || selectedReward.name,
        reward_catalog_id: selectedReward.id,
        reward_type: selectedReward.rewardType,
        reward_delivery_mode: 'manual',
        reward_delivery_instructions:
          selectedReward.defaultDeliveryInstructions || null,
        reward_terms: selectedReward.terms || null,
        brand_logo_url: contestForm.brandLogoUrl.trim() || null,
        brand_name: contestForm.brandName.trim() || null,
        prize_value: prizeValue,
        winners_count: winnersCount,
        max_participants: maxParticipants,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_boosted: contestForm.isBoosted,
        allowed_player_plan_keys: contestForm.allowedPlayerPlanKeys,
        is_live: contestForm.isLive,
        live_starts_at: contestForm.isLive ? liveStartsAt.toISOString() : null,
        live_status: contestForm.isLive ? contestForm.liveStatus : 'scheduled',
      }
      const savedContestId = editingContestId || createClientUuid()
      const { error } = editingContestId
        ? await supabase.from('contests').update(payload).eq('id', editingContestId)
        : await supabase.from('contests').insert({
            ...payload,
            id: savedContestId,
            views_count: 0,
            shares_count: 0,
            created_at: new Date().toISOString(),
          })

      if (error) throw error

      if (payload.status === 'active') {
        await sendContestPlayersPush({
          contestId: savedContestId,
          title,
          isLive: contestForm.isLive,
          isUpdate: Boolean(editingContestId),
        })
      }

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

    if (nextStatus === 'active') {
      await sendContestPlayersPush({
        contestId: contest.id,
        title: contest.title,
        isLive: contest.isLive,
        isUpdate: false,
      })
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

  async function handleDeleteAllContests() {
    setContestsError('')
    setContestsNotice('')

    const totalContests = contestsData.contests.length
    if (totalContests === 0) {
      setContestsNotice('Aucun concours à supprimer.')
      setIsDeleteAllModalOpen(false)
      setDeleteAllConfirmation('')
      return
    }

    if (deleteAllConfirmation.trim().toUpperCase() !== 'SUPPRIMER') {
      setContestsError('Tape SUPPRIMER pour confirmer la suppression globale.')
      return
    }

    setIsDeletingAllContests(true)

    const { error } = await supabase
      .from('contests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      setContestsError(error.message)
      setIsDeletingAllContests(false)
      return
    }

    setContestsNotice(`${totalContests} concours/QL supprimé(s).`)
    setIsDeleteAllModalOpen(false)
    setDeleteAllConfirmation('')
    setIsDeletingAllContests(false)
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
      const { data, error } = await supabase.rpc(
        'generate_pending_winners_for_contest',
        {
          p_contest_id: contest.id,
        },
      )
      if (error) throw error

      const generatedCount = Number(data ?? 0)
      const winnerLimit = Math.max(1, contest.winnersCount || 1)

      await loadContests()
      if (generatedCount > 0) {
        setContestsNotice(
          `${generatedCount} gagnant(s) candidat(s) généré(s). Valide-les dans l’onglet Gagnants.`,
        )
      } else {
        setContestsNotice(
          `Aucun gagnant ajouté. La limite de ${winnerLimit} gagnant(s) est peut-être déjà atteinte ou aucun participant n’est éligible.`,
        )
      }
    } catch (error) {
      setContestsError(
        error instanceof Error
          ? error.message
          : 'Impossible de générer les gagnants.',
      )
    }
  }

  function handleContestTableAction(contest: ContestItem, action: string) {
    if (!action) return

    if (action === 'edit') {
      openEditContestModal(contest)
      return
    }

    if (action === 'game') {
      navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${contest.id}/game`)
      return
    }

    if (action === 'history') {
      navigate(`${SUPER_ADMIN_CONTESTS_ROUTE}/${contest.id}/history`)
      return
    }

    if (action === 'generate') {
      void handleGenerateWinners(contest)
      return
    }

    if (action === 'status') {
      void handleToggleContestStatus(contest)
      return
    }

    if (action === 'delete') {
      void handleDeleteContest(contest)
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
            <button
              className="logout-button"
              disabled={isContestsLoading || contestsData.contests.length === 0}
              onClick={() => {
                setDeleteAllConfirmation('')
                setContestsError('')
                setContestsNotice('')
                setIsDeleteAllModalOpen(true)
              }}
              type="button"
            >
              Tout supprimer
            </button>
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
              {isContestsLoading ? 'Chargement' : `${paginatedContests.length} / ${filteredContests.length}`}
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

          <div className="premium-contest-table">
            <div className="premium-contest-head">
              <span>Concours</span>
              <span>Type</span>
              <span>Live</span>
              <span>Gain</span>
              <span>Accès</span>
              <span>Participants</span>
              <span>Fin</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {paginatedContests.length > 0 ? (
              paginatedContests.map((contest) => (
                <div className="premium-contest-row" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <p>
                      {contest.partner} · {contest.category}
                    </p>
                  </div>
                  <span className="contest-type-pill">{contest.type}</span>
                  <span className={`contest-type-pill ${contest.isLive ? 'live' : 'muted'}`}>
                    {contest.isLive ? 'LIVE' : '-'}
                  </span>
                  <div>
                    <strong>{contest.rewardLabel}</strong>
                    <p>{formatMoney(contest.prizeValue)}</p>
                  </div>
                  <p>{formatPlayerPlanAccess(contest.allowedPlayerPlanKeys)}</p>
                  <p>
                    {contest.isLive
                      ? `${contest.registeredCount} inscrit(s)`
                      : `${contest.participants} participants`}
                  </p>
                  <p>{formatDate(contest.endsAt)}</p>
                  <span className={`status-pill ${contest.status}`}>
                    {contest.status}
                  </span>
                  <div className="contest-actions">
                    <select
                      aria-label={`Actions pour ${contest.title}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handleContestTableAction(contest, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="edit">Modifier</option>
                      <option value="game">Configurer</option>
                      <option value="history">Historique</option>
                      <option value="generate">Générer gagnants</option>
                      <option value="status">
                        {contest.status === 'active' ? 'Désactiver' : 'Activer'}
                      </option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
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

          <div className="pagination-row">
            <span>
              {formatNumber(contestResultsStart)}-{formatNumber(contestResultsEnd)} sur{' '}
              {formatNumber(filteredContests.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={contestPage === 0 || isContestsLoading}
                onClick={() => setContestPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={contestPage === 0 || isContestsLoading}
                onClick={() => setContestPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {contestPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === contestPage ? 'active' : ''}`}
                    disabled={isContestsLoading}
                    key={page}
                    onClick={() => setContestPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={contestPage + 1 >= totalContestPages || isContestsLoading}
                onClick={() =>
                  setContestPage((page) => Math.min(totalContestPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={contestPage + 1 >= totalContestPages || isContestsLoading}
                onClick={() => setContestPage(totalContestPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
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
          rewards={contestsData.rewards}
          types={contestsData.types}
        />
      ) : null}

      {isDeleteAllModalOpen ? (
        <DeleteAllContestsConfirmModal
          confirmation={deleteAllConfirmation}
          contestsCount={contestsData.contests.length}
          isDeleting={isDeletingAllContests}
          onChangeConfirmation={setDeleteAllConfirmation}
          onClose={() => {
            if (isDeletingAllContests) return
            setIsDeleteAllModalOpen(false)
            setDeleteAllConfirmation('')
          }}
          onConfirm={handleDeleteAllContests}
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
  rewards,
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
  rewards: RewardCatalogItem[]
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

  function handleRewardChange(rewardId: string) {
    const selectedReward = rewards.find((reward) => reward.id === rewardId)

    onChange({
      ...form,
      rewardCatalogId: rewardId,
      rewardType: selectedReward?.rewardType ?? 'manual',
      prizeDescription:
        selectedReward?.valueLabel || selectedReward?.name || form.prizeDescription,
      prizeValue:
        selectedReward == null ? form.prizeValue : String(selectedReward.estimatedValue),
    })
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

          <div className="contest-context-note">
            <label className="switch-row inline-switch">
              <span>Quiz Live</span>
              <input
                checked={form.isLive}
                onChange={(event) =>
                  onChange({
                    ...form,
                    isLive: event.target.checked,
                    type: event.target.checked ? 'quiz' : form.type,
                    liveStartsAt:
                      form.liveStartsAt || form.startsAt,
                  })
                }
                type="checkbox"
              />
            </label>
            <p>
              Active ce mode pour un événement à heure fixe : inscription,
              salle d’attente et questions jouées en même temps.
            </p>
          </div>

          {form.isLive ? (
            <div className="form-grid two-columns">
              <label>
                <span>Date et heure du live</span>
                <input
                  onChange={(event) =>
                    onChange({ ...form, liveStartsAt: event.target.value })
                  }
                  type="datetime-local"
                  value={form.liveStartsAt || form.startsAt}
                />
              </label>

              <label>
                <span>Statut live</span>
                <select
                  onChange={(event) =>
                    onChange({ ...form, liveStatus: event.target.value })
                  }
                  value={form.liveStatus}
                >
                  <option value="scheduled">Programmé</option>
                  <option value="waiting">Salle d’attente</option>
                  <option value="playing">En cours</option>
                  <option value="ended">Terminé</option>
                </select>
              </label>
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
            <span>Accès joueurs</span>
            <select
              onChange={(event) =>
                onChange({
                  ...form,
                  allowedPlayerPlanKeys: playerPlanAccessKeysFromPreset(
                    event.target.value as PlayerPlanAccessPreset,
                  ),
                })
              }
              value={playerPlanAccessPresetFromKeys(form.allowedPlayerPlanKeys)}
            >
              {playerPlanAccessPresetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="form-help">
              {playerPlanAccessPresetOptions.find(
                (option) =>
                  option.value ===
                  playerPlanAccessPresetFromKeys(form.allowedPlayerPlanKeys),
              )?.description ?? 'Tous les joueurs'}
            </small>
          </label>

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
              <span>Gain du catalogue</span>
              <select
                onChange={(event) => handleRewardChange(event.target.value)}
                value={form.rewardCatalogId}
              >
                <option value="">Choisir un gain</option>
                {rewards.map((reward) => (
                  <option key={reward.id} value={reward.id}>
                    {reward.valueLabel || reward.name}
                  </option>
                ))}
              </select>
              <small className="form-help">
                Le type, le libellé et la valeur du lot viennent du catalogue.
              </small>
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

          <div className="form-grid two-columns">
            <label>
              <span>Valeur affichée</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, prizeValue: event.target.value })
                }
                placeholder="0"
                type="number"
                value={form.prizeValue}
              />
            </label>

            <label>
              <span>Description du gain</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, prizeDescription: event.target.value })
                }
                placeholder="Choisir un gain du catalogue"
                value={form.prizeDescription}
              />
            </label>
          </div>

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



function RewardTypeModal({
  error,
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: RewardTypeFormState
  isSaving: boolean
  onChange: (next: RewardTypeFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Type de gain" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Types de gains</p>
            <h2>Manager un type</h2>
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
              <span>Clé technique</span>
              <input
                onChange={(event) => onChange({ ...form, key: event.target.value })}
                placeholder="ex: restaurant_voucher"
                value={form.key}
              />
            </label>

            <label>
              <span>Nom affiché</span>
              <input
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="Ex: Bon restaurant"
                value={form.name}
              />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Description du type de gain"
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid three-columns">
            <label>
              <span>Icône</span>
              <input
                onChange={(event) => onChange({ ...form, icon: event.target.value })}
                placeholder="gift"
                value={form.icon}
              />
            </label>

            <label>
              <span>Couleur</span>
              <input
                onChange={(event) => onChange({ ...form, color: event.target.value })}
                placeholder="#475569"
                value={form.color}
              />
            </label>

            <label>
              <span>Ordre</span>
              <input
                inputMode="numeric"
                onChange={(event) => onChange({ ...form, orderIndex: event.target.value })}
                type="number"
                value={form.orderIndex}
              />
            </label>
          </div>

          <label className="check-row">
            <input
              checked={form.isActive}
              onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
              type="checkbox"
            />
            <span>Type actif</span>
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
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function RewardCatalogModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
  partners,
  rewardTypes,
}: {
  error: string
  form: RewardCatalogFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: RewardCatalogFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  partners: PartnerOption[]
  rewardTypes: RewardTypeItem[]
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Gain catalogue" className="contest-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Catalogue des gains</p>
            <h2>{mode === 'create' ? 'Nouveau gain' : 'Modifier gain'}</h2>
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
              <span>Nom du gain</span>
              <input
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="Ex: Code réduction 20%"
                value={form.name}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                onChange={(event) =>
                  onChange({
                    ...form,
                    rewardType: event.target.value as RewardCatalogType,
                  })
                }
                value={form.rewardType}
              >
                {rewardTypes.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Partenaire</span>
              <select
                onChange={(event) => onChange({ ...form, partnerId: event.target.value })}
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

            <label>
              <span>Valeur estimée</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, estimatedValue: event.target.value })
                }
                type="number"
                value={form.estimatedValue}
              />
            </label>
          </div>

          <label>
            <span>Libellé affiché</span>
            <input
              onChange={(event) => onChange({ ...form, valueLabel: event.target.value })}
              placeholder="Ex: Bon de réduction 5 000 FCFA"
              value={form.valueLabel}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Description courte du gain"
              rows={3}
              value={form.description}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Code par défaut</span>
              <input
                onChange={(event) => onChange({ ...form, defaultCode: event.target.value })}
                placeholder="PROMO20"
                value={form.defaultCode}
              />
            </label>

            <label>
              <span>Stock</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, stockQuantity: event.target.value })
                }
                placeholder="Vide = illimité"
                type="number"
                value={form.stockQuantity}
              />
            </label>
          </div>

          <label>
            <span>Instructions de remise</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, defaultDeliveryInstructions: event.target.value })
              }
              placeholder="Ex: Présenter le code à la caisse du partenaire."
              rows={3}
              value={form.defaultDeliveryInstructions}
            />
          </label>

          <label>
            <span>Conditions</span>
            <textarea
              onChange={(event) => onChange({ ...form, terms: event.target.value })}
              placeholder="Conditions d’utilisation du gain"
              rows={3}
              value={form.terms}
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
            <span>Gain actif dans le catalogue</span>
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
                  ? 'Créer le gain'
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
                <option value="pending">En attente</option>
                <option value="sent">Payé</option>
                <option value="cancelled">Annulé</option>
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
    sendPush: false,
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
    navigate(SUPER_ADMIN_AUTH_ROUTE, { replace: true })
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

      let pushSummary = ' Push mobile: désactivé.'
      if (form.sendPush) {
        try {
          console.info('[MegaPromo][SA notifications][pushRequest]', {
            target: form.target,
            targetCount: targetIds.length,
            type: form.type,
            hasContestId: Boolean(form.contestId.trim()),
          })
          const { data: pushData, error: pushError } =
            await supabase.functions.invoke('send-push-notifications', {
              body: {
                userIds: targetIds,
                title,
                body,
                type: form.type,
                data: notificationData,
                platforms: ['ios', 'android'],
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

      setSuccess(
        `${targetIds.length} notification(s) créée(s).${pushSummary}${smsSummary}`,
      )
      setForm({
        target: 'all',
        userId: '',
        userIds: [],
        title: '',
        body: '',
        type: 'info',
        contestId: '',
        sendPush: false,
        sendSms: false,
        smsMessage: '',
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
              <span>Envoyer aussi un vrai push mobile iOS/Android</span>
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
        </section>
      </section>
    </main>
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
      const [nextContests, catalog, nextSubscriptions] = await Promise.all([
        fetchPartnerDashboardContests(nextPartner.id),
        fetchPartnerContestCatalog(),
        fetchPartnerSubscriptionHistory(nextPartner.id),
      ])
      const nextParticipations = await fetchPartnerParticipations(nextContests)
      if (!isMounted()) return
      setPartner(nextPartner)
      setContests(nextContests)
      setParticipations(nextParticipations)
      setPlayers(buildPartnerPlayers(nextParticipations))
      setSubscriptionHistory(nextSubscriptions)
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
    ['contests', 'participations', 'partner_subscriptions', 'partners'],
    refreshPartnerDashboard,
  )

  async function handlePartnerLogout() {
    await supabase.auth.signOut()
    navigate(PARTNER_AUTH_ROUTE, { replace: true })
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
                      <span>{formatNumber(contest.participants)} joueurs</span>
                      <span>{contest.isBoosted ? 'Boosté' : 'Standard'}</span>
                      <small>{formatDate(contest.endsAt)}</small>
                      <div className="table-actions compact">
                        <button
                          className="table-action-button"
                          onClick={() => openPartnerContestHistory(contest.id)}
                          type="button"
                        >
                          Historique
                        </button>
                        <button
                          className="table-action-button"
                          disabled={contest.status !== 'pending'}
                          onClick={() => openEditPartnerContestModal(contest)}
                          type="button"
                        >
                          Modifier
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
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
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Abonnement</p>
                  <h2>Historique des abonnements</h2>
                </div>
                <span className="status-pill active">Validé</span>
              </div>

              <div className="compact-list">
                {subscriptionHistory.length > 0 ? (
                  subscriptionHistory.map((subscription) => (
                    <article key={subscription.id}>
                      <div>
                        <strong>{subscription.planName}</strong>
                        <p>
                          {subscription.paymentMethod || 'Paiement'} ·{' '}
                          {formatMoney(subscription.amount)}
                        </p>
                      </div>
                      <span className={`status-pill ${subscription.status}`}>
                        {subscription.status}
                      </span>
                      <small>{formatDate(subscription.expiresAt)}</small>
                    </article>
                  ))
                ) : (
                  <article>
                    <div>
                      <strong>Aucun historique</strong>
                      <p>Le forfait actuel est conservé dans le profil partenaire.</p>
                    </div>
                    <span>{partner.subscriptionPlan || 'free'}</span>
                  </article>
                )}
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
