import { useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { canImport } from './permissions'
import { STUDIO_ROUTES } from './routes'

// el camino a la importación desde «Mis versiones», solo para quien puede importar (cortesía: decide el servidor)
export function ImportLink() {
  const { t } = useTranslation('studio')
  const { permissions } = useAuth()
  const links = useWasichaiLinks()
  if (!canImport(permissions)) return null
  return (
    <Button asChild variant="secondary" className="min-h-11">
      <Link to={links.to(STUDIO_ROUTES.import)}>{t('import.link')}</Link>
    </Button>
  )
}
