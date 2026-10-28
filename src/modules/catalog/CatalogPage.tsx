import { ApiError, EmptyState, LoadingState, useWasichaiLinks } from '@wasichai/core'
import { Button, Input, Label, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { hasActiveFilters, useCatalogFilters, useCourses, type CatalogFilters } from './api'
import { LEVELS, MODALITIES, SORTS, type CoursePage, type CourseSummary, type NextOffering } from './contract'
import { formatCivilRange, formatNumber } from './format'
import { Fact, IllustrativeMark, offeringState } from './parts'
import { ProblemState, useProblemText } from './ProblemState'
import { PublicHeading, PublicLayout } from './PublicLayout'
import { CATALOG_ROUTES } from './routes'

// Radix Select no admite el valor vacío: «todas» viaja como este centinela y en la URL es la ausencia del filtro
const ALL = 'all'

export function CatalogPage() {
  const { t } = useTranslation('catalog')
  const [filters, update, clear] = useCatalogFilters()
  const query = useCourses(filters)
  const resultsHeading = useRef<HTMLHeadingElement>(null)

  const goToPage = (page: number) => {
    update({ page })
    // el foco salta al principio de la nueva página de resultados (y la lleva a la vista)
    resultsHeading.current?.focus()
  }

  return (
    <PublicLayout>
      <PublicHeading title={t('catalog.title')} subtitle={t('catalog.subtitle')} />
      <Filters filters={filters} page={query.data} onChange={update} onClear={clear} />
      <section aria-labelledby="catalog-results" className="mt-8">
        <h2 id="catalog-results" ref={resultsHeading} tabIndex={-1} className="sr-only">
          {t('catalog.results')}
        </h2>
        {query.isPending ? (
          <LoadingState label={t('catalog.loading')} />
        ) : query.isError ? (
          <CatalogProblem error={query.error} onRetry={() => void query.refetch()} onClear={clear} />
        ) : (
          <Results page={query.data} filters={filters} busy={query.isPlaceholderData} onPage={goToPage} onClear={clear} />
        )}
      </section>
    </PublicLayout>
  )
}

interface FiltersProps {
  filters: CatalogFilters
  page: CoursePage | undefined
  onChange: (patch: Partial<CatalogFilters>) => void
  onClear: () => void
}

function Filters({ filters, page, onChange, onClear }: FiltersProps) {
  const { t } = useTranslation('catalog')
  const id = useId()
  // el texto se edita libre y se aplica al buscar; si la URL cambia (atrás, limpiar), el campo la sigue
  const [text, setText] = useState(filters.q)
  useEffect(() => setText(filters.q), [filters.q])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onChange({ q: text.trim() })
  }

  const categories: { slug: string; name: string; count?: number }[] = page?.facets.categories ?? []
  // una categoría de la URL que no viene en los facets sigue visible en el selector (si no, quedaría en blanco)
  const categoryOptions =
    filters.category && !categories.some((category) => category.slug === filters.category)
      ? [...categories, { slug: filters.category, name: filters.category }]
      : categories

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={submit} className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-q`}>{t('filters.search')}</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-q`}
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
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <legend className="sr-only">{t('filters.legend')}</legend>
        <FilterSelect id={`${id}-category`} label={t('filters.category')} value={filters.category} onChange={(category) => onChange({ category })}>
          {categoryOptions.map((category) => (
            <SelectItem key={category.slug} value={category.slug}>
              {category.count === undefined ? category.name : t('filters.categoryOption', { name: category.name, count: category.count })}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id={`${id}-level`} label={t('filters.level')} value={filters.level} onChange={(level) => onChange({ level })}>
          {LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {t(`level.${level}`)}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect id={`${id}-modality`} label={t('filters.modality')} value={filters.modality} onChange={(modality) => onChange({ modality })}>
          {MODALITIES.map((modality) => (
            <SelectItem key={modality} value={modality}>
              {t(`modality.${modality}`)}
            </SelectItem>
          ))}
        </FilterSelect>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-from`}>{t('filters.startsFrom')}</Label>
          <Input
            id={`${id}-from`}
            type="date"
            value={filters.startsFrom}
            // a medio escribir, un campo de fecha vale '' y no es válido: solo una fecha completa o el borrado cambian la búsqueda
            onChange={(event) => {
              if (event.target.value !== '' || event.target.validity.valid) onChange({ startsFrom: event.target.value })
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sort`}>{t('filters.sort')}</Label>
          <Select value={filters.sort} onValueChange={(sort) => onChange({ sort })}>
            <SelectTrigger id={`${id}-sort`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(`sort.${sort}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>
      {hasActiveFilters(filters) ? (
        <div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('filters.clear')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface FilterSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
  const { t } = useTranslation('catalog')
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  )
}

interface ResultsProps {
  page: CoursePage
  filters: CatalogFilters
  busy: boolean
  onPage: (page: number) => void
  onClear: () => void
}

function Results({ page, filters, busy, onPage, onClear }: ResultsProps) {
  const { t } = useTranslation('catalog')

  if (page.content.length === 0) {
    // más allá de la última página (una URL vieja o editada) no es lo mismo que no tener resultados
    if (page.totalElements > 0)
      return (
        <EmptyState title={t('empty.pastLastPage')}>
          <Button variant="secondary" size="sm" onClick={() => onPage(1)}>
            {t('empty.firstPage')}
          </Button>
        </EmptyState>
      )
    return hasActiveFilters(filters) ? (
      <EmptyState title={t('empty.filtered')}>
        <p>{t('empty.filteredHint')}</p>
        <Button variant="secondary" size="sm" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      </EmptyState>
    ) : (
      <EmptyState title={t('empty.none')} />
    )
  }

  return (
    <div aria-busy={busy} className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <p role="status" className="border-b border-border pb-3 text-sm text-ink-muted">
        {t('catalog.count', { count: page.totalElements })}
      </p>
      <ol className="divide-y divide-border">
        {page.content.map((course) => (
          <li key={course.slug}>
            <CourseItem course={course} />
          </li>
        ))}
      </ol>
      {page.totalPages > 1 ? (
        <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPage={(index) => onPage(index + 1)} />
      ) : null}
    </div>
  )
}

function CourseItem({ course }: { course: CourseSummary }) {
  const { t, i18n } = useTranslation('catalog')
  const links = useWasichaiLinks()
  return (
    <article className="flex flex-col gap-2 py-6">
      {course.category || course.illustrative ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          {course.category ? <span className="font-medium uppercase tracking-wide">{course.category.name}</span> : null}
          {course.illustrative ? <IllustrativeMark /> : null}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold leading-snug tracking-tight">
        <Link
          to={links.to(CATALOG_ROUTES.course, { slug: course.slug })}
          className="rounded-sm text-ink underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {course.title}
        </Link>
      </h3>
      <p className="max-w-prose text-sm text-ink-muted">{course.summary}</p>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Fact label={t('course.level')}>{t(`level.${course.level}`)}</Fact>
        <Fact label={t('course.modality')}>{t(`modality.${course.modality}`)}</Fact>
        <Fact label={t('course.duration')}>
          {t('course.durationValue', { count: course.weeks, hours: formatNumber(course.workload.totalHours, i18n.language) })}
        </Fact>
      </dl>
      <OfferingLine offering={course.nextOffering} />
    </article>
  )
}

function OfferingLine({ offering }: { offering: NextOffering | null }) {
  const { t, i18n } = useTranslation('catalog')
  if (!offering) return <p className="text-sm text-ink-muted">{t('offering.none')}</p>
  return (
    <p className="text-sm">
      <span className="text-ink-muted">{t('offering.next')} </span>
      <span className="text-ink">{formatCivilRange(offering.startDate, offering.endDate, offering.timeZone, i18n.language)}</span>
      <span className="text-ink-muted"> · </span>
      <span className={offering.enrollmentOpen ? 'font-medium text-success' : 'text-ink-muted'}>{t(`offering.state.${offeringState(offering)}`)}</span>
    </p>
  )
}

const FILTER_LABELS: Record<string, string> = {
  q: 'filters.search',
  category: 'filters.category',
  level: 'filters.level',
  modality: 'filters.modality',
  startsFrom: 'filters.startsFrom',
  sort: 'filters.sort',
  page: 'filters.page',
  size: 'filters.size'
}

function CatalogProblem({ error, onRetry, onClear }: { error: unknown; onRetry: () => void; onClear: () => void }) {
  const { t } = useTranslation('catalog')
  const { kind, title, description } = useProblemText(error, 'catalog')
  // un 400 nombra los parámetros rechazados: se muestran con el nombre del filtro, no el del parámetro
  const details =
    kind === 'invalid' && error instanceof ApiError
      ? error.violations.map((violation) => {
          const label = FILTER_LABELS[violation.field]
          return t('problem.violation', { field: label ? t(label) : violation.field, message: violation.message })
        })
      : []
  return (
    <ProblemState title={title} description={description} details={details}>
      {kind === 'invalid' ? (
        <Button variant="secondary" size="sm" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
      )}
    </ProblemState>
  )
}
