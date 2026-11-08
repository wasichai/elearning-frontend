import { ApiError } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { CircleAlert, FileText } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, inertBlob, isVideo, useDownload, useFileBlob, useFileText, useObjectUrl } from '../../shared/files'
import { isDarkTheme, useDocumentTheme } from './documentTheme'
import { lockedReading, type ReadingOptions, type ReadingPalette } from './reading'
import { formatFileSize, LESSON_COLUMN } from './parts'
import { watchedEnough } from './video'
import { MediaSkeleton, DocumentSkeleton } from '../../shared/PageSkeleton'

// el material de una lección. cómo se muestra cada recurso lo dice su tipo (ADR-0012): HTML en un iframe aislado,
// VIDEO en el reproductor del navegador; PDF y lo que la interfaz no sabe mostrar, como descarga.
// onVideoWatched avisa cada vez que el reproductor dice que se vio lo bastante (umbral de RF-AUL-04 o fin): quien lo
// recibe decide enviarlo una sola vez
// reading: lo que la barra de la lección elige para la lectura HTML (tamaño, interlineado y el tema del modo lectura)
export interface ReadingSettings extends ReadingOptions {
  theme?: { id: string; colorScheme: 'light' | 'dark' }
}

interface ResourcesProps {
  resources: Resource[]
  videoThreshold?: number
  onVideoWatched?: () => void
  reading?: ReadingSettings
}

export function Resources({ resources, videoThreshold = 1, onVideoWatched, reading }: ResourcesProps) {
  const { t } = useTranslation('classroom')
  if (resources.length === 0) return <p className={`${LESSON_COLUMN} text-sm text-ink-muted`}>{t('resource.none')}</p>
  // con un solo recurso, su título repetiría el de la lección: queda para quien navega por encabezados
  const onlyOne = resources.length === 1
  return (
    <div className="flex flex-col gap-6">
      {resources.map((resource) => (
        // la lectura ocupa toda la columna y centra su propio texto; el resto va en la columna de la lección
        <section
          key={resource.id}
          aria-label={resource.title}
          className={`flex flex-col gap-3 ${resource.type === 'HTML' && resource.file ? '' : LESSON_COLUMN}`}
        >
          <h3 className={onlyOne ? 'sr-only' : resource.type === 'HTML' && resource.file ? `${LESSON_COLUMN} text-title-3 text-ink` : 'text-title-3 text-ink'}>
            {resource.title}
          </h3>
          {resource.file ? (
            <ResourceBody
              type={resource.type}
              title={resource.title}
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
  type: string
  title: string
  file: ResourceFile
  videoThreshold: number
  onVideoWatched?: () => void
  reading?: ReadingSettings
}

function ResourceBody({ type, title, file, videoThreshold, onVideoWatched, reading }: BodyProps) {
  if (type === 'HTML') return <HtmlResource title={title} file={file} reading={reading} />
  if (type === 'VIDEO') return <VideoResource file={file} threshold={videoThreshold} onWatched={onVideoWatched} />
  return <DownloadResource file={file} />
}

// el HTML de la lectura, en un iframe con sandbox vacío: sin scripts, sin formularios, sin ventanas, y con un origen
// opaco (sin allow-same-origin), así ni el contenido ejecuta código ni toca la aplicación ni su sesión. sin saneador:
// lockedReading solo le pone una CSP que no deja pedir nada fuera y le quita los meta refresh
export function HtmlResource({ title, file, reading = {} }: { title: string; file: ResourceFile; reading?: ReadingSettings }) {
  const { t } = useTranslation('classroom')
  const query = useFileText(file)
  // la lectura se pinta con el tema de donde está (el de la página o el del modo lectura de la lección) y se rehace
  // cuando cambia. los tokens se leen del DOM ya pintado: por eso en un efecto de layout y no durante el render
  const theme = useDocumentTheme()
  const host = useRef<HTMLDivElement>(null)
  const [palette, setPalette] = useState<ReadingPalette>()
  const colorScheme = reading.theme?.colorScheme ?? (isDarkTheme(theme) ? 'dark' : 'light')
  useLayoutEffect(() => {
    if (host.current) setPalette(paletteOf(host.current, colorScheme))
  }, [theme, colorScheme, reading.theme?.id])
  const { size, roomy } = reading
  const html = useMemo(
    () => (query.data === undefined || palette === undefined ? undefined : lockedReading(query.data, palette, { size, roomy })),
    [query.data, palette, size, roomy]
  )
  return (
    <div ref={host}>
      {query.isError ? (
        <div className={`${LESSON_COLUMN} py-8`}>
          <FileProblem error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : html === undefined ? (
        <div className="min-h-96">
          <DocumentSkeleton label={t('resource.loading')} />
        </div>
      ) : (
        <iframe
          sandbox=""
          srcDoc={html}
          title={title}
          referrerPolicy="no-referrer"
          // la lectura llena la ventana bajo la barra de la lección y sobre su pie: sin scripts no puede medir su propio alto
          className="block h-[calc(100dvh-11rem)] min-h-96 w-full border-b border-border bg-surface lg:h-[calc(100dvh-7.5rem)]"
        />
      )}
    </div>
  )
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

// los tokens del tema que usa la lectura, resueltos donde está la lectura (un subárbol con otro tema cuenta)
function paletteOf(element: Element, colorScheme: 'light' | 'dark'): ReadingPalette {
  const css = getComputedStyle(element)
  const token = (name: string) => css.getPropertyValue(`--${name}`).trim() || undefined
  return {
    colorScheme,
    background: token('surface'),
    text: token('ink'),
    muted: token('ink-muted'),
    link: token('link'),
    line: token('line'),
    rule: token('border-control')
  }
}
