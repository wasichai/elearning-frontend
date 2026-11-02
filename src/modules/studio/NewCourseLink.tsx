import { useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { canCreateCourse } from './permissions'

const COURSE_OBJECT = 'curso'

// crear un curso es el formulario de registros de Wasichai (core), que comprueba de nuevo la política del objeto y al guardar
// abre el registro creado: aquí no se reimplementa. solo para quien puede crearlo (cortesía: decide el servidor)
export function NewCourseLink() {
  const { t } = useTranslation('studio')
  const { permissions } = useAuth()
  const links = useWasichaiLinks()
  if (!canCreateCourse(permissions)) return null
  return (
    <Button asChild variant="secondary" className="min-h-11">
      <Link to={links.newRecord(COURSE_OBJECT)}>{t('versions.newCourse')}</Link>
    </Button>
  )
}
