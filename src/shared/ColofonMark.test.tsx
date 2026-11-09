import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ColofonMark } from './ColofonMark'

describe('ColofonMark', () => {
  it('es un monograma decorativo en los tokens del tema', () => {
    const { container } = render(<ColofonMark />)
    const mark = container.querySelector('svg')!
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    // la «c» es un trazado: no hay texto ni fuente de la que depender
    expect(mark.querySelector('text')).toBeNull()
    expect(mark.textContent).toBe('')
    expect(mark.querySelector('path')).toHaveAttribute('stroke', 'var(--on-brand)')
    expect(mark.innerHTML).not.toContain('Newsreader')
    expect(mark.innerHTML).toContain('var(--brand)')
    expect(mark.innerHTML).toContain('var(--on-brand)')
  })
})
