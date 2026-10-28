import { ApiError } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { formatCivilRange, formatNumber, timeZoneLabel } from '../../shared/format'
import { problemKind } from '../../shared/ProblemState'
import type { Enrollment, ProgressSummary } from './contract'

// piezas que comparten «Mis cursos» y el aula

// el avance como barra accesible: el lector de pantalla anuncia el porcentaje y las lecciones; la vista, una línea fina
export function ProgressBar({ progress, label, size = 'md' }: { progress: ProgressSummary; label: string; size?: 'sm' | 'md' }) {
  const { t, i18n } = useTranslation('classroom')
  const values = {
    completed: formatNumber(progress.completedLessons, i18n.language),
    total: formatNumber(progress.totalLessons, i18n.language),
    percent: formatNumber(progress.percent, i18n.language)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={t('progress.valueText', values)}
        className={`w-full overflow-hidden rounded-full bg-surface-muted ${size === 'sm' ? 'h-1' : 'h-1.5'}`}
      >
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress.percent}%` }} />
      </div>
      {size === 'md' ? (
        <p aria-hidden="true" className="text-xs text-ink-muted tabular-nums">
          {t('progress.value', values)}
        </p>
      ) : null}
    </div>
  )
}

// las fechas de la edición son fechas civiles de su zona: se escriben en esa zona y se dice cuál es
export function OfferingDates({ offering }: { offering: Enrollment['offering'] }) {
  const { t, i18n } = useTranslation('classroom')
  const locale = i18n.language
  return (
    <p className="flex flex-wrap gap-x-2 text-sm text-ink-muted">
      <span>
        <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, locale)}</span>
        <span> · {t(`offering.status.${offering.status}`)}</span>
      </span>
      <span className="text-xs leading-5">{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span>
    </p>
  )
}

// el texto de un error, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: 'enrollments' | 'classroom') {
  const { t } = useTranslation('classroom')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
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
