import { useQueryClient } from '@tanstack/react-query'
import { ApiError, LoadingState, PageHeader, useWasichaiLinks } from '@wasichai/core'
import { Alert, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@wasichai/ui'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { WRAP } from '../../shared/buttons'
import { formatNumber } from '../../shared/format'
import { problemKind, ProblemState } from '../../shared/ProblemState'
import { studioKeys } from './api'
import { IMPORT_PROBLEM_KINDS, SHA_PATTERN, type ImportJob, type ImportProblem, type ImportReport, type ImportSource } from './contract'
import { IMPORT_POLL_MS, isFinished, isValidPath, MAX_PATH, sourceRef, useImportCourses, useImportJob, useImportSources, useStartImport } from './importApi'
import { BackToVersions, LINK } from './parts'
import { STUDIO_ROUTES } from './routes'

// importar un manual AsciiDoc a un borrador (ADR-0018 §5): orígenes permitidos, el formulario, el estado del trabajo y su
// informe. pollInterval solo lo cambian las pruebas
export function ImportPage({ pollInterval = IMPORT_POLL_MS }: { pollInterval?: number }) {
  const { t } = useTranslation('studio')
  const sources = useImportSources()
  const [jobId, setJobId] = useState<string | null>(null)
  return (
    <>
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-8">
        <BackToVersions />
        {jobId ? (
          <JobPanel id={jobId} interval={pollInterval} onAnother={() => setJobId(null)} />
        ) : sources.isError ? (
          <SourcesProblem error={sources.error} onRetry={() => void sources.refetch()} />
        ) : sources.data ? (
          <>
            <Sources sources={sources.data} />
            {sources.data.length === 0 ? null : <ImportForm sources={sources.data} onStarted={setJobId} />}
          </>
        ) : (
          <LoadingState label={t('import.loading')} />
        )}
      </div>
    </>
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
    <section aria-labelledby="import-sources" className="flex flex-col gap-2">
      <h2 id="import-sources" className="text-lg font-semibold text-ink">
        {t('import.sources.title')}
      </h2>
      {sources.length === 0 ? (
        <div className="flex max-w-prose flex-col gap-1">
          <p className="text-base font-semibold text-ink">{t('import.sources.empty')}</p>
          <p className="text-sm text-ink-muted">{t('import.sources.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {sources.map((source) => (
            <li key={`${source.repository}@${source.sha ?? ''}`} className="flex flex-wrap gap-x-2">
              <span className="font-mono text-ink">{source.repository}</span>
              <span className="break-all text-ink-muted">{source.sha ? t('import.sources.pinned', { sha: source.sha }) : t('import.sources.anyCommit')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type FieldErrors = { sha?: string; path?: string; course?: string }

function ImportForm({ sources, onStarted }: { sources: ImportSource[]; onStarted: (jobId: string) => void }) {
  const { t } = useTranslation('studio')
  const id = useId()
  const courses = useImportCourses()
  const start = useStartImport()
  const describe = useStartError()
  // por posición: un mismo repositorio puede estar permitido en más de un commit
  const [selected, setSelected] = useState(0)
  const [typedSha, setTypedSha] = useState('')
  const [path, setPath] = useState('')
  const [courseId, setCourseId] = useState('')
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
    if (Object.keys(found).length > 0) return
    start.mutate({ source: sourceRef(source.repository, sha, cleanPath), courseId }, { onSuccess: (job) => onStarted(job.id) })
  }

  return (
    <section aria-labelledby="import-form" className="flex flex-col gap-4">
      <h2 id="import-form" className="text-lg font-semibold text-ink">
        {t('import.form.title')}
      </h2>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-repository`}>{t('import.form.repository')}</Label>
          <Select value={String(selected)} onValueChange={(value) => setSelected(Number(value))}>
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
            aria-describedby={`${id}-sha-hint`}
            onChange={(event) => setTypedSha(event.target.value)}
          />
          <p id={`${id}-sha-hint`} className={errors.sha ? 'text-sm text-danger' : 'text-sm text-ink-muted'}>
            {errors.sha ?? (source.sha ? t('import.form.shaPinned') : t('import.form.shaHint'))}
          </p>
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
            aria-describedby={`${id}-path-hint`}
            onChange={(event) => setPath(event.target.value)}
          />
          <p id={`${id}-path-hint`} className={errors.path ? 'text-sm text-danger' : 'text-sm text-ink-muted'}>
            {errors.path ?? t('import.form.pathHint')}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-course`}>{t('import.form.course')}</Label>
          {courses.isError ? (
            <div className="flex flex-wrap items-center gap-3">
              <Alert tone="danger">{t('import.form.coursesFailed')}</Alert>
              <Button variant="secondary" size="sm" onClick={() => void courses.refetch()}>
                {t('problem.retry')}
              </Button>
            </div>
          ) : courses.data && courses.data.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('import.form.coursesEmpty')}</p>
          ) : (
            <Select value={courseId} onValueChange={setCourseId} disabled={!courses.data}>
              <SelectTrigger id={`${id}-course`} aria-invalid={errors.course ? true : undefined} aria-describedby={`${id}-course-error`}>
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
          <p id={`${id}-course-error`} className="text-sm text-danger">
            {errors.course ?? ''}
          </p>
        </div>

        {ready ? (
          <p className="text-sm break-all text-ink-muted">{t('import.form.preview', { source: sourceRef(source.repository, sha, cleanPath) })}</p>
        ) : null}
        <p className="max-w-prose text-sm text-ink-muted">{t('import.form.note')}</p>
        {start.error ? <Alert tone="danger">{describe(start.error)}</Alert> : null}
        <Button type="submit" className={`self-start ${WRAP}`} disabled={start.isPending}>
          {start.isPending ? t('import.form.submitting') : t('import.form.submit')}
        </Button>
      </form>
    </section>
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
    return t('import.error.failed', { status: error.status })
  }
}

function JobPanel({ id, interval, onAnother }: { id: string; interval: number; onAnother: () => void }) {
  const { t } = useTranslation('studio')
  const queryClient = useQueryClient()
  const query = useImportJob(id, interval)
  const job = query.data
  const status = job?.status
  // el borrador nuevo ya está entre «Mis versiones»
  useEffect(() => {
    if (status === 'HECHO') void queryClient.invalidateQueries({ queryKey: studioKeys.versions })
  }, [status, queryClient])
  return (
    <section aria-labelledby="import-job" className="flex flex-col gap-4">
      <h2 id="import-job" className="text-lg font-semibold text-ink">
        {t('import.job.title')}
      </h2>
      <p role="status" className="text-base font-semibold text-ink">
        {job ? t(`import.status.${job.status}`) : t('import.job.loading')}
      </p>
      {job ? <JobState job={job} /> : null}
      {query.isError ? <JobProblem error={query.error} onRetry={() => void query.refetch()} /> : null}
      {job?.report ? <Report report={job.report} /> : null}
      {isFinished(status) || (query.isError && problemKind(query.error) === 'notFound') ? (
        <Button variant="secondary" className={`self-start ${WRAP}`} onClick={onAnother}>
          {t('import.job.another')}
        </Button>
      ) : null}
    </section>
  )
}

function JobState({ job }: { job: ImportJob }) {
  const { t } = useTranslation('studio')
  const links = useWasichaiLinks()
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-prose text-sm text-ink-muted">{t(`import.statusHint.${job.status}`)}</p>
      {!isFinished(job.status) && job.error ? <p className="text-sm break-all text-ink-muted">{t('import.job.transient', { error: job.error })}</p> : null}
      {job.status === 'FALLIDO' ? (
        <>
          <Alert tone="danger">{t('import.job.failed', { error: job.error ?? t('import.job.noReason') })}</Alert>
          <p className="max-w-prose text-sm text-ink-muted">{t('import.job.failedHint')}</p>
        </>
      ) : null}
      {job.status === 'HECHO' && job.versionId ? (
        <Link to={links.to(STUDIO_ROUTES.version, { id: job.versionId })} className={`self-start ${LINK}`}>
          {t('import.job.openDraft')}
        </Link>
      ) : null}
    </div>
  )
}

// un 404 es la respuesta para lo ajeno: no se reintenta. lo demás para el sondeo hasta «Reintentar»
function JobProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('studio')
  const kind = problemKind(error)
  const status = error instanceof ApiError ? error.status : undefined
  if (kind === 'notFound')
    return (
      <div role="alert" className="flex max-w-prose flex-col gap-2">
        <p className="text-base font-semibold text-ink">{t('import.job.notFound')}</p>
        <p className="text-sm text-ink-muted">{t('import.job.notFoundHint')}</p>
      </div>
    )
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

const COUNTS = ['files', 'includes', 'sections', 'images', 'units', 'lessons'] as const

// el informe: lo que se leyó y lo que no se resolvió, agrupado por tipo en el orden del contrato. origin y detail vienen
// del manual (dato no confiable): se pintan como texto
function Report({ report }: { report: ImportReport }) {
  const { t, i18n } = useTranslation('studio')
  const locale = i18n.language
  const groups = IMPORT_PROBLEM_KINDS.map((kind) => ({ kind, problems: report.problems.filter((problem) => problem.kind === kind) })).filter(
    (group) => group.problems.length > 0
  )
  return (
    <section aria-labelledby="import-report" className="flex flex-col gap-3">
      <h2 id="import-report" className="text-lg font-semibold text-ink">
        {t('import.report.title')}
      </h2>
      <p className="text-sm break-all text-ink-muted">{t('import.report.source', { source: report.source })}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {COUNTS.map((count) => (
          <div key={count} className="flex justify-between gap-2">
            <dt className="text-ink-muted">{t(`import.report.${count}`)}</dt>
            <dd className="font-medium text-ink">{formatNumber(report[count], locale)}</dd>
          </div>
        ))}
      </dl>
      {report.problemCount === 0 ? (
        <p className="text-sm text-success">{t('import.report.noProblems')}</p>
      ) : (
        <>
          <p className="text-sm text-warning">
            {t('import.report.problems', { count: report.problemCount, value: formatNumber(report.problemCount, locale) })}
            {report.problems.length < report.problemCount
              ? ` ${t('import.report.truncated', { shown: formatNumber(report.problems.length, locale), total: formatNumber(report.problemCount, locale) })}`
              : null}
          </p>
          {groups.map((group) => (
            <div key={group.kind} className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-ink">
                {t('import.report.group', { kind: t(`import.kind.${group.kind}`), value: formatNumber(group.problems.length, locale) })}
              </h3>
              <ul className="flex flex-col gap-1 border-l border-border pl-4 text-sm">
                {group.problems.map((problem, index) => (
                  <li key={`${problem.origin}:${problem.line}:${index}`}>
                    <ProblemItem problem={problem} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

function ProblemItem({ problem }: { problem: ImportProblem }) {
  const { t } = useTranslation('studio')
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs break-all text-ink-muted">
        {problem.line === 0
          ? t('import.report.wholeFile', { origin: problem.origin })
          : t('import.report.line', { origin: problem.origin, line: problem.line })}
      </span>
      <span className="break-all text-ink">{problem.detail}</span>
    </div>
  )
}
