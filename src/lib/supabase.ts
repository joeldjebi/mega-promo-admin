import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'placeholder-anon-key'

if (!isSupabaseConfigured) {
  console.warn(
    '[MegaPromo][Supabase] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes.',
  )
}

type AdminPermissionAction = 'read' | 'write'

let currentAdminPermissions: string[] | null = null

export const adminPermissionDeniedEvent = 'megapromo:admin-permission-denied'

const tablePermissionFeatures: Record<string, string> = {
  app_feature_flags: 'settings',
  app_update_config: 'settings',
  badges: 'users',
  categories: 'categories',
  contest_draw_settings: 'contests',
  contest_predictions: 'contests',
  contests: 'contests',
  countries: 'countries',
  landing_contact_settings: 'landing',
  landing_page_content: 'landing',
  legal_pages: 'settings',
  mobile_info_messages: 'settings',
  notifications: 'notifications',
  partner_plan_benefits: 'plans',
  partner_plans: 'plans',
  partner_sectors: 'sectors',
  partner_subscriptions: 'partners',
  partners: 'partners',
  participations: 'users',
  payment_methods: 'settings',
  player_kyc_requests: 'users',
  player_plan_benefits: 'plans',
  player_plans: 'plans',
  player_subscriptions: 'users',
  question_bank_categories: 'contests',
  question_banks: 'contests',
  questions: 'contests',
  reward_catalog: 'reward_catalog',
  reward_types: 'reward_catalog',
  user_badges: 'users',
  users: 'users',
  winners: 'winners',
}

const rpcPermissionFeatures: Record<string, string> = {
  admin_assign_player_subscription: 'users',
  admin_delete_player_subscription: 'users',
  admin_anonymize_user_now: 'users',
  admin_hard_delete_user_now: 'users',
  admin_delete_all_sentry_issue_snapshots: 'system_logs',
  admin_delete_all_system_logs: 'system_logs',
  admin_maintenance_clear: 'maintenance',
  admin_purge_system_logs: 'system_logs',
  admin_run_system_logs_maintenance: 'system_logs',
  admin_upsert_system_logs_maintenance: 'system_logs',
  admin_update_player_subscription_status: 'users',
  admin_schedule_user_deletion: 'users',
  get_system_logs_maintenance_status: 'system_logs',
  upsert_landing_maintenance_flag: 'landing',
  delete_reward_catalog_item: 'reward_catalog',
  delete_reward_type: 'reward_catalog',
  disable_reward_catalog_item: 'reward_catalog',
  disable_reward_type: 'reward_catalog',
  generate_pending_winners_for_contest: 'winners',
  admin_get_contest_history_questions: 'contests',
  admin_get_participation_questions: 'contests',
  republish_completed_jcq: 'contests',
  upsert_reward_catalog_item: 'reward_catalog',
  upsert_reward_type: 'reward_catalog',
}

function hasPermission(
  permissions: string[] | null,
  feature: string,
  action: AdminPermissionAction,
) {
  if (!permissions) return true
  if (permissions.includes('*')) return true
  return permissions.includes(`${feature}.${action}`)
}

function assertCanWrite(feature: string, label: string) {
  if (hasPermission(currentAdminPermissions, feature, 'write')) return
  const message = `Permission ${feature}.write requise pour modifier ${label}.`
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(adminPermissionDeniedEvent, {
        detail: {
          feature,
          label,
          message,
        },
      }),
    )
  }
  throw new Error(message)
}

export function setSupabaseAdminPermissions(permissions: string[] | null) {
  currentAdminPermissions = permissions
}

const rawSupabase = createClient(
  supabaseUrl ?? fallbackSupabaseUrl,
  supabaseAnonKey ?? fallbackSupabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
)

export const supabase = new Proxy(rawSupabase, {
  get(target, property, receiver) {
    if (property === 'from') {
      return (table: string) => {
        const builder = target.from(table)
        const feature = tablePermissionFeatures[table]
        if (!feature) return builder

        return new Proxy(builder, {
          get(builderTarget, builderProperty, builderReceiver) {
            if (
              builderProperty === 'insert' ||
              builderProperty === 'update' ||
              builderProperty === 'upsert' ||
              builderProperty === 'delete'
            ) {
              const original = Reflect.get(
                builderTarget,
                builderProperty,
                builderReceiver,
              ) as (...args: unknown[]) => unknown
              return (...args: unknown[]) => {
                assertCanWrite(feature, table)
                return original.apply(builderTarget, args)
              }
            }

            return Reflect.get(builderTarget, builderProperty, builderReceiver)
          },
        })
      }
    }

    if (property === 'rpc') {
      return (functionName: string, params?: unknown, options?: unknown) => {
        const feature = rpcPermissionFeatures[functionName]
        if (feature) assertCanWrite(feature, functionName)
        const rpc = target.rpc as (
          name: string,
          args?: unknown,
          rpcOptions?: unknown,
        ) => unknown
        return rpc.call(target, functionName, params, options)
      }
    }

    return Reflect.get(target, property, receiver)
  },
})
