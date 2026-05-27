import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type SectorsNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminPartnerSectorsPageProps = { authRoute: string; rootRoute: string; navItems: SectorsNavItem[] }
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

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value) }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); const value = char === 'x' ? random : (random & 0x3) | 0x8; return value.toString(16) }) }
function getVisibleSectorNavItems(permissions: string[] | undefined, navItems: SectorsNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
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


export function SuperAdminPartnerSectorsPage({ authRoute, rootRoute, navItems }: SuperAdminPartnerSectorsPageProps) {
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
    navigate(authRoute, { replace: true })
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisibleSectorNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleSectorNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
