import { Alert, type AlertTone } from '@wasichai/ui'
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// un aviso con su icono y sobre su fondo: el color nunca va solo. Alert de @wasichai/ui es texto en su tono, y su rol (alert o status) se
// conserva. los pares de tono y fondo los comprueba quipu.test.ts en AA
const LOOK: Record<AlertTone, { icon: LucideIcon; box: string }> = {
  danger: { icon: CircleAlert, box: 'border-danger bg-danger-soft' },
  warning: { icon: TriangleAlert, box: 'border-warning bg-warning-soft' },
  success: { icon: CircleCheck, box: 'border-success bg-success-soft' },
  notice: { icon: Info, box: 'border-notice bg-notice-soft' }
}

export function Notice({ tone, title, children }: { tone: AlertTone; title?: string; children?: ReactNode }) {
  const { icon: Icon, box } = LOOK[tone]
  return (
    <Alert tone={tone} className={`rounded-lg border px-3 py-2 ${box}`}>
      <span className="flex items-start gap-2">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0">
          {title ? <strong className="block font-semibold">{title}</strong> : null}
          {children}
        </span>
      </span>
    </Alert>
  )
}
