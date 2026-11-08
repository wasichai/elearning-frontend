import { useWasichaiLinks } from '@wasichai/core'
import { ChartNoAxesColumnIncreasing, Clock, MonitorPlay } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatCivilRange, formatNumber } from '../../shared/format'
import { Skeleton } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import type { CourseSummary, NextOffering } from './contract'
import { AVAILABILITY, IconFact, IllustrativeMark, offeringState } from './parts'
import { CATALOG_ROUTES } from './routes'

const CARD = 'flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface'

// un curso del catálogo (docs/design-system/historico-quipu/components/CourseCard). toda la tarjeta enlaza a la ficha con el ::after del título:
// así hay un solo interactivo y un solo nombre para el lector de pantalla. el anillo de foco lo dibuja la tarjeta, no el enlace
export function CourseCard({ course }: { course: CourseSummary }) {
  const { t, i18n } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <article
      className={`${CARD} relative transition-shadow duration-[160ms] hover:shadow-overlay motion-reduce:transition-none has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus has-[a:focus-visible]:outline-solid`}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          {course.category ? <span>{course.category.name}</span> : null}
          {course.illustrative ? <IllustrativeMark /> : null}
        </div>
        <h3 className="text-h4 text-balance text-ink">
          <Link
            to={links.to(CATALOG_ROUTES.course, { slug: course.slug })}
            className="underline-offset-4 after:absolute after:inset-0 hover:text-brand-strong hover:underline focus-visible:outline-none"
          >
            {course.title}
          </Link>
        </h3>
        {course.summary ? <p className="line-clamp-2 text-sm text-ink-muted">{course.summary}</p> : null}
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
        <Availability offering={course.nextOffering} />
      </div>
    </article>
  )
}

function Availability({ offering }: { offering: NextOffering | null }) {
  const { t, i18n } = useTranslation('catalog')
  const footer = 'mt-auto flex flex-col items-start gap-2 border-t border-border pt-3 text-sm'
  if (!offering)
    return (
      <div className={footer}>
        <p className="text-ink-muted">{t('offering.none')}</p>
      </div>
    )
  const state = offeringState(offering)
  return (
    <div className={footer}>
      <p>
        <span className="text-ink-muted">{t('offering.next')} </span>
        <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)}</span>
      </p>
      <StatusBadge state={AVAILABILITY[state]}>{t(`offering.state.${state}`)}</StatusBadge>
    </div>
  )
}

// el hueco de una tarjeta, con su misma geometría. el aviso a lectores lo da la región de resultados
export function CourseCardSkeleton() {
  return (
    <div data-slot="course-card-skeleton" className={CARD}>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-6 w-4/5" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-6 w-2/5" />
        </div>
      </div>
    </div>
  )
}
