import { screen, within } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { teachingModule } from './module'
import { RosterPage } from './RosterPage'
import { offering, problem, roster } from './test/fixtures'

const OFFERINGS = '/lms/teaching/offerings'
const STUDENTS = `${OFFERINGS}/edicion-sgspe-2026-09/students`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderRoster(routes: MockRoute[], code = 'edicion-sgspe-2026-09', language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<RosterPage />, { modules: [teachingModule()], route: `/docencia/${code}`, path: '/docencia/:code', language })
}

describe('RosterPage: matriculados de una edición', () => {
  it('muestra cada matriculado con su progreso, su asistencia y sus evaluaciones', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: roster }
    ])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: '2 matriculados' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Estudiante', 'Matrícula', 'Progreso', 'Asistencia', 'Evaluaciones'])
    const rows = within(table).getAllByRole('row').slice(1)
    // por correo
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['ana.torres@demo.local', 'estudiante@demo.local'])
    const pending = within(rows[1]!)
    expect(pending.getByText('Activa')).toBeInTheDocument()
    expect(pending.getByText('33 % (1 de 3 lecciones)')).toBeInTheDocument()
    expect(pending.getByText('1 de 2 sesiones')).toBeInTheDocument()
    expect(pending.getByText(': pendiente de corrección')).toBeInTheDocument()
    expect(within(rows[0]!).getByText(': 85 %, aprobada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Mis ediciones' })).toHaveAttribute('href', '/docencia')
  })

  it('una matrícula sin correo (anterior a que se guardara) no rompe la lista, y sin asistencia ni evaluaciones todavía lo dice', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [{ ...roster[0], email: null, attendance: { attended: 0, total: 0 }, assessments: [] }, roster[1]] }
    ])

    const table = await screen.findByRole('table', { name: '2 matriculados' })
    const rows = within(table).getAllByRole('row').slice(1)
    // quien no tiene correo va al final
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['ana.torres@demo.local', 'Sin correo registrado'])
    expect(within(rows[1]!).getByText('Sin sesiones aún')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Sin evaluaciones')).toBeInTheDocument()
  })

  it('una edición ajena (404) se explica: solo se ven las asignadas', async () => {
    renderRoster(
      [
        { path: OFFERINGS, body: [offering] },
        { path: /^\/lms\/teaching\/offerings\/ajena\/students$/, status: 404, body: problem(404, 'No existe') }
      ],
      'ajena'
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Esta edición no está entre las tuyas')
    expect(alert).toHaveTextContent('Solo ves las ediciones que tienes asignadas como docente.')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Edición' })).toBeInTheDocument()
  })

  it('sin matriculados lo dice', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [] }
    ])

    expect(await screen.findByText('Esta edición aún no tiene matriculados.')).toBeInTheDocument()
  })

  it('un error o un contrato roto se explican y dejan reintentar', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [{ ...roster[0], attendance: { attended: 5, total: 2 } }] }
    ])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderRoster(
      [
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ],
      undefined,
      'en'
    )

    expect(await screen.findByRole('table', { name: '2 students' })).toBeInTheDocument()
    expect(screen.getByText('33% (1 of 3 lessons)')).toBeInTheDocument()
    expect(screen.getByText(': awaiting grading')).toBeInTheDocument()
  })
})
