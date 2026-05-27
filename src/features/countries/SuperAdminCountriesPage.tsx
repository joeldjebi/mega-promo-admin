import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { adminRoleLabel } from '../../auth/admin-auth'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { hasAdminPermission } from '../adminAccess/permissions'
import { supabase } from '../../lib/supabase'

type CountriesNavItem = { label: string; href: string; icon: string; permission: string }
type SuperAdminCountriesPageProps = { authRoute: string; rootRoute: string; navItems: CountriesNavItem[] }
type CountryItem = {
  id: string
  flag: string
  phoneDigits: number
  name: string
  dialCode: string
  isActive: boolean
  createdAt: string
}
type CountryFormState = {
  flag: string
  phoneDigits: string
  name: string
  dialCode: string
  isActive: boolean
}

function createClientUuid() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => { const random = Math.floor(Math.random() * 16); const value = char === 'x' ? random : (random & 0x3) | 0x8; return value.toString(16) }) }
function getVisibleCountryNavItems(permissions: string[] | undefined, navItems: CountriesNavItem[]) { return navItems.filter((item) => hasAdminPermission(permissions, item.permission, 'read')) }
async function fetchCountriesData(): Promise<CountryItem[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, flag, phone_digits, name, dial_code, is_active, created_at')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((country) => ({
    id: country.id as string,
    flag: (country.flag as string | null) ?? '',
    phoneDigits: (country.phone_digits as number | null) ?? 0,
    name: (country.name as string | null) ?? '',
    dialCode: (country.dial_code as string | null) ?? '',
    isActive: (country.is_active as boolean | null) ?? false,
    createdAt: (country.created_at as string | null) ?? '',
  }))
}


export function SuperAdminCountriesPage({ authRoute, rootRoute, navItems }: SuperAdminCountriesPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [isCountriesLoading, setIsCountriesLoading] = useState(true)
  const [countriesError, setCountriesError] = useState('')
  const [countryModalMode, setCountryModalMode] = useState<
    'create' | 'edit' | null
  >(null)
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null)
  const [countryForm, setCountryForm] = useState<CountryFormState>({
    flag: 'orange-white-green',
    phoneDigits: '10',
    name: '',
    dialCode: '+225',
    isActive: true,
  })
  const [countryError, setCountryError] = useState('')
  const [isSavingCountry, setIsSavingCountry] = useState(false)

  const loadCountries = useCallback(async () => {
    setIsCountriesLoading(true)
    setCountriesError('')

    try {
      setCountries(await fetchCountriesData())
    } catch (error) {
      setCountriesError(
        error instanceof Error ? error.message : 'Impossible de charger les pays.',
      )
    } finally {
      setIsCountriesLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCountries()
  }, [loadCountries])

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  function openCreateCountry() {
    setCountryError('')
    setSelectedCountryId(null)
    setCountryForm({
      flag: 'orange-white-green',
      phoneDigits: '10',
      name: '',
      dialCode: '+225',
      isActive: true,
    })
    setCountryModalMode('create')
  }

  function openEditCountry(country: CountryItem) {
    setCountryError('')
    setSelectedCountryId(country.id)
    setCountryForm({
      flag: country.flag,
      phoneDigits: String(country.phoneDigits || ''),
      name: country.name,
      dialCode: country.dialCode,
      isActive: country.isActive,
    })
    setCountryModalMode('edit')
  }

  function closeCountryModal() {
    if (isSavingCountry) return
    setCountryModalMode(null)
    setSelectedCountryId(null)
    setCountryError('')
  }

  async function handleCountrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCountryError('')

    const name = countryForm.name.trim()
    const dialCode = countryForm.dialCode.trim()
    const phoneDigits = Number(countryForm.phoneDigits)

    if (name.length < 2) {
      setCountryError('Le nom du pays doit contenir au moins 2 caractères.')
      return
    }

    if (!dialCode.startsWith('+') || dialCode.length < 2) {
      setCountryError('L’indicatif doit commencer par +, exemple +225.')
      return
    }

    if (!Number.isInteger(phoneDigits) || phoneDigits < 4 || phoneDigits > 15) {
      setCountryError('Le nombre de chiffres doit être entre 4 et 15.')
      return
    }

    const duplicate = countries.some((country) => {
      return (
        (country.name.toLowerCase() === name.toLowerCase() ||
          country.dialCode === dialCode) &&
        country.id !== selectedCountryId
      )
    })

    if (duplicate) {
      setCountryError('Un pays avec ce nom ou cet indicatif existe déjà.')
      return
    }

    setIsSavingCountry(true)

    try {
      const payload = {
        flag: countryForm.flag.trim() || 'custom',
        phone_digits: phoneDigits,
        name,
        dial_code: dialCode,
        is_active: countryForm.isActive,
      }

      if (countryModalMode === 'edit' && selectedCountryId) {
        const { error } = await supabase
          .from('countries')
          .update(payload)
          .eq('id', selectedCountryId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('countries').insert({
          ...payload,
          id: createClientUuid(),
        })
        if (error) throw error
      }

      await loadCountries()
      closeCountryModal()
    } catch (error) {
      setCountryError(
        error instanceof Error ? error.message : 'Impossible d’enregistrer ce pays.',
      )
    } finally {
      setIsSavingCountry(false)
    }
  }

  async function handleToggleCountry(country: CountryItem) {
    const { error } = await supabase
      .from('countries')
      .update({ is_active: !country.isActive })
      .eq('id', country.id)

    if (error) {
      setCountriesError(error.message)
      return
    }

    await loadCountries()
  }

  async function handleDeleteCountry(country: CountryItem) {
    const confirmed = window.confirm(`Supprimer le pays "${country.name}" ?`)
    if (!confirmed) return

    const { error } = await supabase.from('countries').delete().eq('id', country.id)
    if (error) {
      setCountriesError(error.message)
      return
    }

    await loadCountries()
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
          {getVisibleCountryNavItems(adminAuth.profile?.permissions, navItems).slice(0, 6).map((item) => (
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
          {getVisibleCountryNavItems(adminAuth.profile?.permissions, navItems).slice(6).map((item) => (
            <NavLink to={item.href} key={item.label}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Territoires</span>
          <strong>{countries.length} pays</strong>
          <p>Contrôle les indicatifs et longueurs de numéros autorisés.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1>Pays</h1>
            <p className="page-subtitle">
              Manage les pays disponibles à l’inscription mobile.
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
            <button className="primary-button" onClick={openCreateCountry} type="button">
              Nouveau pays
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {countriesError ? (
          <div className="dashboard-alert" role="alert">
            <div>
              <strong>Pays indisponibles</strong>
              <p>{countriesError}</p>
            </div>
            <button onClick={loadCountries} type="button">
              Réessayer
            </button>
          </div>
        ) : null}

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CRUD</p>
              <h2>Liste des pays</h2>
            </div>
            <span className="pill">
              {isCountriesLoading ? 'Chargement' : `${countries.length} entrées`}
            </span>
          </div>

          <div className="category-table countries-table">
            {countries.length > 0 ? (
              countries.map((country) => (
                <article className="category-table-row country-table-row" key={country.id}>
                  <CountryFlagPreview flag={country.flag} />
                  <div>
                    <strong>{country.name}</strong>
                    <p>
                      {country.dialCode} · {country.phoneDigits} chiffres
                    </p>
                  </div>
                  <span className={`status-pill ${country.isActive ? 'active' : 'inactive'}`}>
                    {country.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <div className="table-action-row">
                    <button onClick={() => openEditCountry(country)} type="button">
                      Modifier
                    </button>
                    <button onClick={() => handleToggleCountry(country)} type="button">
                      {country.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="table-action-button danger"
                      onClick={() => handleDeleteCountry(country)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-panel-text">
                {isCountriesLoading ? 'Chargement des pays...' : 'Aucun pays créé.'}
              </p>
            )}
          </div>
        </section>
      </section>

      {countryModalMode ? (
        <CountryModal
          error={countryError}
          form={countryForm}
          isSaving={isSavingCountry}
          mode={countryModalMode}
          onChange={setCountryForm}
          onClose={closeCountryModal}
          onSubmit={handleCountrySubmit}
        />
      ) : null}
    </main>
  )
}


function CountryFlagPreview({ flag }: { flag: string }) {
  if (flag === 'orange-white-green') {
    return (
      <span className="country-flag-preview" aria-label="Drapeau Côte d'Ivoire">
        <span style={{ background: '#ff8200' }} />
        <span style={{ background: '#ffffff' }} />
        <span style={{ background: '#009a44' }} />
      </span>
    )
  }

  return <span className="country-flag-code">{flag || 'flag'}</span>
}

function CountryModal({
  error,
  form,
  isSaving,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string
  form: CountryFormState
  isSaving: boolean
  mode: 'create' | 'edit'
  onChange: (next: CountryFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Pays" className="category-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Pays</p>
            <h2>{mode === 'create' ? 'Nouveau pays' : 'Modifier pays'}</h2>
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
              placeholder="Cote d'Ivoire"
              value={form.name}
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              <span>Indicatif</span>
              <input
                onChange={(event) =>
                  onChange({ ...form, dialCode: event.target.value })
                }
                placeholder="+225"
                value={form.dialCode}
              />
            </label>

            <label>
              <span>Nombre de chiffres</span>
              <input
                inputMode="numeric"
                onChange={(event) =>
                  onChange({ ...form, phoneDigits: event.target.value })
                }
                type="number"
                value={form.phoneDigits}
              />
            </label>
          </div>

          <label>
            <span>Flag</span>
            <input
              onChange={(event) => onChange({ ...form, flag: event.target.value })}
              placeholder="orange-white-green"
              value={form.flag}
            />
          </label>

          <label className="check-row">
            <input
              checked={form.isActive}
              onChange={(event) =>
                onChange({ ...form, isActive: event.target.checked })
              }
              type="checkbox"
            />
            <span>Pays actif</span>
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
            <button className="inline-action-button" disabled={isSaving} type="submit">
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
