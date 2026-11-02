import { CORE_NAMESPACE, useAppTitle, useAuth, useWasichaiLinks } from '@wasichai/core'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { QuipuMark } from './QuipuMark'
import { screenContainer, type ScreenWidth } from './Screen'

// el catálogo y el aula (otros módulos), por su clave de ruta como texto: src/shared no importa ningún módulo
const CATALOG_COURSES_ROUTE = 'catalog:courses'
const MY_COURSES_ROUTE = 'classroom:enrollments'
const MY_COURSES_LABEL = 'classroom:nav.myCourses'

// el marco de las páginas públicas (catálogo, verificación de certificados): sin shell ni menú, el nombre del producto
// vuelve al catálogo si está registrado, y a la derecha está la entrada: «Mis cursos» con sesión, «Iniciar sesión» sin ella.
// no sale al imprimir: una página impresa no lleva navegación. con fullBleed la página pone sus propios márgenes: bandas a todo el ancho
export function PublicLayout({ children, width = 'content', fullBleed = false }: { children: ReactNode; width?: ScreenWidth; fullBleed?: boolean }) {
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  const home = links.has(CATALOG_COURSES_ROUTE) ? links.to(CATALOG_COURSES_ROUTE) : undefined
  const brand = (
    <>
      <QuipuMark />
      <span>{appName}</span>
    </>
  )
  const brandClass = 'inline-flex min-h-11 items-center gap-2 rounded-sm text-base font-semibold tracking-tight text-ink'
  return (
    <div className="flex min-h-full flex-col bg-surface-muted text-ink">
      <header className="border-b border-border bg-surface print:hidden">
        <div className={`${screenContainer(width)} flex items-center justify-between gap-4 py-1.5`}>
          {appName && home ? (
            <Link to={home} className={`${brandClass} hover:text-brand-strong`}>
              {brand}
            </Link>
          ) : appName ? (
            <span className={brandClass}>{brand}</span>
          ) : (
            <span />
          )}
          <PublicEntry />
        </div>
      </header>
      <main className={fullBleed ? 'flex-1' : `${screenContainer(width)} flex-1 pb-16`}>{children}</main>
    </div>
  )
}

function PublicEntry() {
  const { t } = useTranslation(CORE_NAMESPACE)
  const { user } = useAuth()
  const links = useWasichaiLinks()
  const linkClass = 'inline-flex min-h-11 items-center rounded-sm px-1 text-sm font-medium text-link underline-offset-4 hover:underline'
  if (user && links.has(MY_COURSES_ROUTE))
    return (
      <Link to={links.to(MY_COURSES_ROUTE)} className={linkClass}>
        {t(MY_COURSES_LABEL)}
      </Link>
    )
  if (user) return null
  return (
    <Link to={links.login()} className={linkClass}>
      {t('auth.signIn')}
    </Link>
  )
}

// el encabezado editorial de una página pública. PageHeader de @wasichai/core es la barra de una pantalla del shell
// (borde, fondo y márgenes de panel); aquí el título abre la página como en una publicación
export function PublicHeading({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-10 pb-6">
      {eyebrow}
      <h1 className="text-title-2 text-balance text-ink sm:text-display">{title}</h1>
      {subtitle ? <p className="max-w-prose text-base text-ink-muted">{subtitle}</p> : null}
    </div>
  )
}
