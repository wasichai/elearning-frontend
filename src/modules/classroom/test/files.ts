import { vi } from 'vitest'

// los archivos de wasichai-files en las pruebas: mockFetch de @wasichai/testing solo contesta JSON, así que las
// descargas (/api/objects/…/files/…) se sirven aquí, crudas, y lo demás pasa a la simulación que hubiera.
// también pone URL.createObjectURL, que jsdom no tiene.

export interface FileCall {
  url: string
  authorization: string | null
}

export interface ServedFile {
  body: string
  contentType: string
  status?: number
}

export function serveFiles(files: Record<string, ServedFile>) {
  const calls: FileCall[] = []
  const previous = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!url.includes('/files/')) return previous(input, init)
    calls.push({ url, authorization: new Headers(init.headers).get('authorization') })
    const file = files[url]
    if (!file) return new Response(JSON.stringify({ title: 'Not Found', status: 404, detail: 'sin archivo' }), { status: 404 })
    return new Response(file.body, { status: file.status ?? 200, headers: { 'Content-Type': file.contentType } })
  }
  let next = 0
  const created: Blob[] = []
  const createObjectURL = vi.fn((blob: Blob) => {
    created.push(blob)
    return `blob:prueba/${++next}`
  })
  const revokeObjectURL = vi.fn()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
  return {
    calls,
    created,
    createObjectURL,
    revokeObjectURL,
    restore: () => {
      globalThis.fetch = previous
    }
  }
}
