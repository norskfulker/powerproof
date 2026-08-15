import type { ClarifyQuestion, ClarifyRound } from '@/types/research'

export type ClarifyNavPhase = 'welcome' | 'clarifying' | 'ready'

export type ClarifyNavItemKind = 'section' | 'round' | 'question'

export type ClarifyNavItemStatus = 'complete' | 'active' | 'pending'

export type ClarifyNavItem = {
  id: string
  kind: ClarifyNavItemKind
  label: string
  /** Nested children (rounds under clarification, questions under round). */
  children?: ClarifyNavItem[]
  clickable: boolean
  active: boolean
  answered?: boolean
  status?: ClarifyNavItemStatus
  /** Pulse while waiting for the next clarify step (e.g. loading questions). */
  loading?: boolean
  /** Subtle animation when more rounds may still follow. */
  animated?: boolean
  roundIndex?: number
  questionIndex?: number
}

export type ClarifyNavModel = {
  phase: ClarifyNavPhase
  activeItemId: string | null
  items: ClarifyNavItem[]
}

const DEFAULT_TRUNCATE_LEN = 52

export function truncateClarifyLabel(text: string, maxLen = DEFAULT_TRUNCATE_LEN): string {
  const trimmed = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return '—'
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`
}

export function clarifyQuestionNavId(roundIndex: number, questionIndex: number): string {
  return `round-${roundIndex}-q-${questionIndex}`
}

export function clarifyRoundNavId(roundIndex: number): string {
  return `round-${roundIndex}`
}

function isQuestionAnsweredInDraft(
  question: ClarifyQuestion,
  draftAnswers: Record<string, string | string[] | boolean>,
): boolean {
  const raw = draftAnswers[question.id]
  if (question.type === 'checkbox') {
    if (raw === true || raw === 'yes' || raw === false || raw === 'no') return true
    return false
  }
  if (question.type === 'multi_select') {
    return Array.isArray(raw) && raw.length > 0
  }
  if (typeof raw === 'string' && raw.trim()) return true
  return false
}

function formatAnswerPreview(answer: string | string[]): string {
  if (Array.isArray(answer)) return answer.join(', ')
  return String(answer ?? '')
}

export function buildQuestionNavItems(
  roundIndex: number,
  questions: ClarifyQuestion[],
  opts: {
    isCurrentRound: boolean
    currentQuestionIndex: number
    draftAnswers: Record<string, string | string[] | boolean>
    answersByQuestionId?: Map<string, string | string[]>
    activeItemId: string | null
    reviewTarget: { round: number; questionIndex: number } | null
  },
): ClarifyNavItem[] {
  const {
    isCurrentRound,
    currentQuestionIndex,
    draftAnswers,
    answersByQuestionId,
    activeItemId,
    reviewTarget,
  } = opts

  return questions.map((q, qi) => {
    const id = clarifyQuestionNavId(roundIndex, qi)
    const answered = isCurrentRound
      ? isQuestionAnsweredInDraft(q, draftAnswers)
      : Boolean(answersByQuestionId?.has(q.id))

    const isReviewingThis =
      reviewTarget != null && reviewTarget.round === roundIndex && reviewTarget.questionIndex === qi
    const isCurrentActive =
      isCurrentRound && !reviewTarget && qi === currentQuestionIndex && activeItemId !== 'summary'

    const clickable = isCurrentRound
      ? answered || qi <= currentQuestionIndex
      : true

    const status: ClarifyNavItemStatus = answered
      ? 'complete'
      : isReviewingThis || isCurrentActive
        ? 'active'
        : 'pending'

    return {
      id,
      kind: 'question' as const,
      label: `Q${qi + 1}: ${truncateClarifyLabel(q.text)}`,
      clickable,
      active: isReviewingThis || isCurrentActive,
      answered,
      status,
      roundIndex,
      questionIndex: qi,
    }
  })
}

export type BuildClarificationNavModelInput = {
  phase: ClarifyNavPhase
  originalQuery: string
  session: ClarifyRound[]
  round: number
  questions: ClarifyQuestion[]
  questionIndex: number
  draftAnswers: Record<string, string | string[] | boolean>
  summary: string
  reviewing?: boolean
  hydrating?: boolean
  reviewTarget?: { round: number; questionIndex: number } | null
  loading?: boolean
}

export function buildClarificationNavModel(input: BuildClarificationNavModelInput): ClarifyNavModel {
  const {
    phase,
    session,
    round,
    questions,
    questionIndex,
    draftAnswers,
    summary,
    reviewing = false,
    hydrating = false,
    reviewTarget = null,
    loading = false,
  } = input

  let activeItemId: string | null = null

  if (reviewing || hydrating) {
    activeItemId = 'clarification'
  } else if (phase === 'ready') {
    activeItemId = 'summary'
  } else if (reviewTarget != null) {
    activeItemId = clarifyQuestionNavId(reviewTarget.round, reviewTarget.questionIndex)
  } else if (questions.length > 0) {
    activeItemId = clarifyQuestionNavId(round, questionIndex)
  } else if (session.length > 0) {
    const last = session[session.length - 1]!
    activeItemId = clarifyQuestionNavId(
      last.round,
      Math.max(0, last.questions.length - 1),
    )
  } else {
    activeItemId = 'clarification'
  }

  const roundItems: ClarifyNavItem[] = []

  for (const completed of session) {
    const answersMap = new Map(
      completed.answers.map((a) => [a.question_id, a.answer] as const),
    )
    const isCurrentInSession = phase === 'clarifying' && completed.round === round && questions.length === 0

    roundItems.push({
      id: clarifyRoundNavId(completed.round),
      kind: 'round',
      label: `Round ${completed.round + 1}`,
      clickable: false,
      active: false,
      status: 'complete',
      roundIndex: completed.round,
      children: buildQuestionNavItems(completed.round, completed.questions, {
        isCurrentRound: isCurrentInSession,
        currentQuestionIndex: questionIndex,
        draftAnswers,
        answersByQuestionId: answersMap,
        activeItemId,
        reviewTarget,
      }),
    })
  }

  const sessionHasCurrentRound = session.some((r) => r.round === round)
  if (phase === 'clarifying' && questions.length > 0 && !sessionHasCurrentRound) {
    roundItems.push({
      id: clarifyRoundNavId(round),
      kind: 'round',
      label: `Round ${round + 1}`,
      clickable: false,
      active: true,
      status: 'active',
      loading,
      roundIndex: round,
      children: buildQuestionNavItems(round, questions, {
        isCurrentRound: true,
        currentQuestionIndex: questionIndex,
        draftAnswers,
        activeItemId,
        reviewTarget,
      }),
    })
  }

  const clarificationActive =
    reviewing ||
    hydrating ||
    (phase === 'clarifying' && activeItemId !== 'summary')
  const summaryActive = activeItemId === 'summary'

  const clarificationStatus: ClarifyNavItemStatus =
    phase === 'ready'
      ? 'complete'
      : clarificationActive || reviewTarget != null
        ? 'active'
        : 'pending'

  const summaryStatus: ClarifyNavItemStatus =
    phase === 'ready' ? (summaryActive ? 'active' : 'complete') : 'pending'

  const items: ClarifyNavItem[] = [
    {
      id: 'clarification',
      kind: 'section',
      label: 'Clarification',
      clickable: false,
      active: clarificationActive && !reviewTarget,
      status: clarificationStatus,
      loading: (reviewing || hydrating || loading) && phase !== 'ready',
      children: roundItems,
    },
    {
      id: 'summary',
      kind: 'section',
      label: 'Summary',
      clickable: phase === 'ready',
      active: summaryActive,
      status: summaryStatus,
      children:
        phase === 'ready' && summary.trim()
          ? [
              {
                id: 'summary-preview',
                kind: 'question',
                label: truncateClarifyLabel(summary, 64),
                clickable: false,
                active: summaryActive,
              },
            ]
          : undefined,
    },
  ]

  return { phase, activeItemId, items }
}

export function findSessionAnswer(
  session: ClarifyRound[],
  roundIndex: number,
  questionIndex: number,
): { question: ClarifyQuestion; answer: string | string[] } | null {
  const roundData = session.find((r) => r.round === roundIndex)
  if (!roundData) return null
  const question = roundData.questions[questionIndex]
  if (!question) return null
  const answerRow = roundData.answers.find((a) => a.question_id === question.id)
  if (!answerRow) return null
  return { question, answer: answerRow.answer }
}

export { formatAnswerPreview }

/** Message when the user tries to skip ahead in the sidebar. */
export function clarifyNavBlockMessage(roundIndex: number, questionIndex: number, questionText?: string): string {
  const questionLabel = questionText?.trim()
    ? truncateClarifyLabel(questionText, 48)
    : `Question ${questionIndex + 1}`
  return `Please answer Round ${roundIndex + 1}, ${questionLabel} first.`
}

export function buildWelcomeClarifyNavModel(originalQuery = ''): ClarifyNavModel {
  return buildClarificationNavModel({
    phase: 'clarifying',
    originalQuery,
    session: [],
    round: 0,
    questions: [],
    questionIndex: 0,
    draftAnswers: {},
    summary: '',
    reviewing: true,
  })
}
