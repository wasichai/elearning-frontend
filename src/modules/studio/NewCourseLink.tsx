import { useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { canCreateCourse } from './permissions'
import { STUDIO_ROUTES } from './routes'

// el camino a crear un curso y su primer borrador, solo para quien puede crearlo (cortesía: decide el servidor)
export function NewCourseLink({ variant = 'secondary' }: { variant?: 'primary' | 'secondary' }) {
  const { t } = useTranslation('studio')
  const { permissions } = useAuth()
  const links = useWasichaiLinks()
  if (!canCreateCourse(permissions)) return null
  return (
    <Button asChild variant={variant} className="min-h-11">
      <Link to={links.to(STUDIO_ROUTES.newCourse)}>{t('versions.newCourse')}</Link>
    </Button>
  )
}
