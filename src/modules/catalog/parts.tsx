import { Badge } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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

// lo que la persona necesita saber de la edición: si puede inscribirse ya y, si no, por qué
export function offeringState(offering: Pick<NextOffering, 'status' | 'enrollmentOpen'>): 'open' | 'closed' | 'running' | 'scheduled' {
  if (offering.enrollmentOpen) return 'open'
  if (offering.status === 'INSCRIPCION_ABIERTA') return 'closed'
  return offering.status === 'EN_CURSO' ? 'running' : 'scheduled'
}

// un vocabulario abierto del modelo (tipo de lección, rol docente): la traducción si existe; si no, el valor legible
export function useOpenLabel(group: string) {
  const { t } = useTranslation('catalog')
  return (value: string) => t(`${group}.${value}`, { defaultValue: value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ') })
}
