import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import type { Classroom, LessonProgress } from './contract'
import { classroomModule } from './module'
import { serveFiles } from './test/files'
import { classroom, problem } from './test/fixtures'

// el progreso en el aula (ADR-0012): cada hecho va al servidor con su clientEventId y lo que él responde manda

const ENROLLMENTS = '/lms/classroom/enrollments'
const CLASSROOM = `${ENROLLMENTS}/mat-srtm-1`
const events = (lessonId: string) => `${CLASSROOM}/lessons/${lessonId}/events`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const started: LessonProgress = { status: 'INICIADA', startedAt: '2026-10-28T16:00:00Z', completedAt: null, evidence: null }
const completed: LessonProgress = {
  status: 'COMPLETADA',
  startedAt: '2026-10-28T16:00:00Z',
  completedAt: '2026-10-28T16:20:00Z',
  evidence: 'FINALIZACION_EXPLICITA'
}

let fetchMock: FetchMock
let files: ReturnType<typeof serveFiles> | undefined
afterEach(() => {
  files?.restore()
  fetchMock?.restore()
})

// el aula que contesta el servidor: un objeto que la prueba cambia para simular lo que el servidor guardó
function serverClassroom(): Classroom {
  return structuredClone(classroom) as Classroom
}

function renderLesson(routes: MockRoute[], lessonId: string) {
  fetchMock = mockFetch(routes)
  files = serveFiles({})
  return renderWithProviders(<ClassroomPage />, {
    modules: [classroomModule()],
    route: `/mis-cursos/mat-srtm-1?leccion=${lessonId}`,
    path: '/mis-cursos/:enrollmentId'
  })
}

const posts = () => fetchMock.calls.filter((call) => call.method === 'POST')
const classroomReads = () => fetchMock.calls.filter((call) => call.method === 'GET' && call.path === CLASSROOM).length

describe('STARTED al abrir una lección', () => {
  it('una lección no iniciada se marca como iniciada, una sola vez y con un clientEventId nuevo', async () => {
    renderLesson(
      [
        { path: CLASSROOM, body: classroom },
        { method: 'POST', path: events('lec-pdf'), body: started }
      ],
      'lec-pdf'
    )

    await screen.findByRole('heading', { level: 2, name: 'Guía de liquidación' })
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]).toMatchObject({ path: events('lec-pdf'), body: { type: 'STARTED', clientEventId: expect.stringMatching(UUID) } })
    // tras la respuesta se vuelve a leer el aula; aunque el servidor la siga contando como no iniciada, no se insiste
    await waitFor(() => expect(classroomReads()).toBe(2))
    expect(
      within(screen.getByRole('navigation', { name: 'Unidades del curso' })).getByRole('link', { name: 'Guía de liquidación Sin empezar' })
    ).toBeInTheDocument()
    expect(posts()).toHaveLength(1)
  })

  it('una lección ya iniciada o completada no manda nada al abrirse', async () => {
    renderLesson([{ path: CLASSROOM, body: classroom }], 'lec-html')

    await screen.findByRole('heading', { level: 2, name: 'Tipos de anuncio' })
    await screen.findByText('Lección completada')
    expect(posts()).toEqual([])
  })
})

describe('completar una lección', () => {
  it('EXPLICIT: «Marcar como completada» lo guarda, el servidor manda y la siguiente lección queda a la vista', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[0]!.progress = started
    renderLesson(
      [
        { path: CLASSROOM, body: server },
        { method: 'POST', path: events('lec-pdf'), body: completed }
      ],
      'lec-pdf'
    )
    const mark = await screen.findByRole('button', { name: 'Marcar como completada' })
    expect(posts()).toEqual([])

    // lo que el servidor guardará y contará al volver a leer el aula
    server.units[1]!.lessons[0]!.progress = completed
    server.units[1]!.progress = { completedLessons: 1, totalLessons: 1, percent: 100 }
    server.progress = { completedLessons: 2, totalLessons: 3, percent: 67 }
    await userEvent.click(mark)

    expect(posts()).toHaveLength(1)
    expect(posts()[0]).toMatchObject({ path: events('lec-pdf'), body: { type: 'MARKED_COMPLETE', clientEventId: expect.stringMatching(UUID) } })
    expect(await screen.findByText('Lección completada', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument()
    const next = screen.getByRole('link', { name: 'Siguiente lección: Cuestionario de la unidad' })
    expect(next).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-quiz')
    expect(next).toHaveFocus()

    // el avance por unidad y total es el que cuenta el servidor
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '67'))
    expect(screen.getByRole('heading', { level: 2, name: /^Unidad 2\./ })).toHaveTextContent('1 de 1 lecciones completadas')
    expect(fetchMock.calls.some((call) => call.method === 'GET' && call.path === ENROLLMENTS)).toBe(false)
  })

  it('cada envío lleva su propio clientEventId', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[0]!.progress = started
    renderLesson(
      [
        { path: CLASSROOM, body: server },
        { method: 'POST', path: events('lec-pdf'), status: 500, body: problem(500, 'fallo') }
      ],
      'lec-pdf'
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como completada' }))
    expect(await screen.findByText('No pudimos guardar tu avance. Inténtalo de nuevo.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como completada' }))
    await waitFor(() => expect(posts()).toHaveLength(2))

    const [first, second] = posts().map((call) => (call.body as { clientEventId: string }).clientEventId)
    expect(first).toMatch(UUID)
    expect(second).toMatch(UUID)
    expect(first).not.toBe(second)
  })

  it('un 409 se explica sin tecnicismos y se muestra el estado que dice el servidor', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[0]!.progress = started
    renderLesson(
      [
        { path: CLASSROOM, body: server },
        { method: 'POST', path: events('lec-pdf'), status: 409, body: problem(409, 'MARKED_COMPLETE no se admite en una lección VIDEO_END') }
      ],
      'lec-pdf'
    )
    const mark = await screen.findByRole('button', { name: 'Marcar como completada' })
    const reads = classroomReads()

    // el servidor ya la tenía como completada por otro camino
    server.units[1]!.lessons[0]!.progress = completed
    await userEvent.click(mark)

    expect(await screen.findByText('Esta lección no se puede completar así. Ya te mostramos su estado actual.')).toBeInTheDocument()
    expect(screen.queryByText(/409|VIDEO_END|MARKED_COMPLETE/)).not.toBeInTheDocument()
    await waitFor(() => expect(classroomReads()).toBe(reads + 1))
    expect(await screen.findByText('Lección completada', { selector: '[role="status"]' })).toBeInTheDocument()
  })

  it('VIDEO_END: sin botón; al terminar el vídeo se envía VIDEO_ENDED', async () => {
    const server = serverClassroom()
    server.units[0]!.lessons[1]!.progress = started
    const { container } = renderLesson(
      [
        { path: CLASSROOM, body: server },
        { method: 'POST', path: events('lec-video'), body: { ...completed, evidence: 'FIN_DE_VIDEO' } }
      ],
      'lec-video'
    )
    files?.restore()
    files = serveFiles({ '/api/objects/version_recurso/records/vr-video/files/archivo': { body: 'mp4', contentType: 'video/mp4' } })

    expect(await screen.findByText('Se completa al terminar el vídeo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument()
    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src'))

    server.units[0]!.lessons[1]!.progress = { ...completed, evidence: 'FIN_DE_VIDEO' }
    fireEvent.ended(container.querySelector('video')!)

    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]).toMatchObject({ path: events('lec-video'), body: { type: 'VIDEO_ENDED', clientEventId: expect.stringMatching(UUID) } })
    expect(await screen.findByText('Lección completada', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Siguiente lección: Guía de liquidación' })).toHaveFocus()
  })

  it('NOT_YET: ni botón ni evento de fin; se dice cómo se completará', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[1]!.progress = started
    renderLesson([{ path: CLASSROOM, body: server }], 'lec-quiz')

    expect(await screen.findByText('Esta evaluación o sesión todavía no está disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument()
    expect(posts()).toEqual([])
  })
})

describe('el paso siguiente al completar', () => {
  it('al final del curso, si quedó una lección atrás, lleva a ella', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[1] = { ...server.units[1]!.lessons[1]!, completion: 'EXPLICIT', progress: completed }
    renderLesson([{ path: CLASSROOM, body: server }], 'lec-quiz')

    expect(await screen.findByText('Te queda una lección anterior por hacer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Siguiente lección: Recorrido por la pantalla' })).toHaveAttribute(
      'href',
      '/mis-cursos/mat-srtm-1?leccion=lec-video'
    )
  })

  it('con todo hecho, lo dice y vuelve a «Mis cursos»', async () => {
    const server = serverClassroom()
    server.units[1]!.lessons[1] = { ...server.units[1]!.lessons[1]!, completion: 'EXPLICIT', progress: completed }
    server.nextLesson = null
    renderLesson([{ path: CLASSROOM, body: server }], 'lec-quiz')

    expect(await screen.findByText('Has completado todas las lecciones disponibles del curso.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    expect(screen.queryByRole('link', { name: /^Siguiente lección/ })).not.toBeInTheDocument()
  })
})
