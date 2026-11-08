import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { serveFiles, type ServedFile } from '../../test/files'
import { assessmentClassroom, classroom, labClassroom, labLesson, problem, readingDocument, sessions } from './test/fixtures'

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'
const FILES = '/api/objects/version_recurso/records'
// la lectura en bloques del recurso HTML: detrás de las rutas de cada prueba, que pueden cambiarla
const READING = `${CLASSROOM}/resources/rec-html/reading`
const DEFAULT_FILES: Record<string, ServedFile> = {
  [`${FILES}/vr-video/files/archivo`]: { body: 'mp4', contentType: 'video/mp4' },
  [`${FILES}/vr-pdf/files/archivo`]: { body: '%PDF-1.7', contentType: 'application/pdf' },
  [`${FILES}/vr-xlsx/files/archivo`]: { body: 'xlsx', contentType: 'application/octet-stream' }
}

let fetchMock: FetchMock
let files: ReturnType<typeof serveFiles> | undefined
afterEach(() => {
  files?.restore()
  fetchMock?.restore()
  vi.restoreAllMocks()
  localStorage.removeItem('wasichai-test.token')
  localStorage.removeItem('wasichai-test.reading')
})

function renderClassroom(routes: MockRoute[], route = '/mis-cursos/mat-srtm-1', served = DEFAULT_FILES) {
  fetchMock = mockFetch([...routes, { path: READING, body: readingDocument }])
  files = serveFiles(served)
  // la sesión de renderWithProviders (storagePrefix 'wasichai-test'): el token que deben llevar las descargas
  localStorage.setItem('wasichai-test.token', 'test-token')
  return renderWithProviders(<ClassroomPage />, { modules: [classroomModule()], route, path: '/mis-cursos/:enrollmentId' })
}

const units = () => screen.getByRole('navigation', { name: 'Unidades del curso' })
// el botón que abre el índice en una hoja (por debajo de 1024 px); el de escritorio es un conmutador (aria-pressed)
const sheetButton = () => screen.getByRole('button', { name: 'Índice', expanded: false })
const lessonHeading = (name: string) => screen.findByRole('heading', { level: 2, name })
const unitOf = (name: string) =>
  within(units())
    .getByText(new RegExp(`^${name}\\.`))
    .closest('details')!
// abre una unidad plegada, como quien pulsa su cabecera
const openUnit = (name: string) => userEvent.click(within(units()).getByText(new RegExp(`^${name}\\.`)))

describe('ClassroomPage: el aula', () => {
  it('mientras llega, la forma del aula (cabecera, temario y lección) y el aviso para lectores de pantalla', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])

    expect(screen.getByRole('status')).toHaveTextContent('Cargando el aula…')
    expect(document.querySelector("[data-slot='classroom-skeleton']")).not.toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: classroom.course.title })).toBeInTheDocument()
    expect(document.querySelector("[data-slot='classroom-skeleton']")).toBeNull()
  })

  it('el estado de cada lección del índice lo dice su marca a la vista y su palabra al lector de pantalla', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])

    await lessonHeading('Recorrido por la pantalla')
    const nav = within(units())
    await openUnit('Unidad 2')
    const pending = nav.getByRole('link', { name: 'Guía de liquidación Sin empezar' })
    expect(within(pending).getByText('Sin empezar')).toHaveClass('sr-only')
    expect(pending.querySelector('[data-slot="state-mark"]')).toHaveAttribute('data-state', 'todo')
    const done = nav.getByRole('link', { name: 'Tipos de anuncio Completada' })
    expect(within(done).getByText('Completada')).toHaveClass('sr-only')
    expect(done.querySelector('[data-slot="state-mark"]')).toHaveAttribute('data-state', 'done')
    // el número «1.1» es para el ojo: el enlace se llama por su título
    expect(within(done).getByText('1.1')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sin ?leccion abre la siguiente por hacer, con las unidades, su avance y el estado de cada lección', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])

    expect(await screen.findByRole('heading', { level: 1, name: classroom.course.title })).toBeInTheDocument()
    expect(await lessonHeading('Recorrido por la pantalla')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Ruta' })).getByText('§1.2')).toBeInTheDocument()

    const nav = within(units())
    expect(nav.getByRole('heading', { level: 3, name: /^Unidad 1\. El trámite de anuncios/ })).toHaveTextContent('1 de 2 lecciones completadas')
    expect(nav.getByRole('heading', { level: 3, name: /^Unidad 2\. La liquidación/ })).toHaveTextContent('0 de 1 lecciones completadas')
    expect(nav.getByRole('link', { name: 'Tipos de anuncio Completada' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-html')
    expect(nav.getByRole('link', { name: 'Recorrido por la pantalla Sin empezar' })).toHaveAttribute('aria-current', 'page')
    // solo la unidad de la lección abierta está desplegada
    expect(nav.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()
    expect(unitOf('Unidad 1')).toHaveAttribute('open')
    expect(unitOf('Unidad 2')).not.toHaveAttribute('open')
    // cada lección del índice lleva su marca, decorativa: el estado viaja en el texto del enlace
    const mark = nav.getByRole('link', { name: 'Tipos de anuncio Completada' }).querySelector('[data-slot="state-mark"]')
    expect(mark).toHaveAttribute('data-state', 'done')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(nav.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1)
  })

  it('la cabecera lleva a «Mis cursos» y las pestañas son las secciones del curso, por URL', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html')
    await lessonHeading('Tipos de anuncio')

    expect(within(screen.getByRole('navigation', { name: 'Ruta' })).getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    const tabs = within(screen.getByRole('navigation', { name: 'Secciones del curso' }))
    // Temario es donde se está: conserva la lección abierta, volver a pulsarlo no salta a otra
    expect(tabs.getByRole('link', { name: 'Lecciones' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-html')
    expect(tabs.getByRole('link', { name: 'Lecciones' })).toHaveAttribute('aria-current', 'page')
    expect(tabs.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1/sesiones')
    expect(tabs.getByRole('link', { name: 'Sesiones' })).not.toHaveAttribute('aria-current')
    expect(tabs.getByRole('link', { name: 'Finalización' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1/finalizacion')
  })

  it('con el certificado emitido la pestaña de finalización lo dice', async () => {
    renderClassroom([{ path: CLASSROOM, body: { ...classroom, certificateCode: 'K7Q2-M9XW-4RTB' } }])
    await lessonHeading('Recorrido por la pantalla')
    expect(within(screen.getByRole('navigation', { name: 'Secciones del curso' })).getByRole('link', { name: 'Tu certificado' })).toBeInTheDocument()
  })

  it('el índice da tipo y duración de cada lección', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    const nav = within(units())
    const read = nav.getByRole('link', { name: 'Tipos de anuncio Completada' })
    expect(read).toHaveAccessibleDescription('Lectura · 30 min')
    expect(read.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // sin duración, solo el tipo
    await openUnit('Unidad 2')
    expect(nav.getByRole('link', { name: 'Guía de liquidación Sin empezar' })).toHaveAccessibleDescription('Presentación')
    // el usuario puede plegar la unidad actual: nada la vuelve a abrir mientras siga en esa lección
    await openUnit('Unidad 1')
    expect(unitOf('Unidad 1')).not.toHaveAttribute('open')
  })

  it('el índice resume el avance: lecciones, evaluaciones y fechas; la asistencia sale de las sesiones', async () => {
    renderClassroom([
      { path: CLASSROOM, body: { ...assessmentClassroom, id: 'mat-srtm-1' } },
      { path: `${CLASSROOM}/sessions`, body: sessions }
    ])
    await lessonHeading('Evaluación final')

    expect(within(screen.getByRole('region', { name: 'Índice' })).getByText('1 de 3 completadas')).toBeInTheDocument()
    const figures = within(screen.getByRole('list', { name: 'Tu avance' }))
    expect(figures.getByText('0 de 1')).toBeInTheDocument()
    expect(figures.getByText('evaluación aprobada')).toBeInTheDocument()
    expect(await figures.findByText('1 de 2')).toBeInTheDocument()
    expect(figures.getByText('sesiones con asistencia')).toBeInTheDocument()
  })

  it('si no se pueden leer las sesiones, la asistencia no se inventa ni molesta', async () => {
    renderClassroom([
      { path: CLASSROOM, body: { ...assessmentClassroom, id: 'mat-srtm-1' } },
      { path: `${CLASSROOM}/sessions`, status: 500, body: problem(500, 'fallo') }
    ])
    await lessonHeading('Evaluación final')
    await waitFor(() => expect(fetchMock.calls.some((call) => call.path.endsWith('/sessions'))).toBe(true))
    expect(screen.queryByText('sesiones con asistencia')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un curso sin lecciones lo dice con su estado vacío, con la cabecera completa', async () => {
    renderClassroom([{ path: CLASSROOM, body: { ...classroom, units: [], nextLesson: null, progress: { completedLessons: 0, totalLessons: 0, percent: 0 } } }])

    expect(await screen.findByRole('heading', { level: 1, name: classroom.course.title })).toBeInTheDocument()
    expect(screen.getByText('Este curso todavía no tiene lecciones.')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Secciones del curso' })).getByRole('link', { name: 'Lecciones' })).toHaveAttribute(
      'href',
      '/mis-cursos/mat-srtm-1'
    )
    // 0 de 0 no es una cifra
    expect(screen.queryByRole('list', { name: 'Tu avance' })).not.toBeInTheDocument()
  })

  it('la lección HTML se pinta en la página desde su lectura en bloques, sin iframe ni archivo', async () => {
    const { container } = renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html')

    expect(await lessonHeading('Tipos de anuncio')).toBeInTheDocument()
    // la cabecera dice el estado de la lección con una insignia de icono y palabra
    const lesson = within(screen.getByRole('article', { name: 'Tipos de anuncio' }))
    const status = lesson.getByText('Completada').closest('[data-slot="badge"]')
    expect(status).toHaveAttribute('data-state', 'done')
    const section = within(lesson.getByRole('region', { name: 'Tipos de anuncio (lectura)' }))
    // bajo el título de la lección (h2) y el del recurso (h3)
    expect(await section.findByRole('heading', { level: 4, name: 'Entrar y salir del portal' })).toHaveAttribute('id', 'lectura-_entrar_y_salir_del_portal')
    expect(section.getByRole('note', { name: 'Nota' })).toHaveTextContent('Lectura ilustrativa de la demostración')
    expect(container.querySelector('iframe')).not.toBeInTheDocument()
    expect(fetchMock.calls.find((call) => call.path === READING)?.headers.authorization).toBe('Bearer test-token')
    expect(files?.calls).toEqual([])
  })

  it('cambiar de lección en la navegación la abre, la marca y lleva el foco a su título', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    await openUnit('Unidad 2')
    await userEvent.click(within(units()).getByRole('link', { name: /^Guía de liquidación/ }))

    const heading = await lessonHeading('Guía de liquidación')
    expect(heading).toHaveFocus()
    expect(within(screen.getByRole('navigation', { name: 'Ruta' })).getByText('§2.1')).toBeInTheDocument()
    expect(within(units()).getByRole('link', { name: /^Guía de liquidación/ })).toHaveAttribute('aria-current', 'page')
    // la unidad abierta sigue a la lección: la de antes se pliega
    expect(unitOf('Unidad 2')).toHaveAttribute('open')
    expect(unitOf('Unidad 1')).not.toHaveAttribute('open')

    // anterior y siguiente al pie de la lección
    const steps = within(screen.getByRole('navigation', { name: 'Lección anterior y siguiente' }))
    expect(steps.getByRole('link', { name: /Anterior.*Recorrido por la pantalla/ })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-video')
    expect(steps.getByRole('link', { name: /Siguiente.*Cuestionario de la unidad/ })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-quiz')
  })

  it('con un solo recurso su título no se repite a la vista, pero sigue siendo un encabezado', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html')
    await lessonHeading('Tipos de anuncio')
    expect(screen.getByRole('heading', { level: 3, name: 'Tipos de anuncio (lectura)' })).toHaveClass('sr-only')
  })

  it('en el móvil el índice se abre en una hoja que se cierra con Esc y devuelve el foco', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    const open = sheetButton()
    expect(open).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(open)
    const sheet = await screen.findByRole('dialog', { name: 'Índice' })
    expect(within(sheet).getByRole('navigation', { name: 'Unidades del curso' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(open).toHaveFocus()
  })

  it('elegir una lección en la hoja la cierra y lleva el foco al título de la lección', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    await userEvent.click(sheetButton())
    const sheet = await screen.findByRole('dialog', { name: 'Índice' })
    await userEvent.click(within(sheet).getByRole('link', { name: /^Tipos de anuncio/ }))

    const heading = await lessonHeading('Tipos de anuncio')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('en escritorio «Índice» pliega la columna para dar el ancho a la lectura, y se recuerda', async () => {
    const first = renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')
    expect(units()).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Índice', pressed: true }))
    expect(screen.queryByRole('navigation', { name: 'Unidades del curso' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Índice', pressed: false })).toBeInTheDocument()

    first.unmount()
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')
    expect(screen.queryByRole('navigation', { name: 'Unidades del curso' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Índice', pressed: false }))
    expect(units()).toBeInTheDocument()
  })

  it('el PDF y los tipos que no se muestran se descargan con la sesión; un recurso sin archivo lo dice', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')

    expect(screen.queryByTitle('Guía en PDF')).not.toBeInTheDocument()
    expect(files?.calls).toEqual([])
    const pdf = screen.getByRole('button', { name: 'Descargar guia-liquidacion.pdf (471 kB)' })
    await userEvent.click(pdf)

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(files?.calls).toEqual([{ url: `${FILES}/vr-pdf/files/archivo`, authorization: 'Bearer test-token' }])
    expect(await files!.created[0]!.text()).toBe('%PDF-1.7')
    // un blob del origen de la aplicación nunca se pinta como documento
    expect(files!.created[0]!.type).toBe('application/octet-stream')
    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toBe('guia-liquidacion.pdf')
    expect(anchor.href).toBe('blob:prueba/1')

    expect(screen.getByRole('button', { name: 'Descargar plantilla.xlsx (10 kB)' })).toBeInTheDocument()
    const missing = screen.getByRole('region', { name: 'Material por publicar' })
    expect(within(missing).getByText('Este recurso todavía no tiene archivo.')).toBeInTheDocument()
    expect(within(missing).queryByRole('button')).not.toBeInTheDocument()
  })

  it('el vídeo se reproduce desde el archivo bajado con la sesión', async () => {
    const { container } = renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-video')
    await lessonHeading('Recorrido por la pantalla')

    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src', 'blob:prueba/1'))
    expect(container.querySelector('video')).toHaveAttribute('controls')
    expect(await files!.created[0]!.text()).toBe('mp4')
    expect(files!.created[0]!.type).toBe('video/mp4')
    expect(files?.calls[0]?.authorization).toBe('Bearer test-token')
  })

  it('un «vídeo» que llega como HTML se reproduce como bytes sin tipo: su blob nunca es un documento', async () => {
    const served = { ...DEFAULT_FILES, [`${FILES}/vr-video/files/archivo`]: { body: '<script>alert(1)</script>', contentType: 'text/html' } }
    const { container } = renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-video', served)
    await lessonHeading('Recorrido por la pantalla')

    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src', 'blob:prueba/1'))
    expect(files!.created[0]!.type).toBe('application/octet-stream')
  })

  it('una lectura que no se puede leer se explica con su estado y se reintenta', async () => {
    renderClassroom(
      [
        { path: CLASSROOM, body: classroom },
        { path: READING, status: 404, body: problem(404, 'No existe') }
      ],
      '/mis-cursos/mat-srtm-1?leccion=lec-html'
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar este recurso. Código del error: 404.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar y salir del portal' })).not.toBeInTheDocument()
  })

  it('una lectura que no cumple el contrato no se pinta', async () => {
    renderClassroom(
      [
        { path: CLASSROOM, body: classroom },
        { path: READING, body: { title: 'sin bloques' } }
      ],
      '/mis-cursos/mat-srtm-1?leccion=lec-html'
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar este recurso.')
  })

  it('un archivo fuera de la API no se pide: el token no sale de la aplicación', async () => {
    const foreign = structuredClone(classroom)
    foreign.units[0]!.lessons[1]!.resources[0]!.file!.url = 'https://otro.example/video.mp4'
    renderClassroom([{ path: CLASSROOM, body: foreign }], '/mis-cursos/mat-srtm-1?leccion=lec-video')

    expect(await screen.findByRole('alert')).toHaveTextContent('Este recurso apunta fuera de la aplicación y no se abre.')
    expect(files?.calls).toEqual([])
  })

  it('una lección que no es del curso avisa y abre la siguiente por hacer', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=otra')

    expect(await lessonHeading('Recorrido por la pantalla')).toBeInTheDocument()
    expect(screen.getByText('Esa lección no está en este curso; te mostramos la siguiente por hacer.')).toBeInTheDocument()
  })
})

// el aula Colofón (docs/design-system/colofon/Classroom.dc.html): cabecera corrida, índice de libro y notas al margen
describe('ClassroomPage: el aula Colofón', () => {
  const notes = () => screen.getByRole('complementary', { name: 'Notas al margen' })

  it('shows running head with unit, section and folio', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')

    const head = within(screen.getByRole('navigation', { name: 'Ruta' }))
    expect(head.getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    expect(head.getByText('Unidad 2')).toBeInTheDocument()
    // §unidad.lección; la actual es la última miga
    expect(head.getByText('§2.1')).toHaveAttribute('aria-current', 'page')
    expect(head.getByText('Unidad 2')).not.toHaveAttribute('aria-current')
    // el folio: la posición en el recorrido del curso
    expect(head.getByText('3 / 4')).toBeInTheDocument()
  })

  it('lesson index shows unit progress as "Unidad 1 — 1 de 2"', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    const nav = within(units())
    expect(nav.getByText('Unidad 1 — 1 de 2')).toBeInTheDocument()
    expect(nav.getByText('Unidad 2 — 0 de 1')).toBeInTheDocument()
    // arriba del índice, el progreso segmentado del curso con las lecciones que cuentan (una NOT_YET no)
    const index = screen.getByRole('region', { name: 'Índice' })
    const progress = within(index).getByRole('img', { name: '1 de 3 completadas' })
    expect(progress.compareDocumentPosition(units()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect([...progress.querySelectorAll('[data-slot="progress-segment"]')].map((segment) => segment.getAttribute('data-state'))).toEqual([
      'COMPLETADA',
      'NO_INICIADA',
      'NO_INICIADA'
    ])
  })

  it('margin notes list lesson objective, resources and linked sessions', async () => {
    const withPdf = structuredClone(labClassroom)
    withPdf.units[0]!.lessons[2] = { ...labLesson, resources: [classroom.units[1]!.lessons[0]!.resources[0]!] } as never
    renderClassroom(
      [
        { path: CLASSROOM, body: withPdf },
        {
          path: `${CLASSROOM}/sessions`,
          body: [
            { ...sessions[2], lessonId: 'lec-lab' },
            { ...sessions[0], lessonId: 'otra' }
          ]
        }
      ],
      '/mis-cursos/mat-srtm-1?leccion=lec-lab'
    )
    await lessonHeading('Práctica: el padrón a una fecha pasada')

    const margin = within(notes())
    expect(within(margin.getByRole('region', { name: 'Objetivo de la lección' })).getByText(labLesson.lab.objective)).toBeInTheDocument()
    // en las notas, un enlace breve al archivo, que está en el cuerpo
    const resources = within(margin.getByRole('region', { name: 'Recursos' }))
    expect(resources.getByRole('link', { name: 'guia-liquidacion.pdf' })).toHaveAttribute('href', '#recurso-rec-pdf')
    expect(resources.queryByRole('button')).not.toBeInTheDocument()
    // solo las sesiones vinculadas a esta lección
    const linked = within(margin.getByRole('region', { name: 'Sesiones de la lección' }))
    expect(await linked.findByText('Recuperación de la consulta')).toBeInTheDocument()
    expect(linked.queryByText('Presentación del curso')).not.toBeInTheDocument()
    // el objetivo está una sola vez en la página: en las notas, no también en el laboratorio
    expect(screen.getAllByText(labLesson.lab.objective)).toHaveLength(1)
  })

  it('sin sesiones vinculadas, las notas lo dicen y llevan a las sesiones del curso', async () => {
    renderClassroom([
      { path: CLASSROOM, body: classroom },
      { path: `${CLASSROOM}/sessions`, body: [] }
    ])
    await lessonHeading('Recorrido por la pantalla')

    const linked = within(within(notes()).getByRole('region', { name: 'Sesiones de la lección' }))
    expect(await linked.findByText('Esta lección no tiene sesiones vinculadas.')).toBeInTheDocument()
    expect(linked.getByRole('link', { name: 'Ver las sesiones del curso' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1/sesiones')
  })

  it('PDF resource opens PdfDialog and keeps download', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')
    expect(files?.calls).toEqual([])

    const body = within(screen.getByRole('region', { name: 'Guía en PDF' }))
    await userEvent.click(body.getByRole('button', { name: 'Ver guia-liquidacion.pdf' }))

    const dialog = await screen.findByRole('dialog', { name: 'guia-liquidacion.pdf' })
    await waitFor(() => expect(dialog.querySelector('iframe')).toHaveAttribute('src', 'blob:prueba/1'))
    expect(files?.calls).toEqual([{ url: `${FILES}/vr-pdf/files/archivo`, authorization: 'Bearer test-token' }])
    // solo un PDF de verdad llega al visor, y con su tipo: el iframe es del origen de la aplicación
    expect(files!.created[0]!.type).toBe('application/pdf')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(body.getByRole('button', { name: 'Descargar guia-liquidacion.pdf (471 kB)' })).toBeInTheDocument()
  })

  it('un archivo que dice ser PDF y no lo es no se abre en el visor', async () => {
    const served = { ...DEFAULT_FILES, [`${FILES}/vr-pdf/files/archivo`]: { body: '<script>alert(1)</script>', contentType: 'application/pdf' } }
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf', served)
    await lessonHeading('Guía de liquidación')

    await userEvent.click(screen.getByRole('button', { name: 'Ver guia-liquidacion.pdf' }))
    const dialog = await screen.findByRole('dialog', { name: 'guia-liquidacion.pdf' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Este archivo no es un PDF y no se puede ver aquí.')
    expect(dialog.querySelector('iframe')).toBeNull()
    expect(files!.created).toEqual([])
  })

  it('una lección con solo un PDF lo muestra en el cuerpo: su figura con el nombre, Ver y Descargar', async () => {
    const onlyPdf = structuredClone(classroom)
    onlyPdf.units[1]!.lessons[0]!.resources = [classroom.units[1]!.lessons[0]!.resources[0]!]
    renderClassroom([{ path: CLASSROOM, body: onlyPdf }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')

    const article = screen.getByRole('article', { name: 'Guía de liquidación' })
    const figure = within(article).getByRole('figure')
    expect(notes()).not.toContainElement(figure)
    expect(within(figure).getByText('guia-liquidacion.pdf')).toBeInTheDocument()
    expect(within(figure).getByText('Documento · PDF · 471 kB')).toBeInTheDocument()
    expect(within(figure).getByRole('button', { name: 'Ver guia-liquidacion.pdf' })).toBeInTheDocument()
    expect(within(figure).getByRole('button', { name: 'Descargar guia-liquidacion.pdf (471 kB)' })).toBeInTheDocument()
  })

  it('un archivo que no es PDF solo se descarga', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')
    const sheet = within(screen.getByRole('region', { name: 'Plantilla de cálculo' }))
    expect(sheet.getByRole('button', { name: 'Descargar plantilla.xlsx (10 kB)' })).toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: /^Ver/ })).not.toBeInTheDocument()
  })

  it('el título del documento dice la lección abierta y el curso', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await lessonHeading('Guía de liquidación')
    await waitFor(() => expect(document.title).toMatch(/^Guía de liquidación · Licencias de anuncios con SRTM/))
  })

  it('margin outline links to lesson headings', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html')
    await lessonHeading('Tipos de anuncio')

    const outline = within(await within(notes()).findByRole('navigation', { name: 'En esta lección' }))
    expect(outline.getByRole('link', { name: 'Entrar y salir del portal' })).toHaveAttribute('href', '#lectura-_entrar_y_salir_del_portal')
    // el ancla existe en la lectura
    expect(document.getElementById('lectura-_entrar_y_salir_del_portal')).not.toBeNull()
  })
})

describe('ClassroomPage: errores', () => {
  it('una matrícula ajena o inexistente (404) es «No encontramos este curso en tus matrículas», sin reintentar', async () => {
    renderClassroom([{ path: CLASSROOM, status: 404, body: problem(404, 'No existe') }])

    expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos este curso en tus matrículas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
  })

  it('un error del servidor se explica con su estado y deja reintentar', async () => {
    renderClassroom([{ path: CLASSROOM, status: 500, body: problem(500, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el aula')
    expect(alert).toHaveTextContent('Código del error: 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  // RF-AUL-08: los logros salen del aula que ya se leyó, en el panel del temario junto al avance
  describe('logros', () => {
    const achieved = {
      ...classroom,
      achievements: [{ kind: 'UNIT_COMPLETED', at: '2026-10-28T15:30:00Z', ref: 'uni-1' }]
    }
    const paths = () => fetchMock.calls.map((call) => call.url).sort()

    it('el aula sin logros no pinta la sección', async () => {
      renderClassroom([{ path: CLASSROOM, body: classroom }])
      await lessonHeading('Recorrido por la pantalla')
      expect(screen.queryByRole('region', { name: 'Logros' })).toBeNull()
    })

    it('se ven junto al avance y antes del temario, sin mover la lección abierta', async () => {
      renderClassroom([{ path: CLASSROOM, body: achieved }])
      await lessonHeading('Recorrido por la pantalla')
      const region = screen.getByRole('region', { name: 'Logros' })
      expect(within(region).getByRole('link', { name: /^El trámite de anuncios.*Unidad completada/ })).toHaveAttribute(
        'href',
        '/mis-cursos/mat-srtm-1?leccion=lec-html'
      )
      const progress = within(screen.getByRole('region', { name: 'Índice' })).getByRole('img', { name: '1 de 3 completadas' })
      expect(progress.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(region.compareDocumentPosition(units()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('un tipo desconocido no tumba el aula', async () => {
      renderClassroom([{ path: CLASSROOM, body: { ...achieved, achievements: [...achieved.achievements, { kind: 'NUEVO_TIPO', at: null, ref: 'x' }] } }])
      expect(await lessonHeading('Recorrido por la pantalla')).toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: 'Logros' })).getAllByRole('listitem')).toHaveLength(1)
    })

    it('no añaden peticiones: los datos ya vienen en el aula', async () => {
      const first = renderClassroom([{ path: CLASSROOM, body: classroom }])
      await lessonHeading('Recorrido por la pantalla')
      await waitFor(() => expect(fetchMock.calls.length).toBeGreaterThan(0))
      const without = paths()
      first.unmount()
      fetchMock.restore()
      files?.restore()

      renderClassroom([{ path: CLASSROOM, body: achieved }])
      await lessonHeading('Recorrido por la pantalla')
      await waitFor(() => expect(paths()).toEqual(without))
    })
  })
})
