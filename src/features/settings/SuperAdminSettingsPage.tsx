import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type SupabaseLikeError = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
}

type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
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
    const supabaseError = error as SupabaseLikeError
    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code]
      .filter((item) => typeof item === 'string' && item.length > 0)
      .join(' · ') || fallback
  }
  return fallback
}

function isMissingTableError(error: unknown, tableName: string) {
  if (!error || typeof error !== 'object') return false
  const supabaseError = error as SupabaseLikeError
  const message = `${supabaseError.message ?? ''} ${supabaseError.details ?? ''}`.toLowerCase()
  return (
    supabaseError.code === '42P01' ||
    message.includes(`relation "public.${tableName}" does not exist`) ||
    message.includes(`could not find the table 'public.${tableName}'`)
  )
}

function getVisibleFeatureNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
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
type AppFeatureFlagItem = {
  key: string
  name: string
  description: string
  isEnabled: boolean
  metadata: Record<string, unknown>
  updatedAt: string
}
type PlayerAuthMode = 'otp' | 'social' | 'hybrid'

type SuperAdminSettingsPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
  accessRoute: string
  categoriesRoute: string
  countriesRoute: string
  maintenanceRoute: string
  notificationsRoute: string
  plansRoute: string
  sectorsRoute: string
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

const defaultAppFeatureFlags: AppFeatureFlagItem[] = [
  {
    key: 'player_subscriptions',
    name: 'Bouton forfait joueur',
    description: 'Affiche ou masque l’accès aux forfaits dans le profil joueur.',
    isEnabled: true,
    metadata: {},
    updatedAt: '',
  },
  {
    key: 'app_maintenance',
    name: 'Mode maintenance',
    description:
      'Redirige les joueurs vers une page maintenance et bloque l’accès mobile.',
    isEnabled: false,
    metadata: {},
    updatedAt: '',
  },
  {
    key: 'otp_delivery_channel',
    name: 'Canal OTP inscription',
    description:
      'Choisit le canal d’envoi des codes OTP joueur: SMS ou WhatsApp.',
    isEnabled: true,
    metadata: { channel: 'sms' },
    updatedAt: '',
  },
  {
    key: 'player_auth_mode',
    name: 'Mode authentification joueur',
    description:
      'Choisit les moyens de connexion dans l’application mobile: OTP, Google + Apple ou mode hybride.',
    isEnabled: true,
    metadata: {
      mode: 'otp',
      allowed_modes: ['otp', 'social', 'hybrid'],
      redirect_url: 'megapromo://login-callback/',
    },
    updatedAt: '',
  },
]


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


async function fetchAppFeatureFlagsForAdmin(): Promise<AppFeatureFlagItem[]> {
  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('key, name, description, is_enabled, metadata, updated_at')
    .in('key', defaultAppFeatureFlags.map((flag) => flag.key))
    .order('name', { ascending: true })

  if (error) throw error

  const rows = (data ?? []).map((flag) => ({
    key: flag.key as string,
    name: (flag.name as string | null) ?? flag.key,
    description: (flag.description as string | null) ?? '',
    isEnabled: (flag.is_enabled as boolean | null) ?? true,
    metadata:
      flag.metadata && typeof flag.metadata === 'object'
        ? (flag.metadata as Record<string, unknown>)
        : {},
    updatedAt: (flag.updated_at as string | null) ?? '',
  }))

  return defaultAppFeatureFlags.map((defaultFlag) => ({
    ...defaultFlag,
    ...rows.find((flag) => flag.key === defaultFlag.key),
  }))
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


export function SuperAdminSettingsPage({ authRoute, rootRoute, navItems, accessRoute, categoriesRoute, countriesRoute, maintenanceRoute, notificationsRoute, plansRoute, sectorsRoute }: SuperAdminSettingsPageProps) {
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
  const [appFeatureFlags, setAppFeatureFlags] = useState<AppFeatureFlagItem[]>(
    defaultAppFeatureFlags,
  )
  const [isAppFeatureFlagSaving, setIsAppFeatureFlagSaving] = useState(false)
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

  async function loadAppFeatureFlags() {
    try {
      setAppFeatureFlags(await fetchAppFeatureFlagsForAdmin())
    } catch (error) {
      if (isMissingTableError(error, 'app_feature_flags')) {
        setAppFeatureFlags(defaultAppFeatureFlags)
        return
      }
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de charger les options de l’app mobile.',
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
        loadAppFeatureFlags(),
      ])
    })()
  }, [])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
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

  async function handleToggleAppFeatureFlag(flag: AppFeatureFlagItem, isEnabled: boolean) {
    setNotice('')
    setSettingsError('')
    setIsAppFeatureFlagSaving(true)
    try {
      const { error } = await supabase.from('app_feature_flags').upsert({
        key: flag.key,
        name: flag.name,
        description: flag.description,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadAppFeatureFlags()
      if (flag.key === 'app_maintenance') {
        setNotice(
          isEnabled
            ? 'Mode maintenance activé. Les joueurs sont redirigés en temps réel.'
            : 'Application repassée en ligne. Les joueurs retrouvent l’accès automatiquement.',
        )
      } else {
        setNotice(
          isEnabled
            ? 'Accès aux forfaits réactivé côté joueur.'
            : 'Accès aux forfaits masqué côté joueur.',
        )
      }
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour cette option.'),
      )
    } finally {
      setIsAppFeatureFlagSaving(false)
    }
  }

  async function handleSaveOtpDeliveryChannel(channel: 'sms' | 'whatsapp') {
    const otpFlag =
      appFeatureFlags.find((flag) => flag.key === 'otp_delivery_channel') ??
      defaultAppFeatureFlags[2]

    setNotice('')
    setSettingsError('')
    setIsAppFeatureFlagSaving(true)
    try {
      const { error } = await supabase.from('app_feature_flags').upsert({
        key: otpFlag.key,
        name: otpFlag.name,
        description: otpFlag.description,
        is_enabled: true,
        metadata: { ...otpFlag.metadata, channel },
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadAppFeatureFlags()
      setNotice(
        channel === 'whatsapp'
          ? 'Les OTP inscription seront envoyés via WhatsApp.'
          : 'Les OTP inscription seront envoyés via SMS.',
      )
    } catch (error) {
      setSettingsError(
        formatUnknownError(error, 'Impossible de mettre à jour le canal OTP.'),
      )
    } finally {
      setIsAppFeatureFlagSaving(false)
    }
  }

  async function handleSavePlayerAuthMode(mode: PlayerAuthMode) {
    const authModeFlag =
      appFeatureFlags.find((flag) => flag.key === 'player_auth_mode') ??
      defaultAppFeatureFlags[3]

    setNotice('')
    setSettingsError('')
    setIsAppFeatureFlagSaving(true)
    try {
      const { error } = await supabase.from('app_feature_flags').upsert({
        key: authModeFlag.key,
        name: authModeFlag.name,
        description: authModeFlag.description,
        is_enabled: true,
        metadata: {
          ...authModeFlag.metadata,
          mode,
          allowed_modes: ['otp', 'social', 'hybrid'],
          redirect_url: 'megapromo://login-callback/',
        },
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await loadAppFeatureFlags()
      const label =
        mode === 'social'
          ? 'Google + Apple'
          : mode === 'hybrid'
            ? 'Google + Apple + OTP'
            : 'OTP'
      setNotice(`Mode d’authentification joueur mis à jour : ${label}.`)
    } catch (error) {
      setSettingsError(
        formatUnknownError(
          error,
          'Impossible de mettre à jour le mode d’authentification.',
        ),
      )
    } finally {
      setIsAppFeatureFlagSaving(false)
    }
  }

  const playerSubscriptionsFlag =
    appFeatureFlags.find((flag) => flag.key === 'player_subscriptions') ??
    defaultAppFeatureFlags[0]
  const appMaintenanceFlag =
    appFeatureFlags.find((flag) => flag.key === 'app_maintenance') ??
    defaultAppFeatureFlags[1]
  const otpDeliveryFlag =
    appFeatureFlags.find((flag) => flag.key === 'otp_delivery_channel') ??
    defaultAppFeatureFlags[2]
  const playerAuthModeFlag =
    appFeatureFlags.find((flag) => flag.key === 'player_auth_mode') ??
    defaultAppFeatureFlags[3]
  const otpDeliveryChannel =
    otpDeliveryFlag.metadata.channel === 'whatsapp' ? 'whatsapp' : 'sms'
  const playerAuthMode: PlayerAuthMode =
    playerAuthModeFlag.metadata.mode === 'social'
      ? 'social'
      : playerAuthModeFlag.metadata.mode === 'hybrid'
        ? 'hybrid'
        : 'otp'

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
          {getVisibleFeatureNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleFeatureNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
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
                <p className="eyebrow">Authentification</p>
                <h2>Mode de connexion joueur</h2>
              </div>
              <span className="status-pill active">
                {playerAuthMode === 'social'
                  ? 'Google + Apple'
                  : playerAuthMode === 'hybrid'
                    ? 'Hybride'
                    : 'OTP'}
              </span>
            </div>
            <p className="helper-text">
              Choisis ce que les joueurs voient sur l’écran de connexion mobile.
              Garde OTP actif tant que les providers Google et Apple ne sont pas
              configurés dans Supabase Auth.
            </p>
            <div className="maintenance-mode-action">
              <div>
                <strong>
                  {playerAuthMode === 'social'
                    ? 'Connexion Google + Apple uniquement'
                    : playerAuthMode === 'hybrid'
                      ? 'Connexion sociale avec OTP en secours'
                      : 'Connexion OTP uniquement'}
                </strong>
                <p>
                  L’app mobile s’adapte en temps réel: boutons Google/Apple,
                  formulaire OTP ou les deux selon ce choix.
                </p>
              </div>
              <div className="contest-actions">
                <button
                  className={`table-action-button ${
                    playerAuthMode === 'otp' ? 'active' : ''
                  }`}
                  disabled={isAppFeatureFlagSaving}
                  onClick={() => void handleSavePlayerAuthMode('otp')}
                  type="button"
                >
                  OTP
                </button>
                <button
                  className={`table-action-button ${
                    playerAuthMode === 'social' ? 'active' : ''
                  }`}
                  disabled={isAppFeatureFlagSaving}
                  onClick={() => void handleSavePlayerAuthMode('social')}
                  type="button"
                >
                  Google + Apple
                </button>
                <button
                  className={`table-action-button ${
                    playerAuthMode === 'hybrid' ? 'active' : ''
                  }`}
                  disabled={isAppFeatureFlagSaving}
                  onClick={() => void handleSavePlayerAuthMode('hybrid')}
                  type="button"
                >
                  Hybride
                </button>
              </div>
            </div>
          </article>
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Authentification</p>
                <h2>Canal OTP inscription</h2>
              </div>
              <span className="status-pill active">
                {otpDeliveryChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
              </span>
            </div>
            <p className="helper-text">
              Choisis le canal utilisé par le hook OTP Supabase. Aucun fallback
              SMS automatique n’est appliqué quand WhatsApp est actif.
            </p>
            <div className="maintenance-mode-action">
              <div>
                <strong>
                  {otpDeliveryChannel === 'whatsapp'
                    ? 'OTP envoyés via WhatsApp'
                    : 'OTP envoyés via SMS'}
                </strong>
                <p>
                  WhatsApp réduit le coût d’envoi. Le joueur peut renvoyer selon
                  les délais progressifs affichés dans l’app mobile.
                </p>
              </div>
              <div className="contest-actions">
                <button
                  className={`table-action-button ${
                    otpDeliveryChannel === 'sms' ? 'active' : ''
                  }`}
                  disabled={isAppFeatureFlagSaving}
                  onClick={() => void handleSaveOtpDeliveryChannel('sms')}
                  type="button"
                >
                  SMS
                </button>
                <button
                  className={`table-action-button ${
                    otpDeliveryChannel === 'whatsapp' ? 'active' : ''
                  }`}
                  disabled={isAppFeatureFlagSaving}
                  onClick={() => void handleSaveOtpDeliveryChannel('whatsapp')}
                  type="button"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </article>
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Disponibilité</p>
                <h2>Mode maintenance mobile</h2>
              </div>
              <span
                className={`status-pill ${
                  appMaintenanceFlag.isEnabled ? 'inactive' : 'active'
                }`}
              >
                {appMaintenanceFlag.isEnabled ? 'Maintenance' : 'En ligne'}
              </span>
            </div>
            <div className="maintenance-mode-action">
              <div>
                <strong>
                  {appMaintenanceFlag.isEnabled
                    ? 'Application bloquée pour les joueurs'
                    : 'Application accessible aux joueurs'}
                </strong>
                <p>
                  {appMaintenanceFlag.isEnabled
                    ? 'Les joueurs voient la page maintenance en temps réel.'
                    : 'Les joueurs peuvent utiliser normalement l’application.'}
                </p>
              </div>
              <button
                className={`primary-action ${
                  appMaintenanceFlag.isEnabled ? '' : 'danger'
                }`}
                disabled={isAppFeatureFlagSaving}
                onClick={() =>
                  void handleToggleAppFeatureFlag(
                    appMaintenanceFlag,
                    !appMaintenanceFlag.isEnabled,
                  )
                }
                type="button"
              >
                {isAppFeatureFlagSaving
                  ? 'Mise à jour...'
                  : appMaintenanceFlag.isEnabled
                    ? 'Passer l’app en ligne'
                    : 'Activer la maintenance'}
              </button>
            </div>
            <p className="helper-text">
              Quand ce mode est actif, les joueurs connectés sont redirigés
              automatiquement vers la page maintenance et ne peuvent plus
              accéder à l’app. Les comptes SA/admin restent autorisés.
              {appMaintenanceFlag.updatedAt
                ? ` Dernière mise à jour : ${formatDate(
                    appMaintenanceFlag.updatedAt,
                  )}.`
                : ''}
            </p>
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
                  <p>{authRoute}</p>
                </div>
                <button
                  className="table-action-button"
                  onClick={() =>
                    copyValue(authRoute, 'Route SA copiée.')
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
                <p className="eyebrow">Accès joueur</p>
                <h2>Forfaits dans le profil</h2>
              </div>
              <span
                className={`status-pill ${
                  playerSubscriptionsFlag.isEnabled ? 'active' : 'inactive'
                }`}
              >
                {playerSubscriptionsFlag.isEnabled ? 'Visible' : 'Masqué'}
              </span>
            </div>
            <label className="checkbox-row">
              <input
                checked={playerSubscriptionsFlag.isEnabled}
                disabled={isAppFeatureFlagSaving}
                onChange={(event) =>
                  void handleToggleAppFeatureFlag(
                    playerSubscriptionsFlag,
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
              <span>Afficher le bouton Forfait sur le profil joueur</span>
            </label>
            <p className="helper-text">
              Désactive cette option pour masquer l’accès aux forfaits dans
              l’app mobile, notamment pendant la revue App Store.
              {playerSubscriptionsFlag.updatedAt
                ? ` Dernière mise à jour : ${formatDate(
                    playerSubscriptionsFlag.updatedAt,
                  )}.`
                : ''}
            </p>
          </article>
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
            <span className="status-pill pending">7 modules</span>
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
                onClick={() => navigate(plansRoute)}
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
                onClick={() => navigate(notificationsRoute)}
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
                onClick={() => navigate(accessRoute)}
                type="button"
              >
                <span className="settings-module-icon">A</span>
                <span className="settings-module-content">
                  <strong>Admins</strong>
                  <small>Rôles et permissions par module</small>
                </span>
                <span className="status-pill active">RBAC</span>
              </button>
              <button
                className="settings-module-card"
                onClick={() => navigate(countriesRoute)}
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
                onClick={() => navigate(sectorsRoute)}
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
                onClick={() => navigate(categoriesRoute)}
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
                onClick={() => navigate(maintenanceRoute)}
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
