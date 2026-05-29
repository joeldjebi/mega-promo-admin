import { useMemo } from 'react'

type PlayerPlanAccessKey = 'free' | 'premium' | 'vip'

export type PartnerAdminContest = {
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

export type PartnerAdminContestTypeOption = {
  key: string
  name: string
}

type PartnerContestsPanelProps = {
  contests: PartnerAdminContest[]
  filteredContests: PartnerAdminContest[]
  search: string
  statusFilter: string
  typeFilter: string
  types: PartnerAdminContestTypeOption[]
  onCreate: () => void
  onEdit: (contest: PartnerAdminContest) => void
  onHistory: (contestId: string) => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
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

function formatPlayerPlanAccess(keys: PlayerPlanAccessKey[]) {
  if (keys.length === 0) return 'Tous les joueurs'
  const labels: Record<PlayerPlanAccessKey, string> = {
    free: 'Standard',
    premium: 'Premium',
    vip: 'VIP',
  }
  return keys.map((key) => labels[key]).join(' + ')
}

export function PartnerContestsPanel({
  contests,
  filteredContests,
  search,
  statusFilter,
  typeFilter,
  types,
  onCreate,
  onEdit,
  onHistory,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
}: PartnerContestsPanelProps) {
  const stats = useMemo(() => {
    const now = Date.now()
    const active = contests.filter((contest) => contest.status === 'active')
    const pending = contests.filter((contest) => contest.status === 'pending')
    const boosted = contests.filter((contest) => contest.isBoosted)
    const totalParticipants = contests.reduce(
      (total, contest) => total + contest.participants,
      0,
    )
    const totalViews = contests.reduce((total, contest) => total + contest.viewsCount, 0)
    const totalShares = contests.reduce((total, contest) => total + contest.sharesCount, 0)
    const totalPrizeValue = contests.reduce((total, contest) => total + contest.prizeValue, 0)
    const endingSoon = contests.filter((contest) => {
      if (!contest.endsAt || contest.status !== 'active') return false
      const endsAt = new Date(contest.endsAt).getTime()
      return Number.isFinite(endsAt) && endsAt >= now && endsAt <= now + 24 * 60 * 60 * 1000
    })

    return {
      total: contests.length,
      active: active.length,
      pending: pending.length,
      boosted: boosted.length,
      totalParticipants,
      totalViews,
      totalShares,
      totalPrizeValue,
      endingSoon: endingSoon.length,
    }
  }, [contests])

  return (
    <section className="partner-page-section">
      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mes concours</p>
            <h2>Liste des concours enregistrés</h2>
          </div>
          <div className="section-heading-actions">
            <span className="pill">
              {formatNumber(filteredContests.length)} / {formatNumber(contests.length)}
            </span>
            <button className="primary-button" onClick={onCreate} type="button">
              Créer un concours
            </button>
          </div>
        </div>

        <div className="settings-overview partner-contest-stats-overview" aria-label="Statistiques des concours partenaire">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">C</span>
            <div>
              <small>Concours</small>
              <strong>{formatNumber(stats.total)}</strong>
              <p>
                {formatNumber(stats.active)} actifs · {formatNumber(stats.pending)} en attente
              </p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">J</span>
            <div>
              <small>Joueurs</small>
              <strong>{formatNumber(stats.totalParticipants)}</strong>
              <p>Participations enregistrées sur tes campagnes.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">V</span>
            <div>
              <small>Visibilité</small>
              <strong>{formatNumber(stats.totalViews)}</strong>
              <p>{formatNumber(stats.totalShares)} partage(s) · {formatNumber(stats.boosted)} boosté(s)</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">G</span>
            <div>
              <small>Gains</small>
              <strong>{formatMoney(stats.totalPrizeValue)}</strong>
              <p>{formatNumber(stats.endingSoon)} finissent dans les prochaines 24h.</p>
            </div>
          </article>
        </div>

        <div className="contest-filter-bar compact">
          <input
            className="search-input"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher un concours..."
            value={search}
          />
          <select
            onChange={(event) => onStatusFilterChange(event.target.value)}
            value={statusFilter}
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
            <option value="draft">Draft</option>
          </select>
          <select
            onChange={(event) => onTypeFilterChange(event.target.value)}
            value={typeFilter}
          >
            <option value="all">Tous les types</option>
            {types.map((type) => (
              <option key={type.key} value={type.key}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {filteredContests.length === 0 ? (
          <p className="empty-panel-text">
            {contests.length > 0
              ? 'Aucun concours ne correspond aux filtres.'
              : 'Aucun concours n’est encore rattaché à ce partenaire.'}
          </p>
        ) : (
          <div className="premium-contest-table partner-contest-table">
            <div className="premium-contest-head partner-contest-head">
              <span>Concours</span>
              <span>Type</span>
              <span>Gain</span>
              <span>Accès</span>
              <span>Participants</span>
              <span>Fin</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {filteredContests.map((contest) => (
              <article className="premium-contest-row partner-contest-row" key={contest.id}>
                <div>
                  <strong>{contest.title}</strong>
                  <p>
                    {contest.category} · {contest.isBoosted ? 'Boosté' : 'Standard'}
                  </p>
                </div>
                <span className="contest-type-pill">{contest.type}</span>
                <div>
                  <strong>{contest.prizeDescription || 'Récompense'}</strong>
                  <p>{formatMoney(contest.prizeValue)}</p>
                </div>
                <p>{formatPlayerPlanAccess(contest.allowedPlayerPlanKeys)}</p>
                <p>{formatNumber(contest.participants)} joueur(s)</p>
                <p>{formatDate(contest.endsAt)}</p>
                <span className={`status-pill ${contest.status}`}>{contest.status}</span>
                <div className="contest-actions">
                  <button
                    className="table-action-button"
                    onClick={() => onHistory(contest.id)}
                    type="button"
                  >
                    Historique
                  </button>
                  <button
                    className="table-action-button"
                    disabled={contest.status !== 'pending'}
                    onClick={() => onEdit(contest)}
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
  )
}
