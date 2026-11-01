import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STATUS_STATES, StatusBadge, statusOf } from './StatusBadge'

// la insignia de estado de aprendizaje (StatusBadge del sistema de diseño): icono y palabra, nunca solo color

describe('StatusBadge', () => {
  it.each(STATUS_STATES)('%s: la palabra se lee y el icono es decorativo', (state) => {
    render(<StatusBadge state={state}>Palabra</StatusBadge>)
    const badge = screen.getByText('Palabra').closest('[data-slot="badge"]')
    expect(badge).toHaveAttribute('data-state', state)
    const icon = badge?.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('cada estado tiene su propia forma de icono, la misma en todo el producto', () => {
    const shapes = STATUS_STATES.map((state) => {
      const { container, unmount } = render(<StatusBadge state={state}>x</StatusBadge>)
      const markup = container.querySelector('svg')!.innerHTML
      unmount()
      return markup
    })
    expect(new Set(shapes).size).toBe(STATUS_STATES.length)
  })

  it('del estado de una lección: completada o aprobada, empezada, sin empezar', () => {
    expect(['COMPLETADA', 'APROBADA', 'INICIADA', 'NO_INICIADA'].map((status) => statusOf(status as never))).toEqual(['done', 'done', 'active', 'todo'])
  })
})
