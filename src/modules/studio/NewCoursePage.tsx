import { useAuth, useWasichaiLinks, type RecordItem } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { Notice } from '../../shared/Notice'
import { Breadcrumbs, ScreenBody, ScreenHeader } from '../../shared/Screen'
import { useFirstDraft } from './api'
import { useFirstDraftError } from './parts'
import { canAuthor } from './permissions'
import { STUDIO_ROUTES } from './routes'
import { StudioRecordForm } from './StudioRecordForm'

const COURSE_OBJECT = 'curso'

// de «Nuevo curso» al primer borrador: al guardar se conoce el curso, sin tener que buscarlo después. un curso sin versiones no sale en
// «Mis versiones» y el contrato no dice de quién es, así que esta pantalla es la que lo lleva de la mano hasta el borrador
export function NewCoursePage() {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const draft = useFirstDraft()
  // el curso guardado se conserva: si falla el borrador, reintentar no lo vuelve a crear
  const [course, setCourse] = useState<RecordItem | null>(null)
  const createDraft = (courseId: string) =>
    draft.mutate(courseId, { onSuccess: (created) => void navigate(links.to(STUDIO_ROUTES.version, { id: created.id })) })
  return (
    <>
      <ScreenHeader
        width="reading"
        title={t('newCourse.title')}
        subtitle={t('newCourse.subtitle')}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[{ label: t('versions.title'), to: links.to(STUDIO_ROUTES.versions) }, { label: t('newCourse.title') }]}
          />
        }
      />
      <ScreenBody width="reading">
        {course ? (
          <DraftStage course={course} error={draft.error} pending={!draft.isError} onRetry={() => createDraft(course.id)} />
        ) : (
          <StudioRecordForm
            objectName={COURSE_OBJECT}
            onCancel={() => void navigate(links.to(STUDIO_ROUTES.versions))}
            onSaved={(created) => {
              // sin permiso de crear versiones no hay borrador que pedir: su ficha, como en core
              if (!canAuthor(permissions)) {
                void navigate(links.record(COURSE_OBJECT, created.id))
                return
              }
              setCourse(created)
              createDraft(created.id)
            }}
          />
        )}
      </ScreenBody>
    </>
  )
}

function DraftStage({ course, error, pending, onRetry }: { course: RecordItem; error: unknown; pending: boolean; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const describe = useFirstDraftError()
  if (pending)
    return (
      <p role="status" className="text-base text-ink">
        {t('newCourse.creatingDraft')}
      </p>
    )
  const failure = describe(error)
  return (
    <div className="flex flex-col items-start gap-4">
      <Notice tone="danger" title={t('newCourse.savedTitle', { title: String(course.attributes.titulo ?? course.id) })}>
        {failure.message}
      </Notice>
      <div className="flex flex-wrap items-center gap-2">
        {failure.retry ? (
          <Button variant="primary" className={WRAP} onClick={onRetry}>
            {t('problem.retry')}
          </Button>
        ) : (
          <Button asChild variant="primary" className="min-h-11">
            <Link to={links.to(STUDIO_ROUTES.versions)}>{t('firstDraft.toVersions')}</Link>
          </Button>
        )}
        <Button asChild variant="secondary" className="min-h-11">
          <Link to={links.record(COURSE_OBJECT, course.id)}>{t('newCourse.openCourse')}</Link>
        </Button>
      </div>
    </div>
  )
}
