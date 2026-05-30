export type AdminPermissionAction = 'read' | 'write'

export type AdminPermissionFeature = {
  key: string
  label: string
  description: string
}

export type AdminPermissionDefinition = AdminPermissionFeature & {
  readKey: string
  writeKey: string
}

export const adminPermissionFeatures: AdminPermissionFeature[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Vue globale, indicateurs et activité récente.',
  },
  {
    key: 'users',
    label: 'Joueurs',
    description: 'Profils joueurs, KYC, moyens de paiement et détails.',
  },
  {
    key: 'partners',
    label: 'Partenaires',
    description: 'Comptes partenaires, accès et validation.',
  },
  {
    key: 'contests',
    label: 'Concours et QL',
    description: 'Création, édition, historique et pilotage des jeux.',
  },
  {
    key: 'categories',
    label: 'Catégories',
    description: 'Organisation des concours par catégorie.',
  },
  {
    key: 'countries',
    label: 'Pays',
    description: 'Pays, indicatifs et formats de numéros.',
  },
  {
    key: 'sectors',
    label: 'Secteurs',
    description: 'Secteurs partenaires et regroupements métiers.',
  },
  {
    key: 'plans',
    label: 'Forfaits',
    description: 'Forfaits joueurs et abonnements partenaires.',
  },
  {
    key: 'winners',
    label: 'Gagnants',
    description: 'Gains, statuts, paiements et remise des récompenses.',
  },
  {
    key: 'reward_catalog',
    label: 'Catalogue des gains',
    description: 'Types de gains, lots et stock disponible.',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Messages in-app, push mobile et SMS.',
  },
  {
    key: 'landing',
    label: 'Landing',
    description: 'Contenu public, messages et contacts.',
  },
  {
    key: 'settings',
    label: 'Paramètres',
    description: 'Configuration opérationnelle du back-office.',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Actions sensibles et nettoyage des données.',
  },
  {
    key: 'system_logs',
    label: 'Logs système',
    description: 'Observabilité, audit et événements techniques/métier.',
  },
  {
    key: 'admin_access',
    label: 'Admins et permissions',
    description: 'Rôles, permissions et comptes administrateurs.',
  },
]

export const adminPermissionDefinitions: AdminPermissionDefinition[] =
  adminPermissionFeatures.map((feature) => ({
    ...feature,
    readKey: `${feature.key}.read`,
    writeKey: `${feature.key}.write`,
  }))

export const allAdminPermissionKeys = adminPermissionDefinitions.flatMap(
  (feature) => [feature.readKey, feature.writeKey],
)

export function permissionKey(
  feature: string,
  action: AdminPermissionAction,
) {
  return `${feature}.${action}`
}

export function hasAdminPermission(
  permissions: string[] | null | undefined,
  feature: string,
  action: AdminPermissionAction = 'read',
) {
  if (!permissions) return false
  if (permissions.includes('*')) return true
  return permissions.includes(permissionKey(feature, action))
}
