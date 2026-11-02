import { ApiError } from '@wasichai/core'
import { Button, ConfirmDialog } from '@wasichai/ui'
import { CircleAlert } from 'lucide-react'
import { Fragment, useEffect, useState, type MouseEvent, type MouseEventHandler, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { problemKind, ProblemState } from '../../shared/ProblemState'
import { ScreenBody, ScreenHeader, type ScreenWidth } from '../../shared/Screen'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import { useOfferings } from './api'
import type { TeachingOffering } from './contract'

// piezas que comparten las páginas del espacio docente

export type TeachingResource = 'offerings' | 'roster' | 'queue' | 'attempt' | 'sessions' | 'attendance'

// el texto de un error, por tipo; el estado HTTP queda a la vista para quien tenga que reportarlo
export function useProblemText(error: unknown, resource: TeachingResource) {
  const { t } = useTranslation('teaching')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  return {
    kind,
    title: t(`problem.${resource}.${kind}`),
    description: t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  }
}

const OFFERING_STATE: Record<TeachingOffering['status'], StatusState> = {
  PROGRAMADA: 'todo',
  INSCRIPCION_ABIERTA: 'todo',
  EN_CURSO: 'active',
  FINALIZADA: 'done',
  CANCELADA: 'neutral'
}

export function OfferingStatusBadge({ status }: { status: TeachingOffering['status'] }) {
  const { t } = useTranslation('teaching')
  return <StatusBadge state={OFFERING_STATE[status]}>{t(`offering.status.${status}`)}</StatusBadge>
}

// un correo largo no se parte por cualquier letra: tras la arroba y antes de cada punto. <wbr> no cambia su texto, ni lo que se
// lee ni lo que se copia. overflow-wrap: anywhere, por si un trozo aún no cabe
export function EmailText({ email }: { email: string }) {
  const pieces = email.split(/(?<=@)|(?=\.)/)
  return (
    <span className="[overflow-wrap:anywhere]">
      {pieces.map((piece, index) => (
        <Fragment key={`${piece}-${index}`}>
          {index > 0 ? <wbr /> : null}
          {piece}
        </Fragment>
      ))}
    </span>
  )
}

// el marco de una página de trabajo dentro de una edición: el curso, qué página es y la vuelta a la página de la que cuelga. sin
// pestañas ni selector: de un trabajo a medias no se sale de un toque. onBack deja avisar antes de salir (useLeaveGuard)
export function OfferingFrame({
  code,
  subtitle,
  back,
  backLabel,
  onBack,
  width = 'content',
  children
}: {
  code: string
  subtitle: string
  back: string
  backLabel: string
  onBack?: MouseEventHandler
  width?: ScreenWidth
  children: ReactNode
}) {
  const { t } = useTranslation('teaching')
  const offering = useOfferings().data?.find((candidate) => candidate.code === code)
  return (
    <>
      <ScreenHeader
        width={width}
        title={offering?.course.title ?? t('roster.title')}
        subtitle={subtitle}
        breadcrumbs={
          <Link to={back} onClick={onBack} className={`${TEXT_LINK} self-start`}>
            {backLabel}
          </Link>
        }
      />
      <ScreenBody width={width} className="gap-5">
        {children}
      </ScreenBody>
    </>
  )
}

// avisar antes de salir de un trabajo sin guardar: guard(destino) para los enlaces de la pantalla, y al recargar o cerrar, el aviso del
// navegador. el menú del shell queda fuera: core usa BrowserRouter, sin useBlocker, y sus enlaces no se pueden interceptar desde aquí
export function useLeaveGuard(dirty: boolean) {
  const { t } = useTranslation('teaching')
  const navigate = useNavigate()
  const [target, setTarget] = useState<string>()
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return {
    guard: (to: string) => (event: MouseEvent) => {
      if (!dirty) return
      event.preventDefault()
      setTarget(to)
    },
    dialog: target ? (
      <ConfirmDialog
        title={t('leave.title')}
        description={t('leave.description')}
        confirmLabel={t('leave.confirm')}
        cancelLabel={t('leave.stay')}
        variant="danger"
        onCancel={() => setTarget(undefined)}
        onConfirm={() => {
          setTarget(undefined)
          void navigate(target)
        }}
      />
    ) : null
  }
}

// un fallo al leer: un 404 es una respuesta (lo ajeno y lo inexistente no se distinguen) y no se reintenta; lo demás, sí
export function QueryProblem({ error, resource, onRetry }: { error: unknown; resource: TeachingResource; onRetry: () => void }) {
  const { t } = useTranslation('teaching')
  const { kind, title, description } = useProblemText(error, resource)
  if (kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{t('problem.notFoundHint')}</p>
      </div>
    )
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

// un bloque de una pantalla que no se pudo leer: lo dice ahí mismo y deja reintentar, sin tirar el resto de la pantalla
export function BlockProblem({ text, retryLabel, onRetry }: { text: string; retryLabel: string; onRetry: () => void }) {
  const { t } = useTranslation('teaching')
  return (
    <div role="alert" className="flex gap-2 text-sm">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col items-start gap-2">
        <p className="text-ink">{text}</p>
        <Button variant="secondary" className="min-h-11" aria-label={retryLabel} onClick={onRetry}>
          {t('problem.retry')}
        </Button>
      </div>
    </div>
  )
}

// el texto de un fallo al guardar (RNF-UX-08): el servidor manda, y su ProblemDetail dice qué regla no se cumple o qué
// campos rechazó. un 403 no culpa a los datos; sin conexión se dice así; lo demás deja el estado para reportarlo
export function useActionError() {
  const { t } = useTranslation('teaching')
  return (error: unknown): string => {
    if (error instanceof TypeError) return t('action.network')
    if (!(error instanceof ApiError)) return t('action.failed')
    if (error.status === 409) return t('action.conflict', { detail: error.message })
    if (error.status === 400 || error.status === 422) return t('action.invalid', { detail: problemDetail(error) })
    if (error.status === 403) return t('action.refused')
    if (error.status === 404) return t('action.notFound')
    return t('action.failedStatus', { status: error.status })
  }
}

// el detalle y cada campo rechazado (errors del problem+json), en una línea
function problemDetail(error: ApiError): string {
  return [error.message, ...error.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ')
}
