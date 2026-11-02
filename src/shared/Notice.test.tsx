import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Notice } from './Notice'

describe('Notice', () => {
  it.each(['danger', 'warning', 'success', 'notice'] as const)('%s lleva icono decorativo y su texto', (tone) => {
    const { container } = render(<Notice tone={tone}>Texto</Notice>)
    expect(screen.getByText('Texto')).toBeVisible()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('un error se anuncia en el acto; el resto, como estado', () => {
    render(
      <>
        <Notice tone="danger" title="Falló">
          Reintenta
        </Notice>
        <Notice tone="notice">Aviso</Notice>
      </>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('FallóReintenta')
    expect(screen.getByRole('status')).toHaveTextContent('Aviso')
  })
})
