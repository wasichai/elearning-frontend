import { ApiError, EmptyState } from '@wasichai/core'
import { Button, Pagination } from '@wasichai/ui'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '../../shared/PublicLayout'
import { ScreenBody } from '../../shared/Screen'
import { catalogKeys, hasActiveFilters, useCatalogFilters, useCourses, useQueryProblem, type CatalogFilters } from './api'
import type { CoursePage } from './contract'
import { CourseCard, CourseCardSkeleton } from './CourseCard'
import { CatalogBand } from './FilterBar'
import { ProblemState, useProblemText } from './ProblemState'

const GRID = 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'
const SKELETON_CARDS = Array.from({ length: 6 }, (_, index) => index)

export function CatalogPage() {
  const { t } = useTranslation('catalog')
  const [filters, update, clear] = useCatalogFilters()
  const query = useCourses(filters)
  const { problem, retry } = useQueryProblem(query, catalogKeys.courses(filters))
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  // el foco salta al principio de los resultados (y los lleva a la vista): al cambiar de página, y cuando desaparece el botón pulsado
  const focusResults = () => resultsHeading.current?.focus()

  const goToPage = (page: number) => {
    update({ page })
    focusResults()
  }
  const removeFilter = (patch: Partial<CatalogFilters>) => {
    update(patch)
    focusResults()
  }
  const clearFilters = () => {
    clear()
    focusResults()
  }

  return (
    <PublicLayout fullBleed>
      <CatalogBand filters={filters} page={query.data} busy={query.isPlaceholderData} onChange={update} onRemove={removeFilter} onClear={clearFilters} />
      <ScreenBody>
        <section aria-labelledby="catalog-results" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="catalog-results" ref={resultsHeading} tabIndex={-1} className="text-title-3 text-ink">
              {t('catalog.results')}
            </h2>
            <p role="status" className="text-sm text-ink-muted tabular-nums">
              {problem ? null : query.data ? t('catalog.count', { count: query.data.totalElements }) : t('catalog.loading')}
            </p>
          </div>
          {problem ? (
            <CatalogProblem error={problem} onRetry={retry} onClear={clearFilters} />
          ) : query.data ? (
            <Results page={query.data} filters={filters} busy={query.isPlaceholderData} onPage={goToPage} onClear={clearFilters} />
          ) : (
            <div className={GRID}>
              {SKELETON_CARDS.map((card) => (
                <CourseCardSkeleton key={card} />
              ))}
            </div>
          )}
        </section>
      </ScreenBody>
    </PublicLayout>
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
          <Button variant="secondary" onClick={() => onPage(1)}>
            {t('empty.firstPage')}
          </Button>
        </EmptyState>
      )
    return hasActiveFilters(filters) ? (
      <EmptyState title={t('empty.filtered')}>
        <p>{t('empty.filteredHint')}</p>
        <Button variant="secondary" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      </EmptyState>
    ) : (
      <EmptyState title={t('empty.none')} />
    )
  }

  return (
    <div aria-busy={busy} className={`flex flex-col gap-6 transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <ol className={GRID}>
        {page.content.map((course) => (
          <li key={course.slug} className="min-w-0">
            <CourseCard course={course} />
          </li>
        ))}
      </ol>
      {page.totalPages > 1 ? (
        <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPage={(index) => onPage(index + 1)} />
      ) : null}
    </div>
  )
}

const FILTER_LABELS: Record<string, string> = {
  q: 'filters.search',
  category: 'filters.category',
  level: 'filters.level',
  modality: 'filters.modality',
  startsFrom: 'filters.startsFrom',
  minWeeks: 'filters.duration',
  maxWeeks: 'filters.duration',
  enrollmentOpen: 'filters.enrollmentOpen',
  minTheoryHours: 'filters.minTheoryHours',
  minPracticeHours: 'filters.minPracticeHours',
  minAutonomousHours: 'filters.minAutonomousHours',
  prerequisiteKnowledge: 'filters.prerequisiteKnowledge',
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
        <Button variant="secondary" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      ) : (
        <Button variant="secondary" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
      )}
    </ProblemState>
  )
}
