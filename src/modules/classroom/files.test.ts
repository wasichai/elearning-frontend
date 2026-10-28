import { describe, expect, it } from 'vitest'
import { createApiClient } from '@wasichai/core'
import { fileRequestUrl, ForeignFileError, uploadFile } from './files'

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

describe('uploadFile', () => {
  const upload = async (url: string, response: Response) => {
    const client = createApiClient({ baseUrl: '/api', storagePrefix: 'upload-test' })
    client.setToken('token-de-prueba')
    const sent: { url: string; init: RequestInit }[] = []
    const previous = globalThis.fetch
    globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      sent.push({ url: String(input), init })
      return response
    }
    try {
      await uploadFile(client, url, new File(['%PDF'], 'liquidacion.pdf'))
      return sent
    } finally {
      globalThis.fetch = previous
    }
  }

  it('sube el archivo como multipart, parte «file», con la sesión y sin Content-Type JSON', async () => {
    const sent = await upload('/api/objects/entrega/records/ent-1/files/archivo', new Response('{}'))

    expect(sent).toHaveLength(1)
    expect(sent[0]?.url).toBe('/api/objects/entrega/records/ent-1/files/archivo')
    expect(sent[0]?.init.method).toBe('POST')
    const headers = new Headers(sent[0]?.init.headers)
    expect(headers.get('authorization')).toBe('Bearer token-de-prueba')
    expect(headers.get('content-type')).toBeNull()
    expect((sent[0]?.init.body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('una URL de subida fuera de la API no se pide', async () => {
    await expect(upload('https://otro.example/subir', new Response('{}'))).rejects.toThrow(ForeignFileError)
  })

  it('un fallo del servidor es un ApiError con su detalle', async () => {
    const failed = upload('/api/x', new Response(JSON.stringify({ detail: 'demasiado grande' }), { status: 413 }))
    await expect(failed).rejects.toMatchObject({ status: 413, message: 'demasiado grande' })
  })
})
