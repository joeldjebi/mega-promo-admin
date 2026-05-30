import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

type PlansNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminPlansPageProps = { authRoute: string; rootRoute: string; navItems: PlansNavItem[] }
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
type PlansAccessFlag = {
  isEnabled: boolean
  updatedAt: string
}

function formatMoney(value: number | null) { if (!value) return '0 FCFA'; return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA` }
function formatDate(value: string) { if (!value) return 'Non défini'; return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); const value = char === 'x' ? random : (random & 0x3) | 0x8; return value.toString(16) }) }
function getVisiblePlansNavItems(permissions: string[] | undefined, navItems: PlansNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
async function fetchPlansAccessFlag(): Promise<PlansAccessFlag> {
  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('is_enabled, updated_at')
    .eq('key', 'player_subscriptions')
    .maybeSingle()

  if (error) throw error

  return {
    isEnabled: (data?.is_enabled as boolean | null) ?? true,
    updatedAt: (data?.updated_at as string | null) ?? '',
  }
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


export function SuperAdminPlansPage({ authRoute, rootRoute, navItems }: SuperAdminPlansPageProps) {
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
  const [plansAccessFlag, setPlansAccessFlag] = useState<PlansAccessFlag>({
    isEnabled: true,
    updatedAt: '',
  })
  const [isPlansAccessSaving, setIsPlansAccessSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setIsPlansLoading(true)
    setPlansError('')

    try {
      const [nextPartnerPlans, nextPlayerPlans, nextAccessFlag] = await Promise.all([
        fetchPartnerPlansData(),
        fetchPlayerPlansForAdmin(),
        fetchPlansAccessFlag().catch(() => ({ isEnabled: true, updatedAt: '' })),
      ])
      setPlansData(nextPartnerPlans)
      setPlayerPlans(nextPlayerPlans)
      setPlansAccessFlag(nextAccessFlag)
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

    void Promise.all([
      fetchPartnerPlansData(),
      fetchPlayerPlansForAdmin(),
      fetchPlansAccessFlag().catch(() => ({ isEnabled: true, updatedAt: '' })),
    ])
      .then(([nextPlansData, nextPlayerPlans, nextAccessFlag]) => {
        if (!isMounted) return
        setPlansData(nextPlansData)
        setPlayerPlans(nextPlayerPlans)
        setPlansAccessFlag(nextAccessFlag)
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
    navigate(authRoute, { replace: true })
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

  async function handleTogglePlansAccess() {
    const nextIsEnabled = !plansAccessFlag.isEnabled
    setPlansError('')
    setIsPlansAccessSaving(true)

    const { error } = await supabase.from('app_feature_flags').upsert({
      key: 'player_subscriptions',
      name: 'Bouton forfait joueur',
      description: 'Affiche ou masque l’accès aux forfaits dans le profil joueur.',
      is_enabled: nextIsEnabled,
      updated_at: new Date().toISOString(),
    })

    setIsPlansAccessSaving(false)

    if (error) {
      void logError({
        feature: 'profile_sections',
        action: 'toggle_player_subscriptions_failed',
        message: 'Echec changement acces forfaits profil joueur.',
        entityType: 'app_feature_flag',
        entityId: 'player_subscriptions',
        metadata: { next_is_enabled: nextIsEnabled, error: error.message },
      })
      setPlansError(error.message)
      return
    }

    setPlansAccessFlag({
      isEnabled: nextIsEnabled,
      updatedAt: new Date().toISOString(),
    })
    void logAdminAction({
      feature: 'profile_sections',
      action: nextIsEnabled
        ? 'player_subscriptions_enabled'
        : 'player_subscriptions_disabled',
      message: 'Acces forfaits profil joueur modifie par le SA.',
      entityType: 'app_feature_flag',
      entityId: 'player_subscriptions',
      metadata: { is_enabled: nextIsEnabled },
    })
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
            <small>{adminRoleLabel(adminAuth.profile)}</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {getVisiblePlansNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisiblePlansNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
          <div className="plans-main-column">
            <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Accès mobile</p>
                <h2>Bouton Forfait dans le profil joueur</h2>
              </div>
              <span
                className={`status-pill ${
                  plansAccessFlag.isEnabled ? 'active' : 'inactive'
                }`}
              >
                {plansAccessFlag.isEnabled ? 'Visible' : 'Masqué'}
              </span>
            </div>
            <p className="page-subtitle">
              Contrôle l’accès des joueurs à la page des forfaits depuis leur
              profil mobile.
              {plansAccessFlag.updatedAt
                ? ` Dernière mise à jour : ${formatDate(plansAccessFlag.updatedAt)}.`
                : ''}
            </p>
            <div className="contest-actions">
              <button
                className={
                  plansAccessFlag.isEnabled
                    ? 'table-action-button danger'
                    : 'primary-button'
                }
                disabled={isPlansAccessSaving}
                onClick={handleTogglePlansAccess}
                type="button"
              >
                {isPlansAccessSaving
                  ? 'Mise à jour...'
                  : plansAccessFlag.isEnabled
                    ? 'Désactiver l’accès aux forfaits'
                    : 'Activer l’accès aux forfaits'}
              </button>
            </div>
            </div>
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
                      <div className="plan-card-status">
                        <span className={`status-pill ${plan.isActive ? 'active' : 'inactive'}`}>
                          {plan.isActive ? 'Actif' : 'Inactif'}
                        </span>
                        <small>{formatMoney(plan.price)}</small>
                      </div>
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
                        className={plan.isActive ? 'table-action-button danger' : 'table-action-button'}
                        onClick={() => handleTogglePlan(plan)}
                        type="button"
                      >
                        {plan.isActive ? 'Désactiver ce forfait' : 'Activer ce forfait'}
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
                      <div className="plan-card-status">
                        <span className={`status-pill ${plan.isActive ? 'active' : 'inactive'}`}>
                          {plan.isActive ? 'Actif' : 'Inactif'}
                        </span>
                        <small>{formatMoney(plan.price)}</small>
                      </div>
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
                        className={plan.isActive ? 'table-action-button danger' : 'table-action-button'}
                        onClick={() => handleTogglePlayerPlan(plan)}
                        type="button"
                      >
                        {plan.isActive ? 'Désactiver ce forfait' : 'Activer ce forfait'}
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
