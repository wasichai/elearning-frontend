import { describe, expect, it } from 'vitest'
import type { Session } from '../../shared/sessions'
import type { AttendanceRow } from './contract'
import { attendanceSummary, groupByDay, markAllPresent, splitSessions } from './sessions'
import { teachingSessions } from './test/fixtures'

const NOW = Date.parse('2026-11-02T15:00:00Z')
const session = (id: string, start: string, end: string, overrides: Partial<Session> = {}): Session => ({
  ...(teachingSessions[0] as Session),
  id,
  start,
  end,
  ...overrides
})
const row = (enrollmentId: string, status: AttendanceRow['status']): AttendanceRow => ({ enrollmentId, email: `${enrollmentId}@demo.local`, status })

describe('las sesiones, por tiempo', () => {
  const list = [
    session('pasada', '2026-10-01T13:00:00Z', '2026-10-01T14:00:00Z'),
    session('reciente', '2026-11-01T13:00:00Z', '2026-11-01T14:00:00Z'),
    session('lejana', '2026-12-01T13:00:00Z', '2026-12-01T14:00:00Z'),
    session('en-curso', '2026-11-02T14:30:00Z', '2026-11-02T15:30:00Z'),
    session('cancelada', '2026-11-03T13:00:00Z', '2026-11-03T14:00:00Z', { status: 'CANCELADA' })
  ]

  it('separa próximas y pasadas: lo próximo, de cerca a lejos; lo pasado, de lo más reciente a lo más viejo', () => {
    const { upcoming, past } = splitSessions(list, NOW)
    expect(upcoming.map(({ id }) => id)).toEqual(['en-curso', 'cancelada', 'lejana'])
    expect(past.map(({ id }) => id)).toEqual(['reciente', 'pasada'])
  })
})

describe('los días de la agenda', () => {
  it('agrupa por el día de la zona de la edición, no por el de UTC', () => {
    const groups = groupByDay([
      // las 23:30 del día 9 en Lima son ya el día 10 en UTC
      session('a', '2026-11-10T04:30:00Z', '2026-11-10T05:30:00Z'),
      session('b', '2026-11-09T13:00:00Z', '2026-11-09T14:00:00Z'),
      session('c', '2026-11-10T13:00:00Z', '2026-11-10T14:00:00Z')
    ])
    expect(groups.map(({ date, sessions }) => [date, sessions.map(({ id }) => id)])).toEqual([
      ['2026-11-09', ['a', 'b']],
      ['2026-11-10', ['c']]
    ])
  })
})

describe('el resumen de la asistencia', () => {
  it('cuenta por estado con lo marcado sin guardar, y dice qué falta y qué está sin guardar', () => {
    const rows = [row('a', null), row('b', 'PRESENTE'), row('c', 'TARDE'), row('d', null)]
    expect(attendanceSummary(rows, { a: 'PRESENTE', c: 'AUSENTE' })).toEqual({
      counts: { PRESENTE: 2, TARDE: 0, AUSENTE: 1, JUSTIFICADO: 0 },
      unmarked: 1,
      unsaved: 2
    })
  })

  it('volver a lo que ya estaba no cuenta como sin guardar', () => {
    expect(attendanceSummary([row('a', 'TARDE')], { a: 'TARDE' }).unsaved).toBe(0)
  })
})

describe('«Marcar a todos presentes»', () => {
  it('solo toca a quien sigue sin marcar: no pisa lo registrado ni lo ya marcado', () => {
    const rows = [row('a', null), row('b', 'AUSENTE'), row('c', null)]
    expect(markAllPresent(rows, { c: 'TARDE' })).toEqual({ a: 'PRESENTE', c: 'TARDE' })
  })
})
