import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentSkeleton, FormSkeleton, MediaSkeleton } from './PageSkeleton'

describe('esqueletos de pantalla', () => {
  it.each([
    ['documento', DocumentSkeleton, 'document-skeleton'],
    ['formulario', FormSkeleton, 'form-skeleton'],
    ['medio', MediaSkeleton, 'media-skeleton']
  ] as const)('el de %s avisa a lectores de pantalla y no pinta el texto', (_name, Shape, slot) => {
    render(<Shape label="Cargando la versión…" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Cargando la versión…')
    expect(status).toHaveAttribute('data-slot', slot)
    expect(screen.getByText('Cargando la versión…')).toHaveClass('sr-only')
  })
})
