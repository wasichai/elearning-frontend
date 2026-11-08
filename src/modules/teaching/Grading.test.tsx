import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useLocation } from 'react-router'
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
  // la misma lista: una prueba puede cambiar una respuesta a mitad de camino
  routes.push(...base)
  fetchMock = mockFetch(routes)
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
    expect(within(row).getByText(/^Enviado hace/)).toBeInTheDocument()
    expect(within(row).getByText('2')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' })).toHaveAttribute(
      'href',
      `/docencia/${CODE}/correccion/int-1`
    )
  })

  // el nombre de quien entregó, con el correo debajo (elearning-backend#376); sin nombre, el correo como hasta ahora
  it('con el nombre de quien entregó, lo pone delante del correo y lo usa en el enlace', async () => {
    renderGrading([{ path: QUEUE, body: [{ ...pendingAttempts[0]!, name: 'Rosa Estudiante' }] }], `/docencia/${CODE}/correccion`)

    const row = within(await screen.findByRole('table', { name: 'Cola de corrección' })).getAllByRole('row')[1]!
    expect(within(row).getByRole('rowheader')).toHaveTextContent('Rosa Estudiante')
    expect(within(row).getByRole('rowheader')).toHaveTextContent('estudiante@demo.local')
    expect(within(row).getByRole('link', { name: 'Corregir «Evaluación final» de Rosa Estudiante' })).toBeInTheDocument()
  })

  it('pone lo más antiguo arriba, y solo su «Corregir» es la primaria', async () => {
    const queue = [
      { ...pendingAttempts[0]!, attemptId: 'int-2', email: 'nueva@demo.local', submittedAt: '2026-10-30T10:00:00Z' },
      { ...pendingAttempts[0]!, attemptId: 'int-1', email: 'vieja@demo.local', submittedAt: '2026-10-01T10:00:00Z' }
    ]
    renderGrading([{ path: QUEUE, body: queue }], `/docencia/${CODE}/correccion`)

    const table = within(await screen.findByRole('table', { name: 'Cola de corrección' }))
    expect(table.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['vieja@demo.local', 'nueva@demo.local'])
    const actions = table.getAllByRole('link', { name: /^Corregir/ })
    expect(actions.map((action) => action.getAttribute('data-variant'))).toEqual(['primary', 'secondary'])
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Estudiante',
      'Evaluación',
      'Preguntas por corregir',
      'Enviado',
      'Acción'
    ])
  })

  it('vacía lo dice; una edición ajena (404) se explica; un contrato roto deja reintentar', async () => {
    const first = renderGrading([{ path: QUEUE, body: [] }], `/docencia/${CODE}/correccion`)
    expect(await screen.findByText('Nada pendiente por corregir')).toBeInTheDocument()
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
    // la respuesta del estudiante se lee como texto, en la letra de lectura (PantallaCorreccion)
    expect(open.getByText('Se aplica la tasa al área del anuncio.')).toHaveClass('font-read')
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

describe('corregir en lote', () => {
  const OLDER = { ...pendingAttempts[0]!, attemptId: 'int-0', email: 'antes@demo.local', submittedAt: '2026-10-01T10:00:00Z' }
  const NEWER = { ...pendingAttempts[0]!, attemptId: 'int-2', email: 'despues@demo.local', submittedAt: '2026-10-29T10:00:00Z' }
  const FULL = [OLDER, pendingAttempts[0]!, NEWER]
  const NEXT_ATTEMPT = { path: '/lms/teaching/attempts/int-2', body: { ...attemptToGrade, id: 'int-2' } }
  const SAVE = 'Guardar y pasar al siguiente'

  async function fill(question: string, points: string, comment?: string) {
    const form = within(await screen.findByRole('form', { name: `Calificar ${question}` }))
    await userEvent.type(form.getByRole('spinbutton'), points)
    if (comment) await userEvent.type(form.getByRole('textbox'), comment)
  }
  const OPEN = '2. Explica cómo se liquida.'
  const FILE = '3. Sube la liquidación.'

  it('dice la posición en la cola, y lleva a la anterior y a la siguiente', async () => {
    renderGrading([
      { path: QUEUE, body: FULL },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    expect(await screen.findByText('2 de 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', `/docencia/${CODE}/correccion/int-0`)
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', `/docencia/${CODE}/correccion/int-2`)
  })

  it('nombra a quien entregó, si la cola trae su nombre', async () => {
    renderGrading([
      { path: QUEUE, body: [{ ...pendingAttempts[0]!, name: 'Rosa Estudiante' }] },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    expect(await screen.findByText(/Rosa Estudiante/)).toBeInTheDocument()
  })

  it('«Guardar y pasar al siguiente» guarda lo escrito y abre la siguiente de la cola', async () => {
    renderGrading([{ path: QUEUE, body: FULL }, { path: ATTEMPT, body: attemptToGrade }, { method: 'POST', path: GRADES, body: attemptToGrade }, NEXT_ATTEMPT])

    await screen.findByText('2 de 3')
    await fill(OPEN, '3', 'Falta la ordenanza.')
    await fill(FILE, '4')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    await waitFor(() => expect(fetchMock.calls.some((call) => call.path === '/lms/teaching/attempts/int-2')).toBe(true))
    expect(grades().map((call) => call.body)).toEqual([
      { questionId: 'p-open', points: 3, comment: 'Falta la ordenanza.', reason: null },
      { questionId: 'p-file', points: 4, comment: null, reason: null }
    ])
    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
  })

  it('no pasa si falta una nota: lo dice en su pregunta y no envía nada', async () => {
    renderGrading([
      { path: QUEUE, body: FULL },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    await screen.findByText('2 de 3')
    await fill(OPEN, '3')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    const form = within(screen.getByRole('form', { name: `Calificar ${FILE}` }))
    expect(await form.findByRole('alert')).toHaveTextContent('Escribe un número de 0 a 4.')
    expect(form.getByRole('spinbutton')).toHaveFocus()
    expect(grades()).toEqual([])
  })

  it('al terminar la última lo dice claro y lleva a la cola', async () => {
    renderGrading([
      { path: QUEUE, body: pendingAttempts },
      { path: ATTEMPT, body: attemptPartlyGraded },
      { method: 'POST', path: GRADES, body: attemptGraded }
    ])

    await screen.findByText('1 de 1')
    await fill(FILE, '3')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y terminar' }))

    expect(await screen.findByText('Has corregido la última entrega de la cola.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la cola' })).toHaveAttribute('href', `/docencia/${CODE}/correccion`)
    expect(screen.queryByRole('button', { name: 'Guardar y terminar' })).not.toBeInTheDocument()
  })

  it('un error al guardar no pierde lo escrito, lo dice y se puede reintentar', async () => {
    const routes: MockRoute[] = [
      { path: QUEUE, body: FULL },
      { path: ATTEMPT, body: attemptToGrade },
      { method: 'POST', path: GRADES, status: 500, body: problem(500, 'fallo') },
      NEXT_ATTEMPT
    ]
    renderGrading(routes)

    await screen.findByText('2 de 3')
    await fill(OPEN, '3', 'Falta la ordenanza.')
    await fill(FILE, '4')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    expect(await screen.findByText(/No se guardó todo\. Lo que escribiste sigue aquí/)).toBeInTheDocument()
    const form = within(screen.getByRole('form', { name: `Calificar ${OPEN}` }))
    expect(form.getByRole('spinbutton')).toHaveValue(3)
    expect(form.getByRole('textbox')).toHaveValue('Falta la ordenanza.')
    expect(screen.getByText('2 de 3')).toBeInTheDocument()

    const failed = routes.findIndex((route) => route.method === 'POST')
    routes[failed] = { method: 'POST', path: GRADES, body: attemptToGrade }
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
  })

  it('un cambio de nota pide el motivo también al pasar, y dice quién lo leerá', async () => {
    renderGrading([{ path: QUEUE, body: FULL }, { path: ATTEMPT, body: attemptGraded }, { method: 'POST', path: GRADES, body: attemptGraded }, NEXT_ATTEMPT])

    await screen.findByText('2 de 3')
    const points = within(screen.getByRole('form', { name: `Calificar ${OPEN}` })).getByRole('spinbutton')
    await userEvent.clear(points)
    await userEvent.type(points, '4')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    const dialog = within(await screen.findByRole('dialog', { name: '¿Cambiar esta nota?' }))
    expect(dialog.getByText(/Lo leen los docentes de esta edición y la administración; el estudiante, no\./)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Cambiar la nota' }))
    expect(grades()).toEqual([])

    await userEvent.type(dialog.getByRole('textbox'), 'Revisión pedida')
    await userEvent.click(dialog.getByRole('button', { name: 'Cambiar la nota' }))

    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
    expect(grades()).toHaveLength(1)
    expect(grades()[0]?.body).toMatchObject({ questionId: 'p-open', points: 4, reason: 'Revisión pedida' })
  })

  it('sin nada que guardar pasa sin enviar nada', async () => {
    renderGrading([{ path: QUEUE, body: FULL }, { path: ATTEMPT, body: attemptGraded }, NEXT_ATTEMPT])

    await screen.findByText('2 de 3')
    await userEvent.click(screen.getByRole('button', { name: SAVE }))

    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
    expect(grades()).toEqual([])
  })

  it('el total a la vista suma lo escrito antes de guardarlo', async () => {
    renderGrading([
      { path: QUEUE, body: FULL },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    await fill(OPEN, '3')

    expect(await screen.findByText('Con lo escrito sin guardar: 5 de 10 puntos')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de corrección: 2 de 10 puntos por ahora')).toBeInTheDocument()
  })

  it('las celdas de la rúbrica se pulsan, dicen su estado y suman sus puntos a la nota', async () => {
    renderGrading([
      { path: QUEUE, body: FULL },
      { path: ATTEMPT, body: attemptToGrade }
    ])

    const form = within(await screen.findByRole('form', { name: `Calificar ${OPEN}` }))
    const first = form.getByRole('button', { name: 'Cita la ordenanza (2 pts)' })
    const second = form.getByRole('button', { name: 'Explica el cálculo (2 pts)' })
    expect(first).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(first).toHaveTextContent('Elegido')
    expect(form.getByRole('spinbutton')).toHaveValue(2)

    await userEvent.click(second)
    expect(form.getByRole('spinbutton')).toHaveValue(4)

    await userEvent.click(first)
    await userEvent.click(second)
    expect(form.getByRole('spinbutton')).toHaveValue(null)
    expect(form.getByText(/Solo se guardan la nota y el comentario/)).toBeInTheDocument()
  })

  describe('salir con cambios sin guardar', () => {
    function Where() {
      return <output aria-label="ruta">{useLocation().pathname}</output>
    }

    function renderWithWhere(routes: MockRoute[]) {
      fetchMock = mockFetch([...base, ...routes])
      return renderWithProviders(
        <>
          <Where />
          <Routes>
            <Route path="/docencia/:code/correccion" element={<p>La cola</p>} />
            <Route path="/docencia/:code/correccion/:attemptId" element={<AttemptGradingPage />} />
          </Routes>
        </>,
        { modules: [teachingModule()], route: `/docencia/${CODE}/correccion/int-1` }
      )
    }
    const ROUTES: MockRoute[] = [{ path: QUEUE, body: FULL }, { path: ATTEMPT, body: attemptToGrade }, NEXT_ATTEMPT]

    it('sin cambios, los enlaces salen sin preguntar', async () => {
      renderWithWhere(ROUTES)

      await screen.findByText('2 de 3')
      await userEvent.click(screen.getByRole('link', { name: '← Cola de corrección' }))

      expect(await screen.findByText('La cola')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('con cambios avisa: se puede seguir sin perder nada, o salir a sabiendas', async () => {
      renderWithWhere(ROUTES)

      await screen.findByText('2 de 3')
      await fill(OPEN, '3', 'Falta la ordenanza.')
      await userEvent.click(screen.getByRole('link', { name: '← Cola de corrección' }))

      const dialog = within(await screen.findByRole('dialog', { name: '¿Salir sin guardar?' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Seguir aquí' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(screen.getByRole('form', { name: `Calificar ${OPEN}` })).getByRole('textbox')).toHaveValue('Falta la ordenanza.')
      expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(`/docencia/${CODE}/correccion/int-1`)

      await userEvent.click(screen.getByRole('link', { name: 'Siguiente' }))
      const again = within(await screen.findByRole('dialog', { name: '¿Salir sin guardar?' }))
      await userEvent.click(again.getByRole('button', { name: 'Salir sin guardar' }))
      await waitFor(() => expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(`/docencia/${CODE}/correccion/int-2`))
    })

    it('el aviso tampoco falta al recargar o cerrar la pestaña', async () => {
      renderWithWhere(ROUTES)

      await screen.findByText('2 de 3')
      const clean = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(clean)
      expect(clean.defaultPrevented).toBe(false)

      await fill(OPEN, '3')
      const dirty = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(dirty)
      expect(dirty.defaultPrevented).toBe(true)
    })
  })
})
