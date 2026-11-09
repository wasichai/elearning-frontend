import { Circle, CircleCheck, CircleDot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Section } from './Screen'
import type { StatusState } from './StatusBadge'

// lo que el estudio y la bandeja del revisor dicen del estado de una versión. la palabra la pone status.* del módulo que la pinta

export type VersionStatus = 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'PUBLICADA' | 'RETIRADA'

// con la forma común: aún en manos de quien la escribe, esperando al revisor, aprobada a falta de publicar, publicada y retirada
export const VERSION_BADGE: Record<VersionStatus, StatusState> = {
  BORRADOR: 'todo',
  EN_REVISION: 'review',
  APROBADA: 'active',
  PUBLICADA: 'done',
  RETIRADA: 'neutral'
}

// de lo que falta a lo hecho, con lo último arriba
const PATH: VersionStatus[] = ['PUBLICADA', 'APROBADA', 'EN_REVISION', 'BORRADOR']

// la línea de estados: dónde está la versión y qué le falta. lo pasado y lo pendiente se derivan de su estado; quién y cuándo, solo donde
// el contrato lo da (su última actualización, que llega ya escrita, y las decisiones). namespace: el espacio i18n del módulo que la pinta
export function VersionStatusLine({ namespace, status, updated }: { namespace: string; status: VersionStatus; updated: string | null }) {
  const { t } = useTranslation(namespace)
  const current = PATH.indexOf(status)
  return (
    <Section title={t('version.state', { status: t(`status.${status}`) })}>
      {current === -1 ? (
        updated ? (
          <p className="text-secondary text-ink-muted">{updated}</p>
        ) : null
      ) : (
        <ol aria-label={t('version.path')} className="flex flex-col">
          {PATH.map((step, index) => {
            const isCurrent = index === current
            const done = index > current
            const Icon = isCurrent ? CircleDot : done ? CircleCheck : Circle
            return (
              <li key={step} aria-current={isCurrent ? 'step' : undefined} className="flex gap-2.5">
                <span className="flex flex-col items-center">
                  <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${isCurrent ? 'text-brand-strong' : done ? 'text-success' : 'text-ink-muted'}`} />
                  {index < PATH.length - 1 ? (
                    <span aria-hidden="true" className={`w-px grow ${done || isCurrent ? 'bg-border-control' : 'bg-border'}`} />
                  ) : null}
                </span>
                <span className={`flex min-w-0 flex-col pb-3 text-secondary ${isCurrent ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                  <span>{t(`status.${step}`)}</span>
                  {isCurrent ? (
                    updated ? (
                      <span className="font-normal text-ink-muted">{updated}</span>
                    ) : null
                  ) : (
                    <span className="sr-only">{t(done ? 'version.stepDone' : 'version.stepPending')}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}
