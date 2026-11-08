import type { ReactNode } from 'react'

// el encabezado de una sección «§n Título» (docs/design-system/colofon/Components.dc.html): abre con el filete fuerte, el número
// en Source Sans, el título en Newsreader y, a la derecha, un meta o una acción. number es solo la cifra: el «§» lo pone esto
export function SectionHead({
  number,
  title,
  meta,
  as: Heading = 'h2',
  id
}: {
  number?: string
  title: ReactNode
  meta?: ReactNode
  as?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <div className="rule-strong flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-3">
      {number ? <span className="text-secondary w-10 shrink-0 text-ink-muted tabular-nums">§{number}</span> : null}
      <Heading id={id} className={`font-read min-w-0 text-balance text-ink ${Heading === 'h2' ? 'text-h3' : 'text-h4'}`}>
        {title}
      </Heading>
      {meta ? <div className="text-secondary ml-auto text-ink-muted">{meta}</div> : null}
    </div>
  )
}
