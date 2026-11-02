import { zonedDateTime } from '../../shared/format'
import { ATTENDANCE_STATUSES, type AttendanceStatus, type Session } from '../../shared/sessions'
import type { AttendanceRow } from './contract'

// lo que decide la agenda de la edición y la lista de asistencia, sin pintar nada

// por tiempo, no por estado: una cancelada que aún no ha llegado sigue en su sitio, tachada. la que está en curso aún es próxima.
// lo próximo, de cerca a lejos; lo pasado, de lo más reciente a lo más viejo: es lo que se busca para pasar asistencia
export function splitSessions(sessions: Session[], now: number): { upcoming: Session[]; past: Session[] } {
  const byStart = [...sessions].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return { upcoming: byStart.filter((session) => Date.parse(session.end) > now), past: byStart.filter((session) => Date.parse(session.end) <= now).reverse() }
}

// por el día civil en la zona de la edición, conservando el orden recibido
export function groupByDay(sessions: Session[]): { date: string; sessions: Session[] }[] {
  const groups: { date: string; sessions: Session[] }[] = []
  for (const session of sessions) {
    const { date } = zonedDateTime(session.start, session.timeZone)
    const group = groups.find((candidate) => candidate.date === date)
    if (group) group.sessions.push(session)
    else groups.push({ date, sessions: [session] })
  }
  return groups
}

export type AttendanceOverrides = Partial<Record<string, AttendanceStatus>>

// lo que se ve ahora: lo guardado y encima lo marcado sin guardar
export function attendanceSummary(rows: AttendanceRow[], overrides: AttendanceOverrides) {
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((status) => [status, 0])) as Record<AttendanceStatus, number>
  let unmarked = 0
  let unsaved = 0
  for (const row of rows) {
    const override = overrides[row.enrollmentId]
    const current = override ?? row.status
    if (current) counts[current]++
    else unmarked++
    if (override && override !== row.status) unsaved++
  }
  return { counts, unmarked, unsaved }
}

// marca solo a quien sigue sin marcar: lo registrado y lo ya marcado no se pisan. nada se envía hasta guardar
export function markAllPresent(rows: AttendanceRow[], overrides: AttendanceOverrides): AttendanceOverrides {
  const next = { ...overrides }
  for (const row of rows) if (!row.status && !next[row.enrollmentId]) next[row.enrollmentId] = 'PRESENTE'
  return next
}
