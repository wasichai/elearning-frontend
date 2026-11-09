import { describe, expect, it } from 'vitest'
import type { AgendaSession } from './agenda'
import { parseWeek, placements, requestedWeek, scheduleDays, timeline } from './schedule'
import { agendaItem, enrollment, sessions } from './test/fixtures'

// la lógica del horario, sin pintar: la semana de la URL, el día de cada sesión en su zona, las horas de la rejilla y los carriles

const NOW = Date.UTC(2026, 10, 11, 17) // miércoles 11 de noviembre de 2026, a mediodía en Lima
const at = (id: string, start: string, end: string, patch: object = {}) =>
  agendaItem(enrollment, { ...sessions[2], id, start, end, timeZone: 'America/Lima', ...patch }) as AgendaSession
const ids = (list: { session: AgendaSession }[]) => list.map(({ session }) => session.id)

describe('la semana de la URL', () => {
  it('se lleva a su lunes, también desde un domingo', () => {
    expect(requestedWeek('2026-11-22')).toBe('2026-11-16')
    expect(requestedWeek('2026-11-16')).toBe('2026-11-16')
    // el domingo 3 de enero de 2027 es de la semana que empieza el lunes 28 de diciembre
    expect(requestedWeek('2027-01-03')).toBe('2026-12-28')
  })

  it('sin ella, o si no vale, es la de hoy', () => {
    expect(parseWeek(null, NOW)).toBe('2026-11-09')
    for (const value of ['2026-02-30', '2026-13-01', '16/11/2026', '', 'x'])
      expect([requestedWeek(value), parseWeek(value, NOW)]).toEqual([undefined, '2026-11-09'])
  })

  it('acota los años: 1900 a 9998', () => {
    expect(requestedWeek('1900-01-03')).toBe('1900-01-01')
    expect(requestedWeek('9998-12-31')).toBe('9998-12-28')
    for (const value of ['1899-12-31', '9999-12-27', '0001-01-01']) expect(parseWeek(value, NOW)).toBe('2026-11-09')
  })
})

describe('los días de la semana', () => {
  it('una sesión de otra zona cae en el día civil de su edición', () => {
    const days = scheduleDays(
      [
        // jueves 19 a las 23:30 en Lima: viernes 20 en UTC
        at('lima', '2026-11-20T04:30:00Z', '2026-11-20T05:30:00Z'),
        // martes 17 a las 08:00 en Tokio: lunes 16 en UTC y en Lima
        at('tokio', '2026-11-16T23:00:00Z', '2026-11-17T00:00:00Z', { timeZone: 'Asia/Tokyo' }),
        // domingo 15 en Lima: la trae el margen, no es de esta semana
        at('fuera', '2026-11-16T03:00:00Z', '2026-11-16T04:00:00Z')
      ],
      '2026-11-16'
    )

    expect(days.map(({ date, sessions: list }) => [date, list.map((session) => session.id)])).toEqual([
      ['2026-11-16', []],
      ['2026-11-17', ['tokio']],
      ['2026-11-18', []],
      ['2026-11-19', ['lima']],
      ['2026-11-20', []],
      ['2026-11-21', []],
      ['2026-11-22', []]
    ])
  })
})

describe('la rejilla', () => {
  it('va de la hora de la primera a la hora en que acaba la última; una que pasa de medianoche se corta ahí', () => {
    const late = scheduleDays(
      [at('pronto', '2026-11-16T14:30:00Z', '2026-11-16T15:30:00Z'), at('tarde', '2026-11-18T02:00:00Z', '2026-11-18T05:30:00Z')],
      '2026-11-16'
    )
    // 09:30 a 10:30 y 21:00 a 00:30 del día siguiente, en Lima
    expect(timeline(late)).toEqual({ first: 9, last: 24 })
    expect(timeline(scheduleDays([at('a', '2026-11-16T22:15:00Z', '2026-11-16T22:45:00Z')], '2026-11-16'))).toEqual({ first: 17, last: 18 })
    expect(timeline(scheduleDays([], '2026-11-16'))).toEqual({ first: 0, last: 0 })
  })

  it('las que se pisan comparten el ancho; la que no se pisa con ninguna lo ocupa entero', () => {
    const placed = placements([
      // en Lima: 18:00–19:30 y 18:30–19:00 se pisan; 20:00–21:00 va sola
      at('sola', '2026-11-17T01:00:00Z', '2026-11-17T02:00:00Z'),
      at('larga', '2026-11-16T23:00:00Z', '2026-11-17T00:30:00Z'),
      at('pisa', '2026-11-16T23:30:00Z', '2026-11-17T00:00:00Z')
    ])

    expect(ids(placed)).toEqual(['larga', 'pisa', 'sola'])
    expect(placed.map(({ start, end, lane, lanes }) => ({ start, end, lane, lanes }))).toEqual([
      { start: 18 * 60, end: 19 * 60 + 30, lane: 0, lanes: 2 },
      { start: 18 * 60 + 30, end: 19 * 60, lane: 1, lanes: 2 },
      { start: 20 * 60, end: 21 * 60, lane: 0, lanes: 1 }
    ])
  })

  it('una que empieza cuando acaba otra no se pisa con ella', () => {
    const placed = placements([at('a', '2026-11-16T23:00:00Z', '2026-11-17T00:00:00Z'), at('b', '2026-11-17T00:00:00Z', '2026-11-17T01:00:00Z')])

    expect(placed.map(({ lane, lanes }) => [lane, lanes])).toEqual([
      [0, 1],
      [0, 1]
    ])
  })
})
