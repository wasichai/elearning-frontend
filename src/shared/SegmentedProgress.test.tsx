import { screen } from '@testing-library/react'
import type { WasichaiModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { describe, expect, it } from 'vitest'
import { classroomMessages } from '../modules/classroom/i18n'
import { progressSummary, SegmentedProgress, type LessonProgressState, type ProgressUnit } from './SegmentedProgress'

// los textos de SegmentedProgress viven en el i18n del aula (src/shared no tiene espacio de nombres propio)
const classroomStub: WasichaiModule = { id: 'classroom', routes: [], i18n: classroomMessages }

function unit(id: string, states: LessonProgressState[]): ProgressUnit {
  return { id, title: `Unidad ${id}`, lessons: states.map((state, at) => ({ id: `${id}-${at + 1}`, title: `Lección ${id}.${at + 1}`, state })) }
}

const empty = (count: number) => Array.from({ length: count }, () => 'NO_INICIADA' as const)

// el curso del artboard: 14 lecciones en 4 unidades, una iniciada
const FOURTEEN = [unit('1', ['INICIADA', ...empty(3)]), unit('2', empty(4)), unit('3', empty(4)), unit('4', empty(2))]

const renderProgress = (units: ProgressUnit[], props: { currentLessonId?: string; language?: string } = {}) =>
  renderWithProviders(<SegmentedProgress units={units} currentLessonId={props.currentLessonId} />, { modules: [classroomStub], language: props.language })

describe('progressSummary', () => {
  it('cuenta COMPLETADA y APROBADA como hechas, e INICIADA aparte', () => {
    expect(progressSummary(FOURTEEN)).toEqual({ done: 0, started: 1, total: 14 })
    expect(progressSummary([unit('1', ['COMPLETADA', 'APROBADA', 'INICIADA', 'NO_INICIADA'])])).toEqual({ done: 2, started: 1, total: 4 })
  })

  it('un curso sin lecciones no cuenta nada', () => {
    expect(progressSummary([unit('1', [])])).toEqual({ done: 0, started: 0, total: 0 })
  })
})

describe('SegmentedProgress', () => {
  it('pinta un segmento por lección en una sola fila', () => {
    const units = Array.from({ length: 6 }, (_, at) => unit(String(at + 1), empty(8)))
    renderProgress(units)
    const row = screen.getByRole('img')
    expect(row.querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(48)
    expect(row.className).toContain('flex-nowrap')
    expect(row.className).toContain('min-w-0')
    for (const segment of row.querySelectorAll('[data-slot="progress-segment"]')) expect(segment.className).toContain('min-w-[2px]')
  })

  it('con 72 lecciones agrupa por unidad: un segmento por unidad, relleno proporcional, mismo texto y aria-label', () => {
    // 6 unidades de 12 lecciones; la primera completa, la segunda a un tercio, la tercera con una iniciada
    const units = Array.from({ length: 6 }, (_, at) => unit(String(at + 1), empty(12)))
    units[0] = unit(
      '1',
      Array.from({ length: 12 }, () => 'COMPLETADA' as const)
    )
    units[1] = unit('2', [...Array.from({ length: 4 }, () => 'APROBADA' as const), ...empty(8)])
    units[2] = unit('3', ['INICIADA', ...empty(11)])
    renderProgress(units, { currentLessonId: '2-6' })
    const row = screen.getByRole('img')
    const segments = [...row.querySelectorAll<HTMLElement>('[data-slot="progress-segment"]')]
    expect(segments).toHaveLength(6)
    expect(segments.map((segment) => segment.querySelector<HTMLElement>('[data-slot="progress-fill"]')!.style.width)).toEqual([
      '100%',
      `${(4 / 12) * 100}%`,
      '0%',
      '0%',
      '0%',
      '0%'
    ])
    expect(segments.map((segment) => segment.hasAttribute('data-current'))).toEqual([false, true, false, false, false, false])
    expect(row).toHaveAttribute('aria-label', '16 de 72 completadas, 1 iniciada')
    expect(screen.getByText(/16 de 72/)).toBeInTheDocument()
  })

  it('en el umbral exacto (60 lecciones) todavía hay un segmento por lección', () => {
    renderProgress(Array.from({ length: 5 }, (_, at) => unit(String(at + 1), empty(12))))
    expect(screen.getByRole('img').querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(60)
  })

  it('una unidad sin lecciones no deja hueco ni segmento', () => {
    renderProgress([unit('1', ['COMPLETADA']), unit('2', []), unit('3', empty(2))])
    const row = screen.getByRole('img')
    expect(row.querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(3)
    expect(row.querySelectorAll('[data-slot="progress-unit"]')).toHaveLength(2)
  })

  it('distingue los cuatro estados por algo más que el color y marca la lección actual', () => {
    renderProgress([unit('1', ['COMPLETADA', 'APROBADA', 'INICIADA', 'NO_INICIADA'])], { currentLessonId: '1-3' })
    const segments = [...screen.getByRole('img').querySelectorAll<HTMLElement>('[data-slot="progress-segment"]')]
    expect(segments.map((segment) => segment.dataset.state)).toEqual(['COMPLETADA', 'APROBADA', 'INICIADA', 'NO_INICIADA'])
    expect(segments.map((segment) => segment.hasAttribute('data-current'))).toEqual([false, false, true, false])
    expect(segments[0]).toHaveClass('bg-ink')
    expect(segments[2]!.className).toContain('repeating-linear-gradient')
    expect(segments[3]).toHaveClass('border-border-control')
    expect(segments[2]).toHaveClass('ring-2', 'ring-brand')
    expect(segments[0]).not.toHaveClass('ring-2')
  })

  it('el aria-label dice cuántas están hechas y cuántas iniciadas', () => {
    renderProgress(FOURTEEN)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '0 de 14 completadas, 1 iniciada')
    expect(screen.getByText('0 de 14 completadas')).toBeVisible()
    expect(screen.getByText('· 1 iniciada')).toBeVisible()
  })

  it('sin iniciadas, no menciona ninguna; en plural y en inglés lo dice con su palabra', () => {
    const { unmount } = renderProgress([unit('1', ['COMPLETADA', 'NO_INICIADA'])])
    expect(screen.getByText('1 de 2 completadas')).toBeVisible()
    expect(screen.queryByText(/iniciada/)).toBeNull()
    unmount()
    renderProgress([unit('1', ['INICIADA', 'INICIADA', 'APROBADA'])])
    expect(screen.getByText('· 2 iniciadas')).toBeVisible()
  })

  it('en inglés', () => {
    renderProgress(FOURTEEN, { language: 'en' })
    expect(screen.getByText('0 of 14 completed')).toBeVisible()
    expect(screen.getByText('· 1 started')).toBeVisible()
  })

  it('una lección que no cuenta tiene su segmento, discontinuo, fuera de la cifra, y el anillo de actual se ve', () => {
    // el artboard con una evaluación NOT_YET: 15 lecciones en el índice, 14 que cuentan
    const units = [...FOURTEEN.slice(0, 3), unit('4', [...empty(2), 'NO_CUENTA'])]
    renderProgress(units, { currentLessonId: '4-3' })
    const row = screen.getByRole('img')
    const segments = [...row.querySelectorAll<HTMLElement>('[data-slot="progress-segment"]')]
    expect(segments).toHaveLength(15)
    expect(progressSummary(units)).toEqual({ done: 0, started: 1, total: 14 })
    expect(row).toHaveAttribute('aria-label', '0 de 14 completadas, 1 iniciada')
    expect(screen.getByText('0 de 14 completadas')).toBeVisible()
    const notCounted = segments.at(-1)!
    expect(notCounted).toHaveAttribute('data-state', 'NO_CUENTA')
    expect(notCounted).toHaveClass('border-dashed')
    expect(notCounted).toHaveAttribute('data-current')
    expect(notCounted).toHaveClass('ring-2', 'ring-brand')
    // la fila recorta lo que desborda, pero deja sitio al anillo de 2px por arriba, por abajo y en los extremos
    expect(row).toHaveClass('p-0.5')
  })

  it('un curso de 40 o más lecciones sigue en una fila y cuenta bien', () => {
    const units = [
      ...Array.from({ length: 9 }, (_, at) => unit(String(at + 1), [...Array.from({ length: 5 }, () => 'COMPLETADA' as const), 'INICIADA'])),
      unit('10', [])
    ]
    renderProgress(units)
    expect(screen.getByRole('img').querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(54)
    expect(screen.getByText('45 de 54 completadas')).toBeVisible()
    expect(screen.getByText('· 9 iniciadas')).toBeVisible()
  })

  it('un curso en el umbral (60 lecciones) no desborda su caja: la fila recorta en lugar de empujar', () => {
    renderProgress(Array.from({ length: 12 }, (_, at) => unit(String(at + 1), empty(5))))
    const row = screen.getByRole('img')
    expect(row.querySelectorAll('[data-slot="progress-segment"]')).toHaveLength(60)
    expect(row).toHaveClass('overflow-hidden', 'min-w-0')
  })
})
