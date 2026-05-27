import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type CategoriesNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminCategoriesPageProps = { authRoute: string; rootRoute: string; navItems: CategoriesNavItem[] }
type CategoryItem = {
  id: string
  name: string
  contests: number
  color: string
  description: string
  isActive: boolean
}
type CategoryFormState = Pick<CategoryItem, 'name' | 'color' | 'description'>

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(value) }
function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); const value = char === 'x' ? random : (random & 0x3) | 0x8; return value.toString(16) }) }
function getVisibleCategoryNavItems(permissions: string[] | undefined, navItems: CategoriesNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
async function fetchCategoriesData(): Promise<CategoryItem[]> {
  const [categoriesResponse, contestCategoriesResponse] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, description, color, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('contests').select('category_id'),
  ])

  if (categoriesResponse.error) throw categoriesResponse.error
  if (contestCategoriesResponse.error) throw contestCategoriesResponse.error

  const contestsByCategory = new Map<string, number>()
  for (const contest of contestCategoriesResponse.data ?? []) {
    const categoryId = contest.category_id as string | null
    if (!categoryId) continue
    contestsByCategory.set(categoryId, (contestsByCategory.get(categoryId) ?? 0) + 1)
  }

  return (categoriesResponse.data ?? []).map((category) => ({
    id: category.id as string,
    name: (category.name as string | null) ?? 'Catégorie',
    description: (category.description as string | null) ?? '',
    color: (category.color as string | null) || '#6b7fff',
    contests: contestsByCategory.get(category.id as string) ?? 0,
    isActive: (category.is_active as boolean | null) ?? true,
  }))
}


export function SuperAdminCategoriesPage({ authRoute, rootRoute, navItems }: SuperAdminCategoriesPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const pageSize = 10
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoryModalMode, setCategoryModalMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: '',
    color: '#6b7fff',
    description: '',
  })
  const [categoryError, setCategoryError] = useState('')
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [categoryPage, setCategoryPage] = useState(0)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  const filteredCategories = useMemo(() => {
    const normalizedSearch = categorySearch.trim().toLowerCase()

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedSearch ||
        [category.name, category.description]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      const matchesStatus =
        categoryStatusFilter === 'all' ||
        (categoryStatusFilter === 'active' && category.isActive) ||
        (categoryStatusFilter === 'inactive' && !category.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categories, categorySearch, categoryStatusFilter])

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  )
  const paginatedCategories = useMemo(() => {
    const startIndex = categoryPage * pageSize
    return filteredCategories.slice(startIndex, startIndex + pageSize)
  }, [categoryPage, filteredCategories])
  const categoryResultsStart =
    filteredCategories.length === 0 ? 0 : categoryPage * pageSize + 1
  const categoryResultsEnd = Math.min(
    filteredCategories.length,
    categoryPage * pageSize + paginatedCategories.length,
  )
  const categoryPaginationPages = useMemo(() => {
    const firstPage = Math.max(0, categoryPage - 2)
    const lastPage = Math.min(totalCategoryPages - 1, firstPage + 4)
    const normalizedFirstPage = Math.max(0, Math.min(firstPage, lastPage - 4))
    return Array.from(
      { length: lastPage - normalizedFirstPage + 1 },
      (_, index) => normalizedFirstPage + index,
    )
  }, [categoryPage, totalCategoryPages])

  useEffect(() => {
    setCategoryPage(0)
  }, [categorySearch, categoryStatusFilter])

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true)
    setCategoriesError('')

    try {
      const nextCategories = await fetchCategoriesData()
      setCategories(nextCategories)
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les catégories.',
      )
    } finally {
      setIsCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void fetchCategoriesData()
      .then((nextCategories) => {
        if (isMounted) setCategories(nextCategories)
      })
      .catch((error) => {
        if (!isMounted) return
        setCategoriesError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les catégories.',
        )
      })
      .finally(() => {
        if (isMounted) setIsCategoriesLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  function openCreateCategory() {
    setCategoryError('')
    setSelectedCategoryId(null)
    setCategoryForm({ name: '', color: '#6b7fff', description: '' })
    setCategoryModalMode('create')
  }

  function openEditCategory(category: CategoryItem) {
    setCategoryError('')
    setSelectedCategoryId(category.id)
    setCategoryForm({
      name: category.name,
      color: category.color,
      description: category.description,
    })
    setCategoryModalMode('edit')
  }

  function closeCategoryModal() {
    if (isSavingCategory) return
    setCategoryModalMode(null)
    setSelectedCategoryId(null)
    setCategoryError('')
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCategoryError('')
    const name = categoryForm.name.trim()
    const description = categoryForm.description.trim()

    if (name.length < 2) {
      setCategoryError('Le nom doit contenir au moins 2 caractères.')
      return
    }

    const duplicate = categories.some((category) => {
      return (
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== selectedCategoryId
      )
    })

    if (duplicate) {
      setCategoryError('Une catégorie avec ce nom existe déjà.')
      return
    }

    setIsSavingCategory(true)

    try {
      const payload = {
        name,
        description,
        color: categoryForm.color,
      }

      if (categoryModalMode === 'edit' && selectedCategoryId) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', selectedCategoryId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert({
          ...payload,
          id: createClientUuid(),
          is_active: true,
        })

        if (error) throw error
      }

      await loadCategories()
      closeCategoryModal()
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer cette catégorie.',
      )
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleDeleteCategory(category: CategoryItem) {
    const message =
      category.contests > 0
        ? `Supprimer la catégorie "${category.name}" ? Les ${category.contests} concours liés seront dissociés de cette catégorie.`
        : `Supprimer la catégorie "${category.name}" ?`
    const confirmed = window.confirm(message)
    if (!confirmed) return

    setCategoriesError('')

    try {
      if (category.contests > 0) {
        const { error: unlinkError } = await supabase
          .from('contests')
          .update({ category_id: null })
          .eq('category_id', category.id)

        if (unlinkError) throw unlinkError
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      await loadCategories()
    } catch (error) {
      setCategoriesError(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer cette catégorie.',
      )
    }
  }

  function handleCategoryTableAction(category: CategoryItem, action: string) {
    if (action === 'edit') {
      openEditCategory(category)
      return
    }

    if (action === 'delete') {
      void handleDeleteCategory(category)
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
          {getVisibleCategoryNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleCategoryNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Catalogue</span>
          <strong>{categories.length} catégories</strong>
          <p>Organise les concours pour faciliter le pilotage et le filtrage mobile.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1>Catégories</h1>
            <p className="page-subtitle">
              Crée et maintiens les familles de concours utilisées dans MegaPromo.
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
            <button
              className="primary-button"
              onClick={openCreateCategory}
              type="button"
            >
              Nouvelle catégorie
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {categoriesError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Catégories indisponibles</strong>
              <p>{categoriesError}</p>
            </div>
            <button onClick={loadCategories} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRUD</p>
              <h2>Liste des catégories</h2>
            </div>
            <span className="pill">
              {isCategoriesLoading
                ? 'Chargement'
                : `${paginatedCategories.length} / ${filteredCategories.length}`}
            </span>
          </div>

          <div className="contest-filter-bar compact">
            <input
              className="search-input"
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Rechercher une catégorie"
              type="search"
              value={categorySearch}
            />
            <select
              aria-label="Filtrer les catégories par statut"
              onChange={(event) =>
                setCategoryStatusFilter(
                  event.target.value as 'all' | 'active' | 'inactive',
                )
              }
              value={categoryStatusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>

          <div className="premium-category-table">
            <div className="premium-category-head">
              <span></span>
              <span>Catégorie</span>
              <span>Concours</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {paginatedCategories.length > 0 ? (
              paginatedCategories.map((category) => (
                <div className="premium-category-row" key={category.id}>
                  <span
                    className="category-color-dot"
                    style={{ background: category.color }}
                  />
                  <div>
                    <strong>{category.name}</strong>
                    <p>{category.description || 'Aucune description'}</p>
                  </div>
                  <small>{category.contests} concours</small>
                  <span className={`status-pill ${category.isActive ? 'active' : 'inactive'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="table-actions compact">
                    <select
                      aria-label={`Actions pour ${category.name}`}
                      className="table-action-select"
                      onChange={(event) => {
                        handleCategoryTableAction(category, event.target.value)
                        event.currentTarget.value = ''
                      }}
                      value=""
                    >
                      <option value="">Actions</option>
                      <option value="edit">Modifier</option>
                      <option value="delete">Supprimer</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCategoriesLoading
                  ? 'Chargement des catégories...'
                  : 'Aucune catégorie ne correspond aux filtres.'}
              </p>
            )}
          </div>

          <div className="pagination-row">
            <span>
              {formatNumber(categoryResultsStart)}-{formatNumber(categoryResultsEnd)} sur{' '}
              {formatNumber(filteredCategories.length)}
            </span>
            <div className="pagination-controls">
              <button
                className="table-action-button"
                disabled={categoryPage === 0 || isCategoriesLoading}
                onClick={() => setCategoryPage(0)}
                type="button"
              >
                Première
              </button>
              <button
                className="table-action-button"
                disabled={categoryPage === 0 || isCategoriesLoading}
                onClick={() => setCategoryPage((page) => Math.max(0, page - 1))}
                type="button"
              >
                Précédent
              </button>
              <div className="pagination-pages">
                {categoryPaginationPages.map((page) => (
                  <button
                    className={`pagination-page-button ${page === categoryPage ? 'active' : ''}`}
                    disabled={isCategoriesLoading}
                    key={page}
                    onClick={() => setCategoryPage(page)}
                    type="button"
                  >
                    {page + 1}
                  </button>
                ))}
              </div>
              <button
                className="table-action-button"
                disabled={categoryPage + 1 >= totalCategoryPages || isCategoriesLoading}
                onClick={() =>
                  setCategoryPage((page) => Math.min(totalCategoryPages - 1, page + 1))
                }
                type="button"
              >
                Suivant
              </button>
              <button
                className="table-action-button"
                disabled={categoryPage + 1 >= totalCategoryPages || isCategoriesLoading}
                onClick={() => setCategoryPage(totalCategoryPages - 1)}
                type="button"
              >
                Dernière
              </button>
            </div>
          </div>
        </section>
      </section>

      {categoryModalMode ? (
        <CategoryModal
          error={categoryError}
          form={categoryForm}
          isSaving={isSavingCategory}
          mode={categoryModalMode}
          onChange={setCategoryForm}
          onClose={closeCategoryModal}
          onSubmit={handleCategorySubmit}
        />
      ) : null}
    </main>
  )
}


function CategoryModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: CategoryFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: CategoryFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-label={mode === 'create' ? 'Créer une catégorie' : 'Modifier la catégorie'}
        className="category-modal"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Catégories</p>
            <h2>
              {mode === 'create' ? 'Nouvelle catégorie' : 'Modifier catégorie'}
            </h2>
          </div>
          <button
            aria-label="Fermer"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="category-form" onSubmit={onSubmit}>
          <label>
            <span>Nom</span>
            <input
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Ex: Beauté"
              value={form.name}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Courte description de la catégorie"
              rows={4}
              value={form.description}
            />
          </label>

          <label>
            <span>Couleur</span>
            <div className="color-input-row">
              <input
                aria-label="Couleur"
                onChange={(event) =>
                  onChange({ ...form, color: event.target.value })
                }
                type="color"
                value={form.color}
              />
              <input
                onChange={(event) =>
                  onChange({ ...form, color: event.target.value })
                }
                value={form.color}
              />
            </div>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              className="secondary-action-button"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-action-button"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer'
                  : 'Enregistrer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
