import { ApiError } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CircleAlert, FileText } from 'lucide-react'
import { Component, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, inertBlob, isVideo, useDownload, useFileBlob, useObjectUrl } from '../../shared/files'
import { formatFileSize, LESSON_COLUMN } from './parts'
import { ReadingDocument } from './ReadingDocument'
import { useReading } from './readingApi'
import { DEFAULT_READING_SIZE, type ReadingSize } from './readingPreferences'
import { watchedEnough } from './video'
import { MediaSkeleton, DocumentSkeleton } from '../../shared/PageSkeleton'

// el material de una lección. cómo se muestra cada recurso lo dice su tipo (ADR-0012): HTML en la página, desde su lectura
// en bloques (ADR-0045), VIDEO en el reproductor del navegador; PDF y lo que la interfaz no sabe mostrar, como descarga.
// onVideoWatched avisa cada vez que el reproductor dice que se vio lo bastante (umbral de RF-AUL-04 o fin): quien lo
// recibe decide enviarlo una sola vez
// reading: lo que la barra de la lección elige para la lectura HTML (tamaño e interlineado). el tema del modo lectura lo
// pone la lección en su contenedor, y la lectura lo toma de los tokens
export interface ReadingSettings {
  size?: ReadingSize
  roomy?: boolean
}

interface ResourcesProps {
  enrollmentId: string
  resources: Resource[]
  videoThreshold?: number
  onVideoWatched?: () => void
  reading?: ReadingSettings
}

export function Resources({ enrollmentId, resources, videoThreshold = 1, onVideoWatched, reading }: ResourcesProps) {
  const { t } = useTranslation('classroom')
  if (resources.length === 0) return <p className={`${LESSON_COLUMN} text-sm text-ink-muted`}>{t('resource.none')}</p>
  // con un solo recurso, su título repetiría el de la lección: queda para quien navega por encabezados
  const onlyOne = resources.length === 1
  return (
    <div className="flex flex-col gap-6">
      {resources.map((resource) => (
        <section key={resource.id} aria-label={resource.title} className={`flex flex-col gap-3 ${LESSON_COLUMN}`}>
          <h3 className={onlyOne ? 'sr-only' : 'text-title-3 text-ink'}>{resource.title}</h3>
          {resource.file ? (
            <ResourceBody
              enrollmentId={enrollmentId}
              resourceId={resource.id}
              type={resource.type}
              file={resource.file}
              videoThreshold={videoThreshold}
              onVideoWatched={onVideoWatched}
              reading={reading}
            />
          ) : (
            <NoFile />
          )}
        </section>
      ))}
    </div>
  )
}

function NoFile() {
  const { t } = useTranslation('classroom')
  return <p className="rounded-md border border-dashed border-border-control px-4 py-3 text-sm text-ink-muted">{t('resource.noFile')}</p>
}

interface BodyProps {
  enrollmentId: string
  resourceId: string
  type: string
  file: ResourceFile
  videoThreshold: number
  onVideoWatched?: () => void
  reading?: ReadingSettings
}

function ResourceBody({ enrollmentId, resourceId, type, file, videoThreshold, onVideoWatched, reading }: BodyProps) {
  if (type === 'HTML') return <HtmlResource enrollmentId={enrollmentId} resourceId={resourceId} reading={reading} />
  if (type === 'VIDEO') return <VideoResource file={file} threshold={videoThreshold} onWatched={onVideoWatched} />
  return <DownloadResource file={file} />
}

// la lectura HTML, pintada en la página desde su documento de bloques (ADR-0045): el servidor la sanea y la interfaz la
// pinta con sus componentes, sin HTML del autor (ReadingDocument). su id es el de la versión de recurso
export function HtmlResource({ enrollmentId, resourceId, reading = {} }: { enrollmentId: string; resourceId: string; reading?: ReadingSettings }) {
  const { t } = useTranslation('classroom')
  const query = useReading(enrollmentId, resourceId)
  if (query.isError) return <FileProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data)
    return (
      <div className="min-h-96">
        <DocumentSkeleton label={t('resource.loading')} />
      </div>
    )
  return (
    // un documento que cumple el contrato pero falla al pintarse se queda en su recurso: la lección sigue
    <RenderBoundary key={resourceId} fallback={<FileProblem error={undefined} />}>
      <ReadingDocument document={query.data} size={reading.size ?? DEFAULT_READING_SIZE} roomy={reading.roomy} />
    </RenderBoundary>
  )
}

// un error al pintar sus hijos muestra fallback en lugar de tumbar la página (React solo lo permite con una clase)
class RenderBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// eventos reales del reproductor: timeupdate con lo reproducido (si el umbral no es el final) y ended
function VideoResource({ file, threshold, onWatched }: { file: ResourceFile; threshold: number; onWatched?: () => void }) {
  const { t } = useTranslation('classroom')
  const query = useFileBlob(file)
  const media = useMemo(() => query.data && inertBlob(query.data, isVideo), [query.data])
  const source = useObjectUrl(media)
  if (query.isError) return <FileProblem error={query.error} onRetry={() => void query.refetch()} />
  if (!source) return <MediaSkeleton label={t('resource.loading')} />
  return (
    <div className="flex flex-col gap-2">
      <video
        controls
        preload="metadata"
        src={source}
        onTimeUpdate={onWatched ? (event) => watchedEnough(event.currentTarget, threshold) && onWatched() : undefined}
        onEnded={onWatched}
        className="aspect-video w-full rounded-lg bg-ink"
      />
      <DownloadResource file={file} quiet />
    </div>
  )
}

function DownloadResource({ file, quiet = false }: { file: ResourceFile; quiet?: boolean }) {
  const { t, i18n } = useTranslation('classroom')
  const { download, pending, error } = useDownload(file)
  const size = formatFileSize(file.size, i18n.language)
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${quiet ? '' : 'rounded-lg border border-border bg-surface p-3'}`}>
        <span aria-hidden="true" className="flex min-w-0 items-center gap-2.5 text-sm break-all text-ink">
          <FileText className="size-5 shrink-0 text-ink-muted" />
          <span>
            {file.name} <span className="whitespace-nowrap text-ink-muted">{size}</span>
          </span>
        </span>
        <Button
          variant={quiet ? 'ghost' : 'secondary'}
          onClick={() => void download()}
          disabled={pending}
          aria-label={t('resource.downloadLabel', { name: file.name, size })}
        >
          {pending ? t('resource.downloading') : t('resource.download')}
        </Button>
      </div>
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
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && !(error instanceof ForeignFileError) ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('resource.retry')}
        </Button>
      ) : null}
    </div>
  )
}
