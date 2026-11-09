import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@wasichai/ui'
import { ChevronRight, Equal, Minus, PenLine, Plus, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { DiffChange, LessonDiff, UnitDiff, VersionDiff } from './diff'
import { isKnownField } from './diffMessages'
import { formatNumber } from './format'
import { ProblemState } from './ProblemState'
import { Section, Skeleton, Stat, StatList } from './Screen'

// qué cambió una versión respecto de la anterior del mismo curso, para leerlo de un vistazo: cuánto en cifras, cómo se marca cada
// tipo de cambio y, unidad por unidad, qué cambió en palabras de persona; lo que sigue igual, plegado. la usan el estudio y la
// bandeja, cada uno con sus textos bajo diff (diffMessages). el contrato solo trae el valor anterior del título: es lo único que
// se muestra antes y ahora; de los demás campos se dice que cambiaron, no cómo

interface VersionDiffSectionProps {
  // el espacio de nombres i18n del módulo que la pinta
  namespace: string
  query: UseQueryResult<VersionDiff, unknown>
}

// cada tipo de cambio se distingue por su icono, su palabra y su forma (borde sólido, tachado, borde discontinuo): el color nunca va solo
const MARK: Record<DiffChange, { icon: LucideIcon; box: string }> = {
  ADDED: { icon: Plus, box: 'border-solid border-success bg-success-soft text-success' },
  CHANGED: { icon: PenLine, box: 'border-dashed border-warning bg-warning-soft text-warning' },
  REMOVED: { icon: Minus, box: 'border-solid border-danger bg-danger-soft text-danger' },
  SAME: { icon: Equal, box: 'border-solid border-border bg-surface text-ink-muted' }
}

// lo que se cuenta y se explica, en el orden en que se lee
const VISIBLE_CHANGES = ['ADDED', 'CHANGED', 'REMOVED'] as const

const byOrder = <T extends { order: number }>(items: T[]): T[] => [...items].sort((a, b) => a.order - b.order)
// lo quitado ya no tiene título: se nombra por el que tenía
const nameOf = (item: { title: string | null; previousTitle: string | null }) => item.title ?? item.previousTitle ?? ''
const joinWords = (words: string[], language: string) => new Intl.ListFormat(language, { type: 'conjunction' }).format(words)

export function VersionDiffSection({ namespace, query }: VersionDiffSectionProps) {
  const { t } = useTranslation(namespace)
  return (
    <Section title={t('diff.title')}>
      {query.isError ? (
        <ProblemState title={t('diff.failed')}>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('diff.retry')}
          </Button>
        </ProblemState>
      ) : query.data ? (
        <DiffBody namespace={namespace} diff={query.data} />
      ) : (
        <div role="status" className="flex flex-col gap-3">
          <p className="text-secondary text-ink-muted">{t('diff.loading')}</p>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </Section>
  )
}

function DiffBody({ namespace, diff }: { namespace: string; diff: VersionDiff }) {
  const { t, i18n } = useTranslation(namespace)
  // sin versión anterior todo es ADDED: basta decirlo
  if (diff.baseVersion === null) return <p className="max-w-prose text-secondary text-ink-muted">{t('diff.noBase')}</p>
  const units = byOrder(diff.units)
  const changed = units.filter((unit) => unit.change !== 'SAME')
  const same = units.filter((unit) => unit.change === 'SAME')
  const unchanged =
    same.length > 0 ? (
      <Unchanged
        summary={t('diff.sameUnits', { count: same.length, value: formatNumber(same.length, i18n.language) })}
        names={same.map((unit) => t('diff.unit', { order: unit.order, title: nameOf(unit) }))}
      />
    ) : null
  if (changed.length === 0)
    return (
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-secondary text-ink">
          <ChangeMark namespace={namespace} change="SAME" />
          <span>{t('diff.noChanges', { number: diff.baseVersion })}</span>
        </p>
        {unchanged}
      </div>
    )
  return (
    <div className="flex flex-col gap-4">
      <p className="text-secondary text-ink-muted">{t('diff.base', { number: diff.baseVersion })}</p>
      <Summary namespace={namespace} units={units} />
      <Legend namespace={namespace} />
      <ol aria-label={t('diff.changed')} className="flex flex-col divide-y divide-border border-t border-border">
        {changed.map((unit) => (
          <li key={unit.order} className="py-4 last:pb-0">
            <UnitChange namespace={namespace} unit={unit} />
          </li>
        ))}
      </ol>
      {unchanged}
    </div>
  )
}

// cuánto cambió: las marcas que se ven más abajo, contadas. una unidad cambiada por sus lecciones cuenta, como en su fila
function Summary({ namespace, units }: { namespace: string; units: UnitDiff[] }) {
  const { t, i18n } = useTranslation(namespace)
  const language = i18n.language
  return (
    <div role="group" aria-label={t('diff.summary')}>
      <StatList>
        {VISIBLE_CHANGES.map((change) => {
          const unitCount = units.filter((unit) => unit.change === change).length
          const lessonCount = units.flatMap((unit) => unit.lessons).filter((lesson) => lesson.change === change).length
          const parts = [
            ...(unitCount > 0 ? [t('diff.units', { count: unitCount, value: formatNumber(unitCount, language) })] : []),
            ...(lessonCount > 0 ? [t('diff.lessons', { count: lessonCount, value: formatNumber(lessonCount, language) })] : [])
          ]
          return (
            <Stat
              key={change}
              icon={MARK[change].icon}
              label={t(`diff.total.${change}`)}
              value={formatNumber(unitCount + lessonCount, language)}
              hint={parts.length > 0 ? joinWords(parts, language) : undefined}
            />
          )
        })}
      </StatList>
    </div>
  )
}

function Legend({ namespace }: { namespace: string }) {
  const { t } = useTranslation(namespace)
  const labelId = useId()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p id={labelId} className="text-secondary text-ink-muted">
        {t('diff.legend')}
      </p>
      <ul aria-labelledby={labelId} className="flex flex-wrap items-center gap-2">
        {VISIBLE_CHANGES.map((change) => (
          <li key={change}>
            <ChangeMark namespace={namespace} change={change} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChangeMark({ namespace, change }: { namespace: string; change: DiffChange }) {
  const { t } = useTranslation(namespace)
  const { icon: Icon, box } = MARK[change]
  return (
    <span data-change={change} className={`inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-secondary font-medium ${box}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className={change === 'REMOVED' ? 'line-through' : undefined}>{t(`diff.change.${change}`)}</span>
    </span>
  )
}

function UnitChange({ namespace, unit }: { namespace: string; unit: UnitDiff }) {
  const { t, i18n } = useTranslation(namespace)
  const lessons = byOrder(unit.lessons)
  const changed = lessons.filter((lesson) => lesson.change !== 'SAME')
  const same = lessons.filter((lesson) => lesson.change === 'SAME')
  const lessonName = (lesson: LessonDiff) => t('diff.lesson', { unit: unit.order, order: lesson.order, title: nameOf(lesson) })
  return (
    <div className="flex flex-col gap-3">
      <ChangeLine
        namespace={namespace}
        item={unit}
        label={t('diff.unit', { order: unit.order, title: nameOf(unit) })}
        strong
        lessonsChanged={changed.length > 0}
      />
      {changed.length > 0 || same.length > 0 ? (
        <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
          {changed.length > 0 ? (
            <ol className="flex flex-col divide-y divide-border">
              {changed.map((lesson) => (
                <li key={lesson.order} className="py-2.5 first:pt-0 last:pb-0">
                  <ChangeLine namespace={namespace} item={lesson} label={lessonName(lesson)} />
                </li>
              ))}
            </ol>
          ) : null}
          {same.length > 0 ? (
            <Unchanged summary={t('diff.sameLessons', { count: same.length, value: formatNumber(same.length, i18n.language) })} names={same.map(lessonName)} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// una unidad o una lección que cambió: el tipo de cambio, su nombre, qué cambió y, si es el título, el de antes y el de ahora
function ChangeLine({
  namespace,
  item,
  label,
  strong = false,
  lessonsChanged = false
}: {
  namespace: string
  item: UnitDiff | LessonDiff
  label: string
  strong?: boolean
  lessonsChanged?: boolean
}) {
  const { t, i18n } = useTranslation(namespace)
  const renamed = item.change === 'CHANGED' && item.previousTitle !== null && item.title !== null && item.previousTitle !== item.title
  const removed = item.change === 'REMOVED'
  // los campos en palabras de persona. uno que la interfaz aún no conoce no enseña su nombre técnico
  const known = item.fields.filter(isKnownField).map((field) => t(`diff.field.${field}`))
  const what = [...known, ...(known.length < item.fields.length ? [t('diff.otherFields')] : []), ...(lessonsChanged ? [t('diff.ownLessons')] : [])]
  return (
    <div className="flex min-w-0 flex-col gap-1 text-secondary">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ChangeMark namespace={namespace} change={item.change} />
        <p
          className={`min-w-0 [overflow-wrap:anywhere] ${strong ? 'text-body font-semibold' : 'font-medium'} ${removed ? 'text-ink-muted line-through' : 'text-ink'}`}
        >
          {label}
        </p>
      </div>
      {what.length > 0 && item.change === 'CHANGED' ? (
        <p className="text-ink-muted [overflow-wrap:anywhere]">{t('diff.fields', { fields: joinWords(what, i18n.language) })}</p>
      ) : null}
      {renamed ? (
        <>
          <p className="text-ink-muted [overflow-wrap:anywhere]">
            <span>{t('diff.before')}</span> <del className="rounded-sm bg-danger-soft box-decoration-clone px-1 text-danger">{item.previousTitle}</del>
          </p>
          <p className="text-ink-muted [overflow-wrap:anywhere]">
            <span>{t('diff.now')}</span> <ins className="rounded-sm bg-success-soft box-decoration-clone px-1 text-success">{item.title}</ins>
          </p>
        </>
      ) : null}
    </div>
  )
}

// lo que sigue igual: discreto y plegado
function Unchanged({ summary, names }: { summary: string; names: string[] }) {
  return (
    <details className="group text-secondary text-ink-muted">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm select-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform duration-[160ms] group-open:rotate-90" />
        <span>{summary}</span>
      </summary>
      <ul className="flex flex-col gap-1 pb-1 pl-5">
        {names.map((name) => (
          <li key={name} className="[overflow-wrap:anywhere]">
            {name}
          </li>
        ))}
      </ul>
    </details>
  )
}
