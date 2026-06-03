import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
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
  questionsPerQuiz: number
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
  questionsPerQuiz: string
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
  questionsPerQuiz: '3',
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

const CATEGORY_QUESTIONS_PAGE_SIZE = 8
const csvQuestionColumns = [
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'points',
  'time_limit',
  'difficulty',
]

function normalizeText(value: string) {
  return value.trim()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function formatMissingBankLabel(bankId: string) {
  if (!bankId) return 'Banque non liée'
  return `Banque introuvable (${bankId.slice(0, 8)}...)`
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let isQuoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]
    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }
    if (char === '"') {
      isQuoted = !isQuoted
      continue
    }
    if (char === ',' && !isQuoted) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function readCsvField(row: Record<string, string>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== '') return value
  }
  return fallback
}

function parseQuestionCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const firstRow = parseCsvLine(lines[0]).map(normalizeCsvHeader)
  const hasHeader = firstRow.some((column) =>
    ['question_text', 'question', 'option_a', 'reponse_a', 'answer_a'].includes(column),
  )
  const headers = hasHeader ? firstRow : csvQuestionColumns
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines
    .map((line) => {
      const values = parseCsvLine(line)
      return headers.reduce<Record<string, string>>((row, header, index) => {
        row[header] = values[index]?.trim() ?? ''
        return row
      }, {})
    })
    .map((row) => ({
      questionText: readCsvField(row, ['question_text', 'question', 'libelle', 'question_text_fr']),
      optionA: readCsvField(row, ['option_a', 'reponse_a', 'answer_a', 'a']),
      optionB: readCsvField(row, ['option_b', 'reponse_b', 'answer_b', 'b']),
      optionC: readCsvField(row, ['option_c', 'reponse_c', 'answer_c', 'c']),
      optionD: readCsvField(row, ['option_d', 'reponse_d', 'answer_d', 'd']),
      correctAnswer: readCsvField(row, ['correct_answer', 'bonne_reponse', 'answer', 'correct'], 'A')
        .slice(0, 1)
        .toUpperCase(),
      points: Number(readCsvField(row, ['points'], '10')) || 10,
      timeLimit: Number(readCsvField(row, ['time_limit', 'temps_limite', 'seconds'], '20')) || 20,
      difficulty: readCsvField(row, ['difficulty', 'difficulte', 'niveau']),
    }))
    .filter(
      (question) =>
        question.questionText &&
        question.optionA &&
        question.optionB &&
        question.optionC &&
        question.optionD &&
        ['A', 'B', 'C', 'D'].includes(question.correctAnswer),
    )
}

async function loadQuestionBankData() {
  const [banksResponse, categoriesResponse, linksResponse, questionsResponse] =
    await Promise.all([
      supabase
        .from('question_banks')
        .select('id, name, description, questions_per_quiz, is_active, created_at')
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
    questionsPerQuiz: Number(bank.questions_per_quiz ?? 3),
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
  const categoryQuestionEditPanelRef = useRef<HTMLFormElement | null>(null)
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [bankForm, setBankForm] = useState<BankForm>(emptyBankForm)
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryQuestionsPage, setCategoryQuestionsPage] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [isBankFormVisible, setIsBankFormVisible] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [csvImportBankIds, setCsvImportBankIds] = useState<string[]>([])
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const [csvImportSummary, setCsvImportSummary] = useState('')

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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const questionFormBank = useMemo(
    () => banks.find((bank) => bank.id === questionForm.bankId) ?? null,
    [banks, questionForm.bankId],
  )

  const bankQuestions = useMemo(() => {
    if (!selectedBankId) return []
    return questions.filter((question) => question.bankId === selectedBankId)
  }, [questions, selectedBankId])

  const missingQuestionBankIds = useMemo(() => {
    const readableBankIds = new Set(banks.map((bank) => bank.id))
    return Array.from(
      new Set(
        questions
          .map((question) => question.bankId)
          .filter((bankId) => bankId && !readableBankIds.has(bankId)),
      ),
    )
  }, [banks, questions])

  const selectedCategoryQuestions = useMemo(() => {
    if (!selectedCategoryId) return []
    return questions.filter((question) => question.categoryId === selectedCategoryId)
  }, [questions, selectedCategoryId])

  const categoryQuestionsPageCount = Math.max(
    Math.ceil(selectedCategoryQuestions.length / CATEGORY_QUESTIONS_PAGE_SIZE),
    1,
  )
  const currentCategoryQuestionsPage = Math.min(
    categoryQuestionsPage,
    categoryQuestionsPageCount,
  )

  const paginatedCategoryQuestions = useMemo(() => {
    const start = (currentCategoryQuestionsPage - 1) * CATEGORY_QUESTIONS_PAGE_SIZE
    return selectedCategoryQuestions.slice(start, start + CATEGORY_QUESTIONS_PAGE_SIZE)
  }, [currentCategoryQuestionsPage, selectedCategoryQuestions])

  const bankCategorySummaries = useMemo(
    () =>
      categories
        .map((category) => {
          const linkedBanks = banks.filter((bank) => bank.categoryIds.includes(category.id))
          const categoryQuestions = questions.filter((question) => question.categoryId === category.id)
          if (linkedBanks.length === 0 && categoryQuestions.length === 0) return null
          return {
            id: category.id,
            name: category.name,
            banks: linkedBanks,
            questionsCount: categoryQuestions.length,
          }
        })
        .filter((summary): summary is NonNullable<typeof summary> => Boolean(summary)),
    [banks, categories, questions],
  )

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
      setCsvImportBankIds((current) => {
        const validIds = current.filter((bankId) =>
          data.banks.some((bank) => bank.id === bankId),
        )
        return validIds.length > 0 ? validIds : validSelected ? [validSelected] : []
      })
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
    let isCancelled = false
    window.queueMicrotask(() => {
      if (isCancelled) return
      void refreshData()
    })
    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAuth.status, canRead])

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
      questionsPerQuiz: String(bank.questionsPerQuiz || 3),
      categoryIds: bank.categoryIds,
      isActive: bank.isActive,
    })
    window.setTimeout(() => {
      bankFormPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      bankNameInputRef.current?.focus()
    }, 40)
  }

  function startCreateQuestion(bankId = selectedBankId) {
    const bank = banks.find((item) => item.id === bankId)
    if (!bank) {
      setError('Sélectionne une banque avant d’ajouter une question.')
      return
    }
    setError('')
    setSelectedBankId(bank.id)
    setSelectedCategoryId(bank.categoryIds[0] ?? selectedCategoryId)
    setQuestionForm({
      ...emptyQuestionForm,
      bankId: bank.id,
      categoryId: bank?.categoryIds[0] ?? '',
    })
    setIsQuestionModalOpen(true)
  }

  function cancelQuestionEdit() {
    setIsQuestionModalOpen(false)
    const bank = banks.find((item) => item.id === selectedBankId)
    setQuestionForm({
      ...emptyQuestionForm,
      bankId: selectedBankId,
      categoryId: bank?.categoryIds[0] ?? '',
    })
  }

  function selectBank(bank: QuestionBank) {
    setSelectedBankId(bank.id)
    setSelectedCategoryId(bank.categoryIds[0] ?? selectedCategoryId)
    setQuestionForm({
      ...emptyQuestionForm,
      bankId: bank.id,
      categoryId: bank.categoryIds[0] ?? '',
    })
  }

  function selectQuestionCategory(categoryId: string) {
    setSelectedCategoryId(categoryId)
    const firstBank = banks.find((bank) => bank.categoryIds.includes(categoryId))
    if (firstBank) {
      setSelectedBankId(firstBank.id)
      setQuestionForm({
        ...emptyQuestionForm,
        bankId: firstBank.id,
        categoryId,
      })
      return
    }
    setSelectedBankId('')
    setQuestionForm({
      ...emptyQuestionForm,
      categoryId,
    })
  }

  function startEditQuestion(question: BankQuestion) {
    const questionBank = banks.find((bank) => bank.id === question.bankId)
    const categoryBank = question.categoryId
      ? banks.find((bank) => bank.categoryIds.includes(question.categoryId))
      : null
    const editableBank = questionBank ?? categoryBank ?? null
    if (editableBank) {
      setSelectedBankId(editableBank.id)
      setSelectedCategoryId(question.categoryId || editableBank.categoryIds[0] || selectedCategoryId)
    }
    setQuestionForm({
      id: question.id,
      bankId: editableBank?.id ?? question.bankId,
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
    setIsQuestionModalOpen(true)
    window.setTimeout(() => {
      categoryQuestionEditPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      categoryQuestionEditPanelRef.current?.querySelector('textarea')?.focus()
    }, 40)
  }

  function updateQuestionBank(bankId: string) {
    const nextBank = banks.find((bank) => bank.id === bankId)
    setQuestionForm((current) => {
      const categoryStillAllowed =
        !current.categoryId || nextBank?.categoryIds.includes(current.categoryId)
      return {
        ...current,
        bankId,
        categoryId: categoryStillAllowed ? current.categoryId : nextBank?.categoryIds[0] ?? '',
      }
    })
    if (nextBank) {
      setSelectedBankId(nextBank.id)
      setSelectedCategoryId(nextBank.categoryIds[0] ?? selectedCategoryId)
    }
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

  function toggleCsvImportBank(bankId: string) {
    setCsvImportSummary('')
    setCsvImportBankIds((current) =>
      current.includes(bankId)
        ? current.filter((id) => id !== bankId)
        : [...current, bankId],
    )
  }

  async function importQuestionsFromCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const targetBanks = banks.filter((bank) => csvImportBankIds.includes(bank.id))
    if (targetBanks.length === 0) {
      setError('Sélectionne au moins une banque avant de charger le CSV.')
      return
    }

    setIsImportingCsv(true)
    setError('')
    setCsvImportSummary('')
    try {
      const csvText = await file.text()
      const parsedQuestions = parseQuestionCsv(csvText)
      if (parsedQuestions.length === 0) {
        setError(
          'Aucune question valide trouvée. Colonnes attendues: question_text, option_a, option_b, option_c, option_d, correct_answer, points, time_limit, difficulty.',
        )
        return
      }

      const payload = targetBanks.flatMap((bank) => {
        const categoryId = bank.categoryIds[0] ?? null
        return parsedQuestions.map((question, index) => ({
          contest_id: null,
          question_bank_id: bank.id,
          category_id: categoryId,
          question_scope: 'bank',
          question_text: question.questionText,
          option_a: question.optionA,
          option_b: question.optionB,
          option_c: question.optionC,
          option_d: question.optionD,
          correct_answer: question.correctAnswer,
          points: Math.max(question.points, 0),
          time_limit: Math.max(question.timeLimit, 5),
          order_index: index + 1,
          difficulty: question.difficulty || null,
          is_active: true,
        }))
      })

      const { error: insertError } = await supabase.from('questions').insert(payload)
      if (insertError) throw insertError

      setCsvImportSummary(
        `${formatNumber(payload.length)} question(s) importée(s) dans ${formatNumber(
          targetBanks.length,
        )} banque(s).`,
      )
      await refreshData(targetBanks[0]?.id ?? selectedBankId)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import CSV impossible.')
    } finally {
      setIsImportingCsv(false)
    }
  }

  async function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = normalizeText(bankForm.name)
    const questionsPerQuiz = Number(bankForm.questionsPerQuiz)
    if (!name) {
      setError('Le nom de la banque est obligatoire.')
      return
    }
    if (!Number.isFinite(questionsPerQuiz) || questionsPerQuiz < 1 || questionsPerQuiz > 50) {
      setError('Le nombre de questions par JCQ doit être compris entre 1 et 50.')
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
        questions_per_quiz: Math.round(questionsPerQuiz),
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
    if (!banks.some((bank) => bank.id === questionForm.bankId)) {
      setError('Sélectionne une banque lisible avant d’enregistrer cette question.')
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
      const wasEditing = Boolean(questionForm.id)
      const nextBankId = questionForm.bankId
      const nextCategoryId = questionForm.categoryId
      if (wasEditing) {
        const { error: updateError } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', questionForm.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('questions').insert(payload)
        if (insertError) throw insertError
      }
      await refreshData(nextBankId)
      if (wasEditing) {
        setIsQuestionModalOpen(false)
        setQuestionForm({
          ...emptyQuestionForm,
          bankId: nextBankId,
          categoryId: nextCategoryId,
        })
      } else {
        setQuestionForm({
          ...emptyQuestionForm,
          bankId: nextBankId,
          categoryId: nextCategoryId,
        })
      }
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

        {missingQuestionBankIds.length > 0 ? (
          <div className="form-error" role="alert">
            {formatNumber(missingQuestionBankIds.length)} banque(s) référencée(s) par
            des questions sont introuvables dans le catalogue. Vérifie que les seeds
            des banques ont été exécutés sur le même Supabase que cette interface.
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

        <section className="panel categories-page-panel question-bank-category-summary-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Familles liées</p>
              <h2>Catégories des banques</h2>
              <p className="section-helper">
                Vue par catégorie des banques de questions utilisées pour générer les JCQ.
              </p>
            </div>
            <span className="pill">
              {isLoading ? 'Chargement' : `${bankCategorySummaries.length} catégorie(s)`}
            </span>
          </div>

          {isLoading ? (
            <p className="empty-panel-text">Chargement des catégories...</p>
          ) : bankCategorySummaries.length === 0 ? (
            <div className="question-bank-catalog-empty">
              <strong>Aucune catégorie liée aux banques</strong>
              <p>
                Les questions existent peut-être sans catégorie associée. Vérifie que
                les seeds de banques ont bien créé les liens avec les catégories.
              </p>
            </div>
          ) : (
            <div className="question-bank-category-summary-grid">
              {bankCategorySummaries.map((summary) => (
                <article
                  className={`question-bank-category-summary-card ${
                    summary.id === selectedCategoryId ? 'selected' : ''
                  }`}
                  key={summary.id}
                  onClick={() => selectQuestionCategory(summary.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectQuestionCategory(summary.id)
                    }
                  }}
                >
                  <div>
                    <span>{summary.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{summary.name}</strong>
                      <small>
                        {formatNumber(summary.questionsCount)} question(s)
                      </small>
                    </div>
                  </div>
                  <p>
                    {summary.banks.length > 0
                      ? summary.banks
                          .map(
                            (bank) =>
                              `${bank.name} · ${formatNumber(bank.questionsPerQuiz)} question(s)/JCQ`,
                          )
                          .join(' · ')
                      : 'Questions détectées, banque introuvable dans le catalogue'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel categories-page-panel">

          {selectedCategory ? (
            <div className="question-bank-category-question-list">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Questions de catégorie</p>
                  <h3>{selectedCategory.name}</h3>
                  <p className="section-helper">
                    Questions qui peuvent être tirées par les JCQ liés à cette catégorie.
                  </p>
                </div>
                <span className="pill">
                  {formatNumber(selectedCategoryQuestions.length)} question(s)
                </span>
              </div>

              <div className="premium-contest-table question-bank-question-table">
                <div className="premium-contest-head">
                  <span>Question</span>
                  <span>Réponse</span>
                  <span>Banque</span>
                  <span>Statut</span>
                  <span>Actions</span>
                </div>
                {selectedCategoryQuestions.length === 0 ? (
                  <p className="empty-panel-text">
                    Aucune question enregistrée pour cette catégorie.
                  </p>
                ) : (
                  paginatedCategoryQuestions.map((question) => {
                    const questionBank = banks.find((bank) => bank.id === question.bankId)
                    return (
                      <div className="premium-contest-row" key={question.id}>
                        <div>
                          <strong>{question.questionText}</strong>
                          <p>
                            {question.points} pts · {question.timeLimit}s ·{' '}
                            {question.difficulty || 'niveau libre'}
                          </p>
                        </div>
                        <span>{question.correctAnswer}</span>
                        <span>{questionBank?.name ?? formatMissingBankLabel(question.bankId)}</span>
                        <span className={`status-pill ${question.isActive ? 'active' : 'inactive'}`}>
                          {question.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="table-actions compact">
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => {
                              if (questionBank) selectBank(questionBank)
                              startEditQuestion(question)
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            className="table-action-button danger"
                            type="button"
                            onClick={() => void deleteQuestion(question)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {selectedCategoryQuestions.length > CATEGORY_QUESTIONS_PAGE_SIZE ? (
                <div className="pagination-row">
                  <span>
                    Page {currentCategoryQuestionsPage} / {categoryQuestionsPageCount} ·{' '}
                    {formatNumber(selectedCategoryQuestions.length)} question(s)
                  </span>
                  <div className="pagination-controls">
                    <button
                      className="pagination-page-button"
                      type="button"
                      disabled={currentCategoryQuestionsPage <= 1}
                      onClick={() => setCategoryQuestionsPage((current) => Math.max(current - 1, 1))}
                    >
                      Précédent
                    </button>
                    <div className="pagination-pages">
                      {Array.from({ length: categoryQuestionsPageCount }, (_, index) => index + 1).map(
                        (page) => (
                          <button
                            className={`pagination-page-button ${
                              page === currentCategoryQuestionsPage ? 'active' : ''
                            }`}
                            key={page}
                            type="button"
                            onClick={() => setCategoryQuestionsPage(page)}
                          >
                            {page}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      className="pagination-page-button"
                      type="button"
                      disabled={currentCategoryQuestionsPage >= categoryQuestionsPageCount}
                      onClick={() =>
                        setCategoryQuestionsPage((current) =>
                          Math.min(current + 1, categoryQuestionsPageCount),
                        )
                      }
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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
                {formatNumber(selectedBank.questionsPerQuiz)} question(s) envoyée(s) par JCQ
              </small>
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
                  <button
                    className="question-bank-secondary-action"
                    type="button"
                    onClick={() => startEditBank(selectedBank)}
                  >
                    Modifier sélection
                  </button>
                ) : null}
                {selectedBank ? (
                  <button
                    className="question-bank-secondary-action"
                    type="button"
                    onClick={() => startCreateQuestion(selectedBank.id)}
                  >
                    Ajouter une question
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

            <div className="question-bank-csv-import-panel">
              <div className="question-bank-csv-import-heading">
                <div>
                  <span className="eyebrow">Import CSV</span>
                  <strong>Ajouter plusieurs questions</strong>
                  <p>
                    Sélectionne une ou plusieurs banques, puis charge un CSV. Les
                    questions seront ajoutées dans chaque banque sélectionnée.
                  </p>
                </div>
                <label className={`question-bank-secondary-action ${isImportingCsv ? 'disabled' : ''}`}>
                  {isImportingCsv ? 'Import en cours...' : 'Charger un CSV'}
                  <input
                    accept=".csv,text/csv"
                    disabled={isImportingCsv}
                    type="file"
                    onChange={importQuestionsFromCsv}
                  />
                </label>
              </div>

              <div className="question-bank-csv-bank-picker">
                {banks.map((bank) => (
                  <label
                    className={csvImportBankIds.includes(bank.id) ? 'selected' : ''}
                    key={bank.id}
                  >
                    <input
                      type="checkbox"
                      checked={csvImportBankIds.includes(bank.id)}
                      onChange={() => toggleCsvImportBank(bank.id)}
                    />
                    <span>
                      <strong>{bank.name}</strong>
                      <small>
                        {formatNumber(bank.questionsPerQuiz)} question(s) par JCQ ·{' '}
                        {bank.categoryIds
                          .map((categoryId) => categoriesById.get(categoryId))
                          .filter(Boolean)
                          .join(' · ') || 'Catégorie libre'}
                      </small>
                    </span>
                  </label>
                ))}
              </div>

              <p className="question-bank-csv-helper">
                Colonnes acceptées: question_text, option_a, option_b, option_c,
                option_d, correct_answer, points, time_limit, difficulty.
              </p>
              {csvImportSummary ? (
                <div className="form-success" role="status">
                  {csvImportSummary}
                </div>
              ) : null}
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
              <label>
                Questions envoyées par JCQ
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={bankForm.questionsPerQuiz}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      questionsPerQuiz: event.target.value,
                    }))
                  }
                  placeholder="3"
                />
              </label>

              <div className="question-bank-category-association-card">
                <div className="question-bank-field-heading">
                  <div>
                    <span className="eyebrow">Routage des JCQ</span>
                    <strong>Catégories associées</strong>
                    <span>
                      Les JCQ de ces catégories pourront tirer leurs questions dans cette banque.
                    </span>
                  </div>
                  <div className="question-bank-category-actions">
                    <small>
                      {formatNumber(bankForm.categoryIds.length)} / {formatNumber(categories.length)} liées
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
                  {categories.map((category) => {
                    const isSelected = bankForm.categoryIds.includes(category.id)
                    return (
                      <label className={isSelected ? 'selected' : ''} key={category.id}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBankCategory(category.id)}
                        />
                        <span className="question-bank-category-mark">
                          {category.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="question-bank-category-copy">
                          <strong>{category.name}</strong>
                          <small>{isSelected ? 'Associée à cette banque' : 'Disponible'}</small>
                        </span>
                      </label>
                    )
                  })}
                </div>
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
                  Ouvre le formulaire pour modifier les catégories d’une banque ou
                  importer des questions par fichier CSV.
                </p>
              </div>
              <div className="contest-actions">
                <button className="primary-button" type="button" onClick={startCreateBank}>
                  Créer une banque
                </button>
                {selectedBank ? (
                  <button
                    className="question-bank-secondary-action"
                    type="button"
                    onClick={() => startEditBank(selectedBank)}
                  >
                    Modifier sélection
                  </button>
                ) : null}
                {selectedBank ? (
                  <button
                    className="question-bank-secondary-action"
                    type="button"
                    onClick={() => startCreateQuestion(selectedBank.id)}
                  >
                    Ajouter une question
                  </button>
                ) : null}
              </div>
            </section>
          )}

        </div>
      </section>

      {isQuestionModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={cancelQuestionEdit}>
          <section
            className="contest-modal question-bank-question-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-bank-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">{questionForm.id ? 'Modification' : 'Nouvelle question'}</span>
                <h2 id="question-bank-edit-title">
                  {questionForm.id ? 'Mettre à jour la question' : 'Ajouter une question'}
                </h2>
                <p className="modal-subtitle">
                  {questionFormBank?.name ?? 'Banque de questions'} ·{' '}
                  {categoriesById.get(questionForm.categoryId) ?? 'Catégorie libre'}
                </p>
              </div>
              <button type="button" onClick={cancelQuestionEdit} aria-label="Fermer">
                ×
              </button>
            </div>

            <form
              className="category-form contest-form question-bank-question-form is-editing"
              ref={categoryQuestionEditPanelRef}
              onSubmit={saveQuestion}
            >
              <div className="question-bank-editing-banner">
                <div>
                  <span className="eyebrow">Question sélectionnée</span>
                  <strong>
                    {questionForm.id
                      ? 'Modifie le libellé, les réponses ou les paramètres de jeu.'
                      : 'Ajoute une question, puis enregistre pour saisir la suivante.'}
                  </strong>
                </div>
              </div>

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
                  Banque de questions
                  <select
                    value={questionForm.bankId}
                    onChange={(event) => updateQuestionBank(event.target.value)}
                  >
                    <option value="">Sélectionner une banque</option>
                    {questionForm.bankId && !questionFormBank ? (
                      <option value={questionForm.bankId} disabled>
                        {formatMissingBankLabel(questionForm.bankId)} - à remplacer
                      </option>
                    ) : null}
                    {banks.length === 0 ? (
                      <option value="" disabled>
                        Aucune banque lisible
                      </option>
                    ) : null}
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                    {(questionFormBank?.categoryIds.length
                      ? questionFormBank.categoryIds
                      : categories.map((category) => category.id)
                    ).map((categoryId) => (
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

              <div className="modal-actions">
                <button className="primary-button" type="submit" disabled={isSavingQuestion}>
                  {isSavingQuestion
                    ? 'Enregistrement...'
                    : questionForm.id
                      ? 'Mettre à jour la question'
                      : 'Enregistrer et ajouter une autre'}
                </button>
                <button className="table-action-button" type="button" onClick={cancelQuestionEdit}>
                  Annuler
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
