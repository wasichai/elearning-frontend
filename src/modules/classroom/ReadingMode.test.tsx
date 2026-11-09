import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { classroom, readingDocument } from './test/fixtures'

// el modo lectura de la lección (docs/design-system/colofon, Classroom): el tema colofon-lectura en el contenedor de la
// lección y el tamaño del texto de la lectura, recordados en el navegador con el storagePrefix

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'
const READING = `${CLASSROOM}/resources/rec-html/reading`
// storagePrefix de renderWithProviders
const KEY = 'wasichai-test.reading'

let fetchMock: FetchMock
afterEach(() => {
  fetchMock?.restore()
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

function renderLesson(lesson = 'lec-html') {
  fetchMock = mockFetch([
    { path: CLASSROOM, body: classroom },
    { path: READING, body: readingDocument }
  ])
  localStorage.setItem('wasichai-test.token', 'test-token')
  return renderWithProviders(<ClassroomPage />, {
    modules: [classroomModule()],
    route: `/mis-cursos/mat-srtm-1?leccion=${lesson}`,
    path: '/mis-cursos/:enrollmentId'
  })
}

const tools = () => screen.findByRole('toolbar', { name: 'Lectura' })
const article = () => screen.getByRole('article', { name: 'Tipos de anuncio' })
// la lectura pintada en la página: su tamaño y su interlineado son variables CSS de su raíz
const readingStyle = async (property: '--reading-size' | '--reading-leading') => {
  await screen.findByRole('heading', { name: 'Entrar y salir del portal' })
  return document.querySelector<HTMLElement>('[data-reading]')?.style.getPropertyValue(property)
}

describe('modo lectura de la lección', () => {
  it('al llevar A− a su límite, el botón se deshabilita y el foco sigue en la barra', async () => {
    renderLesson()
    const toolbar = await tools()
    const smaller = within(toolbar).getByRole('button', { name: 'Texto más pequeño' })
    for (let press = 0; press < 10 && !smaller.hasAttribute('disabled'); press++) await userEvent.click(smaller)

    expect(smaller).toBeDisabled()
    expect(toolbar).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).not.toBe(smaller)
  })

  it('la barra de herramientas es un solo tabstop y se recorre con las flechas', async () => {
    renderLesson()
    const bar = within(await tools())
    const buttons = bar.getAllByRole('button')
    expect(buttons.filter((button) => button.getAttribute('tabindex') === '0')).toHaveLength(1)

    buttons[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(buttons[1]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(buttons.at(-1)).toHaveFocus()
  })

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

  it('A+ y A− cambian el texto de la lectura de 2 en 2 entre 18 y 24px, desde los 20px de text-reading', async () => {
    renderLesson()
    const bar = within(await tools())
    const larger = bar.getByRole('button', { name: 'Texto más grande' })
    const smaller = bar.getByRole('button', { name: 'Texto más pequeño' })
    expect(bar.getByText('20 px')).toBeInTheDocument()
    expect(await readingStyle('--reading-size')).toBe('20px')

    await userEvent.click(larger)
    await waitFor(async () => expect(await readingStyle('--reading-size')).toBe('22px'))
    await userEvent.click(larger)
    expect(bar.getByText('24 px')).toBeInTheDocument()
    expect(larger).toBeDisabled()

    for (const _ of [1, 2, 3]) await userEvent.click(smaller)
    expect(bar.getByText('18 px')).toBeInTheDocument()
    expect(smaller).toBeDisabled()
    await waitFor(async () => expect(await readingStyle('--reading-size')).toBe('18px'))
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: false, size: 18 })
  })

  it('al volver, la lección se abre con el modo y el tamaño guardados', async () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: true, size: 22 }))
    renderLesson()

    expect(within(await tools()).getByRole('button', { name: 'Modo lectura' })).toHaveAttribute('aria-pressed', 'true')
    expect(article()).toHaveAttribute('data-theme', 'colofon-lectura')
    await waitFor(async () => expect(await readingStyle('--reading-size')).toBe('22px'))
  })

  it('una preferencia guardada que no se entiende se ignora', async () => {
    localStorage.setItem(KEY, '{"mode":"sí","size":40')
    renderLesson()

    expect(within(await tools()).getByRole('button', { name: 'Modo lectura' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(await tools()).getByText('20 px')).toBeInTheDocument()
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
    await waitFor(async () => expect(await readingStyle('--reading-leading')).toBe('1.79'))
  })

  it('en el modo lectura claro, la lectura va en el papel sepia con su interlineado de siempre', async () => {
    renderLesson()
    await userEvent.click(within(await tools()).getByRole('button', { name: 'Modo lectura' }))
    expect(await readingStyle('--reading-leading')).toBe('1.65')
    expect(article()).toHaveAttribute('data-theme', 'colofon-lectura')
    expect(article()).toContainElement(document.querySelector<HTMLElement>('[data-reading]'))
  })

  it('una lección sin lectura HTML no muestra el tamaño ni el modo lectura; el modo foco, sí', async () => {
    renderLesson('lec-video')
    expect(await screen.findByRole('heading', { level: 2, name: 'Recorrido por la pantalla' })).toBeInTheDocument()
    const bar = within(await tools())
    expect(bar.queryByRole('button', { name: 'Modo lectura' })).not.toBeInTheDocument()
    expect(bar.queryByRole('button', { name: 'Texto más grande' })).not.toBeInTheDocument()
    expect(bar.getByRole('button', { name: 'Modo foco' })).toBeInTheDocument()
  })

  it('en modo foco los archivos siguen en el cuerpo: una lección PDF muestra Ver y Descargar', async () => {
    localStorage.setItem(KEY, JSON.stringify({ mode: false, focus: true }))
    renderLesson('lec-pdf')
    expect(await screen.findByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Notas al margen' })).not.toBeInTheDocument()
    const lesson = within(screen.getByRole('article', { name: 'Guía de liquidación' }))
    expect(lesson.getByRole('button', { name: 'Ver guia-liquidacion.pdf' })).toBeInTheDocument()
    expect(lesson.getByRole('button', { name: 'Descargar guia-liquidacion.pdf (471 kB)' })).toBeInTheDocument()
  })

  it('el modo foco deja solo el texto: pliega el índice y las notas al margen, y se recuerda', async () => {
    const first = renderLesson()
    const focus = within(await tools()).getByRole('button', { name: 'Modo foco' })
    expect(focus).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('navigation', { name: 'Unidades del curso' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Notas al margen' })).toBeInTheDocument()

    await userEvent.click(focus)

    expect(focus).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('navigation', { name: 'Unidades del curso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Notas al margen' })).not.toBeInTheDocument()
    expect(within(article()).getByRole('heading', { level: 4, name: 'Entrar y salir del portal' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: false, focus: true })
    // «Índice» lo pide de vuelta: quita el modo foco
    expect(screen.getByRole('button', { name: 'Índice', pressed: false })).toBeInTheDocument()

    first.unmount()
    renderLesson()
    expect(within(await tools()).getByRole('button', { name: 'Modo foco' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('complementary', { name: 'Notas al margen' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Índice', pressed: false }))
    expect(screen.getByRole('navigation', { name: 'Unidades del curso' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Notas al margen' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ mode: false, focus: false, syllabusHidden: false })
  })
})
