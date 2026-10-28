import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, useApiClient, useAuth, type ApiClient } from '@wasichai/core'
import { useCallback, useEffect, useState } from 'react'
import type { ResourceFile } from './contract'

// los archivos de los recursos (wasichai-files) se bajan con la sesión: el token va en la cabecera, como en el cliente
// de @wasichai/core, que no sirve aquí porque lee JSON. por eso nunca se pinta un <a href> ni un <video src> con la URL
// del servidor: el navegador no mandaría el token. el archivo llega como Blob y se muestra o se guarda desde memoria.

// la URL del archivo es del mismo origen y cuelga de apiBaseUrl (docs/api/lms.md: /api/objects/…/files/archivo).
// cualquier otra cosa se rechaza antes de pedirla: el token de la sesión no sale nunca hacia otro sitio
export class ForeignFileError extends Error {
  constructor(url: string) {
    super(`el archivo ${url} no está bajo la API de la aplicación`)
    this.name = 'ForeignFileError'
  }
}

export function fileRequestUrl(client: Pick<ApiClient, 'baseUrl'>, url: string, origin = window.location.origin): string {
  const target = new URL(url, origin)
  const base = new URL(`${client.baseUrl}/`, origin)
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw new ForeignFileError(url)
  return `${target.pathname}${target.search}`
}

export async function fetchFile(client: ApiClient, url: string, signal?: AbortSignal): Promise<Blob> {
  const headers = new Headers()
  const token = client.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(fileRequestUrl(client, url), { headers, signal })
  if (!response.ok) {
    let detail: string | undefined
    try {
      const problem = (await response.json()) as { detail?: string; title?: string }
      detail = problem.detail ?? problem.title
    } catch {
      detail = undefined
    }
    throw new ApiError(response.status, detail ?? `HTTP ${response.status}`)
  }
  return response.blob()
}

export const fileKey = (url: string) => ['classroom', 'file', url] as const

// pedir un archivo con la sesión; un 401 cierra la sesión como lo haría el cliente de core
function useFileFetcher() {
  const client = useApiClient()
  const { signOut } = useAuth()
  return useCallback(
    async (url: string, signal?: AbortSignal) => {
      try {
        return await fetchFile(client, url, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) signOut()
        throw error
      }
    },
    [client, signOut]
  )
}

// una versión publicada de un recurso no cambia (ADR-0012): bajada una vez, sirve mientras dure la página
const FILE_QUERY = { staleTime: Infinity, retry: false } as const

export function useFileBlob(file: ResourceFile) {
  const fetcher = useFileFetcher()
  return useQuery({ queryKey: fileKey(file.url), queryFn: ({ signal }) => fetcher(file.url, signal), ...FILE_QUERY })
}

export function useFileText(file: ResourceFile) {
  const fetcher = useFileFetcher()
  return useQuery({
    queryKey: [...fileKey(file.url), 'text'],
    queryFn: async ({ signal }) => (await fetcher(file.url, signal)).text(),
    ...FILE_QUERY
  })
}

// una URL blob: para un Blob mientras se muestra; se libera al cambiar o desmontar
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(undefined)
    }
  }, [blob])
  return url
}

// guardar un archivo: se baja con la sesión (o se toma de la caché) y se entrega al navegador con su nombre
export function useDownload(file: ResourceFile) {
  const fetcher = useFileFetcher()
  const queryClient = useQueryClient()
  const [state, setState] = useState<{ pending: boolean; error: unknown }>({ pending: false, error: null })
  const download = useCallback(async () => {
    setState({ pending: true, error: null })
    try {
      const blob = await queryClient.fetchQuery({ queryKey: fileKey(file.url), queryFn: ({ signal }) => fetcher(file.url, signal), ...FILE_QUERY })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = file.name
      anchor.rel = 'noopener'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      // el navegador ya tomó el archivo; liberar enseguida cancelaría la descarga en algunos navegadores
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      setState({ pending: false, error: null })
    } catch (error) {
      setState({ pending: false, error })
    }
  }, [fetcher, file.name, file.url, queryClient])
  return { download, ...state }
}
