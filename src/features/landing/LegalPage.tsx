import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { landingStyle } from './landingStyles'

type LegalPageKey = 'terms' | 'privacy' | 'account-deletion'

type LegalPageRecord = {
  key: LegalPageKey
  title: string
  content: string
  updated_at?: string | null
}

const fallbackLegalPages: Record<LegalPageKey, LegalPageRecord> = {
  terms: {
    key: 'terms',
    title: 'Conditions générales d’utilisation',
    content:
      'Bienvenue sur MegaPromo. MegaPromo est une plateforme promotionnelle permettant aux utilisateurs de découvrir des marques, produits et services à travers des campagnes interactives gratuites.\n\nLa participation ne nécessite aucune mise, aucun pari et aucun achat obligatoire. Chaque utilisateur est responsable des informations fournies lors de son inscription. Toute tentative de fraude, d’usage abusif ou de création de comptes multiples peut entraîner la suspension du compte.\n\nLes récompenses promotionnelles, avantages, forfaits et conditions de participation peuvent varier selon les campagnes. Les informations officielles sont celles affichées dans l’application au moment de la participation.',
  },
  privacy: {
    key: 'privacy',
    title: 'Politique de confidentialité',
    content:
      'MegaPromo collecte uniquement les informations nécessaires au fonctionnement du service, notamment l’identification de l’utilisateur, la participation aux campagnes, les notifications et la sécurisation de l’expérience.\n\nLes données peuvent être utilisées pour afficher les campagnes disponibles, gérer les récompenses promotionnelles, prévenir la fraude et améliorer l’application.\n\nVous pouvez contacter l’équipe MegaPromo pour toute demande liée à vos données personnelles.',
  },
  'account-deletion': {
    key: 'account-deletion',
    title: 'Suppression de compte',
    content:
      'Tu peux demander la suppression de ton compte MegaPromo à tout moment. Cette page décrit le mécanisme prévu pour supprimer ton profil joueur, tes données d’identification et les informations personnelles rattachées à ton compte.\n\nDepuis l’application mobile, connecte-toi à ton compte, ouvre ton profil, puis contacte l’assistance ou utilise le parcours de suppression lorsqu’il est disponible. Tu peux aussi écrire à l’équipe MegaPromo depuis le formulaire de contact du site en précisant le numéro, l’adresse e-mail ou le compte social utilisé pour ton inscription.\n\nAprès réception de la demande, l’équipe vérifie que le compte t’appartient réellement. Cette vérification protège les joueurs contre les suppressions non autorisées. Une fois la demande validée, le compte est désactivé puis les données personnelles non nécessaires sont supprimées ou anonymisées.\n\nCertaines informations peuvent être conservées temporairement lorsque la loi, la sécurité, la prévention de la fraude, la gestion des récompenses, les litiges ou les obligations comptables l’exigent. Les données conservées sont limitées au strict nécessaire et ne sont plus utilisées pour l’animation commerciale du compte supprimé.\n\nLa suppression est irréversible pour l’expérience joueur : l’historique de participation, les avantages non réclamés, les badges, les notifications et les accès au compte peuvent ne plus être récupérables après traitement.',
  },
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.startsWith('225')) return `+${digits}`
  if (digits.length >= 8 && digits.length <= 10) return `+225${digits}`
  return `+${digits}`
}

function getSessionProvider(session: Session | null) {
  const user = session?.user
  const provider = user?.app_metadata?.provider as string | undefined
  const providers = user?.app_metadata?.providers as string[] | undefined
  return provider ?? providers?.[0] ?? 'Compte MegaPromo'
}

function providerLabel(provider: string) {
  if (provider === 'google') return 'Google'
  if (provider === 'apple') return 'Apple'
  if (provider === 'phone') return 'numéro de téléphone'
  return provider
}

function AccountDeletionActionPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session)
      setIsSessionLoading(false)
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function startSocialLogin(provider: 'google' | 'apple') {
    setErrorMessage(null)
    setStatusMessage(null)
    setIsBusy(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/legal/account-deletion`,
      },
    })

    if (error) {
      setErrorMessage(
        `Connexion ${providerLabel(provider)} indisponible pour le moment.`,
      )
      setIsBusy(false)
    }
  }

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    const normalizedPhone = normalizePhoneNumber(phone)
    if (!normalizedPhone || normalizedPhone.length < 9) {
      setErrorMessage('Renseigne un numéro de téléphone valide.')
      return
    }

    setIsBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    })
    setIsBusy(false)

    if (error) {
      setErrorMessage('Impossible d’envoyer le code pour le moment.')
      return
    }

    setOtpPhone(normalizedPhone)
    setOtpSent(true)
    setStatusMessage(`Code envoyé au ${normalizedPhone}.`)
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    if (!otpPhone || otp.trim().length < 4) {
      setErrorMessage('Renseigne le code reçu par SMS.')
      return
    }

    setIsBusy(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: otpPhone,
      token: otp.trim(),
      type: 'sms',
    })
    setIsBusy(false)

    if (error) {
      setErrorMessage('Code invalide ou expiré. Demande un nouveau code.')
      return
    }

    setStatusMessage('Compte vérifié. Tu peux confirmer la fermeture.')
  }

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    if (confirmation.trim().toUpperCase() !== 'SUPPRIMER') {
      setErrorMessage('Écris SUPPRIMER pour confirmer la fermeture du compte.')
      return
    }

    setIsBusy(true)
    const { error } = await supabase.rpc('request_own_account_deletion', {
      p_confirmation: confirmation.trim(),
    })

    if (error) {
      setIsBusy(false)
      setErrorMessage('Impossible de fermer le compte pour le moment.')
      console.warn('[MegaPromo][account-deletion] request failed', error)
      return
    }

    await supabase.auth.signOut()
    setSession(null)
    setIsBusy(false)
    setIsCompleted(true)
    setConfirmation('')
  }

  const provider = getSessionProvider(session)
  const userIdentifier =
    session?.user.email || session?.user.phone || session?.user.id || ''

  return (
    <section className="lp-account-deletion-panel" aria-label="Supprimer mon compte">
      <div className="lp-account-panel-heading">
        <span className="lp-pill">Action sécurisée</span>
        <h2>Supprimer mon compte MegaPromo</h2>
        <p>
          Connecte-toi avec la même méthode que celle utilisée dans l’application.
          Ton compte sera fermé maintenant, puis supprimé définitivement après
          un délai de 30 jours.
        </p>
      </div>

      {isCompleted ? (
        <div className="lp-account-success">
          <strong>Demande enregistrée.</strong>
          <span>
            Ton compte est fermé. Si tu te reconnectes avant 30 jours, tu pourras
            annuler la suppression depuis l’application.
          </span>
        </div>
      ) : isSessionLoading ? (
        <div className="lp-account-loading">Vérification de ta session...</div>
      ) : session ? (
        <form className="lp-account-delete-form" onSubmit={requestDeletion}>
          <div className="lp-account-session">
            <div>
              <span>Compte connecté</span>
              <strong>{userIdentifier}</strong>
            </div>
            <small>Connexion via {providerLabel(provider)}</small>
          </div>

          <div className="lp-account-warning">
            <strong>Avant de continuer</strong>
            <p>
              Le compte sera désactivé immédiatement. Les participations,
              récompenses, badges et notifications ne seront plus accessibles
              pendant la période de suppression.
            </p>
          </div>

          <label className="lp-account-field">
            <span>Confirmation</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Écris SUPPRIMER"
              autoComplete="off"
            />
          </label>

          <button className="lp-button danger" disabled={isBusy} type="submit">
            {isBusy ? 'Fermeture en cours...' : 'Fermer mon compte'}
          </button>
        </form>
      ) : (
        <div className="lp-account-auth-grid">
          <div className="lp-account-auth-card">
            <h3>Connexion rapide</h3>
            <p>Utilise Google ou Apple si ton compte MegaPromo a été créé avec un compte social.</p>
            <div className="lp-account-social-actions">
              <button
                className="lp-button outline"
                disabled={isBusy}
                onClick={() => void startSocialLogin('google')}
                type="button"
              >
                Continuer avec Google
              </button>
              <button
                className="lp-button outline"
                disabled={isBusy}
                onClick={() => void startSocialLogin('apple')}
                type="button"
              >
                Continuer avec Apple
              </button>
            </div>
          </div>

          <div className="lp-account-auth-card">
            <h3>Connexion par téléphone</h3>
            <p>Si ton compte a été créé avec un numéro, vérifie-le avec un code OTP.</p>
            {!otpSent ? (
              <form onSubmit={sendOtp}>
                <label className="lp-account-field">
                  <span>Numéro de téléphone</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+2250700000000"
                    type="tel"
                  />
                </label>
                <button className="lp-button primary" disabled={isBusy} type="submit">
                  {isBusy ? 'Envoi...' : 'Recevoir le code'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp}>
                <label className="lp-account-field">
                  <span>Code reçu</span>
                  <input
                    value={otp}
                    inputMode="numeric"
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="123456"
                  />
                </label>
                <button className="lp-button primary" disabled={isBusy} type="submit">
                  {isBusy ? 'Vérification...' : 'Vérifier le code'}
                </button>
                <button
                  className="lp-account-link-button"
                  disabled={isBusy}
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setStatusMessage(null)
                  }}
                  type="button"
                >
                  Changer de numéro
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {statusMessage ? <p className="lp-account-status success">{statusMessage}</p> : null}
      {errorMessage ? <p className="lp-account-status error">{errorMessage}</p> : null}
    </section>
  )
}

export function LegalPage({ pageKey }: { pageKey: LegalPageKey }) {
  const [page, setPage] = useState<LegalPageRecord>(fallbackLegalPages[pageKey])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    void (async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('legal_pages')
        .select('key, title, content, updated_at')
        .eq('key', pageKey)
        .eq('is_active', true)
        .maybeSingle()

      if (!isMounted) return

      if (data?.title && data?.content) {
        setPage({
          key: pageKey,
          title: data.title as string,
          content: data.content as string,
          updated_at: data.updated_at as string | null,
        })
      } else {
        setPage(fallbackLegalPages[pageKey])
      }

      if (error) {
        console.warn('[MegaPromo][legal] page unavailable', error)
      }

      setIsLoading(false)
    })()

    return () => {
      isMounted = false
    }
  }, [pageKey])

  const updatedAt = formatUpdatedAt(page.updated_at)
  const paragraphs = useMemo(
    () => page.content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    [page.content],
  )

  return (
    <main className="lp-page lp-legal-page">
      <style>{landingStyle}</style>
      <nav className="lp-nav scrolled">
        <div className="lp-wrap">
          <div className="lp-nav-inner">
            <a className="lp-logo" href="/">
              <img alt="" src="/megapromologo.png" />
              <strong>MegaPromo</strong>
            </a>
            <div className="lp-actions">
              <a className="lp-button outline" href="/">Accueil</a>
              <a className="lp-button primary" href="/#telecharger">Télécharger l’app</a>
            </div>
          </div>
        </div>
      </nav>

      <section className="lp-legal-shell">
        <div className="lp-wrap">
          <div className="lp-legal-hero">
            <span className="lp-pill">Légal MegaPromo</span>
            <h1>{page.title}</h1>
            <p>
              {updatedAt
                ? `Dernière mise à jour : ${updatedAt}`
                : 'Document officiel consultable par les utilisateurs et visiteurs.'}
            </p>
          </div>

          <article className="lp-legal-card">
            {isLoading ? (
              <p>Chargement du document...</p>
            ) : (
              paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            )}
          </article>

          {pageKey === 'account-deletion' ? <AccountDeletionActionPanel /> : null}

          <div className="lp-legal-links">
            <a href="/legal/terms">Conditions générales d’utilisation</a>
            <a href="/legal/privacy">Politique de confidentialité</a>
            <a href="/legal/account-deletion">Suppression de compte</a>
          </div>
        </div>
      </section>
    </main>
  )
}
