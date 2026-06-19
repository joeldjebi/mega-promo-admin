import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

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

function formatDate(value: string) {
  if (!value) return 'Non défini'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
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

type PartnerOption = {
  id: string
  name: string
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
type SuperAdminRewardCatalogPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
}

const defaultRewardCatalogTypeLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  discount_code: 'Code réduction',
  voucher: 'Bon de réduction',
  concert_ticket: 'Ticket de concert',
  physical_item: 'Lot physique',
  manual: 'Manuel',
}

function getVisibleRewardCatalogNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
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


export function SuperAdminRewardCatalogPage({ authRoute, rootRoute, navItems }: SuperAdminRewardCatalogPageProps) {
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
  const [catalogPage, setCatalogPage] = useState(0)
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
  const catalogPageSize = 10
  const totalCatalogPages = Math.max(1, Math.ceil(filteredRewards.length / catalogPageSize))
  const paginatedRewards = useMemo(() => {
    const startIndex = catalogPage * catalogPageSize
    return filteredRewards.slice(startIndex, startIndex + catalogPageSize)
  }, [catalogPage, filteredRewards])
  const catalogResultsStart =
    filteredRewards.length === 0 ? 0 : catalogPage * catalogPageSize + 1
  const catalogResultsEnd = Math.min(
    filteredRewards.length,
    catalogPage * catalogPageSize + paginatedRewards.length,
  )
  const catalogPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, catalogPage - 2)
    const lastPage = Math.min(totalCatalogPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [catalogPage, totalCatalogPages])

  useEffect(() => {
    setCatalogPage(0)
  }, [catalogSearch, catalogStatusFilter, catalogTypeFilter])

  useEffect(() => {
    if (catalogPage + 1 > totalCatalogPages) {
      setCatalogPage(totalCatalogPages - 1)
    }
  }, [catalogPage, totalCatalogPages])

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
    navigate(authRoute, { replace: true })
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleRewardCatalogNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleRewardCatalogNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
            {paginatedRewards.length > 0 ? (
              paginatedRewards.map((reward) => (
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

          <div className="pagination-row">
            <span>
              {formatNumber(catalogResultsStart)}-{formatNumber(catalogResultsEnd)} sur{' '}
              {formatNumber(filteredRewards.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={catalogPage === 0 || isCatalogLoading}
                onClick={() => setCatalogPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={catalogPage === 0 || isCatalogLoading}
                onClick={() => setCatalogPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {catalogPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === catalogPage ? 'active' : ''}`}
                    disabled={isCatalogLoading}
                    key={page}
                    onClick={() => setCatalogPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={catalogPage + 1 >= totalCatalogPages || isCatalogLoading}
                onClick={() =>
                  setCatalogPage((page) => Math.min(totalCatalogPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={catalogPage + 1 >= totalCatalogPages || isCatalogLoading}
                onClick={() => setCatalogPage(totalCatalogPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
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
