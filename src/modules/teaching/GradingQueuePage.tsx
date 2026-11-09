import { EmptyState, useWasichaiLinks } from '@wasichai/core'
import { Button, Table, Td, Th } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { ClipboardCheck } from 'lucide-react'
import { WRAP } from '../../shared/buttons'
import { formatDateTime, formatNumber } from '../../shared/format'
import { useOfferings, useQueue } from './api'
import type { PendingAttempt } from './contract'
import { OfferingSection } from './OfferingSection'
import { oldestFirst, submittedAge } from './panel'
import { QueryProblem, Submitter, submitterOf } from './parts'
import { TEACHING_ROUTES } from './routes'
import { ListSkeleton } from '../../shared/ListSkeleton'

// la cola de corrección de una edición: lo enviado que espera al docente, lo más antiguo primero
export function GradingQueuePage() {
  const { t } = useTranslation('teaching')
  const { code = '' } = useParams()
  const query = useQueue(code)
  return (
    <OfferingSection code={code} section="queue" heading={t('queue.title')}>
      {query.isError ? (
        <QueryProblem error={query.error} resource="queue" onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <ListSkeleton label={t('queue.loading')} />
      ) : query.data.length === 0 ? (
        <EmptyState title={t('queue.empty')} icon={ClipboardCheck} />
      ) : (
        <Queue code={code} attempts={query.data} />
      )}
    </OfferingSection>
  )
}

// tabla o filas según el ancho que deja el menú, no el de la ventana. la única primaria es la de lo más antiguo, por donde se empieza
function Queue({ code, attempts }: { code: string; attempts: PendingAttempt[] }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const sorted = oldestFirst(attempts)
  return (
    <div className="@container">
      <div className="hidden overflow-x-auto @2xl:block">
        <Table aria-label={t('queue.title')}>
          <thead>
            <tr>
              <Th scope="col" className="pl-0">
                {t('queue.student')}
              </Th>
              <Th scope="col">{t('queue.lesson')}</Th>
              <Th scope="col">{t('queue.pendingQuestions')}</Th>
              <Th scope="col">{t('queue.submittedAt')}</Th>
              <Th scope="col">{t('queue.action')}</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((attempt, index) => (
              <tr key={attempt.attemptId}>
                <Th scope="row" className="bg-transparent pl-0 font-normal text-ink">
                  <Submitter attempt={attempt} />
                </Th>
                <Td>{attempt.lessonTitle}</Td>
                <Td className="tabular-nums">{formatNumber(attempt.pendingQuestions, locale)}</Td>
                <Td>
                  <Sent code={code} attempt={attempt} />
                </Td>
                <Td>
                  <GradeLink code={code} attempt={attempt} primary={index === 0} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <ul aria-label={t('queue.title')} className="flex flex-col divide-y divide-border border-y border-border @2xl:hidden">
        {sorted.map((attempt, index) => (
          <li key={attempt.attemptId} className="flex items-center gap-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-secondary">
              <span className="font-medium text-ink">
                <Submitter attempt={attempt} />
              </span>
              <span className="break-words text-ink">{attempt.lessonTitle}</span>
              <span className="text-ink-muted">
                {t('queue.pendingCount', { count: attempt.pendingQuestions, value: formatNumber(attempt.pendingQuestions, locale) })}
              </span>
              <Sent code={code} attempt={attempt} />
            </div>
            <GradeLink code={code} attempt={attempt} primary={index === 0} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sent({ code, attempt }: { code: string; attempt: PendingAttempt }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const zone = useOfferings().data?.find((candidate) => candidate.code === code)?.timeZone
  return (
    <span className="flex flex-col text-secondary">
      <span className="text-ink">{t('panel.tray.age', { age: submittedAge(attempt.submittedAt, Date.now(), locale) })}</span>
      <time dateTime={attempt.submittedAt} className="text-secondary text-ink-muted">
        {formatDateTime(attempt.submittedAt, locale, zone ?? 'UTC')}
      </time>
    </span>
  )
}

function GradeLink({ code, attempt, primary }: { code: string; attempt: PendingAttempt; primary: boolean }) {
  const { t } = useTranslation('teaching')
  const links = useWasichaiLinks()
  return (
    <Button className={`${WRAP} shrink-0`} asChild variant={primary ? 'primary' : 'secondary'} size="sm">
      <Link
        to={links.to(TEACHING_ROUTES.attempt, { code, attemptId: attempt.attemptId })}
        aria-label={t('queue.gradeLabel', { student: submitterOf(attempt) ?? t('roster.noEmail'), lesson: attempt.lessonTitle })}
      >
        {t('queue.grade')}
      </Link>
    </Button>
  )
}
