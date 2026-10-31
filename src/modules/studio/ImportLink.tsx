import { useAuth, useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LINK } from './parts'
import { canImport } from './permissions'
import { STUDIO_ROUTES } from './routes'

// el camino a la importación desde «Mis versiones», solo para quien puede importar (cortesía: decide el servidor)
export function ImportLink() {
  const { t } = useTranslation('studio')
  const { permissions } = useAuth()
  const links = useWasichaiLinks()
  if (!canImport(permissions)) return null
  return (
    <Link to={links.to(STUDIO_ROUTES.import)} className={`self-start ${LINK}`}>
      {t('import.link')}
    </Link>
  )
}
