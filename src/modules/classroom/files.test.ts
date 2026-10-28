import { describe, expect, it } from 'vitest'
import { fileRequestUrl, ForeignFileError } from './files'

describe('fileRequestUrl', () => {
  const client = { baseUrl: '/api' }
  const origin = 'https://aula.example'

  it('acepta la descarga de wasichai-files bajo apiBaseUrl, del mismo origen', () => {
    expect(fileRequestUrl(client, '/api/objects/version_recurso/records/r1/files/archivo', origin)).toBe(
      '/api/objects/version_recurso/records/r1/files/archivo'
    )
    expect(fileRequestUrl(client, 'https://aula.example/api/x?v=2', origin)).toBe('/api/x?v=2')
  })

  it.each(['https://otro.example/api/x', '//otro.example/api/x', '/apix/archivo', '/otra/api/x', 'javascript:alert(1)'])('rechaza %s', (url) => {
    expect(() => fileRequestUrl(client, url, origin)).toThrow(ForeignFileError)
  })
})
