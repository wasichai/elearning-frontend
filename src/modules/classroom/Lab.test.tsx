import { screen, within } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ClassroomPage } from './ClassroomPage'
import { classroomModule } from './module'
import { classroom, labClassroom } from './test/fixtures'

const CLASSROOM = '/lms/classroom/enrollments/mat-srtm-1'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderLab(body: unknown = labClassroom, language = 'es') {
  fetchMock = mockFetch([{ path: CLASSROOM, body }])
  return renderWithProviders(<ClassroomPage />, {
    modules: [classroomModule()],
    route: '/mis-cursos/mat-srtm-1?leccion=lec-lab',
    path: '/mis-cursos/:enrollmentId',
    language
  })
}

describe('LessonView: el laboratorio', () => {
  it('muestra objetivo, requisitos, hitos en orden, criterios, entregables y los entornos en otra pestaña', async () => {
    renderLab()
    await screen.findByRole('heading', { level: 2, name: 'Práctica: el padrón a una fecha pasada' })

    const lab = screen.getByRole('region', { name: 'Laboratorio' })
    // el objetivo va en las notas al margen, una sola vez
    const objective = 'Responder qué anuncios estaban vigentes el día de una inspección.'
    expect(within(screen.getByRole('complementary', { name: 'Notas al margen' })).getByText(objective)).toBeInTheDocument()
    expect(within(lab).queryByText(objective)).not.toBeInTheDocument()
    const list = (name: string) =>
      within(within(lab).getByRole('region', { name }))
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    expect(list('Requisitos')).toEqual(['Cuenta en el entorno de demostración'])
    expect(within(lab).getByRole('region', { name: 'Hitos' }).querySelector('ol')).not.toBeNull()
    expect(list('Hitos')).toEqual(['Abrir el entorno', 'Consultar el padrón', 'Redactar el informe'])
    expect(list('Criterios de aceptación')).toEqual(['Cada estado justificado con su acto'])
    expect(list('Entregables')).toEqual(['Informe en PDF'])

    const environments = within(lab).getByRole('region', { name: 'Entornos externos' })
    const link = within(environments).getByRole('link', { name: /Entorno de demostración/ })
    expect(link).toHaveAttribute('href', 'https://demo.example.org/padron')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName('Entorno de demostración (se abre en otra pestaña)')
    // un enlace que no es https no se enlaza aunque llegue: se nombra y se explica
    expect(within(environments).getAllByRole('link')).toHaveLength(1)
    expect(within(environments).getByText('Entorno antiguo')).toBeInTheDocument()
    expect(within(environments).getByText('Este enlace no es seguro y no se abre.')).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderLab(labClassroom, 'en')
    await screen.findByRole('heading', { level: 2, name: 'Práctica: el padrón a una fecha pasada' })

    const lab = screen.getByRole('region', { name: 'Lab' })
    expect(within(lab).getByRole('region', { name: 'Milestones' })).toBeInTheDocument()
    expect(within(lab).getByRole('region', { name: 'Acceptance criteria' })).toBeInTheDocument()
    expect(within(lab).getByRole('link', { name: 'Entorno de demostración (opens in a new tab)' })).toBeInTheDocument()
  })

  it('un laboratorio sin listas ni entornos no muestra secciones vacías; una lección sin laboratorio, ninguna', async () => {
    const empty = { objective: null, requirements: [], milestones: [], acceptanceCriteria: [], deliverables: [], environments: [] }
    const units = labClassroom.units.map((unit) => ({ ...unit, lessons: unit.lessons.map((l) => (l.id === 'lec-lab' ? { ...l, lab: empty } : l)) }))
    renderLab({ ...labClassroom, units })
    await screen.findByRole('heading', { level: 2, name: 'Práctica: el padrón a una fecha pasada' })

    expect(screen.queryByRole('region', { name: 'Laboratorio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /otra pestaña/ })).not.toBeInTheDocument()
    expect(classroom.units[0]!.lessons.every((l) => !('lab' in l))).toBe(true)
  })
})
