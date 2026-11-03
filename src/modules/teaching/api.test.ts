import { createApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { MAX_PANEL_PAGES, PANEL_PAGE_SIZE } from '../../shared/pages'
import { fetchTeachingPanel } from './api'
import { ContractError } from './contract'
import { offering, panelItem } from './test/fixtures'

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

const client = () => {
  const api = createApiClient({ baseUrl: '/api', storagePrefix: 'teaching-test' })
  api.setToken('token-de-prueba')
  return api
}

describe('el panel docente, por páginas', () => {
  const PANEL = '/lms/teaching/panel'
  const items = (count: number, from = 0) => Array.from({ length: count }, (_, index) => panelItem({ ...offering, code: `e-${from + index}` }))
  const page = (number: number, body: unknown[], status?: number) => ({ path: new RegExp(`^${PANEL}\\?page=${number}&size=${PANEL_PAGE_SIZE}$`), body, status })
  const read = () => fetchMock!.calls.map((call) => call.path)

  it('respeta el máximo de 200 del contrato', () => {
    expect(PANEL_PAGE_SIZE).toBeLessThanOrEqual(200)
  })

  it('una página con menos de size es la última', async () => {
    fetchMock = mockFetch([page(0, items(3))])

    expect(await fetchTeachingPanel(client())).toHaveLength(3)
    expect(read()).toEqual([`${PANEL}?page=0&size=${PANEL_PAGE_SIZE}`])
  })

  it('sigue hasta esa página y junta todas, en su orden', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(1, PANEL_PAGE_SIZE))])

    const panel = await fetchTeachingPanel(client())
    expect(panel.map((item) => item.code)).toEqual(Array.from({ length: PANEL_PAGE_SIZE + 1 }, (_, index) => `e-${index}`))
    expect(read()).toHaveLength(2)
  })

  it('con un múltiplo exacto de size, la página vacía que sigue la cierra', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [])])

    expect(await fetchTeachingPanel(client())).toHaveLength(PANEL_PAGE_SIZE)
    expect(read()).toHaveLength(2)
  })

  it('si la lista se mueve entre dos páginas, una edición repetida cuenta una vez', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(2, PANEL_PAGE_SIZE - 1))])

    expect(await fetchTeachingPanel(client())).toHaveLength(PANEL_PAGE_SIZE + 1)
  })

  it('si una página posterior falla, falla todo: no devuelve lo leído como si fuera completo', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [], 500)])

    await expect(fetchTeachingPanel(client())).rejects.toThrow()
  })

  it('una página posterior fuera de contrato, igual', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [{ ...items(1)[0], oldestPending: null }])])

    await expect(fetchTeachingPanel(client())).rejects.toBeInstanceOf(ContractError)
  })

  it('si las páginas nunca terminan, para en el límite de seguridad y falla', async () => {
    fetchMock = mockFetch([{ path: new RegExp(`^${PANEL}\\?`), body: items(PANEL_PAGE_SIZE) }])

    await expect(fetchTeachingPanel(client())).rejects.toThrow(/páginas/)
    expect(read()).toHaveLength(MAX_PANEL_PAGES)
  })
})
