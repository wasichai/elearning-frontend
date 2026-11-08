import { Badge } from '@wasichai/ui'
import type { ReactNode } from 'react'

// la insignia de estado (docs/design-system/historico-quipu/components/StatusBadge): icono y palabra, nunca solo color. sobre el Badge de
// @wasichai/ui; sus colores son pares de tokens que colofon.test.ts comprueba en AA. la palabra la pone quien la usa, desde su i18n.
// un estado tiene una sola forma en todo el producto: la usan el aula, el catálogo, docencia, el estudio y la revisión
export const STATUS_STATES = ['todo', 'active', 'done', 'review', 'overdue', 'warning', 'achievement', 'neutral'] as const
export type StatusState = (typeof STATUS_STATES)[number]

const TONE: Record<StatusState, string> = {
  todo: 'bg-surface-muted text-ink-muted',
  active: 'bg-brand-soft text-brand-strong',
  done: 'bg-success-soft text-success',
  review: 'bg-notice-soft text-notice',
  overdue: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  // el logro (finalización y certificado) va en tinta con filete, sin color propio: se distingue por su sello y su palabra
  achievement: 'border border-ink bg-surface text-ink',
  neutral: 'border border-border bg-surface text-ink-muted'
}

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// círculo vacío, medio círculo, check en círculo, reloj de arena, reloj tachado, reloj, sello y punto
const ICON: Record<StatusState, ReactNode> = {
  todo: <circle cx="8" cy="8" r="5.5" {...STROKE} />,
  active: (
    <>
      <circle cx="8" cy="8" r="5.5" {...STROKE} />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
    </>
  ),
  done: (
    <>
      <circle cx="8" cy="8" r="6.25" fill="currentColor" />
      <path d="m5.25 8.25 1.9 1.9 3.6-3.9" fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  review: <path d="M4.5 2.5h7M4.5 13.5h7M5.5 2.5c0 3 5 3.5 5 5.5s-5 2.5-5 5.5M10.5 2.5c0 3-5 3.5-5 5.5s5 2.5 5 5.5" {...STROKE} strokeWidth={1.4} />,
  overdue: (
    <>
      <circle cx="8" cy="8" r="5.5" {...STROKE} />
      <path d="M8 5v3l2 1.25M3 3l10 10" {...STROKE} />
    </>
  ),
  warning: (
    <>
      <circle cx="8" cy="8" r="5.5" {...STROKE} />
      <path d="M8 5v3l2 1.25" {...STROKE} />
    </>
  ),
  achievement: (
    <>
      <circle cx="8" cy="6.25" r="3.75" {...STROKE} />
      <path d="m5.75 9.5-.75 4.5 3-1.5 3 1.5-.75-4.5" {...STROKE} />
    </>
  ),
  neutral: <circle cx="8" cy="8" r="2" fill="currentColor" />
}

export function StatusBadge({ state, children }: { state: StatusState; children: ReactNode }) {
  return (
    <Badge data-state={state} className={`gap-1.5 rounded-md ${TONE[state]}`}>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0">
        {ICON[state]}
      </svg>
      <span className="text-secondary font-semibold">{children}</span>
    </Badge>
  )
}
