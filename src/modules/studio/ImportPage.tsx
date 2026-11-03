import { useQueryClient } from '@tanstack/react-query'
import { ApiError, LoadingState, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { Circle, CircleAlert, CircleCheck, CircleDot, CircleX, LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { Notice } from '../../shared/Notice'
import { problemKind, ProblemState } from '../../shared/ProblemState'
import { Breadcrumbs, ScreenBody, ScreenHeader, Section, Stat, StatList } from '../../shared/Screen'
import { studioKeys } from './api'
import {
  IMPORT_PROBLEM_KINDS,
  IMPORT_SEVERITIES,
  SHA_PATTERN,
  type ImportJob,
  type ImportProblem,
  type ImportProblemKind,
  type ImportReport,
  type ImportSeverity,
  type ImportSource,
  type ImportStatus
} from './contract'
import {
  IMPORT_POLL_MS,
  importKeys,
  isFinished,
  isValidPath,
  MAX_PATH,
  parseSourceRef,
  sourceRef,
  useImportCourses,
  useImportJob,
  useImportSources,
  useStartImport
} from './importApi'
import { ImportJobs } from './ImportJobs'
import { STUDIO_ROUTES } from './routes'

// lo escrito en el formulario: vive en la página para que un fallo deje volver a intentarlo sin perderlo
interface ImportDraft {
  // por posición: un mismo repositorio puede estar permitido en más de un commit
  selected: number
  typedSha: string
  path: string
  courseId: string
}

const EMPTY_DRAFT: ImportDraft = { selected: 0, typedSha: '', path: '', courseId: '' }

// el formulario con lo que pidió un trabajo; null si su origen ya no está entre los permitidos
function draftFromJob(job: ImportJob, sources: ImportSource[]): ImportDraft | null {
  const ref = parseSourceRef(job.source)
  if (!ref) return null
  const selected = sources.findIndex((source) => source.repository === ref.repository && (source.sha === null || source.sha === ref.sha))
  if (selected < 0) return null
  return { selected, typedSha: sources[selected]!.sha ? '' : ref.sha, path: ref.path, courseId: job.courseId }
}

// importar un manual AsciiDoc a un borrador (ADR-0018 §5): orígenes permitidos, el formulario, el estado del trabajo y su
// informe. pollInterval solo lo cambian las pruebas
export function ImportPage({ pollInterval = IMPORT_POLL_MS }: { pollInterval?: number }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const queryClient = useQueryClient()
  const sources = useImportSources()
  const [opened, setOpened] = useState<{ id: string; fromList: boolean } | null>(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const refused = sources.error instanceof ApiError && sources.error.status === 403
  // lo que tenía el foco desaparece al cambiar de vista: el foco pasa al cuerpo de la pantalla
  const body = useRef<HTMLDivElement>(null)
  const openedId = opened?.id ?? null
  const shownId = useRef(openedId)
  useEffect(() => {
    if (shownId.current === openedId) return
    shownId.current = openedId
    body.current?.focus()
  }, [openedId])
  return (
    <>
      <ScreenHeader
        width="reading"
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        breadcrumbs={
          <Breadcrumbs
            label={t('version.breadcrumbs')}
            items={[{ label: t('versions.title'), to: links.to(STUDIO_ROUTES.versions) }, { label: t('import.title') }]}
          />
        }
      />
      <ScreenBody width="reading">
        <div ref={body} tabIndex={-1} className="flex flex-col gap-8 outline-none">
          {opened ? (
            <JobPanel
              id={opened.id}
              interval={pollInterval}
              fromList={opened.fromList}
              onRetry={(job) => {
                const restored = sources.data ? draftFromJob(job, sources.data) : null
                if (restored) setDraft(restored)
                setOpened(null)
              }}
              onBack={() => setOpened(null)}
              onAnother={() => {
                setDraft(EMPTY_DRAFT)
                setOpened(null)
              }}
            />
          ) : (
            <>
              {/* sin permiso para importar, ya lo explica el aviso de abajo */}
              {refused ? null : (
                <ImportJobs
                  interval={pollInterval}
                  onOpen={(job) => {
                    // lo que ya se sabe de él se ve enseguida, sin pasar por «Consultando…»
                    queryClient.setQueryData(importKeys.job(job.id), job)
                    setOpened({ id: job.id, fromList: true })
                  }}
                />
              )}
              {sources.isError ? (
                <SourcesProblem error={sources.error} onRetry={() => void sources.refetch()} />
              ) : sources.data ? (
                <>
                  {sources.data.length === 0 ? null : <ImportSteps stage="form" />}
                  <Sources sources={sources.data} />
                  {sources.data.length === 0 ? null : (
                    <ImportForm sources={sources.data} draft={draft} onChange={setDraft} onStarted={(id) => setOpened({ id, fromList: false })} />
                  )}
                </>
              ) : (
                <LoadingState label={t('import.loading')} />
              )}
            </>
          )}
        </div>
      </ScreenBody>
    </>
  )
}

const STEPS = ['source', 'queue', 'run', 'result'] as const

// en qué paso va: el formulario y los estados del trabajo, tal cual. sin porcentajes: el contrato no los da
const STEP_OF: Record<ImportStatus | 'form', number> = { form: 0, PENDIENTE: 1, EN_CURSO: 2, HECHO: 3, FALLIDO: 3 }

// icono y palabra en cada paso; lo que ya pasó o falta, también en palabra para quien no ve el icono
function ImportSteps({ stage }: { stage: ImportStatus | 'form' }) {
  const { t } = useTranslation('studio')
  const current = STEP_OF[stage]
  const failed = stage === 'FALLIDO'
  const finished = stage === 'HECHO'
  const working = stage === 'PENDIENTE' || stage === 'EN_CURSO'
  return (
    <ol aria-label={t('import.steps.label')} className="grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const isCurrent = index === current
        const done = index < current || (isCurrent && finished)
        const failedHere = isCurrent && failed
        const Icon: LucideIcon = failedHere ? CircleX : done ? CircleCheck : isCurrent ? (working ? LoaderCircle : CircleDot) : Circle
        const tone = failedHere ? 'text-danger' : done ? 'text-success' : isCurrent ? 'text-brand-strong' : 'text-ink-muted'
        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex min-w-0 flex-col gap-1 border-t-2 pt-2 text-sm ${isCurrent ? 'border-current font-semibold text-ink' : 'border-border text-ink-muted'}`}
          >
            <Icon aria-hidden="true" className={`size-4 shrink-0 ${tone} ${isCurrent && working ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            <span>{failedHere ? t('import.steps.failed') : t(`import.steps.${step}`)}</span>
            {done ? (
              <span className="sr-only">{t('import.steps.done')}</span>
            ) : !isCurrent ? (
              <span className="sr-only">{t('import.steps.pending')}</span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

// sin permiso, el servidor responde 403 a los orígenes: se explica qué hace falta, sin reintentar
function SourcesProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  const description =
    kind === 'refused' && status === 403
      ? t('import.problem.refusedHint')
      : t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })
  return (
    <ProblemState title={t(`import.problem.${kind}`)} description={description}>
      {status === 403 ? null : (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('problem.retry')}
        </Button>
      )}
    </ProblemState>
  )
}

function Sources({ sources }: { sources: ImportSource[] }) {
  const { t } = useTranslation('studio')
  return (
    <Section title={t('import.sources.title')} description={sources.length > 0 ? t('import.sources.hint') : undefined}>
      {sources.length === 0 ? (
        <div className="flex max-w-prose flex-col gap-1">
          <p className="text-base font-semibold text-ink">{t('import.sources.empty')}</p>
          <p className="text-sm text-ink-muted">{t('import.sources.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border text-sm">
          {sources.map((source) => (
            <li key={`${source.repository}@${source.sha ?? ''}`} className="flex flex-wrap gap-x-3 gap-y-0.5 py-2">
              <span className="font-mono break-all text-ink">{source.repository}</span>
              <span className="break-all text-ink-muted">{source.sha ? t('import.sources.pinned', { sha: source.sha }) : t('import.sources.anyCommit')}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

type FieldErrors = { sha?: string | undefined; path?: string | undefined; course?: string | undefined }

// la ayuda de un campo o, si no vale, por qué: con icono, el color nunca va solo
function FieldHelp({ id, error, hint }: { id: string; error?: string | undefined; hint?: string | undefined }) {
  if (error)
    return (
      <p id={id} className="flex items-start gap-1.5 text-sm text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0">{error}</span>
      </p>
    )
  return hint ? (
    <p id={id} className="text-sm text-ink-muted">
      {hint}
    </p>
  ) : null
}

function ImportForm({
  sources,
  draft,
  onChange,
  onStarted
}: {
  sources: ImportSource[]
  draft: ImportDraft
  onChange: (draft: ImportDraft) => void
  onStarted: (jobId: string) => void
}) {
  const { t } = useTranslation('studio')
  const id = useId()
  const courses = useImportCourses()
  const start = useStartImport()
  const describe = useStartError()
  const { selected, typedSha, path, courseId } = draft
  const [errors, setErrors] = useState<FieldErrors>({})
  const source = sources[selected] ?? sources[0]!
  const sha = source.sha ?? typedSha.trim().toLowerCase()
  const cleanPath = path.trim()
  const ready = SHA_PATTERN.test(sha) && isValidPath(cleanPath)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: FieldErrors = {
      ...(SHA_PATTERN.test(sha) ? {} : { sha: t('import.form.shaInvalid') }),
      ...(isValidPath(cleanPath) ? {} : { path: t('import.form.pathInvalid') }),
      ...(courseId ? {} : { course: t('import.form.courseRequired') })
    }
    setErrors(found)
    const first = found.sha ? 'sha' : found.path ? 'path' : found.course ? 'course' : null
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return
    }
    start.mutate({ source: sourceRef(source.repository, sha, cleanPath), courseId }, { onSuccess: (job) => onStarted(job.id) })
  }

  return (
    <Section title={t('import.form.title')}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-repository`}>{t('import.form.repository')}</Label>
          <Select
            value={String(sources[selected] ? selected : 0)}
            onValueChange={(value) => {
              setErrors({ ...errors, sha: undefined })
              onChange({ ...draft, selected: Number(value) })
            }}
          >
            <SelectTrigger id={`${id}-repository`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sources.map((option, index) => (
                <SelectItem key={`${option.repository}@${option.sha ?? ''}`} value={String(index)}>
                  {option.repository}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sha`}>{t('import.form.sha')}</Label>
          <Input
            id={`${id}-sha`}
            className="font-mono"
            value={source.sha ?? typedSha}
            readOnly={source.sha !== null}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.sha ? true : undefined}
            aria-describedby={`${id}-sha-help`}
            onChange={(event) => {
              setErrors({ ...errors, sha: undefined })
              onChange({ ...draft, typedSha: event.target.value })
            }}
          />
          <FieldHelp id={`${id}-sha-help`} error={errors.sha} hint={source.sha ? t('import.form.shaPinned') : t('import.form.shaHint')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-path`}>{t('import.form.path')}</Label>
          <Input
            id={`${id}-path`}
            className="font-mono"
            value={path}
            maxLength={MAX_PATH}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.path ? true : undefined}
            aria-describedby={`${id}-path-help`}
            onChange={(event) => {
              setErrors({ ...errors, path: undefined })
              onChange({ ...draft, path: event.target.value })
            }}
          />
          <FieldHelp id={`${id}-path-help`} error={errors.path} hint={t('import.form.pathHint')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-course`}>{t('import.form.course')}</Label>
          {courses.isError ? (
            <div className="flex flex-wrap items-center gap-3">
              <Alert tone="danger">{t('import.form.coursesFailed')}</Alert>
              <Button type="button" variant="secondary" size="sm" onClick={() => void courses.refetch()}>
                {t('problem.retry')}
              </Button>
            </div>
          ) : courses.data && courses.data.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('import.form.coursesEmpty')}</p>
          ) : (
            <Select
              value={courseId}
              onValueChange={(value) => {
                setErrors({ ...errors, course: undefined })
                onChange({ ...draft, courseId: value })
              }}
              disabled={!courses.data}
            >
              <SelectTrigger
                id={`${id}-course`}
                aria-invalid={errors.course ? true : undefined}
                aria-describedby={errors.course ? `${id}-course-help` : undefined}
              >
                <SelectValue placeholder={courses.data ? t('import.form.coursePlaceholder') : t('import.form.coursesLoading')} />
              </SelectTrigger>
              <SelectContent>
                {(courses.data ?? []).map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code ? t('import.form.courseOption', { title: course.title, code: course.code }) : course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldHelp id={`${id}-course-help`} error={errors.course} />
        </div>

        {ready ? (
          <p className="text-sm break-all text-ink-muted">{t('import.form.preview', { source: sourceRef(source.repository, sha, cleanPath) })}</p>
        ) : null}
        <p className="max-w-prose text-sm text-ink-muted">{t('import.form.note')}</p>
        {start.error ? <Notice tone="danger">{describe(start.error)}</Notice> : null}
        <Button type="submit" className={`self-start ${WRAP}`} disabled={start.isPending}>
          {start.isPending ? t('import.form.submitting') : t('import.form.submit')}
        </Button>
      </form>
    </Section>
  )
}

// los rechazos de POST /studio/import: 400 la fuente o el curso mal formados, 403 sin permiso o con un origen no
// permitido, 404 el curso no existe
function useStartError() {
  const { t } = useTranslation('studio')
  return (error: unknown): string => {
    if (error instanceof TypeError) return t('import.error.network')
    if (!(error instanceof ApiError)) return t('import.error.unexpected')
    if (error.status === 400 || error.status === 422)
      return t('import.error.invalid', {
        detail: [error.message, ...error.violations.map((violation) => `${violation.field}: ${violation.message}`)].join(' — ')
      })
    if (error.status === 403) return t('import.error.refused')
    if (error.status === 404) return t('import.error.courseNotFound')
    if (error.status === 429) return t('import.error.tooMany')
    return t('import.error.failed', { status: error.status })
  }
}

function JobPanel({
  id,
  interval,
  fromList,
  onRetry,
  onBack,
  onAnother
}: {
  id: string
  interval: number
  // abierto desde la lista, volver no borra lo escrito en el formulario
  fromList: boolean
  onRetry: (job: ImportJob) => void
  onBack: () => void
  onAnother: () => void
}) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  const queryClient = useQueryClient()
  const query = useImportJob(id, interval)
  const job = query.data
  const status = job?.status
  // el borrador nuevo ya está entre «Mis versiones»
  useEffect(() => {
    if (status === 'HECHO') void queryClient.invalidateQueries({ queryKey: studioKeys.versions })
  }, [status, queryClient])
  const lost = query.isError && problemKind(query.error) === 'notFound'
  return (
    <>
      {status ? <ImportSteps stage={status} /> : null}
      <Section title={t('import.job.title')}>
        {/* solo la palabra del estado: si no cambia, el DOM no cambia y una consulta más no se anuncia */}
        <p role="status" aria-live="polite" className="text-base font-semibold text-ink">
          {job ? t(`import.status.${job.status}`) : t('import.job.loading')}
        </p>
        {job ? <JobState job={job} /> : null}
        {query.isError ? <JobProblem error={query.error} onRetry={() => void query.refetch()} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          {status === 'HECHO' && job?.versionId ? (
            <Button asChild variant="primary" className="min-h-11">
              <Link to={links.to(STUDIO_ROUTES.version, { id: job.versionId })}>{t('import.job.openDraft')}</Link>
            </Button>
          ) : null}
          {status === 'FALLIDO' ? (
            <Button variant="primary" className={WRAP} onClick={() => onRetry(job!)}>
              {t('import.job.retry')}
            </Button>
          ) : null}
          {(isFinished(status) || lost) && !fromList ? (
            <Button variant="secondary" className={WRAP} onClick={onAnother}>
              {t('import.job.another')}
            </Button>
          ) : (
            <Button variant="secondary" className={WRAP} onClick={onBack}>
              {t('import.job.back')}
            </Button>
          )}
        </div>
      </Section>
      {job?.report ? <Report report={job.report} /> : null}
    </>
  )
}

function JobState({ job }: { job: ImportJob }) {
  const { t } = useTranslation('studio')
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-prose text-sm text-ink-muted">{t(`import.statusHint.${job.status}`)}</p>
      {!isFinished(job.status) && job.error ? <p className="text-sm break-all text-ink-muted">{t('import.job.transient', { error: job.error })}</p> : null}
      {job.status === 'FALLIDO' ? (
        <>
          <Notice tone="danger">
            <span className="[overflow-wrap:anywhere]">{t('import.job.failed', { error: job.error ?? t('import.job.noReason') })}</span>
          </Notice>
          <p className="max-w-prose text-sm text-ink-muted">{t('import.job.failedHint')}</p>
        </>
      ) : null}
    </div>
  )
}

// un 404 es la respuesta para lo ajeno y para lo terminado que ya se purgó: no se reintenta. lo demás para el sondeo hasta «Reintentar»
function JobProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  if (kind === 'notFound') return <ProblemState title={t('import.job.notFound')} description={t('import.job.notFoundHint')} />
  return (
    <ProblemState
      title={t(`import.problem.${kind}`)}
      description={t(kind === 'server' && status === undefined ? 'problem.hint.unexpected' : `problem.hint.${kind}`, { status })}
    >
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('problem.retry')}
      </Button>
    </ProblemState>
  )
}

const COUNTS = ['units', 'lessons', 'sections', 'files', 'includes', 'images'] as const

const isKnownKind = (kind: string): kind is ImportProblemKind => (IMPORT_PROBLEM_KINDS as readonly string[]).includes(kind)

const SEVERITY_ICON: Record<ImportSeverity, LucideIcon> = { GAP: CircleAlert, CHECK: TriangleAlert }
const SEVERITY_TONE: Record<ImportSeverity, string> = { GAP: 'text-danger', CHECK: 'text-warning' }

// el informe: primero lo que pide atención y las cifras; después cada aviso, lo más grave primero. origin y detail vienen del manual
// (dato no confiable): se pintan como texto
function Report({ report }: { report: ImportReport }) {
  const { t, i18n } = useTranslation('studio')
  const locale = i18n.language
  // por gravedad del servidor; dentro, los tipos conocidos en su orden y al final los que la interfaz aún no nombra
  const groups = IMPORT_SEVERITIES.flatMap((severity) => {
    const problems = report.problems.filter((problem) => problem.severity === severity)
    const unnamed = problems.filter((problem) => !isKnownKind(problem.kind))
    return [
      ...IMPORT_PROBLEM_KINDS.map((kind) => ({ kind, severity, problems: problems.filter((problem) => problem.kind === kind) })),
      { kind: null, severity, problems: unnamed }
    ]
  }).filter((group) => group.problems.length > 0)
  const partial = report.problems.length < report.problemCount
  return (
    <Section title={t('import.report.title')}>
      <p className="text-sm break-all text-ink-muted">{t('import.report.source', { source: report.source })}</p>
      {report.problemCount === 0 ? (
        <Notice tone="success">{t('import.report.noProblems')}</Notice>
      ) : (
        <>
          <p className="text-sm text-ink">
            {t('import.report.problems', { count: report.problemCount, value: formatNumber(report.problemCount, locale) })}
            {partial
              ? ` ${t('import.report.truncated', { shown: formatNumber(report.problems.length, locale), total: formatNumber(report.problemCount, locale) })}`
              : null}
          </p>
          <div role="group" aria-label={t('import.report.bySeverity')}>
            <StatList>
              {IMPORT_SEVERITIES.map((severity) => (
                <Stat
                  key={severity}
                  icon={SEVERITY_ICON[severity]}
                  label={t(`import.severity.${severity}`)}
                  value={formatNumber(report.problemsBySeverity[severity], locale)}
                />
              ))}
            </StatList>
          </div>
          {partial ? <p className="text-sm text-ink-muted">{t('import.report.partial')}</p> : null}
        </>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-y border-border py-3 text-sm sm:grid-cols-3">
        {COUNTS.map((count) => (
          <div key={count} className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t(`import.report.${count}`)}</dt>
            <dd className="font-medium text-ink tabular-nums">{formatNumber(report[count], locale)}</dd>
          </div>
        ))}
      </dl>
      {groups.map((group) => (
        <ProblemGroup key={`${group.severity}:${group.kind ?? ''}`} {...group} />
      ))}
    </Section>
  )
}

// kind null: los tipos que la interfaz aún no nombra
function ProblemGroup({ kind, severity, problems }: { kind: ImportProblemKind | null; severity: ImportSeverity; problems: ImportProblem[] }) {
  const { t, i18n } = useTranslation('studio')
  const Icon = SEVERITY_ICON[severity]
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-base font-semibold text-ink">
          {t('import.report.group', {
            kind: kind ? t(`import.kind.${kind}`) : t('import.report.otherKind'),
            value: formatNumber(problems.length, i18n.language)
          })}
        </h3>
        <span className={`inline-flex items-center gap-1 text-sm ${SEVERITY_TONE[severity]}`}>
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          {t(`import.severity.${severity}`)}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border border-l-2 border-border pl-3 text-sm">
        {problems.map((problem, index) => (
          <li key={`${problem.origin}:${problem.line}:${index}`} className="py-1.5">
            <ProblemItem problem={problem} />
          </li>
        ))}
      </ul>
    </div>
  )
}

// el origen es repo@sha:ruta y la fuente ya se ve arriba: basta el archivo. con otra forma, tal cual
const fileOf = (origin: string) => parseSourceRef(origin)?.path ?? origin

function ProblemItem({ problem }: { problem: ImportProblem }) {
  const { t } = useTranslation('studio')
  const origin = fileOf(problem.origin)
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs break-all text-ink-muted">
        {problem.line === 0 ? t('import.report.wholeFile', { origin }) : t('import.report.line', { origin, line: problem.line })}
      </span>
      <span className="break-all text-ink">{problem.detail}</span>
    </div>
  )
}
