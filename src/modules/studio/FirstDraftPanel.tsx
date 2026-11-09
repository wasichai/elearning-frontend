import { ApiError, useAuth, useWasichaiLinks, type RecordPanelProps } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { TEXT_LINK, WRAP } from '../../shared/buttons'
import { Notice } from '../../shared/Notice'
import { Section } from '../../shared/Screen'
import { useCourseHasVersions, useFirstDraft } from './api'
import { useFirstDraftError } from './parts'
import { canAuthor } from './permissions'
import { STUDIO_ROUTES } from './routes'

// la vuelta a un curso sin versiones, al final de su ficha en core: quien salió de «Nuevo curso» sin borrador, o un curso creado desde
// otro sitio. sale en cualquier curso sin versiones, sea de quien sea: un curso no tiene dueño en el contrato y decide el servidor
export function FirstDraftPanel({ objectName, record }: RecordPanelProps) {
  const { permissions } = useAuth()
  if (objectName !== 'curso' || !canAuthor(permissions)) return null
  return <CourseFirstDraft courseId={record.id} />
}

function CourseFirstDraft({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const query = useCourseHasVersions(courseId)
  const draft = useFirstDraft()
  const describe = useFirstDraftError()
  const failure = draft.error ? describe(draft.error) : null
  // tras un 409 ya tiene versión: se mantiene el motivo, o el panel desaparecería sin explicar nada
  if (query.isPending || (query.data && !failure)) return null
  // sin READ sobre las versiones no hay nada que ofrecer; el resto se puede reintentar
  if (query.isError && query.error instanceof ApiError && query.error.status === 403) return null
  return (
    <div className="mx-8 mb-8">
      <Section title={t('firstDraft.title')}>
        {query.isError ? (
          <div className="flex flex-col items-start gap-3">
            <Notice tone="danger">{t('firstDraft.checkFailed')}</Notice>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t('problem.retry')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            {failure ? <Notice tone="danger">{failure.message}</Notice> : <p className="max-w-prose text-secondary text-ink-muted">{t('firstDraft.hint')}</p>}
            {!failure || failure.retry ? (
              <Button
                variant="primary"
                className={WRAP}
                disabled={draft.isPending}
                onClick={() => draft.mutate(courseId, { onSuccess: (created) => void navigate(links.to(STUDIO_ROUTES.version, { id: created.id })) })}
              >
                {draft.isPending ? t('firstDraft.creating') : t('firstDraft.create')}
              </Button>
            ) : (
              <Link to={links.to(STUDIO_ROUTES.versions)} className={TEXT_LINK}>
                {t('firstDraft.toVersions')}
              </Link>
            )}
          </div>
        )}
      </Section>
    </div>
  )
}
