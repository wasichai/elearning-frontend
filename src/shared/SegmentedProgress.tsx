import { useTranslation } from 'react-i18next'

// el progreso de un curso en una fila, un segmento por lección y agrupado por unidades (docs/design-system/colofon/Components.dc.html §5).
// el estado no va solo en el color: completada es relleno, iniciada es rayado (nunca cuenta como hecha), no iniciada solo contorno.
// NO_CUENTA es una lección que el servidor no cuenta para el progreso (completion NOT_YET): tiene su segmento, para que la barra tenga
// tantos como el índice, pero en contorno discontinuo y fuera de la cifra, del texto y del aria-label.
// los textos están en el i18n del aula (src/shared no tiene espacio de nombres): quien la use debe tener el módulo `classroom` registrado
export type LessonProgressState = 'NO_INICIADA' | 'INICIADA' | 'COMPLETADA' | 'APROBADA' | 'NO_CUENTA'

export interface ProgressUnit {
  id: string
  title: string
  lessons: { id: string; title: string; state: LessonProgressState }[]
}

export function progressSummary(units: ProgressUnit[]): { done: number; started: number; total: number } {
  const lessons = units.flatMap((unit) => unit.lessons).filter((lesson) => lesson.state !== 'NO_CUENTA')
  return {
    done: lessons.filter((lesson) => lesson.state === 'COMPLETADA' || lesson.state === 'APROBADA').length,
    started: lessons.filter((lesson) => lesson.state === 'INICIADA').length,
    total: lessons.length
  }
}

// por encima de este número de lecciones un segmento por lección quedaría por debajo de ~3px en el ancho de una columna: se agrupa por
// unidad, un segmento por unidad con el relleno proporcional a lo completado. El texto y el aria-label son los mismos
export const GROUP_BY_UNIT_ABOVE = 60

const SEGMENT: Record<LessonProgressState, string> = {
  COMPLETADA: 'border-ink bg-ink',
  APROBADA: 'border-ink bg-ink',
  INICIADA: 'border-ink-muted bg-[repeating-linear-gradient(135deg,var(--ink-muted)_0_1.5px,transparent_1.5px_4px)]',
  NO_INICIADA: 'border-border-control',
  NO_CUENTA: 'border-dashed border-border-control'
}

export function SegmentedProgress({ units, currentLessonId, size = 'md' }: { units: ProgressUnit[]; currentLessonId?: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation('classroom')
  const { done, started, total } = progressSummary(units)
  const doneText = t('progress.segmentedDone', { done, total })
  const startedText = started > 0 ? t('progress.segmentedStarted', { count: started }) : ''
  // «· 1 iniciada» se lee «0 de 14 completadas, 1 iniciada»
  const grouped = units.reduce((sum, unit) => sum + unit.lessons.length, 0) > GROUP_BY_UNIT_ABOVE
  const label = startedText ? `${doneText}, ${startedText.replace(/^·\s*/, '')}` : doneText
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* overflow-hidden: con hasta 60 lecciones (por encima se agrupa por unidad) el mínimo de cada segmento (2px más su hueco) puede superar el ancho; la fila recorta y no empuja
          la página. p-0.5 con -m-0.5: el recorte deja sitio al anillo de 2px de la actual, también en la primera y la última, sin mover la fila */}
      <div role="img" aria-label={label} className="-m-0.5 flex min-w-0 flex-nowrap gap-1 overflow-hidden p-0.5">
        {units
          .filter((unit) => unit.lessons.length > 0)
          .map((unit) =>
            grouped ? (
              <UnitSegment key={unit.id} unit={unit} current={unit.lessons.some((lesson) => lesson.id === currentLessonId)} size={size} />
            ) : (
              // cada unidad pesa por sus lecciones: todos los segmentos miden lo mismo. gap-[3px] entre lecciones de una unidad, más estrecho
              // que el gap-1 entre unidades: el ojo agrupa por unidad sin otra marca (Components.dc.html §5); no hay token de 3px en la escala
              <div key={unit.id} data-slot="progress-unit" style={{ flex: `${unit.lessons.length} 1 0` }} className="flex min-w-0 flex-nowrap gap-[3px]">
                {unit.lessons.map((lesson) => (
                  <span
                    key={lesson.id}
                    data-slot="progress-segment"
                    data-state={lesson.state}
                    data-current={lesson.id === currentLessonId ? '' : undefined}
                    className={`box-border min-w-[2px] flex-1 border ${size === 'sm' ? 'h-1.5' : 'h-2'} ${SEGMENT[lesson.state]} ${
                      lesson.id === currentLessonId ? 'relative z-10 ring-2 ring-brand' : ''
                    }`}
                  />
                ))}
              </div>
            )
          )}
      </div>
      <p className="text-label text-ink">
        <span>{doneText}</span>
        {startedText ? <span className="text-ink-muted"> {startedText}</span> : null}
      </p>
    </div>
  )
}

// el segmento de una unidad en un curso grande: contorno de la unidad y relleno de lo completado, proporcional a las lecciones que cuentan
function UnitSegment({ unit, current, size }: { unit: ProgressUnit; current: boolean; size: 'sm' | 'md' }) {
  const counted = unit.lessons.filter((lesson) => lesson.state !== 'NO_CUENTA')
  const done = counted.filter((lesson) => lesson.state === 'COMPLETADA' || lesson.state === 'APROBADA').length
  const percent = counted.length === 0 ? 0 : (done / counted.length) * 100
  return (
    <span
      data-slot="progress-segment"
      data-grouped=""
      data-done={done}
      data-total={counted.length}
      data-current={current ? '' : undefined}
      style={{ flex: `${unit.lessons.length} 1 0` }}
      className={`relative box-border flex min-w-[2px] overflow-hidden border border-ink-muted ${size === 'sm' ? 'h-1.5' : 'h-2'} ${
        current ? 'z-10 ring-2 ring-brand' : ''
      }`}
    >
      <span data-slot="progress-fill" style={{ width: `${percent}%` }} className="bg-ink" />
    </span>
  )
}
