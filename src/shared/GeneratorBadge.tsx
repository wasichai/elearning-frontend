import { Badge } from '@wasichai/ui'
import { Bot, FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// de dónde salió el borrador de una versión (RF-IA-03, RF-IA-08; «Origen» en docs/api/lms.md del backend): un proveedor de IA
// (MODEL), el doble determinista, sin red ni modelo, cuyo contenido es solo ilustrativo (DETERMINISTIC), o una persona (null)
export type Generator = 'MODEL' | 'DETERMINISTIC'

// solo informa: no oculta ni habilita nada, aprobar y publicar los decide el servidor. lo ilustrativo va como en el catálogo, en notice;
// lo generado con IA, neutro. icono y palabra, nunca solo color. namespace: el espacio i18n del módulo que lo pinta (generator.*)
export function GeneratorBadge({ namespace, generator }: { namespace: string; generator: Generator | null }) {
  const { t } = useTranslation(namespace)
  if (generator === null) return null
  const Icon = generator === 'MODEL' ? Bot : FlaskConical
  return (
    <Badge
      data-generator={generator}
      className={`gap-1.5 ${generator === 'MODEL' ? 'border border-border bg-surface text-ink-muted' : 'bg-notice-soft text-notice'}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {t(`generator.${generator}`)}
    </Badge>
  )
}
