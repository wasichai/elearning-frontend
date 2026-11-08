import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RunningHead } from './RunningHead'

describe('RunningHead', () => {
  it('lleva las migas a la izquierda, con enlace salvo la actual, y el folio a la derecha', () => {
    render(
      <MemoryRouter>
        <RunningHead trail={[{ label: 'Mis cursos', to: '/mis-cursos' }, { label: 'Rentas municipales' }, { label: 'Unidad 2' }]} folio="6 / 14" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Mis cursos' })).toHaveAttribute('href', '/mis-cursos')
    expect(screen.getByText('Unidad 2')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('6 / 14')).toBeVisible()
  })

  it('corta con elipsis un título de 120 caracteres y deja el texto completo en title', () => {
    const long = 'T'.repeat(120)
    render(
      <MemoryRouter>
        <RunningHead trail={[{ label: 'Mis cursos', to: '/mis-cursos' }, { label: long }]} />
      </MemoryRouter>
    )
    const title = screen.getByText(long)
    expect(title).toHaveAttribute('title', long)
    expect(title).toHaveClass('truncate')
    expect(title.closest('li')).toHaveClass('min-w-0')
  })
})
