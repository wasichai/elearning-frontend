import { createApiClient, type ApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ContractError } from './contract'
import { fetchAllPages, MAX_PANEL_PAGES, PANEL_PAGE_SIZE } from './pages'

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

const PATH = '/lms/cosas'
const schema = z.array(z.object({ key: z.string() }))
const client = () => createApiClient({ baseUrl: '/api', storagePrefix: 'pages-test' })
const read = (signal?: AbortSignal) => fetchAllPages(client(), { path: PATH, schema, resource: 'GET cosas', keyOf: (item) => item.key, signal })
const items = (count: number, from = 0) => Array.from({ length: count }, (_, index) => ({ key: `k-${from + index}` }))
const page = (number: number, body: unknown[], status?: number) => ({ path: new RegExp(`^${PATH}\\?page=${number}&size=${PANEL_PAGE_SIZE}$`), body, status })

describe('fetchAllPages', () => {
  it('respeta el máximo de 200 del contrato', () => {
    expect(PANEL_PAGE_SIZE).toBeLessThanOrEqual(200)
  })

  it('una página con menos de size es la última', async () => {
    fetchMock = mockFetch([page(0, items(3))])

    expect(await read()).toEqual(items(3))
    expect(fetchMock.calls.map((call) => call.path)).toEqual([`${PATH}?page=0&size=${PANEL_PAGE_SIZE}`])
  })

  it('una primera página vacía es una lista vacía', async () => {
    fetchMock = mockFetch([page(0, [])])

    expect(await read()).toEqual([])
  })

  it('junta las páginas en su orden; un múltiplo exacto de size lo cierra la página vacía que sigue', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(PANEL_PAGE_SIZE, PANEL_PAGE_SIZE)), page(2, [])])

    expect(await read()).toEqual(items(2 * PANEL_PAGE_SIZE))
    expect(fetchMock.calls).toHaveLength(3)
  })

  it('un elemento repetido entre dos páginas cuenta una vez, con su dato más reciente', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(2, PANEL_PAGE_SIZE - 1))])

    expect(await read()).toEqual(items(PANEL_PAGE_SIZE + 1))
  })

  it('si una página posterior falla, falla todo', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [], 500)])

    await expect(read()).rejects.toThrow()
  })

  it('una página fuera de contrato es un ContractError con el nombre del recurso', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [{ key: 1 }])])

    await expect(read()).rejects.toBeInstanceOf(ContractError)
    fetchMock.restore()
    fetchMock = mockFetch([page(0, [{ key: 1 }])])
    await expect(read()).rejects.toThrow('GET cosas')
  })

  it('si las páginas nunca terminan, para en el límite de seguridad y falla', async () => {
    fetchMock = mockFetch([{ path: new RegExp(`^${PATH}\\?`), body: items(PANEL_PAGE_SIZE) }])

    await expect(read()).rejects.toThrow(`GET cosas: más de ${MAX_PANEL_PAGES} páginas`)
    expect(fetchMock.calls).toHaveLength(MAX_PANEL_PAGES)
  })

  it('cada página lleva la señal de cancelar la lectura', async () => {
    const controller = new AbortController()
    const signals: unknown[] = []
    const fake = {
      request: async (url: string, options: { signal?: AbortSignal }) => {
        signals.push(options.signal)
        return url.includes('page=0') ? items(PANEL_PAGE_SIZE) : []
      }
    } as unknown as ApiClient

    await fetchAllPages(fake, { path: PATH, schema, resource: 'GET cosas', keyOf: (item) => item.key, signal: controller.signal })

    expect(signals).toEqual([controller.signal, controller.signal])
  })
})
