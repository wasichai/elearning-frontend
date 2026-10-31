import { ApiError, LoadingState } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { Resource, ResourceFile } from './contract'
import { ForeignFileError, inertBlob, isVideo, useDownload, useFileBlob, useFileText, useObjectUrl } from '../../shared/files'
import { lockedReading, type ReadingPalette } from './reading'
import { formatFileSize } from './parts'
import { watchedEnough } from './video'

// el material de una lección. cómo se muestra cada recurso lo dice su tipo (ADR-0012): HTML en un iframe aislado,
// VIDEO en el reproductor del navegador; PDF y lo que la interfaz no sabe mostrar, como descarga.
// onVideoWatched avisa cada vez que el reproductor dice que se vio lo bastante (umbral de RF-AUL-04 o fin): quien lo
// recibe decide enviarlo una sola vez
export function Resources({ resources, videoThreshold = 1, onVideoWatched }: { resources: Resource[]; videoThreshold?: number; onVideoWatched?: () => void }) {
  const { t } = useTranslation('classroom')
  if (resources.length === 0) return <p className="text-sm text-ink-muted">{t('resource.none')}</p>
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => (
        <section key={resource.id} aria-label={resource.title} className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-ink">{resource.title}</h3>
          {resource.file ? (
            <ResourceBody type={resource.type} title={resource.title} file={resource.file} videoThreshold={videoThreshold} onVideoWatched={onVideoWatched} />
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
}

function ResourceBody({ type, title, file, videoThreshold, onVideoWatched }: BodyProps) {
  if (type === 'HTML') return <HtmlResource title={title} file={file} />
  if (type === 'VIDEO') return <VideoResource file={file} threshold={videoThreshold} onWatched={onVideoWatched} />
  return <DownloadResource file={file} />
}

// el HTML de la lectura, en un iframe con sandbox vacío: sin scripts, sin formularios, sin ventanas, y con un origen
// opaco (sin allow-same-origin), así ni el contenido ejecuta código ni toca la aplicación ni su sesión. sin saneador:
// lockedReading solo le pone una CSP que no deja pedir nada fuera y le quita los meta refresh
export function HtmlResource({ title, file }: { title: string; file: ResourceFile }) {
  const { t } = useTranslation('classroom')
  const query = useFileText(file)
  // la lectura se pinta con el tema de la página y se rehace cuando este cambia
  const theme = useDocumentTheme()
  const reading = useMemo(() => (query.data === undefined ? undefined : lockedReading(query.data, documentPalette(theme))), [query.data, theme])
  if (query.isError) return <FileProblem error={query.error} onRetry={() => void query.refetch()} />
  if (reading === undefined) return <LoadingState label={t('resource.loading')} />
  return (
    <iframe
      sandbox=""
      srcDoc={reading}
      title={title}
      referrerPolicy="no-referrer"
      className="h-[75vh] min-h-96 w-full rounded-md border border-border bg-surface"
    />
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
          size="sm"
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
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('resource.retry')}
        </Button>
      ) : null}
    </div>
  )
}

// el tema aplicado a la página (data-theme en <html>), al día: ThemeProvider lo escribe después de pintar los hijos,
// por eso se observa el atributo en vez de leerlo durante el render
function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] })
  return () => observer.disconnect()
}

const documentThemeSnapshot = () => `${document.documentElement.dataset.theme ?? ''}|${document.documentElement.style.colorScheme}`

function useDocumentTheme(): string {
  return useSyncExternalStore(subscribeToTheme, documentThemeSnapshot)
}

// los tokens del tema que usa la lectura, resueltos en la página
function documentPalette(theme: string): ReadingPalette {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(`--${name}`).trim() || undefined
  return {
    colorScheme: theme.endsWith('|dark') ? 'dark' : 'light',
    background: token('surface'),
    text: token('ink'),
    muted: token('ink-muted'),
    link: token('link'),
    line: token('line'),
    rule: token('border-control')
  }
}
