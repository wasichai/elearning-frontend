import { ApiError, EmptyState } from '@wasichai/core'
import { Button, Pagination } from '@wasichai/ui'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LibraryBig, SearchX } from 'lucide-react'
import { PublicLayout } from '../../shared/PublicLayout'
import { ScreenBody } from '../../shared/Screen'
import { SectionHead } from '../../shared/SectionHead'
import { catalogKeys, hasActiveFilters, useCatalogFilters, useCourses, useQueryProblem, type CatalogFilters } from './api'
import type { CoursePage } from './contract'
import { CourseRow, CourseRowSkeleton } from './CourseRow'
import { allIllustrative, groupByCollection } from './parts'
import { CatalogBand } from './FilterBar'
import { ProblemState, useProblemText } from './ProblemState'

const ROWS = 'flex flex-col divide-y divide-border border-y border-border'
const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index)

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
        <section aria-labelledby="catalog-results" className="flex flex-col gap-2">
          <div className="rule-strong flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
            <h2 id="catalog-results" ref={resultsHeading} tabIndex={-1} className="text-h3 font-read text-ink">
              {t('catalog.results')}
            </h2>
            <p role="status" className="text-secondary text-ink-muted tabular-nums">
              {problem ? null : query.data ? t('catalog.count', { count: query.data.totalElements }) : t('catalog.loading')}
            </p>
          </div>
          {problem ? (
            <CatalogProblem error={problem} onRetry={retry} onClear={clearFilters} />
          ) : query.data ? (
            <Results page={query.data} filters={filters} busy={query.isPlaceholderData} onPage={goToPage} onClear={clearFilters} />
          ) : (
            <div className={ROWS}>
              {SKELETON_ROWS.map((row) => (
                <CourseRowSkeleton key={row} />
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
        <EmptyState title={t('empty.pastLastPage')} icon={SearchX}>
          <Button variant="secondary" onClick={() => onPage(1)}>
            {t('empty.firstPage')}
          </Button>
        </EmptyState>
      )
    return hasActiveFilters(filters) ? (
      <EmptyState title={t('empty.filtered')} icon={SearchX}>
        <p>{t('empty.filteredHint')}</p>
        <Button variant="secondary" onClick={onClear}>
          {t('filters.clear')}
        </Button>
      </EmptyState>
    ) : (
      <EmptyState title={t('empty.none')} icon={LibraryBig} />
    )
  }

  // con una categoría elegida todas las filas son de ella: no se agrupa
  const grouped = filters.category === ''
  return (
    <div aria-busy={busy} className={`flex flex-col gap-6 transition-opacity ${busy ? 'opacity-60' : ''}`}>
      {/* con una categoría elegida todas las filas son de ella: el encabezado sobra. si no, las filas consecutivas de una misma colección van
          bajo su encabezado; el orden del servidor no se toca, así que una colección que reaparece más abajo repite el suyo */}
      <ul className={ROWS}>
        {groupByCollection(page.content, grouped).flatMap((group, index) => [
          group.category ? (
            // el encabezado es presentación dentro de la lista: no cuenta como un elemento más ni parte las filas en varias listas
            <li key={`${group.category.slug}-${index}`} role="presentation" className="pb-1 pt-6 first:pt-0">
              <SectionHead as="h3" title={group.category.name} meta={t('catalog.groupCount', { count: group.courses.length })} />
            </li>
          ) : null,
          ...group.courses.map((course) => (
            <CourseRow key={course.slug} course={course} grouped={grouped} showIllustrative={course.illustrative && !allIllustrative(page)} />
          ))
        ])}
      </ul>
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
  const { kind, title, description, technical } = useProblemText(error, 'catalog')
  // un 400 nombra los parámetros rechazados: se muestran con el nombre del filtro, no el del parámetro
  const details =
    kind === 'invalid' && error instanceof ApiError
      ? error.violations.map((violation) => {
          const label = FILTER_LABELS[violation.field]
          return t('problem.violation', { field: label ? t(label) : violation.field, message: violation.message })
        })
      : []
  return (
    <ProblemState title={title} description={description} details={details} technical={technical}>
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
