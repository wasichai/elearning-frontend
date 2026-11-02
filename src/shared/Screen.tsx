import { ChevronRight } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useId } from 'react'
import { Link } from 'react-router'

// el armazón común de las pantallas del LMS (UX-UI-IMPLEMENTATION.md). PageHeader de @wasichai/core es una barra de márgenes
// fijos (px-8 también en un móvil), sin ruta ni alineación con el contenido: cuando @wasichai/core los ofrezca, esto se retira.
// ningún texto propio: lo pone cada módulo desde su i18n (src/shared no tiene espacio de nombres)

export type ScreenWidth = 'reading' | 'content' | 'wide'

// reading: una columna de lectura o formulario; content: paneles del estudiante; wide: trabajo docente y editorial
const WIDTHS: Record<ScreenWidth, string> = {
  reading: 'max-w-3xl',
  content: 'max-w-6xl',
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
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-ink-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" /> : null}
            {item.to ? (
              <Link to={item.to} className="inline-flex min-h-6 items-center rounded-sm text-link underline-offset-4 hover:underline">
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
            <h1 className="text-title-2 text-balance text-ink lg:text-title-1">{title}</h1>
            {subtitle ? <p className="max-w-prose text-base text-ink-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {meta ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">{meta}</div> : null}
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
  className = ''
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  level?: 2 | 3
  className?: string
}) {
  const id = useId()
  const Heading = `h${level}` as const
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading id={id} className="text-title-3 text-ink">
            {title}
          </Heading>
          {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// una cifra con su etiqueta. va dentro de un <StatList>: es una lista de definiciones
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  // solo cuando la cifra pide atención; la palabra de hint o label dice por qué: el color nunca va solo
  tone?: 'review' | 'warning' | 'done'
}) {
  const color = tone === 'review' ? 'text-notice' : tone === 'warning' ? 'text-warning' : tone === 'done' ? 'text-success' : 'text-ink'
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
        {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
        {label}
      </dt>
      <dd className={`text-numeral tabular-nums ${color}`}>{value}</dd>
      {hint ? <dd className="text-sm text-ink-muted">{hint}</dd> : null}
    </div>
  )
}

export function StatList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={`grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10 ${className}`}>{children}</dl>
}

// el hueco de algo que está cargando, con la geometría real. decorativo: el aviso a lectores lo da quien lo usa (role="status")
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-border motion-reduce:animate-none ${className}`} />
}
