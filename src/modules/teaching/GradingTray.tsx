import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { formatDateTime, formatNumber } from '../../shared/format'
import { Initials } from '../../shared/Initials'
import { Section, Skeleton } from '../../shared/Screen'
import type { PendingAttempt, TeachingPanelItem } from './contract'
import { groupsByOldest, hiddenAttempts, MAX_TRAY_ROWS, oldestFirst, submittedAge } from './panel'
import { BlockProblem, Submitter, submitterOf, useProblemText } from './parts'
import { TEACHING_ROUTES } from './routes'

interface TrayGroup {
  offering: TeachingPanelItem
  attempts: PendingAttempt[]
}

// la bandeja «Por corregir»: lo enviado que espera, lo más antiguo arriba, con el acceso directo a cada corrección. sale del panel: si no
// se pudo leer, lo dice sin filas a medias. la única primaria de la pantalla es la entrega que más espera: si no hay ninguna a la vista,
// no hay primaria
export function GradingTray({ items, loading, error, onRetry }: { items: TeachingPanelItem[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const { title: problem } = useProblemText(error, 'queue')
  // el total puede contar entregas que su cola no enseña (los intentos propios): lo que no tiene filas no se pinta
  const groups = groupsByOldest(
    items.filter((item) => item.oldestPending.length > 0).map((offering): TrayGroup => ({ offering, attempts: oldestFirst(offering.oldestPending) }))
  )
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
      {error ? <BlockProblem text={problem} retryLabel={t('panel.tray.retry')} onRetry={onRetry} /> : null}
      {loading ? (
        <div role="status" className="flex flex-col gap-3 border-y border-border py-4">
          <span className="sr-only">{t('queue.loading')}</span>
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : null}
      {!loading && !error && groups.length === 0 ? <p className="text-sm text-ink-muted">{t('panel.tray.none')}</p> : null}
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
    </Section>
  )
}

function TrayBody({ group: { offering, attempts }, primary }: { group: TrayGroup; primary?: string }) {
  const { t, i18n } = useTranslation('teaching')
  const links = useWasichaiLinks()
  const hidden = hiddenAttempts(offering)
  return (
    <>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {attempts.slice(0, MAX_TRAY_ROWS).map((attempt) => (
          <li key={attempt.attemptId} className="@container">
            <TrayRow code={offering.code} timeZone={offering.timeZone} attempt={attempt} primary={attempt.attemptId === primary} />
          </li>
        ))}
      </ul>
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
  const who = submitterOf(attempt)
  const student = who ?? t('roster.noEmail')
  return (
    <div className="flex items-center gap-3 py-2.5 sm:gap-6">
      {who ? <Initials of={who} className="hidden size-8 text-xs @md:flex" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
          <span className="font-medium text-ink">
            <Submitter attempt={attempt} />
          </span>
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
