import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type NotificationTarget = 'all' | 'active' | 'premium' | 'single' | 'selected'
type NotificationFormState = {
  target: NotificationTarget
  userId: string
  userIds: string[]
  title: string
  body: string
  type: string
  contestId: string
  sendPush: boolean
  sendSms: boolean
  smsMessage: string
}
type UserOption = {
  id: string
  label: string
  hasPushToken?: boolean
  pushPlatform?: string
  pushLastError?: string
  pushLastErrorAt?: string
}
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
type SuperAdminNotificationsPageProps = {
  authRoute: string
  rootRoute: string
  navItems: FeatureNavItem[]
}

function getVisibleFeatureNavItems(permissions: string[] | undefined, navItems: FeatureNavItem[]) {
  return navItems.filter((item) =>
    hasAdminPermission(permissions, item.permission, 'read'),
  )
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
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void refreshRef.current()
      }, 350)
    }

    const channel = supabase.channel(channelName)
    tables.forEach((table) => {
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

function createClientUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomValues =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(16))
      : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))

  randomValues[6] = (randomValues[6] & 0x0f) | 0x40
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80

  const hex = Array.from(randomValues, (value) =>
    value.toString(16).padStart(2, '0'),
  )

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}
export function SuperAdminNotificationsPage({ authRoute, rootRoute, navItems }: SuperAdminNotificationsPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<NotificationFormState>({
    target: 'all',
    userId: '',
    userIds: [],
    title: '',
    body: '',
    type: 'info',
    contestId: '',
    sendPush: false,
    sendSms: false,
    smsMessage: '',
  })

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, username, phone, is_premium, is_active, fcm_token, fcm_token_platform, fcm_token_last_error, fcm_token_last_error_at',
        )
        .eq('role', 'player')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      setUsers(
        (data ?? []).map((user) => ({
          id: user.id as string,
          label:
            (user.username as string | null) ??
            (user.phone as string | null) ??
            'Joueur',
          hasPushToken: Boolean(user.fcm_token),
          pushPlatform: (user.fcm_token_platform as string | null) ?? '',
          pushLastError: (user.fcm_token_last_error as string | null) ?? '',
          pushLastErrorAt: (user.fcm_token_last_error_at as string | null) ?? '',
        })),
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Impossible de charger les joueurs.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers()
  }, [loadUsers])

  useRealtimeRefresh('sa-notifications-realtime', ['users', 'notifications'], loadUsers)

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const title = form.title.trim()
    const body = form.body.trim()
    const smsMessage = form.smsMessage.trim() || body
    if (title.length < 3 || body.length < 3) {
      setError('Titre et message sont obligatoires.')
      return
    }

    if (form.sendSms && smsMessage.length < 3) {
      setError('Le message SMS doit contenir au moins 3 caractères.')
      return
    }

    if (form.target === 'single' && !form.userId) {
      setError('Choisis un joueur pour un envoi individuel.')
      return
    }

    if (form.target === 'selected' && form.userIds.length === 0) {
      setError('Sélectionne au moins un joueur.')
      return
    }

    setIsSending(true)

    try {
      let targetIds: string[] = []

      if (form.target === 'selected') {
        targetIds = form.userIds
      } else {
        let query = supabase
          .from('users')
          .select('id')
          .eq('role', 'player')
          .eq('is_active', true)

        if (form.target === 'premium') {
          query = query.eq('is_premium', true)
        }

        if (form.target === 'single') {
          query = query.eq('id', form.userId)
        }

        const { data: targetUsers, error: usersError } = await query.limit(5000)
        if (usersError) throw usersError

        targetIds = (targetUsers ?? []).map((user) => user.id as string)
      }

      targetIds = Array.from(new Set(targetIds))
      if (targetIds.length === 0) {
        setError('Aucun joueur trouvé pour cette cible.')
        return
      }

      const notificationData = {
        ...(form.contestId.trim() ? { contest_id: form.contestId.trim() } : {}),
      }

      const { error: insertError } = await supabase.from('notifications').insert(
        targetIds.map((userId) => ({
          id: createClientUuid(),
          user_id: userId,
          title,
          body,
          type: form.type,
          is_read: false,
          data: notificationData,
          created_at: new Date().toISOString(),
        })),
      )

      if (insertError) throw insertError

      let pushSummary = ' Push mobile: désactivé.'
      if (form.sendPush) {
        try {
          console.info('[MegaPromo][SA notifications][pushRequest]', {
            target: form.target,
            targetCount: targetIds.length,
            type: form.type,
            hasContestId: Boolean(form.contestId.trim()),
          })
          const { data: pushData, error: pushError } =
            await supabase.functions.invoke('send-push-notifications', {
              body: {
                userIds: targetIds,
                title,
                body,
                type: form.type,
                data: notificationData,
                platforms: ['ios', 'android'],
              },
            })
          console.info('[MegaPromo][SA notifications][pushResponse]', {
            data: pushData,
            error: pushError,
          })
          if (pushError) throw pushError
          const sent = Number((pushData as { sent?: number } | null)?.sent ?? 0)
          const failed = Number((pushData as { failed?: number } | null)?.failed ?? 0)
          const targetUsers = Number(
            (pushData as { targetUsers?: number } | null)?.targetUsers ??
              targetIds.length,
          )
          const pushMessage = (pushData as { message?: string } | null)?.message ?? ''
          const failedSample = (
            pushData as {
              failedSamples?: Array<{ summary?: string; response?: unknown }>
            } | null
          )?.failedSamples?.[0]
          const failedDetail =
            failed > 0 && failedSample
              ? ` Détail: ${
                  failedSample.summary ??
                  JSON.stringify(failedSample.response).slice(0, 180)
                }`
              : pushMessage
                ? ` ${pushMessage}`
                : ''
          pushSummary = ` Push mobile: ${sent}/${targetUsers} envoyé(s), ${failed} échec(s).${failedDetail}`
        } catch (pushError) {
          console.warn('[MegaPromo][SA notifications][pushError]', pushError)
          // La ligne Supabase est créée même si l'Edge Function push n'est pas encore déployée.
          pushSummary = ` Push mobile non envoyé: ${formatUnknownError(
            pushError,
            'Edge Function indisponible.',
          )}`
        }
      }

      let smsSummary = ''
      if (form.sendSms) {
        try {
          const { data: smsData, error: smsError } = await supabase.functions.invoke(
            'send-sms-mtarget',
            {
              body: {
                userIds: targetIds,
                message: smsMessage,
                sender: 'MEGAPROMO',
              },
            },
          )
          if (smsError) throw smsError

          const sent = Number((smsData as { sent?: number } | null)?.sent ?? 0)
          const failed = Number((smsData as { failed?: number } | null)?.failed ?? 0)
          smsSummary = ` SMS: ${sent} envoyé(s), ${failed} échec(s).`
        } catch (error) {
          smsSummary = ` SMS non envoyé: ${
            error instanceof Error ? error.message : 'Edge Function indisponible.'
          }`
        }
      }

      setSuccess(
        `${targetIds.length} notification(s) créée(s).${pushSummary}${smsSummary}`,
      )
      setForm({
        target: 'all',
        userId: '',
        userIds: [],
        title: '',
        body: '',
        type: 'info',
        contestId: '',
        sendPush: false,
        sendSms: false,
        smsMessage: '',
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Envoi impossible.')
    } finally {
      setIsSending(false)
    }
  }

  function toggleSelectedUser(userId: string) {
    setForm((currentForm) => {
      const exists = currentForm.userIds.includes(userId)
      return {
        ...currentForm,
        userIds: exists
          ? currentForm.userIds.filter((id) => id !== userId)
          : [...currentForm.userIds, userId],
      }
    })
  }

  function selectAllLoadedUsers() {
    setForm((currentForm) => ({
      ...currentForm,
      userIds: users.map((user) => user.id),
    }))
  }

  function clearSelectedUsers() {
    setForm((currentForm) => ({ ...currentForm, userIds: [] }))
  }

  const pushReadyCount = users.filter((user) => user.hasPushToken).length
  const selectedCount =
    form.target === 'selected' ? form.userIds.length : form.target === 'single' && form.userId ? 1 : 0
  const previewTitle = form.title.trim() || 'Titre de la notification'
  const previewBody =
    form.body.trim() ||
    'Le message que les joueurs verront dans l’application apparaîtra ici.'

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
          <span>Notifications</span>
          <strong>{users.length} joueurs chargés</strong>
          <p>Envoi groupé ou individuel vers l’app mobile, push optionnel et SMS.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Communication</p>
            <h1>Notifications push</h1>
            <p className="page-subtitle">
              Crée une notification in-app, puis déclenche le push mobile ou le SMS seulement si tu l’actives.
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

        {error ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Notification indisponible</strong>
              <p>{error}</p>
            </div>
            {isLoading ? null : <button onClick={loadUsers}>Réessayer</button>}
          </div>
        ) : null}

        {success ? (
          <div className="dashboard-success" role="status">
            <div>
              <strong>Envoi préparé</strong>
              <p>{success}</p>
            </div>
          </div>
        ) : null}

        <section className="notification-summary-grid" aria-label="Résumé notifications">
          <article>
            <span>Joueurs chargés</span>
            <strong>{users.length}</strong>
            <p>Comptes joueurs actifs ou récents.</p>
          </article>
          <article>
            <span>Push prêt</span>
            <strong>{pushReadyCount}</strong>
            <p>Joueurs avec token mobile enregistré.</p>
          </article>
          <article>
            <span>Cible actuelle</span>
            <strong>{form.target === 'all' ? 'Tous' : selectedCount || 'Auto'}</strong>
            <p>{form.sendPush ? 'Push mobile activé.' : 'Notification in-app uniquement.'}</p>
          </article>
        </section>

        <section className="panel categories-page-panel notification-composer-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Composer</p>
              <h2>Nouvelle notification</h2>
            </div>
            <span className="pill">{isLoading ? 'Chargement' : 'Prêt'}</span>
          </div>

          <div className="notification-console-grid">
            <form className="category-form contest-form notification-form" onSubmit={handleSubmit}>
              <div className="form-grid two-columns">
              <label>
                <span>Cible</span>
                <select
                  onChange={(event) => {
                    const target = event.target.value as NotificationTarget
                    setForm({
                      ...form,
                      target,
                      userId: target === 'single' ? form.userId : '',
                      userIds: target === 'selected' ? form.userIds : [],
                    })
                  }}
                  value={form.target}
                >
                  <option value="all">Tous les joueurs actifs</option>
                  <option value="premium">Joueurs premium</option>
                  <option value="selected">Plusieurs joueurs</option>
                  <option value="single">Un joueur précis</option>
                </select>
              </label>

              <label>
                <span>Type</span>
                <select
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  value={form.type}
                >
                  <option value="info">Info</option>
                  <option value="contest">Concours</option>
                  <option value="winner">Gagnant</option>
                  <option value="gain">Gain</option>
                  <option value="leaderboard">Classement</option>
                </select>
              </label>
            </div>

            {form.target === 'single' ? (
              <label>
                <span>Joueur</span>
                <select
                  onChange={(event) => setForm({ ...form, userId: event.target.value })}
                  value={form.userId}
                >
                  <option value="">Choisir un joueur</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label} · {user.hasPushToken ? `Push ${user.pushPlatform || 'mobile'}` : 'Push absent'}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.target === 'selected' ? (
              <div className="notification-recipient-panel">
                <div className="notification-recipient-header">
                  <div>
                    <strong>{form.userIds.length} joueur(s) sélectionné(s)</strong>
                    <p>Choisis un ou plusieurs joueurs parmi les comptes chargés.</p>
                  </div>
                  <div className="table-actions compact">
                    <button
                      className="table-action-button"
                      onClick={selectAllLoadedUsers}
                      type="button"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      className="table-action-button"
                      onClick={clearSelectedUsers}
                      type="button"
                    >
                      Vider
                    </button>
                  </div>
                </div>

                <div className="notification-recipient-list">
                  {users.map((user) => (
                    <label className="notification-recipient-row" key={user.id}>
                      <input
                        checked={form.userIds.includes(user.id)}
                        onChange={() => toggleSelectedUser(user.id)}
                        type="checkbox"
                      />
                      <span>
                        {user.label}
                        {user.hasPushToken ? (
                          <small>Push {user.pushPlatform || 'mobile'}</small>
                        ) : (
                          <small>Push absent</small>
                        )}
                      </span>
                    </label>
                  ))}
                  {users.length === 0 ? (
                    <p className="empty-panel-text">
                      {isLoading ? 'Chargement des joueurs...' : 'Aucun joueur chargé.'}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="form-grid two-columns">
              <label>
                <span>Titre</span>
                <input
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Ex: Nouveau concours disponible"
                  value={form.title}
                />
              </label>

              <label>
                <span>ID concours optionnel</span>
                <input
                  onChange={(event) =>
                    setForm({ ...form, contestId: event.target.value })
                  }
                  placeholder="UUID du concours"
                  value={form.contestId}
                />
              </label>
            </div>

            <label>
              <span>Message</span>
              <textarea
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                placeholder="Ton message pour les joueurs"
                rows={5}
                value={form.body}
              />
            </label>

            <label className="notification-recipient-row sms-toggle-row">
              <input
                checked={form.sendPush}
                onChange={(event) =>
                  setForm({ ...form, sendPush: event.target.checked })
                }
                type="checkbox"
              />
              <span>Envoyer aussi un vrai push mobile iOS/Android</span>
            </label>

            <label className="notification-recipient-row sms-toggle-row">
              <input
                checked={form.sendSms}
                onChange={(event) =>
                  setForm({ ...form, sendSms: event.target.checked })
                }
                type="checkbox"
              />
              <span>Envoyer aussi par SMS avec mTarget</span>
            </label>

            {form.sendSms ? (
              <label>
                <span>Message SMS</span>
                <textarea
                  maxLength={480}
                  onChange={(event) =>
                    setForm({ ...form, smsMessage: event.target.value })
                  }
                  placeholder="Laisse vide pour reprendre le message principal"
                  rows={3}
                  value={form.smsMessage}
                />
                <small className="form-help">
                  Les SMS utilisent le numéro enregistré dans le profil joueur.
                </small>
              </label>
            ) : null}

              <div className="modal-actions">
                <button className="inline-action-button" disabled={isSending} type="submit">
                  {isSending ? 'Envoi...' : 'Créer la notification'}
                </button>
              </div>
            </form>

            <aside className="notification-preview-panel" aria-label="Aperçu notification">
              <div className="notification-preview-phone">
                <div className="notification-preview-status">
                  <span />
                  <span />
                </div>
                <article className="notification-preview-card">
                  <small>MegaPromo</small>
                  <strong>{previewTitle}</strong>
                  <p>{previewBody}</p>
                  <div>
                    <span>{form.type}</span>
                    <span>{form.sendPush ? 'Push mobile' : 'In-app'}</span>
                  </div>
                </article>
              </div>
              <div className="notification-preview-help">
                <strong>Aperçu joueur</strong>
                <p>
                  Prévisualise rapidement le rendu avant création. Le push mobile reste optionnel
                  pour éviter les envois accidentels.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </section>
    </main>
  )
}
