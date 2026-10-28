import { ApiError } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { problemKind as sharedProblemKind, type ProblemKind as SharedProblemKind } from '../../shared/ProblemState'

export { ProblemState } from '../../shared/ProblemState'

// la API pública del catálogo no tiene reglas que den 409: para la página es una negativa más del servidor
export type ProblemKind = Exclude<SharedProblemKind, 'conflict'>

export function problemKind(error: unknown): ProblemKind {
  const kind = sharedProblemKind(error)
  return kind === 'conflict' ? 'refused' : kind
}

// el texto de un error, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: 'catalog' | 'course') {
  const { t } = useTranslation('catalog')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    // un fallo sin estado HTTP que no es de red ni de contrato: no hay número que citar
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  }
}
