import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Lesson } from './contract'
import { attemptKnots, courseKnots, Knot, knotOf, MAX_KNOTS, Quipu, summaryKnots } from './Quipu'

// el progreso en nudos (Progress del sistema de diseño): la forma dice el tipo y el relleno el estado; es decorativo y
// siempre va con su texto

const lesson = (overrides: Partial<Lesson>): Lesson =>
  ({
    id: 'l',
    title: 'Lección',
    completion: 'EXPLICIT',
    assessment: null,
    progress: { status: 'NO_INICIADA', startedAt: null, completedAt: null, evidence: null },
    ...overrides
  }) as Lesson

describe('attemptKnots', () => {
  const states = (max: number, used: number, open: boolean) => attemptKnots(max, used, open).map((knot) => `${knot.kind}:${knot.state}`)

  it('en rombos: los usados, el abierto y los libres', () => {
    expect(states(3, 1, false)).toEqual(['assessment:used', 'assessment:todo', 'assessment:todo'])
    expect(states(3, 1, true)).toEqual(['assessment:used', 'assessment:active', 'assessment:todo'])
    expect(states(2, 2, false)).toEqual(['assessment:used', 'assessment:used'])
  })
})

describe('knotOf', () => {
  it('la forma sale del tipo: evaluación rombo, sesión doble anillo, lo demás círculo', () => {
    expect(knotOf(lesson({})).kind).toBe('lesson')
    expect(knotOf(lesson({ assessment: {} as Lesson['assessment'] })).kind).toBe('assessment')
    expect(knotOf(lesson({ completion: 'ATTENDANCE' })).kind).toBe('session')
  })

  it('el relleno sale del estado: completada o aprobada, en curso, sin empezar', () => {
    const state = (status: Lesson['progress']['status']) => knotOf(lesson({ progress: { status } as Lesson['progress'] })).state
    expect([state('COMPLETADA'), state('APROBADA'), state('INICIADA'), state('NO_INICIADA')]).toEqual(['done', 'done', 'active', 'todo'])
  })
})

describe('summaryKnots', () => {
  it('del resumen de una matrícula: tantos nudos de lección como lecciones, las completadas primero', () => {
    expect(summaryKnots({ completedLessons: 2, totalLessons: 4, percent: 50 }).map((knot) => `${knot.kind}:${knot.state}`)).toEqual([
      'lesson:done',
      'lesson:done',
      'lesson:todo',
      'lesson:todo'
    ])
  })
})

describe('courseKnots', () => {
  it('solo las lecciones que cuentan para el progreso (NOT_YET no cuenta)', () => {
    const units = [{ lessons: [lesson({ id: 'a' }), lesson({ id: 'b', completion: 'NOT_YET' }), lesson({ id: 'c', completion: 'ATTENDANCE' })] }]
    expect(courseKnots(units).map((knot) => knot.kind)).toEqual(['lesson', 'session'])
  })
})

describe('Quipu', () => {
  it('es decorativo: un cordón con un nudo por elemento, cada uno con su forma y su estado', () => {
    const { container } = render(
      <Quipu
        knots={[
          { kind: 'lesson', state: 'done' },
          { kind: 'assessment', state: 'active' },
          { kind: 'session', state: 'todo' }
        ]}
      />
    )
    const quipu = container.firstElementChild!
    expect(quipu).toHaveAttribute('aria-hidden', 'true')
    expect([...quipu.querySelectorAll('[data-knot]')].map((knot) => `${knot.getAttribute('data-knot')}:${knot.getAttribute('data-state')}`)).toEqual([
      'lesson:done',
      'assessment:active',
      'session:todo'
    ])
  })

  it(`con más de ${MAX_KNOTS} nudos no se dibuja: quien lo usa vuelve a la barra`, () => {
    const knots = Array.from({ length: MAX_KNOTS + 1 }, () => ({ kind: 'lesson' as const, state: 'todo' as const }))
    expect(render(<Quipu knots={knots} />).container).toBeEmptyDOMElement()
  })

  it('el nudo suelto (temario) también es decorativo', () => {
    const { container } = render(<Knot kind="session" state="done" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveAttribute('data-knot', 'session')
  })
})
