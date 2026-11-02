import { describe, expect, it } from 'vitest'
import type { RosterEntry } from './contract'
import { filterCounts, filterRoster, lowestProgress, MAX_LOWEST, rosterSummary, sortRoster } from './roster'
import { roster } from './test/fixtures'

const base = roster[0] as RosterEntry
const entry = (email: string | null, percent: number, overrides: Partial<RosterEntry> = {}): RosterEntry => ({
  ...base,
  enrollmentId: `m-${email}-${percent}`,
  email,
  status: 'ACTIVA',
  progress: { completedLessons: percent, totalLessons: 100, percent },
  attendance: { attended: 0, total: 0 },
  assessments: [],
  ...overrides
})
const pending = { lessonId: 'l', title: 'E', bestPercent: null, passed: null, pending: true }
const emails = (entries: RosterEntry[]) => entries.map(({ email }) => email)

describe('el resumen de la edición', () => {
  it('son cifras exactas del roster: la media del avance redondeada, las asistencias sumadas y las evaluaciones por corregir', () => {
    expect(rosterSummary(roster as RosterEntry[])).toEqual({
      students: 2,
      meanPercent: 67,
      attendance: { attended: 3, total: 4 },
      assessments: { pending: 1, total: 2 }
    })
  })

  it('una matrícula retirada no cuenta', () => {
    const summary = rosterSummary([entry('a', 50), entry('b', 100, { status: 'RETIRADA', attendance: { attended: 9, total: 9 }, assessments: [pending] })])
    expect(summary).toEqual({ students: 1, meanPercent: 50, attendance: { attended: 0, total: 0 }, assessments: { pending: 0, total: 0 } })
  })

  it('sin lecciones no hay media que dar; quien aún no tiene lecciones tampoco la baja', () => {
    const empty = { completedLessons: 0, totalLessons: 0, percent: 0 }
    expect(rosterSummary([entry('a', 0, { progress: empty })]).meanPercent).toBeUndefined()
    expect(rosterSummary([entry('a', 0, { progress: empty }), entry('b', 40)]).meanPercent).toBe(40)
  })
})

describe('la búsqueda y los filtros', () => {
  const students = [
    entry('Ana@demo.local', 10),
    entry('beto@demo.local', 20, { status: 'FINALIZADA' }),
    entry(null, 30),
    entry('carla@otra.local', 40, { assessments: [pending] })
  ]

  it('busca por correo, sin distinguir mayúsculas y sin los espacios de los extremos', () => {
    expect(emails(filterRoster(students, { search: ' ANA@ ', filter: 'ALL' }))).toEqual(['Ana@demo.local'])
    expect(emails(filterRoster(students, { search: 'demo', filter: 'ALL' }))).toEqual(['Ana@demo.local', 'beto@demo.local'])
  })

  it('sin búsqueda entra también quien no tiene correo; con búsqueda, no', () => {
    expect(filterRoster(students, { search: '', filter: 'ALL' })).toHaveLength(4)
    expect(emails(filterRoster(students, { search: 'local', filter: 'ALL' }))).not.toContain(null)
  })

  it('filtra por estado de matrícula y por quien tiene algo por corregir, y se combina con la búsqueda', () => {
    expect(emails(filterRoster(students, { search: '', filter: 'FINALIZADA' }))).toEqual(['beto@demo.local'])
    expect(emails(filterRoster(students, { search: '', filter: 'PENDING' }))).toEqual(['carla@otra.local'])
    expect(filterRoster(students, { search: 'ana', filter: 'FINALIZADA' })).toEqual([])
  })

  it('cuenta cada filtro, solo con los estados presentes', () => {
    expect(filterCounts(students)).toEqual([
      { filter: 'ALL', count: 4 },
      { filter: 'ACTIVA', count: 3 },
      { filter: 'FINALIZADA', count: 1 },
      { filter: 'PENDING', count: 1 }
    ])
  })

  it('si un filtro no separa a nadie, no se ofrece', () => {
    expect(filterCounts([entry('a', 1), entry('b', 2)])).toEqual([])
  })
})

describe('el orden', () => {
  it('por correo, con quien no lo tiene siempre al final', () => {
    const students = [entry('b', 1), entry(null, 2), entry('a', 3)]
    expect(emails(sortRoster(students, { key: 'email', direction: 'asc' }))).toEqual(['a', 'b', null])
    expect(emails(sortRoster(students, { key: 'email', direction: 'desc' }))).toEqual(['b', 'a', null])
  })

  it('por avance, y a igualdad por correo', () => {
    const students = [entry('c', 50), entry('a', 90), entry('b', 50)]
    expect(emails(sortRoster(students, { key: 'progress', direction: 'asc' }))).toEqual(['b', 'c', 'a'])
    expect(emails(sortRoster(students, { key: 'progress', direction: 'desc' }))).toEqual(['a', 'b', 'c'])
  })

  it('por asistencia en proporción, con quien aún no tiene sesiones siempre al final', () => {
    const students = [
      entry('sin', 0, { attendance: { attended: 0, total: 0 } }),
      entry('mitad', 0, { attendance: { attended: 2, total: 4 } }),
      entry('toda', 0, { attendance: { attended: 1, total: 1 } })
    ]
    expect(emails(sortRoster(students, { key: 'attendance', direction: 'asc' }))).toEqual(['mitad', 'toda', 'sin'])
    expect(emails(sortRoster(students, { key: 'attendance', direction: 'desc' }))).toEqual(['toda', 'mitad', 'sin'])
  })

  it('no altera la lista recibida', () => {
    const students = [entry('b', 1), entry('a', 2)]
    sortRoster(students, { key: 'email', direction: 'asc' })
    expect(emails(students)).toEqual(['b', 'a'])
  })
})

describe('«Menor avance»', () => {
  it('trae a las matrículas activas de menor a mayor avance, hasta el máximo', () => {
    const list = lowestProgress([entry('a', 80), entry('b', 10), entry('c', 40), entry('d', 60), entry('e', 20)])
    expect(emails(list)).toEqual(['b', 'e', 'c'])
    expect(list).toHaveLength(MAX_LOWEST)
  })

  it('deja fuera lo finalizado, lo retirado, lo ya completo y lo que no tiene lecciones', () => {
    const list = lowestProgress([
      entry('hecha', 5, { status: 'FINALIZADA' }),
      entry('retirada', 5, { status: 'RETIRADA' }),
      entry('sin-lecciones', 0, { progress: { completedLessons: 0, totalLessons: 0, percent: 0 } }),
      entry('completa', 100),
      entry('a', 10),
      entry('b', 20),
      entry('c', 30),
      entry('d', 40)
    ])
    expect(emails(list)).toEqual(['a', 'b', 'c'])
  })

  it('no sale si no aporta: la lista cabría entera, o todos van igual', () => {
    expect(lowestProgress([entry('a', 10), entry('b', 20), entry('c', 30)])).toEqual([])
    expect(lowestProgress([entry('a', 0), entry('b', 0), entry('c', 0), entry('d', 0)])).toEqual([])
  })
})
