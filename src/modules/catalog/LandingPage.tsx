import { useAppTitle, useWasichaiLinks } from '@wasichai/core'
import { Button, Input, Label } from '@wasichai/ui'
import { ArrowRight } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { formatCivilDate, formatNumber } from '../../shared/format'
import { PublicLayout } from '../../shared/PublicLayout'
import { ScreenBody, Skeleton, Stat, StatList, screenContainer } from '../../shared/Screen'
import { SectionHead } from '../../shared/SectionHead'
import { catalogKeys, useLandingCourses, useQueryProblem, type LandingQuery } from './api'
import type { CourseSummary } from './contract'
import { CourseRow, CourseRowSkeleton } from './CourseRow'
import { ProblemState, useProblemText } from './ProblemState'
import { CATALOG_ROUTES } from './routes'

// la portada pública: lo que `/` muestra sin sesión (publicHome de @wasichai/core). con sesión, `/` sigue llevando a homeRoute.
// todo sale del catálogo público: el banner es el primer curso destacado (curso_destacado, ADR-0046 del backend) y las cifras
// son solo las que ya son públicas, cursos y áreas (ADR-0023: nunca cuántos estudiantes)
const FEATURED: LandingQuery = { featured: true, size: 1 }
const OVERVIEW: LandingQuery = { size: 1 }
// las áreas con más cursos tienen fila propia; el resto, en el índice de áreas
const AREA_ROWS = 3
const ROW_SIZE = 4
const ROWS = 'flex flex-col divide-y divide-border border-y border-border'
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
const LINK = `inline-flex min-h-11 items-center gap-1.5 rounded-sm text-secondary font-medium text-link underline-offset-4 hover:underline ${FOCUS}`
const REASONS = ['pace', 'workload', 'certificates'] as const
const VERIFY_ROUTE = 'classroom:verify'

export function LandingPage() {
  const { t } = useTranslation('catalog')
  const overview = useLandingCourses(OVERVIEW)
  const { problem, retry } = useQueryProblem(overview, catalogKeys.landing(OVERVIEW))
  const page = overview.data

  return (
    <PublicLayout fullBleed>
      <Hero />
      <ScreenBody>
        <div className="flex flex-col gap-14 pt-10">
          {problem ? (
            <LandingProblem error={problem} onRetry={retry} />
          ) : !page ? (
            <div role="status" className="flex flex-col gap-4">
              <span className="sr-only">{t('catalog.loading')}</span>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-11 w-2/3" />
            </div>
          ) : page.totalElements === 0 ? (
            <p className="text-body text-ink-muted">{t('landing.empty')}</p>
          ) : (
            <>
              <Figures courses={page.totalElements} areas={page.facets.categories.length} />
              <Areas categories={page.facets.categories} />
              {[...page.facets.categories]
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
                .slice(0, AREA_ROWS)
                .map((category) => (
                  <AreaRow key={category.slug} slug={category.slug} name={category.name} />
                ))}
            </>
          )}
          <Reasons />
        </div>
      </ScreenBody>
      <Footer />
    </PublicLayout>
  )
}

// el banner: el curso destacado o, sin ninguno (o si falla su consulta), el producto. la búsqueda va siempre
function Hero() {
  const { t, i18n } = useTranslation('catalog')
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  const query = useLandingCourses(FEATURED)
  const course: CourseSummary | undefined = query.data?.content[0]
  const headingId = useId()
  const explore = (
    <Link to={links.to(CATALOG_ROUTES.courses)} className={LINK}>
      {t('landing.explore')}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  )

  return (
    <section aria-labelledby={headingId} className="border-b border-border bg-surface">
      <div className={`${screenContainer()} flex flex-col gap-6 pt-10 pb-8`}>
        {query.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-6 w-full max-w-xl" />
          </div>
        ) : course ? (
          <div className="flex flex-col gap-3">
            <div className="rule-strong flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-3">
              <p className="meta text-ink">{t('landing.featured')}</p>
              {course.nextOffering ? (
                <p className="meta">
                  {t('landing.starts', { date: formatCivilDate(course.nextOffering.startDate, course.nextOffering.timeZone, i18n.language) })}
                </p>
              ) : null}
            </div>
            <h1 id={headingId} className="text-h2 font-read text-balance text-ink sm:text-display">
              {course.title}
            </h1>
            {course.summary ? <p className="text-body font-read max-w-measure text-ink-muted sm:text-reading">{course.summary}</p> : null}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <Button asChild variant="primary" className="min-h-11">
                <Link to={links.to(CATALOG_ROUTES.course, { slug: course.slug })}>{t('landing.viewCourse')}</Link>
              </Button>
              {explore}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rule-strong pt-3">
              <p className="meta text-ink">{t('landing.eyebrow')}</p>
            </div>
            <h1 id={headingId} className="text-h2 font-read text-balance text-ink sm:text-display">
              {t('landing.title', { name: appName })}
            </h1>
            <p className="text-body font-read max-w-measure text-ink-muted sm:text-reading">{t('landing.subtitle')}</p>
            <div className="pt-2">{explore}</div>
          </div>
        )}
        <div className="border-t border-border pt-5">
          <Search />
        </div>
      </div>
    </section>
  )
}

function Search() {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const id = useId()
  const [text, setText] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = text.trim()
    navigate(links.to(CATALOG_ROUTES.courses, undefined, q ? { q } : undefined))
  }
  return (
    <form role="search" onSubmit={submit} className="flex max-w-xl flex-col gap-1.5">
      <Label htmlFor={id}>{t('filters.search')}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="search"
          name="q"
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('filters.searchPlaceholder')}
        />
        <Button type="submit">{t('filters.submit')}</Button>
      </div>
    </form>
  )
}

function Figures({ courses, areas }: { courses: number; areas: number }) {
  const { t, i18n } = useTranslation('catalog')
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHead id={headingId} title={t('landing.figures.title')} />
      <StatList>
        <Stat label={t('landing.figures.courses', { count: courses })} value={formatNumber(courses, i18n.language)} />
        <Stat label={t('landing.figures.areas', { count: areas })} value={formatNumber(areas, i18n.language)} />
      </StatList>
    </section>
  )
}

function Areas({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  const headingId = useId()
  if (categories.length === 0) return null
  return (
    <nav aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHead id={headingId} title={t('landing.areas')} />
      <ul className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const href = links.to(CATALOG_ROUTES.courses, undefined, { category: category.slug })
          return (
            <li key={category.slug}>
              <Link
                to={href}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-control bg-surface px-3.5 text-secondary text-ink hover:bg-surface-muted ${FOCUS}`}
              >
                <span>{category.name}</span>
                <span className="tabular-nums text-ink-muted">{t('filters.categoryCount', { count: category.count })}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// una fila por área: sus primeros cursos y el enlace al catálogo filtrado. si su consulta falla, la fila no se pinta: la portada sigue
function AreaRow({ slug, name }: { slug: string; name: string }) {
  const { t } = useTranslation('catalog')
  const links = useWasichaiLinks()
  const query = useLandingCourses({ category: slug, size: ROW_SIZE })
  const headingId = useId()
  if (query.isError) return null
  const all = links.to(CATALOG_ROUTES.courses, undefined, { category: slug })
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="rule-strong flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
        <h3 id={headingId} className="text-h3 font-read text-ink">
          {name}
        </h3>
        <Link to={all} aria-label={t('landing.allInArea', { name })} className={LINK}>
          {t('landing.all')}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <ul className={ROWS}>
        {query.data
          ? query.data.content.map((course) => <CourseRow key={course.slug} course={course} grouped />)
          : Array.from({ length: 2 }, (_, index) => <CourseRowSkeleton key={index} />)}
      </ul>
    </section>
  )
}

// lo que el producto cumple de verdad: modalidades a distancia, carga de trabajo publicada y certificados que se verifican
function Reasons() {
  const { t } = useTranslation('catalog')
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHead id={headingId} title={t('landing.reasons.title')} />
      <ul className="grid gap-x-8 gap-y-6 md:grid-cols-3">
        {REASONS.map((reason) => (
          <li key={reason} className="rule flex flex-col gap-1.5 pt-3">
            <h3 className="text-h4 font-read text-ink">{t(`landing.reasons.${reason}.title`)}</h3>
            <p className="text-secondary text-ink-muted">{t(`landing.reasons.${reason}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Footer() {
  const { t } = useTranslation('catalog')
  const { appName } = useAppTitle()
  const links = useWasichaiLinks()
  return (
    <footer className="mt-16 border-t border-border bg-surface print:hidden">
      <div className={`${screenContainer()} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-secondary text-ink-muted`}>
        <p>{t('landing.footer', { name: appName, year: new Date().getFullYear() })}</p>
        <nav aria-label={t('landing.footerNav')} className="flex flex-wrap gap-x-6">
          <Link to={links.to(CATALOG_ROUTES.courses)} className={LINK}>
            {t('nav.courses')}
          </Link>
          {links.has(VERIFY_ROUTE) ? (
            <Link to={links.to(VERIFY_ROUTE)} className={LINK}>
              {t('landing.verify')}
            </Link>
          ) : null}
        </nav>
      </div>
    </footer>
  )
}

function LandingProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('catalog')
  const { title, description, technical } = useProblemText(error, 'catalog')
  return (
    <ProblemState title={title} description={description} technical={technical}>
      <Button variant="secondary" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}
