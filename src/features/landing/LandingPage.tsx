import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import {
  defaultLandingContent,
  fallbackPlayerPlans,
  type LandingPageContent,
  type LandingPlayerPlan,
  mergeLandingContent,
} from './landingContent'
import { landingStyle } from './landingStyles'

type LandingContactSettings = {
  whatsappNumber: string
  whatsappMessage: string
  email: string
}

type LandingContactForm = {
  name: string
  phone: string
  email: string
  subject: string
  message: string
}

type LandingMaintenanceState = {
  isEnabled: boolean
  title: string
  message: string
  badge: string
}

type LandingStoreLinks = {
  androidStoreUrl: string
  iosStoreUrl: string
}

type LandingLiveQuiz = {
  id: string
  title: string
  brandName: string
  logoUrl: string
  imageUrl: string
  prizeLabel: string
  liveStartsAt: string
  endsAt: string
  liveStatus: string
  registeredCount: number
}

type LandingLiveQuizRow = {
  id?: string | null
  title?: string | null
  brand_name?: string | null
  brand_logo_url?: string | null
  image_url?: string | null
  prize_label?: string | null
  prize_value?: number | null
  live_starts_at?: string | null
  ends_at?: string | null
  live_status?: string | null
  registered_count?: number | null
}

const heroTypingThemes = [
  'Offres locales.',
  'Marques ivoiriennes.',
  'Quiz gratuits.',
  'Campagnes promo.',
]

const dismissedLiveQuizStorageKey = 'megapromo:dismissed-live-quiz-prompts'

const defaultContactSettings: LandingContactSettings = {
  whatsappNumber: '2250000000000',
  whatsappMessage: 'Bonjour MegaPromo, j’ai besoin d’informations.',
  email: 'contact@megapromo.ci',
}

const defaultLandingMaintenance: LandingMaintenanceState = {
  isEnabled: false,
  title: 'MegaPromo revient très vite',
  message:
    'Nous effectuons une courte mise à jour afin de vous offrir une expérience plus fluide. Merci pour votre patience.',
  badge: 'Maintenance en cours',
}

const defaultLandingStoreLinks: LandingStoreLinks = {
  androidStoreUrl: '',
  iosStoreUrl: '',
}

function formatPlanPrice(price: number, durationDays: number) {
  if (price <= 0) return '0 FCFA'

  const period = durationDays >= 365
    ? 'an'
    : durationDays >= 30
      ? 'mois'
      : durationDays >= 7
        ? 'semaine'
        : `${durationDays} jour${durationDays > 1 ? 's' : ''}`

  return `${new Intl.NumberFormat('fr-FR').format(price)} FCFA / ${period}`
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

function readDismissedLiveQuizIds() {
  if (typeof window === 'undefined') return new Set<string>()

  try {
    const rawValue = window.localStorage.getItem(dismissedLiveQuizStorageKey)
    const ids = rawValue ? JSON.parse(rawValue) : []
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function saveDismissedLiveQuizIds(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    dismissedLiveQuizStorageKey,
    JSON.stringify(Array.from(ids)),
  )
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}min`
  if (minutes > 0) return `${minutes}min`
  return 'moins d’une minute'
}

function getLiveQuizStatusLabel(quiz: LandingLiveQuiz, nowMs: number) {
  const startsAtMs = Date.parse(quiz.liveStartsAt || quiz.endsAt)
  const endsAtMs = Date.parse(quiz.endsAt)
  const isRunning =
    quiz.liveStatus === 'running' ||
    quiz.liveStatus === 'started' ||
    quiz.liveStatus === 'open' ||
    (!Number.isNaN(startsAtMs) && !Number.isNaN(endsAtMs) && startsAtMs <= nowMs && endsAtMs > nowMs)

  if (isRunning) {
    return {
      badge: 'En cours',
      message: !Number.isNaN(endsAtMs)
        ? `Se termine dans ${formatCountdown(endsAtMs - nowMs)}`
        : 'Quiz Live disponible maintenant',
    }
  }

  return {
    badge: 'À venir',
    message: !Number.isNaN(startsAtMs)
      ? `Commence dans ${formatCountdown(startsAtMs - nowMs)}`
      : 'Quiz Live bientôt disponible',
  }
}

function isLandingBlockVisible(
  content: LandingPageContent,
  blockKey: string,
) {
  return content.blockVisibility?.[blockKey] !== false
}

function mapLandingLiveQuizRow(row: LandingLiveQuizRow): LandingLiveQuiz {
  const prizeValue = row.prize_value ?? 0

  return {
    id: row.id ?? '',
    title: row.title ?? 'Quiz Live MegaPromo',
    brandName: row.brand_name || 'MegaPromo',
    logoUrl: row.brand_logo_url || '/megapromologo.png',
    imageUrl: row.image_url || '',
    prizeLabel:
      row.prize_label ||
      (prizeValue > 0 ? formatMoney(prizeValue) : 'Récompense promotionnelle'),
    liveStartsAt: row.live_starts_at ?? '',
    endsAt: row.ends_at ?? '',
    liveStatus: row.live_status ?? 'scheduled',
    registeredCount: row.registered_count ?? 0,
  }
}

function planFallbackFeatures(plan: {
  dailyParticipationLimit: number
  bonusTickets: number
  badgeMultiplier: number
}) {
  const features = [
    plan.dailyParticipationLimit > 0
      ? `${plan.dailyParticipationLimit} participation${plan.dailyParticipationLimit > 1 ? 's' : ''} par jour`
      : 'Participations illimitées',
    plan.bonusTickets > 0
      ? `${plan.bonusTickets} avantage${plan.bonusTickets > 1 ? 's' : ''} bonus dans l’app`
      : 'Accès aux campagnes standards',
  ]

  if (plan.badgeMultiplier > 1) {
    features.push(`Multiplicateur badge x${plan.badgeMultiplier}`)
  }

  return features
}

async function fetchLandingPlayerPlans(): Promise<LandingPlayerPlan[]> {
  const [plansResponse, benefitsResponse] = await Promise.all([
    supabase
      .from('player_plans')
      .select(
        'id, key, name, description, price, duration_days, daily_participation_limit, bonus_tickets, badge_multiplier, is_active, order_index',
      )
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    supabase
      .from('player_plan_benefits')
      .select('plan_id, label, order_index')
      .order('order_index', { ascending: true }),
  ])

  if (plansResponse.error) throw plansResponse.error
  if (benefitsResponse.error) throw benefitsResponse.error

  const benefitsByPlan = new Map<string, string[]>()
  for (const benefit of benefitsResponse.data ?? []) {
    const planId = benefit.plan_id as string
    const currentBenefits = benefitsByPlan.get(planId) ?? []
    currentBenefits.push((benefit.label as string | null) ?? 'Avantage inclus')
    benefitsByPlan.set(planId, currentBenefits)
  }

  return (plansResponse.data ?? []).map((plan) => {
    const key = ((plan.key as string | null) ?? '').toLowerCase()
    const price = (plan.price as number | null) ?? 0
    const durationDays = (plan.duration_days as number | null) ?? 30
    const dailyParticipationLimit =
      (plan.daily_participation_limit as number | null) ?? 3
    const bonusTickets = (plan.bonus_tickets as number | null) ?? 0
    const badgeMultiplier = (plan.badge_multiplier as number | null) ?? 1
    const features = benefitsByPlan.get(plan.id as string)

    return {
      id: plan.id as string,
      key,
      title: (plan.name as string | null) ?? 'Forfait',
      description: (plan.description as string | null) ?? '',
      price: formatPlanPrice(price, durationDays),
      subtitle: durationDays > 0 && price > 0
        ? `Soit ${new Intl.NumberFormat('fr-FR').format(Math.ceil(price / durationDays))} FCFA par jour.`
        : 'Pour commencer sans engagement.',
      features: features?.length
        ? features.map((feature) => `✅ ${feature}`)
        : planFallbackFeatures({ dailyParticipationLimit, bonusTickets, badgeMultiplier }).map(
          (feature) => `✅ ${feature}`,
        ),
      featured: key === 'premium' || key === 'vip',
    }
  })
}

async function fetchLandingLiveQuiz(): Promise<LandingLiveQuiz | null> {
  const now = new Date()
  const rpcResponse = await supabase.rpc('get_public_landing_live_quiz')

  if (!rpcResponse.error && Array.isArray(rpcResponse.data)) {
    const firstQuiz = rpcResponse.data
      .map((row) => mapLandingLiveQuizRow(row as LandingLiveQuizRow))
      .find((quiz) => quiz.id && quiz.endsAt && Date.parse(quiz.endsAt) > now.getTime())

    return firstQuiz ?? null
  }

  const { data, error } = await supabase
    .from('contests')
    .select(
      'id, title, brand_name, brand_logo_url, image_url, prize_description, prize_value, live_starts_at, ends_at, live_status, registered_count',
    )
    .eq('is_live', true)
    .eq('status', 'active')
    .neq('live_status', 'ended')
    .gte('ends_at', now.toISOString())
    .order('live_starts_at', { ascending: true })
    .limit(8)

  if (error) throw error

  const liveQuizzes = (data ?? [])
    .map((contest) =>
      mapLandingLiveQuizRow({
        id: contest.id as string | null,
        title: contest.title as string | null,
        brand_name: contest.brand_name as string | null,
        brand_logo_url: contest.brand_logo_url as string | null,
        image_url: contest.image_url as string | null,
        prize_label: contest.prize_description as string | null,
        prize_value: contest.prize_value as number | null,
        live_starts_at: contest.live_starts_at as string | null,
        ends_at: contest.ends_at as string | null,
        live_status: contest.live_status as string | null,
        registered_count: contest.registered_count as number | null,
      }),
    )
    .filter((quiz) => quiz.id && quiz.endsAt)

  return liveQuizzes.find((quiz) => Date.parse(quiz.endsAt) > now.getTime()) ?? null
}

function normalizeWhatsappNumber(value: string) {
  return value.replace(/[^\d]/g, '')
}

function buildWhatsappUrl(settings: LandingContactSettings) {
  const phone = normalizeWhatsappNumber(settings.whatsappNumber)
  const text = encodeURIComponent(settings.whatsappMessage || defaultContactSettings.whatsappMessage)
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
}

async function fetchContactSettings(): Promise<LandingContactSettings> {
  const { data, error } = await supabase
    .from('landing_contact_settings')
    .select('whatsapp_number, whatsapp_message, email')
    .eq('key', 'main')
    .maybeSingle()

  if (error) throw error

  return {
    whatsappNumber:
      (data?.whatsapp_number as string | null) ??
      defaultContactSettings.whatsappNumber,
    whatsappMessage:
      (data?.whatsapp_message as string | null) ??
      defaultContactSettings.whatsappMessage,
    email: (data?.email as string | null) ?? defaultContactSettings.email,
  }
}

async function fetchLandingMaintenance(): Promise<LandingMaintenanceState> {
  const rpcResponse = await supabase.rpc('get_public_landing_maintenance')

  if (!rpcResponse.error && Array.isArray(rpcResponse.data)) {
    const row = rpcResponse.data[0] as
      | {
          is_enabled?: boolean | null
          title?: string | null
          message?: string | null
          badge?: string | null
        }
      | undefined

    return {
      isEnabled: row?.is_enabled ?? false,
      title: row?.title || defaultLandingMaintenance.title,
      message: row?.message || defaultLandingMaintenance.message,
      badge: row?.badge || defaultLandingMaintenance.badge,
    }
  }

  return defaultLandingMaintenance
}

async function fetchLandingStoreLinks(): Promise<LandingStoreLinks> {
  const { data, error } = await supabase.rpc('get_public_app_store_links')

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data

  return {
    androidStoreUrl: (row?.android_store_url as string | null) ?? '',
    iosStoreUrl: (row?.ios_store_url as string | null) ?? '',
  }
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState(0)
  const [heroTypedText, setHeroTypedText] = useState(heroTypingThemes[0].slice(0, 1))
  const [showBackTop, setShowBackTop] = useState(false)
  const [statsStarted, setStatsStarted] = useState(false)
  const [counts, setCounts] = useState({ players: 0, money: 0, contests: 0 })
  const [content, setContent] = useState<LandingPageContent>(defaultLandingContent)
  const [contactSettings, setContactSettings] =
    useState<LandingContactSettings>(defaultContactSettings)
  const [contactForm, setContactForm] = useState<LandingContactForm>({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState('')
  const [contactError, setContactError] = useState('')
  const [isContactSending, setIsContactSending] = useState(false)
  const [landingMaintenance, setLandingMaintenance] =
    useState<LandingMaintenanceState>(defaultLandingMaintenance)
  const [storeLinks, setStoreLinks] =
    useState<LandingStoreLinks>(defaultLandingStoreLinks)
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())
  const [featuredLiveQuiz, setFeaturedLiveQuiz] = useState<LandingLiveQuiz | null>(null)
  const [dismissedLiveQuizIds, setDismissedLiveQuizIds] = useState<Set<string>>(
    readDismissedLiveQuizIds,
  )
  const [playerPlans, setPlayerPlans] = useState<LandingPlayerPlan[]>(
    fallbackPlayerPlans(defaultLandingContent),
  )
  const statsRef = useRef<HTMLDivElement | null>(null)
  const showBackTopRef = useRef(false)
  const backTopFrameRef = useRef<number | null>(null)

  const loadLandingData = useCallback(async () => {
    const contentResult = await supabase
      .from('landing_page_content')
      .select('content')
      .eq('key', 'main')
      .maybeSingle()
    const plansResult = await fetchLandingPlayerPlans()
      .then((plans) => ({ plans, error: null }))
      .catch((error: unknown) => ({ plans: [] as LandingPlayerPlan[], error }))
    const contactResult = await fetchContactSettings()
      .then((settings) => ({ settings, error: null }))
      .catch((error: unknown) => ({ settings: defaultContactSettings, error }))
    const liveQuizResult = await fetchLandingLiveQuiz()
      .then((quiz) => ({ quiz, error: null }))
      .catch((error: unknown) => ({ quiz: null, error }))
    const maintenanceResult = await fetchLandingMaintenance()
      .then((maintenance) => ({ maintenance, error: null }))
      .catch((error: unknown) => ({
        maintenance: defaultLandingMaintenance,
        error,
      }))
    const storeLinksResult = await fetchLandingStoreLinks()
      .then((links) => ({ links, error: null }))
      .catch((error: unknown) => ({
        links: defaultLandingStoreLinks,
        error,
      }))

    const nextContent = contentResult.data?.content
      ? mergeLandingContent(contentResult.data.content as Partial<LandingPageContent>)
      : defaultLandingContent

    setContent(nextContent)
    setPlayerPlans(
      plansResult.plans.length > 0
        ? plansResult.plans
        : fallbackPlayerPlans(nextContent),
    )
    setContactSettings(contactResult.settings)
    setFeaturedLiveQuiz(liveQuizResult.quiz)
    setLandingMaintenance(maintenanceResult.maintenance)
    setStoreLinks(storeLinksResult.links)

    if (contentResult.error) {
      console.warn('[MegaPromo][landing] content unavailable', contentResult.error)
    }
    if (plansResult.error) {
      console.warn('[MegaPromo][landing] player plans unavailable', plansResult.error)
    }
    if (contactResult.error) {
      console.warn('[MegaPromo][landing] contact settings unavailable', contactResult.error)
    }
    if (liveQuizResult.error) {
      console.warn('[MegaPromo][landing] live quiz unavailable', liveQuizResult.error)
    }
    if (maintenanceResult.error) {
      console.warn('[MegaPromo][landing] maintenance unavailable', maintenanceResult.error)
    }
    if (storeLinksResult.error) {
      console.warn('[MegaPromo][landing] store links unavailable', storeLinksResult.error)
    }
  }, [])

  useEffect(() => {
    let phraseIndex = 0
    let charIndex = 1
    let isDeleting = false
    let timeoutId: number | undefined

    const tick = () => {
      const phrase = heroTypingThemes[phraseIndex]

      if (isDeleting) {
        charIndex -= 1
      } else {
        charIndex += 1
      }

      setHeroTypedText(phrase.slice(0, Math.max(1, charIndex)))

      if (!isDeleting && charIndex >= phrase.length) {
        isDeleting = true
        timeoutId = window.setTimeout(tick, 1100)
        return
      }

      if (isDeleting && charIndex <= 1) {
        isDeleting = false
        phraseIndex = (phraseIndex + 1) % heroTypingThemes.length
      }

      timeoutId = window.setTimeout(tick, isDeleting ? 42 : 78)
    }

    timeoutId = window.setTimeout(tick, 420)

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const updateBackTop = () => {
      backTopFrameRef.current = null
      const nextVisible = window.scrollY > window.innerHeight * 0.7
      if (showBackTopRef.current === nextVisible) return
      showBackTopRef.current = nextVisible
      setShowBackTop(nextVisible)
    }

    const handleScroll = () => {
      if (backTopFrameRef.current !== null) return
      backTopFrameRef.current = window.requestAnimationFrame(updateBackTop)
    }

    updateBackTop()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (backTopFrameRef.current !== null) {
        window.cancelAnimationFrame(backTopFrameRef.current)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadLandingData()
    }, 0)

    return () => window.clearTimeout(initialLoad)
  }, [loadLandingData])

  useEffect(() => {
    const timeTicker = window.setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 30000)

    return () => window.clearInterval(timeTicker)
  }, [])

  useEffect(() => {
    let refreshTimeout = 0
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void loadLandingData()
      }, 250)
    }

    const channel = supabase.channel('public-landing-realtime')
    ;[
      'landing_page_content',
      'landing_contact_settings',
      'player_plans',
      'player_plan_benefits',
      'contests',
      'app_feature_flags',
      'app_update_config',
    ].forEach((table) => {
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
  }, [loadLandingData])

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.15 },
    )

    const revealItems = document.querySelectorAll('.lp-reveal')
    revealItems.forEach((item) => revealObserver.observe(item))

    return () => revealObserver.disconnect()
  }, [content, playerPlans])

  useEffect(() => {
    const node = statsRef.current
    if (!node || statsStarted) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || statsStarted) return
        setStatsStarted(true)
        const startedAt = performance.now()
        const duration = 1400
        const tick = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCounts({
            players: Math.round(content.stats.players * eased),
            money: Math.round(content.stats.money * eased),
            contests: Math.round(content.stats.contests * eased),
          })
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [content.stats.contests, content.stats.money, content.stats.players, statsStarted])

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setContactStatus('')
    setContactError('')

    const name = contactForm.name.trim()
    const phone = contactForm.phone.trim()
    const email = contactForm.email.trim()
    const subject = contactForm.subject.trim()
    const message = contactForm.message.trim()

    if (!name || !message) {
      setContactError('Ton nom et ton message sont requis.')
      return
    }

    setIsContactSending(true)
    try {
      const { error } = await supabase.from('landing_contact_messages').insert({
        name,
        phone: phone || null,
        email: email || null,
        subject: subject || 'Contact landing',
        message,
        source: 'landing',
        status: 'new',
      })

      if (error) throw error

      setContactForm({ name: '', phone: '', email: '', subject: '', message: '' })
      setContactStatus('Message envoyé. L’équipe MegaPromo te répondra rapidement.')
    } catch (error) {
      console.warn('[MegaPromo][landing] contact submit failed', error)
      setContactError('Impossible d’envoyer le message. Utilise WhatsApp pour nous contacter.')
    } finally {
      setIsContactSending(false)
    }
  }

  function dismissFeaturedLiveQuiz() {
    if (!featuredLiveQuiz) return
    setDismissedLiveQuizIds((current) => {
      const next = new Set(current)
      next.add(featuredLiveQuiz.id)
      saveDismissedLiveQuizIds(next)
      return next
    })
  }

  const visibleFeaturedLiveQuiz =
    featuredLiveQuiz &&
    isLandingBlockVisible(content, 'floatingLiveQuiz') &&
    !dismissedLiveQuizIds.has(featuredLiveQuiz.id)
      ? featuredLiveQuiz
      : null
  const visibleLiveQuizStatus = visibleFeaturedLiveQuiz
    ? getLiveQuizStatusLabel(visibleFeaturedLiveQuiz, currentTimeMs)
    : null
  const androidStoreHref = storeLinks.androidStoreUrl.trim() || '#contact'
  const iosStoreHref = storeLinks.iosStoreUrl.trim() || '#contact'
  const androidStoreIsReady = Boolean(storeLinks.androidStoreUrl.trim())
  const iosStoreIsReady = Boolean(storeLinks.iosStoreUrl.trim())
  const androidStoreTarget = isExternalUrl(androidStoreHref) ? '_blank' : undefined
  const iosStoreTarget = isExternalUrl(iosStoreHref) ? '_blank' : undefined

  if (landingMaintenance.isEnabled) {
    return (
      <main className="lp-page lp-maintenance-page">
        <style>{landingStyle}</style>
        <section className="lp-maintenance-screen" aria-label="Site en maintenance">
          <div className="lp-maintenance-card">
            <div className="lp-maintenance-lottie" aria-hidden="true">
              <div className="lp-maintenance-browser">
                <div className="lp-maintenance-browser-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="lp-maintenance-code-lines">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="lp-maintenance-tool gear" />
              <div className="lp-maintenance-tool wrench" />
              <div className="lp-maintenance-tool brush" />
            </div>
            <span className="lp-maintenance-badge">{landingMaintenance.badge}</span>
            <h1>{landingMaintenance.title}</h1>
            <p>{landingMaintenance.message}</p>
            <div className="lp-maintenance-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="lp-maintenance-progress" aria-hidden="true">
              <span />
            </div>
            <div className="lp-maintenance-status">
              <span>Optimisation en cours</span>
              <span>Retour imminent</span>
            </div>
            <div className="lp-maintenance-actions">
              <a
                className="lp-button primary"
                href={buildWhatsappUrl(contactSettings)}
                rel="noreferrer"
                target="_blank"
              >
                Contacter MegaPromo
              </a>
            </div>
            <small>Merci de revenir dans quelques instants.</small>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="lp-page">
      <style>{landingStyle}</style>
      <nav className="lp-nav">
        <div className="lp-wrap">
          <div className="lp-nav-inner">
            <a className="lp-logo lp-header-logo" href="#accueil" onClick={() => setMenuOpen(false)} aria-label="MegaPromo">
              <img alt="" src="/megapromologo.png" />
            </a>
            {isLandingBlockVisible(content, 'navItems') ? (
              <div className="lp-menu">
                {content.navItems.map(([label, href]) => (
                  <a href={href} key={href}>{label}</a>
                ))}
              </div>
            ) : null}
            <div className="lp-actions">
              <a className="lp-button primary" href="#telecharger">Télécharger l’app</a>
              <button
                aria-label="Menu"
                className="lp-burger"
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
          {isLandingBlockVisible(content, 'navItems') ? (
            <div className={`lp-mobile-menu ${menuOpen ? 'open' : ''}`}>
              {content.navItems.map(([label, href]) => (
                <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      {isLandingBlockVisible(content, 'hero') ? (
      <section className="lp-hero" id="accueil">
        <div className="lp-stars" aria-hidden="true">
          {Array.from({ length: 34 }).map((_, index) => (
            <i
              key={index}
              style={{
                animationDelay: `${(index % 8) * 0.32}s`,
                left: `${(index * 23) % 100}%`,
                top: `${8 + ((index * 17) % 82)}%`,
              }}
            />
          ))}
        </div>
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-reveal visible">
            <span className="lp-pill">{content.hero.badge}</span>
            <h1 className="lp-typing-title">
              <span>Découvre. </span>
              <span className="lp-gradient-text">Réponds.</span>
              <br />
              <span className="lp-typewriter-line">
                <span className="lp-typewriter-text">{heroTypedText}</span>
                <i aria-hidden="true" />
              </span>
            </h1>
            <p className="lp-lead">{content.hero.subtitle}</p>
            <div className="lp-hero-proof" aria-label="Garanties MegaPromo">
              <span>Quiz gratuits</span>
              <span>Sans mise</span>
              <span>Sans pari</span>
            </div>
            <div className="lp-hero-actions">
              <a className="lp-button primary" href="#telecharger">{content.hero.primaryCta}</a>
              <a className="lp-button outline" href="#concours">{content.hero.secondaryCta}</a>
            </div>
            {isLandingBlockVisible(content, 'stats') ? (
            <div className="lp-stats" ref={statsRef}>
              <div className="lp-stat">
                <strong>{new Intl.NumberFormat('fr-FR').format(counts.players)}+</strong>
                <span>Utilisateurs actifs</span>
              </div>
              <div className="lp-stat">
                <strong>
                  {counts.money >= 1000000
                    ? `${Math.round(counts.money / 1000000)}M+`
                    : `${new Intl.NumberFormat('fr-FR').format(counts.money)}+`}
                </strong>
                <span>Valeur promo</span>
              </div>
              <div className="lp-stat">
                <strong>{new Intl.NumberFormat('fr-FR').format(counts.contests)}+</strong>
                <span>Campagnes lancées</span>
              </div>
            </div>
            ) : null}
          </div>
          <div className="lp-phone-wrap lp-reveal">
            <img
              alt="Aperçu de l'application MegaPromo sur iPhone"
              className="lp-phone-mockup"
              decoding="async"
              src="/landing-iphone-mockup-transparent.png"
            />
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'steps') ? (
      <section className="lp-section lp-process-section" id="comment-ca-marche">
        <div className="lp-wrap">
          <div className="lp-process-layout">
            <div className="lp-process-copy lp-reveal">
              <span className="lp-pill">Parcours utilisateur</span>
              <h2>Simple. Rapide. Gratuit.</h2>
              <p>Trois étapes simples pour découvrir les campagnes partenaires.</p>
              <div className="lp-process-proof">
                <span>Sans mise</span>
                <span>Sans pari</span>
                <span>Sans achat obligatoire</span>
              </div>
            </div>
            <div className="lp-steps-timeline">
              {content.steps.map(([icon, title, text], index) => (
                <article
                  className="lp-step-card lp-reveal"
                  key={title}
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <span className="lp-step-number">{index + 1}</span>
                  <div className="lp-step-body">
                    <span className="lp-step-icon">{icon}</span>
                    <span className="lp-step-kicker">Étape {index + 1}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'games') ? (
      <section className="lp-section lp-showcase-section" id="participer">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>3 façons de participer</h2>
            <p>Découvre des marques, réponds aux quiz et profite d’avantages promotionnels.</p>
          </div>
          <div className="lp-participation-grid">
            {content.games.map((game, index) => (
              <article
                className={`lp-participation-card lp-participation-card-${index + 1} lp-game-card ${game.cls} lp-reveal`}
                key={game.title}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <span className="lp-feature-icon">{game.icon}</span>
                <h3>{game.title}</h3>
                <p>{game.text}</p>
                <div className="lp-tags">
                  {game.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <a className="lp-feature-link" href="#concours">{game.cta}</a>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'liveContests') ? (
      <section className="lp-section lp-campaigns-section" id="concours">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <span className="lp-pill">Campagnes actives</span>
            <h2>Campagnes en ce moment</h2>
            <p>Participe gratuitement avant la fin des campagnes.</p>
          </div>
          <div className="lp-campaigns-shell">
            <div className="lp-campaign-grid">
              {content.liveContests.map(([badge, title, prize, participants, progress, timer, cta], index) => (
                <article
                  className={`lp-campaign-card lp-reveal ${index === 0 ? 'featured' : ''}`}
                  key={title}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="lp-campaign-top">
                    <span>{badge}</span>
                    <strong>{timer}</strong>
                  </div>
                  <div className="lp-campaign-icon" aria-hidden="true">
                    {index === 0 ? '📣' : index === 1 ? '🧠' : '🎁'}
                  </div>
                  <h3>{title}</h3>
                  <span className="lp-prize">{prize}</span>
                  <div className="lp-live-meta">
                    <span>{participants}</span>
                    <span>{progress}% complété</span>
                  </div>
                  <div className="lp-progress"><span style={{ width: `${progress}%` }} /></div>
                  <a className="lp-button primary" href="#telecharger">{cta}</a>
                </article>
              ))}
            </div>
            <div className="lp-campaign-proof">
              <span>Participation gratuite</span>
              <span>Marques partenaires</span>
              <span>Récompenses promotionnelles</span>
            </div>
          </div>
          <div className="lp-centered-action">
            <a className="lp-button outline" href="#telecharger">Voir toutes les campagnes →</a>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'playerPlans') ? (
      <section className="lp-section lp-plans-section" id="tarifs">
        <div className="lp-wrap">
          <div className="lp-plans-head lp-reveal">
            <span className="lp-pill">Offres utilisateur</span>
            <h2>Choisis ton forfait</h2>
            <p>Commence gratuitement. Active plus de confort uniquement si tu veux participer davantage aux campagnes.</p>
          </div>
          <div className="lp-plans-shell">
            <div className={`lp-price-grid ${playerPlans.length >= 3 ? 'three' : 'two'}`}>
              {playerPlans.map((plan) => (
                <article
                  className={`lp-price-card lp-reveal ${plan.featured ? 'featured' : ''}`}
                  key={plan.id}
                >
                  <div className="lp-price-topline">
                    <span>{plan.key === 'free' ? 'Découverte' : 'Flexible'}</span>
                    {plan.featured ? <strong>Populaire</strong> : null}
                  </div>
                  <div className="lp-price-card-head">
                    <h3>{plan.title}</h3>
                    {plan.subtitle || plan.description ? <p>{plan.subtitle || plan.description}</p> : null}
                  </div>
                  <div className="lp-price-box">
                    <span className="lp-price">{plan.price}</span>
                    <small>{plan.key === 'free' ? 'Aucune carte bancaire requise' : 'Activation depuis l’application'}</small>
                  </div>
                  <ul className="lp-feature-list">
                    {plan.features.map((feature) => {
                      const isDisabled = feature.trim().startsWith('❌')
                      const label = feature.replace(/^[✅❌]\s*/, '')
                      return (
                        <li className={isDisabled ? 'disabled' : ''} key={feature}>
                          <span aria-hidden="true">{isDisabled ? '−' : '✓'}</span>
                          {label}
                        </li>
                      )
                    })}
                  </ul>
                  <a className={`lp-button ${plan.featured ? 'primary' : 'outline'}`} href="#telecharger">
                    {plan.key === 'free' ? 'Commencer' : `Choisir ${plan.title}`}
                  </a>
                </article>
              ))}
            </div>
            <div className="lp-plans-note">
              <span>Sans mise</span>
              <span>Sans pari</span>
              <span>Campagnes gratuites</span>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'partners') ? (
      <section className="lp-section lp-partners" id="partenaires">
        <div className="lp-wrap">
          <div className="lp-partner-shell">
            <div className="lp-partner-intro lp-reveal">
              <span className="lp-pill">Espace partenaires</span>
              <h2>{content.partners.title}</h2>
              <p>{content.partners.subtitle}</p>
              <a className="lp-button primary" href="/auth/partner">Devenir partenaire</a>
            </div>
            <div className="lp-partner-benefits">
              {content.partners.benefits.map(([icon, title, text], index) => (
                <article
                  className="lp-partner-benefit lp-reveal"
                  key={title}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <span>{icon}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="lp-partner-plans" id="formules-partenaires">
              {content.partners.plans.map((plan, index) => (
                <article
                  className={`lp-partner-plan lp-reveal ${index === 1 ? 'featured' : ''}`}
                  key={plan.name}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="lp-partner-plan-top">
                    <span>{index === 0 ? 'Lancement' : index === 1 ? 'Croissance' : 'Marque'}</span>
                    {index === 1 ? <strong>Conseillé</strong> : null}
                  </div>
                  <h3>{plan.name}</h3>
                  <div className="lp-partner-price-box">
                    <small>À partir de</small>
                    <span className="lp-price">{plan.price}</span>
                  </div>
                  <ul className="lp-feature-list lp-partner-feature-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <span aria-hidden="true">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a className={`lp-button ${index === 1 ? 'primary' : 'outline'}`} href="/auth/partner">
                    Demander une démo
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'testimonials') ? (
      <section className="lp-section lp-testimonials-section" id="temoignages">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <span className="lp-pill">Expérience utilisateur</span>
            <h2>Ils ont découvert MegaPromo</h2>
            <p>Des retours simples autour de la découverte de marques et des campagnes gratuites.</p>
          </div>
          <div className="lp-testimonial-grid">
            {content.testimonials.map(([initial, name, text], index) => (
              <article
                className={`lp-testimonial-card lp-reveal ${index === 0 ? 'featured' : ''}`}
                key={name}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <div className="lp-testimonial-head">
                  <span className="avatar">{initial}</span>
                  <div>
                    <h3>{name}</h3>
                    <div className="lp-stars-text">★★★★★</div>
                  </div>
                </div>
                <p>“{text}”</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'faqs') ? (
      <section className="lp-section lp-faq-section">
        <div className="lp-wrap">
          <div className="lp-faq-layout">
            <div className="lp-faq-copy lp-reveal">
              <span className="lp-pill">Besoin d’éclaircir ?</span>
              <h2>Questions fréquentes</h2>
              <p>Les réponses essentielles pour comprendre MegaPromo en quelques secondes.</p>
              <a className="lp-button outline" href="#contact">Contacter l’équipe</a>
            </div>
            <div className="lp-faq lp-reveal">
              {content.faqs.map(([question, answer], index) => (
                <div className={`lp-faq-item ${activeFaq === index ? 'open' : ''}`} key={question}>
                  <button onClick={() => setActiveFaq(activeFaq === index ? -1 : index)} type="button">
                    <span>{question}</span>
                    <span>{activeFaq === index ? '−' : '+'}</span>
                  </button>
                  <div className="lp-faq-answer">{answer}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'contact') ? (
      <section className="lp-section lp-contact-section" id="contact">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <span className="lp-pill">Support & partenariat</span>
            <h2>Besoin d’aide ?</h2>
            <p>Notre équipe accompagne les utilisateurs et les marques avec des réponses simples, rapides et humaines.</p>
          </div>
          <div className="lp-contact-grid">
            <div className="lp-contact-copy lp-reveal">
              <h2>{content.contact.title}</h2>
              <p>{content.contact.subtitle}</p>
              <div className="lp-support-grid" aria-label="Canaux de contact">
                <span><strong>24h</strong><small>Retour moyen</small></span>
                <span><strong>CI</strong><small>Support local</small></span>
                <span><strong>2</strong><small>Canaux directs</small></span>
              </div>
              <a
                className="lp-whatsapp-card"
                href={buildWhatsappUrl(contactSettings)}
                rel="noreferrer"
                target="_blank"
              >
                <span className="lp-whatsapp-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M12.04 3.5a8.45 8.45 0 0 0-7.22 12.86L3.75 20.5l4.24-1.04A8.45 8.45 0 1 0 12.04 3.5Zm0 1.52a6.93 6.93 0 0 1 5.9 10.57 6.92 6.92 0 0 1-8.6 2.49l-.28-.13-2.53.62.64-2.46-.15-.29a6.93 6.93 0 0 1 5.02-10.8Zm-2.3 3.67c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.68 2.68 4.15 3.65 2.06.81 2.48.65 2.93.61.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.29-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.24-.02-.38.1-.5.11-.11.25-.28.37-.43.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.48Z" />
                  </svg>
                </span>
                <span>
                  <strong>{content.contact.whatsappLabel}</strong>
                  <small>{content.contact.whatsappHint}</small>
                </span>
              </a>
              <div className="lp-contact-meta">
                <span>WhatsApp : +{normalizeWhatsappNumber(contactSettings.whatsappNumber)}</span>
                <span>Email : {contactSettings.email}</span>
              </div>
            </div>

            <form className="lp-contact-form lp-reveal" onSubmit={handleContactSubmit}>
              <div className="lp-form-row">
                <label>
                  <span>Nom</span>
                  <input
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ton nom"
                    value={contactForm.name}
                  />
                </label>
                <label>
                  <span>Téléphone</span>
                  <input
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+225..."
                    value={contactForm.phone}
                  />
                </label>
              </div>
              <label>
                <span>Email</span>
                <input
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="email@exemple.com"
                  type="email"
                  value={contactForm.email}
                />
              </label>
              <label>
                <span>Sujet</span>
                <input
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Question, campagne, partenariat..."
                  value={contactForm.subject}
                />
              </label>
              <label>
                <span>Message</span>
                <textarea
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Écris ton message ici..."
                  rows={5}
                  value={contactForm.message}
                />
              </label>
              {contactStatus ? <p className="lp-form-success">{contactStatus}</p> : null}
              {contactError ? <p className="lp-form-error">{contactError}</p> : null}
              <button className="lp-button primary" disabled={isContactSending} type="submit">
                {isContactSending ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'finalCta') ? (
      <section className="lp-section lp-download-section" id="telecharger">
        <div className="lp-wrap">
          <div className="lp-final lp-reveal">
            <div className="lp-final-copy">
              <span className="lp-pill">Application mobile</span>
              <h2>{content.finalCta.title}</h2>
              <p>{content.finalCta.subtitle}</p>
              <div className="lp-final-actions">
                <a
                  className="lp-store-button android"
                  href={androidStoreHref}
                  rel={androidStoreTarget ? 'noopener noreferrer' : undefined}
                  target={androidStoreTarget}
                >
                  <span className="lp-store-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img">
                      <path d="M5.2 3.1c-.42.22-.7.68-.7 1.31v15.18c0 .62.28 1.08.7 1.31l8.78-8.9L5.2 3.1Z" />
                      <path d="m15.18 10.78 2.3-2.33L7.1 2.58c-.36-.2-.7-.25-.99-.13l9.07 8.33Z" />
                      <path d="m15.18 13.22-9.07 8.33c.29.12.63.07.99-.13l10.38-5.87-2.3-2.33Z" />
                      <path d="m18.5 9.03-2.42 2.46 2.42 2.48 1.38-.78c1.02-.58 1.02-1.8 0-2.38l-1.38-.78Z" />
                    </svg>
                  </span>
                  <span>
                    <small>{androidStoreIsReady ? 'Télécharger sur' : 'Bientôt sur'}</small>
                    <strong>Google Play</strong>
                  </span>
                </a>
                <a
                  className="lp-store-button ios"
                  href={iosStoreHref}
                  rel={iosStoreTarget ? 'noopener noreferrer' : undefined}
                  target={iosStoreTarget}
                >
                  <span className="lp-store-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img">
                      <path d="M16.71 12.72c-.02-2.06 1.7-3.05 1.78-3.1-1-.14-1.96-.69-2.61-1.49-.56-.68-1.25-1.13-2.06-1.13-.88 0-1.65.52-2.13.52-.5 0-1.3-.5-2.14-.48-1.1.02-2.12.64-2.69 1.62-1.15 2-.29 4.95.83 6.57.55.8 1.2 1.69 2.06 1.66.82-.03 1.13-.53 2.12-.53.99 0 1.27.53 2.14.51.88-.02 1.44-.81 1.98-1.61.62-.91.88-1.8.89-1.85-.02-.01-1.74-.67-1.77-2.19Z" />
                      <path d="M14.17 5.75c.45-.55.76-1.32.68-2.08-.65.03-1.43.43-1.9.98-.42.48-.79 1.27-.69 2.01.72.06 1.46-.36 1.91-.91Z" />
                    </svg>
                  </span>
                  <span>
                    <small>{iosStoreIsReady ? 'Télécharger sur' : 'Bientôt sur'}</small>
                    <strong>App Store</strong>
                  </span>
                </a>
              </div>
              <div className="lp-final-proof">
                <span>Gratuit</span>
                <span>Sans mise</span>
                <span>iOS & Android</span>
              </div>
            </div>
            <div className="lp-device-showcase" aria-hidden="true">
              <div className="lp-device-card ios">
                <span className="lp-device-notch" />
                <strong>iOS</strong>
                <small>App Store</small>
                <div className="lp-device-bars"><i /><i /><i /></div>
              </div>
              <div className="lp-device-card android">
                <span className="lp-device-camera" />
                <strong>Android</strong>
                <small>Google Play</small>
                <div className="lp-device-bars"><i /><i /><i /></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {isLandingBlockVisible(content, 'footer') ? (
      <>
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a className="lp-logo" href="#accueil">
                <img alt="" src="/megapromologo.png" />
              </a>
              <p>{content.footer.description}</p>
              <div className="lp-footer-badges">
                <span>Plateforme gratuite</span>
                <span>Sans mise</span>
                <span>Côte d’Ivoire</span>
              </div>
              <div className="lp-socials" aria-label="Réseaux et contact">
                <a href="#contact" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M12.04 3.5a8.45 8.45 0 0 0-7.22 12.86L3.75 20.5l4.24-1.04A8.45 8.45 0 1 0 12.04 3.5Zm0 1.52a6.93 6.93 0 0 1 5.9 10.57 6.92 6.92 0 0 1-8.6 2.49l-.28-.13-2.53.62.64-2.46-.15-.29a6.93 6.93 0 0 1 5.02-10.8Zm-2.3 3.67c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.68 2.68 4.15 3.65 2.06.81 2.48.65 2.93.61.45-.04 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.29-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.24-.02-.38.1-.5.11-.11.25-.28.37-.43.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41h-.48Z" />
                  </svg>
                </a>
                <a href="#contact" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M8.4 3.5h7.2a4.9 4.9 0 0 1 4.9 4.9v7.2a4.9 4.9 0 0 1-4.9 4.9H8.4a4.9 4.9 0 0 1-4.9-4.9V8.4a4.9 4.9 0 0 1 4.9-4.9Zm0 1.7a3.2 3.2 0 0 0-3.2 3.2v7.2a3.2 3.2 0 0 0 3.2 3.2h7.2a3.2 3.2 0 0 0 3.2-3.2V8.4a3.2 3.2 0 0 0-3.2-3.2H8.4Zm3.6 3.1a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Zm0 1.7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm4.05-2.52a.98.98 0 1 1 0 1.96.98.98 0 0 1 0-1.96Z" />
                  </svg>
                </a>
                <a href="#contact" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M13.5 20.5v-7.1h2.38l.36-2.77H13.5V8.86c0-.8.22-1.35 1.37-1.35h1.46V5.03c-.25-.03-1.12-.11-2.13-.11-2.1 0-3.55 1.28-3.55 3.64v2.07H8.27v2.77h2.38v7.1h2.85Z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="lp-footer-column">
              <h4>Produit</h4>
              <a href="#comment-ca-marche">Comment ça marche</a>
              <a href="#concours">Les campagnes</a>
              <a href="#tarifs">Premium</a>
              <a href="#telecharger">Application mobile</a>
            </div>
            <div className="lp-footer-column">
              <h4>Partenaires</h4>
              <a href="#partenaires">Devenir partenaire</a>
              <a href="#formules-partenaires">Nos formules</a>
              <a href="#temoignages">Témoignages marques</a>
              <a href="#contact">Contact commercial</a>
            </div>
            <div className="lp-footer-column">
              <h4>Légal</h4>
              <a href="/legal/terms">CGU</a>
              <a href="/legal/privacy">Politique de confidentialité</a>
              <a href="/legal/account-deletion">Suppression de compte</a>
              <a href="/legal/terms">Mentions légales</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <div className="lp-bottom">
            <span>{content.footer.bottom}</span>
            <span>Découverte de marques · Quiz gratuits · Récompenses promotionnelles</span>
          </div>
        </div>
      </footer>

      <section className="lp-logo-parallax" aria-label="MegaPromo">
        <div className="lp-logo-parallax-inner">
          <img alt="" src="/megapromologo.png" />
          <span>Mega Promo</span>
        </div>
      </section>
      </>
      ) : null}

      <a
        className={`lp-back-top ${showBackTop ? 'visible' : ''}`}
        href="#accueil"
        aria-label="Retour en haut"
      >
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M12 5.25 5.25 12l1.42 1.42L11 9.08v9.67h2V9.08l4.33 4.34L18.75 12 12 5.25Z" />
        </svg>
      </a>

      {visibleFeaturedLiveQuiz && visibleLiveQuizStatus ? (
        <aside className="lp-live-floating-card" aria-label="Quiz Live disponible">
          <button
            aria-label="Masquer ce Quiz Live"
            className="lp-live-floating-close"
            onClick={dismissFeaturedLiveQuiz}
            type="button"
          >
            ×
          </button>
          <div className="lp-live-floating-logo">
            <img
              alt=""
              src={visibleFeaturedLiveQuiz.logoUrl}
              onError={(event) => {
                event.currentTarget.src = '/megapromologo.png'
              }}
            />
          </div>
          <span className="lp-live-floating-badge">{visibleLiveQuizStatus.badge}</span>
          <strong className="lp-live-floating-brand">
            {visibleFeaturedLiveQuiz.brandName}
          </strong>
          <h3>{visibleFeaturedLiveQuiz.title}</h3>
          <p>{visibleLiveQuizStatus.message}</p>
          <div className="lp-live-floating-meta">
            <span>
              <small>Récompense</small>
              {visibleFeaturedLiveQuiz.prizeLabel}
            </span>
            <span>
              <small>Participants</small>
              {new Intl.NumberFormat('fr-FR').format(visibleFeaturedLiveQuiz.registeredCount)} inscrit(s)
            </span>
          </div>
          <a className="lp-live-floating-action" href="#telecharger">
            Participer depuis l’app
          </a>
        </aside>
      ) : null}
    </main>
  )
}
