import { createApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchClassroom, fetchEnrollments } from './api'
import { ContractError } from './contract'
import { classroom, enrollment } from './test/fixtures'

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

const client = () => {
  const api = createApiClient({ baseUrl: '/api', storagePrefix: 'classroom-test' })
  api.setToken('token-de-prueba')
  return api
}

describe('peticiones del aula', () => {
  it('pide mis matrículas con la sesión y valida la respuesta', async () => {
    fetchMock = mockFetch([{ path: '/lms/classroom/enrollments', body: [enrollment] }])

    expect(await fetchEnrollments(client())).toHaveLength(1)
    expect(fetchMock.calls[0]?.url).toBe('/api/lms/classroom/enrollments')
    expect(fetchMock.calls[0]?.headers.authorization).toBe('Bearer token-de-prueba')
  })

  it('pide el aula por matrícula, con el identificador codificado', async () => {
    fetchMock = mockFetch([{ path: /^\/lms\/classroom\/enrollments\/a%2Fb$/, body: { ...classroom, id: 'a/b' } }])

    expect((await fetchClassroom(client(), 'a/b')).id).toBe('a/b')
  })

  it('una respuesta fuera de contrato es un ContractError, no datos a medias', async () => {
    fetchMock = mockFetch([{ path: '/lms/classroom/enrollments', body: [{ ...enrollment, progress: null }] }])

    await expect(fetchEnrollments(client())).rejects.toBeInstanceOf(ContractError)
  })
})
