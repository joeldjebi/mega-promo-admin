import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, NavLink, useNavigate } from 'react-router-dom'

import { hasAdminPermission } from '../adminAccess/permissions'
import { useAdminAuth } from '../../auth/useAdminAuth'
import { supabase } from '../../lib/supabase'

type QuestionBanksNavItem = {
  label: string
  href: string
  icon: string
  permission?: string
}

type SuperAdminQuestionBanksPageProps = {
  authRoute: string
  rootRoute: string
  navItems: QuestionBanksNavItem[]
}

type CategoryOption = {
  id: string
  name: string
}

type QuestionBank = {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  categoryIds: string[]
  questionsCount: number
}

type BankQuestion = {
  id: string
  bankId: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  points: number
  timeLimit: number
  isActive: boolean
  difficulty: string
  categoryId: string
}

type BankForm = {
  id: string
  name: string
  description: string
  categoryIds: string[]
  isActive: boolean
}

type QuestionForm = {
  id: string
  bankId: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  points: string
  timeLimit: string
  difficulty: string
  categoryId: string
  isActive: boolean
}

const emptyBankForm: BankForm = {
  id: '',
  name: '',
  description: '',
  categoryIds: [],
  isActive: true,
}

const emptyQuestionForm: QuestionForm = {
  id: '',
  bankId: '',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  points: '10',
  timeLimit: '20',
  difficulty: '',
  categoryId: '',
  isActive: true,
}

function normalizeText(value: string) {
  return value.trim()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

async function loadQuestionBankData() {
  const [banksResponse, categoriesResponse, linksResponse, questionsResponse] =
    await Promise.all([
      supabase
        .from('question_banks')
        .select('id, name, description, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase.from('question_bank_categories').select('question_bank_id, category_id'),
      supabase
        .from('questions')
        .select(
          'id, question_bank_id, category_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points, time_limit, is_active, difficulty',
        )
        .not('question_bank_id', 'is', null)
        .order('created_at', { ascending: false }),
    ])

  if (banksResponse.error) throw banksResponse.error
  if (categoriesResponse.error) throw categoriesResponse.error
  if (linksResponse.error) throw linksResponse.error
  if (questionsResponse.error) throw questionsResponse.error

  const categoryIdsByBank = new Map<string, string[]>()
  for (const link of linksResponse.data ?? []) {
    const bankId = link.question_bank_id as string | null
    const categoryId = link.category_id as string | null
    if (!bankId || !categoryId) continue
    categoryIdsByBank.set(bankId, [...(categoryIdsByBank.get(bankId) ?? []), categoryId])
  }

  const questionsCountByBank = new Map<string, number>()
  for (const question of questionsResponse.data ?? []) {
    const bankId = question.question_bank_id as string | null
    if (!bankId) continue
    questionsCountByBank.set(bankId, (questionsCountByBank.get(bankId) ?? 0) + 1)
  }

  const banks: QuestionBank[] = (banksResponse.data ?? []).map((bank) => ({
    id: bank.id as string,
    name: (bank.name as string | null) ?? 'Banque',
    description: (bank.description as string | null) ?? '',
    isActive: (bank.is_active as boolean | null) ?? true,
    createdAt: (bank.created_at as string | null) ?? '',
    categoryIds: categoryIdsByBank.get(bank.id as string) ?? [],
    questionsCount: questionsCountByBank.get(bank.id as string) ?? 0,
  }))

  const categories: CategoryOption[] = (categoriesResponse.data ?? []).map((category) => ({
    id: category.id as string,
    name: (category.name as string | null) ?? 'Catégorie',
  }))

  const questions: BankQuestion[] = (questionsResponse.data ?? []).map((question) => ({
    id: question.id as string,
    bankId: (question.question_bank_id as string | null) ?? '',
    questionText: (question.question_text as string | null) ?? '',
    optionA: (question.option_a as string | null) ?? '',
    optionB: (question.option_b as string | null) ?? '',
    optionC: (question.option_c as string | null) ?? '',
    optionD: (question.option_d as string | null) ?? '',
    correctAnswer: (question.correct_answer as string | null) ?? 'A',
    points: Number(question.points ?? 10),
    timeLimit: Number(question.time_limit ?? 20),
    isActive: (question.is_active as boolean | null) ?? true,
    difficulty: (question.difficulty as string | null) ?? '',
    categoryId: (question.category_id as string | null) ?? '',
  }))

  return { banks, categories, questions }
}

export function SuperAdminQuestionBanksPage({
  authRoute,
  rootRoute,
  navItems,
}: SuperAdminQuestionBanksPageProps) {
  const adminAuth = useAdminAuth()
  const navigate = useNavigate()
  const adminName = adminAuth.profile?.username ?? adminAuth.user?.email ?? 'Admin'
  const bankFormPanelRef = useRef<HTMLElement | null>(null)
  const bankNameInputRef = useRef<HTMLInputElement | null>(null)
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [bankForm, setBankForm] = useState<BankForm>(emptyBankForm)
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [isBankFormVisible, setIsBankFormVisible] = useState(false)

  const canRead = hasAdminPermission(adminAuth.profile?.permissions, 'contests', 'read')
  const visibleNavItems = useMemo(
    () =>
      navItems.filter((item) =>
        item.permission
          ? hasAdminPermission(adminAuth.profile?.permissions, item.permission, 'read')
          : true,
      ),
    [adminAuth.profile?.permissions, navItems],
  )

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.id === selectedBankId) ?? null,
    [banks, selectedBankId],
  )

  const visibleBanks = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return banks.filter((bank) => {
      const matchesSearch =
        needle.length === 0 ||
        bank.name.toLowerCase().includes(needle) ||
        bank.description.toLowerCase().includes(needle)
      const matchesStatus =
        status === '' ||
        (status === 'active' && bank.isActive) ||
        (status === 'inactive' && !bank.isActive)
      return matchesSearch && matchesStatus
    })
  }, [banks, search, status])

  const bankQuestions = useMemo(() => {
    if (!selectedBankId) return []
    return questions.filter((question) => question.bankId === selectedBankId)
  }, [questions, selectedBankId])

  async function refreshData(nextSelectedBankId = selectedBankId) {
    if (!canRead) return
    setIsLoading(true)
    setError('')
    try {
      const data = await loadQuestionBankData()
      setBanks(data.banks)
      setCategories(data.categories)
      setQuestions(data.questions)
      const validSelected =
        nextSelectedBankId && data.banks.some((bank) => bank.id === nextSelectedBankId)
          ? nextSelectedBankId
          : data.banks[0]?.id ?? ''
      setSelectedBankId(validSelected)
      setQuestionForm((current) => ({
        ...current,
        bankId: validSelected,
        categoryId: current.categoryId || data.banks.find((bank) => bank.id === validSelected)?.categoryIds[0] || '',
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les banques.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (adminAuth.status !== 'authenticated' || !canRead) return
    void refreshData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuth.status, canRead])

  useEffect(() => {
    if (!selectedBankId) return
    const bank = banks.find((item) => item.id === selectedBankId)
    setQuestionForm((current) => ({
      ...current,
      bankId: selectedBankId,
      categoryId: current.categoryId || bank?.categoryIds[0] || '',
    }))
  }, [banks, selectedBankId])

  if (adminAuth.status !== 'loading' && adminAuth.status !== 'authenticated') {
    return <Navigate to={authRoute} replace />
  }
  if (adminAuth.status === 'authenticated' && !canRead) {
    return <Navigate to={rootRoute} replace />
  }

  function startCreateBank() {
    setBankForm(emptyBankForm)
    setSelectedBankId('')
    setQuestionForm(emptyQuestionForm)
    setIsBankFormVisible(true)
    window.setTimeout(() => {
      bankFormPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      bankNameInputRef.current?.focus()
    }, 40)
  }

  function startEditBank(bank: QuestionBank) {
    setIsBankFormVisible(true)
    setSelectedBankId(bank.id)
    setBankForm({
      id: bank.id,
      name: bank.name,
      description: bank.description,
      categoryIds: bank.categoryIds,
      isActive: bank.isActive,
    })
    window.setTimeout(() => {
      bankFormPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      bankNameInputRef.current?.focus()
    }, 40)
  }

  function startCreateQuestion() {
    const bank = banks.find((item) => item.id === selectedBankId)
    setQuestionForm({
      ...emptyQuestionForm,
      bankId: selectedBankId,
      categoryId: bank?.categoryIds[0] ?? '',
    })
  }

  function startEditQuestion(question: BankQuestion) {
    setQuestionForm({
      id: question.id,
      bankId: selectedBankId,
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      points: String(question.points),
      timeLimit: String(question.timeLimit),
      difficulty: question.difficulty,
      categoryId: question.categoryId,
      isActive: question.isActive,
    })
  }

  function toggleBankCategory(categoryId: string) {
    setBankForm((current) => {
      const exists = current.categoryIds.includes(categoryId)
      return {
        ...current,
        categoryIds: exists
          ? current.categoryIds.filter((id) => id !== categoryId)
          : [...current.categoryIds, categoryId],
      }
    })
  }

  function selectAllBankCategories() {
    setBankForm((current) => ({
      ...current,
      categoryIds: categories.map((category) => category.id),
    }))
  }

  function clearBankCategories() {
    setBankForm((current) => ({
      ...current,
      categoryIds: [],
    }))
  }

  async function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = normalizeText(bankForm.name)
    if (!name) {
      setError('Le nom de la banque est obligatoire.')
      return
    }
    if (bankForm.categoryIds.length === 0) {
      setError('Associe au moins une catégorie à cette banque.')
      return
    }

    setIsSavingBank(true)
    setError('')
    try {
      const payload = {
        name,
        description: normalizeText(bankForm.description) || null,
        is_active: bankForm.isActive,
        updated_at: new Date().toISOString(),
      }
      let bankId = bankForm.id
      if (bankId) {
        const { error: updateError } = await supabase
          .from('question_banks')
          .update(payload)
          .eq('id', bankId)
        if (updateError) throw updateError
        await supabase.from('question_bank_categories').delete().eq('question_bank_id', bankId)
      } else {
        const { data, error: insertError } = await supabase
          .from('question_banks')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) throw insertError
        bankId = data.id as string
      }

      const links = bankForm.categoryIds.map((categoryId) => ({
        question_bank_id: bankId,
        category_id: categoryId,
      }))
      const { error: linkError } = await supabase
        .from('question_bank_categories')
        .insert(links)
      if (linkError) throw linkError

      setBankForm(emptyBankForm)
      setIsBankFormVisible(false)
      await refreshData(bankId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la banque.')
    } finally {
      setIsSavingBank(false)
    }
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!questionForm.bankId) {
      setError('Sélectionne une banque avant d’ajouter une question.')
      return
    }
    if (!normalizeText(questionForm.questionText)) {
      setError('La question est obligatoire.')
      return
    }

    setIsSavingQuestion(true)
    setError('')
    try {
      const payload = {
        contest_id: null,
        question_bank_id: questionForm.bankId,
        category_id: questionForm.categoryId || null,
        question_scope: 'bank',
        question_text: normalizeText(questionForm.questionText),
        option_a: normalizeText(questionForm.optionA),
        option_b: normalizeText(questionForm.optionB),
        option_c: normalizeText(questionForm.optionC),
        option_d: normalizeText(questionForm.optionD),
        correct_answer: questionForm.correctAnswer,
        points: Math.max(Number(questionForm.points) || 10, 0),
        time_limit: Math.max(Number(questionForm.timeLimit) || 20, 5),
        difficulty: normalizeText(questionForm.difficulty) || null,
        is_active: questionForm.isActive,
      }
      if (questionForm.id) {
        const { error: updateError } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', questionForm.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('questions').insert(payload)
        if (insertError) throw insertError
      }
      startCreateQuestion()
      await refreshData(questionForm.bankId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la question.')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  async function deleteQuestion(question: BankQuestion) {
    if (!window.confirm('Supprimer cette question de banque ?')) return
    setError('')
    try {
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', question.id)
      if (deleteError) throw deleteError
      await refreshData(selectedBankId)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Suppression impossible.')
    }
  }

  async function handleLogout() {
    await adminAuth.logout()
    navigate(authRoute, { replace: true })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MP</div>
          <div>
            <strong>MegaPromo</strong>
            <small>Super Admin</small>
          </div>
        </div>
        <nav className="nav-list" aria-label="Navigation super admin">
          <span className="nav-section-label">Pilotage</span>
          {visibleNavItems.slice(0, 6).map((item) => (
            <NavLink end={item.href === rootRoute} key={item.href} to={item.href}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <span className="nav-section-label">Système</span>
          {visibleNavItems.slice(6).map((item) => (
            <NavLink end={item.href === rootRoute} key={item.href} to={item.href}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-card">
          <span>Banques</span>
          <strong>{formatNumber(banks.length)} familles</strong>
          <p>Questions mutualisées par catégorie JCQ.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Banques de questions</p>
            <h1>Familles de questions JCQ</h1>
            <p className="page-subtitle">
              Crée des banques réutilisables, relie-les aux catégories, puis ajoute les
              questions que le tirage serveur utilisera automatiquement.
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
            <button className="primary-button" type="button" onClick={startCreateBank}>
              Nouvelle banque
            </button>
            <button className="logout-button" onClick={handleLogout} type="button">
              Déconnexion
            </button>
          </div>
        </header>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <section className="settings-overview question-bank-stats-overview" aria-label="Statistiques des banques de questions">
          <article className="settings-overview-card featured">
            <span className="settings-overview-icon">Q</span>
            <div>
              <small>Banques actives</small>
              <strong>{formatNumber(banks.filter((bank) => bank.isActive).length)}</strong>
              <p>{formatNumber(banks.length)} famille(s) au total.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">?</span>
            <div>
              <small>Questions</small>
              <strong>{formatNumber(questions.length)}</strong>
              <p>Questions mutualisées pour les JCQ.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">C</span>
            <div>
              <small>Catégories liées</small>
              <strong>{formatNumber(new Set(banks.flatMap((bank) => bank.categoryIds)).size)}</strong>
              <p>Catégories branchées sur une banque.</p>
            </div>
          </article>
          <article className="settings-overview-card">
            <span className="settings-overview-icon">S</span>
            <div>
              <small>Sélection</small>
              <strong>{selectedBank ? formatNumber(bankQuestions.length) : '0'}</strong>
              <p>{selectedBank?.name ?? 'Aucune banque sélectionnée'}.</p>
            </div>
          </article>
        </section>

        <section className="panel categories-page-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2>Banques disponibles</h2>
            </div>
            <span className="pill">
              {isLoading ? 'Chargement' : `${visibleBanks.length} / ${banks.length}`}
            </span>
          </div>

          <div className="contest-filter-bar compact">
            <input
              className="search-input"
              type="search"
              placeholder="Rechercher une banque"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>

          <div className="premium-contest-table question-bank-table">
            <div className="premium-contest-head">
              <span>Banque</span>
              <span>Catégories</span>
              <span>Questions</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>
            {isLoading ? (
              <p className="empty-panel-text">Chargement des banques...</p>
            ) : visibleBanks.length === 0 ? (
              <p className="empty-panel-text">Aucune banque ne correspond aux filtres.</p>
            ) : (
              visibleBanks.map((bank) => (
                <div
                  className={`premium-contest-row question-bank-row ${
                    bank.id === selectedBankId ? 'selected' : ''
                  }`}
                  key={bank.id}
                >
                  <div>
                    <strong>{bank.name}</strong>
                    <p>{bank.description || 'Aucune description'}</p>
                  </div>
                  <span>
                    {bank.categoryIds
                      .map((categoryId) => categoriesById.get(categoryId))
                      .filter(Boolean)
                      .join(' · ') || 'Aucune catégorie'}
                  </span>
                  <small>{formatNumber(bank.questionsCount)} question(s)</small>
                  <span className={`status-pill ${bank.isActive ? 'active' : 'inactive'}`}>
                    {bank.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="table-actions compact">
                    <button className="table-action-button" type="button" onClick={() => setSelectedBankId(bank.id)}>
                      Voir
                    </button>
                    <button className="table-action-button" type="button" onClick={() => startEditBank(bank)}>
                      Modifier
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {selectedBank ? (
          <section className="question-bank-selected-panel" aria-label="Banque sélectionnée">
            <div>
              <p className="eyebrow">Banque sélectionnée</p>
              <h2>{selectedBank.name}</h2>
              <p>{selectedBank.description || 'Aucune description définie pour cette banque.'}</p>
            </div>
            <div>
              <span className={`status-pill ${selectedBank.isActive ? 'active' : 'inactive'}`}>
                {selectedBank.isActive ? 'Active' : 'Inactive'}
              </span>
              <strong>{formatNumber(bankQuestions.length)} question(s)</strong>
              <small>
                {selectedBank.categoryIds
                  .map((categoryId) => categoriesById.get(categoryId))
                  .filter(Boolean)
                  .join(' · ') || 'Aucune catégorie'}
              </small>
            </div>
          </section>
        ) : null}

        <div className="question-bank-layout">
          {isBankFormVisible ? (
          <section
            className="panel categories-page-panel question-bank-form-panel question-bank-builder-panel is-open"
            ref={bankFormPanelRef}
          >
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Configuration</span>
                <h2>{bankForm.id ? 'Modifier la banque' : 'Créer une banque'}</h2>
              </div>
              <div className="table-actions compact">
                {selectedBank ? (
                  <button className="ghost-button" type="button" onClick={() => startEditBank(selectedBank)}>
                    Modifier sélection
                  </button>
                ) : null}
                <button className="table-action-button" type="button" onClick={() => setIsBankFormVisible(false)}>
                  Masquer
                </button>
              </div>
            </div>

            <div className="question-bank-form-intro">
              <strong>Famille de questions</strong>
              <p>
                Une banque regroupe des questions réutilisables. Les JCQ des catégories
                liées pourront piocher automatiquement dedans.
              </p>
            </div>

            <form className="category-form contest-form" onSubmit={saveBank}>
              <label>
                Nom de la banque
                <input
                  ref={bankNameInputRef}
                  value={bankForm.name}
                  onChange={(event) => setBankForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Culture ivoirienne, Télécom, Transport..."
                />
              </label>
              <label>
                Description
                <textarea
                  value={bankForm.description}
                  onChange={(event) =>
                    setBankForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Explique à quoi sert cette famille de questions."
                />
              </label>

              <div className="question-bank-field-heading">
                <div>
                  <strong>Catégories associées</strong>
                  <span>
                    Ces catégories de JCQ pourront utiliser les questions de cette banque.
                  </span>
                </div>
                <div className="question-bank-category-actions">
                  <small>
                    {formatNumber(bankForm.categoryIds.length)} / {formatNumber(categories.length)}
                  </small>
                  <button type="button" onClick={selectAllBankCategories}>
                    Tout sélectionner
                  </button>
                  <button type="button" onClick={clearBankCategories}>
                    Vider
                  </button>
                </div>
              </div>
              <div className="question-bank-category-picker">
                {categories.map((category) => (
                  <label
                    className={bankForm.categoryIds.includes(category.id) ? 'selected' : ''}
                    key={category.id}
                  >
                    <input
                      type="checkbox"
                      checked={bankForm.categoryIds.includes(category.id)}
                      onChange={() => toggleBankCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>

              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={bankForm.isActive}
                  onChange={(event) =>
                    setBankForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Banque active
              </label>

              <div className="contest-actions">
                <button className="primary-button" type="submit" disabled={isSavingBank}>
                  {isSavingBank ? 'Enregistrement...' : 'Enregistrer la banque'}
                </button>
              </div>
            </form>
          </section>
          ) : (
            <section className="panel categories-page-panel question-bank-form-panel question-bank-builder-closed">
              <div>
                <span>+</span>
                <strong>Créer ou modifier une banque</strong>
                <p>
                  Ouvre le formulaire pour créer une famille de questions ou modifier
                  la banque sélectionnée dans le tableau.
                </p>
              </div>
              <div className="contest-actions">
                <button className="primary-button" type="button" onClick={startCreateBank}>
                  Créer une banque
                </button>
                {selectedBank ? (
                  <button className="ghost-button" type="button" onClick={() => startEditBank(selectedBank)}>
                    Modifier sélection
                  </button>
                ) : null}
              </div>
            </section>
          )}

          <section className="panel categories-page-panel question-bank-form-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Questions</span>
                <h2>{selectedBank?.name ?? 'Aucune banque sélectionnée'}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={startCreateQuestion} disabled={!selectedBankId}>
                Nouvelle question
              </button>
            </div>

            {!selectedBank ? (
              <div className="question-bank-empty-panel">
                <span>?</span>
                <strong>Sélectionne une banque</strong>
                <p>
                  Choisis une banque dans le tableau pour consulter ses questions ou
                  crée une nouvelle famille avant d’ajouter des questions.
                </p>
                <button className="primary-button" type="button" onClick={startCreateBank}>
                  Créer une banque
                </button>
              </div>
            ) : (
              <>
                <form className="category-form contest-form question-bank-question-form" onSubmit={saveQuestion}>
                  <label>
                    Question
                    <textarea
                      value={questionForm.questionText}
                      onChange={(event) =>
                        setQuestionForm((current) => ({ ...current, questionText: event.target.value }))
                      }
                      placeholder="Ex: Quel service permet..."
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Réponse A
                      <input
                        value={questionForm.optionA}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, optionA: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Réponse B
                      <input
                        value={questionForm.optionB}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, optionB: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Réponse C
                      <input
                        value={questionForm.optionC}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, optionC: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Réponse D
                      <input
                        value={questionForm.optionD}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, optionD: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      Bonne réponse
                      <select
                        value={questionForm.correctAnswer}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, correctAnswer: event.target.value }))
                        }
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </label>
                    <label>
                      Points
                      <input
                        type="number"
                        min="0"
                        value={questionForm.points}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, points: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Temps limite
                      <input
                        type="number"
                        min="5"
                        value={questionForm.timeLimit}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, timeLimit: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Catégorie précise
                      <select
                        value={questionForm.categoryId}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, categoryId: event.target.value }))
                        }
                      >
                        <option value="">Toutes les catégories liées</option>
                        {selectedBank.categoryIds.map((categoryId) => (
                          <option key={categoryId} value={categoryId}>
                            {categoriesById.get(categoryId) ?? 'Catégorie'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      Difficulté
                      <input
                        value={questionForm.difficulty}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, difficulty: event.target.value }))
                        }
                        placeholder="facile, moyen, expert..."
                      />
                    </label>
                    <label className="inline-toggle">
                      <input
                        type="checkbox"
                        checked={questionForm.isActive}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                      Question active
                    </label>
                  </div>
                  <div className="contest-actions">
                    <button className="primary-button" type="submit" disabled={isSavingQuestion || !selectedBankId}>
                      {isSavingQuestion ? 'Enregistrement...' : 'Enregistrer la question'}
                    </button>
                  </div>
                </form>

                <div className="premium-contest-table question-bank-question-table">
                  <div className="premium-contest-head">
                    <span>Question</span>
                    <span>Réponse</span>
                    <span>Catégorie</span>
                    <span>Statut</span>
                    <span>Actions</span>
                  </div>
                  {bankQuestions.length === 0 ? (
                    <p className="empty-state">Aucune question dans cette banque.</p>
                  ) : (
                    bankQuestions.map((question) => (
                      <div className="premium-contest-row" key={question.id}>
                        <div>
                          <strong>{question.questionText}</strong>
                          <p>{question.points} pts · {question.timeLimit}s · {question.difficulty || 'niveau libre'}</p>
                        </div>
                        <span>{question.correctAnswer}</span>
                        <span>{categoriesById.get(question.categoryId) ?? 'Toutes'}</span>
                        <span>{question.isActive ? 'Active' : 'Inactive'}</span>
                        <div className="contest-actions">
                          <button className="ghost-button" type="button" onClick={() => startEditQuestion(question)}>
                            Modifier
                          </button>
                          <button className="danger-button" type="button" onClick={() => void deleteQuestion(question)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
