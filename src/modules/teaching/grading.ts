import type { QuestionResult } from '../../shared/attempts'
import type { PendingAttempt } from './contract'
import { oldestFirst } from './panel'

// lo que decide la corrección de un intento, sin pintar nada. el servidor guarda una nota y un comentario por pregunta

export interface Draft {
  points: string
  comment: string
}

export function draftOf(outcome: Pick<QuestionResult, 'points' | 'comment'>): Draft {
  return { points: outcome.points === null ? '' : String(outcome.points), comment: outcome.comment ?? '' }
}

export function isDirty(draft: Draft, outcome: Pick<QuestionResult, 'points' | 'comment'>): boolean {
  const saved = draftOf(outcome)
  const samePoints = draft.points.trim() === '' ? saved.points === '' : saved.points !== '' && Number(draft.points) === Number(saved.points)
  return !samePoints || draft.comment.trim() !== saved.comment.trim()
}

export function validPoints(points: string, max: number): boolean {
  const value = Number(points)
  return points.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= max
}

const twoDecimals = (value: number) => Number(value.toFixed(2))

// el total contando lo escrito sin guardar. sin cambios, o con unos puntos que no valen, no hay nada que adelantar
export function projectedScore(result: { questions: QuestionResult[] }, drafts: Record<string, Draft>): number | undefined {
  let changed = false
  let total = 0
  for (const outcome of result.questions) {
    const draft = drafts[outcome.questionId]
    if (draft && isDirty(draft, outcome) && draft.points !== (outcome.points === null ? '' : String(outcome.points))) {
      if (!validPoints(draft.points, outcome.maxPoints)) return undefined
      changed = true
      total += Number(draft.points)
    } else total += outcome.points ?? 0
  }
  return changed ? twoDecimals(total) : undefined
}

// la rúbrica ayuda a sumar: los puntos de lo elegido, con los dos decimales que admite el servidor. sin nada elegido, sin nota
export function rubricPoints(rubric: { points: number }[], chosen: number[]): string {
  if (chosen.length === 0) return ''
  return String(twoDecimals(chosen.reduce((sum, index) => sum + rubric[index]!.points, 0)))
}

export interface QueuePosition {
  // sin ella, el intento no está en la cola (ya corregido): lo siguiente es lo más antiguo
  position?: number
  total: number
  previous?: string
  next?: string
}

export function queuePosition(queue: PendingAttempt[], attemptId: string): QueuePosition {
  const ids = oldestFirst(queue).map((attempt) => attempt.attemptId)
  const index = ids.indexOf(attemptId)
  if (index < 0) return { total: ids.length, ...(ids[0] ? { next: ids[0] } : {}) }
  return { position: index + 1, total: ids.length, previous: ids[index - 1], next: ids[index + 1] }
}
