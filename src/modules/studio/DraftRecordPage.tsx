import { useWasichaiLinks, type Form, type RecordItem } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenBody, ScreenHeader } from '../../shared/Screen'
import { studioKeys, useVersion } from './api'
import type { StudioVersionDetail } from './contract'
import { useProblemText } from './parts'
import { STUDIO_ROUTES } from './routes'
import { StudioRecordForm } from './StudioRecordForm'
import { FormSkeleton } from '../../shared/PageSkeleton'

// lo que el formulario sabe de la versión: lo que propone, lo que no pregunta y qué dice de dónde cuelga
export interface DraftRecordPlan {
  subtitle: string
  attributes: Record<string, unknown>
  fixed: Record<string, unknown>
}

interface DraftRecordPageProps {
  title: string
  objectName: string
  form: Form
  // null si lo que cuelga de la versión ya no está en ella
  plan: (version: StudioVersionDetail) => DraftRecordPlan | null
  gone?: string
}

// crear algo dentro de un borrador propio, sin elegir en los selectores de core a qué pertenece (solo traen cien registros, de todos los
// cursos), y volver a la versión. la guarda editorial del servidor decide
export function DraftRecordPage({ title, objectName, form, plan, gone }: DraftRecordPageProps) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id = '' } = useParams()
  const query = useVersion(id)
  const version = query.data
  const problem = useProblemText(query.error, 'version')
  const toVersion = links.to(STUDIO_ROUTES.version, { id })
  const planned = version ? plan(version) : null
  const initial: RecordItem = { id: '', createdAt: null, updatedAt: null, attributes: planned?.attributes ?? {} }
  const back = (
    <Button asChild variant="secondary" className="min-h-11">
      <Link to={toVersion}>{t('newUnit.backToVersion')}</Link>
    </Button>
  )
  return (
    <>
      <ScreenHeader
        width="reading"
        title={title}
        subtitle={planned?.subtitle}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[
              { label: t('versions.title'), to: links.to(STUDIO_ROUTES.versions) },
              { label: version ? t('versions.number', { number: version.number }) : t('version.title'), to: toVersion },
              { label: title }
            ]}
          />
        }
      />
      <ScreenBody width="reading">
        {query.isError ? (
          <ProblemState
            title={problem.title}
            description={problem.kind === 'notFound' ? t('problem.notFoundHint') : problem.description}
            technical={problem.kind === 'notFound' ? undefined : problem.technical}
          />
        ) : !version ? (
          <FormSkeleton label={t('version.loading')} />
        ) : version.status !== 'BORRADOR' ? (
          <div className="flex flex-col items-start gap-4">
            <Notice tone="notice" title={t('version.readOnly')}>
              {t(`statusHint.${version.status}`)}
            </Notice>
            {back}
          </div>
        ) : !planned ? (
          <ProblemState title={gone ?? ''}>{back}</ProblemState>
        ) : (
          <StudioRecordForm
            objectName={objectName}
            form={form}
            initial={initial}
            fixed={planned.fixed}
            onCancel={() => void navigate(toVersion)}
            onSaved={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: studioKeys.version(id) }),
                queryClient.invalidateQueries({ queryKey: studioKeys.diff(id) })
              ]).then(() => navigate(toVersion))
            }}
          />
        )}
      </ScreenBody>
    </>
  )
}
