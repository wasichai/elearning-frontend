import { ApiError } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { formatCivilRange, timeZoneLabel } from '../../shared/format'
import { problemKind } from '../../shared/ProblemState'
import type { Enrollment } from './contract'

// piezas que comparten «Mis cursos» y el aula

export { WRAP } from '../../shared/buttons'

// las filas del panel del temario: las unidades y lecciones, y los logros
export const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus'
export const UNIT_ROW = '-mx-2 flex min-h-13 cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 hover:bg-surface-muted'

// las fechas de la edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es, salvo que la página ya lo diga
// phase=false: sin la fase de la edición, para una matrícula ya completada («Aún no empieza» contradiría el curso terminado)
export function OfferingDates({ offering, showZone = true, phase = true }: { offering: Enrollment['offering']; showZone?: boolean; phase?: boolean }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  return (
    <p className="flex flex-wrap gap-x-2 text-secondary text-ink-muted">
      <span>
        <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, locale)}</span>
        {phase ? <span> · {t(`offering.status.${offering.status}`)}</span> : null}
      </span>
      {showZone ? <span>{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span> : null}
    </p>
  )
}

// el texto de un error, por tipo; el estado HTTP va aparte y plegado, para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: 'enrollments' | 'classroom' | 'attempt' | 'sessions' | 'completion' | 'certificate') {
  const { t } = useTranslation('classroom')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`),
    technical: status === undefined ? undefined : { summary: t('problem.technical'), text: t('problem.code', { status }) }
  }
}

// el tamaño de un archivo, en la unidad que se lee mejor (KB, MB…)
export function formatFileSize(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return new Intl.NumberFormat(locale, { style: 'unit', unit: units[unit], unitDisplay: 'short', maximumFractionDigits: unit < 2 ? 0 : 1 }).format(value)
}

// un vocabulario abierto del modelo (tipo de lección): la traducción si existe; si no, el valor legible
export function useOpenLabel(group: string) {
  const { t } = useTranslation('classroom')
  return (value: string) => t(`${group}.${value}`, { defaultValue: value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ') })
}
