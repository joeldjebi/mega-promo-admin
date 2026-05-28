import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import {
  defaultLandingContent,
  type LandingPageContent,
  mergeLandingContent,
} from '../landing/landingContent'

type SupabaseLikeError = {
  message?: unknown
  details?: unknown
  hint?: unknown
  code?: unknown
}

type LandingMaintenanceState = {
  isEnabled: boolean
  title: string
  message: string
  badge: string
}

type FeatureNavItem = {
  label: string
  href: string
  icon: string
  permission: string
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

function getVisibleFeatureNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
}

function useRealtimeRefresh(
  channelName: string,
  tables: string[],
  onRefresh: () => void | Promise<void>,
) {
  const refreshRef = useRef(onRefresh)
  const tablesKey = tables.join('|')

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    let refreshTimeout = 0
    const realtimeTables = tablesKey.split('|').filter(Boolean)
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void refreshRef.current()
      }, 350)
    }

    const channel = supabase.channel(channelName)
    realtimeTables.forEach((table) => {
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
  }, [channelName, tablesKey])
}

type SuperAdminLandingPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
}

const landingEditorBlocks: Array<{
  key: keyof LandingPageContent
  title: string
  description: string
}> = [
  { key: 'navItems', title: 'Navigation', description: 'Liens du menu principal.' },
  { key: 'hero', title: 'Hero', description: 'Badge, titre, sous-titre et boutons.' },
  { key: 'stats', title: 'Compteurs', description: 'Valeurs animées sous le hero.' },
  { key: 'steps', title: 'Comment ça marche', description: 'Les trois étapes utilisateur.' },
  { key: 'games', title: 'Types de jeux', description: 'Quiz, tirage, pronostic et tags.' },
  { key: 'liveContests', title: 'Concours en cours', description: 'Cards simulées affichées sur la landing.' },
  { key: 'playerPlans', title: 'Premium joueur', description: 'Offres gratuit et premium.' },
  { key: 'partners', title: 'Espace partenaires', description: 'Avantages et formules partenaires.' },
  { key: 'testimonials', title: 'Témoignages', description: 'Avis gagnants et avatars.' },
  { key: 'faqs', title: 'FAQ', description: 'Questions fréquentes en accordéon.' },
  { key: 'finalCta', title: 'CTA final', description: 'Dernier appel à télécharger l’app.' },
  { key: 'footer', title: 'Footer', description: 'Description et copyright.' },
]

const landingVisibilityBlocks = [
  ...landingEditorBlocks,
  {
    key: 'floatingLiveQuiz',
    title: 'QL flottant',
    description: 'Bloc flottant qui met en avant le Quiz Live actif ou à venir.',
  },
] as const

function isLandingBlockEnabled(content: LandingPageContent, blockKey: string) {
  return content.blockVisibility?.[blockKey] !== false
}

const defaultLandingMaintenance: LandingMaintenanceState = {
  isEnabled: false,
  title: 'MegaPromo revient très vite',
  message:
    'Nous effectuons une courte mise à jour afin de vous offrir une expérience plus fluide. Merci pour votre patience.',
  badge: 'Maintenance en cours',
}

async function fetchLandingMaintenance(): Promise<LandingMaintenanceState> {
  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('is_enabled, metadata')
    .eq('key', 'landing_maintenance')
    .maybeSingle()

  if (error) throw error

  const metadata = (data?.metadata ?? {}) as Partial<LandingMaintenanceState>

  return {
    isEnabled: (data?.is_enabled as boolean | null) ?? false,
    title:
      typeof metadata.title === 'string' && metadata.title.trim()
        ? metadata.title
        : defaultLandingMaintenance.title,
    message:
      typeof metadata.message === 'string' && metadata.message.trim()
        ? metadata.message
        : defaultLandingMaintenance.message,
    badge:
      typeof metadata.badge === 'string' && metadata.badge.trim()
        ? metadata.badge
        : defaultLandingMaintenance.badge,
  }
}

export function SuperAdminLandingPage({ authRoute, rootRoute, navItems }: SuperAdminLandingPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [content, setContent] = useState<LandingPageContent>(defaultLandingContent)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [selectedBlock, setSelectedBlock] = useState<keyof LandingPageContent>('hero')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMaintenanceSaving, setIsMaintenanceSaving] = useState(false)
  const [landingMaintenance, setLandingMaintenance] =
    useState<LandingMaintenanceState>(defaultLandingMaintenance)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadLandingContent = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('landing_page_content')
        .select('content')
        .eq('key', 'main')
        .maybeSingle()
      const maintenance = await fetchLandingMaintenance()

      if (error) throw error

      const nextContent = mergeLandingContent(
        (data?.content as Partial<LandingPageContent> | null) ?? null,
      )
      setContent(nextContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(nextContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
      setLandingMaintenance(maintenance)
    } catch (error) {
      setError(
        formatUnknownError(
          error,
          'Impossible de charger la landing. Exécute le script SQL landing_page_content.',
        ),
      )
      setContent(defaultLandingContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(defaultLandingContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
      setLandingMaintenance(defaultLandingMaintenance)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLandingContent()
  }, [loadLandingContent])

  useRealtimeRefresh(
    'sa-landing-realtime',
    ['landing_page_content', 'app_feature_flags'],
    loadLandingContent,
  )

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleSaveBlock(blockKey: keyof LandingPageContent) {
    setNotice('')
    setError('')
    setIsSaving(true)

    try {
      const parsedValue = JSON.parse(drafts[blockKey] ?? 'null')
      const nextContent = mergeLandingContent({
        ...content,
        [blockKey]: parsedValue,
      } as Partial<LandingPageContent>)

      const { error } = await supabase.from('landing_page_content').upsert({
        key: 'main',
        content: nextContent,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setContent(nextContent)
      setDrafts((current) => ({
        ...current,
        [blockKey]: JSON.stringify(nextContent[blockKey], null, 2),
      }))
      setNotice(`Bloc "${landingEditorBlocks.find((block) => block.key === blockKey)?.title}" enregistré.`)
    } catch (error) {
      setError(formatUnknownError(error, 'JSON invalide ou sauvegarde impossible.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleBlock(blockKey: string) {
    setNotice('')
    setError('')
    setIsSaving(true)

    try {
      const nextVisibility = {
        ...content.blockVisibility,
        [blockKey]: !isLandingBlockEnabled(content, blockKey),
      }
      const nextContent = mergeLandingContent({
        ...content,
        blockVisibility: nextVisibility,
      })

      const { error } = await supabase.from('landing_page_content').upsert({
        key: 'main',
        content: nextContent,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setContent(nextContent)
      setDrafts((current) => ({
        ...current,
        blockVisibility: JSON.stringify(nextContent.blockVisibility, null, 2),
      }))

      const blockTitle =
        landingVisibilityBlocks.find((block) => block.key === blockKey)?.title ??
        blockKey
      setNotice(
        `Bloc "${blockTitle}" ${
          nextVisibility[blockKey] === false ? 'désactivé' : 'activé'
        }.`,
      )
    } catch (error) {
      setError(formatUnknownError(error, 'Impossible de mettre à jour l’état du bloc.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleLandingMaintenance() {
    setNotice('')
    setError('')
    setIsMaintenanceSaving(true)

    try {
      const nextMaintenance = {
        ...landingMaintenance,
        isEnabled: !landingMaintenance.isEnabled,
      }
      const { data, error } = await supabase.rpc('upsert_landing_maintenance_flag', {
        p_is_enabled: nextMaintenance.isEnabled,
        p_title: nextMaintenance.title,
        p_message: nextMaintenance.message,
        p_badge: nextMaintenance.badge,
      })

      if (error) throw error

      const row = data as { is_enabled?: boolean } | null
      setLandingMaintenance({
        ...nextMaintenance,
        isEnabled: row?.is_enabled ?? nextMaintenance.isEnabled,
      })
      setNotice(
        nextMaintenance.isEnabled
          ? 'Mode maintenance site activé. La landing publique est remplacée en temps réel.'
          : 'Mode maintenance site désactivé. La landing publique est de nouveau visible.',
      )
    } catch (error) {
      setError(formatUnknownError(error, 'Impossible de mettre à jour la maintenance du site.'))
    } finally {
      setIsMaintenanceSaving(false)
    }
  }

  async function handleResetDefaults() {
    if (!window.confirm('Remettre toute la landing aux valeurs par défaut ?')) return
    setNotice('')
    setError('')
    setIsSaving(true)
    try {
      const { error } = await supabase.from('landing_page_content').upsert({
        key: 'main',
        content: defaultLandingContent,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      setContent(defaultLandingContent)
      setDrafts(
        landingEditorBlocks.reduce<Record<string, string>>((draftMap, block) => {
          draftMap[block.key] = JSON.stringify(defaultLandingContent[block.key], null, 2)
          return draftMap
        }, {}),
      )
      setNotice('Landing réinitialisée avec les valeurs par défaut.')
    } catch (error) {
      setError(formatUnknownError(error, 'Réinitialisation impossible.'))
    } finally {
      setIsSaving(false)
    }
  }

  const currentBlock = landingEditorBlocks.find((block) => block.key === selectedBlock)

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
          <span>Landing</span>
          <strong>{landingEditorBlocks.length} blocs</strong>
          <p>
            {
              landingVisibilityBlocks.filter((block) =>
                isLandingBlockEnabled(content, block.key),
              ).length
            }{' '}
            blocs actifs. Modifiable sans redéployer le front.
          </p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Site public</p>
            <h1>Landing page</h1>
            <p className="page-subtitle">
              Modifie les textes, listes, offres, témoignages, FAQ et CTA affichés sur la page d’accueil.
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
              <strong>Landing mise à jour</strong>
              <p>{notice}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Landing indisponible</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <section className={`panel landing-maintenance-panel ${
          landingMaintenance.isEnabled ? 'enabled' : ''
        }`}>
          <div>
            <p className="eyebrow">Mode maintenance site</p>
            <h2>
              {landingMaintenance.isEnabled
                ? 'Le site public est en maintenance'
                : 'Le site public est en ligne'}
            </h2>
            <p>
              Active ce mode pour remplacer totalement la landing publique par
              une page de maintenance diplomatique, sans toucher à l’app mobile.
            </p>
          </div>
          <button
            className={
              landingMaintenance.isEnabled
                ? 'table-action-button'
                : 'table-action-button danger'
            }
            disabled={isMaintenanceSaving}
            onClick={() => void handleToggleLandingMaintenance()}
            type="button"
          >
            {isMaintenanceSaving
              ? 'Mise à jour...'
              : landingMaintenance.isEnabled
                ? 'Remettre le site en ligne'
                : 'Mettre le site en maintenance'}
          </button>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Blocs</p>
                <h2>Éléments éditables</h2>
              </div>
              <span className="pill">{isLoading ? 'Chargement' : 'Prêt'}</span>
            </div>
            <div className="settings-module-grid">
              {landingEditorBlocks.map((block) => (
                <button
                  className={`settings-module-card ${selectedBlock === block.key ? 'active' : ''}`}
                  key={block.key}
                  onClick={() => setSelectedBlock(block.key)}
                  type="button"
                >
                  <span>{block.title.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{block.title}</strong>
                    <p>{block.description}</p>
                  </div>
                  <span className={`landing-block-status ${
                    isLandingBlockEnabled(content, block.key) ? 'active' : 'inactive'
                  }`}>
                    {isLandingBlockEnabled(content, block.key) ? 'Actif' : 'Masqué'}
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">JSON</p>
                <h2>{currentBlock?.title ?? 'Bloc'}</h2>
                <p className="page-subtitle">
                  Ce bloc est actuellement{' '}
                  <strong>
                    {isLandingBlockEnabled(content, selectedBlock) ? 'visible' : 'masqué'}
                  </strong>{' '}
                  sur la landing publique.
                </p>
              </div>
              <div className="section-heading-actions">
                <button
                  className={
                    isLandingBlockEnabled(content, selectedBlock)
                      ? 'table-action-button danger'
                      : 'table-action-button'
                  }
                  disabled={isSaving}
                  onClick={() => void handleToggleBlock(selectedBlock)}
                  type="button"
                >
                  {isLandingBlockEnabled(content, selectedBlock)
                    ? 'Désactiver le bloc'
                    : 'Activer le bloc'}
                </button>
                <button
                  className="table-action-button"
                  onClick={() =>
                    window.open('/', '_blank', 'noopener,noreferrer')
                  }
                  type="button"
                >
                  Voir la page
                </button>
                <button
                  className="table-action-button danger"
                  disabled={isSaving}
                  onClick={handleResetDefaults}
                  type="button"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            <form
              className="category-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSaveBlock(selectedBlock)
              }}
            >
              <label>
                <span>{currentBlock?.description}</span>
                <textarea
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [selectedBlock]: event.target.value,
                    }))
                  }
                  rows={18}
                  spellCheck={false}
                  value={drafts[selectedBlock] ?? ''}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-action-button"
                  disabled={isSaving}
                  onClick={() =>
                    setDrafts((current) => ({
                      ...current,
                      [selectedBlock]: JSON.stringify(content[selectedBlock], null, 2),
                    }))
                  }
                  type="button"
                >
                  Annuler les changements
                </button>
                <button className="inline-action-button" disabled={isSaving} type="submit">
                  {isSaving ? 'Sauvegarde...' : 'Enregistrer ce bloc'}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Visibilité</p>
                <h2>Activation des blocs</h2>
              </div>
              <span className="pill">Realtime</span>
            </div>
            <div className="landing-visibility-grid">
              {landingVisibilityBlocks.map((block) => {
                const isEnabled = isLandingBlockEnabled(content, block.key)
                return (
                  <button
                    className={`landing-visibility-card ${isEnabled ? 'active' : 'inactive'}`}
                    disabled={isSaving}
                    key={block.key}
                    onClick={() => void handleToggleBlock(block.key)}
                    type="button"
                  >
                    <span className="landing-visibility-dot" />
                    <div>
                      <strong>{block.title}</strong>
                      <p>{block.description}</p>
                    </div>
                    <em>{isEnabled ? 'Actif' : 'Masqué'}</em>
                  </button>
                )
              })}
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
