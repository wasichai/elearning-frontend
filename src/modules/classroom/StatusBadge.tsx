import { Badge } from '@wasichai/ui'
import type { ReactNode } from 'react'
import { isDone, type ProgressStatus } from './contract'

// la insignia de estado de aprendizaje (docs/design-system/components/StatusBadge): icono y palabra, nunca solo color.
// sobre el Badge de @wasichai/ui; sus colores son pares de tokens que quipu.test.ts comprueba en AA. la palabra la pone
// quien la usa, desde su i18n. «vencido» llegará cuando una pantalla lo necesite
export const STATUS_STATES = ['todo', 'active', 'done', 'review'] as const
export type StatusState = (typeof STATUS_STATES)[number]

const TONE: Record<StatusState, string> = {
  todo: 'bg-surface-muted text-ink-muted',
  active: 'bg-brand-soft text-brand-strong',
  done: 'bg-success-soft text-success',
  review: 'bg-notice-soft text-notice'
}

// un estado, una forma: círculo vacío, medio círculo, check en círculo, reloj de arena
const ICON: Record<StatusState, ReactNode> = {
  todo: <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  active: (
    <>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
    </>
  ),
  done: (
    <>
      <circle cx="8" cy="8" r="6.25" fill="currentColor" />
      <path d="m5.25 8.25 1.9 1.9 3.6-3.9" fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  review: (
    <path
      d="M4.5 2.5h7M4.5 13.5h7M5.5 2.5c0 3 5 3.5 5 5.5s-5 2.5-5 5.5M10.5 2.5c0 3-5 3.5-5 5.5s5 2.5 5 5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  )
}

export function statusOf(status: ProgressStatus): StatusState {
  return isDone(status) ? 'done' : status === 'INICIADA' ? 'active' : 'todo'
}

export function StatusBadge({ state, children }: { state: StatusState; children: ReactNode }) {
  return (
    <Badge data-state={state} className={`gap-1.5 ${TONE[state]}`}>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0">
        {ICON[state]}
      </svg>
      {children}
    </Badge>
  )
}
