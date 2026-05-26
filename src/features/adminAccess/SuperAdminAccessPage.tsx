import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { supabase } from '../../lib/supabase'
import { SuperAdminLayout } from '../superAdminLayout/SuperAdminLayout'
import type { SuperAdminNavItem } from '../superAdminLayout/SuperAdminLayout'
import {
  adminPermissionDefinitions,
  allAdminPermissionKeys,
  hasAdminPermission,
} from './permissions'

type AdminRole = {
  id: string
  name: string
  description: string
  isActive: boolean
  isSystem: boolean
  permissions: string[]
}

type AdminUser = {
  id: string
  email: string
  username: string
  roleId: string
  roleName: string
  isActive: boolean
  createdAt: string
}

type AccessPayload = {
  roles: AdminRole[]
  admins: AdminUser[]
}

type RoleFormState = {
  id: string
  name: string
  description: string
  permissions: string[]
  isActive: boolean
}

type AdminFormState = {
  email: string
  username: string
  password: string
  roleId: string
  isActive: boolean
}

type AdminAccessRequest = {
  action: 'list' | 'upsert_role' | 'create_admin' | 'update_admin'
  adminAccessToken?: string
  role?: RoleFormState
  admin?: Partial<AdminFormState> & {
    id?: string
    roleId?: string
  }
}

const emptyRoleForm: RoleFormState = {
  id: '',
  name: '',
  description: '',
  permissions: [],
  isActive: true,
}

const emptyAdminForm: AdminFormState = {
  email: '',
  username: '',
  password: '',
  roleId: '',
  isActive: true,
}

const supabaseFunctionUrl = `${String(
  import.meta.env.VITE_SUPABASE_URL ?? '',
).replace(/\/$/, '')}/functions/v1/admin-access`
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')

async function resolveAdminAccessError(error: unknown, fallback: string) {
  const maybeContext = (error as { context?: Response } | null)?.context
  if (maybeContext) {
    try {
      const payload = (await maybeContext.clone().json()) as {
        error?: string
        message?: string
      }
      return payload.error ?? payload.message ?? fallback
    } catch {
      return fallback
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to send a request')) {
      return 'La fonction Supabase admin-access est indisponible. Vérifie son déploiement puis recharge la page.'
    }
    return error.message
  }

  return fallback
}

async function invokeAdminAccess<T>(body: AdminAccessRequest) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (sessionError || !accessToken) {
    throw new Error('Session admin expirée. Reconnecte-toi puis réessaie.')
  }

  const response = await fetch(supabaseFunctionUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-admin-access-token': accessToken,
    },
    body: JSON.stringify({
      ...body,
      adminAccessToken: accessToken,
    }),
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string } | null)?.error ??
      (payload as { error?: string; message?: string } | null)?.message ??
      `Erreur admin-access (${response.status}).`
    throw new Error(message)
  }

  return {
    data: payload as T,
    error: null,
  }
}

export function SuperAdminAccessPage({
  navItems,
  authRoute,
  settingsRoute,
}: {
  navItems: SuperAdminNavItem[]
  authRoute: string
  settingsRoute: string
}) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const canWrite = hasAdminPermission(
    adminAuth.profile?.permissions,
    'admin_access',
    'write',
  )
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm)
  const [adminForm, setAdminForm] = useState<AdminFormState>(emptyAdminForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAccess = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const { data, error } = await invokeAdminAccess<AccessPayload>({
        action: 'list',
      })
      if (error) throw error
      setRoles(data?.roles ?? [])
      setAdmins(data?.admins ?? [])
    } catch (error) {
      setError(
        await resolveAdminAccessError(
          error,
          'Impossible de charger les accès admin.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccess()
  }, [loadAccess])

  function togglePermission(key: string) {
    setRoleForm((current) => {
      const hasKey = current.permissions.includes(key)
      return {
        ...current,
        permissions: hasKey
          ? current.permissions.filter((permission) => permission !== key)
          : [...current.permissions, key],
      }
    })
  }

  function setFeaturePermissions(featureKey: string, enabled: boolean) {
    const keys = [`${featureKey}.read`, `${featureKey}.write`]
    setRoleForm((current) => ({
      ...current,
      permissions: enabled
        ? Array.from(new Set([...current.permissions, ...keys]))
        : current.permissions.filter((permission) => !keys.includes(permission)),
    }))
  }

  function editRole(role: AdminRole) {
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isActive: role.isActive,
    })
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const { error } = await invokeAdminAccess({
        action: 'upsert_role',
        role: roleForm,
      })
      if (error) throw error
      setRoleForm(emptyRoleForm)
      setNotice('Rôle enregistré.')
      await loadAccess()
    } catch (error) {
      setError(
        await resolveAdminAccessError(
          error,
          'Impossible d’enregistrer le rôle.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function saveAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canWrite) return
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const { error } = await invokeAdminAccess({
        action: 'create_admin',
        admin: adminForm,
      })
      if (error) throw error
      setAdminForm(emptyAdminForm)
      setNotice('Admin créé avec son rôle.')
      await loadAccess()
    } catch (error) {
      setError(
        await resolveAdminAccessError(
          error,
          'Impossible de créer cet admin.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleAdmin(admin: AdminUser) {
    if (!canWrite) return
    setIsSaving(true)
    setError('')
    try {
      const { error } = await invokeAdminAccess({
        action: 'update_admin',
        admin: {
          id: admin.id,
          roleId: admin.roleId,
          isActive: !admin.isActive,
        },
      })
      if (error) throw error
      await loadAccess()
    } catch (error) {
      setError(
        await resolveAdminAccessError(
          error,
          'Impossible de mettre à jour cet admin.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPermissionCount = roleForm.permissions.length
  const selectedReadCount = roleForm.permissions.filter((permission) =>
    permission.endsWith('.read'),
  ).length
  const selectedWriteCount = roleForm.permissions.filter((permission) =>
    permission.endsWith('.write'),
  ).length
  const activeRoles = roles.filter((role) => role.isActive)
  const activeAdmins = admins.filter((admin) => admin.isActive)
  const fullAccessRoles = roles.filter((role) => role.permissions.includes('*'))

  return (
    <SuperAdminLayout
      accessLabel={canWrite ? 'Lecture et écriture' : 'Lecture seule'}
      authRoute={authRoute}
      description="Structure les accès SA par métier, module et niveau d’action."
      eyebrow="Gouvernance"
      navItems={navItems}
      title="Admins, rôles et permissions"
    >

        {error ? (
          <div className="dashboard-alert" role="alert">
            <strong>Erreur</strong>
            <p>{error}</p>
            {isLoading ? null : <button onClick={loadAccess}>Réessayer</button>}
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-alert success" role="status">
            <strong>OK</strong>
            <p>{notice}</p>
          </div>
        ) : null}

        <section className="settings-overview admin-access-overview">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">A</span>
            <small>Administrateurs</small>
            <strong>{activeAdmins.length}/{admins.length}</strong>
            <p>Comptes actifs</p>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">R</span>
            <small>Rôles</small>
            <strong>{activeRoles.length}/{roles.length}</strong>
            <p>Profils activés</p>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">P</span>
            <small>Permissions</small>
            <strong>{allAdminPermissionKeys.length}</strong>
            <p>Permissions lecture/écriture</p>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">∞</span>
            <small>Accès total</small>
            <strong>{fullAccessRoles.length}</strong>
            <p>Rôle(s) wildcard</p>
          </article>
        </section>

        <section className="admin-access-layout">
          <form className="panel admin-access-form admin-access-role-card" onSubmit={saveRole}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Rôles</p>
                <h2>{roleForm.id ? 'Modifier le rôle' : 'Créer un rôle'}</h2>
              </div>
              <div className="admin-access-heading-actions">
                <span className="status-pill active">
                  {selectedPermissionCount} sélectionnée(s)
                </span>
                <button
                  className="secondary-action-button"
                  onClick={() => setRoleForm(emptyRoleForm)}
                  type="button"
                >
                  Nouveau
                </button>
              </div>
            </div>

            <div className="admin-access-form-grid">
              <label>
                <span>Nom du rôle</span>
                <input
                  disabled={!canWrite}
                  onChange={(event) =>
                    setRoleForm({ ...roleForm, name: event.target.value })
                  }
                  placeholder="Ex: Modérateur QL"
                  value={roleForm.name}
                />
              </label>

              <label>
                <span>Statut</span>
                <select
                  disabled={!canWrite}
                  onChange={(event) =>
                    setRoleForm({
                      ...roleForm,
                      isActive: event.target.value === 'active',
                    })
                  }
                  value={roleForm.isActive ? 'active' : 'inactive'}
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </label>
            </div>

            <label>
              <span>Description</span>
              <textarea
                disabled={!canWrite}
                onChange={(event) =>
                  setRoleForm({ ...roleForm, description: event.target.value })
                }
                placeholder="Ce rôle peut gérer les Quiz Live et lire les joueurs."
                rows={3}
                value={roleForm.description}
              />
            </label>

            <div className="admin-permission-toolbar">
              <div>
                <strong>Carte des permissions</strong>
                <span>
                  {selectedReadCount} lecture · {selectedWriteCount} écriture
                </span>
              </div>
              <div>
                <button
                  className="table-action-button"
                  disabled={!canWrite}
                  onClick={() =>
                    setRoleForm({
                      ...roleForm,
                      permissions: allAdminPermissionKeys,
                    })
                  }
                  type="button"
                >
                  Tout cocher
                </button>
                <button
                  className="table-action-button"
                  disabled={!canWrite}
                  onClick={() =>
                    setRoleForm({
                      ...roleForm,
                      permissions: [],
                    })
                  }
                  type="button"
                >
                  Vider
                </button>
              </div>
            </div>

            <div className="admin-permission-list">
              {adminPermissionDefinitions.map((permission) => {
                const canRead = roleForm.permissions.includes(permission.readKey)
                const canWritePermission = roleForm.permissions.includes(permission.writeKey)
                const accessLabel = canRead && canWritePermission
                  ? 'Complet'
                  : canRead
                    ? 'Lecture'
                    : canWritePermission
                      ? 'Écriture'
                      : 'Aucun'
                return (
                  <article
                    className={`admin-permission-row ${
                      canRead || canWritePermission ? 'selected' : ''
                    }`}
                    key={permission.key}
                  >
                    <div className="admin-permission-copy">
                      <span>{permission.label.slice(0, 1).toUpperCase()}</span>
                      <div>
                      <strong>{permission.label}</strong>
                      <p>{permission.description}</p>
                      </div>
                    </div>
                    <div className="admin-permission-actions">
                      <em className={canRead || canWritePermission ? 'active' : 'muted'}>
                        {accessLabel}
                      </em>
                      <label>
                        <input
                          checked={canRead}
                          disabled={!canWrite}
                          onChange={() => togglePermission(permission.readKey)}
                          type="checkbox"
                        />
                        Lecture
                      </label>
                      <label>
                        <input
                          checked={canWritePermission}
                          disabled={!canWrite}
                          onChange={() => togglePermission(permission.writeKey)}
                          type="checkbox"
                        />
                        Écriture
                      </label>
                      <button
                        className="table-action-button"
                        disabled={!canWrite}
                        onClick={() =>
                          setFeaturePermissions(
                            permission.key,
                            !(canRead && canWritePermission),
                          )
                        }
                        type="button"
                      >
                        Tout
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="form-footer">
              <span>
                {roleForm.id ? 'Les changements seront appliqués au rôle.' : 'Le rôle sera disponible immédiatement.'}
              </span>
              <button
                className="inline-action-button"
                disabled={!canWrite || isSaving || roleForm.name.trim().length < 2}
                type="submit"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer le rôle'}
              </button>
            </div>
          </form>

          <div className="admin-access-stack">
            <form className="panel admin-access-form admin-access-admin-card" onSubmit={saveAdmin}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Comptes</p>
                  <h2>Créer un admin</h2>
                </div>
              </div>

              <label>
                <span>Email</span>
                <input
                  disabled={!canWrite}
                  inputMode="email"
                  onChange={(event) =>
                    setAdminForm({ ...adminForm, email: event.target.value })
                  }
                  placeholder="admin@megapromo.ci"
                  type="email"
                  value={adminForm.email}
                />
              </label>

              <label>
                <span>Nom affiché</span>
                <input
                  disabled={!canWrite}
                  onChange={(event) =>
                    setAdminForm({ ...adminForm, username: event.target.value })
                  }
                  placeholder="Nom de l’admin"
                  value={adminForm.username}
                />
              </label>

              <label>
                <span>Mot de passe temporaire</span>
                <input
                  disabled={!canWrite}
                  minLength={8}
                  onChange={(event) =>
                    setAdminForm({ ...adminForm, password: event.target.value })
                  }
                  placeholder="8 caractères minimum"
                  type="password"
                  value={adminForm.password}
                />
              </label>

              <label>
                <span>Rôle</span>
                <select
                  disabled={!canWrite}
                  onChange={(event) =>
                    setAdminForm({ ...adminForm, roleId: event.target.value })
                  }
                  value={adminForm.roleId}
                >
                  <option value="">Sélectionner un rôle</option>
                  {activeRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="inline-action-button"
                disabled={
                  !canWrite ||
                  isSaving ||
                  !adminForm.email.includes('@') ||
                  adminForm.password.length < 8 ||
                  !adminForm.roleId
                }
                type="submit"
              >
                {isSaving ? 'Création...' : 'Créer l’admin'}
              </button>
            </form>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Rôles existants</p>
                  <h2>{roles.length} rôle(s)</h2>
                </div>
              </div>
              <div className="admin-access-list">
                {roles.map((role) => (
                  <button
                    className={`admin-access-item ${roleForm.id === role.id ? 'selected' : ''}`}
                    key={role.id}
                    onClick={() => editRole(role)}
                    type="button"
                  >
                    <span>
                      <strong>{role.name}</strong>
                      <small>
                        {role.isSystem ? 'Système · ' : ''}
                        {role.permissions.includes('*')
                          ? 'Accès total permanent'
                          : `${role.permissions.length} permission(s)`}
                      </small>
                    </span>
                    <em className={role.isActive ? 'active' : 'inactive'}>
                      {role.isActive ? 'Actif' : 'Inactif'}
                    </em>
                  </button>
                ))}
                {!isLoading && roles.length === 0 ? (
                  <p className="empty-state">Aucun rôle configuré.</p>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Admins</p>
                  <h2>{admins.length} compte(s)</h2>
                </div>
                <button
                  className="secondary-action-button"
                  onClick={() => navigate(settingsRoute)}
                  type="button"
                >
                  Paramètres
                </button>
              </div>
              <div className="admin-access-list">
                {admins.map((admin) => (
                  <article className="admin-access-item static" key={admin.id}>
                    <div className="admin-access-user">
                      <span>{(admin.username || admin.email || 'A').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{admin.username || admin.email}</strong>
                        <small>{admin.email} · {admin.roleName || 'Sans rôle'}</small>
                      </div>
                    </div>
                    <button
                      className="table-action-button"
                      disabled={!canWrite || isSaving}
                      onClick={() => toggleAdmin(admin)}
                      type="button"
                    >
                      {admin.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </article>
                ))}
                {!isLoading && admins.length === 0 ? (
                  <p className="empty-state">Aucun admin secondaire.</p>
                ) : null}
              </div>
            </section>
          </div>
        </section>
    </SuperAdminLayout>
  )
}
