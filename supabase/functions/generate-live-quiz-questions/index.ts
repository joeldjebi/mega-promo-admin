import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type GeneratePayload = {
  category?: string
  topic?: string
  difficulty?: 'facile' | 'moyen' | 'difficile'
  questionCount?: number
  timeLimit?: number
  locale?: string
}

type GeneratedQuestion = {
  question: string
  options: string[]
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
  difficulty: string
  category: string
  time_limit: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function outputTextFromResponse(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text

  const output = payload.output
  if (!Array.isArray(output)) return ''

  for (const item of output) {
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const contentItem of content) {
      const text = (contentItem as { text?: unknown }).text
      if (typeof text === 'string') return text
    }
  }

  return ''
}

function normalizeGeneratedQuestions(
  payload: unknown,
  fallbackCategory: string,
  fallbackDifficulty: string,
  fallbackTimeLimit: number,
) {
  const rawQuestions =
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { questions?: unknown }).questions)
      ? (payload as { questions: unknown[] }).questions
      : []

  return rawQuestions
    .map((item): GeneratedQuestion | null => {
      if (!item || typeof item !== 'object') return null
      const raw = item as Record<string, unknown>
      const options = Array.isArray(raw.options)
        ? raw.options.map((option) => String(option ?? '').trim()).filter(Boolean)
        : []
      const correct = String(raw.correct_answer ?? '').trim().toUpperCase()
      if (
        typeof raw.question !== 'string' ||
        raw.question.trim().length < 8 ||
        options.length !== 4 ||
        !['A', 'B', 'C', 'D'].includes(correct)
      ) {
        return null
      }

      return {
        question: raw.question.trim(),
        options,
        correct_answer: correct as 'A' | 'B' | 'C' | 'D',
        explanation:
          typeof raw.explanation === 'string'
            ? raw.explanation.trim()
            : 'Réponse à vérifier par le Super Admin avant publication.',
        difficulty:
          typeof raw.difficulty === 'string'
            ? raw.difficulty.trim()
            : fallbackDifficulty,
        category:
          typeof raw.category === 'string' ? raw.category.trim() : fallbackCategory,
        time_limit:
          typeof raw.time_limit === 'number'
            ? clamp(Math.round(raw.time_limit), 10, 60)
            : fallbackTimeLimit,
      }
    })
    .filter((item): item is GeneratedQuestion => item !== null)
}

async function logSystemEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    level?: 'info' | 'warning' | 'error'
    action: string
    message: string
    adminId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  try {
    await supabaseAdmin.rpc('log_system_event', {
      p_level: payload.level ?? 'info',
      p_source: 'edge_function',
      p_feature: 'live_quiz_ai',
      p_action: payload.action,
      p_message: payload.message,
      p_user_id: null,
      p_admin_id: payload.adminId ?? null,
      p_partner_id: null,
      p_entity_type: null,
      p_entity_id: null,
      p_metadata: payload.metadata ?? {},
      p_ip_address: null,
      p_user_agent: 'supabase-edge/generate-live-quiz-questions',
    })
  } catch (error) {
    console.warn('[MegaPromo][openaiQuiz][systemLogFailed]', error)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SERVICE_ROLE_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_QUIZ_MODEL') ?? 'gpt-4.1-mini'

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[MegaPromo][openaiQuiz] missing_supabase_configuration', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    })
    return jsonResponse(
      {
        ok: false,
        error:
          'Configuration Supabase manquante. Ajoute SERVICE_ROLE_KEY dans les secrets de la fonction.',
      },
      500,
    )
  }
  if (!openAiKey) {
    console.error('[MegaPromo][openaiQuiz] missing_openai_key')
    return jsonResponse({ ok: false, error: 'OPENAI_API_KEY manquant.' }, 500)
  }

  const authorization = request.headers.get('Authorization') ?? ''
  const token = authorization.replace('Bearer ', '')
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) {
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'unauthorized',
      message: 'Appel non autorise generation questions IA.',
      metadata: { reason: authError?.message ?? 'missing_user' },
    })
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) {
    console.error('[MegaPromo][openaiQuiz] profile_error', profileError)
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'profile_fetch_failed',
      message: 'Echec recuperation profil admin generation IA.',
      adminId: authData.user.id,
      metadata: { error: profileError.message },
    })
    return jsonResponse({ ok: false, error: profileError.message }, 500)
  }

  const role = String(profile?.role ?? '').toLowerCase()
  if (
    !profile ||
    profile.is_active === false ||
    !['admin', 'super-admin', 'super_admin'].includes(role)
  ) {
    console.error('[MegaPromo][openaiQuiz] forbidden', {
      userId: authData.user.id,
      role,
      isActive: profile?.is_active,
    })
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'forbidden',
      message: 'Generation questions IA refusee.',
      adminId: authData.user.id,
      metadata: { role, is_active: profile?.is_active },
    })
    return jsonResponse({ ok: false, error: 'Forbidden' }, 403)
  }

  const payload = (await request.json()) as GeneratePayload
  const category = payload.category?.trim() || 'Culture générale'
  const topic = payload.topic?.trim() || category
  const difficulty = payload.difficulty ?? 'moyen'
  const questionCount = clamp(Number(payload.questionCount) || 10, 3, 30)
  const timeLimit = clamp(Number(payload.timeLimit) || 25, 10, 60)
  const locale = payload.locale?.trim() || 'Côte d’Ivoire et Afrique francophone'

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            correct_answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            explanation: { type: 'string' },
            difficulty: { type: 'string' },
            category: { type: 'string' },
            time_limit: { type: 'integer', minimum: 10, maximum: 60 },
          },
          required: [
            'question',
            'options',
            'correct_answer',
            'explanation',
            'difficulty',
            'category',
            'time_limit',
          ],
        },
      },
    },
    required: ['questions'],
  }

  const prompt = [
    `Génère ${questionCount} questions de quiz live en français naturel.`,
    `Catégorie: ${category}. Thème précis: ${topic}.`,
    `Contexte local: ${locale}. Niveau: ${difficulty}.`,
    `Chaque question doit avoir exactement 4 choix, une seule bonne réponse et une explication courte.`,
    `Evite les questions politiques, religieuses, discriminatoires, trop ambiguës ou dépendantes d'une actualité non vérifiée.`,
    `Le time_limit doit être ${timeLimit} secondes sauf si une question mérite légèrement moins ou plus.`,
    `Les réponses doivent être mélangées: la bonne réponse ne doit pas toujours être A.`,
  ].join('\n')

  const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'Tu es un concepteur senior de quiz live pour MegaPromo. Tu produis uniquement du JSON valide conforme au schema.',
        },
        { role: 'user', content: prompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'live_quiz_questions',
          strict: true,
          schema,
        },
      },
    }),
  })

  const openAiPayload = await openAiResponse.json()
  if (!openAiResponse.ok) {
    console.error('[MegaPromo][openaiQuiz] error', openAiPayload)
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'openai_generation_failed',
      message: 'Echec generation OpenAI questions QL.',
      adminId: authData.user.id,
      metadata: {
        model,
        category,
        topic,
        difficulty,
        question_count: questionCount,
        status: openAiResponse.status,
      },
    })
    return jsonResponse(
      {
        ok: false,
        error: 'Generation OpenAI impossible.',
        details: openAiPayload,
      },
      502,
    )
  }

  const text = outputTextFromResponse(openAiPayload)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    await logSystemEvent(supabaseAdmin, {
      level: 'error',
      action: 'openai_invalid_json',
      message: 'Reponse OpenAI non JSON pour questions QL.',
      adminId: authData.user.id,
      metadata: {
        model,
        category,
        topic,
        raw_length: text.length,
      },
    })
    return jsonResponse(
      { ok: false, error: 'Reponse OpenAI non JSON.', raw: text },
      502,
    )
  }

  const questions = normalizeGeneratedQuestions(
    parsed,
    category,
    difficulty,
    timeLimit,
  )
  if (questions.length === 0) {
    await logSystemEvent(supabaseAdmin, {
      level: 'warning',
      action: 'no_usable_questions',
      message: 'Generation IA sans question exploitable.',
      adminId: authData.user.id,
      metadata: { model, category, topic, difficulty, question_count: questionCount },
    })
    return jsonResponse(
      { ok: false, error: 'Aucune question exploitable generee.', raw: parsed },
      502,
    )
  }

  await logSystemEvent(supabaseAdmin, {
    action: 'generate_questions',
    message: 'Questions QL generees par IA.',
    adminId: authData.user.id,
    metadata: {
      model,
      category,
      topic,
      difficulty,
      requested_count: questionCount,
      generated_count: questions.length,
      time_limit: timeLimit,
    },
  })

  return jsonResponse({
    ok: true,
    model,
    category,
    topic,
    difficulty,
    questions,
  })
})
