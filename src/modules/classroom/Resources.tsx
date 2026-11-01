import { ApiError, LoadingState } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, inertBlob, isVideo, useDownload, useFileBlob, useFileText, useObjectUrl } from '../../shared/files'
import { isDarkTheme, useDocumentTheme } from './documentTheme'
import { lockedReading, type ReadingOptions, type ReadingPalette } from './reading'
import { formatFileSize } from './parts'
import { watchedEnough } from './video'

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
  if (resources.length === 0) return <p className="text-sm text-ink-muted">{t('resource.none')}</p>
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => (
        <section key={resource.id} aria-label={resource.title} className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-ink">{resource.title}</h3>
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
  return <p className="text-sm text-ink-muted">{t('resource.noFile')}</p>
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
        <FileProblem error={query.error} onRetry={() => void query.refetch()} />
      ) : html === undefined ? (
        <LoadingState label={t('resource.loading')} />
      ) : (
        <iframe
          sandbox=""
          srcDoc={html}
          title={title}
          referrerPolicy="no-referrer"
          className="h-[75vh] min-h-96 w-full rounded-md border border-border bg-surface"
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
  if (!source) return <LoadingState label={t('resource.loading')} />
  return (
    <div className="flex flex-col gap-2">
      <video
        controls
        preload="metadata"
        src={source}
        onTimeUpdate={onWatched ? (event) => watchedEnough(event.currentTarget, threshold) && onWatched() : undefined}
        onEnded={onWatched}
        className="aspect-video w-full rounded-md bg-ink"
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
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          variant={quiet ? 'ghost' : 'secondary'}

          onClick={() => void download()}
          disabled={pending}
          aria-label={t('resource.downloadLabel', { name: file.name, size })}
        >
          {pending ? t('resource.downloading') : t('resource.download')}
        </Button>
        <span aria-hidden="true" className="text-sm break-all text-ink-muted">
          {file.name} · {size}
        </span>
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
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
      <span>{message}</span>
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
