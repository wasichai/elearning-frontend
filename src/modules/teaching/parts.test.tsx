import { screen } from '@testing-library/react'
import { ApiError } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseContract } from '../../shared/contract'
import { teachingModule } from './module'
import { useActionError } from './parts'

// el texto de un fallo al guardar (RNF-UX-08): de un problem+json del servidor a una frase que se entiende

function Explained({ error }: { error: unknown }) {
  const describe = useActionError()
  return <p role="alert">{describe(error)}</p>
}

// una respuesta que no cumple el contrato, como la deja parseContract
function contractError(): unknown {
  try {
    return parseContract(z.string(), 'POST teaching/sessions/ses-1/cancel', 1)
  } catch (error) {
    return error
  }
}

async function explain(error: unknown, language?: string) {
  const view = renderWithProviders(<Explained error={error} />, { modules: [teachingModule()], language })
  const text = (await screen.findByRole('alert')).textContent
  view.unmount()
  return text
}

describe('useActionError: del ProblemDetail al mensaje', () => {
  it('un 409 dice la regla del servidor con su detalle', async () => {
    expect(await explain(new ApiError(409, 'La sesión ya pasó'))).toBe('El servidor no lo aceptó: La sesión ya pasó')
  })

  it('un 400 o un 422 dicen qué datos rechazó, con cada campo señalado', async () => {
    const invalid = new ApiError(400, 'Datos no válidos', [
      { field: 'points', message: 'debe ser menor o igual que 5' },
      { field: 'reason', message: 'es obligatorio' }
    ])
    expect(await explain(invalid)).toBe('El servidor rechazó los datos: Datos no válidos — points: debe ser menor o igual que 5 — reason: es obligatorio')
    expect(await explain(new ApiError(422, 'Fecha imposible'))).toBe('El servidor rechazó los datos: Fecha imposible')
  })

  it('un 403 dice que falta el permiso, sin culpar a los datos', async () => {
    expect(await explain(new ApiError(403, 'Forbidden'))).toBe(
      'No tienes permiso para hacerlo. Si crees que deberías, pide a la coordinación que revise tu asignación.'
    )
  })

  it('un 404 dice que ya no es de quien lo intenta', async () => {
    expect(await explain(new ApiError(404, 'No existe'))).toBe('Esto ya no está entre lo tuyo: puede que la edición haya cambiado de docente.')
  })

  it('un 5xx deja a la vista el estado para reportarlo', async () => {
    expect(await explain(new ApiError(503, 'Service Unavailable'))).toBe('No pudimos guardarlo (error 503). Inténtalo de nuevo.')
  })

  it('sin conexión lo dice; una respuesta fuera de contrato o lo inesperado, sin detalles técnicos', async () => {
    expect(await explain(new TypeError('Failed to fetch'))).toBe('No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.')
    expect(await explain(contractError())).toBe('No pudimos guardarlo. Inténtalo de nuevo.')
    expect(await explain(new Error('boom'))).toBe('No pudimos guardarlo. Inténtalo de nuevo.')
  })

  it('en inglés', async () => {
    expect(await explain(new ApiError(409, 'Session already took place'), 'en')).toBe('The server did not accept it: Session already took place')
    expect(await explain(new ApiError(403, 'Forbidden'), 'en')).toBe(
      'You are not allowed to do this. If you think you should be, ask the coordinators to check your assignment.'
    )
    expect(await explain(new TypeError('Failed to fetch'), 'en')).toBe('There is no connection to the server. Check your connection and try again.')
  })
})
