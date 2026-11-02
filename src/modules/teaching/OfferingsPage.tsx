import { useQueries } from '@tanstack/react-query'
import { EmptyState, useApiClient, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CalendarDays, ClipboardCheck, Users, type LucideIcon } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CordBanner } from '../../shared/CordBanner'
import { formatCivilRange, formatNumber, timeZoneLabel } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, ScreenHeader, Section, Skeleton, Stat, StatList } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { offeringSessionsQuery, queueQuery, useOfferings } from './api'
import type { TeachingOffering } from './contract'
import { GradingTray } from './GradingTray'
import { byWork, panelFigures, panelPlan, upcomingSessions } from './panel'
import { OfferingStatusBadge, useProblemText } from './parts'
import { CLASSROOM_ENROLLMENTS_ROUTE, TEACHING_ROUTES } from './routes'
import { SessionAgenda } from './SessionAgenda'

const NO_OFFERINGS: TeachingOffering[] = []

// «Mis ediciones», el panel docente: las cifras de lo asignado, lo que espera corrección, lo que viene en la agenda y una tarjeta
// por edición. las cifras salen de la lista; la bandeja y la agenda, de una consulta por edición que falla por su cuenta
export function OfferingsPage() {
  const { t } = useTranslation('teaching')
  const client = useApiClient()
  const query = useOfferings()
  const offerings = useMemo(() => byWork(query.data ?? NO_OFFERINGS), [query.data])
  const plan = useMemo(() => panelPlan(offerings), [offerings])
  // las mismas consultas (y caché) que la cola y las sesiones de cada edición
  const queues = useQueries({ queries: plan.grading.map((offering) => queueQuery(client, offering.code)) })
  const sessionLists = useQueries({ queries: plan.agenda.map((offering) => offeringSessionsQuery(client, offering.code)) })
  useRefetchOnRevisit(() => {
    void query.refetch()
    ;[...queues, ...sessionLists].forEach((list) => void list.refetch())
  })
  const { title, description } = useProblemText(query.error, 'offerings')
  const now = Date.now()
  // cuántas sesiones vienen, solo de las ediciones cuya lista se leyó: de las demás no se da cifra
  const upcoming = new Map(
    plan.agenda.flatMap((offering, index) => {
      const data = sessionLists[index]?.data
      return data ? [[offering.code, upcomingSessions(data, now).length] as const] : []
    })
  )
  const hasOfferings = offerings.length > 0
  return (
    <>
      <ScreenHeader title={t('offerings.title')} subtitle={t('offerings.subtitle')} width="wide">
        {hasOfferings ? <Figures offerings={offerings} /> : null}
      </ScreenHeader>
      <ScreenBody width="wide">
        {query.isError ? (
          <ProblemState title={title} description={description}>
            <Button variant="secondary" className="min-h-11" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          </ProblemState>
        ) : !query.data ? (
          <PanelSkeleton />
        ) : !hasOfferings ? (
          <NoOfferings />
        ) : (
          // el orden del documento es el del móvil (bandeja, agenda, ediciones); desde lg, la agenda pasa al riel
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-10">
            <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
              <GradingTray offerings={plan.grading} queries={queues} capped={plan.gradingCapped} />
            </div>
            <aside aria-label={t('panel.rail')} className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border lg:pl-8">
              <SessionAgenda offerings={plan.agenda} queries={sessionLists} capped={plan.agendaCapped} />
            </aside>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <Section title={t('panel.offerings')}>
                <ul className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  {offerings.map((offering) => (
                    <li key={offering.code} className="min-w-0">
                      <OfferingCard offering={offering} upcoming={upcoming.get(offering.code)} />
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        )}
      </ScreenBody>
    </>
  )
}

function Figures({ offerings }: { offerings: TeachingOffering[] }) {
  const { t, i18n } = useTranslation('teaching')
  const format = (value: number) => formatNumber(value, i18n.language)
  const figures = panelFigures(offerings)
  return (
    <StatList className="pb-5">
      <Stat label={t('panel.figures.offerings')} value={format(figures.offerings)} />
      <Stat label={t('panel.figures.pending')} value={format(figures.pending)} tone={figures.pending > 0 ? 'review' : undefined} />
      <Stat label={t('panel.figures.enrolled')} value={format(figures.enrolled)} />
    </StatList>
  )
}

// sin asignaciones el menú puede verse igual (core decide la visibilidad solo con permisos): se dice con claridad y qué traerá.
// la persona puede estar matriculada en otros cursos: el aula es otro módulo y se enlaza por su clave, solo si está registrado
function NoOfferings() {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  return (
    <EmptyState title={t('offerings.empty')}>
      <p>{t('offerings.emptyHint')}</p>
      {links.has(CLASSROOM_ENROLLMENTS_ROUTE) ? (
        <Button asChild variant="secondary" className="mt-2 min-h-11">
          <Link to={links.to(CLASSROOM_ENROLLMENTS_ROUTE)}>{t('offerings.toEnrollments')}</Link>
        </Button>
      ) : null}
    </EmptyState>
  )
}

function PanelSkeleton() {
  const { t } = useTranslation('teaching')
  return (
    <div role="status" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10">
      <span className="sr-only">{t('offerings.loading')}</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-5 h-48 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

function Access({ to, icon: Icon, children }: { to: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 min-w-0 items-center gap-2 px-5 py-2 text-sm break-words text-ink transition-colors duration-[160ms] hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:px-6"
    >
      {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" /> : null}
      {children}
    </Link>
  )
}

// una edición es un objeto: su tarjeta, con su banda, sus datos y sus tres accesos con la cifra de cada uno. ninguno es primario.
// sin leer sus sesiones (terminada, fuera del tope, o aún no llegan) no se da cifra de ellas: el acceso se queda en «Sesiones»
function OfferingCard({ offering, upcoming }: { offering: TeachingOffering; upcoming?: number }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const { code, course, enrolled, pendingAttempts } = offering
  return (
    <article className="@container flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
      <CordBanner seed={course.slug} height={48} />
      <div className="flex flex-1 flex-col gap-2 px-5 pt-3 pb-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h3 className="min-w-0 text-base leading-snug font-semibold tracking-tight break-words">
            <Link
              to={links.to(TEACHING_ROUTES.roster, { code })}
              className="inline-flex min-h-11 items-center rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline sm:min-h-6"
            >
              {course.title}
            </Link>
          </h3>
          <OfferingStatusBadge status={offering.status} />
        </div>
        <p className="text-sm text-ink-muted">{course.code}</p>
        <p className="flex flex-wrap gap-x-3 text-sm text-ink-muted">
          <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, locale)}</span>
          <span>{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span>
        </p>
      </div>
      <div className="mt-auto grid grid-cols-1 divide-y divide-border border-t border-border @2xl:grid-cols-3 @2xl:divide-x @2xl:divide-y-0">
        <Access to={links.to(TEACHING_ROUTES.roster, { code })} icon={Users}>
          {t('offerings.enrolled', { count: enrolled, value: formatNumber(enrolled, locale) })}
        </Access>
        {/* con trabajo, el icono ya lo pone la insignia */}
        <Access to={links.to(TEACHING_ROUTES.queue, { code })} icon={pendingAttempts > 0 ? undefined : ClipboardCheck}>
          {pendingAttempts > 0 ? (
            <StatusBadge state="review">{t('offerings.pending', { count: pendingAttempts, value: formatNumber(pendingAttempts, locale) })}</StatusBadge>
          ) : (
            t('offerings.nothingPending')
          )}
        </Access>
        <Access to={links.to(TEACHING_ROUTES.sessions, { code })} icon={CalendarDays}>
          {upcoming === undefined
            ? t('panel.sessions')
            : upcoming === 0
              ? t('panel.noUpcoming')
              : t('panel.upcoming', { count: upcoming, value: formatNumber(upcoming, locale) })}
        </Access>
      </div>
    </article>
  )
}
