import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@wasichai/ui'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { DiffChange, LessonDiff, UnitDiff, VersionDiff } from './diff'
import { isKnownField } from './diffMessages'
import { formatNumber } from './format'

// qué cambió una versión respecto de la anterior del mismo curso: lo añadido, lo quitado y lo cambiado a la vista, con
// sus campos; lo que sigue igual, plegado. la usan el estudio y la bandeja, cada uno con sus textos bajo diff (diffMessages)

interface VersionDiffSectionProps {
  // el espacio de nombres i18n del módulo que la pinta
  namespace: string
  query: UseQueryResult<VersionDiff>
}

const CHANGE_TONE: Record<DiffChange, string> = {
  ADDED: 'border-success text-success',
  REMOVED: 'border-danger text-danger',
  CHANGED: 'border-warning text-warning',
  SAME: 'border-border text-ink-muted'
}

const byOrder = <T extends { order: number }>(items: T[]): T[] => [...items].sort((a, b) => a.order - b.order)
// lo quitado ya no tiene título: se nombra por el que tenía
const nameOf = (item: { title: string | null; previousTitle: string | null }) => item.title ?? item.previousTitle ?? ''

export function VersionDiffSection({ namespace, query }: VersionDiffSectionProps) {
  const { t } = useTranslation(namespace)
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold text-ink">
        {t('diff.title')}
      </h2>
      {query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p className="text-ink-muted">{t('diff.failed')}</p>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('diff.retry')}
          </Button>
        </div>
      ) : query.data ? (
        <DiffBody namespace={namespace} diff={query.data} />
      ) : (
        <p className="text-sm text-ink-muted">{t('diff.loading')}</p>
      )}
    </section>
  )
}

function DiffBody({ namespace, diff }: { namespace: string; diff: VersionDiff }) {
  const { t, i18n } = useTranslation(namespace)
  // sin versión anterior todo es ADDED: basta decirlo
  if (diff.baseVersion === null) return <p className="max-w-prose text-sm text-ink-muted">{t('diff.noBase')}</p>
  const units = byOrder(diff.units)
  const changed = units.filter((unit) => unit.change !== 'SAME')
  const same = units.filter((unit) => unit.change === 'SAME')
  return (
    <>
      <p className="text-sm text-ink-muted">{t(changed.length > 0 ? 'diff.base' : 'diff.noChanges', { number: diff.baseVersion })}</p>
      {changed.length > 0 ? (
        <ol aria-label={t('diff.changed')} className="flex flex-col gap-4">
          {changed.map((unit) => (
            <li key={unit.order}>
              <UnitChange namespace={namespace} unit={unit} />
            </li>
          ))}
        </ol>
      ) : null}
      {same.length > 0 ? (
        <Unchanged
          summary={t('diff.sameUnits', { count: same.length, value: formatNumber(same.length, i18n.language) })}
          names={same.map((unit) => t('diff.unit', { order: unit.order, title: nameOf(unit) }))}
        />
      ) : null}
    </>
  )
}

function UnitChange({ namespace, unit }: { namespace: string; unit: UnitDiff }) {
  const { t, i18n } = useTranslation(namespace)
  const lessons = byOrder(unit.lessons)
  const changed = lessons.filter((lesson) => lesson.change !== 'SAME')
  const same = lessons.filter((lesson) => lesson.change === 'SAME')
  const lessonName = (lesson: LessonDiff) => t('diff.lesson', { unit: unit.order, order: lesson.order, title: nameOf(lesson) })
  return (
    <div className="flex flex-col gap-2">
      <ChangeLine namespace={namespace} item={unit} label={t('diff.unit', { order: unit.order, title: nameOf(unit) })} strong />
      {changed.length > 0 || same.length > 0 ? (
        <div className="flex flex-col gap-2 border-l border-border pl-4">
          {changed.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {changed.map((lesson) => (
                <li key={lesson.order}>
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

// una unidad o una lección que cambió: el tipo de cambio, su nombre, el título de antes si lo cambió y los campos
function ChangeLine({ namespace, item, label, strong = false }: { namespace: string; item: UnitDiff | LessonDiff; label: string; strong?: boolean }) {
  const { t } = useTranslation(namespace)
  const renamed = item.change === 'CHANGED' && item.previousTitle !== null && item.title !== null && item.previousTitle !== item.title
  const fields = item.fields.map((field) => (isKnownField(field) ? t(`diff.field.${field}`) : field))
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`rounded-sm border px-1.5 text-xs font-medium ${CHANGE_TONE[item.change]}`}>{t(`diff.change.${item.change}`)}</span>
        <span className={`${strong ? 'font-semibold' : 'font-medium'} ${item.change === 'REMOVED' ? 'text-ink-muted line-through' : 'text-ink'}`}>{label}</span>
      </p>
      {renamed ? <p className="text-xs text-ink-muted">{t('diff.previousTitle', { title: item.previousTitle })}</p> : null}
      {fields.length > 0 ? <p className="text-xs text-ink-muted">{t('diff.fields', { fields: fields.join(', ') })}</p> : null}
    </div>
  )
}

// lo que sigue igual: discreto y plegado
function Unchanged({ summary, names }: { summary: string; names: string[] }) {
  return (
    <details className="text-sm text-ink-muted">
      <summary className="cursor-pointer select-none">{summary}</summary>
      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </details>
  )
}
