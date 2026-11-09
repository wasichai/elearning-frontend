import { ChevronRight } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useId } from 'react'
import { Link, NavLink } from 'react-router'
import { SectionHead } from './SectionHead'

// el armazón común de las pantallas del LMS (UX-UI-IMPLEMENTATION.md). PageHeader de @wasichai/core es una barra de márgenes
// fijos (px-8 también en un móvil), sin ruta ni alineación con el contenido: cuando @wasichai/core los ofrezca, esto se retira.
// ningún texto propio: lo pone cada módulo desde su i18n (src/shared no tiene espacio de nombres)

export type ScreenWidth = 'reading' | 'content' | 'wide'

// reading: una columna de lectura o formulario; content: paneles del estudiante; wide: trabajo docente y editorial
const WIDTHS: Record<ScreenWidth, string> = {
  reading: 'max-w-3xl',
  content: 'max-w-content-max',
  wide: 'max-w-[96rem]'
}

export const screenContainer = (width: ScreenWidth = 'content') => `mx-auto w-full ${WIDTHS[width]} px-4 sm:px-6 lg:px-8`

export interface Crumb {
  label: string
  // sin destino, es la pantalla actual
  to?: string
}

export function Breadcrumbs({ label, items }: { label: string; items: Crumb[] }) {
  return (
    <nav aria-label={label} className="print:hidden">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-secondary text-ink-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" /> : null}
            {item.to ? (
              <Link to={item.to} className="inline-flex min-h-11 items-center rounded-sm text-link underline-offset-4 hover:underline sm:min-h-6">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export interface SectionTab {
  label: ReactNode
  to: string
  // solo activa con la ruta exacta, no con las que cuelgan de ella
  end?: boolean
}

// las secciones de un recurso (un curso, una edición), por URL: se enlazan, se recargan y marcan dónde se está. van en children de
// ScreenHeader. con desplazamiento propio si no caben: la página nunca desborda
export function SectionTabs({ label, items }: { label: string; items: SectionTab[] }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="flex w-max gap-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center border-b-2 text-secondary whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                isActive ? 'border-brand font-medium text-ink' : 'border-transparent text-ink-muted hover:border-border-control hover:text-ink'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export interface ScreenHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  // la acción principal de la pantalla (una sola primaria): a la derecha en pantallas anchas, debajo en un móvil
  actions?: ReactNode
  // Breadcrumbs, o la vuelta a la pantalla anterior
  breadcrumbs?: ReactNode
  // insignias y hechos bajo el título
  meta?: ReactNode
  // lo que cuelga de la cabecera: pestañas de sección o cifras
  children?: ReactNode
  width?: ScreenWidth
}

export function ScreenHeader({ title, subtitle, actions, breadcrumbs, meta, children, width = 'content' }: ScreenHeaderProps) {
  return (
    <header className="border-b border-border bg-surface">
      <div className={`${screenContainer(width)} flex flex-col gap-3 pt-5 ${children ? 'pb-0' : 'pb-5'} lg:pt-6`}>
        {breadcrumbs}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-h1 font-read text-balance text-ink max-sm:text-h2">{title}</h1>
            {subtitle ? <p className="text-reading font-read max-w-measure text-ink-muted max-sm:text-body">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {meta ? <div className="meta flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div> : null}
        {children}
      </div>
    </header>
  )
}

export function ScreenBody({ children, width = 'content', className = '' }: { children: ReactNode; width?: ScreenWidth; className?: string }) {
  return <div className={`${screenContainer(width)} flex flex-col gap-8 pt-6 pb-16 lg:pt-8 ${className}`}>{children}</div>
}

// una sección de pantalla: su título, una línea de contexto y, a la derecha, un enlace o una acción secundaria
export function Section({
  title,
  description,
  action,
  children,
  level = 2,
  className = '',
  anchor,
  number
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  level?: 2 | 3
  className?: string
  // el id de la sección, para enlazarla desde un índice («En esta página»); se detiene a un respiro del borde
  anchor?: string
  // la cifra de «§n», cuando la pantalla numera sus secciones (la ficha del curso)
  number?: string
}) {
  const id = useId()
  return (
    <section id={anchor} aria-labelledby={id} className={`flex min-w-0 flex-col gap-3 ${anchor ? 'scroll-mt-6' : ''} ${className}`}>
      <SectionHead id={id} as={level === 3 ? 'h3' : 'h2'} number={number} title={title} meta={action} />
      {description ? <p className="text-secondary text-ink-muted">{description}</p> : null}
      {children}
    </section>
  )
}

// una cifra con su etiqueta. va dentro de un <StatList>: es una lista de definiciones. todas con la misma forma (problema 13 del
// diagnóstico): abre con un filete, la etiqueta en versalitas, la cifra en tinta y, si hace falta, una nota que dice qué hacer con ella.
// la cifra nunca cambia de color: lo que pide atención lo dice la nota
export function Stat({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  return (
    <div className="rule row-span-3 grid min-w-0 grid-rows-subgrid content-start pt-3 pb-3">
      <dt className="meta flex items-start gap-1.5">
        {Icon ? <Icon aria-hidden className="mt-0.5 size-4 shrink-0" /> : null}
        {label}
      </dt>
      <dd className="font-read text-h3 text-ink tabular-nums lining-nums">{value}</dd>
      {hint ? <dd className="text-secondary max-w-56 text-ink-muted">{hint}</dd> : null}
    </div>
  )
}

// las cifras en columnas iguales que comparten sus filas (subgrid): las etiquetas, las cifras y las notas quedan a la misma altura aunque una
// etiqueta ocupe dos líneas o una cifra no tenga nota
export function StatList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={`grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] ${className}`}>{children}</dl>
}

// el hueco de algo que está cargando, con la geometría real. decorativo: el aviso a lectores lo da quien lo usa (role="status")
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-border motion-reduce:animate-none ${className}`} />
}
