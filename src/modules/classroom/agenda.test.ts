import { createApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { agendaPath, fetchAgenda, isoInstant } from './agenda'
import { ContractError } from './contract'
import { agendaItem, otherEnrollment, sessions } from './test/fixtures'

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

const client = () => {
  const api = createApiClient({ baseUrl: '/api', storagePrefix: 'agenda-test' })
  api.setToken('token-de-prueba')
  return api
}

const range = { from: '2026-11-09T00:00:00Z', to: '2026-11-16T00:00:00Z' }

describe('la agenda del estudiante', () => {
  it('pide el intervalo con la sesión y valida cada sesión con su matrícula y su curso', async () => {
    fetchMock = mockFetch([{ path: /^\/lms\/classroom\/sessions\?/, body: [agendaItem(otherEnrollment, sessions[2]!)] }])

    const [read] = await fetchAgenda(client(), range)
    expect(read).toMatchObject({ id: 'ses-3', enrollmentId: 'mat-sgspe-1', courseTitle: 'Introducción al SGSPE', offeringCode: 'edicion-sgspe-2026-09' })
    expect(fetchMock.calls[0]?.url).toBe('/api/lms/classroom/sessions?from=2026-11-09T00%3A00%3A00Z&to=2026-11-16T00%3A00%3A00Z')
    expect(fetchMock.calls[0]?.headers.authorization).toBe('Bearer token-de-prueba')
  })

  it('un desplazamiento +hh:mm va como %2B', () => {
    expect(agendaPath({ from: '2026-11-09T00:00:00+01:00', to: '2026-11-10T00:00:00+01:00' })).toBe(
      '/lms/classroom/sessions?from=2026-11-09T00%3A00%3A00%2B01%3A00&to=2026-11-10T00%3A00%3A00%2B01%3A00'
    )
  })

  it('escribe los instantes sin milisegundos', () => {
    expect(isoInstant(Date.UTC(2026, 10, 9, 5, 30, 0, 123))).toBe('2026-11-09T05:30:00Z')
  })

  it('una sesión sin su matrícula está fuera de contrato', async () => {
    fetchMock = mockFetch([{ path: /^\/lms\/classroom\/sessions\?/, body: [sessions[2]] }])

    await expect(fetchAgenda(client(), range)).rejects.toBeInstanceOf(ContractError)
  })
})
