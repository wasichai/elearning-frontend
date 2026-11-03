import { LoadingState, useWasichaiLinks, type Form, type RecordItem } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenBody, ScreenHeader } from '../../shared/Screen'
import { studioKeys, useVersion } from './api'
import { useProblemText } from './parts'
import { STUDIO_ROUTES } from './routes'
import { StudioRecordForm } from './StudioRecordForm'

const UNIT_OBJECT = 'unidad'

// el formulario de core pregunta la versión con un selector que nombra cada una por su estado («BORRADOR», «BORRADOR»…) y solo trae
// cien: aquí la versión es esta y no se pregunta, ni la fuente, que la pone la importación. la guarda editorial del servidor decide
const UNIT_FORM: Form = {
  id: 'studio-new-unit',
  name: 'studio-new-unit',
  label: 'studio-new-unit',
  objectName: UNIT_OBJECT,
  generated: true,
  definition: { sections: [{ title: null, fields: ['orden', 'titulo', 'descripcion', 'objetivos', 'horas_estimadas'] }] }
}

// una unidad nueva de un borrador propio, con el orden siguiente propuesto
export function NewUnitPage() {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id = '' } = useParams()
  const query = useVersion(id)
  const version = query.data
  const problem = useProblemText(query.error, 'version')
  const toVersion = links.to(STUDIO_ROUTES.version, { id })
  const nextOrder = version ? Math.max(0, ...version.units.map((unit) => unit.order)) + 1 : 1
  const initial: RecordItem = { id: '', createdAt: null, updatedAt: null, attributes: { orden: nextOrder } }
  return (
    <>
      <ScreenHeader
        width="reading"
        title={t('newUnit.title')}
        subtitle={version ? t('newUnit.subtitle', { number: version.number, course: version.course.title }) : undefined}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[
              { label: t('versions.title'), to: links.to(STUDIO_ROUTES.versions) },
              { label: version ? t('versions.number', { number: version.number }) : t('version.title'), to: toVersion },
              { label: t('newUnit.title') }
            ]}
          />
        }
      />
      <ScreenBody width="reading">
        {query.isError ? (
          <ProblemState title={problem.title} description={problem.kind === 'notFound' ? t('problem.notFoundHint') : problem.description} />
        ) : !version ? (
          <LoadingState label={t('version.loading')} />
        ) : version.status !== 'BORRADOR' ? (
          <div className="flex flex-col items-start gap-4">
            <Notice tone="notice" title={t('version.readOnly')}>
              {t(`statusHint.${version.status}`)}
            </Notice>
            <Button asChild variant="secondary" className="min-h-11">
              <Link to={toVersion}>{t('newUnit.backToVersion')}</Link>
            </Button>
          </div>
        ) : (
          <StudioRecordForm
            objectName={UNIT_OBJECT}
            form={UNIT_FORM}
            initial={initial}
            fixed={{ version_curso: id }}
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
