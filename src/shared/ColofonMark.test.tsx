import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ColofonMark } from './ColofonMark'

describe('ColofonMark', () => {
  it('es un monograma decorativo en los tokens del tema', () => {
    const { container } = render(<ColofonMark />)
    const mark = container.querySelector('svg')!
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(mark.textContent).toBe('c')
    expect(mark.innerHTML).toContain('var(--brand)')
    expect(mark.innerHTML).toContain('var(--on-brand)')
  })
})
