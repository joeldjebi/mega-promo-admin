import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Action =
  | 'list'
  | 'upsert_role'
  | 'create_admin'
  | 'update_admin'

type AdminAccessPayload = {
  action: Action
  adminAccessToken?: string
  role?: {
    id?: string
    name?: string
    description?: string
    permissions?: string[]
    isActive?: boolean
  }
  admin?: {
    id?: string
    email?: string
    username?: string
    password?: string
    roleId?: string
    isActive?: boolean
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-admin-access-token, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const adminRoles = new Set(['admin', 'super_admin', 'super-admin', 'sa'])

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function badRequest(message: string, status = 400) {
  return jsonResponse({ ok: false, error: message }, status)
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const payload = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }
    const parts = [
      payload.message,
      payload.details,
      payload.hint,
      payload.code ? `Code: ${payload.code}` : '',
    ]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
    if (parts.length > 0) return parts.join(' · ')
  }
  return fallback
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

async function resolveCaller(
  supabaseUrl: string,
  anonKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  authorization: string,
  fallbackToken: string,
) {
  const token = fallbackToken || authorization.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw new Error('Unauthorized: token absent')
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { data: authData, error: authError } =
    await supabaseUser.auth.getUser()

  if (authError || !authData.user) {
    throw new Error(
      `Unauthorized: ${authError?.message ?? 'session invalide'}`,
    )
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, role, is_active, admin_role_id')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) throw profileError

  const role = String(profile?.role ?? '')
  if (!profile || !adminRoles.has(role) || profile.is_active === false) {
    throw new Error('Forbidden')
  }

  if (authData.user.email?.toLowerCase() === 'jo.djebi@gmail.com') {
    return {
      userId: authData.user.id,
      canWrite: true,
    }
  }

  if (!profile.admin_role_id) {
    return {
      userId: authData.user.id,
      canWrite: true,
    }
  }

  const { data: permissionRows, error: permissionError } = await supabaseAdmin
    .from('admin_role_permissions')
    .select('permission_key')
    .eq('role_id', profile.admin_role_id)

  if (permissionError) throw permissionError

  const permissions = new Set(
    (permissionRows ?? []).map((item) => String(item.permission_key)),
  )

  return {
    userId: authData.user.id,
    canWrite:
      permissions.has('*') ||
      permissions.has('admin_access.write'),
  }
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1
  const perPage = 1000

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) throw error

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    )
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }

  return null
}

async function listAccess(supabaseAdmin: ReturnType<typeof createClient>) {
  const [{ data: roles, error: rolesError }, { data: admins, error: adminsError }] =
    await Promise.all([
      supabaseAdmin
        .from('admin_roles')
        .select('id, name, description, is_active, is_system, admin_role_permissions(permission_key)')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('users')
        .select('id, username, role, is_active, admin_role_id, created_at, admin_roles!users_admin_role_id_fkey(name)')
        .in('role', ['admin', 'super_admin', 'super-admin', 'sa'])
        .order('created_at', { ascending: false }),
    ])

  if (rolesError) throw rolesError
  if (adminsError) throw adminsError

  const { data: authUsers, error: authError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authError) throw authError

  const authById = new Map(
    authUsers.users.map((user) => [user.id, user.email ?? '']),
  )

  return {
    roles: (roles ?? []).map((role) => ({
      id: role.id,
      name: role.name ?? '',
      description: role.description ?? '',
      isActive: role.is_active !== false,
      isSystem: role.is_system === true,
      permissions: (role.admin_role_permissions ?? []).map(
        (item: { permission_key: string }) => item.permission_key,
      ),
    })),
    admins: (admins ?? []).map((admin) => ({
      id: admin.id,
      email: authById.get(admin.id) ?? '',
      username: admin.username ?? '',
      roleId: admin.admin_role_id ?? '',
      roleName: admin.admin_roles?.name ?? '',
      isActive: admin.is_active !== false,
      createdAt: admin.created_at ?? '',
    })),
  }
}

async function upsertRoleDirect(
  supabaseAdmin: ReturnType<typeof createClient>,
  callerId: string,
  role: NonNullable<AdminAccessPayload['role']>,
  name: string,
  permissions: string[],
) {
  let roleId = role.id || ''
  if (!roleId) {
    const { data: existingRoles, error: existingRoleError } =
      await supabaseAdmin
        .from('admin_roles')
        .select('id')
        .ilike('name', name)
        .order('created_at', { ascending: true })
        .limit(1)
    if (existingRoleError) throw existingRoleError
    roleId = existingRoles?.[0]?.id ?? crypto.randomUUID()
  }

  const { error: roleError } = await supabaseAdmin
    .from('admin_roles')
    .upsert(
      {
        id: roleId,
        name,
        description: String(role.description ?? '').trim() || null,
        is_active: role.isActive !== false,
        created_by: callerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (roleError) throw roleError

  const { error: deleteError } = await supabaseAdmin
    .from('admin_role_permissions')
    .delete()
    .eq('role_id', roleId)
  if (deleteError) throw deleteError

  if (permissions.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('admin_role_permissions')
      .insert(
        permissions.map((permission) => ({
          role_id: roleId,
          permission_key: permission,
        })),
      )
    if (insertError) throw insertError
  }

  return { ok: true, roleId }
}

async function logSystemEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    level?: 'info' | 'warning' | 'error'
    action: string
    message: string
    adminId?: string | null
    userId?: string | null
    entityType?: string | null
    entityId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  try {
    await supabaseAdmin.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: 'edge_function',
      p_feature: 'admin_access',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: payload.userId ?? null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: payload.entityType ?? null,
      p_entity_id: payload.entityId ?? null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/admin-access',
    })
  } catch (error) {
    console.warn('[MegaPromo][admin-access][systemLogFailed]', error)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return badRequest('Method not allowed', 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return badRequest('Configuration serveur manquante.', 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let payload: AdminAccessPayload
  try {
    payload = (await request.json()) as AdminAccessPayload
  } catch {
    return badRequest('Payload admin invalide.', 400)
  }

  let caller: Awaited<ReturnType<typeof resolveCaller>>
  try {
    caller = await resolveCaller(
      supabaseUrl,
      anonKey,
      supabaseAdmin,
      request.headers.get('Authorization') ?? '',
      request.headers.get('x-admin-access-token') ??
        payload.adminAccessToken ??
        '',
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'unauthorized',
      message: 'Appel non autorise de la fonction admin-access.',
      metadata: {
        reason: message,
        requested_action: payload?.action ?? null,
      },
    })
    return badRequest(message, message === 'Forbidden' ? 403 : 401)
  }

  try {
    if (payload.action === 'list') {
      return jsonResponse(await listAccess(supabaseAdmin))
    }

    if (!caller.canWrite) {
      await logSystemEvent(supabaseAdmin, {
        level: 'warning',
        action: 'permission_denied',
        message: 'Permission admin-access refusee.',
        adminId: caller.userId,
        metadata: { requested_action: payload.action },
      })
      return badRequest('Permission admin_access.write requise.', 403)
    }

    if (payload.action === 'upsert_role') {
      const name = String(payload.role?.name ?? '').trim()
      if (name.length < 2) return badRequest('Le nom du rôle est obligatoire.')

      const permissions = Array.from(
        new Set(
          (payload.role?.permissions ?? [])
            .map((permission) => String(permission).trim())
            .filter(Boolean),
        ),
      )

      const { data: result, error: roleError } = await supabaseAdmin.rpc(
        'upsert_admin_role_with_permissions',
        {
          p_role_id: payload.role?.id || null,
          p_name: name,
          p_description: String(payload.role?.description ?? '').trim() || null,
          p_permissions: permissions,
          p_is_active: payload.role?.isActive !== false,
          p_actor_id: caller.userId,
        },
      )
      if (roleError) {
        const message = errorMessage(roleError, '')
        const rpcMissing =
          message.includes('upsert_admin_role_with_permissions') ||
          message.includes('PGRST202') ||
          message.includes('Could not find the function')
        if (!rpcMissing) throw roleError

        const fallbackResult = await upsertRoleDirect(
          supabaseAdmin,
          caller.userId,
          payload.role ?? {},
          name,
          permissions,
        )
        await logSystemEvent(supabaseAdmin, {
          action: 'upsert_role',
          message: 'Role admin cree ou modifie via fallback direct.',
          adminId: caller.userId,
          entityType: 'admin_role',
          entityId: fallbackResult.roleId,
          metadata: {
            name,
            permissions_count: permissions.length,
            is_active: payload.role?.isActive !== false,
          },
        })
        return jsonResponse(fallbackResult)
      }

      await logSystemEvent(supabaseAdmin, {
        action: 'upsert_role',
        message: 'Role admin cree ou modifie.',
        adminId: caller.userId,
        entityType: 'admin_role',
        entityId: String(
          (result as { roleId?: string; id?: string } | null)?.roleId ??
            payload.role?.id ??
            '',
        ),
        metadata: {
          name,
          permissions_count: permissions.length,
          is_active: payload.role?.isActive !== false,
        },
      })
      return jsonResponse(result ?? { ok: true })
    }

    if (payload.action === 'create_admin') {
      const email = normalizeEmail(payload.admin?.email)
      const username = String(payload.admin?.username ?? '').trim()
      const password = String(payload.admin?.password ?? '').trim()
      const roleId = String(payload.admin?.roleId ?? '').trim()

      if (!email.includes('@')) return badRequest('Email admin invalide.')
      if (password.length < 8) {
        return badRequest('Le mot de passe doit contenir au moins 8 caractères.')
      }
      if (!roleId) return badRequest('Le rôle admin est obligatoire.')

      const { data: role, error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .select('id, is_active')
        .eq('id', roleId)
        .maybeSingle()
      if (roleError) throw roleError
      if (!role || role.is_active === false) {
        return badRequest('Rôle admin introuvable ou inactif.')
      }

      const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email)
      const authResult = existingAuthUser
        ? await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'admin', username },
          })
        : await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'admin', username },
          })

      if (authResult.error) throw authResult.error
      const userId = authResult.data.user?.id
      if (!userId) return badRequest('Compte Auth non créé.', 500)

      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: userId,
            phone: `a_${userId.replaceAll('-', '').slice(0, 18)}`,
            username: username || email,
            role: 'admin',
            admin_role_id: roleId,
            is_active: payload.admin?.isActive !== false,
            points_total: 0,
            participations_today: 0,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
      if (userError) throw userError

      await logSystemEvent(supabaseAdmin, {
        action: 'create_admin',
        message: 'Compte admin cree ou rattache.',
        adminId: caller.userId,
        userId,
        entityType: 'admin_user',
        entityId: userId,
        metadata: {
          role_id: roleId,
          is_active: payload.admin?.isActive !== false,
        },
      })
      return jsonResponse({ ok: true, userId })
    }

    if (payload.action === 'update_admin') {
      const userId = String(payload.admin?.id ?? '').trim()
      const roleId = String(payload.admin?.roleId ?? '').trim() || null
      if (!userId) return badRequest('Admin introuvable.')

      if (userId === caller.userId && payload.admin?.isActive === false) {
        return badRequest('Tu ne peux pas désactiver ton propre compte.')
      }

      const { error } = await supabaseAdmin
        .from('users')
        .update({
          admin_role_id: roleId,
          is_active: payload.admin?.isActive !== false,
        })
        .eq('id', userId)
      if (error) throw error

      await logSystemEvent(supabaseAdmin, {
        action: 'update_admin',
        message: 'Compte admin mis a jour.',
        adminId: caller.userId,
        userId,
        entityType: 'admin_user',
        entityId: userId,
        metadata: {
          role_id: roleId,
          is_active: payload.admin?.isActive !== false,
        },
      })
      return jsonResponse({ ok: true })
    }

    return badRequest('Action inconnue.')
  } catch (error) {
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'action_failed',
      message: 'Echec action admin-access.',
      adminId: caller.userId,
      metadata: {
        requested_action: payload.action,
        error: errorMessage(error, 'Action admin impossible.'),
      },
    })
    return badRequest(errorMessage(error, 'Action admin impossible.'), 500)
  }
})
