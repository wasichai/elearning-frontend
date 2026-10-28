import { ApiError, LoadingState } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import type { ReactEventHandler } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, useDownload, useFileBlob, useFileText, useObjectUrl } from './files'
import { formatFileSize } from './parts'

// el material de una lección. cómo se muestra cada recurso lo dice su tipo (ADR-0012): HTML en un iframe aislado,
// VIDEO en el reproductor del navegador; PDF y lo que la interfaz no sabe mostrar, como descarga
export function Resources({ resources, onVideoEnded }: { resources: Resource[]; onVideoEnded?: ReactEventHandler<HTMLVideoElement> }) {
  const { t } = useTranslation('classroom')
  if (resources.length === 0) return <p className="text-sm text-ink-muted">{t('resource.none')}</p>
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => (
        <section key={resource.id} aria-label={resource.title} className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-ink">{resource.title}</h3>
          {resource.file ? <ResourceBody type={resource.type} title={resource.title} file={resource.file} onVideoEnded={onVideoEnded} /> : <NoFile />}
        </section>
      ))}
    </div>
  )
}

function NoFile() {
  const { t } = useTranslation('classroom')
  return <p className="text-sm text-ink-muted">{t('resource.noFile')}</p>
}

interface BodyProps {
  type: string
  title: string
  file: ResourceFile
  onVideoEnded?: ReactEventHandler<HTMLVideoElement>
}

function ResourceBody({ type, title, file, onVideoEnded }: BodyProps) {
  if (type === 'HTML') return <HtmlResource title={title} file={file} />
  if (type === 'VIDEO') return <VideoResource file={file} onEnded={onVideoEnded} />
  return <DownloadResource file={file} />
}

// el HTML de la lectura, en un iframe con sandbox vacío: sin scripts, sin formularios, sin ventanas, y con un origen
// opaco (sin allow-same-origin), así ni el contenido ejecuta código ni toca la aplicación ni su sesión. sin saneador
export function HtmlResource({ title, file }: { title: string; file: ResourceFile }) {
  const { t } = useTranslation('classroom')
  const query = useFileText(file)
  if (query.isError) return <FileProblem error={query.error} onRetry={() => void query.refetch()} />
  if (query.data === undefined) return <LoadingState label={t('resource.loading')} />
  return (
    <iframe
      sandbox=""
      srcDoc={query.data}
      title={title}
      referrerPolicy="no-referrer"
      className="h-[75vh] min-h-96 w-full rounded-md border border-border bg-white"
    />
  )
}

function VideoResource({ file, onEnded }: { file: ResourceFile; onEnded?: ReactEventHandler<HTMLVideoElement> }) {
  const { t } = useTranslation('classroom')
  const query = useFileBlob(file)
  const source = useObjectUrl(query.data)
  if (query.isError) return <FileProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!source) return <LoadingState label={t('resource.loading')} />
  return (
    <div className="flex flex-col gap-2">
      <video controls preload="metadata" src={source} onEnded={onEnded} className="aspect-video w-full rounded-md bg-ink" />
      <DownloadResource file={file} quiet />
    </div>
  )
}

function DownloadResource({ file, quiet = false }: { file: ResourceFile; quiet?: boolean }) {
  const { t, i18n } = useTranslation('classroom')
  const { download, pending, error } = useDownload(file)
  const size = formatFileSize(file.size, i18n.language)
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={quiet ? 'ghost' : 'secondary'}
        size="sm"
        onClick={() => void download()}
        disabled={pending}
        aria-label={t('resource.downloadLabel', { name: file.name, size })}
      >
        {pending ? t('resource.downloading') : t('resource.download')}
        <span className="font-normal text-ink-muted">
          {file.name} · {size}
        </span>
      </Button>
      {error ? <FileProblem error={error} /> : null}
    </div>
  )
}

function FileProblem({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation('classroom')
  const message =
    error instanceof ForeignFileError
      ? t('resource.foreign')
      : error instanceof ApiError
        ? t('resource.failedStatus', { status: error.status })
        : t('resource.failed')
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
      <span>{message}</span>
      {onRetry && !(error instanceof ForeignFileError) ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('resource.retry')}
        </Button>
      ) : null}
    </div>
  )
}
