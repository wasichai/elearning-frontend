import { render, screen, within } from '@testing-library/react'
import { ApiError } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseContract } from './contract'
import { problemKind, ProblemState } from './ProblemState'

// de un fallo (problem+json como ApiError, red, contrato) al tipo de problema que cada módulo sabe explicar (RNF-UX-08)

function contractError(): unknown {
  try {
    return parseContract(z.string(), 'GET lms/catalog/courses', 1)
  } catch (error) {
    return error
  }
}

describe('problemKind', () => {
  it('solo un 400 o un 422 culpan a los datos enviados', () => {
    expect(problemKind(new ApiError(400, 'Bad Request'))).toBe('invalid')
    expect(problemKind(new ApiError(422, 'Unprocessable'))).toBe('invalid')
  })

  it('un 404 es «no está»; un 409, una regla del servidor que no se cumple', () => {
    expect(problemKind(new ApiError(404, 'Not Found'))).toBe('notFound')
    expect(problemKind(new ApiError(409, 'Conflict'))).toBe('conflict')
  })

  it('401, 403 y el resto de 4xx son el servidor negándose; un 5xx, un fallo suyo', () => {
    expect(problemKind(new ApiError(401, 'Unauthorized'))).toBe('refused')
    expect(problemKind(new ApiError(403, 'Forbidden'))).toBe('refused')
    expect(problemKind(new ApiError(429, 'Too Many Requests'))).toBe('refused')
    expect(problemKind(new ApiError(500, 'Internal Server Error'))).toBe('server')
    expect(problemKind(new ApiError(502, 'HTTP 502'))).toBe('server')
  })

  it('sin conexión (fetch lanza TypeError), respuesta fuera de contrato y lo inesperado', () => {
    expect(problemKind(new TypeError('Failed to fetch'))).toBe('network')
    expect(problemKind(contractError())).toBe('contract')
    expect(problemKind(new Error('boom'))).toBe('server')
    expect(problemKind('texto')).toBe('server')
  })
})

describe('ProblemState', () => {
  it('se anuncia como alerta con qué pasó, qué hacer, los detalles y la acción', () => {
    render(
      <ProblemState title="No pudimos cargar el catálogo" description="Revisa los filtros" details={['nivel: no existe']}>
        <button type="button">Reintentar</button>
      </ProblemState>
    )

    const alert = within(screen.getByRole('alert'))
    expect(alert.getByText('No pudimos cargar el catálogo')).toBeInTheDocument()
    expect(alert.getByText('Revisa los filtros')).toBeInTheDocument()
    expect(alert.getByRole('listitem')).toHaveTextContent('nivel: no existe')
    expect(alert.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('sin descripción ni detalles solo dice qué pasó', () => {
    render(<ProblemState title="Algo falló" />)

    expect(screen.getByRole('alert')).toHaveTextContent(/^Algo falló$/)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
