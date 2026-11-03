import { screen, waitFor } from '@testing-library/react'
import { ApiError, coreModule, createLinks, createRegistry } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { acceptanceState, safeReturnTo, termsViewSchema, useTermsRefusal, type TermsRefusal, type TermsView } from './terms'

const TERMS = '/lms/terms'
const current = { version: 3, text: 'Texto', retentionDays: 730, publishedAt: '2026-11-01T10:00:00Z' }
const acceptance = (over = {}) => ({
  version: 3,
  acceptedAt: '2026-11-02T10:00:00Z',
  expiresAt: '2028-11-01T10:00:00Z',
  withdrawnAt: null,
  valid: true,
  ...over
})

describe('acceptanceState', () => {
  const view = (over: Partial<TermsView>): TermsView => ({ current, acceptance: null, ...over })

  it('sin aceptación, es que falta', () => {
    expect(acceptanceState(view({}))).toBe('none')
  })

  it('una aceptación vigente de la versión actual', () => {
    expect(acceptanceState(view({ acceptance: acceptance() }))).toBe('current')
  })

  // publicar otra versión no altera ninguna aceptación (docs/api/lms.md): sigue valiendo y no hay que bloquear a nadie
  it('una aceptación vigente de una versión anterior sigue valiendo', () => {
    expect(acceptanceState(view({ acceptance: acceptance({ version: 2 }) }))).toBe('older')
  })

  it('retirada o vencida: sus datos se están suprimiendo', () => {
    expect(acceptanceState(view({ acceptance: acceptance({ valid: false, withdrawnAt: '2026-11-03T10:00:00Z' }) }))).toBe('withdrawn')
    expect(acceptanceState(view({ acceptance: acceptance({ valid: false }) }))).toBe('expired')
  })
})

describe('termsViewSchema', () => {
  it('admite el ejemplo del contrato y la organización sin términos', () => {
    expect(termsViewSchema.parse({ current, acceptance: acceptance() }).current?.version).toBe(3)
    expect(termsViewSchema.parse({ current: null, acceptance: null }).current).toBeNull()
  })

  it('rechaza un plazo que no es un número', () => {
    expect(termsViewSchema.safeParse({ current: { ...current, retentionDays: 'mucho' }, acceptance: null }).success).toBe(false)
  })
})

describe('safeReturnTo', () => {
  const OWN = ['/login', '/terminos']

  it.each(['/cursos/srtm-anuncios', '/mis-cursos/m-1?leccion=l-1', '/cursos?q=a#b'])('deja volver a %s', (path) => {
    expect(safeReturnTo(path, OWN)).toBe(path)
  })

  it.each([
    null,
    '',
    'https://mal.example',
    '//mal.example',
    '/\\mal.example',
    '/\t/mal.example',
    'javascript:alert(1)',
    'cursos',
    '/login',
    '/LOGIN/',
    '/terminos',
    '/terminos?returnTo=/terminos',
    '/cursos/../login'
  ])('no deja volver a %s', (path) => {
    expect(safeReturnTo(path, OWN)).toBeNull()
  })
})

describe('useTermsRefusal', () => {
  let fetchMock: FetchMock
  afterEach(() => fetchMock?.restore())

  function Probe({ error }: { error: unknown }) {
    const refusal: TermsRefusal = useTermsRefusal(error)
    return <p>{refusal}</p>
  }

  const render = (error: unknown, routes: MockRoute[]) => {
    fetchMock = mockFetch(routes)
    return renderWithProviders(<Probe error={error} />, { route: '/' })
  }
  const FORBIDDEN = new ApiError(403, 'Prohibido')

  it('sin un 403 no pregunta nada', async () => {
    render(new ApiError(409, 'Sin cupo'), [])
    expect(screen.getByText('none')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.length).toBeGreaterThan(0))
    expect(fetchMock.calls.filter((call) => call.path === TERMS)).toEqual([])
  })

  it.each([
    ['sin aceptación', { current, acceptance: null }],
    ['con la aceptación retirada', { current, acceptance: acceptance({ valid: false, withdrawnAt: '2026-11-03T10:00:00Z' }) }],
    ['con la aceptación vencida', { current, acceptance: acceptance({ valid: false }) }],
    ['sin términos publicados', { current: null, acceptance: null }]
  ])('un 403 %s es por los términos', async (_case, body) => {
    render(FORBIDDEN, [{ path: TERMS, body }])
    expect(await screen.findByText('terms')).toBeInTheDocument()
  })

  it.each([
    ['vigente', acceptance()],
    ['vigente de una versión anterior', acceptance({ version: 2 })]
  ])('un 403 con la aceptación %s es por otra causa', async (_case, accepted) => {
    render(FORBIDDEN, [{ path: TERMS, body: { current, acceptance: accepted } }])
    expect(await screen.findByText('other')).toBeInTheDocument()
  })

  it('no lee el texto del problema: un 403 que nombra los términos con una aceptación vigente sigue siendo otra causa', async () => {
    render(new ApiError(403, 'Para matricularte debes aceptar los términos de uso vigentes'), [{ path: TERMS, body: { current, acceptance: acceptance() } }])
    expect(await screen.findByText('other')).toBeInTheDocument()
  })

  it('si no se puede comprobar, no supone nada', async () => {
    render(FORBIDDEN, [{ path: TERMS, status: 500, body: { title: 'Error' } }])
    expect(await screen.findByText('unknown')).toBeInTheDocument()
  })

  it('un contrato roto tampoco se toma por una causa', async () => {
    render(FORBIDDEN, [{ path: TERMS, body: { current: { version: 'tres' }, acceptance: null } }])
    expect(await screen.findByText('unknown')).toBeInTheDocument()
  })
})

describe('el enlace a los términos', () => {
  it('lleva returnTo codificado', () => {
    const links = createLinks(createRegistry([coreModule, { id: 'terms', routes: [{ id: 'terms', path: 'terminos', component: () => null }] }]))
    expect(links.to('terms:terms', {}, { returnTo: '/cursos/a?b=c' })).toBe('/terminos?returnTo=%2Fcursos%2Fa%3Fb%3Dc')
  })
})
