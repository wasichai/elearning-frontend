import { useWasichaiLinks } from '@wasichai/core'
import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatInstant, formatNumber } from '../../shared/format'
import { ACHIEVEMENT_KINDS, type Achievement, type AchievementKind, type Classroom, type Unit } from './contract'
import { ROW_FOCUS, UNIT_ROW } from './parts'
import { StateMark } from '../../shared/StateMark'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

// hasta aquí la lista se ve abierta; con más se pliega, para no empujar el temario fuera del panel
const OPEN_UP_TO = 3

interface Resolved {
  kind: AchievementKind
  at?: string | null
  // el título de su unidad o evaluación; sin él (certificado, o una referencia que no se resuelve) el tipo hace de título
  subject?: string
  lessonId?: string
  certificateCode?: string
}

const isKnown = (kind: string): kind is AchievementKind => (ACHIEVEMENT_KINDS as readonly string[]).includes(kind)

// la referencia, de forma exacta, contra el aula que ya se leyó. un tipo desconocido no se sabe decir: se omite
function resolve({ kind, at, ref }: Achievement, units: Unit[]): Resolved | undefined {
  if (!isKnown(kind)) return undefined
  if (kind === 'CERTIFICATE_ISSUED') return { kind, at, certificateCode: ref }
  if (kind === 'UNIT_COMPLETED') {
    const unit = units.find((candidate) => candidate.id === ref)
    // una unidad no tiene pantalla propia: se abre en su primera lección, y el temario la despliega
    return { kind, at, subject: unit?.title, lessonId: unit?.lessons[0]?.id }
  }
  const lesson = units.flatMap((unit) => unit.lessons).find((candidate) => candidate.assessment?.id === ref)
  return { kind, at, subject: lesson?.assessment?.title, lessonId: lesson?.id }
}

// los logros de la matrícula (RF-AUL-08), junto al avance en el panel del temario: filas como las de las unidades, sin competir con la
// lección abierta ni con su siguiente paso. salen del aula ya leída, en el orden del servidor, cada uno con su marca de estado
export function Achievements({ classroom, units, onNavigate }: { classroom: Classroom; units: Unit[]; onNavigate?: () => void }) {
  const { t, i18n } = useTranslation('classroom')
  const titleId = useId()
  const rows = classroom.achievements.flatMap((achievement) => {
    const resolved = resolve(achievement, units)
    return resolved ? [{ key: `${achievement.kind}:${achievement.ref}`, ...resolved }] : []
  })
  if (rows.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="border-t border-border">
      <details open={rows.length <= OPEN_UP_TO} className="group/achievements">
        <summary className={`${UNIT_ROW} ${ROW_FOCUS} [&::-webkit-details-marker]:hidden`}>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-ink-muted transition-transform duration-[160ms] group-open/achievements:rotate-90 motion-reduce:transition-none"
          />
          <h2 className="flex min-w-0 flex-1 items-baseline justify-between gap-3 text-secondary font-semibold text-ink">
            <span id={titleId}>{t('achievements.title')}</span>
            <span className="shrink-0 text-secondary font-normal text-ink-muted tabular-nums">
              <span aria-hidden="true">{formatNumber(rows.length, i18n.language)}</span>
              <span className="sr-only">{t('achievements.count', { count: rows.length })}</span>
            </span>
          </h2>
        </summary>
        <ol className="flex flex-col pb-2">
          {rows.map(({ key, ...row }) => (
            <li key={key}>
              <AchievementRow enrollmentId={classroom.id} timeZone={classroom.offering.timeZone} row={row} onNavigate={onNavigate} />
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}

function AchievementRow({ enrollmentId, timeZone, row, onNavigate }: { enrollmentId: string; timeZone: string; row: Resolved; onNavigate?: () => void }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const label = t(`achievements.kind.${row.kind}`)
  const date = row.at ? <time dateTime={row.at}>{formatInstant(row.at, i18n.language, timeZone)}</time> : null
  const content: ReactNode = (
    <>
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <AchievementMark kind={row.kind} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ink">{row.subject ?? label}</span>
        {row.subject || date ? (
          <span className="text-secondary text-ink-muted">
            {row.subject ? <span className="text-success">{label}</span> : null}
            {row.subject && date ? ' · ' : null}
            {date}
          </span>
        ) : null}
      </span>
    </>
  )
  const rowClass = '-mx-2 flex min-h-12 items-center gap-2.5 rounded-md px-2 py-1.5 text-secondary'
  const to = row.certificateCode
    ? links.to(CLASSROOM_ROUTES.certificate, { code: row.certificateCode })
    : row.lessonId
      ? links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: row.lessonId })
      : undefined
  if (!to) return <div className={rowClass}>{content}</div>
  return (
    <Link to={to} onClick={onNavigate} className={`${rowClass} ${ROW_FOCUS} hover:bg-surface-muted`}>
      {content}
    </Link>
  )
}

// la marca de lo hecho (Colofón): una unidad completada, completada; una evaluación aprobada y el certificado, aprobados (success).
// decorativa: la fila dice el logro con palabras
function AchievementMark({ kind }: { kind: AchievementKind }) {
  return <StateMark state={kind === 'UNIT_COMPLETED' ? 'done' : 'passed'} />
}
