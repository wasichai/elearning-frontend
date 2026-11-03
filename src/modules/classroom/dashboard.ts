import { upcomingSessions, type Session } from '../../shared/sessions'
import type { ClassroomPanelItem, Enrollment, PendingAssessment } from './contract'

// lo que decide el panel del estudiante, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

const DAY_MS = 24 * 3600 * 1000

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

export type UpcomingSession = Session & { enrollment: Enrollment }
export type RailAssessment = PendingAssessment & { enrollment: Enrollment }

// lo que trae el panel de esas matrículas. el servidor ordena las sesiones por matrícula: aquí se funden, y el reloj de la pantalla
// deja fuera la que terminó con la página abierta. las evaluaciones van en el orden de las matrículas y, dentro, en el del curso
export function railItems(active: Enrollment[], panel: ClassroomPanelItem[], now: number) {
  const byId = new Map(panel.map((item) => [item.id, item]))
  const read = active.flatMap((enrollment) => {
    const item = byId.get(enrollment.id)
    return item ? [{ enrollment, item }] : []
  })
  return {
    sessions: upcomingSessions(
      read.flatMap(({ enrollment, item }) => item.upcomingSessions.map((session) => ({ ...session, enrollment }))),
      now
    ),
    assessments: read.flatMap(({ enrollment, item }) => item.pendingAssessments.map((pending) => ({ ...pending, enrollment })))
  }
}

export function sessionsWithin<T extends Pick<Session, 'start'>>(sessions: T[], now: number, days: number): T[] {
  return sessions.filter((session) => Date.parse(session.start) < now + days * DAY_MS)
}

// un bloque del riel. los dos salen de la misma lectura: si falla, fallan a la vez y sin datos a medias
export interface Block<T> {
  items: T[]
  loading: boolean
  failed: boolean
  retry: () => void
}
