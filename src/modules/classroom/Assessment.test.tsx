import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttemptActionProblem } from './AttemptView'
import { ClassroomPage } from './ClassroomPage'
import { Countdown, deadlineStage, formatRemaining } from './Countdown'
import { classroomModule } from './module'
import { serveFiles, type ServedFile } from '../../test/files'
import { assessmentClassroom, filledAnswers, gradedAttempt, openAttempt, problem, submission, submittedAttempt } from './test/fixtures'

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
// las preguntas son grupos, y las unidades plegables del temario (details) también: se cuentan las de la lección
const lessonArticle = () => screen.getByRole('article', { name: 'Evaluación final' })

describe('la evaluación como lección', () => {
  it('muestra sus reglas, cómo se completa y empieza un intento que se abre en la misma lección', async () => {
    const opened = attempt()
    renderAssessment([
      { path: CLASSROOM, body: assessmentClassroom },
      { method: 'POST', path: ATTEMPTS, status: 201, body: opened },
      // al montarse, el intento recién empezado se vuelve a leer
      { path: ATTEMPT, body: opened },
      { method: 'POST', path: `${CLASSROOM}/lessons/lec-eva/events`, body: { status: 'INICIADA', startedAt: '2026-10-28T15:00:00Z' } }
    ])

    const rules = within(await panel())
    expect(rules.getByText('0 de 2 usados')).toBeInTheDocument()
    expect(rules.getByText('30 min')).toBeInTheDocument()
    expect(rules.getByText('70 %')).toBeInTheDocument()
    expect(rules.getByText('Aún sin intentos enviados')).toBeInTheDocument()
    expect(screen.getByText('Se completa al aprobar la evaluación.')).toBeInTheDocument()
    // en el índice, el tipo de cada lección va con palabra en su descripción
    const nav = screen.getByRole('navigation', { name: 'Unidades del curso' })
    expect(within(nav).getByRole('link', { name: /^Evaluación final/ })).toHaveAccessibleDescription(/^Evaluación/)
    expect(within(nav).getByRole('link', { name: /^Sesión de consulta/ })).toHaveAccessibleDescription(/^Sesión en vivo/)
    // la evaluación sin material no dice «sin material»
    expect(screen.queryByText('Esta lección no tiene material.')).not.toBeInTheDocument()

    await userEvent.click(rules.getByRole('button', { name: 'Comenzar intento 1 de 2' }))
    // empezar gasta un intento y pone en marcha el reloj: se confirma antes (RNF-UX-08)
    const dialog = within(await screen.findByRole('dialog', { name: '¿Comenzar el intento?' }))
    expect(
      dialog.getByText('Usarás el intento 1 de 2 y tendrás 30 min: el tiempo corre desde ahora y no se detiene aunque cierres la página.')
    ).toBeInTheDocument()
    expect(calls('POST', ATTEMPTS)).toEqual([])
    await userEvent.click(dialog.getByRole('button', { name: 'Comenzar' }))

    const heading = await screen.findByRole('heading', { level: 3, name: 'Intento 1' })
    // el foco lo mueve un efecto, que corre tras pintar
    await waitFor(() => expect(heading).toHaveFocus())
    expect(calls('POST', ATTEMPTS)).toHaveLength(1)
    expect(screen.getByRole('link', { name: '← Volver a la evaluación' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-eva')
    expect(within(lessonArticle()).getAllByRole('group')).toHaveLength(6)
  })

  it('con un intento abierto ofrece retomarlo', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, openAttemptId: 'int-1' }) }])

    expect(within(await panel()).getByRole('link', { name: 'Retomar el intento abierto' })).toHaveAttribute(
      'href',
      '/mis-cursos/mat-sgspe-1?leccion=lec-eva&intento=int-1'
    )
    expect(screen.queryByRole('button', { name: /Comenzar/ })).not.toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Comenzar intento 2 de 2' })).toBeInTheDocument()
  })

  it('sin límite de tiempo la confirmación dice qué intento gasta; «Todavía no» no empieza nada', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, timeLimitMinutes: null }) }])

    await userEvent.click(within(await panel()).getByRole('button', { name: 'Comenzar intento 2 de 2' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Comenzar el intento?' }))
    expect(dialog.getByText('Usarás el intento 2 de 2: cuenta desde que empieza, aunque no lo entregues.')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Todavía no' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('POST', ATTEMPTS)).toEqual([])
  })

  it('un 409 al empezar (intentos agotados en el servidor) se explica con su detalle', async () => {
    renderAssessment([
      { path: CLASSROOM, body: assessmentClassroom },
      { method: 'POST', path: ATTEMPTS, status: 409, body: problem(409, 'Ya no quedan intentos') }
    ])

    await userEvent.click(within(await panel()).getByRole('button', { name: 'Comenzar intento 1 de 2' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Comenzar' }))

    expect(await screen.findByText('El servidor no aceptó el cambio')).toBeInTheDocument()
    expect(screen.getByText('El servidor dice: «Ya no quedan intentos». Te mostramos el estado actual.')).toBeInTheDocument()
  })
})

describe('la ficha previa', () => {
  const marks = (list: HTMLElement) => [...list.querySelectorAll('[data-slot="state-mark"]')].map((mark) => mark.getAttribute('data-state'))

  it('dice cada intento con su marca y su palabra, y una sola acción con el intento que se usará', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 1, maxAttempts: 3 }) }])

    const rules = within(await panel())
    const list = rules.getByRole('list', { name: 'Intentos' })
    expect(marks(list)).toEqual(['used', 'todo', 'todo'])
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['Intento 1: usado', 'Intento 2: libre', 'Intento 3: libre'])
    expect(rules.getAllByRole('button').map((button) => button.textContent)).toEqual(['Comenzar intento 2 de 3'])
  })

  it('cuenta qué pasa al comenzar, sin prometer un guardado que no existe', async () => {
    renderAssessment([{ path: CLASSROOM, body: assessmentClassroom }])

    const rules = within(await panel())
    expect(rules.getByRole('heading', { name: 'Al comenzar' })).toBeInTheDocument()
    expect(rules.getByText('Usas el intento 1 de 2, aunque no lo entregues.')).toBeInTheDocument()
    expect(rules.getByText('Tendrás 30 min. El tiempo corre desde que comienzas y no se detiene aunque cierres la página.')).toBeInTheDocument()
    expect(rules.getByText('Al acabarse el tiempo, el intento se cierra con lo último que hayas guardado.')).toBeInTheDocument()
    expect(rules.getByText('Tus respuestas se guardan cuando pulsas «Guardar», cuando subes un archivo y al entregar.')).toBeInTheDocument()
  })

  it('sin límite de tiempo no habla de un reloj', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ timeLimitMinutes: null }) }])

    const rules = within(await panel())
    expect(rules.getByText('Sin límite')).toBeInTheDocument()
    expect(rules.queryByText(/El tiempo corre/)).not.toBeInTheDocument()
    expect(rules.queryByText(/Al acabarse el tiempo/)).not.toBeInTheDocument()
  })

  it('con un intento abierto, esa es la marca actual', async () => {
    renderAssessment([{ path: CLASSROOM, body: withAssessment({ attemptsUsed: 2, maxAttempts: 3, openAttemptId: 'int-2' }) }])

    const list = within(await panel()).getByRole('list', { name: 'Intentos' })
    expect(marks(list)).toEqual(['used', 'started', 'todo'])
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['Intento 1: usado', 'Intento 2: actual', 'Intento 3: libre'])
    expect(within(await panel()).queryByRole('heading', { name: 'Al comenzar' })).not.toBeInTheDocument()
  })

  it.each([
    ['FINALIZADA', 'Este curso ya terminó: no se pueden comenzar ni seguir intentos.'],
    ['RETIRADA', 'Tu matrícula ya no está activa: no se pueden comenzar ni seguir intentos.']
  ])('con la matrícula %s explica por qué no se puede y no ofrece ninguna acción', async (status, reason) => {
    renderAssessment([{ path: CLASSROOM, body: { ...withAssessment({ attemptsUsed: 1, openAttemptId: 'int-1' }), status } }])

    const rules = within(await panel())
    expect(rules.getByText(reason)).toBeInTheDocument()
    expect(rules.queryByRole('button')).not.toBeInTheDocument()
    expect(rules.queryByRole('link')).not.toBeInTheDocument()
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
    // el enunciado se lee en la letra de lectura (Question del sistema de diseño)
    expect(single.querySelector('legend')).toHaveClass('font-read')
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
    expect(await screen.findByText(/^Guardado \d/)).toBeInTheDocument()
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

  describe('con una subida en curso', () => {
    // la subida se queda esperando hasta que la prueba la suelta, como un archivo grande en una conexión lenta
    function holdUpload() {
      let release = () => {}
      const held = new Promise<void>((resolve) => (release = resolve))
      const next = globalThis.fetch
      globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        if (String(input) === UPLOAD) await held
        return next(input, init)
      }
      return release
    }
    const routes: MockRoute[] = [
      { path: CLASSROOM, body: assessmentClassroom },
      { path: ATTEMPT, body: attempt() },
      { method: 'POST', path: `${ATTEMPT}/questions/p-file/submission`, status: 201, body: submission },
      { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }
    ]
    const choose = async () =>
      userEvent.upload(await screen.findByLabelText('6. Sube la liquidación de ejemplo.'), new File(['%PDF'], 'liquidacion.pdf', { type: 'application/pdf' }))

    it('lo que se escribe mientras tanto no se pierde: ni en la pantalla ni en lo que se guarda al terminar', async () => {
      renderAssessment(routes, '?leccion=lec-eva&intento=int-1', { [UPLOAD]: { body: '{}', contentType: 'application/json' } })
      const release = holdUpload()

      await choose()
      await screen.findByText('Subiendo el archivo…')
      const open = screen.getByRole('textbox', { name: '5. Explica cómo se liquida una licencia.' })
      await userEvent.type(open, 'Escrito durante la subida')
      await userEvent.click(
        within(screen.getByRole('group', { name: '1. ¿Quién otorga la licencia de anuncio?' })).getByRole('radio', { name: 'La municipalidad' })
      )
      release()

      expect(await screen.findByText('Entregado: liquidacion.pdf')).toBeInTheDocument()
      await waitFor(() => expect(calls('PUT', `${ATTEMPT}/answers`)).toHaveLength(1))
      const sent = (
        calls('PUT', `${ATTEMPT}/answers`)[0]?.body as {
          answers: { questionId: string; optionIds: string[]; text: string | null; submissionId: string | null }[]
        }
      ).answers
      expect(sent.find((answer) => answer.questionId === 'p-open')?.text).toBe('Escrito durante la subida')
      expect(sent.find((answer) => answer.questionId === 'p-single')?.optionIds).toEqual(['o-muni'])
      expect(sent.find((answer) => answer.questionId === 'p-file')?.submissionId).toBe('ent-1')
      expect(open).toHaveValue('Escrito durante la subida')
    })

    it('no se puede guardar ni enviar hasta que termina; tampoco con Intro en una respuesta corta', async () => {
      renderAssessment(routes, '?leccion=lec-eva&intento=int-1', { [UPLOAD]: { body: '{}', contentType: 'application/json' } })
      const release = holdUpload()

      await choose()
      await screen.findByText('Subiendo el archivo…')
      expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Guardar respuestas' })).toBeDisabled()
      await userEvent.type(screen.getByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }), 'SRTM{Enter}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      release()

      await screen.findByText('Entregado: liquidacion.pdf')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Entregar' })).toBeEnabled())
    })
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

    await userEvent.click(await screen.findByRole('button', { name: 'Entregar' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Entregar el intento?' })
    expect(dialog).toHaveTextContent('Te quedan 6 preguntas sin responder (0 de 6).')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Seguir respondiendo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls('POST', `${ATTEMPT}/submit`)).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Entregar' }))

    expect(await screen.findByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.method !== 'GET').map((call) => `${call.method} ${call.path}`)).toEqual([
      `POST ${CLASSROOM}/lessons/lec-eva/events`,
      `PUT ${ATTEMPT}/answers`,
      `POST ${ATTEMPT}/submit`
    ])
    // pendiente de corrección: sin nota todavía, con los puntos que ya hay
    // el resultado lo dice con la insignia de pendiente de corrección
    const pending = screen.getAllByText('Pendiente de corrección').map((text) => text.closest('[data-slot="badge"]'))
    expect(pending.some((badge) => badge?.getAttribute('data-state') === 'review')).toBe(true)
    expect(screen.getByText('Tu docente corregirá las preguntas que lo necesitan. Por ahora llevas 5 de 10 puntos.')).toBeInTheDocument()
  })

  describe('la cabecera y el índice', () => {
    const open = (patch: Body = {}) =>
      renderAssessment(
        [
          { path: CLASSROOM, body: assessmentClassroom },
          { path: ATTEMPT, body: attempt(patch) },
          { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt(patch) },
          { method: 'POST', path: `${ATTEMPT}/submit`, body: submittedAttempt }
        ],
        '?leccion=lec-eva&intento=int-1'
      )
    const index = () => screen.findByRole('navigation', { name: 'Preguntas del intento' })

    it('dice el título, la posición y el intento de cuántos; sin límite de tiempo no hay temporizador', async () => {
      open({ deadline: null })

      const heading = await screen.findByRole('heading', { level: 3, name: 'Intento 1' })
      const header = within(heading.closest('header')!)
      expect(header.getByText('Evaluación final')).toBeInTheDocument()
      expect(header.getByText('de 2')).toBeInTheDocument()
      expect(header.getByText('Pregunta 1 de 6')).toBeInTheDocument()
      expect(header.getByRole('button', { name: 'Entregar' })).toBeInTheDocument()
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
      expect(screen.getByText('Sin límite de tiempo')).toBeInTheDocument()
    })

    it('dentro del intento no se ofrece ir a otra lección de un toque', async () => {
      open()

      await index()
      expect(screen.queryByRole('navigation', { name: 'Lección anterior y siguiente' })).not.toBeInTheDocument()
    })

    it('cada pregunta del índice se nombra con su estado y cambia al responderla', async () => {
      open()

      const nav = within(await index())
      expect(nav.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([1, 2, 3, 4, 5, 6].map((n) => `Pregunta ${n}, en blanco`))
      expect(nav.getByRole('button', { name: 'Pregunta 1, en blanco' })).toHaveAttribute('aria-current', 'step')

      await userEvent.click(within(screen.getByRole('group', { name: '3. El SGSPE registra los expedientes.' })).getByRole('radio', { name: 'Falso' }))

      const answered = nav.getByRole('button', { name: 'Pregunta 3, respondida' })
      expect(answered.querySelector('[data-slot="state-mark"]')).toHaveAttribute('data-state', 'done')
      expect(screen.getByText('1 de 6 preguntas respondidas')).toBeInTheDocument()
      // quien responde una pregunta está en ella: la cabecera y el índice lo siguen
      expect(answered).toHaveAttribute('aria-current', 'step')
      expect(screen.getByText('Pregunta 3 de 6')).toBeInTheDocument()
    })

    it('ir a una pregunta desde el índice lleva el foco a ella y no toca lo respondido', async () => {
      open()

      await userEvent.type(await screen.findByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }), 'SRTM')
      const nav = within(await index())
      await userEvent.click(nav.getByRole('button', { name: 'Pregunta 2, en blanco' }))

      await waitFor(() => expect(screen.getByRole('group', { name: '2. ¿Qué tipos de anuncio existen?' })).toHaveFocus())
      expect(nav.getByRole('button', { name: 'Pregunta 2, en blanco' })).toHaveAttribute('aria-current', 'step')
      expect(screen.getByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' })).toHaveValue('SRTM')
    })

    it('un solo juego de campos: pasar de pregunta oculta la otra con estilos, sin desmontarla', async () => {
      open()

      const first = await screen.findByRole('group', { name: '1. ¿Quién otorga la licencia de anuncio?' })
      const radio = within(first).getByRole('radio', { name: 'La municipalidad' })
      await userEvent.click(radio)
      expect(screen.getAllByRole('radio', { name: 'La municipalidad' })).toHaveLength(1)
      // en el móvil, una por pantalla: la clase solo actúa con poco ancho; con ancho se ven todas
      const shown = (fieldset: HTMLElement) => !fieldset.closest('[data-question]')?.classList.contains('@max-2xl:hidden')
      expect(shown(first)).toBe(true)
      expect(shown(screen.getByRole('group', { name: '2. ¿Qué tipos de anuncio existen?' }))).toBe(false)

      await userEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }))

      expect(shown(first)).toBe(false)
      expect(shown(screen.getByRole('group', { name: '2. ¿Qué tipos de anuncio existen?' }))).toBe(true)
      expect(first).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Pregunta anterior' }))
      expect(shown(first)).toBe(true)
      expect(radio).toBeChecked()
      // en los extremos no hay a dónde ir: no se ofrece un botón sin acción
      expect(screen.queryByRole('button', { name: 'Pregunta anterior' })).not.toBeInTheDocument()
    })

    it('el diálogo de entrega lista las preguntas en blanco y lleva a ellas', async () => {
      open()

      await userEvent.click(await screen.findByRole('button', { name: 'Entregar' }))
      const dialog = within(await screen.findByRole('dialog', { name: '¿Entregar el intento?' }))
      const blank = dialog.getByRole('list', { name: 'Preguntas en blanco' })
      expect(
        within(blank)
          .getAllByRole('button')
          .map((button) => button.textContent)
      ).toEqual([1, 2, 3, 4, 5, 6].map((n) => `Pregunta ${n}`))

      await userEvent.click(within(blank).getByRole('button', { name: 'Pregunta 3' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.getByRole('group', { name: '3. El SGSPE registra los expedientes.' })).toHaveFocus())
      expect(calls('POST', `${ATTEMPT}/submit`)).toEqual([])
    })

    it('con todo respondido el diálogo lo dice y no lista nada', async () => {
      renderAssessment(
        [
          { path: CLASSROOM, body: assessmentClassroom },
          { path: ATTEMPT, body: attempt({ answers: filledAnswers }) }
        ],
        '?leccion=lec-eva&intento=int-1'
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Entregar' }))
      const dialog = await screen.findByRole('dialog', { name: '¿Entregar el intento?' })
      expect(dialog).toHaveTextContent('Respondiste todas las preguntas.')
      expect(within(dialog).queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('el estado del guardado', () => {
    const routes = (save: MockRoute): MockRoute[] => [{ path: CLASSROOM, body: assessmentClassroom }, { path: ATTEMPT, body: attempt() }, save]
    const change = async () => userEvent.type(await screen.findByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }), 'S')

    it('lo que cambió y no se guardó se dice, y deja de decirse al guardarlo', async () => {
      renderAssessment(routes({ method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }), '?leccion=lec-eva&intento=int-1')

      await change()
      expect(screen.getByText('Sin guardar')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))

      expect(await screen.findByText(/^Guardado \d/)).toBeInTheDocument()
      expect(screen.queryByText('Sin guardar')).not.toBeInTheDocument()
    })

    it('si guardar falla sin conexión avisa de que no se guardó y qué hacer, sin prometer nada', async () => {
      renderAssessment(routes({ method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }), '?leccion=lec-eva&intento=int-1')
      await change()
      const next = globalThis.fetch
      globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        if (init.method === 'PUT') throw new TypeError('Failed to fetch')
        return next(input, init)
      }

      await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Lo que no se haya guardado sigue solo en esta pantalla: no la cierres ni la recargues')
      expect(alert.querySelector('svg')).toBeInTheDocument()
      expect(screen.getByText('Sin guardar')).toBeInTheDocument()
      globalThis.fetch = next
    })

    it('un error del servidor al guardar sigue a la vista hasta guardar bien', async () => {
      renderAssessment(routes({ method: 'PUT', path: `${ATTEMPT}/answers`, status: 500, body: problem(500, 'fallo') }), '?leccion=lec-eva&intento=int-1')
      await change()

      await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar el intento. Inténtalo de nuevo. Código del error: 500.')
      await change()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('guardar bien retira el aviso de una entrega que falló: ya no sería cierto', async () => {
      renderAssessment(
        [
          { path: CLASSROOM, body: assessmentClassroom },
          { path: ATTEMPT, body: attempt() },
          { method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() },
          { method: 'POST', path: `${ATTEMPT}/submit`, status: 500, body: problem(500, 'fallo') }
        ],
        '?leccion=lec-eva&intento=int-1'
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Entregar' }))
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Entregar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Código del error: 500.')

      await userEvent.click(screen.getByRole('button', { name: 'Guardar respuestas' }))

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    })

    it('al perder la conexión avisa enseguida, y al volver deja de avisar', async () => {
      renderAssessment(routes({ method: 'PUT', path: `${ATTEMPT}/answers`, body: attempt() }), '?leccion=lec-eva&intento=int-1')
      await screen.findByRole('heading', { level: 3, name: 'Intento 1' })
      const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      act(() => void window.dispatchEvent(new Event('offline')))

      expect(await screen.findByRole('alert')).toHaveTextContent('Estás sin conexión.')

      online.mockReturnValue(true)
      act(() => void window.dispatchEvent(new Event('online')))
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
      online.mockRestore()
    })
  })

  it('las opciones son filas enteras con su control nativo, y la abierta un área amplia', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt() }
      ],
      '?leccion=lec-eva&intento=int-1'
    )

    const radio = within(await screen.findByRole('group', { name: '1. ¿Quién otorga la licencia de anuncio?' })).getByRole('radio', {
      name: 'La municipalidad'
    })
    expect(radio.closest('label')).toHaveClass('min-h-12')
    await userEvent.click(radio.closest('label')!)
    expect(radio).toBeChecked()
    expect(screen.getByRole('textbox', { name: '5. Explica cómo se liquida una licencia.' })).toHaveAttribute('rows', '8')
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
    await userEvent.click(screen.getByRole('button', { name: 'Entregar' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Entregar' }))

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
    expect(screen.getByText('Quedan 5 minutos para entregar el intento.')).toHaveAttribute('role', 'status')
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

    expect(await screen.findByRole('img', { name: 'Nota: 80 %' })).toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText('Aprobada')).toBeInTheDocument()
    expect(screen.getByText('8 de 10 puntos; se aprueba con 70 %.')).toBeInTheDocument()
    const tf = within(screen.getByRole('article', { name: '3. El SGSPE registra los expedientes.' }))
    expect(tf.getByText('0 de 1 punto')).toBeInTheDocument()
    expect(tf.getByText('Incorrecta')).toBeInTheDocument()
    // la respuesta dada, en la letra de lectura
    expect(tf.getByText('Falso')).toHaveClass('font-read')
    expect(tf.getByText('Respuesta correcta: Verdadero')).toBeInTheDocument()
    const short = within(screen.getByRole('article', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }))
    expect(short.getByText('Respuestas aceptadas: SRTM · S.R.T.M.')).toBeInTheDocument()
    const open = within(screen.getByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
    expect(open.getByText('1 de 2 puntos')).toBeInTheDocument()
    expect(open.getByText('Falta citar la ordenanza.')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: '6. Sube la liquidación de ejemplo.' })).getByText('liquidacion.pdf')).toBeInTheDocument()
    // sin formulario: un intento enviado no se responde
    expect(screen.queryByRole('button', { name: 'Entregar' })).not.toBeInTheDocument()
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

    await screen.findByRole('img', { name: 'Nota: 80 %' })
    expect(screen.queryByText(/^Respuesta correcta/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Respuestas aceptadas/)).not.toBeInTheDocument()
  })

  describe('la lección de repaso', () => {
    const REVIEW = 'Qué es el SGSPE'
    const tfQuestion = () => within(screen.getByRole('article', { name: '3. El SGSPE registra los expedientes.' }))
    const renderResult = (body: object, classroomBody: object = assessmentClassroom, language?: string) =>
      renderAssessment(
        [
          { path: CLASSROOM, body: classroomBody },
          { path: ATTEMPT, body }
        ],
        '?leccion=lec-eva&intento=int-1',
        {},
        language
      )
    const reviewing = (reviewLessonId: string | null) => {
      const copy = structuredClone(gradedAttempt)
      for (const outcome of copy.result.questions) outcome.reviewLessonId = reviewLessonId as never
      return copy
    }

    it('enlaza con su título a esa lección del curso, solo en la pregunta que la tiene', async () => {
      renderResult(gradedAttempt)

      await screen.findByRole('img', { name: 'Nota: 80 %' })
      expect(tfQuestion().getByRole('link', { name: REVIEW })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1')
      expect(tfQuestion().getByText('Para repasar:')).toBeInTheDocument()
      const single = within(screen.getByRole('article', { name: '1. ¿Quién otorga la licencia de anuncio?' }))
      expect(single.queryByRole('link')).not.toBeInTheDocument()
      expect(single.queryByText('Para repasar:')).not.toBeInTheDocument()
    })

    it('sale aunque no se muestren las soluciones y aunque la pregunta espere corrección', async () => {
      const pending = structuredClone(submittedAttempt)
      for (const outcome of pending.result.questions) outcome.reviewLessonId = (outcome.questionId === 'p-open' ? 'lec-sgspe-1' : null) as never
      renderResult(pending)

      await screen.findByText('Pendiente de corrección', { selector: '[role="status"] *' })
      expect(within(screen.getByRole('article', { name: '5. Explica cómo se liquida una licencia.' })).getByRole('link', { name: REVIEW })).toHaveAttribute(
        'href',
        '/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1'
      )
    })

    it('sigue enlazando con la matrícula finalizada: su aula queda legible', async () => {
      renderResult(reviewing('lec-sgspe-1'), { ...assessmentClassroom, status: 'FINALIZADA' })

      await screen.findByRole('img', { name: 'Nota: 80 %' })
      expect(tfQuestion().getByRole('link', { name: REVIEW })).toBeInTheDocument()
    })

    it('una lección que el aula no trae no rompe el resultado: la fila queda sin enlace ni hueco', async () => {
      renderResult(reviewing('lec-retirada'))

      await screen.findByRole('img', { name: 'Nota: 80 %' })
      expect(tfQuestion().getByText('Incorrecta')).toBeInTheDocument()
      expect(tfQuestion().queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByText('Para repasar:')).not.toBeInTheDocument()
    })

    it('en inglés, con las mismas claves', async () => {
      renderResult(gradedAttempt, assessmentClassroom, 'en')

      await screen.findByRole('img', { name: 'Grade: 80%' })
      expect(tfQuestion().getByText('To review:')).toBeInTheDocument()
      expect(tfQuestion().getByRole('link', { name: REVIEW })).toBeInTheDocument()
    })
  })

  const failedAttempt = (percent: number) => ({
    ...gradedAttempt,
    result: { ...gradedAttempt.result, score: 6, percent, passed: false }
  })
  const openResult = (body: unknown, classroom: unknown = assessmentClassroom, language?: string) =>
    renderAssessment(
      [
        { path: CLASSROOM, body: classroom },
        { path: ATTEMPT, body }
      ],
      '?leccion=lec-eva&intento=int-1',
      {},
      language
    )

  describe('el encabezado', () => {
    it('aprobada: anillo con la nota, la palabra en musgo, el intento y la fecha', async () => {
      openResult(gradedAttempt)

      const ring = await screen.findByRole('img', { name: 'Nota: 80 %' })
      expect(ring).toHaveTextContent('80 %')
      const word = within(screen.getByRole('status')).getByText('Aprobada')
      expect(word).toHaveClass('text-success')
      expect(screen.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeInTheDocument()
      expect(screen.getByText('de 2')).toBeInTheDocument()
      // al entrar se desplaza hasta aquí: el título de la evaluación va con el resultado
      expect(within(screen.getByRole('region', { name: 'Resultado del intento 1' })).getByText('Evaluación final')).toBeInTheDocument()
      // en la zona de la edición (Lima)
      expect(screen.getByText(/^Entregado el 28 oct 2026, 10:20$/)).toBeInTheDocument()
      // el anillo dibuja la nota real: 80 % de la circunferencia
      const arc = ring.querySelector<SVGCircleElement>('[data-arc]')!
      const [filled, whole] = arc.getAttribute('stroke-dasharray')!.split(' ').map(Number)
      expect(filled! / whole!).toBeCloseTo(0.8)
    })

    it('no aprobada: en warning y nunca en danger, con icono y palabra', async () => {
      openResult(failedAttempt(60))

      await screen.findByRole('img', { name: 'Nota: 60 %' })
      const word = within(screen.getByRole('status')).getByText('No aprobada')
      expect(word).toHaveClass('text-warning')
      expect(word.querySelector('svg')).not.toBeNull()
      expect(word).not.toHaveClass('text-danger')
      expect(screen.getByText('6 de 10 puntos; se aprueba con 70 %.')).toBeInTheDocument()
    })

    it('la nota nunca se redondea hacia arriba: 69,999 no se lee como 70', async () => {
      openResult(failedAttempt(69.999))

      expect(await screen.findByRole('img', { name: 'Nota: 69,99 %' })).toHaveTextContent('69,99 %')
    })

    it('un 0 % no dibuja arco', async () => {
      openResult(failedAttempt(0))

      const ring = await screen.findByRole('img', { name: 'Nota: 0 %' })
      expect(ring.querySelector('[data-arc]')).toBeNull()
    })

    it('pendiente: insignia, sin nota inventada y sin prometer un aviso que no existe', async () => {
      openResult(submittedAttempt)

      const ring = await screen.findByRole('img', { name: 'Aún sin nota' })
      const summary = within(screen.getByRole('status'))
      expect(summary.getByText('Pendiente de corrección').closest('[data-slot="badge"]')).toHaveAttribute('data-state', 'review')
      expect(ring.querySelector('[data-arc]')).toBeNull()
      expect(summary.getByText('Tu docente corregirá las preguntas que lo necesitan. Por ahora llevas 5 de 10 puntos.')).toBeInTheDocument()
      expect(summary.getByText('Cuando termine, verás tu nota en esta evaluación.')).toBeInTheDocument()
      expect(screen.queryByText(/avisar/i)).not.toBeInTheDocument()
      expect(screen.queryByText('Aprobada')).not.toBeInTheDocument()
      expect(screen.queryByText('No aprobada')).not.toBeInTheDocument()
    })

    it('en inglés', async () => {
      openResult(failedAttempt(60), assessmentClassroom, 'en')

      expect(await screen.findByRole('img', { name: 'Grade: 60%' })).toHaveTextContent('60%')
      expect(within(screen.getByRole('status')).getByText('Not passed')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to the course' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(screen.getByText('You have 2 attempts left.')).toBeInTheDocument()
    })
  })

  describe('el desglose', () => {
    it('cada pregunta en su fila: enunciado de lectura, veredicto con icono y palabra, y comentario', async () => {
      openResult(gradedAttempt)

      expect(await screen.findByRole('heading', { level: 4, name: 'Pregunta por pregunta' })).toBeInTheDocument()
      const rows = screen.getAllByRole('article').filter((row) => /^\d\./.test(row.getAttribute('aria-label') ?? ''))
      expect(rows).toHaveLength(6)

      const tf = within(screen.getByRole('article', { name: '3. El SGSPE registra los expedientes.' }))
      expect(tf.getByRole('heading', { level: 5 })).toHaveClass('font-read')
      const incorrect = tf.getByText('Incorrecta')
      expect(incorrect).toHaveClass('text-warning')
      expect(incorrect.querySelector('svg')).not.toBeNull()
      const correct = within(screen.getByRole('article', { name: '1. ¿Quién otorga la licencia de anuncio?' })).getByText('Correcta')
      expect(correct).toHaveClass('text-success')
      expect(correct.querySelector('svg')).not.toBeNull()

      const open = within(screen.getByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
      expect(open.getByText('Comentario del docente')).toBeInTheDocument()
      // sin veredicto en el contrato (corrección manual), no se deduce uno
      expect(open.queryByText('Correcta')).not.toBeInTheDocument()
      expect(open.queryByText('Incorrecta')).not.toBeInTheDocument()
    })

    it('pendiente: la pregunta lleva su insignia y cuánto vale, sin puntos inventados', async () => {
      openResult(submittedAttempt)

      const open = within(await screen.findByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
      expect(open.getByText('Pendiente de corrección').closest('[data-slot="badge"]')).toHaveAttribute('data-state', 'review')
      expect(open.getByText('Vale 2 puntos')).toBeInTheDocument()
      expect(open.queryByText(/ de 2 puntos/)).not.toBeInTheDocument()
    })

    it('la nota de una pregunta tampoco se redondea hacia arriba', async () => {
      const partial = structuredClone(gradedAttempt)
      partial.result.questions[4] = { ...partial.result.questions[4]!, points: 1.999 }
      openResult(partial)

      const open = within(await screen.findByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
      expect(open.getByText('1,99 de 2 puntos')).toBeInTheDocument()
    })

    it('sin respuesta lo dice, y una respuesta abierta conserva sus saltos de línea', async () => {
      const answers = gradedAttempt.answers.map((answer) =>
        answer.questionId === 'p-single'
          ? { ...answer, optionIds: [], text: null }
          : answer.questionId === 'p-open'
            ? { ...answer, text: 'Primero\nDespués' }
            : answer
      )
      openResult({ ...gradedAttempt, answers })

      const single = within(await screen.findByRole('article', { name: '1. ¿Quién otorga la licencia de anuncio?' }))
      expect(single.getByText('sin responder')).toBeInTheDocument()
      const open = within(screen.getByRole('article', { name: '5. Explica cómo se liquida una licencia.' }))
      expect(open.getByText(/^Primero/)).toHaveClass('whitespace-pre-wrap')
    })
  })

  describe('las acciones', () => {
    it('«Volver al curso» es la primaria y sale del intento; «Intentar de nuevo», la secundaria, dice cuántos quedan', async () => {
      openResult(gradedAttempt, withAssessment({ attemptsUsed: 1 }))

      const back = await screen.findByRole('link', { name: 'Volver al curso' })
      expect(back).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1')
      expect(back).toHaveAttribute('data-variant', 'primary')
      expect(await screen.findByRole('button', { name: 'Intentar de nuevo' })).toHaveAttribute('data-variant', 'secondary')
      expect(screen.getByText('Te queda 1 intento.')).toBeInTheDocument()
    })

    it('reintentar confirma como la evaluación, gasta el intento siguiente y lo abre', async () => {
      const second = attempt({ id: 'int-2', number: 2 })
      renderAssessment(
        [
          { path: CLASSROOM, body: withAssessment({ attemptsUsed: 1 }) },
          { path: ATTEMPT, body: gradedAttempt },
          { method: 'POST', path: ATTEMPTS, status: 201, body: second },
          { path: '/lms/classroom/attempts/int-2', body: second }
        ],
        '?leccion=lec-eva&intento=int-1'
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Intentar de nuevo' }))
      const dialog = within(await screen.findByRole('dialog', { name: '¿Comenzar el intento?' }))
      expect(dialog.getByText(/^Usarás el intento 2 de 2/)).toBeInTheDocument()
      expect(calls('POST', ATTEMPTS)).toEqual([])
      await userEvent.click(dialog.getByRole('button', { name: 'Comenzar' }))

      expect(await screen.findByRole('heading', { level: 3, name: 'Intento 2' })).toBeInTheDocument()
      expect(calls('POST', ATTEMPTS)).toHaveLength(1)
    })

    it('un 409 al reintentar se explica con su detalle y deja salir', async () => {
      renderAssessment(
        [
          { path: CLASSROOM, body: withAssessment({ attemptsUsed: 1 }) },
          { path: ATTEMPT, body: gradedAttempt },
          { method: 'POST', path: ATTEMPTS, status: 409, body: problem(409, 'Ya no quedan intentos') }
        ],
        '?leccion=lec-eva&intento=int-1'
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Intentar de nuevo' }))
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Comenzar' }))

      expect(await screen.findByText('El servidor dice: «Ya no quedan intentos». Te mostramos el estado actual.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al curso' })).toBeInTheDocument()
    })

    it('sin intentos restantes no aparece «Intentar de nuevo» y dice por qué', async () => {
      openResult(failedAttempt(60), withAssessment({ attemptsUsed: 2 }))

      expect(await screen.findByText('Ya usaste tus 2 intentos.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al curso' })).toBeInTheDocument()
    })

    it.each([
      ['FINALIZADA', 'Este curso ya terminó: no se pueden comenzar ni seguir intentos.'],
      ['RETIRADA', 'Tu matrícula ya no está activa: no se pueden comenzar ni seguir intentos.']
    ])('con la matrícula %s no aparece «Intentar de nuevo», aunque queden intentos', async (status, message) => {
      openResult(failedAttempt(60), { ...withAssessment({ attemptsUsed: 1 }), status })

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Volver al curso' })).toBeInTheDocument()
    })

    it('con otro intento abierto no ofrece empezar uno más', async () => {
      openResult(gradedAttempt, withAssessment({ attemptsUsed: 2, maxAttempts: 3, openAttemptId: 'int-2' }))

      await screen.findByRole('link', { name: 'Volver al curso' })
      expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).not.toBeInTheDocument()
    })
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
    expect(within(lessonArticle()).queryByRole('group')).not.toBeInTheDocument()
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
    expect(alert).toHaveTextContent('Código del error: 500')
  })
})

// el texto de un fallo al empezar, guardar, subir o enviar (RNF-UX-08): del ProblemDetail a lo que se entiende
describe('AttemptActionProblem: del ProblemDetail al mensaje', () => {
  const explain = (error: unknown, deadline?: string | null, language?: string) =>
    renderWithProviders(<AttemptActionProblem error={error} deadline={deadline} />, { modules: [classroomModule()], language })

  it('un 409 da la regla con el detalle del servidor; con el plazo vencido dice que venció', async () => {
    const first = explain(new ApiError(409, 'El intento ya fue enviado'))
    expect(await screen.findByText('El servidor no aceptó el cambio')).toBeInTheDocument()
    expect(screen.getByText('El servidor dice: «El intento ya fue enviado». Te mostramos el estado actual.')).toBeInTheDocument()
    first.unmount()

    explain(new ApiError(409, 'Fuera de plazo'), inMinutes(-1))
    expect(await screen.findByText('El plazo de este intento ya venció')).toBeInTheDocument()
  })

  it('un 400 culpa a las respuestas; un 403, al permiso', async () => {
    const first = explain(new ApiError(400, 'Opción ajena'))
    expect(await screen.findByText('Alguna respuesta no corresponde a su pregunta. Revísalas e inténtalo de nuevo.')).toBeInTheDocument()
    first.unmount()

    explain(new ApiError(403, 'Forbidden'))
    expect(await screen.findByText('Tu cuenta no puede hacerlo en esta matrícula. Si crees que es un error, escribe a la coordinación.')).toBeInTheDocument()
  })

  it('un 5xx deja el estado a la vista; sin conexión se dice así; lo inesperado, sin detalles técnicos', async () => {
    const first = explain(new ApiError(500, 'fallo'))
    expect(await screen.findByText('No pudimos guardar el intento. Inténtalo de nuevo. Código del error: 500.')).toBeInTheDocument()
    first.unmount()

    const second = explain(new TypeError('Failed to fetch'))
    expect(await screen.findByText('No hay conexión con el servidor. Tus respuestas siguen aquí: inténtalo de nuevo en un momento.')).toBeInTheDocument()
    second.unmount()

    explain(new Error('boom'))
    expect(await screen.findByText('No pudimos guardar el intento. Inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('en inglés', async () => {
    const first = explain(new ApiError(403, 'Forbidden'), null, 'en')
    expect(
      await screen.findByText('Your account cannot do this in this enrollment. If you think it is a mistake, write to the coordinators.')
    ).toBeInTheDocument()
    first.unmount()

    explain(new TypeError('Failed to fetch'), null, 'en')
    expect(await screen.findByText('There is no connection to the server. Your answers are still here: try again in a moment.')).toBeInTheDocument()
  })
})

describe('en inglés', () => {
  it('la cabecera del intento y su índice', async () => {
    renderAssessment(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: ATTEMPT, body: attempt({ deadline: inMinutes(0.5) }) }
      ],
      '?leccion=lec-eva&intento=int-1',
      {},
      'en'
    )

    expect(await screen.findByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 6')).toBeInTheDocument()
    expect(screen.getByText('last minute')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Question 2, blank' })).toBeInTheDocument()
  })

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
    expect(rules.getByRole('button', { name: 'Start attempt 2 of 2' })).toBeInTheDocument()
    expect(screen.getByText('Completed when you pass the assessment.')).toBeInTheDocument()
  })
})

describe('el temporizador', () => {
  const DEADLINE = '2026-10-28T15:30:00Z'
  const before = (ms: number) => Date.parse(DEADLINE) - ms
  const region = () => screen.getByRole('status')

  it.each([
    [6 * 60_000, 'bg-surface-muted', null],
    [4 * 60_000, 'bg-warning-soft', 'últimos 5 min'],
    [30_000, 'bg-danger-soft', 'último minuto'],
    [0, 'bg-danger-soft', 'tiempo agotado']
  ])('a %i ms del plazo se ve con su tono y su palabra', async (ms, tone, word) => {
    renderWithProviders(<Countdown deadline={DEADLINE} now={before(ms)} />, { modules: [classroomModule()] })

    const timer = await screen.findByRole('timer', { name: 'Tiempo restante' })
    expect(timer).toHaveAttribute('aria-live', 'off')
    expect(timer.closest('[data-stage]')).toHaveClass(tone)
    if (word) expect(screen.getByText(word)).toBeInTheDocument()
    expect(timer.closest('[data-stage]')?.className).not.toMatch(/animate-/)
  })

  it('anuncia a los 5 y al minuto, una vez cada uno: el texto no cambia entre medias y al acabar se calla', async () => {
    const at = (ms: number) => <Countdown deadline={DEADLINE} now={before(ms)} />
    const view = renderWithProviders(at(6 * 60_000), { modules: [classroomModule()] })
    await screen.findByRole('timer')
    expect(region()).toHaveTextContent(/^$/)
    expect(region()).toHaveAttribute('aria-live', 'polite')

    view.rerender(at(5 * 60_000))
    expect(region()).toHaveTextContent('Quedan 5 minutos para entregar el intento.')
    view.rerender(at(2 * 60_000))
    expect(region()).toHaveTextContent('Quedan 5 minutos para entregar el intento.')
    view.rerender(at(60_000))
    expect(region()).toHaveTextContent('Queda 1 minuto. Guarda lo que falte: se cierra con lo último guardado.')
    view.rerender(at(10_000))
    expect(region()).toHaveTextContent('Queda 1 minuto. Guarda lo que falte: se cierra con lo último guardado.')
    view.rerender(at(0))
    expect(region()).toHaveTextContent(/^$/)
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
