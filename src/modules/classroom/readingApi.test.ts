import { createApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ContractError } from './contract'
import { fetchReading } from './readingApi'
import { readingDocument } from './test/fixtures'

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

const client = () => {
  const api = createApiClient({ baseUrl: '/api', storagePrefix: 'reading-test' })
  api.setToken('token-de-prueba')
  return api
}

const READING = '/lms/classroom/enrollments/mat%2F1/resources/rec%2Fhtml/reading'

describe('la lectura en bloques', () => {
  it('se pide con la sesión, por matrícula y versión de recurso codificadas, y se valida', async () => {
    fetchMock = mockFetch([{ path: READING, body: readingDocument }])

    expect(await fetchReading(client(), 'mat/1', 'rec/html')).toEqual(readingDocument)
    expect(fetchMock.calls[0]?.headers.authorization).toBe('Bearer token-de-prueba')
  })

  it('descarta los bloques y los elementos en línea que no entiende, también anidados', async () => {
    fetchMock = mockFetch([
      {
        path: READING,
        body: {
          title: null,
          blocks: [
            { type: 'html', html: '<script>alert(1)</script>' },
            { type: 'heading', level: 6, id: null, content: [] },
            { type: 'admonition', kind: 'danger', content: [] },
            { type: 'paragraph', content: [{ type: 'script', text: 'x' }, { type: 'text', text: 'queda' }, { type: 'em' }] },
            { type: 'list', ordered: false, items: [[{ type: 'iframe' }, { type: 'rule' }]] }
          ]
        }
      }
    ])

    expect(await fetchReading(client(), 'mat/1', 'rec/html')).toEqual({
      title: null,
      blocks: [
        { type: 'paragraph', content: [{ type: 'text', text: 'queda' }] },
        { type: 'list', ordered: false, items: [[{ type: 'rule' }]] }
      ]
    })
  })

  it('una respuesta sin bloques es un error de contrato', async () => {
    fetchMock = mockFetch([{ path: READING, body: { title: 'x' } }])
    await expect(fetchReading(client(), 'mat/1', 'rec/html')).rejects.toBeInstanceOf(ContractError)
  })
})
