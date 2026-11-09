import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Crumb } from './Screen'

// la cabecera corrida (docs/design-system/colofon/Classroom.dc.html): las migas a la izquierda en versalitas y el folio a la derecha,
// sobre un filete de tinta. es la ruta de la página: su nombre («Ruta») está en runningHeadMessages, que quien la use pone bajo la clave
// runningHead de su espacio de nombres (namespace), igual que VersionDiff. ninguna miga desborda: con enlace o sin él se corta
// con elipsis y lleva el texto completo en title. la última, si no tiene destino, es la página actual. el folio («1 / 15») es para el ojo;
// folioLabel («Lección 1 de 15») es lo que oye el lector de pantalla
export function RunningHead({ namespace, trail, folio, folioLabel }: { namespace: string; trail: Crumb[]; folio?: string; folioLabel?: string }) {
  const { t } = useTranslation(namespace)
  return (
    <nav aria-label={t('runningHead.label')} className="flex items-baseline justify-between gap-4 border-b border-ink pb-2 print:hidden">
      <ol className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-x-2">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1
          return (
            // las anteriores ceden ancho antes que la actual
            <li key={`${crumb.label}-${index}`} className={`flex min-w-0 items-baseline gap-x-2 ${last ? '' : 'shrink-[3]'}`}>
              {index > 0 ? (
                <span aria-hidden="true" className="meta">
                  ·
                </span>
              ) : null}
              {crumb.to ? (
                <Link to={crumb.to} title={crumb.label} className="meta min-w-0 truncate rounded-sm text-link underline-offset-4 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} title={crumb.label} className="meta min-w-0 truncate text-ink">
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {folio ? (
        <span className="text-secondary shrink-0 text-ink-muted tabular-nums">
          {folioLabel ? (
            <>
              <span aria-hidden="true">{folio}</span>
              <span className="sr-only">{folioLabel}</span>
            </>
          ) : (
            folio
          )}
        </span>
      ) : null}
    </nav>
  )
}
