import { useWasichaiLinks } from '@wasichai/core'
import { ChartNoAxesColumnIncreasing, Clock, MonitorPlay } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatCivilRange, formatNumber } from '../../shared/format'
import { Skeleton } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import type { CourseSummary, NextOffering } from './contract'
import { AVAILABILITY, IconFact, offeringState } from './parts'
import { CATALOG_ROUTES } from './routes'

// dos columnas desde tableta: el curso y, a la derecha, su próxima edición. en un móvil, una debajo de la otra
const ROW = 'grid min-w-0 gap-x-8 gap-y-3 py-5 md:grid-cols-[minmax(0,1fr)_15rem]'
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

// una fila del catálogo (docs/design-system/colofon/Catalog.dc.html): la colección en meta, el título como único enlace, el resumen en dos
// líneas y los datos. el título se corta a dos líneas con el completo en title; la fila entera no es clicable
export function CourseRow({ course }: { course: CourseSummary }) {
  const { t, i18n } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <li className={ROW}>
      <div className="flex min-w-0 flex-col gap-2">
        {course.category ? <p className="meta">{course.category.name}</p> : null}
        <h3 className="text-h4 font-read text-ink">
          <Link
            to={links.to(CATALOG_ROUTES.course, { slug: course.slug })}
            title={course.title}
            className={`line-clamp-2 rounded-sm break-words underline decoration-border-control underline-offset-4 hover:text-brand-strong hover:decoration-current ${FOCUS}`}
          >
            {course.title}
          </Link>
        </h3>
        {course.summary ? <p className="text-secondary line-clamp-2 max-w-measure text-ink-muted">{course.summary}</p> : null}
        <dl className="text-secondary flex flex-wrap gap-x-4 gap-y-1">
          <IconFact icon={ChartNoAxesColumnIncreasing} label={t('course.level')}>
            {t(`level.${course.level}`)}
          </IconFact>
          <IconFact icon={MonitorPlay} label={t('course.modality')}>
            {t(`modality.${course.modality}`)}
          </IconFact>
          <IconFact icon={Clock} label={t('course.duration')}>
            {t('course.durationValue', { count: course.weeks, hours: formatNumber(course.workload.totalHours, i18n.language) })}
          </IconFact>
        </dl>
      </div>
      <Availability offering={course.nextOffering} />
    </li>
  )
}

function Availability({ offering }: { offering: NextOffering | null }) {
  const { t, i18n } = useTranslation('catalog')
  if (!offering)
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-secondary text-ink-muted">{t('offering.none')}</p>
      </div>
    )
  const state = offeringState(offering)
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <p className="meta">{t('offering.nextLabel')}</p>
      <p className="text-body font-semibold text-ink tabular-nums">
        {formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)}
      </p>
      <StatusBadge state={AVAILABILITY[state]}>{t(`offering.state.${state}`)}</StatusBadge>
    </div>
  )
}

// el hueco de una fila, con su misma geometría. el aviso a lectores lo da la región de resultados
export function CourseRowSkeleton() {
  return (
    <div data-slot="course-row-skeleton" className={ROW}>
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-6 w-2/5" />
      </div>
    </div>
  )
}
