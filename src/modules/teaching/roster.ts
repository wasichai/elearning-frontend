import type { RosterEntry } from './contract'

// lo que decide la lista de matriculados, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

export const MAX_LOWEST = 3

export type RosterFilter = 'ALL' | RosterEntry['status'] | 'PENDING'
export type SortKey = 'email' | 'progress' | 'attendance'
export type SortDirection = 'asc' | 'desc'
export interface RosterSort {
  key: SortKey
  direction: SortDirection
}

const hasPending = ({ assessments }: RosterEntry) => assessments.some((assessment) => assessment.pending)

// el servidor hoy no lista las retiradas, pero el contrato las admite: quien se retiró no cuenta para las cifras de la clase.
// la media es la de los porcentajes de cada estudiante, redondeada, y quien aún no tiene lecciones no la baja: la pantalla lo explica
export function rosterSummary(entries: RosterEntry[]) {
  const counted = entries.filter((entry) => entry.status !== 'RETIRADA')
  const withLessons = counted.filter((entry) => entry.progress.totalLessons > 0)
  const assessments = counted.flatMap((entry) => entry.assessments)
  return {
    students: counted.length,
    meanPercent: withLessons.length > 0 ? Math.round(withLessons.reduce((sum, entry) => sum + entry.progress.percent, 0) / withLessons.length) : undefined,
    attendance: {
      attended: counted.reduce((sum, entry) => sum + entry.attendance.attended, 0),
      total: counted.reduce((sum, entry) => sum + entry.attendance.total, 0)
    },
    assessments: { pending: assessments.filter((assessment) => assessment.pending).length, total: assessments.length }
  }
}

export function filterRoster(entries: RosterEntry[], { search, filter }: { search: string; filter: RosterFilter }): RosterEntry[] {
  const needle = search.trim().toLowerCase()
  return entries.filter((entry) => {
    if (needle && !entry.email?.toLowerCase().includes(needle)) return false
    if (filter === 'ALL') return true
    return filter === 'PENDING' ? hasPending(entry) : entry.status === filter
  })
}

// los filtros que separan a alguien, con su recuento. un solo estado no separa nada; si ninguno separa, no se ofrecen
export function filterCounts(entries: RosterEntry[]): { filter: RosterFilter; count: number }[] {
  const statuses = [...new Set(entries.map((entry) => entry.status))]
  const pending = entries.filter(hasPending).length
  const options: { filter: RosterFilter; count: number }[] = [
    ...(statuses.length > 1 ? statuses.map((status) => ({ filter: status, count: entries.filter((entry) => entry.status === status).length })) : []),
    ...(pending > 0 && pending < entries.length ? [{ filter: 'PENDING' as const, count: pending }] : [])
  ]
  return options.length > 0 ? [{ filter: 'ALL', count: entries.length }, ...options] : []
}

// null: sin el dato, va siempre al final, en cualquier dirección
function sortValue(entry: RosterEntry, key: Exclude<SortKey, 'email'>): number | null {
  if (key === 'progress') return entry.progress.percent
  return entry.attendance.total === 0 ? null : entry.attendance.attended / entry.attendance.total
}

function compareEmail(a: RosterEntry, b: RosterEntry): number {
  return (a.email ?? '').localeCompare(b.email ?? '')
}

export function sortRoster(entries: RosterEntry[], { key, direction }: RosterSort): RosterEntry[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...entries].sort((a, b) => {
    if (key === 'email') {
      if (a.email === null || b.email === null) return Number(a.email === null) - Number(b.email === null)
      return sign * compareEmail(a, b)
    }
    const [first, second] = [sortValue(a, key), sortValue(b, key)]
    if (first === null || second === null) return Number(first === null) - Number(second === null) || compareEmail(a, b)
    return sign * (first - second) || compareEmail(a, b)
  })
}

// quien más atrás va entre las matrículas activas, por su porcentaje. no sale si no aporta: si caben todos en la lista ya lo dice la
// tabla, y si todos van igual no hay nadie a quien señalar
export function lowestProgress(entries: RosterEntry[]): RosterEntry[] {
  const active = entries.filter((entry) => entry.status === 'ACTIVA' && entry.progress.totalLessons > 0)
  if (active.length <= MAX_LOWEST || new Set(active.map((entry) => entry.progress.percent)).size === 1) return []
  return sortRoster(
    active.filter((entry) => entry.progress.percent < 100),
    { key: 'progress', direction: 'asc' }
  ).slice(0, MAX_LOWEST)
}
