import { zonedDateTime } from '../../shared/format'
import type { Session } from '../../shared/sessions'
import { isoInstant, type AgendaRange, type AgendaSession } from './agenda'
import type { ClassroomPanelItem, Enrollment, PendingAssessment } from './contract'

// lo que decide el panel del estudiante, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

const DAY_MS = 24 * 3600 * 1000
export const WEEK_DAYS = 7

// sin certificado: al emitirlo la matrícula se cierra, aunque el dato de estado tarde en llegar
function isActive(enrollment: Enrollment): boolean {
  return enrollment.status === 'ACTIVA' && !enrollment.certificateCode
}

export function canContinue(enrollment: Enrollment): boolean {
  return isActive(enrollment) && enrollment.nextLesson !== null
}

export function allLessonsDone({ progress }: Enrollment): boolean {
  return progress.totalLessons > 0 && progress.completedLessons === progress.totalLessons
}

function offeringIsLive({ offering }: Enrollment): boolean {
  return offering.status !== 'FINALIZADA' && offering.status !== 'CANCELADA'
}

// por qué esta y no otra. el contrato no da la fecha del último acceso, así que no se puede decir «la última que abriste»;
// se elige, de entre las que tienen siguiente lección: 1) la de una edición que sigue viva, 2) la que ya tiene avance,
// 3) la más cerca de terminar y 4) a igualdad, la primera del servidor, que las ordena por inicio más próximo
export function pickPrimary(enrollments: Enrollment[]): Enrollment | undefined {
  const rank = (enrollment: Enrollment): number[] => [
    offeringIsLive(enrollment) ? 1 : 0,
    enrollment.progress.completedLessons > 0 ? 1 : 0,
    enrollment.progress.percent
  ]
  const better = (a: number[], b: number[]) => {
    const index = a.findIndex((value, position) => value !== b[position])
    return index >= 0 && a[index]! > b[index]!
  }
  return enrollments
    .filter(canContinue)
    .reduce<Enrollment | undefined>((best, candidate) => (!best || better(rank(candidate), rank(best)) ? candidate : best), undefined)
}

export interface EnrollmentGroups {
  primary?: Enrollment
  inProgress: Enrollment[]
  completed: Enrollment[]
  // el servidor hoy no las lista (solo ACTIVA y FINALIZADA), pero el contrato las admite: ninguna matrícula se oculta
  withdrawn: Enrollment[]
}

function isCompleted(enrollment: Enrollment): boolean {
  return enrollment.status === 'FINALIZADA' || Boolean(enrollment.certificateCode) || (enrollment.nextLesson === null && allLessonsDone(enrollment))
}

// un grupo por matrícula. un curso sin lecciones todavía (0 de 0) sigue en curso: no hay nada que dar por completado
export function groupEnrollments(enrollments: Enrollment[]): EnrollmentGroups {
  const withdrawn = enrollments.filter((enrollment) => enrollment.status === 'RETIRADA')
  const current = enrollments.filter((enrollment) => enrollment.status !== 'RETIRADA')
  const completed = current.filter(isCompleted)
  const primary = pickPrimary(current)
  const inProgress = current.filter((enrollment) => !isCompleted(enrollment) && enrollment !== primary)
  return { primary, inProgress, completed, withdrawn }
}

// las matrículas de las que el riel habla: solo activas (una finalizada ya no tiene nada por delante)
export function railEnrollments({ primary, inProgress, completed }: EnrollmentGroups): Enrollment[] {
  return [...(primary ? [primary] : []), ...inProgress, ...completed].filter(isActive)
}

export type RailAssessment = PendingAssessment & { enrollment: Enrollment }

// las evaluaciones pendientes que trae el panel de esas matrículas, en el orden de las matrículas y, dentro, en el del curso
export function railAssessments(active: Enrollment[], panel: ClassroomPanelItem[]): RailAssessment[] {
  const byId = new Map(panel.map((item) => [item.id, item]))
  return active.flatMap((enrollment) => (byId.get(enrollment.id)?.pendingAssessments ?? []).map((pending) => ({ ...pending, enrollment })))
}

// el intervalo de la agenda para `days` días civiles a partir de `first` (una medianoche local), con un día de margen a cada lado: así entra
// una sesión de cualquier zona cuyo día, en la zona de su edición, cae en esos días (la zona del navegador y la de la edición distan menos de
// un día). quien lo usa quita lo que sobra. redondeado al día, la clave de la consulta no cambia mientras no cambie `first`
export function paddedDayRange(first: Date, days: number): AgendaRange {
  const day = (offset: number) => {
    const date = new Date(first)
    date.setDate(date.getDate() + offset)
    return isoInstant(date)
  }
  return { from: day(-1), to: day(days + 1) }
}

// «Esta semana» pide la agenda desde el comienzo de ayer (hora del navegador), para no perder una sesión en curso que empezó antes de
// medianoche, hasta 8 días después de hoy: cubre los próximos 7 días desde cualquier hora. lo que sobra a cada lado lo quita weekSessions
// con el reloj de la pantalla
export function weekRange(now: number): AgendaRange {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return paddedDayRange(today, WEEK_DAYS)
}

// las sesiones de los próximos 7 días de las matrículas activas (la agenda trae también las finalizadas), sin las que ya terminaron.
// las canceladas y reprogramadas siguen: su estado se dice en la fila. el servidor las da por inicio
export function weekSessions(agenda: AgendaSession[], active: Enrollment[], now: number): AgendaSession[] {
  const ids = new Set(active.map((enrollment) => enrollment.id))
  return sessionsWithin(
    agenda.filter((session) => ids.has(session.enrollmentId) && Date.parse(session.end) > now),
    now,
    WEEK_DAYS
  )
}

// las que de verdad se celebran: las que cuenta el saludo
export function liveSessions<T extends Pick<Session, 'status'>>(sessions: T[]): T[] {
  return sessions.filter((session) => session.status !== 'CANCELADA')
}

export interface AgendaDay {
  key: string
  // el instante de la primera sesión del día, para escribir el día en su zona
  start: string
  timeZone: string
  sessions: AgendaSession[]
}

// por día civil en la zona de cada sesión (la de su edición), en el orden en que llegan
export function sessionsByDay(sessions: AgendaSession[]): AgendaDay[] {
  const days: AgendaDay[] = []
  for (const session of sessions) {
    const key = `${zonedDateTime(session.start, session.timeZone).date} ${session.timeZone}`
    const last = days.at(-1)
    if (last?.key === key) last.sessions.push(session)
    else days.push({ key, start: session.start, timeZone: session.timeZone, sessions: [session] })
  }
  return days
}

export function sessionsWithin<T extends Pick<Session, 'start'>>(sessions: T[], now: number, days: number): T[] {
  return sessions.filter((session) => Date.parse(session.start) < now + days * DAY_MS)
}

// un bloque del riel: la semana sale de la agenda y «Por hacer», del panel; cada uno falla y se reintenta por su cuenta, sin datos a medias
export interface Block<T> {
  items: T[]
  loading: boolean
  failed: boolean
  retry: () => void
}
