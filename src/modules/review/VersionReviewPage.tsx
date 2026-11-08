import { useAuth, useWasichaiLinks } from '@wasichai/core'
import { Button, ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle, Label, Textarea } from '@wasichai/ui'
import { ChevronDown, ChevronRight, CircleAlert } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatInstant, formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { Breadcrumbs, ScreenBody, ScreenHeader, Section } from '../../shared/Screen'
import { GeneratorBadge } from '../../shared/GeneratorBadge'
import { StatusBadge, type StatusState } from '../../shared/StatusBadge'
import { useLeaveGuard } from '../../shared/useLeaveGuard'
import { VersionDiffSection } from '../../shared/VersionDiff'
import { VERSION_BADGE, VersionStatusLine } from '../../shared/VersionStatusLine'
import { ReturnFocus, useFocusOnClose } from '../../shared/ReturnFocus'
import { useComment, useDecision, usePublish, useResolveComment, useVersion, useVersionDiff } from './api'
import type { Decision, ReviewComment, ReviewDecision, StudioLesson, StudioVersion, StudioVersionDetail } from './contract'
import { QueryProblem, useActionError } from './parts'
import { canPublish } from './permissions'
import { REVIEW_MODULE_ID, REVIEW_ROUTES } from './routes'
import { DocumentSkeleton } from '../../shared/PageSkeleton'

// el máximo de text de un comentario y de reason de una decisión (docs/api/lms.md del backend)
const MAX_TEXT = 4000
// la sección de un comentario sobre la versión entera, no sobre una unidad o una lección
const WHOLE_VERSION = 'version'
const unitSection = (unit: number) => `unidad:${unit}`
const lessonSection = (unit: number, lesson: number) => `unidad:${unit}/leccion:${lesson}`

const DECISION_BADGE: Record<Decision, StatusState> = { APROBAR: 'done', PEDIR_CAMBIOS: 'warning', RECHAZAR: 'overdue' }
const DECISION_ORDER: Decision[] = ['APROBAR', 'PEDIR_CAMBIOS', 'RECHAZAR']

// revisar una versión: qué cambió, su contenido con los comentarios de cada parte y, en el riel, qué falta por decidir o publicar, su
// recorrido y sus decisiones. el servidor decide quién puede; aquí se ofrece
export function VersionReviewPage() {
  const { t } = useTranslation('review')
  const links = useWasichaiLinks()
  const { versionId = '' } = useParams()
  const query = useVersion(versionId)
  const version = query.data
  return (
    <>
      <ScreenHeader
        width="wide"
        title={version?.course.title ?? t('version.title')}
        subtitle={version ? t('version.subtitle', { course: version.course.code, number: version.number }) : undefined}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[
              { label: t('inbox.title'), to: links.to(REVIEW_ROUTES.inbox) },
              { label: version ? t('version.number', { number: version.number }) : t('version.title') }
            ]}
          />
        }
        meta={
          version ? (
            <>
              <StatusBadge state={VERSION_BADGE[version.status]}>{t(`status.${version.status}`)}</StatusBadge>
              <GeneratorBadge namespace={REVIEW_MODULE_ID} generator={version.generator} />
            </>
          ) : undefined
        }
      />
      <ScreenBody width="wide">
        {query.isError ? (
          <QueryProblem error={query.error} resource="version" onRetry={() => void query.refetch()} />
        ) : !version ? (
          <DocumentSkeleton label={t('version.loading')} />
        ) : (
          <VersionReview version={version} />
        )}
      </ScreenBody>
    </>
  )
}

function VersionReview({ version }: { version: StudioVersionDetail }) {
  const { t, i18n } = useTranslation('review')
  const diff = useVersionDiff(version.id)
  // lo último que se hizo aquí: el panel de decisión cambia al decidir, el aviso queda
  const [notice, setNotice] = useState<string | null>(null)
  // las secciones con un comentario escrito y sin enviar
  const [drafts, setDrafts] = useState<ReadonlySet<string>>(new Set())
  const onDraft = useCallback((section: string, written: boolean) => {
    setDrafts((current) => {
      if (current.has(section) === written) return current
      const next = new Set(current)
      if (written) next.add(section)
      else next.delete(section)
      return next
    })
  }, [])
  const guard = useLeaveGuard(drafts.size > 0)
  const open = version.status === 'EN_REVISION'
  const units = [...version.units].sort((a, b) => a.order - b.order)
  const known = new Set([
    WHOLE_VERSION,
    ...units.flatMap((unit) => [unitSection(unit.order), ...unit.lessons.map((lesson) => lessonSection(unit.order, lesson.order))])
  ])
  const others = version.comments.filter((comment) => !known.has(comment.section))
  return (
    // el riel va antes en el documento: en un móvil lo primero es el panel de decisión, y su estado e historial bajan tras el contenido
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
      <aside
        aria-label={t('version.rail')}
        className="contents lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:min-w-0 lg:flex-col lg:gap-8 lg:overflow-y-auto"
      >
        <div className="order-1 flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4">
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          <p className="text-sm text-ink [overflow-wrap:anywhere]">
            {t(open ? 'decide.reviewing' : 'decide.viewing', { number: version.number, course: version.course.title })}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
            {version.openComments > 0 ? (
              <StatusBadge state="warning">
                {t('inbox.openComments', { count: version.openComments, value: formatNumber(version.openComments, i18n.language) })}
              </StatusBadge>
            ) : (
              <span>{t('inbox.noOpenComments')}</span>
            )}
          </p>
          {drafts.size > 0 ? <Notice tone="warning">{t('decide.unsent', { count: drafts.size })}</Notice> : null}
          <NextStep version={version} onDone={setNotice} />
        </div>
        <div className="order-3 flex min-w-0 flex-col gap-8">
          <VersionStatusLine
            namespace="review"
            status={version.status}
            updated={version.updatedAt ? t('version.updated', { date: formatInstant(version.updatedAt, i18n.language) }) : null}
          />
          <DecisionHistory decisions={version.decisions} />
        </div>
      </aside>
      <div className="order-2 flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
        {/* qué cambió respecto de la versión anterior, antes de entrar al contenido */}
        <VersionDiffSection namespace={REVIEW_MODULE_ID} query={diff} />
        <Section title={t('comments.whole')}>
          <SectionComments
            versionId={version.id}
            section={WHOLE_VERSION}
            label={t('content.whole')}
            comments={version.comments}
            canComment={open}
            onDraft={onDraft}
            empty
          />
        </Section>
        {units.length === 0 ? <p className="text-sm text-ink-muted">{t('content.empty')}</p> : null}
        <ol className="flex flex-col gap-8">
          {units.map((unit) => (
            <li key={unit.id}>
              <Section title={t('content.unit', { order: unit.order, title: unit.title })}>
                <SectionComments
                  versionId={version.id}
                  section={unitSection(unit.order)}
                  label={t('content.unit', { order: unit.order, title: unit.title })}
                  comments={version.comments}
                  canComment={open}
                  onDraft={onDraft}
                />
                <ol className="flex flex-col divide-y divide-border border-y border-border">
                  {[...unit.lessons]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => (
                      <li key={lesson.id} className="py-3">
                        <LessonItem
                          versionId={version.id}
                          unitOrder={unit.order}
                          lesson={lesson}
                          comments={version.comments}
                          canComment={open}
                          onDraft={onDraft}
                        />
                      </li>
                    ))}
                </ol>
              </Section>
            </li>
          ))}
        </ol>
        {others.length > 0 ? (
          <Section title={t('comments.others')} description={t('comments.othersHint')}>
            <ul aria-label={t('comments.others')} className="flex flex-col divide-y divide-border border-l-2 border-border pl-3">
              {others.map((comment) => (
                <li key={comment.id} className="py-2">
                  <CommentItem versionId={version.id} comment={comment} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
      {guard.leaving ? (
        <ReturnFocus>
          <ConfirmDialog
            variant="danger"
            title={t('leave.title')}
            description={t('leave.description', { count: drafts.size })}
            confirmLabel={t('leave.confirm')}
            cancelLabel={t('leave.stay')}
            onCancel={guard.stay}
            onConfirm={guard.leave}
          />
        </ReturnFocus>
      ) : null}
    </div>
  )
}

// lo que falta: decidir, publicar (solo con PUBLICAR, y el servidor responde 403 igual) o nada
function NextStep({ version, onDone }: { version: StudioVersionDetail; onDone: (notice: string) => void }) {
  const { t } = useTranslation('review')
  const { permissions } = useAuth()
  if (version.status === 'EN_REVISION') return <DecisionPanel version={version} onDone={onDone} />
  if (version.status === 'APROBADA' && canPublish(permissions)) return <PublishPanel version={version} onDone={onDone} />
  return (
    <>
      <Notice tone="notice">{t('version.closed')}</Notice>
      {version.status === 'APROBADA' ? <p className="text-sm text-ink-muted">{t('version.awaitingPublish')}</p> : null}
    </>
  )
}

function LessonItem({
  versionId,
  unitOrder,
  lesson,
  comments,
  canComment,
  onDraft
}: {
  versionId: string
  unitOrder: number
  lesson: StudioLesson
  comments: ReviewComment[]
  canComment: boolean
  onDraft: (section: string, written: boolean) => void
}) {
  const { t, i18n } = useTranslation('review')
  const label = t('content.lesson', { unit: unitOrder, order: lesson.order, title: lesson.title })
  const facts = [
    t(`lessonType.${lesson.type}`, { defaultValue: lesson.type }),
    t('content.resources', { count: lesson.resources, value: formatNumber(lesson.resources, i18n.language) }),
    ...(lesson.hasAssessment ? [t('content.assessment')] : [])
  ]
  return (
    <div className="flex flex-col gap-1 text-sm">
      <h3 className="text-base font-medium text-ink [overflow-wrap:anywhere]">{label}</h3>
      <p className="text-ink-muted">{facts.join(' · ')}</p>
      {lesson.sourceRef ? (
        <details className="group text-ink-muted">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-sm select-none hover:text-ink sm:min-h-6 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-[160ms] group-open:rotate-90" />
            <span>{t('content.sourceToggle')}</span>
          </summary>
          <p className="pl-[1.125rem] text-xs break-all">{t('content.source', { source: lesson.sourceRef })}</p>
        </details>
      ) : null}
      <SectionComments
        versionId={versionId}
        section={lessonSection(unitOrder, lesson.order)}
        label={label}
        comments={comments}
        canComment={canComment}
        onDraft={onDraft}
      />
    </div>
  )
}

// los comentarios de una sección: una fila con su contador que despliega la lista (abierta si hay algo por atender) y, mientras la
// versión está en revisión, el formulario para añadir uno
function SectionComments({
  versionId,
  section,
  label,
  comments,
  canComment,
  onDraft,
  empty = false
}: {
  versionId: string
  section: string
  label: string
  comments: ReviewComment[]
  canComment: boolean
  onDraft: (section: string, written: boolean) => void
  // decir que no hay ninguno
  empty?: boolean
}) {
  const { t, i18n } = useTranslation('review')
  const [writing, setWriting] = useState(false)
  const addComment = useFocusOnClose<HTMLButtonElement>(writing)
  // lo abierto primero; dentro de cada grupo, el orden del servidor
  const mine = comments.filter((comment) => comment.section === section).sort((a, b) => Number(a.resolved) - Number(b.resolved))
  const open = mine.filter((comment) => !comment.resolved).length
  const resolved = mine.length - open
  const [expanded, setExpanded] = useState(open > 0)
  const listId = useId()
  // uno nuevo se ve; al resolver el último no se pliega de golpe
  useEffect(() => {
    if (open > 0) setExpanded(true)
  }, [open])
  if (mine.length === 0 && !canComment && !empty) return null
  const locale = i18n.language
  const counts = [
    ...(open > 0 ? [t('comments.openCount', { count: open, value: formatNumber(open, locale) })] : []),
    ...(resolved > 0 ? [t('comments.resolvedCount', { count: resolved, value: formatNumber(resolved, locale) })] : [])
  ]
  const Chevron = expanded ? ChevronDown : ChevronRight
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {mine.length > 0 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
            className="-ml-1 inline-flex min-h-11 cursor-pointer flex-wrap items-center gap-1.5 rounded-sm px-1 hover:bg-surface-muted sm:min-h-8"
          >
            <Chevron aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
            {/* el nombre sale del texto, sin aria-label: lo que se ve está en lo que se anuncia (WCAG 2.5.3) */}
            <span className="sr-only">{t('comments.toggle', { section: label })}</span>{' '}
            {open > 0 ? <StatusBadge state="warning">{counts[0]}</StatusBadge> : null}{' '}
            {resolved > 0 ? <StatusBadge state="done">{counts[counts.length - 1]}</StatusBadge> : null}
          </button>
        ) : empty && !writing ? (
          <p className="text-sm text-ink-muted">{t('comments.none')}</p>
        ) : (
          <span />
        )}
        {canComment && !writing ? (
          <Button
            ref={addComment}
            className={WRAP}
            variant="secondary"
            size="sm"
            aria-label={t('comments.addLabel', { section: label })}
            onClick={() => setWriting(true)}
          >
            {t('comments.add')}
          </Button>
        ) : null}
      </div>
      {mine.length > 0 && expanded ? (
        <ul id={listId} aria-label={t('comments.listLabel', { section: label })} className="flex flex-col divide-y divide-border border-l-2 border-border pl-3">
          {mine.map((comment) => (
            <li key={comment.id} className="py-2 first:pt-0 last:pb-0">
              <CommentItem versionId={versionId} comment={comment} />
            </li>
          ))}
        </ul>
      ) : null}
      {canComment && writing ? <CommentForm versionId={versionId} section={section} label={label} onClose={() => setWriting(false)} onDraft={onDraft} /> : null}
    </div>
  )
}

// el texto de un comentario se pinta como texto, nunca como HTML. su estado, con icono y palabra
function CommentItem({ versionId, comment }: { versionId: string; comment: ReviewComment }) {
  const { t, i18n } = useTranslation('review')
  const resolve = useResolveComment(versionId)
  const describe = useActionError()
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">{comment.text}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <StatusBadge state={comment.resolved ? 'done' : 'warning'}>{comment.resolved ? t('comments.resolved') : t('comments.pending')}</StatusBadge>
        {comment.createdAt ? <span>{formatInstant(comment.createdAt, i18n.language)}</span> : null}
        {comment.resolved ? null : (
          <Button className={WRAP} variant="secondary" size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate(comment.id)}>
            {resolve.isPending ? t('comments.resolving') : t('comments.resolve')}
          </Button>
        )}
      </div>
      {resolve.error ? <Notice tone="danger">{describe(resolve.error)}</Notice> : null}
    </div>
  )
}

function CommentForm({
  versionId,
  section,
  label,
  onClose,
  onDraft
}: {
  versionId: string
  section: string
  label: string
  onClose: () => void
  onDraft: (section: string, written: boolean) => void
}) {
  const { t } = useTranslation('review')
  const id = useId()
  const comment = useComment(versionId)
  const describe = useActionError()
  const [text, setText] = useState('')
  const [empty, setEmpty] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const written = text.trim() !== ''
  useEffect(() => {
    onDraft(section, written)
  }, [onDraft, section, written])
  // al irse el formulario (enviado, descartado o la versión ya no admite comentarios) deja de contar
  useEffect(() => () => onDraft(section, false), [onDraft, section])
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
          autoFocus
          rows={3}
          maxLength={MAX_TEXT}
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
        <p id={`${id}-empty`} role="alert" className="flex items-start gap-1.5 text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{t('comments.empty')}</span>
        </p>
      ) : null}
      {comment.error ? <Notice tone="danger">{describe(comment.error)}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button className={WRAP} type="submit" size="sm" disabled={comment.isPending}>
          {comment.isPending ? t('comments.sending') : t('comments.send')}
        </Button>
        <Button className={WRAP} type="button" variant="secondary" size="sm" onClick={() => (written ? setDiscarding(true) : onClose())}>
          {t('comments.cancel')}
        </Button>
      </div>
      {discarding ? (
        <ReturnFocus>
          <ConfirmDialog
            variant="danger"
            title={t('comments.discardTitle')}
            description={t('comments.discardDescription')}
            confirmLabel={t('comments.discard')}
            cancelLabel={t('comments.keep')}
            onCancel={() => setDiscarding(false)}
            onConfirm={onClose}
          />
        </ReturnFocus>
      ) : null}
    </form>
  )
}

// qué se revisa y qué pasa con cada decisión, a la vista. una sola primaria; aprobar se confirma; pedir cambios y rechazar piden el motivo
// (el servidor responde 400 sin él)
function DecisionPanel({ version, onDone }: { version: StudioVersion; onDone: (notice: string) => void }) {
  const { t, i18n } = useTranslation('review')
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
  const pendingComments =
    version.openComments > 0 ? ` ${t('decide.approveOpen', { count: version.openComments, value: formatNumber(version.openComments, i18n.language) })}` : ''
  return (
    <section aria-labelledby="decide" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="decide" className="text-title-3 text-ink">
          {t('decide.title')}
        </h2>
        <StatusBadge state="review">{t('decide.missing')}</StatusBadge>
      </div>
      <ul className="flex flex-col gap-3">
        {DECISION_ORDER.map((decision) => (
          <li key={decision} className="flex flex-col gap-1">
            <Button
              className={`${WRAP} min-h-11 w-full ${decision === 'RECHAZAR' ? 'text-danger' : ''}`}
              variant={decision === 'APROBAR' ? 'primary' : 'secondary'}
              onClick={() => setAsking(decision)}
            >
              {t(`decide.${decision}`)}
            </Button>
            <p className="text-sm text-ink-muted">{t(`decide.effect.${decision}`)}</p>
          </li>
        ))}
      </ul>
      {asking === 'APROBAR' ? (
        <ReturnFocus>
          <ConfirmDialog
            variant="primary"
            title={t('decide.approveTitle')}
            description={`${t('decide.approveDescription')}${pendingComments}`}
            confirmLabel={t('decide.APROBAR')}
            cancelLabel={t('decide.cancel')}
            busy={decide.isPending}
            error={error}
            onCancel={close}
            onConfirm={() => send('APROBAR', null)}
          />
        </ReturnFocus>
      ) : asking ? (
        <ReturnFocus>
          <ReasonDialog decision={asking} busy={decide.isPending} error={error} onCancel={close} onConfirm={(reason) => send(asking, reason)} />
        </ReturnFocus>
      ) : null}
    </section>
  )
}

// el motivo, con la etiqueta diciendo quién lo leerá. ReasonDialog de core es para X-Change-Reason y no deja cambiar la etiqueta, y su
// límite es el de la cabecera: aquí el motivo va en el cuerpo y el contrato admite 4000
function ReasonDialog({
  decision,
  busy,
  error,
  onCancel,
  onConfirm
}: {
  decision: Decision
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const { t } = useTranslation('review')
  const id = useId()
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = reason.trim()
    setMissing(trimmed === '')
    if (trimmed !== '') onConfirm(trimmed)
  }
  return (
    <ReturnFocus>
      <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold">{t(`decide.${decision}Title`)}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-ink-muted">{t(`decide.${decision}Description`)}</DialogDescription>
          <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-reason`}>{t('decide.reasonLabel')}</Label>
              <Textarea
                id={`${id}-reason`}
                rows={4}
                maxLength={MAX_TEXT}
                value={reason}
                aria-required="true"
                aria-invalid={missing ? true : undefined}
                aria-describedby={missing ? `${id}-missing` : undefined}
                onChange={(event) => {
                  setReason(event.target.value)
                  setMissing(false)
                }}
              />
            </div>
            {missing ? (
              <p id={`${id}-missing`} role="alert" className="flex items-start gap-1.5 text-sm text-danger">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{t('decide.reasonRequired')}</span>
              </p>
            ) : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" className={WRAP} disabled={busy} onClick={onCancel}>
                {t('decide.cancel')}
              </Button>
              <Button type="submit" variant={decision === 'RECHAZAR' ? 'danger' : 'primary'} className={WRAP} disabled={busy}>
                {t(`decide.${decision}`)}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ReturnFocus>
  )
}

function PublishPanel({ version, onDone }: { version: StudioVersion; onDone: (notice: string) => void }) {
  const { t } = useTranslation('review')
  const publish = usePublish(version.id)
  const describe = useActionError()
  const [confirming, setConfirming] = useState(false)
  return (
    <section aria-labelledby="publish" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="publish" className="text-title-3 text-ink">
          {t('publish.title')}
        </h2>
        <StatusBadge state="active">{t('publish.missing')}</StatusBadge>
      </div>
      <p className="text-sm text-ink-muted">{t('publish.hint')}</p>
      <Button className={`${WRAP} min-h-11 w-full`} onClick={() => setConfirming(true)}>
        {t('publish.action')}
      </Button>
      {confirming ? (
        <ReturnFocus>
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
        </ReturnFocus>
      ) : null}
    </section>
  )
}

// la más reciente primero, como la línea de estados. el contrato identifica a quien decidió solo por su id: no se muestra
function DecisionHistory({ decisions }: { decisions: ReviewDecision[] }) {
  const { t, i18n } = useTranslation('review')
  return (
    <Section title={t('history.title')}>
      {decisions.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('history.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-3 text-sm">
          {[...decisions].reverse().map((decision) => (
            <li key={`${decision.at}-${decision.decision}`} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <StatusBadge state={DECISION_BADGE[decision.decision]}>{t(`decision.${decision.decision}`)}</StatusBadge>
                <span className="text-xs text-ink-muted">{formatInstant(decision.at, i18n.language)}</span>
              </p>
              {decision.reason ? <p className="whitespace-pre-line text-ink [overflow-wrap:anywhere]">{decision.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}
