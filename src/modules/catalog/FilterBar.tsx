import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@wasichai/ui'
import type { TFunction } from 'i18next'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCivilDate } from '../../shared/format'
import { screenContainer } from '../../shared/Screen'
import { DEFAULT_SORT, type CatalogFilters } from './api'
import { LEVELS, MODALITIES, NO_KNOWLEDGE, SORTS, type CoursePage } from './contract'
import { allIllustrative, IllustrativeMark, useMatchesWidth } from './parts'

// Radix Select no admite el valor vacío: «todas» viaja como este centinela y en la URL es la ausencia del filtro
const ALL = 'all'
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
const WIDE = '(min-width: 48rem)'

// duraciones del modelo (RF-ACA-05): de 1 a 8 semanas o semestral (12 a 26). en la URL son minWeeks y maxWeeks
const DURATIONS = [
  { key: 'upTo2', minWeeks: '', maxWeeks: '2' },
  { key: 'from3to8', minWeeks: '3', maxWeeks: '8' },
  { key: 'semester', minWeeks: '12', maxWeeks: '' }
] as const
export const DURATION_KEYS = DURATIONS.map((duration) => duration.key)
// un rango de la URL que no es ninguno de los anteriores (editado a mano) se ve tal cual, como la categoría
const CUSTOM_DURATION = 'custom'
const ENROLLMENT_OPTIONS = ['true', 'false'] as const
const HOUR_FILTERS = ['minTheoryHours', 'minPracticeHours', 'minAutonomousHours'] as const

type Patch = Partial<CatalogFilters>

const durationPreset = (filters: CatalogFilters) =>
  DURATIONS.find((duration) => duration.minWeeks === filters.minWeeks && duration.maxWeeks === filters.maxWeeks)

function durationText(filters: CatalogFilters, t: TFunction): string {
  const preset = durationPreset(filters)
  return preset ? t(`duration.${preset.key}`) : t('duration.range', { min: filters.minWeeks || 1, max: filters.maxWeeks || 26 })
}

export interface ActiveFilter {
  key: string
  label: string
  patch: Patch
  // lo que se ve siempre, aunque «Más filtros» esté plegado; el contador solo cuenta lo que hay dentro
  inPanel: boolean
}

// los filtros en vigor, con su nombre y su valor legibles. un valor de la URL que no se reconoce se ve tal cual: lo juzga el servidor
export function activeFilters(filters: CatalogFilters, page: CoursePage | undefined, t: TFunction, language: string): ActiveFilter[] {
  const named = (label: string, value: string) => t('filters.activeValue', { label: t(label), value, interpolation: { escapeValue: false } })
  const active: ActiveFilter[] = []
  const add = (key: string, label: string, patch: Patch, inPanel = true) => active.push({ key, label, patch, inPanel })

  if (filters.q) add('q', named('filters.query', filters.q), { q: '' }, false)
  if (filters.category) {
    const name = page?.facets.categories.find((category) => category.slug === filters.category)?.name ?? filters.category
    add('category', named('filters.category', name), { category: '' }, false)
  }
  if (filters.level) add('level', named('filters.level', t(`level.${filters.level}`, { defaultValue: filters.level })), { level: '' })
  if (filters.modality) add('modality', named('filters.modality', t(`modality.${filters.modality}`, { defaultValue: filters.modality })), { modality: '' })
  if (filters.startsFrom) {
    // a mano en la URL puede no ser una fecha. el mediodía civil en UTC, formateado en UTC, es el mismo día en cualquier navegador
    const date = /^\d{4}-\d{2}-\d{2}$/.test(filters.startsFrom) ? formatCivilDate(filters.startsFrom, 'UTC', language) : filters.startsFrom
    add('startsFrom', named('filters.startsFrom', date), { startsFrom: '' })
  }
  if (filters.minWeeks || filters.maxWeeks) add('duration', named('filters.duration', durationText(filters, t)), { minWeeks: '', maxWeeks: '' })
  if (filters.enrollmentOpen) {
    const known = filters.enrollmentOpen === 'true' || filters.enrollmentOpen === 'false'
    add('enrollmentOpen', known ? t(`enrollmentFilter.${filters.enrollmentOpen}`) : named('filters.enrollmentOpen', filters.enrollmentOpen), {
      enrollmentOpen: ''
    })
  }
  if (filters.prerequisiteKnowledge) {
    const name = page?.facets.prerequisiteKnowledge.find((option) => option.key === filters.prerequisiteKnowledge)?.name ?? filters.prerequisiteKnowledge
    add('prerequisiteKnowledge', filters.prerequisiteKnowledge === NO_KNOWLEDGE ? t('knowledgeFilter.none') : named('filters.prerequisiteKnowledge', name), {
      prerequisiteKnowledge: ''
    })
  }
  for (const name of HOUR_FILTERS) if (filters[name]) add(name, named(`filters.${name}`, filters[name]), hoursPatch(name, ''))
  if (filters.sort !== DEFAULT_SORT) add('sort', named('filters.sort', t(`sort.${filters.sort}`, { defaultValue: filters.sort })), { sort: DEFAULT_SORT })
  return active
}

function hoursPatch(name: (typeof HOUR_FILTERS)[number], value: string): Patch {
  const patch: Patch = {}
  patch[name] = value
  return patch
}

interface CatalogBandProps {
  filters: CatalogFilters
  page: CoursePage | undefined
  // la respuesta del último filtro todavía no ha llegado
  busy: boolean
  onChange: (patch: Patch) => void
  // quitar un filtro hace desaparecer el botón pulsado: quien lo usa decide a dónde pasa el foco
  onRemove: (patch: Patch) => void
  onClear: () => void
}

// la banda de título: lo que se usa siempre (buscador y categorías) a la vista, y el resto plegado con su contador
export function CatalogBand({ filters, page, busy, onChange, onRemove, onClear }: CatalogBandProps) {
  const { t, i18n } = useTranslation('catalog')
  const active = activeFilters(filters, page, t, i18n.language)
  // «Contenido ilustrativo» se dice una vez, aquí, si lo son todos los de la página; si no, lo lleva cada fila
  return (
    <div className="border-b border-border bg-surface">
      <div className={`${screenContainer()} flex flex-col gap-6 pt-8 pb-6`}>
        <div className="flex flex-col gap-3">
          <div className="rule-strong flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
            <p className="meta text-ink">{t('catalog.eyebrow')}</p>
            {allIllustrative(page) ? <IllustrativeMark /> : null}
          </div>
          <h1 className="text-h2 font-read text-balance text-ink sm:text-h1">{t('catalog.title')}</h1>
          <p className="text-body font-read max-w-measure text-ink-muted sm:text-reading">{t('catalog.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <SearchForm value={filters.q} onSubmit={(q) => onChange({ q })} />
          <div className="relative flex flex-col gap-3">
            <CategoryChips selected={filters.category} page={page} onChange={(category) => onChange({ category })} />
            <MoreFilters filters={filters} page={page} busy={busy} count={active.filter((filter) => filter.inPanel).length} onChange={onChange} />
          </div>
        </div>
        {active.length > 0 ? <ActiveFilters active={active} onRemove={onRemove} onClear={onClear} /> : null}
      </div>
    </div>
  )
}

function SearchForm({ value, onSubmit }: { value: string; onSubmit: (q: string) => void }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  // el texto se edita libre y se aplica al buscar; si la URL cambia (atrás, limpiar), el campo la sigue
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(text.trim())
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

interface ChipProps {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}

// botones que se pulsan, no píldoras: el radio de los botones, y el estado con su marca además del color
function Chip({ pressed, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3.5 text-left text-sm ${FOCUS} ${
        pressed ? 'border-brand bg-brand font-semibold text-on-brand' : 'border-border-control bg-surface text-ink hover:bg-surface-muted'
      }`}
    >
      {pressed ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
      <span>{children}</span>
    </button>
  )
}

function CategoryChips({ selected, page, onChange }: { selected: string; page: CoursePage | undefined; onChange: (category: string) => void }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  const categories: { slug: string; name: string; count?: number }[] = page?.facets.categories ?? []
  // una categoría de la URL que no viene en los facets sigue visible (si no, no se vería qué filtra)
  const options = selected && !categories.some((category) => category.slug === selected) ? [...categories, { slug: selected, name: selected }] : categories
  return (
    // el hueco de la derecha es para «Más filtros», en la misma línea desde tableta
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2 md:pr-44">
      <span id={id} className="mr-1 text-sm font-medium text-ink-muted">
        {t('filters.category')}
      </span>
      <Chip pressed={selected === ''} onClick={() => onChange('')}>
        {t('filters.categoryAll')}
      </Chip>
      {options.map((category) => (
        <Chip key={category.slug} pressed={selected === category.slug} onClick={() => onChange(selected === category.slug ? '' : category.slug)}>
          {category.name}
          {category.count === undefined ? null : (
            <>
              {' '}
              <span className="tabular-nums">{t('filters.categoryCount', { count: category.count })}</span>
            </>
          )}
        </Chip>
      ))}
    </div>
  )
}

interface MoreFiltersProps {
  filters: CatalogFilters
  page: CoursePage | undefined
  busy: boolean
  count: number
  onChange: (patch: Patch) => void
}

// el mismo formulario en un desplegable o en una hoja inferior: se monta uno u otro, nunca los dos
function MoreFilters({ filters, page, busy, count, onChange }: MoreFiltersProps) {
  const { t } = useTranslation('catalog')
  const wide = useMatchesWidth(WIDE)
  const [sheetOpen, setSheetOpen] = useState(false)
  const label = (
    <>
      <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" />
      <span>{t('filters.more')}</span>{' '}
      {count > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="inline-flex min-w-5 justify-center rounded-full bg-brand-soft px-1.5 text-xs/5 font-semibold text-brand-strong tabular-nums"
          >
            {count}
          </span>
          <span className="sr-only">{t('filters.moreActive', { count })}</span>
        </>
      ) : null}
    </>
  )
  const fields = <FilterFields filters={filters} page={page} onChange={onChange} />

  if (wide)
    return (
      <details className="group">
        <summary
          className={`absolute top-0 right-0 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border-control bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-muted [&::-webkit-details-marker]:hidden ${FOCUS}`}
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-[160ms] group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="border-t border-border pt-4">{fields}</div>
      </details>
    )

  return (
    <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full gap-2">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none pb-0"
      >
        <DialogTitle className="pr-10 text-h4 text-ink">{t('filters.more')}</DialogTitle>
        <div className="mt-4">{fields}</div>
        <div className="sticky bottom-0 -mx-6 mt-6 border-t border-border bg-surface-raised px-6 py-3">
          <Button className="w-full" onClick={() => setSheetOpen(false)}>
            {busy || !page ? t('filters.showResultsPending') : t('filters.showResults', { count: page.totalElements })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// los filtros de segunda línea (RF-CAT-08 incluido) y el orden
function FilterFields({ filters, page, onChange }: { filters: CatalogFilters; page: CoursePage | undefined; onChange: (patch: Patch) => void }) {
  const { t } = useTranslation('catalog')
  const id = useId()
  const knowledge: { key: string; name: string; count?: number }[] = page?.facets.prerequisiteKnowledge ?? []
  // una clave de la URL que no viene en los facets (sin cursos, o escrita a mano) se ve tal cual, como la categoría
  const knowledgeOptions =
    filters.prerequisiteKnowledge && filters.prerequisiteKnowledge !== NO_KNOWLEDGE && !knowledge.some((option) => option.key === filters.prerequisiteKnowledge)
      ? [...knowledge, { key: filters.prerequisiteKnowledge, name: filters.prerequisiteKnowledge }]
      : knowledge
  const hasDuration = filters.minWeeks !== '' || filters.maxWeeks !== ''
  const preset = durationPreset(filters)
  const durationValue = preset ? preset.key : hasDuration ? CUSTOM_DURATION : ''

  const chooseDuration = (key: string) => {
    if (key === CUSTOM_DURATION) return
    const next = DURATIONS.find((duration) => duration.key === key)
    onChange({ minWeeks: next?.minWeeks ?? '', maxWeeks: next?.maxWeeks ?? '' })
  }

  return (
    <fieldset className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      <legend className="sr-only">{t('filters.legend')}</legend>
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
      <FilterSelect id={`${id}-duration`} label={t('filters.duration')} value={durationValue} onChange={chooseDuration}>
        {DURATIONS.map((duration) => (
          <SelectItem key={duration.key} value={duration.key}>
            {t(`duration.${duration.key}`)}
          </SelectItem>
        ))}
        {durationValue === CUSTOM_DURATION ? <SelectItem value={CUSTOM_DURATION}>{durationText(filters, t)}</SelectItem> : null}
      </FilterSelect>
      <div className="flex min-w-0 flex-col justify-end gap-1.5">
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
      <FilterSelect
        id={`${id}-enrollment`}
        label={t('filters.enrollmentOpen')}
        value={filters.enrollmentOpen}
        onChange={(enrollmentOpen) => onChange({ enrollmentOpen })}
      >
        {ENROLLMENT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`enrollmentFilter.${option}`)}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect
        id={`${id}-knowledge`}
        label={t('filters.prerequisiteKnowledge')}
        value={filters.prerequisiteKnowledge}
        onChange={(prerequisiteKnowledge) => onChange({ prerequisiteKnowledge })}
      >
        <SelectItem value={NO_KNOWLEDGE}>{t('knowledgeFilter.none')}</SelectItem>
        {knowledgeOptions.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.count === undefined ? option.name : t('filters.categoryOption', { name: option.name, count: option.count })}
          </SelectItem>
        ))}
      </FilterSelect>
      {HOUR_FILTERS.map((name) => (
        <HoursInput
          key={name}
          id={`${id}-${name}`}
          label={t(`filters.${name}`)}
          value={filters[name]}
          onChange={(value) => onChange(hoursPatch(name, value))}
        />
      ))}
      <div className="flex min-w-0 flex-col justify-end gap-1.5">
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
  )
}

interface HoursInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

// el número se edita libre y se aplica al salir del campo o con Intro: a medio escribir («6.») no es un valor y no
// conviene una petición por tecla. solo un valor válido (o el borrado) cambia la búsqueda; si la URL cambia, el campo la sigue
function HoursInput({ id, label, value, onChange }: HoursInputProps) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = (input: HTMLInputElement) => {
    if (input.validity.valid && input.value !== value) onChange(input.value)
  }
  return (
    <div className="flex min-w-0 flex-col justify-end gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={10000}
        step="any"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget)
        }}
      />
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
    <div className="flex min-w-0 flex-col justify-end gap-1.5">
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

function ActiveFilters({ active, onRemove, onClear }: { active: ActiveFilter[]; onRemove: (patch: Patch) => void; onClear: () => void }) {
  const { t } = useTranslation('catalog')
  return (
    <div role="group" aria-label={t('filters.active')} className="flex flex-wrap items-center gap-2">
      {active.map((filter) => (
        <button
          key={filter.key}
          type="button"
          aria-label={t('filters.removeOne', { filter: filter.label, interpolation: { escapeValue: false } })}
          onClick={() => onRemove(filter.patch)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-md bg-surface-muted px-3 text-left text-sm text-ink hover:bg-border ${FOCUS}`}
        >
          <span className="min-w-0 break-words">{filter.label}</span>
          <X aria-hidden="true" className="size-4 shrink-0" />
        </button>
      ))}
      <Button variant="ghost" onClick={onClear}>
        {t('filters.clear')}
      </Button>
    </div>
  )
}
