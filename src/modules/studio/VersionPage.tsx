import { LoadingState, useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatDateTime, formatInstant, formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenBody, ScreenHeader, Section } from '../../shared/Screen'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import { VersionDiffSection } from '../../shared/VersionDiff'
import { VERSION_BADGE, VersionStatusLine } from '../../shared/VersionStatusLine'
import { useSubmitVersion, useVersion, useVersionDiff } from './api'
import { hasLessons, type ReviewComment, type ReviewDecision, type StudioLesson, type StudioUnit, type StudioVersionDetail } from './contract'
import { useProblemText } from './parts'
import { STUDIO_MODULE_ID, STUDIO_ROUTES } from './routes'
import { NewVersionButton, SubmitVersionButton, useFirstContentStep } from './VersionActions'

// el contenido de la versión se edita en las pantallas de registros de Wasichai (core), que la guarda editorial del
// servidor deja solo al autor y en borrador: aquí no se reimplementan formularios (CLAUDE.md, regla 7)
const VERSION_OBJECT = 'version_curso'
const UNIT_OBJECT = 'unidad'
const LESSON_OBJECT = 'leccion'

// las secciones que comenta el revisor, como las escribe la bandeja (ReviewComment.section)
const WHOLE_VERSION = 'version'
const unitSection = (unit: number) => `unidad:${unit}`
const lessonSection = (unit: number, lesson: number) => `unidad:${unit}/leccion:${lesson}`

const DECISION_BADGE: Record<ReviewDecision['decision'], StatusState> = { APROBAR: 'done', PEDIR_CAMBIOS: 'warning', RECHAZAR: 'overdue' }

// una versión propia: su estado, su temario, lo que el revisor comentó y decidió, y lo que se puede hacer con ella
export function VersionPage() {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const { id = '' } = useParams()
  const query = useVersion(id)
  const version = query.data
  return (
    <>
      <ScreenHeader
        width="wide"
        title={version?.course.title ?? t('version.title')}
        subtitle={version ? t('version.subtitle', { number: version.number, code: version.course.code }) : undefined}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[
              { label: t('versions.title'), to: links.to(STUDIO_ROUTES.versions) },
              { label: version ? t('versions.number', { number: version.number }) : t('version.title') }
            ]}
          />
        }
        meta={version ? <StatusBadge state={VERSION_BADGE[version.status]}>{t(`status.${version.status}`)}</StatusBadge> : undefined}
        actions={version ? <Actions key={version.id} version={version} /> : undefined}
      />
      <ScreenBody width="wide">
        {query.isError ? (
          <VersionProblem error={query.error} onRetry={() => void query.refetch()} />
        ) : version ? (
          <Version version={version} />
        ) : (
          <LoadingState label={t('version.loading')} />
        )}
      </ScreenBody>
    </>
  )
}

// un 404 es una respuesta (lo ajeno y lo inexistente no se distinguen) y no se reintenta; lo demás, sí
function VersionProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const { kind, title, description } = useProblemText(error, 'version')
  if (kind === 'notFound') return <ProblemState title={title} description={t('problem.notFoundHint')} />
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

// la siguiente acción, en la cabecera. una publicada o retirada solo tiene una salida; una en curso la ofrece sin prisa. un borrador sin
// lecciones no se envía: lo que le falta, y su primaria, van en el cuerpo (BlockedSubmit)
function Actions({ version }: { version: StudioVersionDetail }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const submit = useSubmitVersion(version.id)
  const home = useRef<HTMLDivElement>(null)
  const draft = version.status === 'BORRADOR'
  const finished = version.status === 'PUBLICADA' || version.status === 'RETIRADA'
  return (
    <div ref={home} tabIndex={-1} className="flex flex-col gap-2 outline-none sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {draft ? (
          <Button asChild variant="secondary" className="min-h-11">
            <Link to={links.record(VERSION_OBJECT, version.id)}>{t('version.edit')}</Link>
          </Button>
        ) : (
          <NewVersionButton source={version} label={t('version.copy')} variant={finished ? 'primary' : 'secondary'} />
        )}
        <SubmitVersionButton version={version} submit={submit} variant="primary" offered={draft && hasLessons(version)} focusHome={home} />
      </div>
      <p role="status" className="text-sm text-success empty:hidden">
        {submit.isSuccess ? t('version.submitted') : ''}
      </p>
    </div>
  )
}

// un borrador sin lecciones no se puede enviar: qué falta, a la vista, y el siguiente paso
function BlockedSubmit({ version }: { version: StudioVersionDetail }) {
  const { t } = useTranslation('studio')
  const step = useFirstContentStep(version)
  return (
    <div className="flex max-w-prose flex-col items-start gap-3">
      <Notice tone="notice" title={t('version.blockedTitle')}>
        {step.reason}
      </Notice>
      <Button asChild variant="primary" className="min-h-11">
        <Link to={step.to}>{step.label}</Link>
      </Button>
    </div>
  )
}

function Version({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('studio')
  const diff = useVersionDiff(version.id)
  const draft = version.status === 'BORRADOR'
  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        {draft ? (
          hasLessons(version) ? (
            <p className="max-w-prose text-base text-ink-muted">{t('statusHint.BORRADOR')}</p>
          ) : (
            <BlockedSubmit version={version} />
          )
        ) : (
          <Notice tone="notice" title={t('version.readOnly')}>
            {t(`statusHint.${version.status}`)}
          </Notice>
        )}
        <VersionDiffSection namespace={STUDIO_MODULE_ID} query={diff} />
        <Syllabus version={version} draft={draft} />
      </div>
      <aside aria-label={t('version.rail')} className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-6">
        <VersionStatusLine
          namespace={STUDIO_MODULE_ID}
          status={version.status}
          updated={version.updatedAt ? t('versions.updated', { date: formatInstant(version.updatedAt, i18n.language) }) : null}
        />
        <Comments version={version} />
        <Decisions decisions={version.decisions} />
      </aside>
    </div>
  )
}

function Syllabus({ version, draft }: { version: StudioVersionDetail; draft: boolean }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const sorted = [...version.units].sort((a, b) => a.order - b.order)
  return (
    <Section
      title={t('syllabus.title')}
      action={
        draft && sorted.length > 0 ? (
          <Button asChild variant="secondary" className="min-h-11">
            <Link to={links.to(STUDIO_ROUTES.newUnit, { id: version.id })}>{t('syllabus.addUnit')}</Link>
          </Button>
        ) : undefined
      }
    >
      {sorted.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-prose text-sm text-ink-muted">{t('syllabus.empty')}</p>
          {/* lo que el servidor pone a la v1 vacía (#270): el curso no tiene duración ni modalidad */}
          {draft && version.number === 1 ? <p className="max-w-prose text-sm text-ink-muted">{t('syllabus.firstDraftDefaults')}</p> : null}
        </div>
      ) : (
        <ol className="flex flex-col gap-6">
          {sorted.map((unit: StudioUnit) => (
            <li key={unit.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="min-w-0 text-base font-semibold text-ink [overflow-wrap:anywhere]">
                  {t('syllabus.unit', { order: unit.order, title: unit.title })}
                </h3>
                {draft ? (
                  <Link
                    to={links.record(UNIT_OBJECT, unit.id)}
                    className={`min-w-11 shrink-0 justify-center ${TEXT_LINK}`}
                    aria-label={t('syllabus.editUnitLabel', { title: unit.title })}
                  >
                    {t('syllabus.edit')}
                  </Link>
                ) : null}
              </div>
              <CommentList
                comments={version.comments.filter((comment) => comment.section === unitSection(unit.order))}
                label={t('comments.of', { name: unit.title })}
              />
              {unit.lessons.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('syllabus.noLessons')}</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border border-y border-border">
                  {[...unit.lessons]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => (
                      <li key={lesson.id} className="py-3">
                        <LessonItem
                          lesson={lesson}
                          draft={draft}
                          comments={version.comments.filter((comment) => comment.section === lessonSection(unit.order, lesson.order))}
                        />
                      </li>
                    ))}
                </ol>
              )}
              {draft ? (
                <Link
                  to={links.to(STUDIO_ROUTES.newLesson, { id: version.id, unitId: unit.id })}
                  className={`self-start ${TEXT_LINK}`}
                  aria-label={t('syllabus.addLessonLabel', { title: unit.title })}
                >
                  {t('syllabus.addLesson')}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

function LessonItem({ lesson, draft, comments }: { lesson: StudioLesson; draft: boolean; comments: ReviewComment[] }) {
  const { t, i18n } = useTranslation('studio')
  const links = useWasichaiLinks()
  const facts = [
    t(`lessonType.${lesson.type}`),
    ...(lesson.hasAssessment ? [t('syllabus.assessment')] : []),
    t('syllabus.resources', { count: lesson.resources, value: formatNumber(lesson.resources, i18n.language) })
  ]
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-ink [overflow-wrap:anywhere]">{t('syllabus.lesson', { order: lesson.order, title: lesson.title })}</span>
          <span className="text-ink-muted">{facts.join(' · ')}</span>
        </div>
        {draft ? (
          <Link
            to={links.record(LESSON_OBJECT, lesson.id)}
            className={`min-w-11 shrink-0 justify-center ${TEXT_LINK}`}
            aria-label={t('syllabus.editLessonLabel', { title: lesson.title })}
          >
            {t('syllabus.edit')}
          </Link>
        ) : null}
      </div>
      {lesson.sourceRef ? (
        <details className="group text-ink-muted">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-sm select-none hover:text-ink sm:min-h-6 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-[160ms] group-open:rotate-90" />
            <span>{t('syllabus.sourceToggle')}</span>
          </summary>
          <p className="pl-[1.125rem] text-xs break-all">{t('syllabus.source', { ref: lesson.sourceRef })}</p>
        </details>
      ) : null}
      <CommentList comments={comments} label={t('comments.of', { name: lesson.title })} />
    </div>
  )
}

// el texto de un comentario es del revisor: se pinta como texto, nunca como HTML. su estado, con icono y palabra
function CommentList({ comments, label }: { comments: ReviewComment[]; label: string }) {
  const { t, i18n } = useTranslation('studio')
  if (comments.length === 0) return null
  return (
    <ul aria-label={label} className="mt-1 flex flex-col gap-2 border-l-2 border-border pl-3 text-sm">
      {comments.map((comment) => (
        <li key={comment.id} className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <StatusBadge state={comment.resolved ? 'done' : 'warning'}>{comment.resolved ? t('comments.resolved') : t('comments.pending')}</StatusBadge>
            {comment.createdAt ? <span>{formatDateTime(comment.createdAt, i18n.language, localZone())}</span> : null}
          </p>
          <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">{comment.text}</p>
        </li>
      ))}
    </ul>
  )
}

// cuántos quedan y, aquí, los que no tienen una sección en el temario: los de toda la versión y los de una sección que ya no está
function Comments({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('studio')
  const { comments } = version
  const open = comments.filter((comment) => !comment.resolved).length
  const placed = new Set(version.units.flatMap((unit) => [unitSection(unit.order), ...unit.lessons.map((lesson) => lessonSection(unit.order, lesson.order))]))
  const whole = comments.filter((comment) => comment.section === WHOLE_VERSION)
  const orphans = comments.filter((comment) => comment.section !== WHOLE_VERSION && !placed.has(comment.section))
  const inSyllabus = comments.length - whole.length - orphans.length
  return (
    <Section title={t('comments.title')}>
      {comments.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('comments.empty')}</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {open > 0 ? t('comments.open', { count: open, value: formatNumber(open, i18n.language) }) : t('comments.allResolved')}
          </p>
          {inSyllabus > 0 ? <p className="text-sm text-ink-muted">{t('comments.inSyllabus')}</p> : null}
          <LabeledComments comments={whole} label={t('comments.whole')} />
          <LabeledComments comments={orphans} label={t('comments.orphans')} />
        </>
      )}
    </Section>
  )
}

// fuera del temario nada dice de qué son: el nombre de la lista se ve
function LabeledComments({ comments, label }: { comments: ReviewComment[]; label: string }) {
  if (comments.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-ink">{label}</p>
      <CommentList comments={comments} label={label} />
    </div>
  )
}

// la más reciente primero, como la línea de estados. el contrato identifica a quien decidió solo por su id: no se muestra
function Decisions({ decisions }: { decisions: ReviewDecision[] }) {
  const { t, i18n } = useTranslation('studio')
  return (
    <Section title={t('decisions.title')}>
      {decisions.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('decisions.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {[...decisions].reverse().map((decision) => (
            <li key={`${decision.at}-${decision.decision}`} className="flex flex-col gap-1 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <StatusBadge state={DECISION_BADGE[decision.decision]}>{t(`decision.${decision.decision}`)}</StatusBadge>
                <span className="text-xs text-ink-muted">{formatDateTime(decision.at, i18n.language, localZone())}</span>
              </p>
              {decision.reason ? <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">{decision.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

// los instantes del estudio no son de una edición: se escriben en la zona de quien los lee
function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
