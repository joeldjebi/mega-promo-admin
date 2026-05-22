import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  defaultLandingContent,
  fallbackPlayerPlans,
  type LandingPageContent,
  type LandingPlayerPlan,
  mergeLandingContent,
} from './landingContent'
import { landingStyle } from './landingStyles'

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
      ? `${plan.bonusTickets} ticket${plan.bonusTickets > 1 ? 's' : ''} bonus aux tirages`
      : 'Accès aux concours standards',
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
        : 'Pour commencer à jouer sans engagement.',
      features: features?.length
        ? features.map((feature) => `✅ ${feature}`)
        : planFallbackFeatures({ dailyParticipationLimit, bonusTickets, badgeMultiplier }).map(
          (feature) => `✅ ${feature}`,
        ),
      featured: key === 'premium' || key === 'vip',
    }
  })
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFaq, setActiveFaq] = useState(0)
  const [statsStarted, setStatsStarted] = useState(false)
  const [counts, setCounts] = useState({ players: 0, money: 0, contests: 0 })
  const [content, setContent] = useState<LandingPageContent>(defaultLandingContent)
  const [playerPlans, setPlayerPlans] = useState<LandingPlayerPlan[]>(
    fallbackPlayerPlans(defaultLandingContent),
  )
  const statsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true
    void (async () => {
      const contentResult = await supabase
        .from('landing_page_content')
        .select('content')
        .eq('key', 'main')
        .maybeSingle()
      const plansResult = await fetchLandingPlayerPlans()
        .then((plans) => ({ plans, error: null }))
        .catch((error: unknown) => ({ plans: [] as LandingPlayerPlan[], error }))

      if (!isMounted) return

      const nextContent = contentResult.data?.content
        ? mergeLandingContent(contentResult.data.content as Partial<LandingPageContent>)
        : defaultLandingContent

      setContent(nextContent)
      setPlayerPlans(
        plansResult.plans.length > 0
          ? plansResult.plans
          : fallbackPlayerPlans(nextContent),
      )

      if (contentResult.error) {
        console.warn('[MegaPromo][landing] content unavailable', contentResult.error)
      }
      if (plansResult.error) {
        console.warn('[MegaPromo][landing] player plans unavailable', plansResult.error)
      }
    })()

    const handleScroll = () => setScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => {
      isMounted = false
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

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

  return (
    <main className="lp-page">
      <style>{landingStyle}</style>
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-wrap">
          <div className="lp-nav-inner">
            <a className="lp-logo" href="#accueil" onClick={() => setMenuOpen(false)}>
              <img alt="" src="/megapromologo.png" />
              <strong>MegaPromo</strong>
            </a>
            <div className="lp-menu">
              {content.navItems.map(([label, href]) => (
                <a href={href} key={href}>{label}</a>
              ))}
            </div>
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
          <div className={`lp-mobile-menu ${menuOpen ? 'open' : ''}`}>
            {content.navItems.map(([label, href]) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </div>
        </div>
      </nav>

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
            <h1>
              {content.hero.titleStart}{' '}
              <span className="lp-gradient-text">{content.hero.titleHighlight}</span>
              <br />
              {content.hero.titleEnd}
            </h1>
            <p className="lp-lead">{content.hero.subtitle}</p>
            <div className="lp-hero-actions">
              <a className="lp-button primary" href="#telecharger">{content.hero.primaryCta}</a>
              <a className="lp-button outline" href="#concours">{content.hero.secondaryCta}</a>
            </div>
            <div className="lp-stats" ref={statsRef}>
              <div className="lp-stat">
                <strong>{new Intl.NumberFormat('fr-FR').format(counts.players)}+</strong>
                <span>Joueurs actifs</span>
              </div>
              <div className="lp-stat">
                <strong>
                  {counts.money >= 1000000
                    ? `${Math.round(counts.money / 1000000)}M+ FCFA`
                    : `${new Intl.NumberFormat('fr-FR').format(counts.money)} FCFA`}
                </strong>
                <span>Distribués</span>
              </div>
              <div className="lp-stat">
                <strong>{new Intl.NumberFormat('fr-FR').format(counts.contests)}+</strong>
                <span>Concours lancés</span>
              </div>
            </div>
          </div>
          <div className="lp-phone-wrap lp-reveal">
            <div className="lp-phone">
              <span className="lp-phone-notch" />
              <div className="lp-phone-screen">
                <div className="lp-app-top">
                  <strong>MegaPromo</strong>
                  <span>🇨🇮</span>
                </div>
                <div className="lp-app-balance">
                  <small>Gains disponibles</small>
                  <strong>125 000 FCFA</strong>
                </div>
                <div className="lp-contest-card featured">
                  <small>EN VEDETTE</small>
                  <h3>Grand Tirage Data</h3>
                  <p>50 000 FCFA + 20 Go</p>
                  <div className="lp-progress"><span style={{ width: '64%' }} /></div>
                </div>
                <div className="lp-contest-card">
                  <small>QUIZ</small>
                  <h3>Foot Africain</h3>
                  <p>Score à battre : 840 pts</p>
                </div>
                <div className="lp-contest-card">
                  <small>PRONOSTIC</small>
                  <h3>AFCON 2025</h3>
                  <p>891 joueurs déjà inscrits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="comment-ca-marche">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>Simple. Rapide. Gratuit.</h2>
            <p>Trois petites étapes et tu es déjà dans le jeu.</p>
          </div>
          <div className="lp-grid three">
            {content.steps.map(([icon, title, text], index) => (
              <article className="lp-card lp-reveal" key={title}>
                <span className="lp-pill">Étape {index + 1}</span>
                <span className="icon">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>3 façons de gagner</h2>
            <p>Choisis ton style : connaissance, chance ou flair sportif.</p>
          </div>
          <div className="lp-grid three">
            {content.games.map((game) => (
              <article className={`lp-card lp-game-card ${game.cls} lp-reveal`} key={game.title}>
                <span className="icon">{game.icon}</span>
                <h3>{game.title}</h3>
                <p>{game.text}</p>
                <div className="lp-tags">
                  {game.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <a href="#concours">{game.cta}</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="concours">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>Concours en ce moment</h2>
            <p>Rejoins-les avant qu’ils se terminent.</p>
          </div>
          <div className="lp-grid three">
            {content.liveContests.map(([badge, title, prize, participants, progress, timer, cta]) => (
              <article className="lp-card lp-live-card lp-reveal" key={title}>
                <span className="lp-badge">{badge}</span>
                <h3>{title}</h3>
                <span className="lp-prize">{prize}</span>
                <div className="lp-live-meta">
                  <span>{participants}</span>
                  <span>{timer}</span>
                </div>
                <div className="lp-progress"><span style={{ width: `${progress}%` }} /></div>
                <a className="lp-button primary" href="#telecharger" style={{ marginTop: 12 }}>{cta}</a>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <a className="lp-button outline" href="#telecharger">Voir tous les concours →</a>
          </div>
        </div>
      </section>

      <section className="lp-section" id="tarifs">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <h2>Choisis ton forfait</h2>
            <p>Les tarifs viennent directement de la configuration Super Admin.</p>
          </div>
          <div
            className={`lp-grid ${playerPlans.length >= 3 ? 'three' : 'two'} lp-price-grid`}
          >
            {playerPlans.map((plan) => (
              <article
                className={`lp-card lp-price-card ${plan.featured ? 'featured' : ''}`}
                key={plan.id}
              >
                {plan.featured ? <span className="lp-badge">POPULAIRE</span> : null}
                <h3>{plan.title}</h3>
                <span className="lp-price">{plan.price}</span>
                {plan.subtitle || plan.description ? <p>{plan.subtitle || plan.description}</p> : null}
                <ul className="lp-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a className={`lp-button ${plan.featured ? 'primary' : 'outline'}`} href="#telecharger">
                  {plan.key === 'free' ? 'Commencer' : `Choisir ${plan.title}`}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-partners" id="partenaires">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>{content.partners.title}</h2>
            <p>{content.partners.subtitle}</p>
          </div>
          <div className="lp-grid three">
            {content.partners.benefits.map(([icon, title, text]) => (
              <article className="lp-card lp-reveal" key={title}>
                <span className="icon">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="lp-grid three" style={{ marginTop: 14 }}>
            {content.partners.plans.map((plan) => (
              <article className="lp-card lp-reveal" key={plan.name}>
                <h3>{plan.name}</h3>
                <span className="lp-price">{plan.price}</span>
                <ul className="lp-feature-list">
                  {plan.features.map((feature) => <li key={feature}>✅ {feature}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <a className="lp-button primary" href="/auth/partner">Devenir partenaire</a>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>Ils ont déjà gagné</h2>
          </div>
          <div className="lp-grid three">
            {content.testimonials.map(([initial, name, text]) => (
              <article className="lp-card lp-testimonial lp-reveal" key={name}>
                <span className="avatar">{initial}</span>
                <h3>{name}</h3>
                <div className="lp-stars-text">★★★★★</div>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head lp-reveal">
            <h2>Questions fréquentes</h2>
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
      </section>

      <section className="lp-section" id="telecharger">
        <div className="lp-wrap">
          <div className="lp-final lp-reveal">
            <h2>{content.finalCta.title}</h2>
            <p>{content.finalCta.subtitle}</p>
            <div className="lp-final-actions">
              <a className="lp-button light" href="/auth/partner">{content.finalCta.primaryCta}</a>
              <a className="lp-button outline" href="#concours">{content.finalCta.secondaryCta}</a>
            </div>
            <span className="lp-store">{content.finalCta.storeBadge}</span>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div>
              <a className="lp-logo" href="#accueil">
                <img alt="" src="/megapromologo.png" />
                <strong>MegaPromo</strong>
              </a>
              <p>{content.footer.description}</p>
              <div className="lp-socials"><span>f</span><span>ig</span><span>x</span><span>wa</span></div>
            </div>
            <div>
              <h4>Produit</h4>
              <a href="#comment-ca-marche">Comment ça marche</a>
              <a href="#concours">Les concours</a>
              <a href="#tarifs">Premium</a>
              <a href="#telecharger">Classement</a>
            </div>
            <div>
              <h4>Partenaires</h4>
              <a href="#partenaires">Devenir partenaire</a>
              <a href="#partenaires">Nos formules</a>
              <a href="#partenaires">Témoignages marques</a>
              <a href="#partenaires">Contact commercial</a>
            </div>
            <div>
              <h4>Légal</h4>
              <a href="/legal/terms">CGU</a>
              <a href="/legal/privacy">Politique de confidentialité</a>
              <a href="#accueil">Mentions légales</a>
              <a href="#accueil">Contact</a>
            </div>
          </div>
          <div className="lp-bottom">{content.footer.bottom}</div>
        </div>
      </footer>
    </main>
  )
}
