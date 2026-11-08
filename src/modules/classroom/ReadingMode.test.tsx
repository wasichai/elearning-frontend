import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { serveFiles } from '../../test/files'
import { classroom, lessonHtml } from './test/fixtures'

// el modo lectura de la lección (docs/design-system/colofon, Classroom): el tema colofon-lectura en el contenedor de la
// lección y el tamaño del texto de la lectura, recordados en el navegador con el storagePrefix

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'
const FILE = '/api/objects/version_recurso/records/vr-html/files/archivo'
// storagePrefix de renderWithProviders
const KEY = 'wasichai-test.reading'

let fetchMock: FetchMock
let files: ReturnType<typeof serveFiles> | undefined
afterEach(() => {
  files?.restore()
  fetchMock?.restore()
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

function renderLesson(lesson = 'lec-html') {
  fetchMock = mockFetch([{ path: CLASSROOM, body: classroom }])
  files = serveFiles({ [FILE]: { body: lessonHtml, contentType: 'text/html' } })
  localStorage.setItem('wasichai-test.token', 'test-token')
  return renderWithProviders(<ClassroomPage />, {
    modules: [classroomModule()],
    route: `/mis-cursos/mat-srtm-1?leccion=${lesson}`,
    path: '/mis-cursos/:enrollmentId'
  })
}

const tools = () => screen.findByRole('toolbar', { name: 'Lectura' })
const article = () => screen.getByRole('article', { name: 'Tipos de anuncio' })
const readingCss = async () => {
  const frame = await screen.findByTitle('Tipos de anuncio (lectura)')
  const doc = new DOMParser().parseFromString(frame.getAttribute('srcdoc') ?? '', 'text/html')
  return doc.querySelector('style[data-reading]')?.textContent ?? ''
}

describe('modo lectura de la lección', () => {
  it('el botón pone el papel sepia en la lección y se recuerda', async () => {
    renderLesson()
    const toggle = within(await tools()).getByRole('button', { name: 'Modo lectura' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(article()).not.toHaveAttribute('data-theme')

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(article()).toHaveAttribute('data-theme', 'colofon-lectura')
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: true })

    await userEvent.click(toggle)
    expect(article()).not.toHaveAttribute('data-theme')
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: false })
  })

  it('A+ y A− cambian el texto de la lectura de 2 en 2 entre 17 y 23px', async () => {
    renderLesson()
    const bar = within(await tools())
    const larger = bar.getByRole('button', { name: 'Texto más grande' })
    const smaller = bar.getByRole('button', { name: 'Texto más pequeño' })
    expect(bar.getByText('19 px')).toBeInTheDocument()

    await userEvent.click(larger)
    await waitFor(async () => expect(await readingCss()).toContain('font-size: 21px'))
    await userEvent.click(larger)
    expect(bar.getByText('23 px')).toBeInTheDocument()
    expect(larger).toBeDisabled()

    for (const _ of [1, 2, 3]) await userEvent.click(smaller)
    expect(bar.getByText('17 px')).toBeInTheDocument()
    expect(smaller).toBeDisabled()
    await waitFor(async () => expect(await readingCss()).toContain('font-size: 17px'))
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: false, size: 17 })
  })

  it('al volver, la lección se abre con el modo y el tamaño guardados', async () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: true, size: 21 }))
    renderLesson()

    expect(within(await tools()).getByRole('button', { name: 'Modo lectura' })).toHaveAttribute('aria-pressed', 'true')
    expect(article()).toHaveAttribute('data-theme', 'colofon-lectura')
    await waitFor(async () => expect(await readingCss()).toContain('font-size: 21px'))
  })

  it('una preferencia guardada que no se entiende se ignora', async () => {
    localStorage.setItem(KEY, '{"mode":"sí","size":40')
    renderLesson()

    expect(within(await tools()).getByRole('button', { name: 'Modo lectura' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(await tools()).getByText('19 px')).toBeInTheDocument()
  })

  it('si el navegador no deja guardar, el modo lectura funciona igual', async () => {
    renderLesson()
    const bar = await tools()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    await userEvent.click(within(bar).getByRole('button', { name: 'Modo lectura' }))
    expect(article()).toHaveAttribute('data-theme', 'colofon-lectura')
  })

  it('sobre un tema oscuro, el modo lectura sigue oscuro y abre el interlineado', async () => {
    // el tema oscuro guardado: el ThemeProvider de Wasichai lo aplica a <html>
    localStorage.setItem('wasichai-test.theme', 'dark')
    renderLesson()
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'))
    await userEvent.click(within(await tools()).getByRole('button', { name: 'Modo lectura' }))

    expect(article()).not.toHaveAttribute('data-theme')
    await waitFor(async () => expect(await readingCss()).toContain('line-height: 1.79'))
    expect(await readingCss()).toContain('color-scheme: dark')
  })

  it('en el modo lectura claro, la lectura del iframe es clara aunque la página no lo diga', async () => {
    renderLesson()
    await userEvent.click(within(await tools()).getByRole('button', { name: 'Modo lectura' }))
    await waitFor(async () => expect(await readingCss()).toContain('color-scheme: light'))
    expect(await readingCss()).not.toContain('line-height: 1.79')
  })

  it('una lección sin lectura HTML no muestra las herramientas', async () => {
    renderLesson('lec-video')
    expect(await screen.findByRole('heading', { level: 2, name: 'Recorrido por la pantalla' })).toBeInTheDocument()
    expect(screen.queryByRole('toolbar', { name: 'Lectura' })).not.toBeInTheDocument()
  })
})
