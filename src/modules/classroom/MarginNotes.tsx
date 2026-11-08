import { useWasichaiLinks } from '@wasichai/core'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { TEXT_LINK } from '../../shared/buttons'
import { formatSessionStart } from '../../shared/format'
import { useSessions } from './api'
import type { Lesson } from './contract'
import { outline } from './ReadingDocument'
import { useReading } from './readingApi'
import { FileResources } from './Resources'
import { CLASSROOM_ROUTES } from './routes'

// las notas al margen de la lección (docs/design-system/colofon/Classroom.dc.html): su objetivo (el del laboratorio, el único que da el
// aula), sus archivos, las sesiones vinculadas a ella y el índice de su lectura. a 1280 px o más van en la columna derecha; por debajo,
// detrás del texto, en dos columnas desde 768. lo que la API no da no se pinta. no piden nada nuevo: las sesiones y la lectura son las
// mismas consultas que ya hace el aula, en caché
export function MarginNotes({ enrollmentId, lesson, className = '' }: { enrollmentId: string; lesson: Lesson; className?: string }) {
  const { t } = useTranslation('classroom')
  const objective = lesson.lab?.objective
  return (
    <aside
      aria-label={t('classroom.notes')}
      className={`grid content-start gap-x-8 gap-y-6 border-t border-ink pt-4 md:grid-cols-2 xl:grid-cols-1 xl:gap-y-0 xl:[&>*+*]:mt-4 xl:[&>*+*]:border-t xl:[&>*+*]:border-border xl:[&>*+*]:pt-4 ${className}`}
    >
      {objective ? (
        <Note title={t('classroom.objective')}>
          <p className="font-read text-body break-words text-ink">{objective}</p>
        </Note>
      ) : null}
      <Note title={t('classroom.resources')}>
        <FileResources resources={lesson.resources} />
      </Note>
      {/* en una lección de asistencia, su sesión ya es el contenido de la lección */}
      {lesson.completion === 'ATTENDANCE' ? null : <LinkedSessions enrollmentId={enrollmentId} lessonId={lesson.id} />}
      <LessonOutline enrollmentId={enrollmentId} lesson={lesson} />
    </aside>
  )
}

function Note({ title, children, as = 'section' }: { title: string; children: ReactNode; as?: 'section' | 'nav' }) {
  const id = useId()
  const Tag = as
  return (
    <Tag aria-labelledby={id} className="flex min-w-0 flex-col gap-2.5">
      <h3 id={id} className="meta">
        {title}
      </h3>
      {children}
    </Tag>
  )
}

// las sesiones de la edición vinculadas a esta lección, a la hora de la edición. sin ninguna, el camino a las del curso
function LinkedSessions({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const query = useSessions(enrollmentId)
  const linked = (query.data ?? []).filter((session) => session.lessonId === lessonId && session.status !== 'CANCELADA')
  return (
    <Note title={t('classroom.sessions')}>
      {query.isError ? <p className="text-secondary text-ink-muted">{t('classroom.sessionsFailed')}</p> : null}
      {query.data && linked.length === 0 ? <p className="font-read text-body text-ink">{t('classroom.noSessions')}</p> : null}
      {linked.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {linked.map((session) => (
            <li key={session.id} className="flex flex-col gap-0.5">
              <span className="font-read text-body break-words text-ink">{session.title}</span>
              <span className="text-secondary text-ink-muted">
                {formatSessionStart(session.start, i18n.language, session.timeZone)} · {t(`sessions.modality.${session.modality}`)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link to={links.to(CLASSROOM_ROUTES.sessions, { enrollmentId })} className={`${TEXT_LINK} self-start font-semibold`}>
        {t('classroom.allSessions')}
      </Link>
    </Note>
  )
}

// «En esta lección»: los encabezados de su lectura, con el ancla que llevan en la página. la lectura ya la pidió el texto
function LessonOutline({ enrollmentId, lesson }: { enrollmentId: string; lesson: Lesson }) {
  const reading = lesson.resources.find((resource) => resource.type === 'HTML' && resource.file)
  if (!reading) return null
  return <ReadingOutline enrollmentId={enrollmentId} resourceId={reading.id} />
}

const INDENT: Record<number, string> = { 2: '', 3: 'pl-4', 4: 'pl-8' }

function ReadingOutline({ enrollmentId, resourceId }: { enrollmentId: string; resourceId: string }) {
  const { t } = useTranslation('classroom')
  const { data } = useReading(enrollmentId, resourceId)
  const headings = data ? outline(data) : []
  if (headings.length === 0) return null
  return (
    <Note title={t('classroom.outline')} as="nav">
      <ol className="flex flex-col">
        {headings.map(({ id, level, text }) => {
          // un ancla dentro de la propia lección (los id ya llevan el prefijo «lectura-»), no una pantalla
          const anchor = `#${id}`
          return (
            <li key={id} className={INDENT[level] ?? ''}>
              <a href={anchor} className={`${TEXT_LINK} py-1 break-words`}>
                {text}
              </a>
            </li>
          )
        })}
      </ol>
    </Note>
  )
}
