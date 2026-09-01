import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'
import { SuperAdminLayout } from '../superAdminLayout/SuperAdminLayout'

type SupabaseLikeError = { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
type ReplayPaymentStatus = 'pending' | 'approved' | 'rejected' | 'used'
type ReplayPaymentFilter = 'all' | ReplayPaymentStatus
type ReplayPaymentsNavItem = { label: string; href: string; icon: string; permission: string }
type ReplayPaymentItem = {
  id: string
  contestId: string
  contestTitle: string
  userId: string
  userLabel: string
  userPhone: string
  proofImageUrl: string
  amount: number
  paymentTarget: string
  paymentUrl: string
  status: ReplayPaymentStatus
  rejectionReason: string
  reviewedBy: string
  reviewedByLabel: string
  reviewedAt: string
  approvedAt: string
  usedAt: string
  createdAt: string
}
type ReplayPaymentsData = {
  payments: ReplayPaymentItem[]
}
type SuperAdminQuizReplayPaymentsPageProps = {
  authRoute: string
  contestsRoute: string
  navItems: ReplayPaymentsNavItem[]
}

function formatMoney(value: number | null) {
  if (!value) return '0 FCFA'
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
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

function replayStatusLabel(status: ReplayPaymentStatus) {
  if (status === 'approved') return 'autorisé'
  if (status === 'rejected') return 'refusé'
  if (status === 'used') return 'joué'
  return 'en attente'
}

function replayStatusPillClass(status: ReplayPaymentStatus) {
  if (status === 'approved') return 'active'
  if (status === 'pending') return 'pending'
  if (status === 'used') return 'success'
  return 'cancelled'
}

function minutesBetween(start: string, end: string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null
  return Math.max(0, Math.round((endTime - startTime) / 60000))
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
  }, [channelName, onRefresh, tablesKey])
}

async function fetchReplayPaymentsData(): Promise<ReplayPaymentsData> {
  const requestsResponse = await supabase
    .from('quiz_replay_requests')
    .select(
      'id, contest_id, user_id, proof_image_url, amount, payment_target, payment_url, status, rejection_reason, reviewed_by, reviewed_at, approved_at, used_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(800)

  if (requestsResponse.error) {
    if (isMissingTableError(requestsResponse.error, 'quiz_replay_requests')) {
      return { payments: [] }
    }
    throw requestsResponse.error
  }

  const requests = requestsResponse.data ?? []
  const contestIds = Array.from(
    new Set(requests.map((request) => request.contest_id as string | null).filter(Boolean) as string[]),
  )
  const userIds = Array.from(
    new Set(
      requests
        .flatMap((request) => [
          request.user_id as string | null,
          request.reviewed_by as string | null,
        ])
        .filter(Boolean) as string[],
    ),
  )

  const [contestsResponse, usersResponse] = await Promise.all([
    contestIds.length > 0
      ? supabase.from('contests').select('id, title').in('id', contestIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? supabase.from('users').select('id, username, phone').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (contestsResponse.error) throw contestsResponse.error
  if (usersResponse.error) throw usersResponse.error

  const contestsById = new Map(
    (contestsResponse.data ?? []).map((contest) => [
      contest.id as string,
      (contest.title as string | null) ?? 'JCQ',
    ]),
  )
  const usersById = new Map(
    (usersResponse.data ?? []).map((user) => {
      const username = (user.username as string | null) ?? ''
      const phone = (user.phone as string | null) ?? ''
      return [
        user.id as string,
        {
          label: username || phone || 'Joueur',
          phone,
        },
      ]
    }),
  )

  return {
    payments: requests.map((request) => {
      const userId = (request.user_id as string | null) ?? ''
      const reviewedBy = (request.reviewed_by as string | null) ?? ''
      const user = usersById.get(userId)
      return {
        id: request.id as string,
        contestId: (request.contest_id as string | null) ?? '',
        contestTitle: contestsById.get((request.contest_id as string | null) ?? '') ?? 'JCQ',
        userId,
        userLabel: user?.label ?? 'Joueur',
        userPhone: user?.phone ?? '',
        proofImageUrl: (request.proof_image_url as string | null) ?? '',
        amount: (request.amount as number | null) ?? 0,
        paymentTarget: (request.payment_target as string | null) ?? '',
        paymentUrl: (request.payment_url as string | null) ?? '',
        status: ((request.status as string | null) ?? 'pending') as ReplayPaymentStatus,
        rejectionReason: (request.rejection_reason as string | null) ?? '',
        reviewedBy,
        reviewedByLabel: usersById.get(reviewedBy)?.label ?? '',
        reviewedAt: (request.reviewed_at as string | null) ?? '',
        approvedAt: (request.approved_at as string | null) ?? '',
        usedAt: (request.used_at as string | null) ?? '',
        createdAt: (request.created_at as string | null) ?? '',
      }
    }),
  }
}

export function SuperAdminQuizReplayPaymentsPage({
  authRoute,
  contestsRoute,
  navItems,
}: SuperAdminQuizReplayPaymentsPageProps) {
  const [data, setData] = useState<ReplayPaymentsData>({ payments: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReplayPaymentFilter>('all')
  const [contestFilter, setContestFilter] = useState('all')
  const [savingId, setSavingId] = useState('')

  const loadData = useCallback(async () => {
    try {
      setError('')
      const nextData = await fetchReplayPaymentsData()
      setData(nextData)
    } catch (fetchError) {
      console.error(fetchError)
      setError(formatUnknownError(fetchError, "Impossible de charger l'historique des paiements replay."))
      void logError({
        feature: 'quiz_replays',
        action: 'sa_replay_payments_load_failed',
        message: "Impossible de charger l'historique des paiements replay.",
        metadata: { page: 'quiz_replays' },
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useRealtimeRefresh('sa-quiz-replay-payments', ['quiz_replay_requests'], loadData)

  const contestOptions = useMemo(
    () =>
      Array.from(
        new Map(data.payments.map((payment) => [payment.contestId, payment.contestTitle])).entries(),
      )
        .filter(([contestId]) => contestId)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [data.payments],
  )

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return data.payments.filter((payment) => {
      const matchesSearch =
        !normalizedSearch ||
        payment.userLabel.toLowerCase().includes(normalizedSearch) ||
        payment.userPhone.toLowerCase().includes(normalizedSearch) ||
        payment.contestTitle.toLowerCase().includes(normalizedSearch) ||
        payment.paymentTarget.toLowerCase().includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      const matchesContest = contestFilter === 'all' || payment.contestId === contestFilter
      return matchesSearch && matchesStatus && matchesContest
    })
  }, [contestFilter, data.payments, search, statusFilter])

  const stats = useMemo(() => {
    const reviewedDurations = data.payments
      .map((payment) => minutesBetween(payment.createdAt, payment.reviewedAt))
      .filter((duration): duration is number => duration !== null)
    const averageReviewMinutes =
      reviewedDurations.length === 0
        ? 0
        : Math.round(
            reviewedDurations.reduce((total, duration) => total + duration, 0) /
              reviewedDurations.length,
          )

    return {
      total: data.payments.length,
      pending: data.payments.filter((payment) => payment.status === 'pending').length,
      approved: data.payments.filter((payment) => payment.status === 'approved').length,
      rejected: data.payments.filter((payment) => payment.status === 'rejected').length,
      used: data.payments.filter((payment) => payment.status === 'used').length,
      totalAmount: data.payments.reduce((total, payment) => total + payment.amount, 0),
      validatedAmount: data.payments
        .filter((payment) => payment.status === 'approved' || payment.status === 'used')
        .reduce((total, payment) => total + payment.amount, 0),
      pendingAmount: data.payments
        .filter((payment) => payment.status === 'pending')
        .reduce((total, payment) => total + payment.amount, 0),
      averageReviewMinutes,
    }
  }, [data.payments])

  async function approveRequest(payment: ReplayPaymentItem) {
    setSavingId(payment.id)
    setNotice('')
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('admin_approve_quiz_replay_request', {
        p_request_id: payment.id,
      })
      if (rpcError) throw rpcError
      setNotice(`${payment.userLabel} est autorisé à rejouer ${payment.contestTitle}.`)
      await logAdminAction({
        feature: 'quiz_replays',
        action: 'sa_replay_payment_approved',
        message: 'Demande de replay autorisée.',
        entityType: 'quiz_replay_request',
        entityId: payment.id,
        userId: payment.userId,
        metadata: {
          contest_id: payment.contestId,
        },
      })
      await loadData()
    } catch (approveError) {
      console.error(approveError)
      setError(formatUnknownError(approveError, "Impossible d'autoriser ce replay."))
      void logError({
        feature: 'quiz_replays',
        action: 'sa_replay_payment_approve_failed',
        message: "Impossible d'autoriser ce replay.",
        entityType: 'quiz_replay_request',
        entityId: payment.id,
      })
    } finally {
      setSavingId('')
    }
  }

  async function rejectRequest(payment: ReplayPaymentItem) {
    const reason = window.prompt('Motif du refus, facultatif :') ?? ''
    setSavingId(payment.id)
    setNotice('')
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('admin_reject_quiz_replay_request', {
        p_request_id: payment.id,
        p_rejection_reason: reason,
      })
      if (rpcError) throw rpcError
      setNotice(`La demande de ${payment.userLabel} a été refusée.`)
      await logAdminAction({
        feature: 'quiz_replays',
        action: 'sa_replay_payment_rejected',
        message: 'Demande de replay refusée.',
        entityType: 'quiz_replay_request',
        entityId: payment.id,
        userId: payment.userId,
        metadata: {
          contest_id: payment.contestId,
        },
      })
      await loadData()
    } catch (rejectError) {
      console.error(rejectError)
      setError(formatUnknownError(rejectError, 'Impossible de refuser cette demande.'))
      void logError({
        feature: 'quiz_replays',
        action: 'sa_replay_payment_reject_failed',
        message: 'Impossible de refuser cette demande.',
        entityType: 'quiz_replay_request',
        entityId: payment.id,
      })
    } finally {
      setSavingId('')
    }
  }

  return (
    <SuperAdminLayout
      accessLabel="Super Admin"
      authRoute={authRoute}
      description="Historique des preuves de paiement envoyées par les joueurs pour rejouer un JCQ."
      eyebrow="Paiements replay"
      navItems={navItems}
      title="Paiements pour rejouer"
    >
      <section className="stats-grid">
        <article className="stat-card">
          <span>Demandes</span>
          <strong>{formatNumber(stats.total)}</strong>
          <p>{formatNumber(stats.pending)} en attente</p>
        </article>
        <article className="stat-card">
          <span>Montant total</span>
          <strong>{formatMoney(stats.totalAmount)}</strong>
          <p>{formatMoney(stats.pendingAmount)} à vérifier</p>
        </article>
        <article className="stat-card">
          <span>Validés</span>
          <strong>{formatMoney(stats.validatedAmount)}</strong>
          <p>{formatNumber(stats.approved + stats.used)} replay(s) autorisé(s)</p>
        </article>
        <article className="stat-card">
          <span>Délai moyen</span>
          <strong>{stats.averageReviewMinutes} min</strong>
          <p>{formatNumber(stats.rejected)} refusé(s), {formatNumber(stats.used)} joué(s)</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Preuves et validations replay</h2>
          </div>
          <button className="secondary-button" onClick={() => void loadData()} type="button">
            Actualiser
          </button>
        </div>

        <div className="winner-filters">
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher joueur, téléphone, JCQ..."
            type="search"
            value={search}
          />
          <select
            onChange={(event) => setStatusFilter(event.target.value as ReplayPaymentFilter)}
            value={statusFilter}
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Autorisé</option>
            <option value="used">Joué</option>
            <option value="rejected">Refusé</option>
          </select>
          <select
            onChange={(event) => setContestFilter(event.target.value)}
            value={contestFilter}
          >
            <option value="all">Tous les JCQ</option>
            {contestOptions.map(([contestId, title]) => (
              <option key={contestId} value={contestId}>
                {title}
              </option>
            ))}
          </select>
          <button
            className="secondary-button"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setContestFilter('all')
            }}
            type="button"
          >
            Réinitialiser
          </button>
        </div>

        {notice ? <p className="form-success">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <div className="premium-contest-table replay-payments-table">
          <div className="premium-contest-head">
            <span>Joueur</span>
            <span>JCQ</span>
            <span>Montant</span>
            <span>Paiement</span>
            <span>Statut</span>
            <span>Dates</span>
            <span>Actions</span>
          </div>

          {isLoading ? (
            <div className="empty-state">Chargement des paiements replay...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="empty-state">Aucun paiement replay trouvé.</div>
          ) : (
            filteredPayments.map((payment) => (
              <div className="premium-contest-row" key={payment.id}>
                <div>
                  <strong>{payment.userLabel}</strong>
                  <small>{payment.userPhone || 'Téléphone non renseigné'}</small>
                </div>
                <div>
                  <strong>{payment.contestTitle}</strong>
                  <small>{payment.contestId}</small>
                </div>
                <div>
                  <strong>{formatMoney(payment.amount)}</strong>
                  <small>{payment.paymentUrl ? 'Lien disponible' : 'Mobile Money'}</small>
                </div>
                <div>
                  <p>{payment.paymentTarget || 'Non défini'}</p>
                  {payment.proofImageUrl ? (
                    <a href={payment.proofImageUrl} rel="noreferrer" target="_blank">
                      Voir la preuve
                    </a>
                  ) : (
                    <small>Preuve absente</small>
                  )}
                </div>
                <div>
                  <span className={`status-pill ${replayStatusPillClass(payment.status)}`}>
                    {replayStatusLabel(payment.status)}
                  </span>
                  {payment.rejectionReason ? <small>{payment.rejectionReason}</small> : null}
                </div>
                <div>
                  <p>Soumis: {formatDate(payment.createdAt)}</p>
                  <small>
                    {payment.usedAt
                      ? `Joué: ${formatDate(payment.usedAt)}`
                      : payment.reviewedAt
                        ? `Traité: ${formatDate(payment.reviewedAt)}`
                        : 'Pas encore traité'}
                  </small>
                </div>
                <div className="table-actions compact">
                  {payment.status === 'pending' ? (
                    <>
                      <button
                        className="table-action-button success"
                        disabled={savingId === payment.id}
                        onClick={() => void approveRequest(payment)}
                        type="button"
                      >
                        Autoriser
                      </button>
                      <button
                        className="table-action-button danger"
                        disabled={savingId === payment.id}
                        onClick={() => void rejectRequest(payment)}
                        type="button"
                      >
                        Refuser
                      </button>
                    </>
                  ) : (
                    <a className="table-action-button" href={`${contestsRoute}/${payment.contestId}/history`}>
                      Classement
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </section>
    </SuperAdminLayout>
  )
}
