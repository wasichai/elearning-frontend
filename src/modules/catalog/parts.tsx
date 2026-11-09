import { FlaskConical, type LucideIcon } from 'lucide-react'
import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatusState } from '../../shared/StatusBadge'
import type { CoursePage, CourseSummary, NextOffering } from './contract'

// piezas que comparten la lista y la ficha

// el curso es de demostración: se dice con una marca discreta, no con una insignia de color que compita con el estado de la inscripción
export function IllustrativeMark() {
  const { t } = useTranslation('catalog')
  return (
    <span className="text-secondary inline-flex items-center gap-1 text-ink-muted">
      <FlaskConical aria-hidden="true" className="size-3.5 shrink-0" />
      {t('course.illustrative')}
    </span>
  )
}

// el aviso de «ilustrativo» se dice una vez en el encabezado si lo son todos; si no, cada fila ilustrativa lleva el suyo
export const allIllustrative = (page: CoursePage | undefined) => !!page && page.content.length > 0 && page.content.every((course) => course.illustrative)

// un dato con icono, dentro de un <dl>: el nombre lo lee el lector de pantalla, la vista se queda con el icono y el valor
export function IconFact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
      <dt className="sr-only">{label}</dt>
      <dd className="text-ink tabular-nums">{children}</dd>
    </div>
  )
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

export interface CollectionGroup {
  category: CourseSummary['category']
  courses: CourseSummary[]
}

// las filas consecutivas que comparten colección, en el orden en que llegan. sin encabezados (grouped = false), todas en un grupo sin colección.
// una colección que reaparece después de otra abre un grupo nuevo: no se reordena nada, para no contradecir la paginación ni el orden del servidor
export function groupByCollection(courses: CourseSummary[], grouped: boolean): CollectionGroup[] {
  if (!grouped) return [{ category: null, courses }]
  const groups: CollectionGroup[] = []
  for (const course of courses) {
    const last = groups.at(-1)
    if (last && (last.category?.slug ?? null) === (course.category?.slug ?? null)) last.courses.push(course)
    else groups.push({ category: course.category, courses: [course] })
  }
  return groups
}
