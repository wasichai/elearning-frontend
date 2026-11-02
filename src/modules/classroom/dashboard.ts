import type { UseQueryResult } from '@tanstack/react-query'
import type { Session } from '../../shared/sessions'
import { isDone, type Classroom, type Enrollment } from './contract'
import { lessonPath, orderedUnits, type PlacedLesson } from './lessons'

// lo que decide el panel del estudiante, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

// cada matrícula activa cuesta dos peticiones (su aula y sus sesiones): con 6 cursos a la vez ya son 12 y nadie lleva más
// a la vez de forma habitual. el panel dice cuándo lo aplicó, para que un bloque vacío no se lea como «no hay nada»
export const MAX_RAIL_COURSES = 6

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

// las matrículas de las que el riel lee sesiones y evaluaciones: solo activas (una finalizada ya no tiene nada por delante)
export function railEnrollments({ primary, inProgress, completed }: EnrollmentGroups): { read: Enrollment[]; capped: boolean } {
  const active = [...(primary ? [primary] : []), ...inProgress, ...completed].filter(isActive)
  return { read: active.slice(0, MAX_RAIL_COURSES), capped: active.length > MAX_RAIL_COURSES }
}

// sin canceladas y de la más próxima a la más lejana. la que está en curso aún cuenta: todavía se puede entrar
export function upcomingSessions<T extends Pick<Session, 'status' | 'start' | 'end'>>(sessions: T[], now: number): T[] {
  return sessions.filter((session) => session.status !== 'CANCELADA' && Date.parse(session.end) > now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

export function sessionsWithin<T extends Pick<Session, 'start'>>(sessions: T[], now: number, days: number): T[] {
  return sessions.filter((session) => Date.parse(session.start) < now + days * DAY_MS)
}

// pendiente: tiene evaluación, se puede hacer ya, no está hecha y le quedan intentos o tiene uno abierto.
// el contrato no da plazos de evaluación: el orden es el del curso
export function pendingAssessments(classroom: Pick<Classroom, 'units'>): PlacedLesson[] {
  return lessonPath(orderedUnits(classroom)).filter(({ lesson }) => {
    const assessment = lesson.assessment
    if (!assessment || lesson.completion === 'NOT_YET' || isDone(lesson.progress.status)) return false
    return assessment.openAttemptId !== null || assessment.attemptsUsed < assessment.maxAttempts
  })
}

// un bloque del riel, leído de una consulta por matrícula: cada una falla por su cuenta
export interface Block<T> {
  items: T[]
  loading: boolean
  // alguna consulta falló; con partial, las otras sí llegaron y sus datos se ven igual
  failed: boolean
  partial: boolean
  retry: () => void
}

export function blockOf<Data, T>(queries: UseQueryResult<Data>[], items: (data: Data, index: number) => T[]): Block<T> {
  const failed = queries.filter((query) => query.isError)
  return {
    items: queries.flatMap((query, index) => (query.data ? items(query.data, index) : [])),
    loading: queries.some((query) => query.isPending),
    failed: failed.length > 0,
    partial: failed.length > 0 && failed.length < queries.length,
    // solo lo que falló: lo demás ya está a la vista
    retry: () => failed.forEach((query) => void query.refetch())
  }
}
