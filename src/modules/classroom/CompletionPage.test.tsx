import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { CompletionPage } from './CompletionPage'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { assessmentClassroom, certificate, completionMet, completionPending, problem } from './test/fixtures'

// la finalización y el certificado (ADR-0016): las reglas, pedirlo con el nombre (201, 200 o 409) y enlazarlo

const CLASSROOM = '/lms/classroom/enrollments/mat-sgspe-1'
const COMPLETION = `${CLASSROOM}/completion`
const CERTIFICATE = `${CLASSROOM}/certificate`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderCompletion(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<CompletionPage />, {
    modules: [classroomModule()],
    route: '/mis-cursos/mat-sgspe-1/finalizacion',
    path: '/mis-cursos/:enrollmentId/finalizacion',
    language
  })
}

const posts = () => fetchMock.calls.filter((call) => call.method === 'POST')

// emitir es irreversible (el nombre no cambia después): se confirma en un diálogo que repite el nombre (RNF-UX-08)
async function confirmIssue() {
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Emitir' }))
}

describe('CompletionPage', () => {
  it('lista las reglas con su detalle y, sin cumplirlas, no ofrece pedir el certificado', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completionPending }
    ])

    const rules = within(await screen.findByRole('region', { name: 'Para terminar el curso' }))
    expect(rules.getByText('Completar todas las lecciones')).toHaveTextContent('Completar todas las lecciones (pendiente)')
    expect(rules.getByText('1 de 3 lecciones')).toBeInTheDocument()
    expect(rules.getByText('Asistencia mínima a las sesiones')).toHaveTextContent('(cumplida)')
    expect(rules.getByRole('status')).toHaveTextContent('Aún te falta alguna regla.')
    expect(screen.getByText('Cuando cumplas todas las reglas podrás pedir aquí tu certificado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Emitir mi certificado' })).not.toBeInTheDocument()
  })

  it('cumpliéndolas, pide el certificado con el nombre (por defecto el de la cuenta) y enlaza a él (201)', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completionMet },
      { method: 'POST', path: CERTIFICATE, status: 201, body: certificate }
    ])

    const name = await screen.findByRole('textbox', { name: 'Nombre para el certificado' })
    expect(name).toHaveValue('Tester')
    await userEvent.clear(name)
    await userEvent.type(name, '  Rosa Quispe Mamani ')
    await userEvent.click(screen.getByRole('button', { name: 'Emitir mi certificado' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Emitir el certificado a nombre de Rosa Quispe Mamani?' }))
    expect(dialog.getByText('El nombre queda en el certificado y no se puede cambiar después. Revísalo antes de emitirlo.')).toBeInTheDocument()
    expect(posts()).toEqual([])
    await confirmIssue()

    expect(await screen.findByText('Certificado emitido a nombre de Rosa Quispe Mamani.')).toBeInTheDocument()
    expect(posts()[0]?.body).toEqual({ holderName: 'Rosa Quispe Mamani' })
    expect(screen.getByText('Código de verificación: K7Q2-M9XW-4RTB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver e imprimir el certificado' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  })

  it('si ya estaba emitido (200) con otro nombre, lo dice: no se emite otro', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completionMet },
      { method: 'POST', path: CERTIFICATE, body: certificate }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Emitir mi certificado' }))
    await confirmIssue()

    expect(await screen.findByText('Ya tenías un certificado emitido a nombre de Rosa Quispe Mamani; es el mismo, no se emite otro.')).toBeInTheDocument()
  })

  it('un 409 (reglas pendientes) vuelve a leer la finalización y lo explica', async () => {
    const completion = structuredClone(completionMet)
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completion },
      { method: 'POST', path: CERTIFICATE, status: 409, body: problem(409, 'Faltan reglas') }
    ])

    const request = await screen.findByRole('button', { name: 'Emitir mi certificado' })
    // el servidor ya sabe que falta una: la próxima lectura la trae pendiente
    Object.assign(completion, completionPending)
    await userEvent.click(request)
    await confirmIssue()

    expect(await screen.findByText('El servidor indica que aún falta alguna regla; arriba está la lista actualizada.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('1 de 3 lecciones')).toBeInTheDocument())
    expect(fetchMock.calls.filter((call) => call.path === COMPLETION).length).toBeGreaterThan(1)
  })

  it('un nombre vacío o de más de 120 caracteres no se envía; un 400 del servidor se explica igual', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completionMet },
      { method: 'POST', path: CERTIFICATE, status: 400, body: problem(400, 'Nombre inválido') }
    ])

    const name = await screen.findByRole('textbox', { name: 'Nombre para el certificado' })
    await userEvent.clear(name)
    await userEvent.type(name, '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Emitir mi certificado' }))
    expect(await screen.findByText('Escribe un nombre de 1 a 120 caracteres.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('maxLength', '120')
    expect(posts()).toEqual([])

    // un nombre que no vale ni siquiera pide confirmación
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.type(name, 'X')
    await userEvent.click(screen.getByRole('button', { name: 'Emitir mi certificado' }))
    await confirmIssue()
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(await screen.findByText('Escribe un nombre de 1 a 120 caracteres.')).toBeInTheDocument()
  })

  it('«Revisar el nombre» cierra la confirmación sin emitir nada y deja corregirlo', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: completionMet }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Emitir mi certificado' }))
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: '¿Emitir el certificado a nombre de Tester?' })).getByRole('button', { name: 'Revisar el nombre' })
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(posts()).toEqual([])
    expect(screen.getByRole('textbox', { name: 'Nombre para el certificado' })).toBeEnabled()
  })

  it('con el certificado ya emitido (certificateCode) lo enlaza sin volver a pedirlo', async () => {
    renderCompletion([
      { path: CLASSROOM, body: { ...assessmentClassroom, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' } },
      { path: COMPLETION, body: completionMet }
    ])

    expect(await screen.findByRole('link', { name: 'Ver e imprimir el certificado' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('una finalización fuera de contrato o un error se explican', async () => {
    renderCompletion([
      { path: CLASSROOM, body: assessmentClassroom },
      { path: COMPLETION, body: { ...completionPending, met: true } }
    ])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderCompletion(
      [
        { path: CLASSROOM, body: assessmentClassroom },
        { path: COMPLETION, body: completionMet }
      ],
      'en'
    )

    expect(await screen.findByText('Pass every assessment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Issue my certificate' })).toBeInTheDocument()
  })
})

describe('«Mis cursos» con un curso certificado', () => {
  it('la matrícula FINALIZADA sigue en la lista y enlaza su certificado', async () => {
    fetchMock = mockFetch([
      { path: '/lms/classroom/enrollments', body: [{ ...assessmentClassroom, units: undefined, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }] }
    ])
    renderWithProviders(<MyCoursesPage />, { modules: [classroomModule()], route: '/mis-cursos' })

    expect(await screen.findByText('Certificado emitido')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el certificado de «Introducción al SGSPE»' })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  })
})
