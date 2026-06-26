import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type ContestsNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminContestsPageProps = { authRoute: string; rootRoute: string; contestsRoute: string; navItems: ContestsNavItem[] }
type SuperAdminLiveSeriesPageProps = SuperAdminContestsPageProps
type ContestType = string
type ContestStatus = 'draft' | 'pending' | 'active' | 'inactive'
type PlayerPlanAccessKey = 'free' | 'premium' | 'vip'
type LiveQuizScheduleMode = 'single' | 'series'
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
  rewardMetadata: Record<string, unknown>
  liveSeriesId: string
  liveSeriesIndex: number | null
  liveSeriesCount: number | null
  liveSeriesParentTitle: string
  registeredCount: number
  connectedCount: number
  currentQuestionIndex: number
  participants: number
}
type ContestListItem = ContestItem & { seriesItems?: ContestItem[] }

type PartnerOption = {
  id: string
  name: string
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
type RewardCatalogType = string
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
  liveScheduleMode: LiveQuizScheduleMode
  liveSeriesCount: string
  liveSeriesIntervalMinutes: string
  liveEstimatedDurationSeconds: string
}
type ContestsData = {
  contests: ContestItem[]
  categories: CategoryOption[]
  partners: PartnerOption[]
  types: ContestTypeOption[]
  rewards: RewardCatalogItem[]
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


function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value) }
function formatMoney(value: number | null) { if (!value) return '0 FCFA'; return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA` }
function formatDate(value: string) { if (!value) return 'Non défini'; return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,(char)=>{const random=Math.floor(Math.random()*16);const value=char==='x'?random:(random&0x3)|0x8;return value.toString(16)}) }
function toDatetimeLocalValue(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
function isoToDatetimeLocalValue(value: string) { if (!value) return ''; return toDatetimeLocalValue(new Date(value)) }
function hasContestEnded(endsAt: string) { const endDate = new Date(endsAt); return !Number.isNaN(endDate.getTime()) && endDate <= new Date() }
function liveStatusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'playing' || normalized === 'active' || normalized === 'open') return 'En direct'
  if (normalized === 'waiting') return 'Prochain QL'
  if (normalized === 'ended' || normalized === 'completed' || normalized === 'finished') return 'Terminé'
  if (normalized === 'queued') return 'En file'
  return 'Programmé'
}

function liveStatusClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'playing' || normalized === 'active' || normalized === 'open') return 'active'
  if (normalized === 'waiting') return 'pending'
  if (normalized === 'ended' || normalized === 'completed' || normalized === 'finished') return 'inactive'
  return 'draft'
}


function liveSeriesSummaryStatus(items: ContestItem[]) {
  const statuses = items.map((item) => item.liveStatus.toLowerCase())
  if (statuses.some((status) => ['playing', 'active', 'open'].includes(status))) {
    return 'playing'
  }
  if (statuses.includes('waiting')) return 'waiting'
  if (statuses.every((status) => ['ended', 'completed', 'finished'].includes(status))) {
    return 'ended'
  }
  return items[0]?.liveStatus || 'scheduled'
}

function sortLiveSeriesItems(items: ContestItem[]) {
  return [...items].sort((a, b) => {
    const aIndex = a.liveSeriesIndex ?? Number.MAX_SAFE_INTEGER
    const bIndex = b.liveSeriesIndex ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return new Date(a.liveStartsAt || a.startsAt || a.endsAt).getTime() -
      new Date(b.liveStartsAt || b.startsAt || b.endsAt).getTime()
  })
}

function inferLiveSeriesFromTitle(contest: ContestItem) {
  const match = contest.title.match(/^(.*?)(?:\s+#(\d+))(.*)$/)
  if (!match) return null

  const prefix = match[1].trim()
  const index = Number(match[2])
  const suffix = match[3].trim()
  if (!Number.isInteger(index) || index <= 0 || prefix.length === 0) return null

  const parentTitle = `${prefix}${suffix ? ` ${suffix}` : ''}`.replace(/\s+/g, ' ').trim()
  return {
    key: `title:${contest.type}:${contest.categoryId}:${contest.rewardCatalogId}:${parentTitle.toLowerCase()}`,
    index,
    parentTitle,
  }
}

function groupContestSeries(contests: ContestItem[]): ContestListItem[] {
  const groups = new Map<string, ContestItem[]>()
  const singles: ContestListItem[] = []

  for (const contest of contests) {
    if (!contest.isLive) {
      singles.push(contest)
      continue
    }

    const inferredSeries = contest.liveSeriesId
      ? null
      : inferLiveSeriesFromTitle(contest)
    const seriesKey = contest.liveSeriesId || inferredSeries?.key || ''

    if (seriesKey) {
      const normalizedContest = inferredSeries
        ? {
            ...contest,
            liveSeriesId: seriesKey,
            liveSeriesIndex: contest.liveSeriesIndex ?? inferredSeries.index,
            liveSeriesParentTitle:
              contest.liveSeriesParentTitle || inferredSeries.parentTitle,
          }
        : contest
      groups.set(seriesKey, [...(groups.get(seriesKey) ?? []), normalizedContest])
    } else {
      singles.push(contest)
    }
  }

  const groupedSeries = Array.from(groups.entries()).flatMap(([, items]) => {
    if (items.length < 2) return items

    const sortedItems = sortLiveSeriesItems(items)
    const first = sortedItems[0]
    const last = sortedItems[sortedItems.length - 1] ?? first
    const summaryStatus = liveSeriesSummaryStatus(sortedItems)
    return [{
      ...first,
      title:
        first.liveSeriesParentTitle ||
        first.title.replace(/\s+#\d+(?=\s|$)/, '').replace(/\s+/g, ' ').trim(),
      liveStatus: summaryStatus,
      startsAt: first.startsAt,
      liveStartsAt: first.liveStartsAt,
      endsAt: last.endsAt,
      registeredCount: sortedItems.reduce(
        (total, item) => total + item.registeredCount,
        0,
      ),
      connectedCount: sortedItems.reduce(
        (total, item) => total + item.connectedCount,
        0,
      ),
      participants: sortedItems.reduce((total, item) => total + item.participants, 0),
      liveSeriesCount: first.liveSeriesCount || sortedItems.length,
      seriesItems: sortedItems,
    } satisfies ContestListItem]
  })

  return [...groupedSeries, ...singles].sort((a, b) => {
    const aDate = new Date(a.liveStartsAt || a.startsAt || a.endsAt).getTime()
    const bDate = new Date(b.liveStartsAt || b.startsAt || b.endsAt).getTime()
    return bDate - aDate
  })
}

function getVisibleContestNavItems(permissions: string[] | undefined, navItems: ContestsNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
function useRealtimeRefresh(channelName: string, tables: string[], onRefresh: () => void | Promise<void>) { const tablesKey = tables.join('|'); useEffect(() => { let refreshTimeout = 0; const scheduleRefresh = () => { window.clearTimeout(refreshTimeout); refreshTimeout = window.setTimeout(() => { void onRefresh() }, 350) }; const channel = supabase.channel(channelName); tables.forEach((table) => { channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh) }); channel.subscribe(); return () => { window.clearTimeout(refreshTimeout); void supabase.removeChannel(channel) } }, [channelName, tablesKey, onRefresh]) }
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
          'id, partner_id, title, description, image_url, brand_logo_url, brand_name, type, category, category_id, status, prize_description, prize_value, reward_catalog_id, reward_type, reward_metadata, winners_count, max_participants, starts_at, ends_at, is_boosted, allowed_player_plan_keys, is_live, live_starts_at, live_status, registered_count, connected_count, current_question_index, created_at',
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
      const rewardMetadata =
        contest.reward_metadata && typeof contest.reward_metadata === 'object'
          ? (contest.reward_metadata as Record<string, unknown>)
          : {}
      const liveSeriesId =
        typeof rewardMetadata.live_series_id === 'string'
          ? rewardMetadata.live_series_id
          : ''
      const liveSeriesIndex =
        typeof rewardMetadata.live_series_index === 'number'
          ? rewardMetadata.live_series_index
          : null
      const liveSeriesCount =
        typeof rewardMetadata.live_series_count === 'number'
          ? rewardMetadata.live_series_count
          : null
      const liveSeriesParentTitle =
        typeof rewardMetadata.live_series_parent_title === 'string'
          ? rewardMetadata.live_series_parent_title
          : ''

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
        rewardMetadata,
        liveSeriesId,
        liveSeriesIndex,
        liveSeriesCount,
        liveSeriesParentTitle,
        registeredCount: (contest.registered_count as number | null) ?? 0,
        connectedCount: (contest.connected_count as number | null) ?? 0,
        currentQuestionIndex:
          (contest.current_question_index as number | null) ?? 0,
        participants: participationsByContest.get(id) ?? 0,
      }
    }),
  }
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
    liveScheduleMode: 'single',
    liveSeriesCount: '1',
    liveSeriesIntervalMinutes: '180',
    liveEstimatedDurationSeconds: '100',
  }
}


type PronosticResolutionFormState = {
  homeScore: string
  awayScore: string
  allowCorrectResult: boolean
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
    liveScheduleMode: 'single',
    liveSeriesCount: '1',
    liveSeriesIntervalMinutes: '180',
    liveEstimatedDurationSeconds: '100',
  }
}


function ResolvePronosticModal({
  contest,
  form,
  error,
  isResolving,
  onChange,
  onClose,
  onSubmit,
}: {
  contest: ContestItem
  form: PronosticResolutionFormState
  error: string
  isResolving: boolean
  onChange: (form: PronosticResolutionFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label="Résoudre le pronostic"
        aria-modal="true"
        className="category-modal contest-modal"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Pronostic</p>
            <h2>Résoudre le score final</h2>
            <p className="page-subtitle">
              {contest.title} · {contest.winnersCount || 1} gagnant(s) configuré(s)
            </p>
          </div>
          <button disabled={isResolving} onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        <form className="category-form contest-form" onSubmit={onSubmit}>
          {error ? (
            <div className="dashboard-alert compact" role="alert">
              <p>{error}</p>
            </div>
          ) : null}

          <div className="contest-context-note">
            Le système compare les pronostics déjà enregistrés, classe les joueurs par
            score exact puis bon résultat, départage par ordre de validation, crée les
            gagnants et envoie les notifications.
          </div>

          <div className="form-grid two-columns">
            <label>
              <span>Score équipe 1 / domicile</span>
              <input
                autoFocus
                disabled={isResolving}
                min="0"
                onChange={(event) => onChange({ ...form, homeScore: event.target.value })}
                placeholder="Ex : 1"
                type="number"
                value={form.homeScore}
              />
            </label>
            <label>
              <span>Score équipe 2 / extérieur</span>
              <input
                disabled={isResolving}
                min="0"
                onChange={(event) => onChange({ ...form, awayScore: event.target.value })}
                placeholder="Ex : 2"
                type="number"
                value={form.awayScore}
              />
            </label>
          </div>

          <label className="checkbox-line">
            <input
              checked={form.allowCorrectResult}
              disabled={isResolving}
              onChange={(event) =>
                onChange({ ...form, allowCorrectResult: event.target.checked })
              }
              type="checkbox"
            />
            <span>Récompenser aussi le bon résultat si les places ne sont pas toutes prises par des scores exacts</span>
          </label>

          <div className="modal-actions">
            <button disabled={isResolving} onClick={onClose} type="button">
              Annuler
            </button>
            <button className="primary-button" disabled={isResolving} type="submit">
              {isResolving ? 'Résolution...' : 'Générer les gagnants'}
            </button>
          </div>
        </form>
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



export function SuperAdminContestsPage({ authRoute, rootRoute, contestsRoute, navItems }: SuperAdminContestsPageProps) {
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
  const [isProcessingLiveQueue, setIsProcessingLiveQueue] = useState(false)
  const [selectedPronosticContest, setSelectedPronosticContest] = useState<ContestItem | null>(null)
  const [pronosticResolutionForm, setPronosticResolutionForm] = useState<PronosticResolutionFormState>({
    homeScore: '',
    awayScore: '',
    allowCorrectResult: true,
  })
  const [pronosticResolutionError, setPronosticResolutionError] = useState('')
  const [isResolvingPronostic, setIsResolvingPronostic] = useState(false)
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
  const displayContests = useMemo(
    () => groupContestSeries(filteredContests),
    [filteredContests],
  )
  const totalContestPages = Math.max(1, Math.ceil(displayContests.length / pageSize))
  const paginatedContests = useMemo(() => {
    const startIndex = contestPage * pageSize
    return displayContests.slice(startIndex, startIndex + pageSize)
  }, [contestPage, displayContests])
  const contestResultsStart = displayContests.length === 0 ? 0 : contestPage * pageSize + 1
  const contestResultsEnd = Math.min(displayContests.length, contestPage * pageSize + paginatedContests.length)
  const contestPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, contestPage - 2)
    const lastPage = Math.min(totalContestPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [contestPage, totalContestPages])
  const contestStats = useMemo(() => {
    const now = Date.now()
    const active = contestsData.contests.filter((contest) => contest.status === 'active')
    const pending = contestsData.contests.filter((contest) => contest.status === 'pending')
    const live = contestsData.contests.filter((contest) => contest.isLive)
    const boosted = contestsData.contests.filter((contest) => contest.isBoosted)
    const totalParticipants = contestsData.contests.reduce(
      (total, contest) => total + (contest.isLive ? contest.registeredCount : contest.participants),
      0,
    )
    const totalPrizeValue = contestsData.contests.reduce(
      (total, contest) => total + contest.prizeValue,
      0,
    )
    const endingSoon = contestsData.contests.filter((contest) => {
      if (!contest.endsAt || contest.status !== 'active') return false
      const endsAt = new Date(contest.endsAt).getTime()
      return Number.isFinite(endsAt) && endsAt >= now && endsAt <= now + 24 * 60 * 60 * 1000
    })

    return {
      total: contestsData.contests.length,
      active: active.length,
      pending: pending.length,
      live: live.length,
      boosted: boosted.length,
      totalParticipants,
      totalPrizeValue,
      endingSoon: endingSoon.length,
    }
  }, [contestsData.contests])

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
    navigate(authRoute, { replace: true })
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
  }: {
    contestId: string
    title: string
    isLive: boolean
  }) {
    const notificationType = isLive ? 'live_quiz' : 'contest'
    const pushPayload = {
      audience: 'players' as const,
      title: isLive ? 'Nouveau Quiz Live' : 'Nouveau jeu disponible',
      body: isLive
        ? `Un nouveau Quiz Live est disponible : ${title}`
        : `Un nouveau concours est disponible : ${title}`,
      type: notificationType,
      data: {
        contest_id: contestId,
        contestId,
        type: notificationType,
        source: 'contest_auto_publish',
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

  async function handleProcessLiveQuizQueue() {
    setContestsError('')
    setContestsNotice('')
    setIsProcessingLiveQueue(true)

    try {
      const { data, error } = await supabase.rpc('process_live_quiz_events')
      if (error) throw error
      await loadContests()
      const changedCount = Number(data ?? 0)
      setContestsNotice(
        changedCount > 0
          ? `File QL recalculée : ${changedCount} changement(s) appliqué(s).`
          : 'File QL déjà à jour.',
      )
      void logAdminAction({
        feature: 'contests',
        action: 'process_live_quiz_queue',
        message: 'File Quiz Live recalculée par le SA.',
        metadata: { changed_count: changedCount },
      })
    } catch (error) {
      void logError({
        feature: 'contests',
        action: 'process_live_quiz_queue_failed',
        message: 'Echec recalcul file Quiz Live par le SA.',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
      setContestsError(
        error instanceof Error
          ? error.message
          : 'Impossible de recalculer la file Quiz Live.',
      )
    } finally {
      setIsProcessingLiveQueue(false)
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

    const liveSeriesCount = Number(contestForm.liveSeriesCount)
    const liveSeriesIntervalMinutes = Number(contestForm.liveSeriesIntervalMinutes)
    const liveEstimatedDurationSeconds = Number(contestForm.liveEstimatedDurationSeconds)
    const shouldCreateLiveSeries =
      contestForm.isLive && !editingContestId && contestForm.liveScheduleMode === 'series'

    if (shouldCreateLiveSeries) {
      if (!Number.isInteger(liveSeriesCount) || liveSeriesCount < 2 || liveSeriesCount > 48) {
        setContestError('La série QL doit contenir entre 2 et 48 Quiz Live.')
        return
      }

      if (
        !Number.isFinite(liveSeriesIntervalMinutes) ||
        liveSeriesIntervalMinutes < 5
      ) {
        setContestError('L’intervalle entre deux QL doit être au moins de 5 minutes.')
        return
      }

      if (
        !Number.isFinite(liveEstimatedDurationSeconds) ||
        liveEstimatedDurationSeconds < 10
      ) {
        setContestError('La durée estimée d’un QL doit être au moins de 10 secondes.')
        return
      }
    }

    setIsSavingContest(true)

    try {
      const buildPayload = ({
        slotIndex,
        slotLiveStartsAt,
        slotEndsAt,
      }: {
        slotIndex: number
        slotLiveStartsAt: Date
        slotEndsAt: Date
      }) => ({
        partner_id: contestForm.partnerId || null,
        title:
          shouldCreateLiveSeries && liveSeriesCount > 1
            ? `${title} #${slotIndex}`
            : title,
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
        starts_at: contestForm.isLive ? slotLiveStartsAt.toISOString() : startsAt.toISOString(),
        ends_at: contestForm.isLive ? slotEndsAt.toISOString() : endsAt.toISOString(),
        is_boosted: contestForm.isBoosted,
        allowed_player_plan_keys: contestForm.allowedPlayerPlanKeys,
        is_live: contestForm.isLive,
        live_starts_at: contestForm.isLive ? slotLiveStartsAt.toISOString() : null,
        live_status: contestForm.isLive
          ? editingContestId
            ? contestForm.liveStatus || 'scheduled'
            : 'scheduled'
          : 'scheduled',
        reward_metadata: shouldCreateLiveSeries
          ? {
              live_series_id: liveSeriesId,
              live_series_index: slotIndex,
              live_series_count: liveSeriesCount,
              live_series_parent_title: title,
              live_series_interval_minutes: liveSeriesIntervalMinutes,
              live_estimated_duration_seconds: liveEstimatedDurationSeconds,
            }
          : undefined,
      })

      const savedContestIds: string[] = []
      const liveSeriesId = shouldCreateLiveSeries ? createClientUuid() : ''
      const primaryContestId = editingContestId || createClientUuid()

      if (shouldCreateLiveSeries) {
        const rows = Array.from({ length: liveSeriesCount }, (_, index) => {
          const slotLiveStartsAt = new Date(
            liveStartsAt.getTime() +
              index *
                (liveEstimatedDurationSeconds * 1000 +
                  liveSeriesIntervalMinutes * 60 * 1000),
          )
          const slotEndsAt = new Date(
            slotLiveStartsAt.getTime() + liveEstimatedDurationSeconds * 1000,
          )
          const id = createClientUuid()
          savedContestIds.push(id)
          return {
            ...buildPayload({
              slotIndex: index + 1,
              slotLiveStartsAt,
              slotEndsAt,
            }),
            id,
            views_count: 0,
            shares_count: 0,
            created_at: new Date().toISOString(),
          }
        })

        const { error } = await supabase.from('contests').insert(rows)
        if (error) throw error
      } else {
        const payload = buildPayload({
          slotIndex: 1,
          slotLiveStartsAt: liveStartsAt,
          slotEndsAt: contestForm.isLive ? endsAt : endsAt,
        })
        savedContestIds.push(primaryContestId)
        const { error } = editingContestId
          ? await supabase.from('contests').update(payload).eq('id', editingContestId)
          : await supabase.from('contests').insert({
              ...payload,
              id: primaryContestId,
              views_count: 0,
              shares_count: 0,
              created_at: new Date().toISOString(),
            })

        if (error) throw error
      }

      if (contestForm.isLive) {
        try {
          await supabase.rpc('process_live_quiz_events')
        } catch (queueError) {
          console.warn('[MegaPromo][liveQuizQueue][processError]', queueError)
        }
      }

      if (!editingContestId && contestForm.status === 'active') {
        await sendContestPlayersPush({
          contestId: savedContestIds[0] ?? primaryContestId,
          title: shouldCreateLiveSeries
            ? `${title} · ${liveSeriesCount} Quiz Live programmés`
            : title,
          isLive: contestForm.isLive,
        })
      }

      await loadContests()
      void logAdminAction({
        feature: 'contests',
        action: editingContestId ? 'update' : shouldCreateLiveSeries ? 'create_live_series' : 'create',
        message: editingContestId
          ? 'Concours modifie par le SA.'
          : shouldCreateLiveSeries
            ? 'Serie de Quiz Live creee par le SA.'
            : 'Concours cree par le SA.',
        entityType: 'contest',
        entityId: savedContestIds[0] ?? primaryContestId,
        metadata: {
          title,
          status: contestForm.status,
          type: contestForm.type,
          is_live: contestForm.isLive,
          live_series_count: shouldCreateLiveSeries ? liveSeriesCount : 1,
          reward_catalog_id: selectedReward.id,
          winners_count: winnersCount,
        },
      })
      closeContestModal()
    } catch (error) {
      void logError({
        feature: 'contests',
        action: editingContestId ? 'update_failed' : 'create_failed',
        message: 'Echec enregistrement concours par le SA.',
        entityType: 'contest',
        entityId: editingContestId ?? null,
        metadata: {
          title: contestForm.title,
          is_live: contestForm.isLive,
          error: error instanceof Error ? error.message : String(error),
        },
      })
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
      void logError({
        feature: 'contests',
        action: 'status_update_failed',
        message: 'Echec changement statut concours.',
        entityType: 'contest',
        entityId: contest.id,
        metadata: { title: contest.title, next_status: nextStatus, error: error.message },
      })
      setContestsError(error.message)
      return
    }

    void logAdminAction({
      feature: 'contests',
      action: 'status_update',
      message: 'Statut concours modifie par le SA.',
      entityType: 'contest',
      entityId: contest.id,
      metadata: { title: contest.title, previous_status: contest.status, next_status: nextStatus },
    })


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
      void logError({
        feature: 'contests',
        action: 'delete_failed',
        message: 'Echec suppression concours.',
        entityType: 'contest',
        entityId: contest.id,
        metadata: { title: contest.title, error: error.message },
      })
      setContestsError(error.message)
      return
    }

    void logAdminAction({
      feature: 'contests',
      action: 'delete',
      message: 'Concours supprime par le SA.',
      entityType: 'contest',
      entityId: contest.id,
      metadata: { title: contest.title, is_live: contest.isLive },
    })

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
      void logError({
        feature: 'contests',
        action: 'delete_all_failed',
        message: 'Echec suppression globale concours/QL.',
        metadata: { total_contests: totalContests, error: error.message },
      })
      setContestsError(error.message)
      setIsDeletingAllContests(false)
      return
    }

    void logAdminAction({
      feature: 'contests',
      action: 'delete_all',
      message: 'Suppression globale des concours/QL executee par le SA.',
      metadata: { total_contests: totalContests },
    })
    setContestsNotice(`${totalContests} concours/QL supprimé(s).`)
    setIsDeleteAllModalOpen(false)
    setDeleteAllConfirmation('')
    setIsDeletingAllContests(false)
    await loadContests()
  }

  function openPronosticResolutionModal(contest: ContestItem) {
    setContestsError('')
    setContestsNotice('')
    setPronosticResolutionError('')
    setPronosticResolutionForm({
      homeScore: '',
      awayScore: '',
      allowCorrectResult: true,
    })
    setSelectedPronosticContest(contest)
  }

  function closePronosticResolutionModal() {
    if (isResolvingPronostic) return
    setSelectedPronosticContest(null)
    setPronosticResolutionError('')
  }

  async function handleResolvePronosticSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPronosticContest) return

    const homeScore = Number(pronosticResolutionForm.homeScore)
    const awayScore = Number(pronosticResolutionForm.awayScore)

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setPronosticResolutionError('Renseigne un score final valide pour les deux équipes.')
      return
    }

    const confirmed = window.confirm(
      `Résoudre le pronostic "${selectedPronosticContest.title}" avec le score ${homeScore}-${awayScore} ? Les gagnants seront générés et notifiés.`,
    )
    if (!confirmed) return

    setIsResolvingPronostic(true)
    setPronosticResolutionError('')
    setContestsError('')
    setContestsNotice('')

    try {
      const { data, error } = await supabase.rpc('admin_resolve_pronostic_contest', {
        p_contest_id: selectedPronosticContest.id,
        p_home_score: homeScore,
        p_away_score: awayScore,
        p_winners_count: null,
        p_allow_correct_result: pronosticResolutionForm.allowCorrectResult,
      })
      if (error) throw error

      const result = (data ?? {}) as {
        inserted_winners?: number
        requested_winners?: number
        notified_non_winners?: number
        scored_participations?: number
      }
      await loadContests()
      setSelectedPronosticContest(null)
      setContestsNotice(
        `Pronostic résolu : ${Number(result.inserted_winners ?? 0)} gagnant(s) généré(s) sur ${Number(result.requested_winners ?? (selectedPronosticContest.winnersCount || 1))} prévu(s). ${Number(result.notified_non_winners ?? 0)} joueur(s) non gagnant(s) notifié(s).`,
      )
      void logAdminAction({
        feature: 'contests',
        action: 'resolve_pronostic',
        message: 'Pronostic resolu et gagnants generes par le SA.',
        entityType: 'contest',
        entityId: selectedPronosticContest.id,
        metadata: {
          contest_title: selectedPronosticContest.title,
          final_score: `${homeScore}-${awayScore}`,
          result,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de résoudre ce pronostic.'
      setPronosticResolutionError(message)
      void logError({
        feature: 'contests',
        action: 'resolve_pronostic_failed',
        message: 'Echec resolution pronostic par le SA.',
        entityType: 'contest',
        entityId: selectedPronosticContest.id,
        metadata: {
          contest_title: selectedPronosticContest.title,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } finally {
      setIsResolvingPronostic(false)
    }
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
      void logAdminAction({
        feature: 'winners',
        action: 'generate_from_contest',
        message: 'Generation automatique de gagnants lancee par le SA.',
        entityType: 'contest',
        entityId: contest.id,
        metadata: {
          contest_title: contest.title,
          generated_count: generatedCount,
          winner_limit: winnerLimit,
        },
      })
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
      void logError({
        feature: 'winners',
        action: 'generate_from_contest_failed',
        message: 'Echec generation automatique de gagnants.',
        entityType: 'contest',
        entityId: contest.id,
        metadata: {
          contest_title: contest.title,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      setContestsError(
        error instanceof Error
          ? error.message
          : 'Impossible de générer les gagnants.',
      )
    }
  }

  function handleContestTableAction(contest: ContestListItem, action: string) {
    if (!action) return

    if (action === 'series' && contest.seriesItems && contest.seriesItems.length > 0) {
      navigate(`${contestsRoute}/series/${encodeURIComponent(contest.liveSeriesId)}`)
      return
    }

    if (action === 'edit') {
      openEditContestModal(contest)
      return
    }

    if (action === 'game') {
      navigate(`${contestsRoute}/${contest.id}/game`)
      return
    }

    if (action === 'history') {
      navigate(`${contestsRoute}/${contest.id}/history`)
      return
    }

    if (action === 'generate') {
      void handleGenerateWinners(contest)
      return
    }

    if (action === 'resolve_pronostic') {
      openPronosticResolutionModal(contest)
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleContestNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleContestNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
            <button
              className="logout-button"
              disabled={isProcessingLiveQueue}
              onClick={handleProcessLiveQuizQueue}
              type="button"
            >
              {isProcessingLiveQueue ? 'Recalcul...' : 'Recalculer file QL'}
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

        <section className="settings-overview contest-stats-overview" aria-label="Statistiques des concours">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">C</span>
            <div>
              <small>Total concours</small>
              <strong>{formatNumber(contestStats.total)}</strong>
              <p>
                {formatNumber(contestStats.active)} actifs · {formatNumber(contestStats.pending)} en attente
              </p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">P</span>
            <div>
              <small>Participants</small>
              <strong>{formatNumber(contestStats.totalParticipants)}</strong>
              <p>Inscriptions QL et participations concours cumulées.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">Q</span>
            <div>
              <small>Quiz Live</small>
              <strong>{formatNumber(contestStats.live)}</strong>
              <p>{formatNumber(contestStats.boosted)} concours mis en avant.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">G</span>
            <div>
              <small>Gains</small>
              <strong>{formatMoney(contestStats.totalPrizeValue)}</strong>
              <p>{formatNumber(contestStats.endingSoon)} finissent dans les prochaines 24h.</p>
            </div>
          </article>
        </section>

        <section className="panel contests-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2>Liste des concours</h2>
            </div>
            <span className="pill">
              {isContestsLoading ? 'Chargement' : `${paginatedContests.length} / ${displayContests.length}`}
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
              paginatedContests.map((contest) => {
                const seriesCount = contest.seriesItems?.length ?? 0
                const rowLiveStatus = seriesCount > 0
                  ? liveSeriesSummaryStatus(contest.seriesItems ?? [])
                  : contest.liveStatus
                const isPronosticContest = contest.type.toLowerCase() === 'pronostic'
                const isEndedContest = hasContestEnded(contest.endsAt)
                const canGenerateWinners = isPronosticContest && isEndedContest
                return (
                <div className="premium-contest-row" key={contest.liveSeriesId || contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <p>
                      {contest.partner} · {contest.category}
                      {seriesCount > 1 ? ` · Série de ${seriesCount} QL` : ''}
                    </p>
                  </div>
                  <span className="contest-type-pill">{contest.type}</span>
                  <span
                    className={`contest-type-pill ${contest.isLive ? liveStatusClass(rowLiveStatus) : 'muted'}`}
                    title={contest.isLive ? formatDate(contest.liveStartsAt) : undefined}
                  >
                    {contest.isLive ? liveStatusLabel(rowLiveStatus) : '-'}
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
                    {seriesCount > 1 ? (
                      <button
                        className="table-action-button"
                        onClick={() => navigate(`${contestsRoute}/series/${encodeURIComponent(contest.liveSeriesId)}`)}
                        type="button"
                      >
                        Détails série
                      </button>
                    ) : null}
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
                      {seriesCount > 1 ? null : <option value="game">Configurer</option>}
                      <option value="history">Historique</option>
                      {canGenerateWinners ? (
                        <option value="resolve_pronostic">Générer gagnants</option>
                      ) : null}
                      <option value="status">
                        {contest.status === 'active' ? 'Désactiver' : 'Activer'}
                      </option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
                )
              })
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
              {formatNumber(displayContests.length)}
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

      {selectedPronosticContest ? (
        <ResolvePronosticModal
          contest={selectedPronosticContest}
          error={pronosticResolutionError}
          form={pronosticResolutionForm}
          isResolving={isResolvingPronostic}
          onChange={setPronosticResolutionForm}
          onClose={closePronosticResolutionModal}
          onSubmit={handleResolvePronosticSubmit}
        />
      ) : null}

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


export function SuperAdminLiveSeriesPage({
  authRoute,
  contestsRoute,
  navItems,
  rootRoute,
}: SuperAdminLiveSeriesPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const { seriesId = '' } = useParams()
  const decodedSeriesId = decodeURIComponent(seriesId)
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [contestsData, setContestsData] = useState<ContestsData>({
    contests: [],
    categories: [],
    partners: [],
    types: [],
    rewards: [],
  })

  const loadSeries = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setContestsData(await fetchContestsData())
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossible de charger la série QL.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSeries()
  }, [loadSeries])

  useRealtimeRefresh(
    'sa-live-series-detail-realtime',
    ['contests', 'questions', 'live_quiz_registrations', 'live_sessions'],
    loadSeries,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  const series = useMemo(() => {
    return groupContestSeries(contestsData.contests).find(
      (contest) => contest.liveSeriesId === decodedSeriesId,
    )
  }, [contestsData.contests, decodedSeriesId])

  const items = series?.seriesItems ? sortLiveSeriesItems(series.seriesItems) : []
  const title = series?.title ?? 'Série Quiz Live'
  const summaryStatus = items.length > 0 ? liveSeriesSummaryStatus(items) : 'scheduled'
  const totalRegistered = items.reduce((total, item) => total + item.registeredCount, 0)
  const totalConnected = items.reduce((total, item) => total + item.connectedCount, 0)
  const firstStart = items[0]?.liveStartsAt || items[0]?.startsAt || ''
  const lastEnd = items[items.length - 1]?.endsAt || ''

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
          {getVisibleContestNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
            <NavLink end={item.href === rootRoute} to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {getVisibleContestNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Série QL</span>
          <strong>{items.length} Quiz Live</strong>
          <p>Chaque horaire possède ses propres questions et son propre suivi.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Quiz Live programmable</p>
            <h1>{title}</h1>
            <p className="page-subtitle">
              Configure chaque QL de la série séparément. La file automatique active
              toujours le prochain horaire.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="logout-button" onClick={() => navigate(contestsRoute)} type="button">
              Retour aux concours
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
              <strong>Série indisponible</strong>
              <p>{error}</p>
            </div>
            <button onClick={loadSeries} type="button">Réessayer</button>
          </div>
        ) : null}

        {!error && !isLoading && !series ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Série introuvable</strong>
              <p>Cette série QL n’existe pas ou n’est plus disponible.</p>
            </div>
            <button onClick={() => navigate(contestsRoute)} type="button">
              Retour
            </button>
          </div>
        ) : null}

        {series ? (
          <>
            <section className="settings-overview contest-stats-overview" aria-label="Statistiques série QL">
              <article className="settings-overview-card featured">
                <span className="settings-overview-icon">Q</span>
                <div>
                  <small>QL dans la série</small>
                  <strong>{formatNumber(items.length)}</strong>
                  <p>{liveStatusLabel(summaryStatus)}</p>
                </div>
              </article>
              <article className="settings-overview-card">
                <span className="settings-overview-icon">D</span>
                <div>
                  <small>Premier départ</small>
                  <strong>{formatDate(firstStart)}</strong>
                  <p>Dernière fin : {formatDate(lastEnd)}</p>
                </div>
              </article>
              <article className="settings-overview-card">
                <span className="settings-overview-icon">I</span>
                <div>
                  <small>Inscriptions</small>
                  <strong>{formatNumber(totalRegistered)}</strong>
                  <p>{formatNumber(totalConnected)} connecté(s) actuellement.</p>
                </div>
              </article>
              <article className="settings-overview-card">
                <span className="settings-overview-icon">G</span>
                <div>
                  <small>Gain par QL</small>
                  <strong>{series.rewardLabel}</strong>
                  <p>{formatMoney(series.prizeValue)}</p>
                </div>
              </article>
            </section>

            <section className="panel contests-page-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Configuration</p>
                  <h2>QL de la série</h2>
                </div>
                <span className={`status-pill ${liveStatusClass(summaryStatus)}`}>
                  {liveStatusLabel(summaryStatus)}
                </span>
              </div>

              <div className="contest-context-note">
                <strong>Questions indépendantes</strong>
                <p>
                  Chaque QL est joué séparément dans l’application. Clique sur
                  “Configurer questions” pour préparer les questions du créneau choisi.
                </p>
              </div>

              <div className="premium-contest-table">
                <div className="premium-contest-head">
                  <span>QL</span>
                  <span>Départ</span>
                  <span>Fin</span>
                  <span>Statut</span>
                  <span>Inscrits</span>
                  <span>Actions</span>
                </div>
                {items.map((item) => (
                  <div className="premium-contest-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>Créneau #{item.liveSeriesIndex ?? '-'}</p>
                    </div>
                    <p>{formatDate(item.liveStartsAt || item.startsAt)}</p>
                    <p>{formatDate(item.endsAt)}</p>
                    <span className={`status-pill ${liveStatusClass(item.liveStatus)}`}>
                      {liveStatusLabel(item.liveStatus)}
                    </span>
                    <p>{item.registeredCount} inscrit(s)</p>
                    <div className="contest-actions">
                      <button
                        className="table-action-button"
                        onClick={() => navigate(`${contestsRoute}/${item.id}/game`)}
                        type="button"
                      >
                        Configurer questions
                      </button>
                      <button
                        className="table-action-button"
                        onClick={() => navigate(`${contestsRoute}/${item.id}/history`)}
                        type="button"
                      >
                        Historique
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
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
              <span>Quiz Live programmable</span>
              <input
                checked={form.isLive}
                onChange={(event) =>
                  onChange({
                    ...form,
                    isLive: event.target.checked,
                    type: event.target.checked ? 'quiz' : form.type,
                    liveStartsAt: form.liveStartsAt || form.startsAt,
                    liveStatus: event.target.checked ? form.liveStatus || 'scheduled' : 'scheduled',
                  })
                }
                type="checkbox"
              />
            </label>
            <p>
              Le SA programme seulement les heures de départ. MegaPromo active
              automatiquement le prochain QL en salle d’attente, puis le passe en direct.
              Les autres QL restent visibles mais non réservables.
            </p>
          </div>

          {form.isLive ? (
            <>
              <div className="form-grid two-columns">
                <label>
                  <span>Départ du Quiz Live</span>
                  <input
                    onChange={(event) =>
                      onChange({ ...form, liveStartsAt: event.target.value })
                    }
                    type="datetime-local"
                    value={form.liveStartsAt || form.startsAt}
                  />
                  <small className="form-help">
                    Pour une série, c’est l’heure du premier QL.
                  </small>
                </label>

                <label>
                  <span>Statut live automatique</span>
                  <input readOnly value={liveStatusLabel(form.liveStatus || 'scheduled')} />
                  <small className="form-help">
                    Ne pas modifier manuellement : la file QL gère Programmé,
                    Prochain QL, En direct et Terminé.
                  </small>
                </label>
              </div>

              {mode === 'create' ? (
                <div className="contest-context-note">
                  <label>
                    <span>Programmation QL</span>
                    <select
                      onChange={(event) =>
                        onChange({
                          ...form,
                          liveScheduleMode: event.target.value as LiveQuizScheduleMode,
                          liveSeriesCount:
                            event.target.value === 'series' ? form.liveSeriesCount : '1',
                        })
                      }
                      value={form.liveScheduleMode}
                    >
                      <option value="single">Créer un seul QL</option>
                      <option value="series">Créer une série de plusieurs QL</option>
                    </select>
                    <small className="form-help">
                      Tous les QL créés seront en statut Programmé. Le système choisira
                      automatiquement le prochain QL.
                    </small>
                  </label>

                  {form.liveScheduleMode === 'series' ? (
                    <div className="form-grid three-columns">
                      <label>
                        <span>Nombre de QL</span>
                        <input
                          min="2"
                          max="48"
                          onChange={(event) =>
                            onChange({ ...form, liveSeriesCount: event.target.value })
                          }
                          type="number"
                          value={form.liveSeriesCount}
                        />
                      </label>

                      <label>
                        <span>Intervalle après la fin</span>
                        <select
                          onChange={(event) =>
                            onChange({
                              ...form,
                              liveSeriesIntervalMinutes: event.target.value,
                            })
                          }
                          value={form.liveSeriesIntervalMinutes}
                        >
                          <option value="30">30 minutes</option>
                          <option value="60">1 heure</option>
                          <option value="180">3 heures</option>
                          <option value="1440">24 heures</option>
                        </select>
                      </label>

                      <label>
                        <span>Durée estimée d’un QL</span>
                        <input
                          min="10"
                          onChange={(event) =>
                            onChange({
                              ...form,
                              liveEstimatedDurationSeconds: event.target.value,
                            })
                          }
                          type="number"
                          value={form.liveEstimatedDurationSeconds}
                        />
                        <small className="form-help">Ex : 5 questions × 20 sec = 100.</small>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
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
              {form.isLive ? (
                <small className="form-help">
                  QL unique : fin du live. Série : chaque fin est calculée avec la
                  durée estimée du QL.
                </small>
              ) : null}
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
                : mode === 'create' && form.isLive && form.liveScheduleMode === 'series'
                  ? 'Créer la série QL'
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
