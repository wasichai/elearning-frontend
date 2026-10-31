import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { serveFiles, type ServedFile } from '../../test/files'
import { classroom, lessonHtml, problem } from './test/fixtures'

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'
const FILES = '/api/objects/version_recurso/records'
const DEFAULT_FILES: Record<string, ServedFile> = {
  [`${FILES}/vr-html/files/archivo`]: { body: lessonHtml, contentType: 'text/html' },
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
})

function renderClassroom(routes: MockRoute[], route = '/mis-cursos/mat-srtm-1', served = DEFAULT_FILES) {
  fetchMock = mockFetch(routes)
  files = serveFiles(served)
  // la sesión de renderWithProviders (storagePrefix 'wasichai-test'): el token que deben llevar las descargas
  localStorage.setItem('wasichai-test.token', 'test-token')
  return renderWithProviders(<ClassroomPage />, { modules: [classroomModule()], route, path: '/mis-cursos/:enrollmentId' })
}

const units = () => screen.getByRole('navigation', { name: 'Unidades del curso' })
const lessonHeading = (name: string) => screen.findByRole('heading', { level: 2, name })

describe('ClassroomPage: el aula', () => {
  it('sin ?leccion abre la siguiente por hacer, con las unidades, su avance y el estado de cada lección', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])

    expect(await screen.findByRole('heading', { level: 1, name: classroom.course.title })).toBeInTheDocument()
    expect(await lessonHeading('Recorrido por la pantalla')).toBeInTheDocument()
    expect(screen.getByText('Unidad 1 · Lección 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '33')

    const nav = within(units())
    expect(nav.getByRole('heading', { level: 2, name: /^Unidad 1\. El trámite de anuncios/ })).toHaveTextContent('1 de 2 lecciones completadas')
    expect(nav.getByRole('heading', { level: 2, name: /^Unidad 2\. La liquidación/ })).toHaveTextContent('0 de 1 lecciones completadas')
    expect(nav.getByRole('link', { name: 'Tipos de anuncio Completada' })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-html')
    expect(nav.getByRole('link', { name: 'Recorrido por la pantalla Sin empezar' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getAllByRole('link')).toHaveLength(4)
    expect(nav.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1)
  })

  it('la lección HTML se baja con la sesión y se muestra en un iframe aislado: sandbox vacío, sin scripts ni mismo origen', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html')

    expect(await lessonHeading('Tipos de anuncio')).toBeInTheDocument()
    const frame = await screen.findByTitle('Tipos de anuncio (lectura)')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts|allow-same-origin/)
    const reading = new DOMParser().parseFromString(frame.getAttribute('srcdoc') ?? '', 'text/html')
    // de otro documento: jest-dom no los acepta, se leen a mano
    expect(reading.head.firstElementChild?.getAttribute('http-equiv')).toBe('Content-Security-Policy')
    expect(reading.querySelector('h1')?.textContent).toBe('Tipos de anuncio')
    expect(frame).not.toHaveAttribute('src')
    expect(files?.calls).toEqual([{ url: `${FILES}/vr-html/files/archivo`, authorization: 'Bearer test-token' }])
  })

  it('cambiar de lección en la navegación la abre, la marca y lleva el foco a su título', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    await userEvent.click(within(units()).getByRole('link', { name: /^Guía de liquidación/ }))

    const heading = await lessonHeading('Guía de liquidación')
    expect(heading).toHaveFocus()
    expect(screen.getByText('Unidad 2 · Lección 1')).toBeInTheDocument()
    expect(within(units()).getByRole('link', { name: /^Guía de liquidación/ })).toHaveAttribute('aria-current', 'page')

    // anterior y siguiente al pie de la lección
    const steps = within(screen.getByRole('navigation', { name: 'Lección anterior y siguiente' }))
    expect(steps.getByRole('link', { name: /Anterior.*Recorrido por la pantalla/ })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-video')
    expect(steps.getByRole('link', { name: /Siguiente.*Cuestionario de la unidad/ })).toHaveAttribute('href', '/mis-cursos/mat-srtm-1?leccion=lec-quiz')
  })

  it('en el móvil las unidades se pliegan tras un botón que dice si están abiertas', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }])
    await lessonHeading('Recorrido por la pantalla')

    const toggle = screen.getByRole('button', { name: 'Ver las unidades' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(units()).toHaveClass('hidden', 'lg:block')
    expect(toggle).toHaveAttribute('aria-controls', units().id)

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Ocultar las unidades' })).toHaveAttribute('aria-expanded', 'true')
    expect(units()).not.toHaveClass('hidden')

    // elegir una lección vuelve a plegarlas
    await userEvent.click(within(units()).getByRole('link', { name: /^Tipos de anuncio/ }))
    expect(await lessonHeading('Tipos de anuncio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver las unidades' })).toHaveAttribute('aria-expanded', 'false')
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

  it('un archivo que no se puede bajar se explica con su estado', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=lec-html', {
      [`${FILES}/vr-html/files/archivo`]: { body: '{"status":403}', contentType: 'application/problem+json', status: 403 }
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar este recurso (error 403).')
    expect(screen.queryByTitle('Tipos de anuncio (lectura)')).not.toBeInTheDocument()
  })

  it('un archivo fuera de la API no se pide: el token no sale de la aplicación', async () => {
    const foreign = structuredClone(classroom)
    foreign.units[0]!.lessons[0]!.resources[0]!.file!.url = 'https://otro.example/leccion.html'
    renderClassroom([{ path: CLASSROOM, body: foreign }], '/mis-cursos/mat-srtm-1?leccion=lec-html')

    expect(await screen.findByRole('alert')).toHaveTextContent('Este recurso apunta fuera de la aplicación y no se abre.')
    expect(files?.calls).toEqual([])
  })

  it('una lección que no es del curso avisa y abre la siguiente por hacer', async () => {
    renderClassroom([{ path: CLASSROOM, body: classroom }], '/mis-cursos/mat-srtm-1?leccion=otra')

    expect(await lessonHeading('Recorrido por la pantalla')).toBeInTheDocument()
    expect(screen.getByText('Esa lección no está en este curso; te mostramos la siguiente por hacer.')).toBeInTheDocument()
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
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
