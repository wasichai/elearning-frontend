import { LoadingState, PageHeader, ReasonDialog, useAuth, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, ConfirmDialog, Label, Textarea } from '@wasichai/ui'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatInstant, formatNumber } from '../../shared/format'
import { VersionDiffSection } from '../../shared/VersionDiff'
import { useComment, useDecision, usePublish, useResolveComment, useVersion, useVersionDiff } from './api'
import type { Decision, ReviewComment, StudioLesson, StudioVersion, StudioVersionDetail } from './contract'
import { canPublish } from './permissions'
import { QueryProblem, useActionError } from './parts'
import { REVIEW_MODULE_ID, REVIEW_ROUTES } from './routes'

// el máximo de section y text de un comentario (docs/api/lms.md del backend)
const MAX_COMMENT = 4000
// la sección de un comentario sobre la versión entera, no sobre una unidad o una lección
const WHOLE_VERSION = 'version'
const unitSection = (unit: number) => `unidad:${unit}`
const lessonSection = (unit: number, lesson: number) => `unidad:${unit}/leccion:${lesson}`

const BACK_LINK = 'self-start text-sm text-link underline-offset-4 hover:underline'

// revisar una versión: su contenido por unidades y lecciones con los comentarios de cada parte, el historial de decisiones,
// y decidir (aprobar, pedir cambios o rechazar) o publicar lo aprobado. el servidor decide quién puede; aquí se ofrece
export function VersionReviewPage() {
  const { t } = useTranslation('review')
  const links = useWasichaiLinks()
  const { versionId = '' } = useParams()
  const query = useVersion(versionId)
  const version = query.data
  return (
    <>
      <PageHeader
        title={version?.course.title ?? t('version.title')}
        subtitle={version ? t('version.subtitle', { course: version.course.code, number: version.number }) : undefined}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pt-6 pb-16 sm:px-8">
        <Link to={links.to(REVIEW_ROUTES.inbox)} className={BACK_LINK}>
          {t('version.back')}
        </Link>
        {query.isError ? (
          <QueryProblem error={query.error} resource="version" onRetry={() => void query.refetch()} />
        ) : !version ? (
          <LoadingState label={t('version.loading')} />
        ) : (
          <VersionReview version={version} />
        )}
      </div>
    </>
  )
}

function VersionReview({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('review')
  const { permissions } = useAuth()
  const diff = useVersionDiff(version.id)
  // lo último que se hizo aquí: la barra de decisión desaparece al decidir, el aviso queda
  const [notice, setNotice] = useState<string | null>(null)
  const open = version.status === 'EN_REVISION'
  const units = [...version.units].sort((a, b) => a.order - b.order)
  const known = new Set([
    WHOLE_VERSION,
    ...units.flatMap((unit) => [unitSection(unit.order), ...unit.lessons.map((lesson) => lessonSection(unit.order, lesson.order))])
  ])
  const others = version.comments.filter((comment) => !known.has(comment.section))
  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap gap-x-4 text-sm text-ink">
        <span className="font-medium">{t(`status.${version.status}`)}</span>
        {version.updatedAt ? <span className="text-ink-muted">{t('version.updated', { date: formatInstant(version.updatedAt, i18n.language) })}</span> : null}
        <span className="text-ink-muted">
          {version.openComments > 0
            ? t('inbox.openComments', { count: version.openComments, value: formatNumber(version.openComments, i18n.language) })
            : t('inbox.noOpenComments')}
        </span>
      </p>
      {notice ? (
        <p role="status" className="text-sm font-medium text-success">
          {notice}
        </p>
      ) : null}
      {open ? (
        <DecisionBar version={version} onDone={setNotice} />
      ) : version.status === 'APROBADA' && canPublish(permissions) ? (
        <PublishBar version={version} onDone={setNotice} />
      ) : (
        <Alert tone="notice">{t('version.closed')}</Alert>
      )}
      {/* qué cambió respecto de la versión anterior, antes de entrar al contenido */}
      <VersionDiffSection namespace={REVIEW_MODULE_ID} query={diff} />
      <SectionComments versionId={version.id} section={WHOLE_VERSION} label={t('content.whole')} comments={version.comments} canComment={open} heading />
      <ol className="flex flex-col gap-6">
        {units.map((unit) => (
          <li key={unit.id}>
            <section aria-labelledby={`unit-${unit.id}`} className="flex flex-col gap-3 rounded-card border border-border px-5 py-4">
              <h2 id={`unit-${unit.id}`} className="text-lg font-semibold text-ink">
                {t('content.unit', { order: unit.order, title: unit.title })}
              </h2>
              <SectionComments
                versionId={version.id}
                section={unitSection(unit.order)}
                label={t('content.unit', { order: unit.order, title: unit.title })}
                comments={version.comments}
                canComment={open}
              />
              <ol className="flex flex-col gap-4 border-l border-border pl-4">
                {[...unit.lessons]
                  .sort((a, b) => a.order - b.order)
                  .map((lesson) => (
                    <li key={lesson.id}>
                      <LessonItem versionId={version.id} unitOrder={unit.order} lesson={lesson} comments={version.comments} canComment={open} />
                    </li>
                  ))}
              </ol>
            </section>
          </li>
        ))}
      </ol>
      {units.length === 0 ? <p className="text-sm text-ink-muted">{t('content.empty')}</p> : null}
      {others.length > 0 ? (
        <section aria-labelledby="other-comments" className="flex flex-col gap-3">
          <h2 id="other-comments" className="text-lg font-semibold text-ink">
            {t('comments.others')}
          </h2>
          <ul className="flex flex-col gap-2">
            {others.map((comment) => (
              <li key={comment.id}>
                <CommentItem versionId={version.id} comment={comment} showSection />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <DecisionHistory version={version} />
    </div>
  )
}

function LessonItem({
  versionId,
  unitOrder,
  lesson,
  comments,
  canComment
}: {
  versionId: string
  unitOrder: number
  lesson: StudioLesson
  comments: ReviewComment[]
  canComment: boolean
}) {
  const { t, i18n } = useTranslation('review')
  const label = t('content.lesson', { unit: unitOrder, order: lesson.order, title: lesson.title })
  const facts = [
    t(`lessonType.${lesson.type}`, { defaultValue: lesson.type }),
    t('content.resources', { count: lesson.resources, value: formatNumber(lesson.resources, i18n.language) }),
    ...(lesson.hasAssessment ? [t('content.assessment')] : []),
    ...(lesson.sourceRef ? [t('content.source', { source: lesson.sourceRef })] : [])
  ]
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-ink">{label}</h3>
      <p className="text-sm break-words text-ink-muted">{facts.join(' · ')}</p>
      <SectionComments versionId={versionId} section={lessonSection(unitOrder, lesson.order)} label={label} comments={comments} canComment={canComment} />
    </div>
  )
}

// los comentarios de una sección y, mientras la versión está en revisión, el formulario para añadir uno
function SectionComments({
  versionId,
  section,
  label,
  comments,
  canComment,
  heading = false
}: {
  versionId: string
  section: string
  label: string
  comments: ReviewComment[]
  canComment: boolean
  heading?: boolean
}) {
  const { t } = useTranslation('review')
  const [writing, setWriting] = useState(false)
  const mine = comments.filter((comment) => comment.section === section)
  if (!heading && mine.length === 0 && !canComment) return null
  return (
    <div className="flex flex-col gap-2">
      {heading ? <h2 className="text-lg font-semibold text-ink">{t('comments.whole')}</h2> : null}
      {heading && mine.length === 0 && !writing ? <p className="text-sm text-ink-muted">{t('comments.none')}</p> : null}
      {mine.length > 0 ? (
        <ul aria-label={t('comments.listLabel', { section: label })} className="flex flex-col gap-2">
          {mine.map((comment) => (
            <li key={comment.id}>
              <CommentItem versionId={versionId} comment={comment} />
            </li>
          ))}
        </ul>
      ) : null}
      {canComment ? (
        writing ? (
          <CommentForm versionId={versionId} section={section} label={label} onClose={() => setWriting(false)} />
        ) : (
          <Button
            className={`${WRAP} self-start`}
            variant="secondary"
            size="sm"
            aria-label={t('comments.addLabel', { section: label })}
            onClick={() => setWriting(true)}
          >
            {t('comments.add')}
          </Button>
        )
      ) : null}
    </div>
  )
}

function CommentItem({ versionId, comment, showSection = false }: { versionId: string; comment: ReviewComment; showSection?: boolean }) {
  const { t, i18n } = useTranslation('review')
  const resolve = useResolveComment(versionId)
  const describe = useActionError()
  return (
    <article
      className={`flex flex-col gap-1 rounded-card px-4 py-3 text-sm ${comment.resolved ? 'bg-surface-muted text-ink-muted' : 'border border-border text-ink'}`}
    >
      {showSection ? <p className="text-xs break-all text-ink-muted">{t('comments.section', { section: comment.section })}</p> : null}
      <p className="whitespace-pre-line break-words">{comment.text}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        {comment.createdAt ? <span>{formatInstant(comment.createdAt, i18n.language)}</span> : null}
        {comment.resolved ? (
          <span>{t('comments.resolved')}</span>
        ) : (
          <Button className={WRAP} variant="secondary" size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate(comment.id)}>
            {resolve.isPending ? t('comments.resolving') : t('comments.resolve')}
          </Button>
        )}
      </div>
      {resolve.error ? <Alert tone="danger">{describe(resolve.error)}</Alert> : null}
    </article>
  )
}

function CommentForm({ versionId, section, label, onClose }: { versionId: string; section: string; label: string; onClose: () => void }) {
  const { t } = useTranslation('review')
  const id = useId()
  const comment = useComment(versionId)
  const describe = useActionError()
  const [text, setText] = useState('')
  const [empty, setEmpty] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    setEmpty(trimmed === '')
    if (trimmed === '') return
    comment.mutate({ section, text: trimmed }, { onSuccess: onClose })
  }
  return (
    <form aria-label={t('comments.formLabel', { section: label })} onSubmit={submit} className="flex flex-col gap-2 text-sm">
      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor={`${id}-text`}>{t('comments.text')}</Label>
        <Textarea
          id={`${id}-text`}
          rows={3}
          maxLength={MAX_COMMENT}
          value={text}
          aria-invalid={empty ? true : undefined}
          aria-describedby={empty ? `${id}-empty` : undefined}
          onChange={(event) => {
            setText(event.target.value)
            setEmpty(false)
          }}
        />
      </div>
      {empty ? (
        <p id={`${id}-empty`} role="alert" className="text-danger">
          {t('comments.empty')}
        </p>
      ) : null}
      {comment.error ? <Alert tone="danger">{describe(comment.error)}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button className={WRAP} type="submit" size="sm" disabled={comment.isPending}>
          {comment.isPending ? t('comments.sending') : t('comments.send')}
        </Button>
        <Button className={WRAP} type="button" variant="secondary" size="sm" onClick={onClose}>
          {t('comments.cancel')}
        </Button>
      </div>
    </form>
  )
}

// aprobar se confirma; pedir cambios y rechazar piden el motivo (el servidor responde 400 sin él). ReasonDialog limita el
// motivo a CHANGE_REASON_MAX_LENGTH de core, por debajo de los 4000 que acepta el servidor
function DecisionBar({ version, onDone }: { version: StudioVersion; onDone: (notice: string) => void }) {
  const { t } = useTranslation('review')
  const decide = useDecision(version.id)
  const describe = useActionError()
  const [asking, setAsking] = useState<Decision | null>(null)
  const close = () => {
    decide.reset()
    setAsking(null)
  }
  const send = (decision: Decision, reason: string | null) =>
    decide.mutate(
      { decision, reason },
      {
        onSuccess: (updated) => {
          setAsking(null)
          onDone(t(`decided.${decision}`, { status: t(`status.${updated.status}`) }))
        }
      }
    )
  const error = decide.error ? describe(decide.error) : null
  return (
    <section aria-labelledby="decide" className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted px-5 py-4">
      <h2 id="decide" className="text-base font-semibold text-ink">
        {t('decide.title')}
      </h2>
      <p className="text-sm text-ink-muted">{t('decide.hint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button className={WRAP} size="sm" onClick={() => setAsking('APROBAR')}>
          {t('decide.APROBAR')}
        </Button>
        <Button className={WRAP} variant="secondary" size="sm" onClick={() => setAsking('PEDIR_CAMBIOS')}>
          {t('decide.PEDIR_CAMBIOS')}
        </Button>
        <Button className={WRAP} variant="danger" size="sm" onClick={() => setAsking('RECHAZAR')}>
          {t('decide.RECHAZAR')}
        </Button>
      </div>
      {asking === 'APROBAR' ? (
        <ConfirmDialog
          variant="primary"
          title={t('decide.approveTitle')}
          description={t('decide.approveDescription')}
          confirmLabel={t('decide.APROBAR')}
          cancelLabel={t('decide.cancel')}
          busy={decide.isPending}
          error={error}
          onCancel={close}
          onConfirm={() => send('APROBAR', null)}
        />
      ) : asking ? (
        <ReasonDialog
          title={t(`decide.${asking}Title`)}
          description={t(`decide.${asking}Description`)}
          confirmLabel={t(`decide.${asking}`)}
          busy={decide.isPending}
          error={error}
          onCancel={close}
          onConfirm={(reason) => send(asking, reason)}
        />
      ) : null}
    </section>
  )
}

function PublishBar({ version, onDone }: { version: StudioVersion; onDone: (notice: string) => void }) {
  const { t } = useTranslation('review')
  const publish = usePublish(version.id)
  const describe = useActionError()
  const [confirming, setConfirming] = useState(false)
  return (
    <section aria-labelledby="publish" className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted px-5 py-4">
      <h2 id="publish" className="text-base font-semibold text-ink">
        {t('publish.title')}
      </h2>
      <p className="text-sm text-ink-muted">{t('publish.hint')}</p>
      <Button className={`${WRAP} self-start`} size="sm" onClick={() => setConfirming(true)}>
        {t('publish.action')}
      </Button>
      {confirming ? (
        <ConfirmDialog
          variant="primary"
          title={t('publish.confirmTitle')}
          description={t('publish.confirmDescription')}
          confirmLabel={t('publish.action')}
          cancelLabel={t('decide.cancel')}
          busy={publish.isPending}
          error={publish.error ? describe(publish.error) : null}
          onCancel={() => {
            publish.reset()
            setConfirming(false)
          }}
          onConfirm={() =>
            publish.mutate(undefined, {
              onSuccess: () => {
                setConfirming(false)
                onDone(t('publish.done'))
              }
            })
          }
        />
      ) : null}
    </section>
  )
}

function DecisionHistory({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('review')
  return (
    <section aria-labelledby="decisions" className="flex flex-col gap-3">
      <h2 id="decisions" className="text-lg font-semibold text-ink">
        {t('history.title')}
      </h2>
      {version.decisions.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('history.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {version.decisions.map((decision, index) => (
            <li key={`${decision.at}-${index}`} className="flex flex-col gap-1">
              <p className="text-ink">
                <span className="font-medium">{t(`decision.${decision.decision}`)}</span>
                <span className="text-ink-muted"> · {formatInstant(decision.at, i18n.language)}</span>
              </p>
              {decision.reason ? <p className="whitespace-pre-line break-words text-ink-muted">{decision.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
