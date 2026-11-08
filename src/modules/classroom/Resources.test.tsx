import { screen } from '@testing-library/react'
import { renderWithProviders } from '@wasichai/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { classroomModule } from './module'
import { HtmlResource } from './Resources'

// un documento que pasara el contrato pero rompiera al pintarse no tumba la lección: el error queda en su recurso
vi.mock('./readingApi', () => ({
  useReading: () => ({
    isError: false,
    data: { title: null, blocks: [{ type: 'paragraph', content: null }] },
    refetch: vi.fn()
  })
}))

afterEach(() => vi.restoreAllMocks())

describe('HtmlResource', () => {
  it('un error al pintar la lectura se muestra como el de un recurso que no carga', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithProviders(<HtmlResource enrollmentId="mat-srtm-1" resourceId="rec-html" />, { modules: [classroomModule()] })

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar este recurso.')
  })
})
