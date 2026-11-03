import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CallerPermissions } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { administrationModule } from './module'
import { PublishTermsPage } from './PublishTermsPage'

const TERMS = '/lms/terms'
const current = { version: 3, text: 'Texto vigente', retentionDays: 730, publishedAt: '2026-11-01T15:00:00Z' }
const STUDENT: CallerPermissions = { admin: false, capabilities: [], objects: { matricula: ['READ', 'CREATE'] } }
const MANAGER: CallerPermissions = { admin: false, capabilities: ['MANAGE_ORGANIZATION'], objects: {} }
const problem = (status: number, detail: string, errors?: unknown[]) => ({ title: 'Problem', status, detail, errors })

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPage(routes: MockRoute[], permissions: CallerPermissions = MANAGER) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<PublishTermsPage />, {
    modules: [administrationModule()],
    route: '/administracion/terminos',
    path: '/administracion/terminos',
    permissions
  })
}

const text = () => screen.findByRole('textbox', { name: 'Texto de los términos' })
const days = () => screen.getByRole('textbox', { name: 'Plazo de conservación, en días' })
const submit = () => screen.getByRole('button', { name: 'Publicar versión nueva' })
const posts = () => fetchMock.calls.filter((call) => call.method === 'POST')

async function fill(value: string, retention: string) {
  const area = await text()
  await userEvent.clear(area)
  if (value) await userEvent.type(area, value)
  await userEvent.clear(days())
  if (retention) await userEvent.type(days(), retention)
}

describe('autorización negativa', () => {
  it('sin MANAGE_ORGANIZATION no ve el formulario ni pide los términos para publicar', async () => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }], STUDENT)

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para publicar los términos')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar versión nueva' })).not.toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.path === TERMS)).toEqual([])
  })

  it('si el servidor lo rechaza (403), lo dice aunque la interfaz creyera otra cosa', async () => {
    renderPage([
      { path: TERMS, body: { current, acceptance: null } },
      { method: 'POST', path: TERMS, status: 403, body: problem(403, 'Forbidden') }
    ])

    await fill('Nuevo', '30')
    await userEvent.click(submit())
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No tienes permiso para publicar los términos')
  })
})

describe('publicar', () => {
  it('muestra lo vigente y parte de ello', async () => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }])

    expect(await text()).toHaveValue('Texto vigente')
    expect(days()).toHaveValue('730')
    expect(screen.getByText(/Versión vigente: 3/)).toBeInTheDocument()
  })

  it('sin términos publicados avisa de que nadie puede matricularse', async () => {
    renderPage([{ path: TERMS, body: { current: null, acceptance: null } }])

    expect(await screen.findByText(/nadie puede matricularse/)).toBeInTheDocument()
    expect(await text()).toHaveValue('')
  })

  it('una publicada no cambia: pide confirmar, y cancelar no envía nada y devuelve el foco', async () => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }])

    await fill('Nuevo', '30')
    submit().focus()
    await userEvent.click(submit())
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/no se puede cambiar/)).toBeInTheDocument()
    expect(within(dialog).getByText(/no altera/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(submit()).toHaveFocus())
    expect(posts()).toEqual([])
  })

  it('al confirmar envía texto y plazo, y dice qué versión quedó vigente', async () => {
    const terms = { path: TERMS, body: { current, acceptance: null } as unknown }
    const published = { ...current, version: 4, text: 'Nuevo texto', retentionDays: 30 }
    renderPage([terms, { method: 'POST', path: TERMS, status: 201, body: published }])

    await fill('  Nuevo texto  ', '30')
    await userEvent.click(submit())
    terms.body = { current: published, acceptance: null }
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Publicaste la versión 4')).toBeInTheDocument()
    expect(posts()[0]?.body).toEqual({ text: 'Nuevo texto', retentionDays: 30 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText(/Versión vigente: 4/)).toBeInTheDocument()
  })

  it.each([
    ['vacío', '', '30', 'Escribe el texto de los términos.'],
    ['solo espacios', '   ', '30', 'Escribe el texto de los términos.']
  ])('el texto %s se explica junto al campo y no se envía', async (_case, value, retention, message) => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }])

    await fill(value, retention)
    await userEvent.click(submit())

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(await text()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['', '0', '36501', '12.5', 'mucho', '-3'])('el plazo «%s» se explica junto al campo y no se envía', async (retention) => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }])

    await fill('Nuevo', retention)
    await userEvent.click(submit())

    expect(await screen.findByText('Escribe un número entero de días, de 1 a 36 500.')).toBeInTheDocument()
    expect(days()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['1', '36500'])('admite el plazo límite %s', async (retention) => {
    renderPage([{ path: TERMS, body: { current, acceptance: null } }])

    await fill('Nuevo', retention)
    await userEvent.click(submit())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('un 400 del servidor se muestra en cada campo que nombra', async () => {
    const errors = [
      { field: 'text', message: 'must have between 1 and 100000 characters' },
      { field: 'retentionDays', message: 'must be a number of days between 1 and 36500' }
    ]
    renderPage([
      { path: TERMS, body: { current, acceptance: null } },
      { method: 'POST', path: TERMS, status: 400, body: problem(400, 'Invalid terms of use', errors) }
    ])

    await fill('Nuevo', '30')
    await userEvent.click(submit())
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publicar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await text()).toHaveAttribute('aria-invalid', 'true')
    expect(days()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('El texto debe tener entre 1 y 100 000 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Escribe un número entero de días, de 1 a 36 500.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Texto de los términos' })).toHaveFocus())
  })

  it('un error que no es de un campo se queda en el diálogo', async () => {
    renderPage([
      { path: TERMS, body: { current, acceptance: null } },
      { method: 'POST', path: TERMS, status: 500, body: problem(500, 'Fallo') }
    ])

    await fill('Nuevo', '30')
    await userEvent.click(submit())
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos publicar los términos')
  })

  it('si no carga lo vigente, lo dice y ofrece reintentar, sin formulario', async () => {
    renderPage([{ path: TERMS, status: 500, body: problem(500, 'Fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los términos vigentes')
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
