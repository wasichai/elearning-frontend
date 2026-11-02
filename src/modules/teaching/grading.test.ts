import { describe, expect, it } from 'vitest'
import type { QuestionResult } from '../../shared/attempts'
import type { PendingAttempt } from './contract'
import { draftOf, isDirty, projectedScore, queuePosition, rubricPoints, validPoints } from './grading'
import { pendingAttempts } from './test/fixtures'

const queued = (attemptId: string, submittedAt: string): PendingAttempt => ({ ...pendingAttempts[0]!, attemptId, submittedAt })
const queue = [queued('c', '2026-10-03T10:00:00Z'), queued('a', '2026-10-01T10:00:00Z'), queued('b', '2026-10-02T10:00:00Z')]
const outcome = (questionId: string, points: number | null, maxPoints = 4, comment: string | null = null): QuestionResult =>
  ({ questionId, points, maxPoints, correct: null, comment, solution: null }) as QuestionResult

describe('la posición en la cola', () => {
  it('sigue el orden de la cola, de lo más antiguo a lo más nuevo', () => {
    expect(queuePosition(queue, 'b')).toEqual({ position: 2, total: 3, previous: 'a', next: 'c' })
  })

  it('la primera no tiene anterior, y la última no tiene siguiente', () => {
    expect(queuePosition(queue, 'a')).toMatchObject({ position: 1, previous: undefined, next: 'b' })
    expect(queuePosition(queue, 'c')).toMatchObject({ position: 3, previous: 'b', next: undefined })
  })

  it('fuera de la cola (ya corregida) no hay posición, y lo siguiente es lo más antiguo', () => {
    expect(queuePosition(queue, 'otra')).toEqual({ total: 3, next: 'a' })
    expect(queuePosition([], 'otra')).toEqual({ total: 0 })
  })
})

describe('un borrador de nota', () => {
  it('parte de lo que hay en el servidor', () => {
    expect(draftOf(outcome('q', null))).toEqual({ points: '', comment: '' })
    expect(draftOf(outcome('q', 3, 4, 'Bien'))).toEqual({ points: '3', comment: 'Bien' })
  })

  it('tiene cambios si difiere de lo guardado, sin contar los espacios del comentario', () => {
    expect(isDirty({ points: '', comment: '  ' }, outcome('q', null))).toBe(false)
    expect(isDirty({ points: '2', comment: '' }, outcome('q', null))).toBe(true)
    expect(isDirty({ points: '', comment: 'algo' }, outcome('q', null))).toBe(true)
    expect(isDirty({ points: '3', comment: 'Bien ' }, outcome('q', 3, 4, 'Bien'))).toBe(false)
    expect(isDirty({ points: '4', comment: 'Bien' }, outcome('q', 3, 4, 'Bien'))).toBe(true)
  })

  it.each([
    ['', false],
    ['  ', false],
    ['-1', false],
    ['5', false],
    ['abc', false],
    ['0', true],
    ['4', true],
    ['2.5', true]
  ])('los puntos %j, sobre 4: %s', (value, valid) => {
    expect(validPoints(value, 4)).toBe(valid)
  })
})

describe('el total', () => {
  const result = { questions: [outcome('auto', 2, 2), outcome('abierta', null), outcome('archivo', 1)] }

  it('suma lo guardado y lo escrito sin guardar', () => {
    expect(projectedScore(result, { abierta: { points: '3', comment: '' } })).toBe(6)
    expect(projectedScore(result, { archivo: { points: '4', comment: '' } })).toBe(6)
  })

  it('sin cambios no hay total aparte; con unos puntos no válidos, tampoco', () => {
    expect(projectedScore(result, {})).toBeUndefined()
    expect(projectedScore(result, { abierta: { points: '', comment: '' } })).toBeUndefined()
    expect(projectedScore(result, { abierta: { points: '9', comment: '' } })).toBeUndefined()
  })

  it('no arrastra decimales de más al sumar', () => {
    expect(projectedScore({ questions: [outcome('a', 0.1), outcome('b', null)] }, { b: { points: '0.2', comment: '' } })).toBe(0.3)
  })
})

describe('los puntos de la rúbrica', () => {
  const rubric = [
    { description: 'A', points: 0.1 },
    { description: 'B', points: 0.2 },
    { description: 'C', points: 2 }
  ]

  it('son la suma de lo elegido, con dos decimales como mucho; sin nada elegido, vacíos', () => {
    expect(rubricPoints(rubric, [0, 1])).toBe('0.3')
    expect(rubricPoints(rubric, [2])).toBe('2')
    expect(rubricPoints(rubric, [])).toBe('')
  })
})
