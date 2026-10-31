import { LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, ConfirmDialog } from '@wasichai/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatDateTime, formatInstant, formatNumber } from '../../shared/format'
import { ProblemState } from '../../shared/ProblemState'
import { VersionDiffSection } from '../../shared/VersionDiff'
import { useNewVersion, useSubmitVersion, useVersion, useVersionDiff } from './api'
import type { ReviewComment, ReviewDecision, StudioLesson, StudioUnit, StudioVersionDetail } from './contract'
import { BackToVersions, LINK, useActionError, useProblemText } from './parts'
import { STUDIO_MODULE_ID, STUDIO_ROUTES } from './routes'

// el contenido de la versión se edita en las pantallas de registros de Wasichai (core), que la guarda editorial del
// servidor deja solo al autor y en borrador: aquí no se reimplementan formularios (CLAUDE.md, regla 7)
const VERSION_OBJECT = 'version_curso'
const UNIT_OBJECT = 'unidad'
const LESSON_OBJECT = 'leccion'

// una versión propia: su estado, su temario, lo que el revisor comentó y decidió, y lo que se puede hacer con ella
export function VersionPage() {
  const { t } = useTranslation('studio')
  const { id = '' } = useParams()
  const query = useVersion(id)
  const version = query.data
  return (
    <>
      <PageHeader
        title={version?.course.title ?? t('version.title')}
        subtitle={version ? t('version.subtitle', { number: version.number, code: version.course.code }) : undefined}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-8">
        <BackToVersions />
        {query.isError ? (
          <VersionProblem error={query.error} onRetry={() => void query.refetch()} />
        ) : version ? (
          <Version version={version} />
        ) : (
          <LoadingState label={t('version.loading')} />
        )}
      </div>
    </>
  )
}

// un 404 es una respuesta (lo ajeno y lo inexistente no se distinguen) y no se reintenta; lo demás, sí
function VersionProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const { kind, title, description } = useProblemText(error, 'version')
  if (kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2 py-6">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{t('problem.notFoundHint')}</p>
      </div>
    )
  return (
    <ProblemState title={title} description={description}>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

function Version({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('studio')
  const diff = useVersionDiff(version.id)
  const draft = version.status === 'BORRADOR'
  return (
    <>
      <section aria-labelledby="version-state" className="flex flex-col gap-3">
        <h2 id="version-state" className="text-lg font-semibold text-ink">
          {t('version.state', { status: t(`status.${version.status}`) })}
        </h2>
        <p className="max-w-prose text-sm text-ink-muted">{t(`statusHint.${version.status}`)}</p>
        {version.updatedAt ? (
          <p className="text-sm text-ink-muted">{t('versions.updated', { date: formatInstant(version.updatedAt, i18n.language) })}</p>
        ) : null}
        <Actions version={version} />
      </section>
      <VersionDiffSection namespace={STUDIO_MODULE_ID} query={diff} />
      <Syllabus units={version.units} draft={draft} />
      <Comments comments={version.comments} />
      <Decisions decisions={version.decisions} />
    </>
  )
}

function Actions({ version }: { version: StudioVersionDetail }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const navigate = useNavigate()
  const describe = useActionError()
  const submit = useSubmitVersion(version.id)
  const copy = useNewVersion(version.course.id)
  const [asking, setAsking] = useState<'submit' | 'copy'>()
  const draft = version.status === 'BORRADOR'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {draft ? (
          <>
            <Link to={links.record(VERSION_OBJECT, version.id)} className={LINK}>
              {t('version.edit')}
            </Link>
            <Button className={WRAP} disabled={submit.isPending} onClick={() => setAsking('submit')}>
              {submit.isPending ? t('version.submitting') : t('version.submit')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" className={WRAP} disabled={copy.isPending} onClick={() => setAsking('copy')}>
            {copy.isPending ? t('version.copying') : t('version.copy')}
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-success">
        {submit.isSuccess ? t('version.submitted') : ''}
      </p>
      {submit.error && !asking ? <Alert tone="danger">{describe(submit.error)}</Alert> : null}
      {copy.error && !asking ? <Alert tone="danger">{describe(copy.error)}</Alert> : null}

      {/* enviar deja la versión sin editar hasta que el revisor decida: se confirma (RNF-UX-08) */}
      {asking === 'submit' ? (
        <ConfirmDialog
          variant="primary"
          title={t('version.submitTitle')}
          description={t('version.submitDescription', { number: version.number })}
          confirmLabel={t('version.submitConfirm')}
          cancelLabel={t('version.cancel')}
          busy={submit.isPending}
          error={submit.error ? describe(submit.error) : null}
          onCancel={() => {
            submit.reset()
            setAsking(undefined)
          }}
          onConfirm={() => submit.mutate(undefined, { onSuccess: () => setAsking(undefined) })}
        />
      ) : null}
      {asking === 'copy' ? (
        <ConfirmDialog
          variant="primary"
          title={t('version.copyTitle')}
          description={t('version.copyDescription', { number: version.number })}
          confirmLabel={t('version.copyConfirm')}
          cancelLabel={t('version.cancel')}
          busy={copy.isPending}
          error={copy.error ? describe(copy.error) : null}
          onCancel={() => {
            copy.reset()
            setAsking(undefined)
          }}
          onConfirm={() =>
            copy.mutate(version.id, {
              onSuccess: (created) => {
                setAsking(undefined)
                void navigate(links.to(STUDIO_ROUTES.version, { id: created.id }))
              }
            })
          }
        />
      ) : null}
    </div>
  )
}

function Syllabus({ units, draft }: { units: StudioUnit[]; draft: boolean }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const sorted = [...units].sort((a, b) => a.order - b.order)
  return (
    <section aria-labelledby="version-syllabus" className="flex flex-col gap-3">
      <h2 id="version-syllabus" className="text-lg font-semibold text-ink">
        {t('syllabus.title')}
      </h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('syllabus.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {sorted.map((unit) => (
            <li key={unit.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-base font-semibold text-ink">{t('syllabus.unit', { order: unit.order, title: unit.title })}</h3>
                {draft ? (
                  <Link to={links.record(UNIT_OBJECT, unit.id)} className={LINK} aria-label={t('syllabus.editUnitLabel', { title: unit.title })}>
                    {t('syllabus.edit')}
                  </Link>
                ) : null}
              </div>
              {unit.lessons.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('syllabus.noLessons')}</p>
              ) : (
                <ol className="flex flex-col gap-2 border-l border-border pl-4">
                  {[...unit.lessons]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => (
                      <li key={lesson.id}>
                        <LessonItem lesson={lesson} draft={draft} />
                      </li>
                    ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function LessonItem({ lesson, draft }: { lesson: StudioLesson; draft: boolean }) {
  const { t, i18n } = useTranslation('studio')
  const links = useWasichaiLinks()
  const facts = [
    t(`lessonType.${lesson.type}`),
    ...(lesson.hasAssessment ? [t('syllabus.assessment')] : []),
    t('syllabus.resources', { count: lesson.resources, value: formatNumber(lesson.resources, i18n.language) })
  ]
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-medium text-ink">{t('syllabus.lesson', { order: lesson.order, title: lesson.title })}</span>
        {draft ? (
          <Link to={links.record(LESSON_OBJECT, lesson.id)} className={LINK} aria-label={t('syllabus.editLessonLabel', { title: lesson.title })}>
            {t('syllabus.edit')}
          </Link>
        ) : null}
      </div>
      <span className="text-ink-muted">{facts.join(' · ')}</span>
      {lesson.sourceRef ? <span className="break-all text-xs text-ink-muted">{t('syllabus.source', { ref: lesson.sourceRef })}</span> : null}
    </div>
  )
}

// el texto de un comentario es del revisor: se pinta como texto, nunca como HTML
function Comments({ comments }: { comments: ReviewComment[] }) {
  const { t, i18n } = useTranslation('studio')
  const open = comments.filter((comment) => !comment.resolved).length
  return (
    <section aria-labelledby="version-comments" className="flex flex-col gap-3">
      <h2 id="version-comments" className="text-lg font-semibold text-ink">
        {t('comments.title')}
      </h2>
      {comments.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('comments.empty')}</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {open > 0 ? t('comments.open', { count: open, value: formatNumber(open, i18n.language) }) : t('comments.allResolved')}
          </p>
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id} className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
                <p className="flex flex-wrap gap-x-2 text-xs text-ink-muted">
                  <span className="font-mono">{comment.section}</span>
                  {comment.createdAt ? <span>{formatDateTime(comment.createdAt, i18n.language, localZone())}</span> : null}
                  <span className={comment.resolved ? 'text-success' : 'font-medium text-warning'}>
                    {comment.resolved ? t('comments.resolved') : t('comments.pending')}
                  </span>
                </p>
                <p className="whitespace-pre-line text-ink">{comment.text}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Decisions({ decisions }: { decisions: ReviewDecision[] }) {
  const { t, i18n } = useTranslation('studio')
  return (
    <section aria-labelledby="version-decisions" className="flex flex-col gap-3">
      <h2 id="version-decisions" className="text-lg font-semibold text-ink">
        {t('decisions.title')}
      </h2>
      {decisions.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('decisions.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {decisions.map((decision) => (
            <li key={`${decision.at}-${decision.decision}`} className="flex flex-col gap-1 text-sm">
              <p className="flex flex-wrap gap-x-2">
                <span className="font-medium text-ink">{t(`decision.${decision.decision}`)}</span>
                <span className="text-ink-muted">{formatDateTime(decision.at, i18n.language, localZone())}</span>
              </p>
              {decision.reason ? <p className="whitespace-pre-line text-ink">{decision.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// los instantes del estudio no son de una edición: se escriben en la zona de quien los lee
function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
