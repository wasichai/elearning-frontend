import { useWasichaiConfig, useWasichaiLinks } from '@wasichai/core'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CATALOG_ROUTES } from './routes'

// el marco de las páginas públicas: sin shell ni menú, el nombre del producto vuelve al catálogo
export function PublicLayout({ children }: { children: ReactNode }) {
  const { appName } = useWasichaiConfig()
  const links = useWasichaiLinks()
  return (
    <div className="min-h-full bg-surface text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3 sm:px-6">
          {appName ? (
            <Link to={links.to(CATALOG_ROUTES.courses)} className="text-sm font-semibold tracking-tight text-ink hover:text-brand-strong">
              {appName}
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">{children}</main>
    </div>
  )
}

// el encabezado editorial de una página pública. PageHeader de @wasichai/core es la barra de una pantalla del shell
// (borde, fondo y márgenes de panel); aquí el título abre la página como en una publicación
export function PublicHeading({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-10 pb-6">
      {eyebrow}
      <h1 className="text-3xl font-semibold tracking-tight text-balance text-ink">{title}</h1>
      {subtitle ? <p className="max-w-prose text-base text-ink-muted">{subtitle}</p> : null}
    </div>
  )
}
