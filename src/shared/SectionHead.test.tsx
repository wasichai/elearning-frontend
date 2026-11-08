import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionHead } from './SectionHead'

describe('SectionHead', () => {
  it('muestra el número «§n», el título y el meta a la derecha', () => {
    const { container } = render(<SectionHead number="2" title="Campos y menús" meta={<span>44 px de alto</span>} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Campos y menús' })).toBeVisible()
    expect(screen.getByText('§2')).toBeVisible()
    expect(screen.getByText('44 px de alto')).toBeVisible()
    // abre la sección con el filete fuerte
    expect(container.firstElementChild).toHaveClass('rule-strong')
  })

  it('sin número ni meta es solo el título, y el nivel se elige', () => {
    render(<SectionHead as="h3" title="Solo título" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Solo título' })).toBeVisible()
    expect(screen.queryByText(/§/)).toBeNull()
  })
})
