import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { serveFiles } from '../../test/files'
import { AttemptGradingPage } from './AttemptGradingPage'
import { GradingQueuePage } from './GradingQueuePage'
import { teachingModule } from './module'
import { attemptGraded, attemptPartlyGraded, attemptToGrade, offering, pendingAttempts, problem, SUBMISSION_URL } from './test/fixtures'

// la corrección (ADR-0016): cola, intento con soluciones y entregas, y calificar por pregunta con motivo al cambiar

const CODE = 'edicion-sgspe-2026-09'
const OFFERINGS = '/lms/teaching/offerings'
const QUEUE = `${OFFERINGS}/${CODE}/attempts`
const ATTEMPT = '/lms/teaching/attempts/int-1'
const GRADES = `${ATTEMPT}/grades`

let fetchMock: FetchMock
let files: ReturnType<typeof serveFiles> | undefined
afterEach(() => {
  files?.restore()
  files = undefined
  fetchMock?.restore()
  vi.restoreAllMocks()
  localStorage.removeItem('wasichai-test.token')
})

const base: MockRoute[] = [{ path: OFFERINGS, body: [offering] }]

function renderGrading(routes: MockRoute[], route = `/docencia/${CODE}/correccion/int-1`, language?: string) {
  fetchMock = mockFetch([...base, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/docencia/:code/correccion" element={<GradingQueuePage />} />
      <Route path="/docencia/:code/correccion/:attemptId" element={<AttemptGradingPage />} />
    </Routes>,
    { modules: [teachingModule()], route, language }
  )
}

const grades = () => fetchMock.calls.filter((call) => call.method === 'POST' && call.path === GRADES)
const openForm = () => screen.findByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' })

describe('la cola de corrección', () => {
  it('lista lo pendiente con hora en la zona de la edición y lleva a corregir', async () => {
    renderGrading([{ path: QUEUE, body: pendingAttempts }], `/docencia/${CODE}/correccion`)

    const table = await screen.findByRole('table', { name: 'Cola de corrección' })
    const row = within(table).getAllByRole('row')[1]!
    expect(within(row).getByRole('rowheader')).toHaveTextContent('estudiante@demo.local')
    expect(within(row).getByText('Evaluación final')).toBeInTheDocument()
    expect(await within(row).findByText(/28 oct 2026.*10:20/)).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' })).toHaveAttribute(
      'href',
      `/docencia/${CODE}/correccion/int-1`
    )
  })

  it('vacía lo dice; una edición ajena (404) se explica; un contrato roto deja reintentar', async () => {
    const first = renderGrading([{ path: QUEUE, body: [] }], `/docencia/${CODE}/correccion`)
    expect(await screen.findByText('No hay intentos por corregir en esta edición.')).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    const second = renderGrading([{ path: QUEUE, status: 404, body: problem(404, 'No existe') }], `/docencia/${CODE}/correccion`)
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta edición no está entre las tuyas')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    second.unmount()
    fetchMock.restore()

    renderGrading([{ path: QUEUE, body: [{ ...pendingAttempts[0], pendingQuestions: 0 }] }], `/docencia/${CODE}/correccion`)
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('corregir un intento', () => {
  it('muestra respuestas, soluciones y rúbrica; la automática no se califica a mano', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    expect(await screen.findByText('Pendiente de corrección: 2 de 10 puntos por ahora')).toBeInTheDocument()
    expect(await screen.findByText('Estudiante: estudiante@demo.local')).toBeInTheDocument()
    const single = within(screen.getByRole('article', { name: '1. ¿Quién otorga la licencia?' }))
    expect(single.getByText('Respuesta correcta: La municipalidad')).toBeInTheDocument()
    expect(single.getByText('2 de 2 puntos')).toBeInTheDocument()
    expect(single.queryByRole('form')).not.toBeInTheDocument()
    const open = within(screen.getByRole('article', { name: '2. Explica cómo se liquida.' }))
    expect(open.getByText('Se aplica la tasa al área del anuncio.')).toBeInTheDocument()
    expect(open.getByText('Cita la ordenanza (2 pts)')).toBeInTheDocument()
  })

  it('la entrega se baja con la sesión', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade }
    ])
    files = serveFiles({ [SUBMISSION_URL]: { body: '%PDF', contentType: 'application/pdf' } })
    localStorage.setItem('wasichai-test.token', 'test-token')

    await userEvent.click(await screen.findByRole('button', { name: 'Descargar la entrega liquidacion.pdf' }))

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(files.calls).toEqual([{ url: SUBMISSION_URL, authorization: 'Bearer test-token' }])
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('liquidacion.pdf')
  })

  it('una primera nota no pide motivo y lo que responde el servidor se pinta', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade },
      { method: 'POST', path: GRADES, body: attemptPartlyGraded }
    ])

    const form = within(await openForm())
    await userEvent.type(form.getByRole('spinbutton', { name: 'Puntos (de 0 a 4)' }), '3')
    await userEvent.type(form.getByRole('textbox', { name: 'Comentario para el estudiante (opcional)' }), 'Falta la ordenanza.')
    await userEvent.click(form.getByRole('button', { name: 'Guardar la nota' }))

    expect(await form.findByText('Nota guardada')).toBeInTheDocument()
    expect(grades()[0]?.body).toEqual({ questionId: 'p-open', points: 3, comment: 'Falta la ordenanza.', reason: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Pendiente de corrección: 5 de 10 puntos por ahora')).toBeInTheDocument()
  })

  it('al quedar todo corregido el intento da su nota', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptPartlyGraded },
      { method: 'POST', path: GRADES, body: attemptGraded }
    ])

    const form = within(await screen.findByRole('form', { name: 'Calificar 3. Sube la liquidación.' }))
    await userEvent.type(form.getByRole('spinbutton'), '3')
    await userEvent.click(form.getByRole('button', { name: 'Guardar la nota' }))

    expect(await screen.findByText('Corregido: 80 %, aprobado (8 de 10 puntos)')).toBeInTheDocument()
  })

  it.each(['5', '-1', ''])('unos puntos fuera de rango (%j) no se envían', async (value) => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    const form = within(await openForm())
    if (value) await userEvent.type(form.getByRole('spinbutton'), value)
    await userEvent.click(form.getByRole('button', { name: 'Guardar la nota' }))

    expect(await form.findByRole('alert')).toHaveTextContent('Escribe un número de 0 a 4.')
    expect(form.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true')
    expect(grades()).toEqual([])
  })

  it('cambiar una nota exige motivo en un diálogo: sin él no se envía, y con él viaja', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptPartlyGraded },
      { method: 'POST', path: GRADES, body: attemptPartlyGraded }
    ])

    const form = within(await openForm())
    const points = form.getByRole('spinbutton')
    expect(points).toHaveValue(3)
    // sin cambios no hay nada que guardar
    expect(form.getByRole('button', { name: 'Cambiar la nota' })).toBeDisabled()
    await userEvent.clear(points)
    await userEvent.type(points, '4')
    await userEvent.click(form.getByRole('button', { name: 'Cambiar la nota' }))

    const dialog = within(await screen.findByRole('dialog', { name: '¿Cambiar esta nota?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Cambiar la nota' }))
    expect(grades()).toEqual([])
    expect(dialog.getByRole('alert')).toBeInTheDocument()

    await userEvent.type(dialog.getByRole('textbox'), 'Revisión pedida por la estudiante')
    await userEvent.click(dialog.getByRole('button', { name: 'Cambiar la nota' }))

    await waitFor(() => expect(grades()).toHaveLength(1))
    expect(grades()[0]?.body).toEqual({ questionId: 'p-open', points: 4, comment: 'Falta la ordenanza.', reason: 'Revisión pedida por la estudiante' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('un 409 (otra persona ya la calificó) se explica y relee el intento', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade },
      { method: 'POST', path: GRADES, status: 409, body: problem(409, 'La nota ya está puesta') }
    ])

    const form = within(await openForm())
    await userEvent.type(form.getByRole('spinbutton'), '3')
    await userEvent.click(form.getByRole('button', { name: 'Guardar la nota' }))

    expect(
      await form.findByText('Esta nota ya está puesta; para cambiarla hay que indicar un motivo. El servidor dice: «La nota ya está puesta».')
    ).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'GET' && call.path === ATTEMPT).length).toBeGreaterThan(1))
  })

  it('un 400 del servidor se explica con su detalle', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptToGrade },
      { method: 'POST', path: GRADES, status: 400, body: problem(400, 'Puntos fuera de rango') }
    ])

    const form = within(await openForm())
    await userEvent.type(form.getByRole('spinbutton'), '3')
    await userEvent.click(form.getByRole('button', { name: 'Guardar la nota' }))

    expect(await form.findByRole('alert')).toHaveTextContent('El servidor rechazó los datos: Puntos fuera de rango')
  })

  it('un intento ajeno (404) se explica; uno fuera de contrato no se pinta a medias', async () => {
    const first = renderGrading([
      { path: QUEUE, body: [] },
      { path: ATTEMPT, status: 404, body: problem(404, 'No existe') }
    ])
    expect(await screen.findByRole('alert')).toHaveTextContent('Este intento no es de tus ediciones')
    first.unmount()
    fetchMock.restore()

    renderGrading([
      { path: QUEUE, body: [] },
      { path: ATTEMPT, body: { ...attemptToGrade, result: null } }
    ])
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderGrading(
      [
        { path: QUEUE, body: pendingAttempts },
        { path: ATTEMPT, body: attemptToGrade }
      ],
      undefined,
      'en'
    )

    expect(await screen.findByText('Awaiting grading: 2 of 10 points so far')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Save the grade' })).toHaveLength(2)
  })
})
