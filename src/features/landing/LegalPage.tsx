import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { landingStyle } from './landingStyles'

type LegalPageKey = 'terms' | 'privacy'

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

          <div className="lp-legal-links">
            <a href="/legal/terms">Conditions générales d’utilisation</a>
            <a href="/legal/privacy">Politique de confidentialité</a>
          </div>
        </div>
      </section>
    </main>
  )
}
