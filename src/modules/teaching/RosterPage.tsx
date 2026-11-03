import { EmptyState } from '@wasichai/core'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, Td, Th } from '@wasichai/ui'
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { Section, Skeleton, Stat, StatList } from '../../shared/Screen'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import { useRoster } from './api'
import type { RosterAssessment, RosterEntry } from './contract'
import { OfferingSection } from './OfferingSection'
import { EmailText, useProblemText } from './parts'
import {
  filterCounts,
  filterRoster,
  lowestProgress,
  rosterSummary,
  sortRoster,
  type RosterFilter,
  type RosterSort,
  type SortDirection,
  type SortKey
} from './roster'

const STATUS_STATE: Record<RosterEntry['status'], StatusState> = { ACTIVA: 'active', FINALIZADA: 'done', RETIRADA: 'neutral' }
const SORT_OPTIONS: `${SortKey}-${SortDirection}`[] = ['email-asc', 'email-desc', 'progress-asc', 'progress-desc', 'attendance-asc', 'attendance-desc']

// los matriculados de una edición asignada: su resumen, quién va más atrás y la lista con su progreso, su asistencia y sus evaluaciones
export function RosterPage() {
  const { code = '' } = useParams()
  return (
    <OfferingSection code={code} section="roster">
      {/* al cambiar de edición, la búsqueda y los filtros de la anterior no se heredan */}
      <Roster key={code} code={code} />
    </OfferingSection>
  )
}

function Roster({ code }: { code: string }) {
  const { t } = useTranslation('teaching')
  const query = useRoster(code)
  const { kind, title, description } = useProblemText(query.error, 'roster')
  // un 404 es una respuesta: la edición no existe o no está asignada a esta persona (el servidor no distingue)
  if (query.isError && kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{t('roster.notFound')}</p>
        <p className="text-sm text-ink-muted">{t('roster.notFoundHint')}</p>
      </div>
    )
  if (query.isError)
    return (
      <ProblemState title={title} description={description}>
        <Button variant="secondary" className="min-h-11" onClick={() => void query.refetch()}>
          {t('problem.retry')}
        </Button>
      </ProblemState>
    )
  if (!query.data) return <RosterSkeleton />
  if (query.data.length === 0) return <EmptyState title={t('roster.empty')} />
  return (
    <>
      <Summary entries={query.data} />
      <Lowest entries={query.data} />
      <Students entries={query.data} />
    </>
  )
}

function RosterSkeleton() {
  const { t } = useTranslation('teaching')
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">{t('roster.loading')}</span>
      <div className="flex gap-10">
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
      </div>
      <Skeleton className="h-11 w-full max-w-sm" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

// cifras exactas del roster. sin lecciones, sesiones o evaluaciones, su cifra no sale: un cero diría lo que no se sabe
function Summary({ entries }: { entries: RosterEntry[] }) {
  const { t, i18n } = useTranslation('teaching')
  const format = (value: number) => formatNumber(value, i18n.language)
  const { students, meanPercent, attendance, assessments } = useMemo(() => rosterSummary(entries), [entries])
  return (
    <Section title={<span className="sr-only">{t('roster.summary.title')}</span>}>
      <StatList>
        <Stat label={t('roster.summary.students')} value={format(students)} />
        {meanPercent !== undefined ? (
          <Stat
            label={t('roster.summary.mean')}
            value={t('roster.summary.percent', { value: format(meanPercent) })}
            hint={<span className="block max-w-48">{t('roster.summary.meanHint')}</span>}
          />
        ) : null}
        {attendance.total > 0 ? (
          <Stat
            label={t('roster.summary.attendance')}
            value={t('roster.summary.attendanceValue', { attended: format(attendance.attended), total: format(attendance.total) })}
            hint={<span className="block max-w-48">{t('roster.summary.attendanceHint')}</span>}
          />
        ) : null}
        {assessments.total > 0 ? (
          <Stat label={t('roster.summary.pending')} value={format(assessments.pending)} tone={assessments.pending > 0 ? 'review' : undefined} />
        ) : null}
      </StatList>
    </Section>
  )
}

// la barra acompaña a la cifra, que es la que se lee: por eso no se anuncia dos veces
function ProgressCell({ student }: { student: RosterEntry }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const { percent, completedLessons, totalLessons } = student.progress
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm text-ink tabular-nums">
        {t('roster.progressValue', {
          percent: formatNumber(percent, locale),
          completed: formatNumber(completedLessons, locale),
          total: formatNumber(totalLessons, locale)
        })}
      </span>
    </div>
  )
}

// a quién escribir: el correo va como un único destinatario, sin que su texto pueda añadir parámetros al enlace
function mailtoOf(email: string): string {
  return `mailto:${encodeURIComponent(email).replace('%40', '@')}`
}

function Lowest({ entries }: { entries: RosterEntry[] }) {
  const { t } = useTranslation('teaching')
  const lowest = useMemo(() => lowestProgress(entries), [entries])
  if (lowest.length === 0) return null
  return (
    <Section title={t('roster.lowest.title')} description={t('roster.lowest.description')}>
      <div className="@container">
        <ul className="grid grid-cols-1 divide-y divide-border border-y border-border @2xl:grid-cols-3 @2xl:divide-x @2xl:divide-y-0">
          {lowest.map((student) => (
            <li key={student.enrollmentId} className="flex min-w-0 flex-col gap-1.5 py-3 @2xl:px-5 @2xl:first:pl-0 @2xl:last:pr-0">
              <span className="text-sm font-medium text-ink">{student.email ? <EmailText email={student.email} /> : t('roster.noEmail')}</span>
              <ProgressCell student={student} />
              {student.email ? (
                <a href={mailtoOf(student.email)} aria-label={t('roster.lowest.writeLabel', { email: student.email })} className={`${TEXT_LINK} self-start`}>
                  {t('roster.lowest.write')}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function Students({ entries }: { entries: RosterEntry[] }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RosterFilter>('ALL')
  const [sort, setSort] = useState<RosterSort>({ key: 'email', direction: 'asc' })
  const shown = useMemo(() => sortRoster(filterRoster(entries, { search, filter }), sort), [entries, search, filter, sort])
  const heading = t('roster.heading', { count: entries.length, value: formatNumber(entries.length, locale) })
  const filtered = search.trim() !== '' || filter !== 'ALL'
  const toggle = (key: SortKey) =>
    setSort((current) => (current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))
  return (
    <Section title={heading}>
      <Toolbar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} entries={entries} sort={sort} onSort={setSort} />
      <p role="status" className="text-sm text-ink-muted empty:hidden">
        {filtered && shown.length > 0
          ? t('roster.shown', { count: entries.length, shown: formatNumber(shown.length, locale), value: formatNumber(entries.length, locale) })
          : ''}
      </p>
      {shown.length === 0 ? (
        <EmptyState title={t('roster.noResults')}>
          <Button
            variant="secondary"
            className="mt-2 min-h-11"
            onClick={() => {
              setSearch('')
              setFilter('ALL')
            }}
          >
            {t('roster.clearFilters')}
          </Button>
        </EmptyState>
      ) : (
        // tabla o tarjetas según el ancho que deja el menú, no el de la ventana: a 768 px el menú ya se lleva buena parte
        <div className="@container">
          <div className="hidden overflow-x-auto @2xl:block">
            <Table aria-label={heading}>
              <thead>
                <tr>
                  <SortableHead column="email" sort={sort} onToggle={toggle} label={t('roster.student')} />
                  <Th scope="col">{t('roster.status')}</Th>
                  <SortableHead column="progress" sort={sort} onToggle={toggle} label={t('roster.progress')} />
                  <SortableHead column="attendance" sort={sort} onToggle={toggle} label={t('roster.attendance')} />
                  <Th scope="col">{t('roster.assessments')}</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((student) => (
                  <tr key={student.enrollmentId}>
                    <Th scope="row" className="bg-transparent pl-0 text-sm font-normal tracking-normal text-ink normal-case">
                      {student.email ? <EmailText email={student.email} /> : t('roster.noEmail')}
                    </Th>
                    <Td>
                      <EnrollmentBadge student={student} />
                    </Td>
                    <Td className="w-52 min-w-36">
                      <ProgressCell student={student} />
                    </Td>
                    <Td>
                      <AttendanceText student={student} />
                    </Td>
                    <Td>
                      <Assessments student={student} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <ul aria-label={heading} className="flex flex-col gap-3 @2xl:hidden">
            {shown.map((student) => (
              <StudentCard key={student.enrollmentId} student={student} />
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

function SortableHead({ column, sort, onToggle, label }: { column: SortKey; sort: RosterSort; onToggle: (key: SortKey) => void; label: string }) {
  const active = sort.key === column
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`py-0 ${column === 'email' ? 'pl-0' : ''}`}
    >
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm hover:text-ink ${active ? 'text-ink' : ''}`}
      >
        {label}
        <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${active ? '' : 'opacity-60'}`} />
      </button>
    </Th>
  )
}

function Toolbar({
  search,
  onSearch,
  filter,
  onFilter,
  entries,
  sort,
  onSort
}: {
  search: string
  onSearch: (value: string) => void
  filter: RosterFilter
  onFilter: (value: RosterFilter) => void
  entries: RosterEntry[]
  sort: RosterSort
  onSort: (value: RosterSort) => void
}) {
  const { t, i18n } = useTranslation('teaching')
  const id = useId()
  const counts = useMemo(() => filterCounts(entries), [entries])
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:gap-6">
        <div className="flex w-full flex-col gap-1 @3xl:max-w-xs">
          <Label htmlFor={`${id}-search`}>{t('roster.search')}</Label>
          <Input id={`${id}-search`} type="search" value={search} onChange={(event) => onSearch(event.target.value)} className="min-h-11" />
        </div>
        {counts.length > 0 ? (
          <div role="group" aria-label={t('roster.filters')} className="flex flex-wrap gap-2">
            {counts.map(({ filter: option, count }) => (
              <FilterChip key={option} pressed={filter === option} onClick={() => onFilter(option)}>
                {t('roster.filterOption', { label: t(`roster.filter.${option}`), value: formatNumber(count, i18n.language) })}
              </FilterChip>
            ))}
          </div>
        ) : null}
        {/* en tarjetas no hay encabezados que pulsar */}
        <div className="flex w-full flex-col gap-1 @2xl:hidden">
          <Label id={`${id}-sort`}>{t('roster.sortBy')}</Label>
          <Select
            value={`${sort.key}-${sort.direction}`}
            onValueChange={(value) => {
              const [key, direction] = value.split('-') as [SortKey, SortDirection]
              onSort({ key, direction })
            }}
          >
            <SelectTrigger aria-labelledby={`${id}-sort`} className="min-h-11 w-full text-left">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`roster.sort.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// pulsado con su marca, no solo con su color
function FilterChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-[160ms] motion-reduce:transition-none ${
        pressed ? 'border-brand bg-brand-soft font-medium text-brand-strong' : 'border-border-control bg-surface text-ink hover:bg-surface-muted'
      }`}
    >
      {pressed ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
      {children}
    </button>
  )
}

function EnrollmentBadge({ student }: { student: RosterEntry }) {
  const { t } = useTranslation('teaching')
  return <StatusBadge state={STATUS_STATE[student.status]}>{t(`roster.enrollmentStatus.${student.status}`)}</StatusBadge>
}

function AttendanceText({ student: { attendance } }: { student: RosterEntry }) {
  const { t, i18n } = useTranslation('teaching')
  const locale = i18n.language
  if (attendance.total === 0) return <span className="text-sm text-ink-muted">{t('roster.noSessions')}</span>
  return (
    <span className="text-sm text-ink tabular-nums">
      {t('roster.attendanceValue', { attended: formatNumber(attendance.attended, locale), total: formatNumber(attendance.total, locale) })}
    </span>
  )
}

function Assessments({ student }: { student: RosterEntry }) {
  const { t } = useTranslation('teaching')
  if (student.assessments.length === 0) return <span className="text-sm text-ink-muted">{t('roster.noAssessments')}</span>
  return (
    <ul className="flex flex-col gap-1.5">
      {student.assessments.map((assessment) => (
        <li key={assessment.lessonId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="min-w-0 break-words text-ink">{assessment.title}</span>
          <AssessmentState assessment={assessment} />
        </li>
      ))}
    </ul>
  )
}

function AssessmentState({ assessment }: { assessment: RosterAssessment }) {
  const { t, i18n } = useTranslation('teaching')
  if (assessment.pending) return <StatusBadge state="review">{t('roster.assessmentPending')}</StatusBadge>
  if (assessment.bestPercent === null) return <StatusBadge state="todo">{t('roster.assessmentNone')}</StatusBadge>
  const percent = formatNumber(assessment.bestPercent, i18n.language)
  // no aprobada, en neutro: quizá le queden intentos, y la cifra ya lo dice
  return assessment.passed ? (
    <StatusBadge state="done">{t('roster.assessmentPassed', { percent })}</StatusBadge>
  ) : (
    <StatusBadge state="neutral">{t('roster.assessmentFailed', { percent })}</StatusBadge>
  )
}

function StudentCard({ student }: { student: RosterEntry }) {
  const { t } = useTranslation('teaching')
  const name = student.email ?? t('roster.noEmail')
  return (
    <li aria-label={name} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-sm font-medium text-ink">{student.email ? <EmailText email={student.email} /> : name}</span>
        <EnrollmentBadge student={student} />
      </div>
      <ProgressCell student={student} />
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted">{t('roster.attendance')}</dt>
          <dd>
            <AttendanceText student={student} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted">{t('roster.assessments')}</dt>
          <dd>
            <Assessments student={student} />
          </dd>
        </div>
      </dl>
    </li>
  )
}
