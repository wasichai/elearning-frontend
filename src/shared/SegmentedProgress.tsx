import { useTranslation } from 'react-i18next'

// el progreso de un curso en una fila, un segmento por lección y agrupado por unidades (docs/design-system/colofon/Components.dc.html §5).
// el estado no va solo en el color: completada es relleno, iniciada es rayado (nunca cuenta como hecha), no iniciada solo contorno.
// los textos están en el i18n del aula (src/shared no tiene espacio de nombres): quien la use debe tener el módulo `classroom` registrado
export type LessonProgressState = 'NO_INICIADA' | 'INICIADA' | 'COMPLETADA' | 'APROBADA'

export interface ProgressUnit {
  id: string
  title: string
  lessons: { id: string; title: string; state: LessonProgressState }[]
}

export function progressSummary(units: ProgressUnit[]): { done: number; started: number; total: number } {
  const lessons = units.flatMap((unit) => unit.lessons)
  return {
    done: lessons.filter((lesson) => lesson.state === 'COMPLETADA' || lesson.state === 'APROBADA').length,
    started: lessons.filter((lesson) => lesson.state === 'INICIADA').length,
    total: lessons.length
  }
}

const SEGMENT: Record<LessonProgressState, string> = {
  COMPLETADA: 'border-ink bg-ink',
  APROBADA: 'border-ink bg-ink',
  INICIADA: 'border-ink-muted bg-[repeating-linear-gradient(135deg,var(--ink-muted)_0_1.5px,transparent_1.5px_4px)]',
  NO_INICIADA: 'border-border-control'
}

export function SegmentedProgress({ units, currentLessonId, size = 'md' }: { units: ProgressUnit[]; currentLessonId?: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation('classroom')
  const { done, started, total } = progressSummary(units)
  const doneText = t('progress.segmentedDone', { done, total })
  const startedText = started > 0 ? t('progress.segmentedStarted', { count: started }) : ''
  // «· 1 iniciada» se lee «0 de 14 completadas, 1 iniciada»
  const label = startedText ? `${doneText}, ${startedText.replace(/^·\s*/, '')}` : doneText
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="img" aria-label={label} className="flex min-w-0 flex-nowrap gap-1">
        {units
          .filter((unit) => unit.lessons.length > 0)
          .map((unit) => (
            // cada unidad pesa por sus lecciones: todos los segmentos miden lo mismo
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
          ))}
      </div>
      <p className="text-label text-ink">
        <span>{doneText}</span>
        {startedText ? <span className="text-ink-muted"> {startedText}</span> : null}
      </p>
    </div>
  )
}
