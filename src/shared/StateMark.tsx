// la marca de estado de Colofón (docs/design-system/colofon/Components.dc.html §4): la forma dice el estado, no solo el color.
// no iniciada es el contorno; iniciada, medio círculo; completada, el círculo lleno con su visto; aprobada, lo mismo en success.
// used es un intento ya gastado, del que aquí no se sabe si aprobó: lleno, sin visto. es decorativa: el estado siempre va en texto al lado
export type MarkState = 'todo' | 'started' | 'done' | 'passed' | 'used'

export function StateMark({ state, className = '' }: { state: MarkState; className?: string }) {
  return (
    <svg aria-hidden="true" data-slot="state-mark" data-state={state} viewBox="0 0 16 16" className={`size-4 shrink-0 ${className}`}>
      {state === 'todo' ? <circle cx="8" cy="8" r="6" fill="none" strokeWidth="1.5" className="stroke-border-control" /> : null}
      {state === 'started' ? (
        <>
          <circle cx="8" cy="8" r="6" fill="none" strokeWidth="1.5" className="stroke-brand" />
          <path d="M8 2a6 6 0 0 0 0 12z" className="fill-brand" />
        </>
      ) : null}
      {state === 'done' || state === 'passed' || state === 'used' ? (
        <circle cx="8" cy="8" r="7" className={state === 'passed' ? 'fill-success' : state === 'used' ? 'fill-ink-muted' : 'fill-brand'} />
      ) : null}
      {state === 'done' || state === 'passed' ? (
        <path
          d="M5 8.2l2 2 4-4.2"
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={state === 'passed' ? 'stroke-surface' : 'stroke-on-brand'}
        />
      ) : null}
    </svg>
  )
}

// el estado de una lección del aula en su marca
export function lessonMark(status: 'NO_INICIADA' | 'INICIADA' | 'COMPLETADA' | 'APROBADA'): MarkState {
  return status === 'APROBADA' ? 'passed' : status === 'COMPLETADA' ? 'done' : status === 'INICIADA' ? 'started' : 'todo'
}
