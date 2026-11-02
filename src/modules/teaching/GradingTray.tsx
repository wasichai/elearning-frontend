import type { UseQueryResult } from '@tanstack/react-query'
import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { formatDateTime, formatNumber } from '../../shared/format'
import { Section, Skeleton } from '../../shared/Screen'
import type { PendingAttempt, TeachingOffering } from './contract'
import { groupsByOldest, MAX_PANEL_OFFERINGS, MAX_TRAY_ROWS, oldestFirst, submittedAge } from './panel'
import { BlockProblem, useProblemText } from './parts'
import { TEACHING_ROUTES } from './routes'

interface TrayGroup {
  offering: TeachingOffering
  query: UseQueryResult<PendingAttempt[]>
  attempts: PendingAttempt[]
}

// la bandeja «Por corregir»: lo enviado que espera, lo más antiguo arriba, con el acceso directo a cada corrección. cada cola falla
// por su cuenta. la única primaria de la pantalla es la entrega que más espera: si no hay ninguna a la vista, no hay primaria
export function GradingTray({ offerings, queries, capped }: { offerings: TeachingOffering[]; queries: UseQueryResult<PendingAttempt[]>[]; capped: boolean }) {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  // la lista de ediciones puede ir por detrás de su cola: lo que ya no tiene entregas, ni falla ni carga, no se pinta
  const groups = groupsByOldest(
    offerings.map<TrayGroup>((offering, index) => ({ offering, query: queries[index]!, attempts: oldestFirst(queries[index]!.data ?? []) }))
  ).filter(({ query, attempts }) => attempts.length > 0 || query.isError || query.isPending)
  const only = groups.length === 1 ? groups[0]!.offering : undefined
  const first = groups[0]?.attempts[0]?.attemptId
  return (
    <Section
      title={t('panel.tray.title')}
      description={only?.course.title ?? (groups.length > 1 ? t('panel.tray.order') : undefined)}
      action={
        only ? (
          <Link to={links.to(TEACHING_ROUTES.queue, { code: only.code })} className={TEXT_LINK}>
            {t('panel.tray.queue')}
          </Link>
        ) : undefined
      }
    >
      {groups.length === 0 ? <p className="text-sm text-ink-muted">{t('panel.tray.none')}</p> : null}
      {only ? (
        <TrayBody group={groups[0]!} primary={first} />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.offering.code} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h3 className="min-w-0 text-sm font-semibold break-words text-ink">{group.offering.course.title}</h3>
                <Link to={links.to(TEACHING_ROUTES.queue, { code: group.offering.code })} className={TEXT_LINK}>
                  {t('panel.tray.queue')}
                </Link>
              </div>
              <TrayBody group={group} primary={first} />
            </div>
          ))}
        </div>
      )}
      {capped ? <p className="text-sm text-ink-muted">{t('panel.capped', { count: MAX_PANEL_OFFERINGS })}</p> : null}
    </Section>
  )
}

function TrayBody({ group: { offering, query, attempts }, primary }: { group: TrayGroup; primary?: string }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { title } = useProblemText(query.error, 'queue')
  const hidden = attempts.length - MAX_TRAY_ROWS
  return (
    <>
      {query.isError ? (
        <BlockProblem text={title} retryLabel={t('panel.tray.retry', { course: offering.course.title })} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isPending ? (
        <div role="status" className="flex flex-col gap-3 border-y border-border py-4">
          <span className="sr-only">{t('queue.loading')}</span>
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : null}
      {attempts.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {attempts.slice(0, MAX_TRAY_ROWS).map((attempt) => (
            <li key={attempt.attemptId} className="@container">
              <TrayRow code={offering.code} timeZone={offering.timeZone} attempt={attempt} primary={attempt.attemptId === primary} />
            </li>
          ))}
        </ul>
      ) : null}
      {hidden > 0 ? (
        <Link to={links.to(TEACHING_ROUTES.queue, { code: offering.code })} className={`${TEXT_LINK} self-start`}>
          {t('panel.tray.more', { count: hidden, value: formatNumber(hidden, i18n.language) })}
        </Link>
      ) : null}
    </>
  )
}

// a lo ancho de la bandeja, no de la ventana: con el menú y el riel, una pantalla de 1024 px deja una columna estrecha
function TrayRow({ code, timeZone, attempt, primary }: { code: string; timeZone: string; attempt: PendingAttempt; primary: boolean }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const locale = i18n.language
  const student = attempt.email ?? t('roster.noEmail')
  return (
    <div className="flex items-center gap-3 py-2.5 sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
          <span className="font-medium break-all text-ink">{student}</span>
          <span className="break-words text-ink">{attempt.lessonTitle}</span>
        </div>
        <time
          dateTime={attempt.submittedAt}
          title={formatDateTime(attempt.submittedAt, locale, timeZone)}
          className="text-sm text-ink-muted @xl:w-40 @xl:shrink-0"
        >
          {t('panel.tray.age', { age: submittedAge(attempt.submittedAt, Date.now(), locale) })}
        </time>
      </div>
      <Button asChild variant={primary ? 'primary' : 'secondary'} className={`${WRAP} min-h-11 min-w-24 shrink-0 px-4`}>
        <Link
          to={links.to(TEACHING_ROUTES.attempt, { code, attemptId: attempt.attemptId })}
          aria-label={t('queue.gradeLabel', { student, lesson: attempt.lessonTitle })}
        >
          {t('queue.grade')}
        </Link>
      </Button>
    </div>
  )
}
