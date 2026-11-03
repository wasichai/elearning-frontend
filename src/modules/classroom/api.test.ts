import { createApiClient } from '@wasichai/core'
import { mockFetch, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchClassroom, fetchClassroomPanel, fetchEnrollments, MAX_PANEL_PAGES, PANEL_PAGE_SIZE } from './api'
import { ContractError } from './contract'
import { classroom, enrollment, panelItem } from './test/fixtures'

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

describe('el panel del estudiante, por páginas', () => {
  const PANEL = '/lms/classroom/panel'
  const items = (count: number, from = 0) => Array.from({ length: count }, (_, index) => panelItem({ ...enrollment, id: `mat-${from + index}` }))
  const page = (number: number, body: unknown[], status?: number) => ({ path: new RegExp(`^${PANEL}\\?page=${number}&size=${PANEL_PAGE_SIZE}$`), body, status })
  const read = () => fetchMock!.calls.map((call) => call.path)

  it('respeta el máximo de 200 del contrato', () => {
    expect(PANEL_PAGE_SIZE).toBeLessThanOrEqual(200)
  })

  it('una página con menos de size es la última', async () => {
    fetchMock = mockFetch([page(0, items(3))])

    expect(await fetchClassroomPanel(client())).toHaveLength(3)
    expect(read()).toEqual([`${PANEL}?page=0&size=${PANEL_PAGE_SIZE}`])
  })

  it('sigue hasta esa página y junta todas, en su orden', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(PANEL_PAGE_SIZE, PANEL_PAGE_SIZE)), page(2, items(1, 2 * PANEL_PAGE_SIZE))])

    const panel = await fetchClassroomPanel(client())
    expect(panel).toHaveLength(2 * PANEL_PAGE_SIZE + 1)
    expect(panel.map((item) => item.id)).toEqual(Array.from({ length: panel.length }, (_, index) => `mat-${index}`))
    expect(read()).toHaveLength(3)
  })

  it('con un múltiplo exacto de size, la página vacía que sigue la cierra', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [])])

    expect(await fetchClassroomPanel(client())).toHaveLength(PANEL_PAGE_SIZE)
    expect(read()).toHaveLength(2)
  })

  it('si la lista se mueve entre dos páginas, una matrícula repetida cuenta una vez', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, items(2, PANEL_PAGE_SIZE - 1))])

    expect(await fetchClassroomPanel(client())).toHaveLength(PANEL_PAGE_SIZE + 1)
  })

  it('si una página posterior falla, falla todo: no devuelve lo leído como si fuera completo', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [], 500)])

    await expect(fetchClassroomPanel(client())).rejects.toThrow()
  })

  it('una página posterior fuera de contrato, igual', async () => {
    fetchMock = mockFetch([page(0, items(PANEL_PAGE_SIZE)), page(1, [{ ...items(1)[0], upcomingSessions: null }])])

    await expect(fetchClassroomPanel(client())).rejects.toBeInstanceOf(ContractError)
  })

  it('si las páginas nunca terminan, para en el límite de seguridad y falla', async () => {
    fetchMock = mockFetch([{ path: new RegExp(`^${PANEL}\\?`), body: items(PANEL_PAGE_SIZE) }])

    await expect(fetchClassroomPanel(client())).rejects.toThrow(/páginas/)
    expect(read()).toHaveLength(MAX_PANEL_PAGES)
  })
})
