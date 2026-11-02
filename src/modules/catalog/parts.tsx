import { Badge } from '@wasichai/ui'
import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatusState } from '../../shared/StatusBadge'
import type { NextOffering } from './contract'

// piezas que comparten la lista y la ficha

export function IllustrativeMark() {
  const { t } = useTranslation('catalog')
  return <Badge className="bg-notice-soft text-notice">{t('course.illustrative')}</Badge>
}

// un dato con su etiqueta, dentro de un <dl>
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  )
}

export type OfferingState = 'open' | 'closed' | 'full' | 'running' | 'scheduled'

// lo que la persona necesita saber de la edición: si puede inscribirse ya y, si no, por qué. enrollmentOpen es
// enrollmentStatus OPEN; FULL (RF-CAT-09) dice que el motivo es el cupo, y un backend anterior no lo manda
export function offeringState(offering: Pick<NextOffering, 'status' | 'enrollmentOpen' | 'enrollmentStatus'>): OfferingState {
  if (offering.enrollmentOpen) return 'open'
  if (offering.enrollmentStatus === 'FULL') return 'full'
  if (offering.status === 'INSCRIPCION_ABIERTA') return 'closed'
  return offering.status === 'EN_CURSO' ? 'running' : 'scheduled'
}

// abierta invita a avanzar; completa pide atención; en curso tiene su forma de siempre; el resto es información
export const AVAILABILITY: Record<OfferingState, StatusState> = {
  open: 'active',
  full: 'warning',
  running: 'active',
  scheduled: 'todo',
  closed: 'neutral'
}

// si la ventana cumple la consulta: para montar un control en un sitio u otro, sin duplicarlo en el DOM. sin matchMedia (jsdom) cuenta como ancha
export function useMatchesWidth(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia?.(query)
      media?.addEventListener('change', onChange)
      return () => media?.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(query).matches ?? true)
}

// un vocabulario abierto del modelo (tipo de lección, rol docente): la traducción si existe; si no, el valor legible
export function useOpenLabel(group: string) {
  const { t } = useTranslation('catalog')
  return (value: string) => t(`${group}.${value}`, { defaultValue: value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ') })
}
