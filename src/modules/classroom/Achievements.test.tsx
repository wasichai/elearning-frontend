import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@wasichai/testing'
import { describe, expect, it, vi } from 'vitest'
import { Achievements } from './Achievements'
import type { Classroom } from './contract'
import { orderedUnits } from './lessons'
import { classroomModule } from './module'
import { assessmentClassroom, assessmentSummary, classroom } from './test/fixtures'

const UNIT = { kind: 'UNIT_COMPLETED', at: '2026-11-03T15:20:00Z', ref: 'uni-sg-1' }
const PASSED = { kind: 'ASSESSMENT_PASSED', at: '2026-11-04T10:05:00Z', ref: assessmentSummary.id }
const CERTIFICATE = { kind: 'CERTIFICATE_ISSUED', at: '2026-11-05T09:00:00Z', ref: 'K7Q2-M9XW-4RTB' }

function renderAchievements(achievements: unknown[], { onNavigate }: { onNavigate?: () => void } = {}) {
  const data = { ...assessmentClassroom, achievements } as unknown as Classroom
  return renderWithProviders(<Achievements classroom={data} units={orderedUnits(data)} onNavigate={onNavigate} />, {
    modules: [classroomModule()],
    route: '/mis-cursos/mat-sgspe-1',
    path: '/mis-cursos/:enrollmentId'
  })
}

const region = () => screen.getByRole('region', { name: 'Logros' })
const rows = () => within(region()).getAllByRole('listitem')

describe('Achievements: los logros del aula (RF-AUL-08)', () => {
  it('sin logros no hay sección ni relleno', () => {
    const { container } = renderAchievements([])
    expect(container).toBeEmptyDOMElement()
  })

  it('cada logro dice qué es, su fecha y enlaza por clave de ruta a su unidad, evaluación o certificado', () => {
    renderAchievements([UNIT, PASSED, CERTIFICATE])

    expect(within(region()).getByRole('list').tagName).toBe('OL')
    const lesson = (id: string) => `/mis-cursos/mat-sgspe-1?leccion=${id}`
    // la unidad no tiene pantalla propia: su enlace abre su primera lección, y el temario despliega esa unidad
    expect(within(region()).getByRole('link', { name: /^El SGSPE.*Unidad completada.*3 nov 2026/ })).toHaveAttribute('href', lesson('lec-sgspe-1'))
    expect(within(region()).getByRole('link', { name: /^Evaluación final.*Evaluación aprobada.*4 nov 2026/ })).toHaveAttribute('href', lesson('lec-eva'))
    expect(within(region()).getByRole('link', { name: /^Certificado emitido.*5 nov 2026/ })).toHaveAttribute('href', '/certificados/K7Q2-M9XW-4RTB')
  })

  it('respeta el orden del servidor y deja sin fecha el que no la tiene, sin inventarla', () => {
    renderAchievements([PASSED, UNIT, { ...CERTIFICATE, at: null }])

    const [first, second, third] = rows()
    expect(first).toHaveTextContent('Evaluación final')
    expect(second).toHaveTextContent('El SGSPE')
    expect(third).toHaveTextContent('Certificado emitido')
    expect(third!.querySelector('time')).toBeNull()
    expect(third).not.toHaveTextContent(/\d{4}/)
    expect(first!.querySelector('time')).toHaveAttribute('datetime', PASSED.at)
  })

  it('una fecha ausente se trata como la nula', () => {
    renderAchievements([{ kind: 'UNIT_COMPLETED', ref: 'uni-sg-1' }])
    expect(rows()[0]!.querySelector('time')).toBeNull()
    expect(within(region()).getByRole('link', { name: /^El SGSPE.*Unidad completada/ })).toBeInTheDocument()
  })

  it('la fecha va en la zona de la edición, como el resto del aula, no en la del navegador', () => {
    // 03:00 UTC del 4 de noviembre son las 22:00 del 3 en Lima
    renderAchievements([{ ...PASSED, at: '2026-11-04T03:00:00Z' }])
    expect(within(region()).getByRole('link', { name: /3 nov 2026/ })).toBeInTheDocument()
  })

  it('una referencia que no se resuelve muestra el logro sin enlace ni título', () => {
    renderAchievements([
      { ...UNIT, ref: 'uni-de-otra-version' },
      { ...PASSED, ref: 'eva-de-otra-version' }
    ])

    expect(within(region()).queryAllByRole('link')).toEqual([])
    const [unit, assessment] = rows()
    expect(unit).toHaveTextContent('Unidad completada')
    expect(unit).toHaveTextContent('3 nov 2026')
    expect(assessment).toHaveTextContent('Evaluación aprobada')
  })

  it('la evaluación se resuelve por assessment.id exacto, no por el id de la lección ni por parte de él', () => {
    renderAchievements([
      { ...PASSED, ref: 'lec-eva' },
      { ...PASSED, ref: 'eva-fin' }
    ])
    expect(within(region()).queryAllByRole('link')).toEqual([])
  })

  it('una unidad resuelta pero sin lecciones dice su título sin enlace', () => {
    const data = { ...classroom, achievements: [{ kind: 'UNIT_COMPLETED', at: null, ref: 'vacia' }] } as unknown as Classroom
    const units = [{ ...data.units[0]!, id: 'vacia', title: 'Unidad vacía', lessons: [] }]
    renderWithProviders(<Achievements classroom={data} units={units} />, { modules: [classroomModule()], route: '/x', path: '/x' })
    expect(rows()[0]).toHaveTextContent('Unidad vacía')
    expect(within(region()).queryAllByRole('link')).toEqual([])
  })

  it('un tipo desconocido se omite sin romper; si no queda ninguno, no hay sección', () => {
    const { unmount } = renderAchievements([{ kind: 'NUEVO_TIPO', at: null, ref: 'x' }])
    expect(screen.queryByRole('region', { name: 'Logros' })).toBeNull()
    unmount()

    renderAchievements([{ kind: 'NUEVO_TIPO', at: null, ref: 'x' }, UNIT])
    expect(rows()).toHaveLength(1)
    expect(region()).not.toHaveTextContent('NUEVO')
  })

  it('con pocos logros la lista se ve abierta; con muchos se pliega y deja a la vista el temario', async () => {
    const { unmount } = renderAchievements([UNIT, PASSED, CERTIFICATE])
    expect(region().querySelector('details')).toHaveAttribute('open')
    unmount()

    const many = [UNIT, PASSED, CERTIFICATE, { ...UNIT, ref: 'otra' }]
    renderAchievements(many)
    const details = region().querySelector('details')!
    expect(details).not.toHaveAttribute('open')
    expect(within(region()).getByText('4 logros')).toBeInTheDocument()
    await userEvent.click(within(region()).getByText('Logros'))
    expect(details).toHaveAttribute('open')
  })

  it('la unidad lleva la marca de completada; la evaluación aprobada y el certificado, la de aprobada', () => {
    renderAchievements([UNIT, PASSED, CERTIFICATE])
    const state = (row: HTMLElement | undefined) => row!.querySelector('[data-slot="state-mark"]')?.getAttribute('data-state')
    const [unit, assessment, issued] = rows()
    expect([state(unit), state(assessment), state(issued)]).toEqual(['done', 'passed', 'passed'])
  })

  it('al elegir un logro avisa a quien lo monta: en el móvil, la hoja del temario se cierra', async () => {
    const onNavigate = vi.fn()
    renderAchievements([PASSED], { onNavigate })
    await userEvent.click(within(region()).getByRole('link', { name: /^Evaluación final/ }))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('se lee en inglés, con fechas en inglés', () => {
    renderWithProviders(
      <Achievements
        classroom={{ ...assessmentClassroom, achievements: [PASSED] } as unknown as Classroom}
        units={orderedUnits(assessmentClassroom as unknown as Classroom)}
      />,
      {
        modules: [classroomModule()],
        route: '/x',
        path: '/x',
        language: 'en'
      }
    )
    expect(within(screen.getByRole('region', { name: 'Achievements' })).getByRole('link', { name: /Assessment passed.*Nov 4, 2026/ })).toBeInTheDocument()
  })
})
