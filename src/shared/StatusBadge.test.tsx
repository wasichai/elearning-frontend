import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StateMark } from './StateMark'
import { STATUS_STATES, StatusBadge } from './StatusBadge'

describe('StatusBadge compartida', () => {
  it.each(STATUS_STATES)('%s lleva icono decorativo y palabra: el color nunca va solo', (state) => {
    render(<StatusBadge state={state}>Palabra</StatusBadge>)
    const badge = screen.getByText('Palabra').closest('[data-slot="badge"]')!
    expect(badge).toHaveAttribute('data-state', state)
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('«iniciada» es el mismo medio círculo que en StateMark: la mitad izquierda rellena', () => {
    // el arco va de arriba abajo en sentido antihorario (bandera de barrido 0): rellena la mitad izquierda, en los dos
    const half = (svg: Element) =>
      svg
        .querySelector('path')!
        .getAttribute('d')!
        .match(/a[\d.]+ [\d.]+ 0 0 (\d)/)![1]
    render(<StatusBadge state="active">Iniciada</StatusBadge>)
    const badge = screen.getByText('Iniciada').closest('[data-slot="badge"]')!.querySelector('svg')!
    const { container } = render(<StateMark state="started" />)
    expect(half(badge)).toBe('0')
    expect(half(container.querySelector('svg')!)).toBe('0')
  })
})
