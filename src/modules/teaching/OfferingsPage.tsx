import { EmptyState, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CalendarDays, ClipboardCheck, GraduationCap, Users, type LucideIcon } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CordBanner } from '../../shared/CordBanner'
import { formatCivilRange, formatNumber, timeZoneLabel } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { useRefetchOnRevisit } from '../../shared/revisit'
import { ScreenBody, ScreenHeader, Section, Skeleton, Stat, StatList } from '../../shared/Screen'
import { StatusBadge } from '../../shared/StatusBadge'
import { upcomingSessions } from '../../shared/sessions'
import { useOfferings, useTeachingPanel } from './api'
import type { TeachingOffering, TeachingPanelItem } from './contract'
import { GradingTray } from './GradingTray'
import { byWork, isLive, panelFigures } from './panel'
import { OfferingStatusBadge, useProblemText } from './parts'
import { CLASSROOM_ENROLLMENTS_ROUTE, TEACHING_ROUTES } from './routes'
import { SessionAgenda } from './SessionAgenda'

const NO_OFFERINGS: TeachingOffering[] = []
const NO_ITEMS: TeachingPanelItem[] = []

// «Mis ediciones», el panel docente: las cifras de lo asignado, lo que espera corrección, lo que viene en la agenda y una tarjeta
// por edición. todo sale de una sola lectura, el panel, que ya trae las ediciones. si falla, solo se pide la lista de ediciones: las
// cifras y las tarjetas siguen a la vista y la bandeja y la agenda dicen que no pudieron, sin datos a medias. solo si tampoco llega, la
// pantalla entera explica el problema
export function OfferingsPage() {
  const { t } = useTranslation('teaching')
  const panel = useTeachingPanel()
  const list = useOfferings({ enabled: panel.isError })
  const read = panel.isError ? undefined : panel.data
  const listed: TeachingOffering[] | undefined = read ?? list.data
  const offerings = useMemo(() => byWork(listed ?? NO_OFFERINGS), [listed])
  const items = useMemo(() => byWork(read ?? NO_ITEMS), [read])
  const reload = () => {
    void panel.refetch()
    if (panel.isError) void list.refetch()
  }
  useRefetchOnRevisit(reload)
  const retryPanel = () => void panel.refetch()
  const { title, description, technical } = useProblemText(list.error, 'offerings')
  const now = Date.now()
  // cuántas sesiones vienen, solo de las ediciones vivas y con el panel leído: de las demás no se da cifra
  const upcoming = new Map(items.filter(isLive).map((item) => [item.code, upcomingSessions(item.upcomingSessions, now).length] as const))
  const figures = panelFigures(offerings)
  const hasOfferings = offerings.length > 0
  // la zona de todas las ediciones, si es una sola: se dice una vez, en «Tus ediciones», y no en cada tarjeta
  const zones = new Set(offerings.map((offering) => offering.timeZone))
  const zone = zones.size === 1 ? [...zones][0] : undefined
  return (
    <>
      <ScreenHeader title={t('offerings.title')} subtitle={t('offerings.subtitle')} width="wide">
        {hasOfferings ? <Figures figures={figures} /> : null}
      </ScreenHeader>
      <ScreenBody width="wide">
        {panel.isError && list.isError ? (
          <ProblemState title={title} description={description} technical={technical}>
            <Button variant="secondary" className="min-h-11" onClick={reload}>
              {t('problem.retry')}
            </Button>
          </ProblemState>
        ) : !listed ? (
          <PanelSkeleton />
        ) : !hasOfferings ? (
          <NoOfferings />
        ) : (
          // el orden del documento es el del móvil (bandeja, agenda, ediciones); desde lg, la agenda pasa al riel
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-10">
            <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
              {/* sin nada por corregir o sin ediciones vivas, el bloque no tendría nada que leer: no hay de qué avisar */}
              <GradingTray items={items} loading={panel.isPending} error={panel.isError && figures.pending > 0 ? panel.error : null} onRetry={retryPanel} />
            </div>
            <aside aria-label={t('panel.rail')} className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border lg:pl-8">
              <SessionAgenda items={items} loading={panel.isPending} failed={panel.isError && offerings.some(isLive)} onRetry={retryPanel} />
            </aside>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <Section title={t('panel.offerings')} description={zone ? <ZoneNote zone={zone} /> : undefined}>
                <ul className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  {offerings.map((offering) => (
                    <li key={offering.code} className="min-w-0">
                      <OfferingCard offering={offering} upcoming={upcoming.get(offering.code)} showZone={zone === undefined} />
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

function Figures({ figures }: { figures: ReturnType<typeof panelFigures> }) {
  const { t, i18n } = useTranslation('teaching')
  const format = (value: number) => formatNumber(value, i18n.language)
  return (
    <StatList className="pb-5">
      <Stat label={t('panel.figures.offerings')} value={format(figures.offerings)} />
      {/* una cifra neutra: lo que hay que hacer con ella está en la bandeja «Por corregir», justo debajo */}
      <Stat label={t('panel.figures.pending')} value={format(figures.pending)} />
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
    <EmptyState title={t('offerings.empty')} icon={GraduationCap}>
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
// sin agenda (terminada) o sin el panel leído no se da cifra de sus sesiones: el acceso se queda en «Sesiones»
function ZoneNote({ zone }: { zone: string }) {
  const { t, i18n } = useTranslation('teaching')
  return <>{t('offering.timeZone', { zone: timeZoneLabel(zone, i18n.language) })}</>
}

function OfferingCard({ offering, upcoming, showZone }: { offering: TeachingOffering; upcoming?: number; showZone: boolean }) {
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
          {showZone ? <span>{t('offering.timeZone', { zone: timeZoneLabel(offering.timeZone, locale) })}</span> : null}
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
