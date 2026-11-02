import { useWasichaiLinks } from '@wasichai/core'
import { Button, ConfirmDialog } from '@wasichai/ui'
import type { UseMutationResult } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { useNewVersion } from './api'
import type { StudioVersion } from './contract'
import { useActionError } from './parts'
import { STUDIO_ROUTES } from './routes'

type Variant = 'primary' | 'secondary'

interface SubmitVersionButtonProps {
  version: StudioVersion
  // la mutación es de quien la pinta: el aviso de «enviada» sigue a la vista cuando este botón ya no está
  submit: UseMutationResult<StudioVersion, unknown, void>
  variant: Variant
  ariaLabel?: string
}

// enviar deja la versión sin editar hasta que el revisor decida: se confirma (RNF-UX-08). un fallo se explica en el diálogo
export function SubmitVersionButton({ version, submit, variant, ariaLabel }: SubmitVersionButtonProps) {
  const { t } = useTranslation('studio')
  const describe = useActionError()
  const [asking, setAsking] = useState(false)
  return (
    <>
      <Button variant={variant} className={WRAP} aria-label={ariaLabel} disabled={submit.isPending} onClick={() => setAsking(true)}>
        {submit.isPending ? t('version.submitting') : t('version.submit')}
      </Button>
      {asking ? (
        <ConfirmDialog
          variant="primary"
          title={t('version.submitTitle')}
          description={t('version.submitDescription', { number: version.number })}
          confirmLabel={t('version.submitConfirm')}
          cancelLabel={t('version.cancel')}
          busy={submit.isPending}
          error={submit.error ? describe(submit.error) : null}
          onCancel={() => {
            submit.reset()
            setAsking(false)
          }}
          onConfirm={() => submit.mutate(undefined, { onSuccess: () => setAsking(false) })}
        />
      ) : null}
    </>
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
      ) : null}
    </>
  )
}
