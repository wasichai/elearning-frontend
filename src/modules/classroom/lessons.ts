import { attended, type Session } from '../../shared/sessions'
import type { MarkState } from '../../shared/StateMark'
import type { Classroom, Lesson, Unit } from './contract'

// el recorrido del curso en orden (unidad, lección), como lo cuenta el servidor para nextLesson

export interface PlacedLesson {
  lesson: Lesson
  unit: Unit
}

export function orderedUnits(classroom: Pick<Classroom, 'units'>): Unit[] {
  return [...classroom.units].sort((a, b) => a.order - b.order).map((unit) => ({ ...unit, lessons: [...unit.lessons].sort((a, b) => a.order - b.order) }))
}

export function lessonPath(units: Unit[]): PlacedLesson[] {
  return units.flatMap((unit) => unit.lessons.map((lesson) => ({ lesson, unit })))
}

// la lección que se abre sin ?leccion: la siguiente por hacer y, con todo hecho, la primera
export function defaultLesson(path: PlacedLesson[], nextLessonId: string | undefined): PlacedLesson | undefined {
  return path.find((placed) => placed.lesson.id === nextLessonId) ?? path[0]
}

// la anterior y la siguiente en el recorrido
export function neighbours(path: PlacedLesson[], lessonId: string): { previous?: PlacedLesson; next?: PlacedLesson } {
  const index = path.findIndex((placed) => placed.lesson.id === lessonId)
  if (index < 0) return {}
  return { previous: path[index - 1], next: path[index + 1] }
}

// una cifra de avance: cuántas de cuántas
export interface Figure {
  completed: number
  total: number
}

// las mismas cuentas que la regla de finalización del servidor (CompletionService): lo que dice la cabecera no contradice a «Finalización».
// todas las evaluaciones de las lecciones; aprobada solo si su mejor intento lo está (uno esperando corrección todavía no)
export function assessmentFigure(units: Pick<Unit, 'lessons'>[]): Figure {
  const assessments = units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.assessment ?? []))
  return { completed: assessments.filter((assessment) => assessment.best?.passed === true).length, total: assessments.length }
}

// el aula no da la asistencia por matrícula: sale de las sesiones de quien mira. toda sesión no cancelada cuenta, también las futuras
export function attendanceFigure(sessions: Session[]): Figure {
  const held = sessions.filter((session) => session.status !== 'CANCELADA')
  return { completed: held.filter((session) => attended(session.attendance)).length, total: held.length }
}

// los intentos de una evaluación como marcas de estado: los ya usados (llenos, sin visto: aquí no se sabe si aprobaron), el abierto si lo
// hay (medio) y los que quedan libres (contorno)
export function attemptMarks(max: number, used: number, open: boolean): MarkState[] {
  return Array.from({ length: max }, (_, index) => (index < used ? 'used' : open && index === used ? 'started' : 'todo'))
}
