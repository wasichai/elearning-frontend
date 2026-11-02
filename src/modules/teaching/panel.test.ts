import { describe, expect, it } from 'vitest'
import type { Session } from '../../shared/sessions'
import type { PendingAttempt, TeachingOffering } from './contract'
import { byWork, groupsByOldest, MAX_PANEL_OFFERINGS, oldestFirst, panelFigures, panelPlan, submittedAge, upcomingSessions } from './panel'
import { offering, otherOffering, pendingAttempts, teachingSessions } from './test/fixtures'

const NOW = Date.parse('2026-11-02T15:00:00Z')

const edition = (code: string, overrides: Partial<TeachingOffering> = {}): TeachingOffering => ({ ...(offering as TeachingOffering), code, ...overrides })
const attempt = (attemptId: string, submittedAt: string): PendingAttempt => ({ ...pendingAttempts[0]!, attemptId, submittedAt })
const session = (overrides: Partial<Session>): Session => ({ ...(teachingSessions[0] as Session), ...overrides })

describe('las cifras del panel docente', () => {
  it('son sumas exactas de todas las ediciones asignadas', () => {
    expect(panelFigures([offering as TeachingOffering, otherOffering as TeachingOffering])).toEqual({ offerings: 2, pending: 1, enrolled: 3 })
    expect(panelFigures([])).toEqual({ offerings: 0, pending: 0, enrolled: 0 })
  })
})

describe('la prioridad de las ediciones', () => {
  it('primero lo que más espera, luego lo que sigue vivo, luego lo que empezó antes', () => {
    const sorted = byWork([
      edition('finalizada-sin-nada', { status: 'FINALIZADA', pendingAttempts: 0, startDate: '2026-01-01' }),
      edition('viva-tarde', { status: 'EN_CURSO', pendingAttempts: 0, startDate: '2026-11-01' }),
      edition('viva-pronto', { status: 'PROGRAMADA', pendingAttempts: 0, startDate: '2026-03-01' }),
      edition('finalizada-con-uno', { status: 'FINALIZADA', pendingAttempts: 1 }),
      edition('con-cinco', { pendingAttempts: 5 })
    ])
    expect(sorted.map(({ code }) => code)).toEqual(['con-cinco', 'finalizada-con-uno', 'viva-pronto', 'viva-tarde', 'finalizada-sin-nada'])
  })

  it('no altera la lista recibida', () => {
    const received = [edition('b', { pendingAttempts: 0 }), edition('a', { pendingAttempts: 1 })]
    byWork(received)
    expect(received.map(({ code }) => code)).toEqual(['b', 'a'])
  })
})

describe('qué ediciones se leen', () => {
  it('la cola solo de las que tienen algo por corregir, aunque hayan terminado; las sesiones, de las que siguen vivas', () => {
    const plan = panelPlan([
      edition('con-trabajo', { pendingAttempts: 1 }),
      edition('finalizada-con-trabajo', { status: 'FINALIZADA', pendingAttempts: 2 }),
      edition('sin-trabajo', { pendingAttempts: 0 }),
      edition('cancelada', { status: 'CANCELADA', pendingAttempts: 0 })
    ])
    expect(plan.grading.map(({ code }) => code)).toEqual(['finalizada-con-trabajo', 'con-trabajo'])
    expect(plan.agenda.map(({ code }) => code)).toEqual(['con-trabajo', 'sin-trabajo'])
    expect(plan).toMatchObject({ gradingCapped: false, agendaCapped: false })
  })

  it('aplica el tope a las de más trabajo y lo avisa', () => {
    const many = Array.from({ length: MAX_PANEL_OFFERINGS + 2 }, (_, index) => edition(`e${index}`, { pendingAttempts: index + 1 }))
    const plan = panelPlan(many)
    expect(plan.grading).toHaveLength(MAX_PANEL_OFFERINGS)
    expect(plan.grading[0]!.code).toBe(`e${MAX_PANEL_OFFERINGS + 1}`)
    expect(plan.grading.map(({ code }) => code)).not.toContain('e0')
    expect(plan).toMatchObject({ gradingCapped: true, agendaCapped: true })
  })
})

describe('la bandeja', () => {
  it('ordena las entregas de la más antigua a la más nueva', () => {
    const sorted = oldestFirst([attempt('nueva', '2026-11-02T10:00:00Z'), attempt('vieja', '2026-10-01T10:00:00Z')])
    expect(sorted.map(({ attemptId }) => attemptId)).toEqual(['vieja', 'nueva'])
  })

  it('pone primero el grupo con la entrega más antigua; lo que aún no se sabe, al final y en su orden', () => {
    const groups = groupsByOldest([
      { id: 'sin-datos-1', attempts: [] },
      { id: 'reciente', attempts: [attempt('a', '2026-11-01T10:00:00Z')] },
      { id: 'sin-datos-2', attempts: [] },
      { id: 'antigua', attempts: [attempt('b', '2026-10-01T10:00:00Z')] }
    ])
    expect(groups.map(({ id }) => id)).toEqual(['antigua', 'reciente', 'sin-datos-1', 'sin-datos-2'])
  })

  it.each([
    ['2026-11-02T14:59:50Z', 'hace 1 minuto'],
    ['2026-11-02T14:30:00Z', 'hace 30 minutos'],
    ['2026-11-02T12:00:00Z', 'hace 3 horas'],
    ['2026-11-01T15:00:00Z', 'hace 1 día'],
    ['2026-09-03T15:00:00Z', 'hace 60 días'],
    // un reloj adelantado en el servidor no da una antigüedad en futuro
    ['2026-11-02T15:05:00Z', 'hace 1 minuto']
  ])('la antigüedad de %s es «%s»', (instant, expected) => {
    expect(submittedAge(instant, NOW, 'es')).toBe(expected)
  })

  it('la antigüedad va en el idioma de la interfaz', () => {
    expect(submittedAge('2026-10-28T15:00:00Z', NOW, 'en')).toBe('5 days ago')
  })
})

describe('la agenda', () => {
  it('quita las canceladas y las ya terminadas, y ordena de la más próxima a la más lejana', () => {
    const sessions = upcomingSessions(
      [
        session({ id: 'lejana', start: '2026-12-01T13:00:00Z', end: '2026-12-01T14:00:00Z' }),
        session({ id: 'cancelada', status: 'CANCELADA', start: '2026-11-03T13:00:00Z', end: '2026-11-03T14:00:00Z' }),
        session({ id: 'pasada', start: '2026-10-01T13:00:00Z', end: '2026-10-01T14:00:00Z' }),
        session({ id: 'reprogramada', status: 'REPROGRAMADA', start: '2026-11-04T13:00:00Z', end: '2026-11-04T14:00:00Z' })
      ],
      NOW
    )
    expect(sessions.map(({ id }) => id)).toEqual(['reprogramada', 'lejana'])
  })

  it('la que está en curso aún cuenta: es cuando se pasa asistencia', () => {
    const running = session({ id: 'ahora', start: '2026-11-02T14:30:00Z', end: '2026-11-02T15:30:00Z' })
    expect(upcomingSessions([running], NOW).map(({ id }) => id)).toEqual(['ahora'])
  })
})
