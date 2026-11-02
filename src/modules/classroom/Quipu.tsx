import { isDone, type Lesson, type ProgressSummary } from './contract'

// el progreso en nudos, la firma del sistema de diseño Quipu (docs/design-system/components/Progress): la forma dice el
// tipo (círculo lección, rombo evaluación, doble anillo sesión en vivo) y el relleno el estado (success completada,
// anillo brand en curso, hueco sin empezar). es decorativo: siempre va con un texto que diga «n de m lecciones»
export type KnotKind = 'lesson' | 'assessment' | 'session'
// used: un intento gastado, del que no se sabe aquí si aprobó; por eso no lleva el musgo de lo completado
export type KnotState = 'done' | 'active' | 'todo' | 'used'
export interface KnotData {
  kind: KnotKind
  state: KnotState
}

// con más, el cordón no se lee: se vuelve a la barra
export const MAX_KNOTS = 24

export function knotOf(lesson: Pick<Lesson, 'assessment' | 'completion' | 'progress'>): KnotData {
  const kind = lesson.assessment ? 'assessment' : lesson.completion === 'ATTENDANCE' ? 'session' : 'lesson'
  const status = lesson.progress.status
  return { kind, state: isDone(status) ? 'done' : status === 'INICIADA' ? 'active' : 'todo' }
}

// las lecciones que cuentan para el progreso del curso (una NOT_YET no se puede completar todavía y no cuenta)
export function courseKnots(units: { lessons: Lesson[] }[]): KnotData[] {
  return units.flatMap((unit) => unit.lessons.filter((lesson) => lesson.completion !== 'NOT_YET').map(knotOf))
}

// del resumen de una matrícula, que no trae el tipo de cada lección: nudos de lección, las completadas primero
export function summaryKnots(progress: ProgressSummary): KnotData[] {
  return Array.from({ length: progress.totalLessons }, (_, index) => ({ kind: 'lesson', state: index < progress.completedLessons ? 'done' : 'todo' }))
}

// los intentos de una evaluación, en rombos: los ya usados, el abierto si lo hay y los que quedan libres
export function attemptKnots(max: number, used: number, open: boolean): KnotData[] {
  return Array.from({ length: max }, (_, index) => ({
    kind: 'assessment',
    state: index < used ? 'used' : open && index === used ? 'active' : 'todo'
  }))
}

const SHAPE: Record<KnotKind, string> = {
  lesson: 'rounded-full',
  assessment: 'rounded-[3px] rotate-45 scale-[0.86]',
  session: 'rounded-full'
}

const FILL: Record<KnotState, string> = {
  used: 'border-ink-muted bg-ink-muted',
  done: 'border-success bg-success',
  active: 'border-brand bg-surface',
  todo: 'border-border-control bg-surface'
}

// el anillo exterior de la sesión y el anillo interior grueso de lo que está en curso, que pueden ir juntos
function rings({ kind, state }: KnotData): string | undefined {
  const outer = kind === 'session' ? `0 0 0 2px var(--surface), 0 0 0 4px var(${state === 'done' ? '--success' : '--border-control'})` : undefined
  const inner = state === 'active' ? 'inset 0 0 0 2px var(--surface), inset 0 0 0 6px var(--brand)' : undefined
  return [outer, inner].filter(Boolean).join(', ') || undefined
}

export function Knot({ kind, state }: KnotData) {
  return (
    <span
      aria-hidden="true"
      data-knot={kind}
      data-state={state}
      className={`relative size-3.5 shrink-0 border-2 ${SHAPE[kind]} ${FILL[state]}`}
      style={{ boxShadow: rings({ kind, state }) }}
    />
  )
}

// el cordón: un hilo border-control (3:1) con los nudos encima, de izquierda a derecha. cada nudo lleva su tramo de hilo,
// así en un móvil estrecho el cordón salta de línea y cada fila sigue siendo un cordón
export function Quipu({ knots }: { knots: KnotData[] }) {
  if (knots.length === 0 || knots.length > MAX_KNOTS) return null
  return (
    <span aria-hidden="true" className="flex flex-wrap items-center gap-y-2 py-1">
      {knots.map((knot, index) => (
        // el anillo exterior de la sesión ocupa 4px más: su tramo es más largo para no pisar al vecino
        <span key={index} className={`relative flex items-center ${knot.kind === 'session' ? 'px-1.5' : 'pr-1.5 pl-0.5 last:pr-0.5'}`}>
          <span className="absolute inset-x-0 top-1/2 -mt-px h-0.5 bg-border-control" />
          <Knot {...knot} />
        </span>
      ))}
    </span>
  )
}
