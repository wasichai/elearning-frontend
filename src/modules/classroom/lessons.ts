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
