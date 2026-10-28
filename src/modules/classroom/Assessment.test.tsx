import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { deadlineStage, formatRemaining } from './Countdown'
import { classroomModule } from './module'
import { serveFiles, type ServedFile } from './test/files'
import { assessmentClassroom, gradedAttempt, openAttempt, problem, submission, submittedAttempt } from './test/fixtures'

// la evaluación en el aula (ADR-0016): reglas, intento, respuestas por tipo, plazo, envío y resultado

const CLASSROOM = '/lms/classroom/enrollments/mat-sgspe-1'
const ATTEMPTS = `${CLASSROOM}/lessons/lec-eva/attempts`
const ATTEMPT = '/lms/classroom/attempts/int-1'
const UPLOAD = '/api/objects/entrega/records/ent-1/files/archivo'

let fetchMock: FetchMock
let files: ReturnType<typeof serveFiles> | undefined
afterEach(() => {
  files?.restore()
  fetchMock?.restore()
  localStorage.removeItem('wasichai-test.token')
})

type Body = Record<string, unknown>
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString()
const withAssessment = (patch: Body) => {
  const copy = structuredClone(assessmentClassroom)
  Object.assign(copy.units[0]!.lessons[1]!.assessment!, patch)
  return copy
}
const attempt = (patch: Body = {}) => ({ ...structuredClone(openAttempt), deadline: inMinutes(25), ...patch })

function renderAssessment(routes: MockRoute[], query = '?leccion=lec-eva', served: Record<string, ServedFile> = {}, language?: string) {
  fetchMock = mockFetch(routes)
  files = serveFiles(served)
  localStorage.setItem('wasichai-test.token', 'test-token')
  return renderWithProviders(<ClassroomPage />, {
    modules: [classroomModule()],
    route: `/mis-cursos/mat-sgspe-1${query}`,
    path: '/mis-cursos/:enrollmentId',
    language
  })
}

const calls = (method: string, path: string) => fetchMock.calls.filter((call) => call.method === method && call.path === path)
const panel = () => screen.findByRole('region', { name: 'Evaluación final' })

describe('la evaluación como lección', () => {
  it('muestra sus reglas, cómo se completa y empieza un intento que se abre en la misma lección', async () => {
    const opened = attempt()
    renderAssessment([
      { path: CLASSROOM, body: assessmentClassroom },
      { method: 'POST', path: ATTEMPTS, status: 201, body: opened },
      { method: 'POST', path: `${CLASSROOM}/lessons/lec-eva/events`, body: { status: 'INICIADA', startedAt: '2026-10-28T15:00:00Z' } }
    ])

    const rules = within(await panel())
    expect(rules.getByText('0 de 2 usados')).toBeInTheDocument()
    expect(rules.getByText('30 min')).toBeInTheDocument()
    expect(rules.getByText('70 %')).toBeInTheDocument()
    expect(rules.getByText('Aún sin intentos enviados')).toBeInTheDocument()
    expect(screen.getByText('Se completa al aprobar la evaluación.')).toBeInTheDocument()
    // la evaluación sin material no dice «sin material»
    expect(screen.queryByText('Esta lección no tiene material.')).not.toBeInTheDocument()

    await userEvent.click(rules.getByRole('button', { name: 'Empezar el intento' }))

    expect(await screen.findByRole('heading', { level: 3, name: 'Intento 1' })).toHaveFocus()
    expect(calls('POST', ATTEMPTS)).toHaveLength(1)
    expect(screen.getByRole('link', { name: '← Volver a la evaluación' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-eva')
    expect(screen.getAllByRole('group')).toHaveLength(6)
  })

  it('con un intento abierto ofrece retomarlo', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, openAttemptId: 'int-1' }) }])

    expect(within(await panel()).getByRole('link', { name: 'Retomar el intento abierto' })).toHaveAttribute(
      'href',
      '/mis-cursos/mat-sgspe-1?leccion=lec-eva&intento=int-1'
    )
    expect(screen.queryByRole('button', { name: /Empezar/ })).not.toBeInTheDocument()
  })

  it('con los intentos agotados lo dice y no ofrece empezar otro', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 2, best: { percent: 60, passed: false, pending: false } }) }])

    const rules = within(await panel())
    expect(rules.getByText('Ya usaste tus 2 intentos.')).toBeInTheDocument()
    expect(rules.getByText('60 % · no aprobado')).toBeInTheDocument()
    expect(rules.queryByRole('button')).not.toBeInTheDocument()
  })

  it('el mejor intento pendiente de corrección se dice así', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, best: { percent: null, passed: null, pending: true } }) }])

    expect(within(await panel()).getByText('Pendiente de corrección')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar otro intento' })).toBeInTheDocument()
  })

  it('un 409 al empezar (intentos agotados en el servidor) se explica con su detalle', async () => {
    renderAssessment([
      { path: CLASSROOM, body: assessmentClassroom },
      { method: 'POST', path: ATTEMPTS, status: 409, body: problem(409, 'Ya no quedan intentos') }
    ])

    await userEvent.click(within(await panel()).getByRole('button', { name: 'Empezar el intento' }))

    expect(await screen.findByText('El servidor no aceptó el cambio')).toBeInTheDocument()
    expect(screen.getByText('El servidor dice: «Ya no quedan intentos». Te mostramos el estado actual.')).toBeInTheDocument()
  })
})

describe('el intento abierto', () => {
  it('responde cada tipo con su control y guarda todas las respuestas a la vez', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt() },
        { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    const single = await screen.findByRole('group', { name: '1. ¿Quién otorga la licencia de anuncio?' })
    await userEvent.click(within(single).getByRole('radio', { name: 'La municipalidad' }))
    const multiple = screen.getByRole('group', { name: '2. ¿Qué tipos de anuncio existen?' })
    await userEvent.click(within(multiple).getByRole('checkbox', { name: 'Adosado' }))
    await userEvent.click(within(multiple).getByRole('checkbox', { name: 'Luminoso' }))
    await userEvent.click(within(screen.getByRole('group', { name: '3. El SGSPE registra los expedientes.' })).getByRole('radio', { name: 'Falso' }))
    await userEvent.type(screen.getByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }), 'SRTM')
    await userEvent.type(screen.getByRole('textbox', { name: '5. Explica cómo se liquida una licencia.' }), 'Con la tasa')
    // la rúbrica se ve antes de responder
    const open = screen.getByRole('group', { name: '5. Explica cómo se liquida una licencia.' })
    expect(within(open).getByText('Cita la ordenanza (1 punto)')).toBeInTheDocument()
    expect(screen.getByText('5 de 6 preguntas respondidas')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))

    await waitFor(() => expect(calls('PUT', `${ATTEMPT}/answers`)).toHaveLength(1))
    expect(calls('PUT', `${ATTEMPT}/answers`)[0]?.body).toEqual({
      answers: [
        { questionId: 'p-single', optionIds: ['o-muni'], text: null, submissionId: null },
        { questionId: 'p-multiple', optionIds: ['o-adosado', 'o-luminoso'], text: null, submissionId: null },
        { questionId: 'p-tf', optionIds: ['o-f'], text: null, submissionId: null },
        { questionId: 'p-short', optionIds: [], text: 'SRTM', submissionId: null },
        { questionId: 'p-open', optionIds: [], text: 'Con la tasa', submissionId: null },
        { questionId: 'p-file', optionIds: [], text: null, submissionId: null }
      ]
    })
    expect(await screen.findByText(/^Respuestas guardadas a las/)).toBeInTheDocument()
  })

  it('la pregunta de archivo crea la entrega, sube el archivo con la sesión y guarda la respuesta con ella', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt() },
        { method: 'POST', path: `${ATTEMPT}/questions/p-file/submission`, status: 201, body: submission },
        { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }
      ],
      '?leccion=lec-eva&intento=int-1',
      { [UPLOAD]: { body: '{}', contentType: 'application/json' } }
    )

    const input = await screen.findByLabelText('6. Sube la liquidación de ejemplo.')
    await userEvent.upload(input, new File(['%PDF'], 'liquidacion.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('Entregado: liquidacion.pdf')).toBeInTheDocument()
    expect(files?.calls).toEqual([{ url: UPLOAD, authorization: 'Bearer test-token' }])
    await waitFor(() => expect(calls('PUT', `${ATTEMPT}/answers`)).toHaveLength(1))
    const sent = calls('PUT', `${ATTEMPT}/answers`)[0]?.body as { answers: { questionId: string; submissionId: string | null }[] }
    expect(sent.answers.find((answer) => answer.questionId === 'p-file')?.submissionId).toBe('ent-1')
  })

  it('un archivo de más de 25 MB se rechaza sin subirlo', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt() }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    const big = new File(['x'], 'enorme.zip')
    Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 })
    await userEvent.upload(await screen.findByLabelText('6. Sube la liquidación de ejemplo.'), big)

    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo supera el máximo de 25 MB.')
    expect(calls('POST', `${ATTEMPT}/questions/p-file/submission`)).toEqual([])
  })

  it('enviar pide confirmación, avisa de las preguntas sin responder, y luego guarda y envía', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt() },
        { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() },
        { method: 'POST', path: `${ATTEMPT}/submit`, body: submittedAttempt }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar el intento' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Enviar el intento?' })
    expect(dialog).toHaveTextContent('Te quedan 6 preguntas sin responder (0 de 6).')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Seguir respondiendo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('POST', `${ATTEMPT}/submit`)).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Enviar el intento' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.method !== 'GET').map((call) => `${call.method} ${call.path}`)).toEqual([
      `POST ${CLASSROOM}/lessons/lec-eva/events`,
      `PUT ${ATTEMPT}/answers`,
      `POST ${ATTEMPT}/submit`
    ])
    // pendiente de corrección: sin nota todavía, con los puntos que ya hay
    expect(screen.getAllByText('Pendiente de corrección').length).toBeGreaterThan(0)
    expect(screen.getByText('Tu docente corregirá las preguntas que lo necesitan. Por ahora llevas 5 de 10 puntos.')).toBeInTheDocument()
  })

  it('un 409 por plazo vencido se explica: el servidor manda', async () => {
    const late = attempt({ deadline: inMinutes(-1) })
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: late },
        { method: 'PUT', path: `${ATTEMPT}/answers`, status: 409, body: problem(409, 'El plazo del intento venció') }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    expect(await screen.findByText(/^Se acabó el tiempo\. El servidor solo acepta/)).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar el intento' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('El plazo de este intento ya venció')).toBeInTheDocument()
    expect(screen.getByText('El servidor dice: «El plazo del intento venció». Te mostramos el estado actual.')).toBeInTheDocument()
    expect(calls('POST', `${ATTEMPT}/submit`)).toEqual([])
    // se vuelve a leer el intento: el servidor dice cómo quedó
    await waitFor(() => expect(calls('GET', ATTEMPT).length).toBeGreaterThan(1))
  })

  it('la cuenta atrás se ve como temporizador con el plazo en la zona de la edición y anuncia los últimos minutos', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt({ deadline: inMinutes(4) }) }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    expect(await screen.findByRole('timer')).toHaveTextContent(/^0[34]:\d\d$/)
    expect(screen.getByText(/^Hasta el .+ \(hora (estándar )?de Perú\)$/)).toBeInTheDocument()
    expect(screen.getByText('Quedan 5 minutos para enviar el intento.')).toHaveAttribute('role', 'status')
  })
})

describe('el resultado', () => {
  it('corregido: la nota, los puntos por pregunta, el comentario y las soluciones', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: gradedAttempt }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    expect(await screen.findByText('80 % · Aprobado')).toBeInTheDocument()
    expect(screen.getByText('8 de 10 puntos; se aprueba con 70 %.')).toBeInTheDocument()
    const tf = within(screen.getByRole('article', { name: '3. El SGSPE registra los expedientes.' }))
    expect(tf.getByText('0 de 1 puntos')).toBeInTheDocument()
    expect(tf.getByText('Incorrecta')).toBeInTheDocument()
    expect(tf.getByText('Falso')).toBeInTheDocument()
    expect(tf.getByText('Respuesta correcta: Verdadero')).toBeInTheDocument()
    const short = within(screen.getByRole('article', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }))
    expect(short.getByText('Respuestas aceptadas: SRTM · S.R.T.M.')).toBeInTheDocument()
    const open = within(screen.getByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
    expect(open.getByText('1 de 2 puntos')).toBeInTheDocument()
    expect(open.getByText('Falta citar la ordenanza.')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: '6. Sube la liquidación de ejemplo.' })).getByText('liquidacion.pdf')).toBeInTheDocument()
    // sin formulario: un intento enviado no se responde
    expect(screen.queryByRole('button', { name: 'Enviar el intento' })).not.toBeInTheDocument()
  })

  it('sin soluciones (NEVER) no las muestra', async () => {
    const noSolutions = structuredClone(gradedAttempt)
    for (const outcome of noSolutions.result.questions) (outcome as { solution: unknown }).solution = null
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: noSolutions }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    await screen.findByText('80 % · Aprobado')
    expect(screen.queryByText(/^Respuesta correcta/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Respuestas aceptadas/)).not.toBeInTheDocument()
  })
})

describe('errores del intento', () => {
  it('un intento ajeno (404) se dice sin reintentar', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, status: 404, body: problem(404, 'No existe') }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    expect(await screen.findByText('No encontramos este intento entre los tuyos.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('un intento fuera de contrato no muestra datos a medias', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: { ...openAttempt, result: gradedAttempt.result } }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('un error del servidor se explica con su estado', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, status: 500, body: problem(500, 'fallo') }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el intento')
    expect(alert).toHaveTextContent('error 500')
  })
})

describe('en inglés', () => {
  it('las reglas y el intento', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, best: { percent: 80, passed: true, pending: false } }) },
        { path: ATTEMPT, body: attempt() }
      ],
      '?leccion=lec-eva',
      {},
      'en'
    )

    const rules = within(await panel())
    expect(rules.getByText('1 of 2 used')).toBeInTheDocument()
    expect(rules.getByText('80% · passed')).toBeInTheDocument()
    expect(rules.getByRole('button', { name: 'Start another attempt' })).toBeInTheDocument()
    expect(screen.getByText('Completed when you pass the assessment.')).toBeInTheDocument()
  })
})

describe('la cuenta atrás', () => {
  it.each([
    [25 * 60_000, '25:00', 'plenty'],
    [5 * 60_000, '05:00', 'fiveMinutes'],
    [59_001, '01:00', 'oneMinute'],
    [3_723_000, '1:02:03', 'plenty'],
    [0, '00:00', 'over'],
    [-5000, '00:00', 'over']
  ])('%i ms → %s (%s)', (ms, text, stage) => {
    expect(formatRemaining(ms)).toBe(text)
    expect(deadlineStage(ms)).toBe(stage)
  })
})
