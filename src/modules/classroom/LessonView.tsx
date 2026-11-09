import { useWasichaiLinks } from '@wasichai/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { videoCompletion } from '../../config'
import { formatNumber } from '../../shared/format'
import { RunningHead } from '../../shared/RunningHead'
import { COLOFON_READING_THEME } from '../../theme/themes'
import { lessonEvent, useLessonEvent } from './api'
import { AssessmentLesson } from './Assessment'
import { Completion } from './Completion'
import { isDone, type Lesson } from './contract'
import { Lab } from './Lab'
import type { PlacedLesson } from './lessons'
import { MarginNotes } from './MarginNotes'
import { useOpenLabel } from './parts'
import { isDarkTheme, useDocumentTheme } from './documentTheme'
import type { ReadingControls } from './readingPreferences'
import { Resources, type ReadingSettings } from './Resources'
import { StatusBadge, statusOf } from './StatusBadge'
import { Sessions } from './SessionsPage'
import { ATTEMPT_PARAM, CLASSROOM_ROUTES, LESSON_PARAM } from './routes'

interface LessonViewProps {
  enrollmentId: string
  // la zona de la edición: en ella se escriben plazos y horas
  timeZone: string
  placed: PlacedLesson
  previous?: PlacedLesson
  next?: PlacedLesson
  // la siguiente por hacer según el servidor (nextLesson), por si al final del curso quedó una atrás
  pending?: PlacedLesson
  // su lugar en el recorrido del curso, para el folio de la cabecera corrida
  position: number
  total: number
  // las herramientas de lectura las guarda el aula: el tamaño, el modo lectura y el modo foco, que pliega las notas al margen
  readingControls: ReadingControls
}

// la medida de lectura (66ch de la lectura, Newsreader a 20px) y, dentro, la interfaz en su letra: título, material y cierre comparten borde
const MEASURE = 'mx-auto w-full max-w-measure font-read text-reading'
const INTERFACE = 'font-sans text-body'
// los márgenes de la página del aula, del móvil al escritorio (rejilla de Foundations: 16 / 32 / 48)
const PAGE = 'px-4 sm:px-8 lg:px-12'

// la lección abierta (docs/design-system/colofon/Classroom.dc.html): la cabecera corrida, el título, su texto en la medida de lectura, las
// notas al margen y el cierre (completarla, anterior y siguiente). a 1280 px o más las notas van a la derecha; por debajo, tras el texto
export function LessonView({ enrollmentId, timeZone, placed, previous, next, pending, position, total, readingControls }: LessonViewProps) {
  const { t, i18n } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const lessonType = useOpenLabel('lessonType')
  const { lesson, unit } = placed
  // dentro de un intento no se ofrece ir a otra lección de un toque: lo que no se ha guardado se perdería
  const [search] = useSearchParams()
  const inAttempt = search.has(ATTEMPT_PARAM)
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
  // el modo lectura: sobre un tema claro, el papel sepia (colofon-lectura) en toda la lección; sobre uno oscuro se queda
  // oscuro y abre el interlineado de la lectura (PantallaLeccion del sistema de diseño)
  const dark = isDarkTheme(useDocumentTheme())
  const hasReading = lesson.resources.some((resource) => resource.type === 'HTML' && resource.file)
  const sepia = hasReading && readingControls.mode && !dark
  const reading: ReadingSettings = { size: readingControls.size, roomy: readingControls.mode && dark }
  // sin notas en el modo foco ni dentro de un intento: el intento es una tarea con su propia cabecera y necesita el ancho
  const notes = !readingControls.focus && !inAttempt
  // el folio cuenta todas las lecciones del recorrido, también las que no cuentan para el progreso: es su lugar en el índice
  const folioValues = { position: formatNumber(position, i18n.language), total: formatNumber(total, i18n.language) }
  const minutes = lesson.durationMinutes === null ? null : t('classroom.minutes', { value: formatNumber(lesson.durationMinutes, i18n.language) })
  // una evaluación, una sesión o un laboratorio son su contenido: sin recursos no dicen «sin material»
  const bare = lesson.resources.length === 0 && !lesson.assessment && !lesson.lab && lesson.completion !== 'ATTENDANCE'
  return (
    <article
      aria-labelledby={`lesson-${lesson.id}`}
      data-theme={sepia ? COLOFON_READING_THEME.id : undefined}
      style={sepia ? { colorScheme: COLOFON_READING_THEME.colorScheme } : undefined}
      className={`grid min-h-full min-w-0 grid-cols-1 bg-surface text-ink ${notes ? 'xl:grid-cols-[minmax(0,1fr)_var(--container-margin-col)] xl:grid-rows-[auto_1fr]' : ''}`}
    >
      <div className={`${PAGE} min-w-0 pt-6 sm:pt-8 lg:pt-11 xl:col-start-1 xl:row-start-1`}>
        <div className={MEASURE}>
          <div className={INTERFACE}>
            <RunningHead
              trail={[
                { label: t('nav.myCourses'), to: links.to(CLASSROOM_ROUTES.enrollments) },
                { label: t('classroom.unitShort', { order: unit.order }) },
                { label: t('classroom.section', { unit: unit.order, lesson: lesson.order }) }
              ]}
              folio={t('classroom.folio', folioValues)}
              folioLabel={t('classroom.folioLabel', folioValues)}
            />
            <h2
              id={`lesson-${lesson.id}`}
              data-slot="lesson-title"
              ref={heading}
              tabIndex={-1}
              className="mt-5 scroll-mt-[calc(var(--classroom-bar,3.5rem)+0.75rem)] font-read text-h2 text-balance break-words text-ink focus:outline-none sm:mt-7 lg:text-h1"
            >
              {lesson.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="meta">{minutes ? `${lessonType(lesson.type)} · ${minutes}` : lessonType(lesson.type)}</p>
              <StatusBadge state={statusOf(lesson.progress.status)}>{t(`lessonStatus.${lesson.progress.status}`)}</StatusBadge>
            </div>
            {lesson.summary ? <p className="mt-4 font-read text-reading text-pretty text-ink-muted italic">{lesson.summary}</p> : null}

            <div className="mt-6 flex flex-col gap-8 sm:mt-8">
              {/* el objetivo del laboratorio va en las notas al margen; aquí, lo que hay que hacer */}
              {lesson.lab ? <Lab lab={notes ? { ...lesson.lab, objective: null } : lesson.lab} /> : null}

              {lesson.assessment ? (
                <AssessmentLesson enrollmentId={enrollmentId} lesson={{ ...lesson, assessment: lesson.assessment }} timeZone={timeZone} />
              ) : null}

              {lesson.completion === 'ATTENDANCE' ? (
                <section aria-label={t('sessions.ofLesson')} className="flex flex-col gap-3">
                  <h3 className="font-read text-h4 text-ink">{t('sessions.ofLesson')}</h3>
                  <Sessions enrollmentId={enrollmentId} lessonId={lesson.id} />
                </section>
              ) : null}

              {bare ? <p className="text-secondary text-ink-muted">{t('resource.none')}</p> : null}
              <Resources
                enrollmentId={enrollmentId}
                resources={lesson.resources}
                videoThreshold={videoThreshold}
                onVideoWatched={lesson.completion === 'VIDEO_END' ? videoWatched : undefined}
                reading={reading}
              />
            </div>
          </div>
        </div>
      </div>

      {notes ? (
        <div className={`${PAGE} pt-12 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:border-l xl:border-border xl:pt-11 xl:pr-8 xl:pb-10 xl:pl-6`}>
          <div className={`${MEASURE} xl:max-w-none`}>
            <div className={INTERFACE}>
              <MarginNotes enrollmentId={enrollmentId} lesson={lesson} />
            </div>
          </div>
        </div>
      ) : null}

      {/* dentro de un intento manda su cabecera, o las acciones del resultado: una sola acción principal */}
      {inAttempt ? null : (
        <div className={`${PAGE} pt-12 pb-16 xl:col-start-1 xl:row-start-2`}>
          <div className={MEASURE}>
            <div className={`${INTERFACE} flex flex-col gap-5`}>
              <p aria-hidden="true" className="text-center font-read tracking-[0.6em] text-ink-muted">
                · · ·
              </p>
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
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

// anterior y siguiente como filetes con título (Classroom.dc.html). el enlace se llama «Anterior <título>»: el «§n.m» es para el ojo
function LessonSteps({ enrollmentId, previous, next }: { enrollmentId: string; previous?: PlacedLesson; next?: PlacedLesson }) {
  const { t } = useTranslation('classroom')
  const links = useWasichaiLinks()
  const to = (placed: PlacedLesson) => links.to(CLASSROOM_ROUTES.classroom, { enrollmentId }, { [LESSON_PARAM]: placed.lesson.id })
  const section = (placed: PlacedLesson) => ` · ${t('classroom.section', { unit: placed.unit.order, lesson: placed.lesson.order })}`
  if (!previous && !next) return null
  const step =
    'flex min-h-11 min-w-0 flex-col gap-1 border-t border-border py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
  return (
    <nav aria-label={t('classroom.steps')} className="mt-2 grid gap-4 sm:grid-cols-2">
      {previous ? (
        <Link to={to(previous)} className={`${step} text-ink hover:text-link`}>
          <span className="meta">
            {t('classroom.previous')}
            <span aria-hidden="true">{section(previous)}</span>
          </span>
          <span className="font-read text-h4 font-normal break-words">{previous.lesson.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}
      {next ? (
        <Link to={to(next)} className={`${step} text-right text-link hover:text-brand-strong`}>
          <span className="meta text-link">
            {t('classroom.next')}
            <span aria-hidden="true">{section(next)}</span>
          </span>
          <span className="font-read text-h4 font-normal break-words underline decoration-1 underline-offset-4">{next.lesson.title}</span>
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
