import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type WinnersNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminWinnersPageProps = { authRoute: string; rootRoute: string; contestsRoute: string; navItems: WinnersNavItem[]; historyMode?: boolean }
type SupabaseLikeError = { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
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
type WinnerPaymentMethodOption = {
  id: string
  userId: string
  operatorName: string
  operatorKey: string
  phone: string
  label: string
  isPrimary: boolean
  status: string
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
  paymentMethods: WinnerPaymentMethodOption[]
}
type AppFeatureFlagState = {
  isEnabled: boolean
  updatedAt: string
}

function formatMoney(value: number | null) { if (!value) return '0 FCFA'; return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA` }
function formatDate(value: string) { if (!value) return 'Non défini'; return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value) }
function formatUnknownError(error: unknown, fallback: string) { if (error instanceof Error) return error.message; if (error && typeof error === 'object') { const payload = error as SupabaseLikeError; return [payload.message, payload.details, payload.hint, payload.code].filter((item) => typeof item === 'string' && item.length > 0).join(' · ') || fallback } return typeof error === 'string' && error.length > 0 ? error : fallback }
function isMissingTableError(error: unknown, tableName: string) { if (!error || typeof error !== 'object') return false; const payload = error as SupabaseLikeError; const message = String(payload.message ?? ''); return payload.code === 'PGRST205' && message.includes(`'public.${tableName}'`) }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); const value = char === 'x' ? random : (random & 0x3) | 0x8; return value.toString(16) }) }
function toDatetimeLocalValue(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
function isoToDatetimeLocalValue(value: string) { if (!value) return ''; return toDatetimeLocalValue(new Date(value)) }
function hasContestEnded(endsAt: string) { const endDate = new Date(endsAt); return !Number.isNaN(endDate.getTime()) && endDate <= new Date() }
function getVisibleWinnersNavItems(permissions: string[] | undefined, navItems: WinnersNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
function useRealtimeRefresh(channelName: string, tables: string[], onRefresh: () => void | Promise<void>) { const tablesKey = tables.join('|'); useEffect(() => { let refreshTimeout = 0; const scheduleRefresh = () => { window.clearTimeout(refreshTimeout); refreshTimeout = window.setTimeout(() => { void onRefresh() }, 350) }; const channel = supabase.channel(channelName); tables.forEach((table) => { channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh) }); channel.subscribe(); return () => { window.clearTimeout(refreshTimeout); void supabase.removeChannel(channel) } }, [channelName, tablesKey, onRefresh]) }
async function fetchAppFeatureFlag(key: string, defaultEnabled = true): Promise<AppFeatureFlagState> {
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
async function fetchWinnersData(): Promise<WinnersData> {
  const [
    winnersResponse,
    usersResponse,
    contestsResponse,
    paymentMethodsResponse,
  ] = await Promise.all([
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
    supabase
      .from('player_payment_methods')
      .select('id, user_id, operator_key, operator_name, phone, label, is_primary, status')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  if (winnersResponse.error) throw winnersResponse.error
  if (usersResponse.error) throw usersResponse.error
  if (contestsResponse.error) throw contestsResponse.error
  if (
    paymentMethodsResponse.error &&
    !isMissingTableError(paymentMethodsResponse.error, 'player_payment_methods')
  ) {
    throw paymentMethodsResponse.error
  }

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
    paymentMethods: (paymentMethodsResponse.data ?? []).map((method) => ({
      id: method.id as string,
      userId: (method.user_id as string | null) ?? '',
      operatorName: (method.operator_name as string | null) ?? 'Mobile Money',
      operatorKey: (method.operator_key as string | null) ?? '',
      phone: (method.phone as string | null) ?? '',
      label: (method.label as string | null) ?? '',
      isPrimary: (method.is_primary as boolean | null) ?? false,
      status: (method.status as string | null) ?? 'active',
    })),
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


export function SuperAdminWinnersPage({ authRoute, rootRoute, contestsRoute, navItems, historyMode = false }: SuperAdminWinnersPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [winnersData, setWinnersData] = useState<WinnersData>({
    winners: [],
    users: [],
    contests: [],
    paymentMethods: [],
  })
  const [isWinnersLoading, setIsWinnersLoading] = useState(true)
  const [winnersError, setWinnersError] = useState('')
  const [winnersNotice, setWinnersNotice] = useState('')
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
  const [rewardsFlag, setRewardsFlag] = useState<AppFeatureFlagState>({
    isEnabled: true,
    updatedAt: '',
  })
  const [isRewardsFlagSaving, setIsRewardsFlagSaving] = useState(false)

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
  const winnersStats = useMemo(() => {
    const pending = winnersData.winners.filter((winner) => winner.status === 'pending')
    const sent = winnersData.winners.filter((winner) => winner.status === 'sent')
    const received = winnersData.winners.filter((winner) => winner.status === 'received')
    const live = winnersData.winners.filter((winner) => winner.isLiveContest)
    const contest = winnersData.winners.filter((winner) => !winner.isLiveContest)
    const totalValue = winnersData.winners.reduce(
      (total, winner) => total + winner.prizeValue,
      0,
    )
    const paidValue = winnersData.winners
      .filter((winner) => winner.status === 'sent' || winner.status === 'received')
      .reduce((total, winner) => total + winner.prizeValue, 0)
    const missingPayment = winnersData.winners.filter(
      (winner) => !winner.paymentNumber.trim(),
    )

    return {
      total: winnersData.winners.length,
      pending: pending.length,
      sent: sent.length,
      received: received.length,
      live: live.length,
      contest: contest.length,
      totalValue,
      paidValue,
      missingPayment: missingPayment.length,
    }
  }, [winnersData.winners])

  const loadWinners = useCallback(async () => {
    setIsWinnersLoading(true)
    setWinnersError('')
    setWinnersNotice('')

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

  const loadRewardsFlag = useCallback(async () => {
    try {
      setRewardsFlag(await fetchAppFeatureFlag('player_profile_rewards', true))
    } catch (error) {
      setWinnersError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le réglage des récompenses.',
      )
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

  useEffect(() => {
    void loadRewardsFlag()
  }, [loadRewardsFlag])

  const refreshWinnersRealtime = useCallback(async () => {
    await Promise.all([loadWinners(), loadRewardsFlag()])
  }, [loadRewardsFlag, loadWinners])

  useRealtimeRefresh(
    'sa-winners-realtime',
    ['winners', 'users', 'contests', 'app_feature_flags'],
    refreshWinnersRealtime,
  )

  async function handleToggleRewardsAccess() {
    const nextIsEnabled = !rewardsFlag.isEnabled
    setWinnersError('')
    setWinnersNotice('')
    setIsRewardsFlagSaving(true)

    const { error } = await supabase.from('app_feature_flags').upsert({
      key: 'player_profile_rewards',
      name: 'Récompenses profil joueur',
      description:
        'Affiche ou masque le bouton Récompenses dans le profil joueur mobile.',
      is_enabled: nextIsEnabled,
      updated_at: new Date().toISOString(),
    })

    setIsRewardsFlagSaving(false)

    if (error) {
      setWinnersError(error.message)
      return
    }

    setRewardsFlag({
      isEnabled: nextIsEnabled,
      updatedAt: new Date().toISOString(),
    })
    setWinnersNotice(
      nextIsEnabled
        ? 'Le bouton Récompenses est visible dans le profil joueur.'
        : 'Le bouton Récompenses est masqué dans le profil joueur.',
    )
  }

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
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
    const form = winnerToForm(winner)
    if (!form.paymentNumber) {
      const preferredMethod = winnersData.paymentMethods.find(
        (method) =>
          method.userId === winner.userId &&
          method.status === 'active' &&
          method.phone,
      )
      if (preferredMethod) {
        form.paymentMethod = preferredMethod.operatorKey || preferredMethod.operatorName
        form.paymentNumber = preferredMethod.phone
      }
    }
    setWinnerForm(form)
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

    if (winnerForm.status === 'sent' && !winnerForm.paymentNumber.trim()) {
      setWinnerError(
        'Sélectionne un numéro Mobile Money ou demande au joueur de le renseigner avant de payer.',
      )
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
    setWinnersNotice('')

    let paymentMethod = winner.paymentMethod
    let paymentNumber = winner.paymentNumber

    if (status === 'sent' && !paymentNumber) {
      const preferredMethod = winnersData.paymentMethods.find(
        (method) =>
          method.userId === winner.userId &&
          method.status === 'active' &&
          method.phone,
      )

      if (!preferredMethod) {
        setWinnersError(
          'Ce joueur n’a pas encore de numéro Mobile Money. Envoie-lui une demande de renseignement.',
        )
        return
      }

      paymentMethod = preferredMethod.operatorKey || preferredMethod.operatorName
      paymentNumber = preferredMethod.phone
    }

    const { error } = await supabase
      .from('winners')
      .update({
        status,
        payment_method: paymentMethod || null,
        payment_number: paymentNumber || null,
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

  async function sendPaymentMethodRequestPush(userId: string, userLabel: string) {
    if (!userId) return
    setWinnersError('')

    try {
      const { data, error } = await supabase.functions.invoke(
        'send-push-notifications',
        {
          body: {
            userIds: [userId],
            title: 'Numéro Mobile Money requis',
            body: `${userLabel}, renseigne ton numéro Mobile Money pour recevoir ton gain MegaPromo.`,
            type: 'payment_method_request',
            data: {
              type: 'payment_method_request',
              source: 'winner_payment',
            },
            platforms: ['ios', 'android'],
          },
        },
      )

      if (error) throw error

      const sent = Number((data as { sent?: number } | null)?.sent ?? 0)
      const failed = Number((data as { failed?: number } | null)?.failed ?? 0)
      setWinnersNotice(
        sent > 0 && failed === 0
          ? 'Demande envoyée au joueur.'
          : 'Demande créée, mais le push mobile n’a pas été confirmé.',
      )
    } catch (error) {
      setWinnersError(
        formatUnknownError(
          error,
          'Impossible d’envoyer la demande de numéro Mobile Money.',
        ),
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleWinnersNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleWinnersNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Récompenses</span>
          <strong>{winnersData.winners.length} gains</strong>
          <p>
            {historyMode
              ? 'Historique complet des gains envoyés aux joueurs.'
              : 'Attribue les récompenses et suis leur statut d’envoi.'}
          </p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Récompenses</p>
            <h1>{historyMode ? 'Historique des gains' : 'Gagnants'}</h1>
            <p className="page-subtitle">
              {historyMode
                ? 'Consulte, filtre et contrôle les gains déjà enregistrés.'
                : 'Crée, confirme et trace les gains envoyés aux joueurs.'}
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
            {!historyMode ? (
              <button className="primary-button" onClick={openWinnerModal} type="button">
                Nouveau gagnant
              </button>
            ) : null}
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

        {winnersNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Action envoyée</strong>
              <p>{winnersNotice}</p>
            </div>
          </div>
        ) : null}

        <section
          aria-label={historyMode ? 'Statistiques de l’historique des gains' : 'Statistiques des gagnants'}
          className="settings-overview rewards-stats-overview"
        >
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">G</span>
            <div>
              <small>{historyMode ? 'Gains enregistrés' : 'Gagnants'}</small>
              <strong>{formatNumber(winnersStats.total)}</strong>
              <p>
                {formatNumber(winnersStats.pending)} en attente ·{' '}
                {formatNumber(winnersStats.sent + winnersStats.received)} traités
              </p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">V</span>
            <div>
              <small>Valeur totale</small>
              <strong>{formatMoney(winnersStats.totalValue)}</strong>
              <p>{formatMoney(winnersStats.paidValue)} déjà marqué payé/reçu.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">Q</span>
            <div>
              <small>Origine</small>
              <strong>{formatNumber(winnersStats.contest)} concours</strong>
              <p>{formatNumber(winnersStats.live)} gain(s) issus des Quiz Live.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">M</span>
            <div>
              <small>Paiement</small>
              <strong>{formatNumber(winnersStats.missingPayment)}</strong>
              <p>Gagnant(s) sans numéro de paiement renseigné.</p>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Profil mobile</p>
              <h2>Récompenses dans le profil joueur</h2>
            </div>
            <span
              className={`status-pill ${rewardsFlag.isEnabled ? 'active' : 'inactive'}`}
            >
              {rewardsFlag.isEnabled ? 'Visible' : 'Masqué'}
            </span>
          </div>
          <p className="page-subtitle">
            Contrôle l’affichage du bouton Récompenses dans la page profil de
            l’application mobile.
            {rewardsFlag.updatedAt
              ? ` Dernière mise à jour : ${formatDate(rewardsFlag.updatedAt)}.`
              : ''}
          </p>
          <div className="contest-actions">
            <button
              className={
                rewardsFlag.isEnabled ? 'table-action-button danger' : 'primary-button'
              }
              disabled={isRewardsFlagSaving}
              onClick={handleToggleRewardsAccess}
              type="button"
            >
              {isRewardsFlagSaving
                ? 'Mise à jour...'
                : rewardsFlag.isEnabled
                  ? 'Désactiver les récompenses'
                  : 'Activer les récompenses'}
            </button>
          </div>
        </section>

        <section className="panel winners-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Payouts</p>
              <h2>{historyMode ? 'Historique des gains' : 'Liste des gagnants'}</h2>
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
                        navigate(`${contestsRoute}/${winner.contestId}/history`)
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
                    {!winner.paymentNumber ? (
                      <button
                        aria-label={`Demander le numéro Mobile Money de ${winner.userLabel}`}
                        className="table-action-button"
                        onClick={() =>
                          sendPaymentMethodRequestPush(winner.userId, winner.userLabel)
                        }
                        title="Envoyer un push au joueur pour renseigner son numéro Mobile Money"
                        type="button"
                      >
                        Demander MM
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
          onRequestPaymentMethod={sendPaymentMethodRequestPush}
          onSubmit={handleWinnerSubmit}
          paymentMethods={winnersData.paymentMethods}
          users={winnersData.users}
        />
      ) : null}
    </main>
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
  onRequestPaymentMethod,
  onSubmit,
  paymentMethods,
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
  onRequestPaymentMethod: (userId: string, userLabel: string) => void | Promise<void>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  paymentMethods: WinnerPaymentMethodOption[]
  users: UserOption[]
}) {
  const selectedUser = users.find((user) => user.id === form.userId)
  const selectedUserPaymentMethods = paymentMethods.filter(
    (method) => method.userId === form.userId && method.status === 'active' && method.phone,
  )

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
                onChange={(event) => {
                  const userId = event.target.value
                  const preferredMethod = paymentMethods.find(
                    (method) =>
                      method.userId === userId &&
                      method.status === 'active' &&
                      method.phone,
                  )
                  onChange({
                    ...form,
                    userId,
                    paymentMethod:
                      preferredMethod?.operatorKey ||
                      preferredMethod?.operatorName ||
                      form.paymentMethod,
                    paymentNumber: preferredMethod?.phone ?? form.paymentNumber,
                  })
                }}
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
              <span>Opérateur enregistré</span>
              <select
                disabled={!form.userId || selectedUserPaymentMethods.length === 0}
                onChange={(event) => {
                  const method = selectedUserPaymentMethods.find(
                    (item) => item.id === event.target.value,
                  )
                  if (!method) return
                  onChange({
                    ...form,
                    paymentMethod: method.operatorKey || method.operatorName,
                    paymentNumber: method.phone,
                  })
                }}
                value={
                  selectedUserPaymentMethods.find(
                    (method) =>
                      method.phone === form.paymentNumber &&
                      (method.operatorKey === form.paymentMethod ||
                        method.operatorName === form.paymentMethod),
                  )?.id ?? ''
                }
              >
                <option value="">
                  {selectedUserPaymentMethods.length > 0
                    ? 'Choisir un numéro'
                    : 'Aucun numéro enregistré'}
                </option>
                {selectedUserPaymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.operatorName} · {method.phone}
                    {method.isPrimary ? ' · Principal' : ''}
                  </option>
                ))}
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

          {form.userId && selectedUserPaymentMethods.length === 0 ? (
            <div className="dashboard-alert compact" role="status">
              <div>
                <strong>Numéro Mobile Money manquant</strong>
                <p>
                  Le joueur doit renseigner un moyen de paiement avant le
                  paiement du gain.
                </p>
              </div>
              <button
                disabled={isSaving}
                onClick={() =>
                  onRequestPaymentMethod(
                    form.userId,
                    selectedUser?.label ?? 'Joueur',
                  )
                }
                type="button"
              >
                Envoyer une demande
              </button>
            </div>
          ) : null}

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
