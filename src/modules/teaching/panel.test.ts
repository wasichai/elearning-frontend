import { describe, expect, it } from 'vitest'
import { upcomingSessions, type Session } from '../../shared/sessions'
import { teachingPanelSchema, type PendingAttempt, type TeachingOffering } from './contract'
import { byWork, groupsByOldest, hiddenAttempts, MAX_TRAY_ROWS, oldestFirst, panelAgenda, panelFigures, submittedAge } from './panel'
import { offering, otherOffering, panelItem, pendingAttempts, teachingSessions } from './test/fixtures'

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

describe('lo que queda fuera de la bandeja', () => {
  const queue = (count: number) => Array.from({ length: count }, (_, index) => attempt(`a${index}`, '2026-10-01T10:00:00Z'))

  it('es el total real menos lo que se ve', () => {
    expect(hiddenAttempts({ pendingAttempts: 42, oldestPending: queue(MAX_TRAY_ROWS) })).toBe(42 - MAX_TRAY_ROWS)
    expect(hiddenAttempts({ pendingAttempts: MAX_TRAY_ROWS, oldestPending: queue(MAX_TRAY_ROWS) })).toBe(0)
  })

  it('si trajera más de las que caben, solo cuenta como visibles las que caben', () => {
    expect(hiddenAttempts({ pendingAttempts: 7, oldestPending: queue(7) })).toBe(7 - MAX_TRAY_ROWS)
  })

  it('con menos de las que caben ya es la cola entera, aunque el total diga más: los intentos propios no se corrigen', () => {
    expect(hiddenAttempts({ pendingAttempts: 3, oldestPending: queue(2) })).toBe(0)
  })

  it('un total atrasado nunca da una cifra negativa', () => {
    expect(hiddenAttempts({ pendingAttempts: 1, oldestPending: queue(MAX_TRAY_ROWS) })).toBe(0)
  })
})

describe('la agenda del panel', () => {
  const inNovember = (id: string, day: number) => session({ id, start: `2026-11-${day}T13:00:00Z`, end: `2026-11-${day}T14:00:00Z` })
  const panel = teachingPanelSchema.parse([
    panelItem(offering, { upcomingSessions: [inNovember('luego', 20)] }),
    panelItem(otherOffering, { upcomingSessions: [inNovember('pronto', 10)] }),
    panelItem({ ...otherOffering, code: 'terminada', status: 'FINALIZADA' }, { upcomingSessions: [inNovember('de-una-terminada', 15)] }),
    panelItem({ ...otherOffering, code: 'cancelada', status: 'CANCELADA' }, { upcomingSessions: [inNovember('de-una-cancelada', 16)] })
  ])

  it('funde las de las ediciones vivas, la más próxima primero, cada una con su edición', () => {
    expect(panelAgenda(panel, NOW).map((row) => [row.id, row.offering.code])).toEqual([
      ['pronto', otherOffering.code],
      ['luego', offering.code]
    ])
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
