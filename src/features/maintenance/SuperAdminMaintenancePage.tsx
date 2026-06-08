import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'
import { logAdminAction, logError } from '../../lib/systemLogger'

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
type MaintenanceScope =
  | 'game_history'
  | 'rewards_notifications'
  | 'badges'
  | 'subscriptions'
  | 'question_banks'
  | 'contests'
  | 'all_test_data'

type MaintenanceAction = {
  scope: MaintenanceScope
  title: string
  description: string
  keeps: string
  danger: 'medium' | 'high'
}


type SuperAdminMaintenancePageProps = {
  authRoute: string
  rootRoute: string
  settingsRoute: string
  navItems: FeatureNavItem[]
}

const maintenanceActions: MaintenanceAction[] = [
  {
    scope: 'game_history',
    title: 'Vider historiques de jeu',
    description:
      'Supprime toutes les participations et remet les points ainsi que les compteurs journaliers des joueurs à zéro.',
    keeps: 'Conserve concours, gagnants, abonnements, configurations.',
    danger: 'medium',
  },
  {
    scope: 'rewards_notifications',
    title: 'Vider gagnants et notifications',
    description:
      'Supprime les lignes gagnants et toutes les notifications envoyées pendant les tests.',
    keeps: 'Conserve concours, joueurs, participations, forfaits.',
    danger: 'medium',
  },
  {
    scope: 'badges',
    title: 'Vider badges attribués',
    description: 'Retire les badges gagnés par les joueurs pendant les tests.',
    keeps: 'Conserve les définitions de badges.',
    danger: 'medium',
  },
  {
    scope: 'subscriptions',
    title: 'Vider abonnements test',
    description:
      'Supprime les abonnements joueurs/partenaires et réinitialise les statuts premium.',
    keeps: 'Conserve les forfaits et avantages configurés.',
    danger: 'high',
  },
  {
    scope: 'question_banks',
    title: 'Vider banques de questions',
    description:
      'Supprime toutes les banques de questions, leurs liens catégories et les questions rattachées aux banques.',
    keeps:
      'Conserve concours, questions directement rattachées aux concours, catégories, joueurs et partenaires.',
    danger: 'high',
  },
  {
    scope: 'contests',
    title: 'Vider concours test',
    description:
      'Supprime concours, jeux, questions, boosts, participations, gagnants associés et remet les points joueurs à zéro.',
    keeps: 'Conserve catégories, types, plans, joueurs et partenaires.',
    danger: 'high',
  },
  {
    scope: 'all_test_data',
    title: 'Nettoyage complet hors configuration',
    description:
      'Vide concours, jeux, participations, gagnants, notifications, badges attribués, abonnements et points joueurs.',
    keeps:
      'Conserve users, partners, catégories, pays, types, forfaits, avantages et badges.',
    danger: 'high',
  },
]

export function SuperAdminMaintenancePage({ authRoute, rootRoute, settingsRoute, navItems }: SuperAdminMaintenancePageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [confirmation, setConfirmation] = useState('')
  const [activeScope, setActiveScope] = useState<MaintenanceScope | null>(null)
  const [pendingAction, setPendingAction] = useState<MaintenanceAction | null>(
    null,
  )
  const [maintenanceError, setMaintenanceError] = useState('')
  const [maintenanceNotice, setMaintenanceNotice] = useState('')

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleRunMaintenance(action: MaintenanceAction) {
    setMaintenanceError('')
    setMaintenanceNotice('')
    setActiveScope(action.scope)
    try {
      const { data, error } =
        action.scope === 'question_banks'
          ? await supabase.rpc('admin_maintenance_clear_question_banks', {
              p_confirmation: confirmation,
            })
          : await supabase.rpc('admin_maintenance_clear', {
              p_scope: action.scope,
              p_confirmation: confirmation,
            })

      if (error) throw error

      const result = data as { deleted?: number; message?: string } | null
      setMaintenanceNotice(
        `${result?.message ?? 'Maintenance appliquée.'} Lignes impactées : ${
          result?.deleted ?? 0
        }.`,
      )
      void logAdminAction({
        feature: 'maintenance',
        action: 'clear_scope',
        message: 'Action de maintenance executee par le SA.',
        entityType: 'maintenance_scope',
        entityId: action.scope,
        metadata: {
          scope: action.scope,
          deleted: result?.deleted ?? 0,
          label: action.title,
        },
      })
      setConfirmation('')
      setPendingAction(null)
    } catch (error) {
      void logError({
        feature: 'maintenance',
        action: 'clear_scope_failed',
        message: 'Echec execution action de maintenance.',
        entityType: 'maintenance_scope',
        entityId: action.scope,
        metadata: {
          scope: action.scope,
          label: action.title,
          error: formatUnknownError(
            error,
            'Impossible d’exécuter cette action de maintenance.',
          ),
        },
      })
      setMaintenanceError(
        formatUnknownError(
          error,
          'Impossible d’exécuter cette action de maintenance.',
        ),
      )
      setConfirmation('')
      setPendingAction(null)
    } finally {
      setActiveScope(null)
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

        <div className="sidebar-card danger">
          <span>Production</span>
          <strong>Nettoyage</strong>
          <p>Vide uniquement les données de test, jamais les configurations de base.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Système</p>
            <h1>Maintenance production</h1>
            <p className="page-subtitle">
              Actions sensibles pour nettoyer les données de test avant lancement.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-action-button"
              onClick={() => navigate(settingsRoute)}
              type="button"
            >
              Paramètres
            </button>
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

        {maintenanceError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Maintenance refusée</strong>
              <p>{maintenanceError}</p>
            </div>
          </div>
        ) : null}

        {maintenanceNotice ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Maintenance appliquée</strong>
              <p>{maintenanceNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="panel maintenance-guard-panel">
          <div>
            <p className="eyebrow">Confirmation forte</p>
            <h2>Sélectionne une action pour confirmer</h2>
            <p>
              Les actions ci-dessous sont irréversibles. Une confirmation dédiée
              sera demandée avant chaque nettoyage.
            </p>
          </div>
          <span className="status-pill cancelled">Zone sensible</span>
        </section>

        <section className="maintenance-grid">
          {maintenanceActions.map((action) => {
            const isRunning = activeScope === action.scope
            const canRun = !activeScope

            return (
              <article
                className={`panel maintenance-card ${action.danger === 'high' ? 'high' : ''}`}
                key={action.scope}
              >
                <div className="maintenance-card-header">
                  <span className="maintenance-icon">
                    {action.danger === 'high' ? '!' : 'M'}
                  </span>
                  <span className={`status-pill ${action.danger === 'high' ? 'cancelled' : 'pending'}`}>
                    {action.danger === 'high' ? 'Très sensible' : 'Sensible'}
                  </span>
                </div>
                <h2>{action.title}</h2>
                <p>{action.description}</p>
                <small>{action.keeps}</small>
                <button
                  className={`table-action-button ${
                    action.danger === 'high' ? 'danger' : ''
                  }`}
                  disabled={!canRun}
                  onClick={() => {
                    setConfirmation('')
                    setMaintenanceError('')
                    setMaintenanceNotice('')
                    setPendingAction(action)
                  }}
                  type="button"
                >
                  {isRunning ? 'Nettoyage...' : 'Préparer'}
                </button>
              </article>
            )
          })}
        </section>
      </section>

      {pendingAction ? (
        <MaintenanceConfirmModal
          action={pendingAction}
          confirmation={confirmation}
          isRunning={activeScope === pendingAction.scope}
          onChangeConfirmation={setConfirmation}
          onClose={() => {
            if (activeScope) return
            setPendingAction(null)
            setConfirmation('')
          }}
          onConfirm={() => handleRunMaintenance(pendingAction)}
        />
      ) : null}
    </main>
  )
}

function MaintenanceConfirmModal({
  action,
  confirmation,
  isRunning,
  onChangeConfirmation,
  onClose,
  onConfirm,
}: {
  action: MaintenanceAction
  confirmation: string
  isRunning: boolean
  onChangeConfirmation: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const canConfirm = confirmation === 'CONFIRMER' && !isRunning

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="category-modal maintenance-confirm-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Confirmation maintenance</p>
            <h2>{action.title}</h2>
          </div>
          <button disabled={isRunning} onClick={onClose} type="button">
            Fermer
          </button>
        </div>

        <div className="maintenance-confirm-body">
          <span className={`status-pill ${action.danger === 'high' ? 'cancelled' : 'pending'}`}>
            {action.danger === 'high' ? 'Action très sensible' : 'Action sensible'}
          </span>
          <p>{action.description}</p>
          <small>{action.keeps}</small>
          <div className="maintenance-confirm-code">
            <strong>Écris CONFIRMER pour exécuter</strong>
            <input
              autoFocus
              onChange={(event) => onChangeConfirmation(event.target.value)}
              placeholder="CONFIRMER"
              value={confirmation}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button disabled={isRunning} onClick={onClose} type="button">
            Annuler
          </button>
          <button
            className="danger-action-button"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {isRunning ? 'Nettoyage...' : 'Exécuter le nettoyage'}
          </button>
        </div>
      </section>
    </div>
  )
}
