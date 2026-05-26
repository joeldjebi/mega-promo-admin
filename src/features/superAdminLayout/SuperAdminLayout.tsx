import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'

export type SuperAdminNavItem = {
  label: string
  href: string
  icon: string
  permission?: string
}

export function SuperAdminLayout({
  navItems,
  authRoute,
  eyebrow,
  title,
  description,
  accessLabel,
  children,
}: {
  navItems: SuperAdminNavItem[]
  authRoute: string
  eyebrow: string
  title: string
  description?: string
  accessLabel?: string
  children: ReactNode
}) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const visibleNavItems = navItems.filter(
    (item) =>
      !item.permission ||
      hasAdminPermission(adminAuth.profile?.permissions, item.permission, 'read'),
  )

  async function logout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {visibleNavItems.slice(0, 6).map((item) => (
            <NavLink
              end={item.href === navItems[0]?.href}
              key={item.href}
              to={item.href}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {visibleNavItems.slice(6).map((item) => (
            <NavLink
              end={item.href === navItems[0]?.href}
              key={item.href}
              to={item.href}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Module actif</span>
          <strong>{eyebrow}</strong>
          <p>{title}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {description ? <p className="page-subtitle">{description}</p> : null}
          </div>

          <div className="topbar-actions">
            <div className="admin-chip">
              <span>{adminName.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{adminName}</strong>
                <small>{accessLabel ?? 'Super Admin'}</small>
              </div>
            </div>
            <button className="logout-button" onClick={logout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        <div className="super-admin-page-content">{children}</div>
      </section>
    </main>
  )
}
