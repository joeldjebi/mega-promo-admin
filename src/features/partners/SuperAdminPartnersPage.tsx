import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type PartnersNavItem = { label: string; href: string; icon: string; permission: string }
type PartnerSectorItem = { id: string; name: string; description: string; isActive: boolean; orderIndex: number; createdAt: string }
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

type SuperAdminPartnersPageProps = { authRoute: string; rootRoute: string; navItems: PartnersNavItem[] }
const PARTNER_AUTH_ROUTE = '/auth/partner'
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value) }
function formatUnknownError(error: unknown, fallback: string) { if (error instanceof Error) return error.message; if (error && typeof error === 'object') { const payload = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }; return [payload.message, payload.details, payload.hint, payload.code].filter((item) => typeof item === 'string' && item.length > 0).join(' · ') || fallback } return typeof error === 'string' && error.length > 0 ? error : fallback }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,(char)=>{const random=Math.floor(Math.random()*16);const value=char==='x'?random:(random&0x3)|0x8;return value.toString(16)}) }
function toDatetimeLocalValue(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
function isoToDatetimeLocalValue(value: string) { if (!value) return ''; return toDatetimeLocalValue(new Date(value)) }
function getVisiblePartnerNavItems(permissions: string[] | undefined, navItems: PartnersNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
async function fetchPartnerSectorsData(): Promise<PartnerSectorItem[]> { const { data, error } = await supabase.from('partner_sectors').select('id, name, description, is_active, order_index, created_at').order('order_index', { ascending: true }).order('name', { ascending: true }); if (error) throw error; return (data ?? []).map((sector) => ({ id: sector.id as string, name: (sector.name as string | null) ?? '', description: (sector.description as string | null) ?? '', isActive: (sector.is_active as boolean | null) ?? true, orderIndex: (sector.order_index as number | null) ?? 0, createdAt: (sector.created_at as string | null) ?? '' })) }
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


export function SuperAdminPartnersPage({ authRoute, rootRoute, navItems }: SuperAdminPartnersPageProps) {
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
    navigate(authRoute, { replace: true })
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisiblePartnerNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisiblePartnerNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
            <a
              aria-label="Accéder à la page de connexion des partenaires"
              className="table-action-button"
              href={PARTNER_AUTH_ROUTE}
              rel="noreferrer"
              target="_blank"
            >
              Login partenaires
            </a>
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
