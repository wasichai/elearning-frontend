import { ApiError, useWasichaiLinks } from '@wasichai/core'
import { Button, ConfirmDialog } from '@wasichai/ui'
import type { UseMutationResult } from '@tanstack/react-query'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { ReturnFocus } from '../../shared/ReturnFocus'
import { useFreshVersion, useNewVersion } from './api'
import { hasLessons, type StudioVersion, type StudioVersionDetail } from './contract'
import { useActionError } from './parts'
import { STUDIO_ROUTES } from './routes'

type Variant = 'primary' | 'secondary'
type Submit = UseMutationResult<StudioVersion, unknown, void>

// lo que le falta a un borrador sin lecciones para poder enviarse: su primera unidad o, si ya las tiene, la primera lección de la primera
export function useFirstContentStep(version: StudioVersionDetail): { label: string; to: string; reason: string } {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const [first] = [...version.units].sort((a, b) => a.order - b.order)
  if (!first) return { label: t('syllabus.addFirstUnit'), to: links.to(STUDIO_ROUTES.newUnit, { id: version.id }), reason: t('version.blockedNoUnits') }
  return {
    label: t('syllabus.addFirstLesson'),
    to: links.to(STUDIO_ROUTES.newLesson, { id: version.id, unitId: first.id }),
    reason: t('version.blockedNoLessons')
  }
}

interface SubmitVersionButtonProps {
  version: StudioVersion
  // la mutación es de quien la pinta: el aviso de «enviada» sigue a la vista cuando este botón ya no está
  submit: Submit
  variant: Variant
  ariaLabel?: string
  // si el botón se ofrece. el diálogo abierto sigue aunque deje de ofrecerse: es donde se explica por qué no se envió
  offered?: boolean
  // adónde va el foco cuando el botón deja de estar y nada lo tenía
  focusHome?: RefObject<HTMLElement | null>
}

// enviar deja la versión sin editar hasta que el revisor decida: se confirma (RNF-UX-08)
export function SubmitVersionButton({ version, submit, variant, ariaLabel, offered = true, focusHome }: SubmitVersionButtonProps) {
  const { t } = useTranslation('studio')
  const [asking, setAsking] = useState(false)
  const shown = offered || asking
  const wasShown = useRef(shown)
  useEffect(() => {
    if (wasShown.current && !shown) {
      // tras retirar el diálogo: mientras está, su trampa de foco lo traería de vuelta
      setTimeout(() => {
        if (document.activeElement === document.body || document.activeElement === null) focusHome?.current?.focus({ preventScroll: true })
      })
    }
    wasShown.current = shown
  }, [shown, focusHome])
  return (
    <>
      {offered ? (
        <Button variant={variant} className={WRAP} aria-label={ariaLabel} disabled={submit.isPending} onClick={() => setAsking(true)}>
          {submit.isPending ? t('version.submitting') : t('version.submit')}
        </Button>
      ) : null}
      {asking ? (
        <ReturnFocus>
          <SubmitDialog version={version} submit={submit} onClose={() => setAsking(false)} />
        </ReturnFocus>
      ) : null}
    </>
  )
}

// el servidor decide, pero hoy acepta una versión sin lecciones y la lista no sabe cuántas tiene: nada se envía sin haberla leído justo
// antes. esa misma lectura explica un 409, que significa tanto «sin lecciones» como «ya no es un borrador»: ni su código ni su detail
// los distinguen. useSubmitVersion relee antes de dar el error, así que al llegar este la lectura ya es la de después del rechazo
function SubmitDialog({ version, submit, onClose }: { version: StudioVersion; submit: Submit; onClose: () => void }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const describe = useActionError()
  const read = useFreshVersion(version.id)
  const close = () => {
    submit.reset()
    onClose()
  }
  const goTo = (to: string) => {
    close()
    void navigate(to)
  }
  const conflict = submit.error instanceof ApiError && submit.error.status === 409
  const refused = submit.error && !conflict ? describe(submit.error) : null
  const number = { number: version.number }

  const ask = { title: t('version.submitTitle'), confirmLabel: t('version.submitConfirm') }
  const data = read.isError ? undefined : read.data
  if (!submit.isPending && !read.isFetching && data?.status === 'BORRADOR' && !hasLessons(data))
    return <NoLessons detail={data} error={conflict ? t('version.rejectedNoLessons', number) : refused} onClose={close} goTo={goTo} />

  let view: { title: string; confirmLabel: string; description: string; busy?: boolean; error?: string | null; onConfirm?: () => void }
  if (submit.isPending) view = { ...ask, description: t('version.submitDescription', number), busy: true }
  else if (read.isFetching) view = { ...ask, description: t('version.checking'), busy: true }
  else if (!data)
    view = {
      title: ask.title,
      confirmLabel: t('problem.retry'),
      description: t(submit.error ? 'version.recheck' : 'version.checkFailed'),
      error: conflict ? t('version.rejectedUnknown') : refused,
      onConfirm: () => {
        submit.reset()
        void read.refetch()
      }
    }
  else if (data.status !== 'BORRADOR')
    view = {
      title: t('version.notDraftTitle'),
      confirmLabel: t('version.open'),
      description: t('version.notDraftDescription', { status: t(`status.${data.status}`) }),
      error: conflict ? t('version.rejectedState') : refused,
      onConfirm: () => goTo(links.to(STUDIO_ROUTES.version, { id: version.id }))
    }
  else
    view = {
      ...ask,
      description: t('version.submitDescription', number),
      error: conflict ? t('version.rejectedState') : refused,
      onConfirm: () => submit.mutate(undefined, { onSuccess: onClose })
    }
  return (
    <ConfirmDialog
      variant="primary"
      title={view.title}
      description={<span role="status">{view.description}</span>}
      confirmLabel={view.confirmLabel}
      cancelLabel={t('version.cancel')}
      busy={view.busy}
      error={view.error}
      onCancel={close}
      onConfirm={view.onConfirm ?? close}
    />
  )
}

function NoLessons({ detail, error, onClose, goTo }: { detail: StudioVersionDetail; error: string | null; onClose: () => void; goTo: (to: string) => void }) {
  const { t } = useTranslation('studio')
  const step = useFirstContentStep(detail)
  return (
    <ConfirmDialog
      variant="primary"
      title={t('version.blockedTitle')}
      description={<span role="status">{step.reason}</span>}
      confirmLabel={step.label}
      cancelLabel={t('version.cancel')}
      error={error}
      onCancel={onClose}
      onConfirm={() => goTo(step.to)}
    />
  )
}

// copia la versión dada a un borrador nuevo y lo abre. se confirma; un fallo se explica en el diálogo
export function NewVersionButton({ source, label, ariaLabel, variant }: { source: StudioVersion; label: string; ariaLabel?: string; variant: Variant }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const describe = useActionError()
  const copy = useNewVersion(source.course.id)
  const [asking, setAsking] = useState(false)
  return (
    <>
      <Button variant={variant} className={WRAP} aria-label={ariaLabel} disabled={copy.isPending} onClick={() => setAsking(true)}>
        {copy.isPending ? t('version.copying') : label}
      </Button>
      {asking ? (
        <ReturnFocus>
          <ConfirmDialog
            variant="primary"
            title={t('version.copyTitle')}
            description={t('version.copyDescription', { number: source.number })}
            confirmLabel={t('version.copyConfirm')}
            cancelLabel={t('version.cancel')}
            busy={copy.isPending}
            error={copy.error ? describe(copy.error) : null}
            onCancel={() => {
              copy.reset()
              setAsking(false)
            }}
            onConfirm={() =>
              copy.mutate(source.id, {
                onSuccess: (created) => {
                  setAsking(false)
                  void navigate(links.to(STUDIO_ROUTES.version, { id: created.id }))
                }
              })
            }
          />
        </ReturnFocus>
      ) : null}
    </>
  )
}
