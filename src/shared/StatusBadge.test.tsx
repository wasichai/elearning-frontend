import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STATUS_STATES, StatusBadge } from './StatusBadge'

describe('StatusBadge compartida', () => {
  it.each(STATUS_STATES)('%s lleva icono decorativo y palabra: el color nunca va solo', (state) => {
    render(<StatusBadge state={state}>Palabra</StatusBadge>)
    const badge = screen.getByText('Palabra').closest('[data-slot="badge"]')!
    expect(badge).toHaveAttribute('data-state', state)
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
