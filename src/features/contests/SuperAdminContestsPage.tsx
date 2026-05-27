import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type ContestsNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminContestsPageProps = { authRoute: string; rootRoute: string; contestsRoute: string; navItems: ContestsNavItem[] }
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
