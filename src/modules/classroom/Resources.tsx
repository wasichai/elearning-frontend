import { ApiError } from '@wasichai/core'
import { Button, PdfDialog } from '@wasichai/ui'
import { CircleAlert, Download, Eye, FileText } from 'lucide-react'
import { Component, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, inertBlob, isVideo, NotPdfError, useDownload, useFileBlob, useObjectUrl, usePdfLoader } from '../../shared/files'
import { TEXT_LINK } from '../../shared/buttons'
import { formatFileSize } from './parts'
import { ReadingDocument } from './ReadingDocument'
import { useReading } from './readingApi'
import { DEFAULT_READING_SIZE, type ReadingSize } from './readingPreferences'
import { watchedEnough } from './video'
import { MediaSkeleton, DocumentSkeleton } from '../../shared/PageSkeleton'

// el material de una lección. cómo se muestra cada recurso lo dice su tipo (ADR-0012): HTML en la página, desde su lectura
// en bloques (ADR-0045), y VIDEO en el reproductor del navegador. el PDF y lo que la interfaz no sabe mostrar son archivos: una
// figura en el cuerpo con «Ver» (el PDF) y «Descargar», y un enlace breve en las notas al margen (FileResources).
// onVideoWatched avisa cada vez que el reproductor dice que se vio lo bastante (umbral de RF-AUL-04 o fin): quien lo
// recibe decide enviarlo una sola vez
// reading: lo que la barra de la lección elige para la lectura HTML (tamaño e interlineado). el tema del modo lectura lo
// pone la lección en su contenedor, y la lectura lo toma de los tokens
export interface ReadingSettings {
  size?: ReadingSize
  roomy?: boolean
}

// lo que se lee o se ve en la página
export const isInline = (resource: Pick<Resource, 'type'>) => resource.type === 'HTML' || resource.type === 'VIDEO'

interface ResourcesProps {
  enrollmentId: string
  resources: Resource[]
  videoThreshold?: number
  onVideoWatched?: () => void
  reading?: ReadingSettings
}

// los recursos de la lección, en su orden y todos en el cuerpo (Classroom.dc.html): la lectura y el vídeo se leen o se ven aquí; un PDF u otro
// archivo es una figura con su nombre, «Ver» (solo el PDF) y «Descargar». así una lección de solo archivos no queda vacía, tampoco en modo foco
export function Resources({ enrollmentId, resources, videoThreshold = 1, onVideoWatched, reading }: ResourcesProps) {
  const { t } = useTranslation('classroom')
  // con un solo recurso, su título repetiría el de la lección: queda para quien navega por encabezados
  const onlyOne = resources.length === 1
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => (
        <section key={resource.id} id={resourceAnchor(resource.id)} aria-label={resource.title} className="flex scroll-mt-24 flex-col gap-3">
          <h3 className={onlyOne ? 'sr-only' : 'font-read text-h4 text-ink'}>{resource.title}</h3>
          {!resource.file ? (
            <p className="text-secondary text-ink-muted">{t('resource.noFile')}</p>
          ) : resource.type === 'HTML' ? (
            <HtmlResource enrollmentId={enrollmentId} resourceId={resource.id} reading={reading} />
          ) : resource.type === 'VIDEO' ? (
            <VideoResource file={resource.file} threshold={videoThreshold} onWatched={onVideoWatched} />
          ) : (
            <FileFigure type={resource.type} file={resource.file} />
          )}
        </section>
      ))}
    </div>
  )
}

const resourceAnchor = (id: string) => `recurso-${id}`

// el vocabulario de tipo_recurso es cerrado: un tipo que no está en él no se enseña «tal cual» (HOJA_CALCULO), es un archivo sin más
function useResourceType() {
  const { t } = useTranslation('classroom')
  return (type: string) => t(`resourceType.${type}`, { defaultValue: t('resource.genericType') })
}

// los archivos de la lección en las notas al margen: un enlace breve a su figura en el cuerpo, con tipo y tamaño (Classroom.dc.html, Recursos)
export function FileResources({ resources }: { resources: Resource[] }) {
  const { t, i18n } = useTranslation('classroom')
  const resourceType = useResourceType()
  const files = resources.filter((resource) => !isInline(resource))
  if (files.length === 0) return <p className="font-read text-body text-ink">{t('classroom.noFiles')}</p>
  return (
    <ul className="flex flex-col gap-3">
      {files.map((resource) => {
        const anchor = `#${resourceAnchor(resource.id)}`
        return (
          <li key={resource.id} className="flex flex-col gap-0.5">
            <a href={anchor} className={`${TEXT_LINK} font-semibold [overflow-wrap:anywhere]`}>
              {resource.file?.name ?? resource.title}
            </a>
            <span className="text-secondary text-ink-muted">
              {resource.file
                ? t('resource.kind', { type: resourceType(resource.type), size: formatFileSize(resource.file.size, i18n.language) })
                : t('resource.noFile')}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// un archivo en el cuerpo (Classroom.dc.html, la figura del PDF): su icono, «Documento · tipo · tamaño», el nombre y sus acciones
function FileFigure({ type, file }: { type: string; file: ResourceFile }) {
  const { t, i18n } = useTranslation('classroom')
  const resourceType = useResourceType()
  const { download, pending, error } = useDownload(file)
  const [viewing, setViewing] = useState(false)
  const size = formatFileSize(file.size, i18n.language)
  const pdf = type === 'PDF'
  return (
    <figure className="m-0 grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-5 gap-y-3 border-t border-ink border-b border-b-border py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
      <span aria-hidden="true" className="flex aspect-[3/4] items-center justify-center rounded-card border border-border bg-surface text-ink-muted">
        <FileText className="size-6" />
      </span>
      <figcaption className="flex min-w-0 flex-col gap-1.5">
        <span className="meta">{t('resource.document', { kind: t('resource.kind', { type: resourceType(type), size }) })}</span>
        <span className="text-h5 [overflow-wrap:anywhere] text-ink">{file.name}</span>
        <span className="mt-1 flex flex-wrap gap-2.5">
          {pdf ? (
            <Button variant="secondary" onClick={() => setViewing(true)} aria-label={t('resource.viewLabel', { name: file.name })} className="gap-2">
              <Eye aria-hidden="true" className="size-4" />
              {t('resource.view')}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => void download()}
            disabled={pending}
            aria-label={t('resource.downloadLabel', { name: file.name, size })}
            className="gap-2"
          >
            <Download aria-hidden="true" className="size-4" />
            {pending ? t('resource.downloading') : t('resource.download')}
          </Button>
        </span>
        {error ? <FileProblem error={error} /> : null}
      </figcaption>
      {viewing ? <PdfViewer file={file} onClose={() => setViewing(false)} /> : null}
    </figure>
  )
}

// el visor de @wasichai/ui: se monta abierto y se desmonta al cerrarse. el archivo se baja con la sesión y solo llega si es un PDF de verdad
function PdfViewer({ file, onClose }: { file: ResourceFile; onClose: () => void }) {
  const load = usePdfLoader(file.name)
  return <PdfDialog title={file.name} source={file.url} load={load} onClose={onClose} renderError={(error) => <FileProblemText error={error} />} />
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
  const { t, i18n } = useTranslation('classroom')
  const query = useFileBlob(file)
  const media = useMemo(() => query.data && inertBlob(query.data, isVideo), [query.data])
  const source = useObjectUrl(media)
  const { download, pending, error } = useDownload(file)
  const size = formatFileSize(file.size, i18n.language)
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
        className="aspect-video w-full rounded-card bg-ink"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span aria-hidden="true" className="text-secondary [overflow-wrap:anywhere] text-ink-muted">
          {file.name} · {size}
        </span>
        <Button variant="ghost" onClick={() => void download()} disabled={pending} aria-label={t('resource.downloadLabel', { name: file.name, size })}>
          {pending ? t('resource.downloading') : t('resource.download')}
        </Button>
      </div>
      {error ? <FileProblem error={error} /> : null}
    </div>
  )
}

function FileProblemText({ error }: { error: unknown }) {
  const { t } = useTranslation('classroom')
  return (
    <>
      {error instanceof NotPdfError
        ? t('resource.notPdf')
        : error instanceof ForeignFileError
          ? t('resource.foreign')
          : error instanceof ApiError
            ? t('resource.failedStatus', { status: error.status })
            : t('resource.failed')}
    </>
  )
}

function FileProblem({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation('classroom')
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-danger bg-danger-soft px-4 py-3 text-secondary text-danger">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <FileProblemText error={error} />
      </span>
      {onRetry && !(error instanceof ForeignFileError) ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('resource.retry')}
        </Button>
      ) : null}
    </div>
  )
}
