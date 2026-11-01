import { useWasichaiLinks } from '@wasichai/core'
import { Button } from '@wasichai/ui'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { videoCompletion } from '../../config'
import { formatNumber } from '../../shared/format'
import { QUIPU_READING_THEME } from '../../theme/themes'
import { lessonEvent, useLessonEvent } from './api'
import { AssessmentLesson } from './Assessment'
import { Completion } from './Completion'
import { isDone, type Lesson } from './contract'
import type { PlacedLesson } from './lessons'
import { useOpenLabel } from './parts'
import { isDarkTheme, useDocumentTheme } from './documentTheme'
import { useReadingPreferences, type ReadingControls } from './readingPreferences'
import { Resources, type ReadingSettings } from './Resources'
import { Sessions } from './SessionsPage'
import { CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

interface LessonViewProps {
  enrollmentId: string
  // la zona de la edición: en ella se escriben plazos y horas
  timeZone: string
  placed: PlacedLesson
  previous?: PlacedLesson
  next?: PlacedLesson
  // la siguiente por hacer según el servidor (nextLesson), por si al final del curso quedó una atrás
  pending?: PlacedLesson
}

// la lección abierta: lectura amplia, su material y el paso siguiente
export function LessonView({ enrollmentId, timeZone, placed, previous, next, pending }: LessonViewProps) {
  const { t, i18n } = useTranslation('classroom')
  const lessonType = useOpenLabel('lessonType')
  const { lesson, unit } = placed
  const heading = useFocusOnChange(lesson.id)
  useStartLesson(enrollmentId, lesson)
  const completion = useLessonEvent(enrollmentId)
  // el estado de la mutación es de la lección que la lanzó: al cambiar de lección no se arrastra
  const ownEvent = completion.variables?.lessonId === lesson.id
  const done = isDone(lesson.progress.status)
  const markComplete = () => {
    if (!done && !completion.isPending) completion.mutate(lessonEvent(lesson.id, 'MARKED_COMPLETE'))
  }
  const videoThreshold = videoCompletion()
  const videoWatched = useVideoWatched(lesson, done, completion.mutate)
  const upcoming = next ?? (pending && pending.lesson.id !== lesson.id ? pending : undefined)
  // el modo lectura: sobre un tema claro, el papel sepia (quipu-lectura) en toda la lección; sobre uno oscuro se queda
  // oscuro y abre el interlineado de la lectura (PantallaLeccion del sistema de diseño)
  const readingControls = useReadingPreferences()
  const dark = isDarkTheme(useDocumentTheme())
  const hasReading = lesson.resources.some((resource) => resource.type === 'HTML' && resource.file)
  const sepia = hasReading && readingControls.mode && !dark
  const reading: ReadingSettings = {
    size: readingControls.size,
    roomy: readingControls.mode && dark,
    theme: sepia ? QUIPU_READING_THEME : undefined
  }
  return (
    <article
      aria-labelledby={`lesson-${lesson.id}`}
      data-theme={sepia ? QUIPU_READING_THEME.id : undefined}
      style={sepia ? { colorScheme: QUIPU_READING_THEME.colorScheme } : undefined}
      className={`flex min-w-0 flex-col gap-6 lg:max-w-4xl ${sepia ? '-m-4 rounded-xl bg-surface-muted p-4 text-ink sm:-m-6 sm:p-6' : ''}`}
    >
      {hasReading ? <ReadingTools controls={readingControls} /> : null}
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('classroom.position', { unit: unit.order, lesson: lesson.order })}</p>
        <h2 id={`lesson-${lesson.id}`} ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-balance text-ink focus:outline-none">
          {lesson.title}
        </h2>
        <p className="text-sm text-ink-muted">
          {lessonType(lesson.type)}
          {lesson.durationMinutes === null ? null : ` · ${t('classroom.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })}`}
        </p>
        {lesson.summary ? <p className="max-w-prose text-base text-ink">{lesson.summary}</p> : null}
      </header>

      {lesson.assessment ? <AssessmentLesson enrollmentId={enrollmentId} lesson={{ ...lesson, assessment: lesson.assessment }} timeZone={timeZone} /> : null}

      {lesson.completion === 'ATTENDANCE' ? (
        <section aria-label={t('sessions.ofLesson')} className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-ink">{t('sessions.ofLesson')}</h3>
          <Sessions enrollmentId={enrollmentId} lessonId={lesson.id} />
        </section>
      ) : null}

      {/* una evaluación o una sesión sin material no dice «sin material»: la evaluación o la sesión son su contenido */}
      {(lesson.assessment || lesson.completion === 'ATTENDANCE') && lesson.resources.length === 0 ? null : (
        <Resources
          resources={lesson.resources}
          videoThreshold={videoThreshold}
          onVideoWatched={lesson.completion === 'VIDEO_END' ? videoWatched : undefined}
          reading={reading}
        />
      )}

      <Completion
        enrollmentId={enrollmentId}
        lesson={lesson}
        upcoming={upcoming}
        upcomingIsPending={!next && upcoming !== undefined}
        videoThreshold={videoThreshold}
        onMarkComplete={markComplete}
        marking={ownEvent && completion.isPending}
        error={ownEvent ? completion.error : null}
        justCompleted={ownEvent && completion.isSuccess}
      />

      <LessonSteps enrollmentId={enrollmentId} previous={previous} next={next} />
    </article>
  )
}

// la barra de la lección con las herramientas de lectura: el modo lectura y el tamaño del texto (A−/A+, 17–23px)
function ReadingTools({ controls }: { controls: ReadingControls }) {
  const { t } = useTranslation('classroom')
  return (
    <div role="toolbar" aria-label={t('reading.tools')} className="flex flex-wrap items-center justify-end gap-2">
      <Button variant={controls.mode ? 'primary' : 'secondary'} size="md" aria-pressed={controls.mode} onClick={controls.toggleMode}>
        {t('reading.mode')}
      </Button>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={t('reading.smaller')} disabled={!controls.canShrink} onClick={controls.shrink}>
          <span aria-hidden="true">{t('reading.smallerShort')}</span>
        </Button>
        <span className="min-w-12 text-center text-sm tabular-nums text-ink-muted" aria-live="polite">
          {t('reading.size', { value: controls.shownSize })}
        </span>
        <Button variant="ghost" size="icon" aria-label={t('reading.larger')} disabled={!controls.canGrow} onClick={controls.grow}>
          <span aria-hidden="true">{t('reading.largerShort')}</span>
        </Button>
      </div>
    </div>
  )
}

function LessonSteps({ enrollmentId, previous, next }: { enrollmentId: string; previous?: PlacedLesson; next?: PlacedLesson }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const to = (placed: PlacedLesson) => links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: placed.lesson.id })
  if (!previous && !next) return null
  return (
    <nav aria-label={t('classroom.steps')} className="flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:justify-between">
      {previous ? (
        <Link to={to(previous)} className="flex flex-col text-link underline-offset-4 hover:underline">
          <span className="text-xs text-ink-muted">{t('classroom.previous')}</span>
          <span>{previous.lesson.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={to(next)} className="flex flex-col text-link underline-offset-4 hover:underline sm:text-right">
          <span className="text-xs text-ink-muted">{t('classroom.next')}</span>
          <span>{next.lesson.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}

// abrir una lección no iniciada la marca como iniciada, una vez por lección mientras dure la página. si falla no se
// insiste ni se molesta: la lectura sigue y el próximo hecho (completarla) también la inicia en el servidor
function useStartLesson(enrollmentId: string, lesson: Lesson) {
  const { mutate } = useLessonEvent(enrollmentId)
  const started = useRef(new Set<string>())
  const notStarted = lesson.progress.status === 'NO_INICIADA'
  useEffect(() => {
    if (!notStarted || started.current.has(lesson.id)) return
    started.current.add(lesson.id)
    mutate(lessonEvent(lesson.id, 'STARTED'))
  }, [lesson.id, mutate, notStarted])
}

// VIDEO_ENDED una sola vez por lección (RF-AUL-04): el reproductor avisa en cada timeupdate pasado el umbral y en cada
// ended, y el estado de la mutación llega tarde para frenarlos. si el envío falla, el siguiente aviso lo reintenta
function useVideoWatched(lesson: Lesson, done: boolean, mutate: ReturnType<typeof useLessonEvent>['mutate']) {
  const sent = useRef<string | null>(null)
  return () => {
    if (done || sent.current === lesson.id) return
    const lessonId = lesson.id
    sent.current = lessonId
    mutate(lessonEvent(lessonId, 'VIDEO_ENDED'), {
      onError: () => {
        if (sent.current === lessonId) sent.current = null
      }
    })
  }
}

// al cambiar de lección (no al abrir la página), el foco pasa a su título: quien navega con teclado o lector sigue leyendo ahí
function useFocusOnChange(key: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  const previous = useRef(key)
  useEffect(() => {
    if (previous.current === key) return
    previous.current = key
    ref.current?.focus()
  }, [key])
  return ref
}
