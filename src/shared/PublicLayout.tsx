import { useAppTitle, useWasichaiLinks } from '@wasichai/core'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

// el catálogo (módulo catalog), por su clave de ruta como texto: src/shared no importa ningún módulo
const CATALOG_COURSES_ROUTE = 'catalog:courses'

// el marco de las páginas públicas (catálogo, verificación de certificados): sin shell ni menú, el nombre del producto
// vuelve al catálogo si está registrado. no sale al imprimir: una página impresa no lleva navegación
export function PublicLayout({ children }: { children: ReactNode }) {
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  const home = links.has(CATALOG_COURSES_ROUTE) ? links.to(CATALOG_COURSES_ROUTE) : undefined
  return (
    <div className="min-h-full bg-surface text-ink">
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3 sm:px-6">
          {appName && home ? (
            <Link to={home} className="text-sm font-semibold tracking-tight text-ink hover:text-brand-strong">
              {appName}
            </Link>
          ) : appName ? (
            <span className="text-sm font-semibold tracking-tight text-ink">{appName}</span>
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
