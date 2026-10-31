import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { problemKind } from '../../shared/ProblemState'
import { STUDIO_ROUTES } from './routes'

// piezas que comparten las páginas del estudio

export type StudioResource = 'versions' | 'version'

// el texto de un error al leer, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: StudioResource) {
  const { t } = useTranslation('studio')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  }
}

// el texto de un fallo al guardar (RNF-UX-08): el servidor manda y su ProblemDetail dice qué regla no se cumple
export function useActionError() {
  const { t } = useTranslation('studio')
  return (error: unknown): string => {
    if (error instanceof TypeError) return t('action.network')
    if (!(error instanceof ApiError)) return t('action.failed')
    if (error.status === 409) return t('action.conflict', { detail: error.message })
    if (error.status === 400 || error.status === 422)
      return t('action.invalid', { detail: [error.message, ...error.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ') })
    if (error.status === 403) return t('action.refused')
    if (error.status === 404) return t('action.notFound')
    return t('action.failedStatus', { status: error.status })
  }
}

export const LINK = 'text-sm text-link underline-offset-4 hover:underline'

export function BackToVersions() {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  return (
    <Link to={links.to(STUDIO_ROUTES.versions)} className={`self-start ${LINK}`}>
      {t('versions.back')}
    </Link>
  )
}
