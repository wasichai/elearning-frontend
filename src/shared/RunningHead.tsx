import { Link } from 'react-router'
import type { Crumb } from './Screen'

// la cabecera corrida (docs/design-system/colofon/Classroom.dc.html): las migas a la izquierda en versalitas y el folio a la derecha,
// sobre un filete de tinta. la miga actual (sin destino) se corta con elipsis y lleva el texto completo en title: nunca desborda
export function RunningHead({ trail, folio }: { trail: Crumb[]; folio?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2 print:hidden">
      <ol className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-x-2">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className={`flex items-baseline gap-x-2 ${crumb.to ? 'shrink-0' : 'min-w-0'}`}>
            {index > 0 ? (
              <span aria-hidden="true" className="meta">
                ·
              </span>
            ) : null}
            {crumb.to ? (
              <Link to={crumb.to} className="meta rounded-sm text-link underline-offset-4 hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" title={crumb.label} className="meta truncate text-ink">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      {folio ? <span className="text-secondary shrink-0 text-ink-muted tabular-nums">{folio}</span> : null}
    </div>
  )
}
