import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CallerPermissions, WasichaiModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { termsModule } from './module'
import { TermsPage } from './TermsPage'

const TERMS = '/lms/terms'
const ACCEPTANCE = '/lms/terms/acceptance'
const current = { version: 3, text: 'Primera línea.\nSegunda línea.', retentionDays: 730, publishedAt: '2026-11-01T15:00:00Z' }
const accepted = (over = {}) => ({ version: 3, acceptedAt: '2026-11-02T15:00:00Z', expiresAt: '2028-11-01T15:00:00Z', withdrawnAt: null, valid: true, ...over })
const STUDENT: CallerPermissions = { admin: false, capabilities: [], objects: {} }
const MANAGER: CallerPermissions = { admin: false, capabilities: ['MANAGE_ORGANIZATION'], objects: {} }
const problem = (status: number, detail: string) => ({ type: `https://x/${status}`, title: 'Problem', status, detail })

const adminStub: WasichaiModule = { id: 'administration', routes: [{ id: 'terms', path: 'administracion/terminos', component: () => null }] }
// el grupo «Aprendizaje» es del aula: para esta pantalla basta que exista
const learningStub: WasichaiModule = { id: 'classroom', navGroups: [{ id: 'learning', labelKey: 'x', order: 5 }] }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderTerms(routes: MockRoute[], { route = '/terminos', permissions = STUDENT, modules = [learningStub, termsModule(), adminStub] } = {}) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/cursos/:slug" element={<p>la ficha del curso</p>} />
      <Route path="/administracion/terminos" element={<p>publicar términos</p>} />
    </Routes>,
    { modules, route, permissions }
  )
}

const posts = () => fetchMock.calls.filter((call) => call.method === 'POST')
const deletes = () => fetchMock.calls.filter((call) => call.method === 'DELETE')

describe('leer los términos', () => {
  it('muestra el título único, la versión, el plazo y el texto', async () => {
    renderTerms([{ path: TERMS, body: { current, acceptance: null } }])

    expect(await screen.findByText(/Primera línea\./)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Términos de uso' })).toBeInTheDocument()
    expect(screen.getByText('730 días')).toBeInTheDocument()
    expect(screen.getByText('Plazo de conservación')).toBeInTheDocument()
    expect(screen.getByText('Versión vigente')).toBeInTheDocument()
  })

  it('el texto es dato: el HTML que traiga se ve como texto y no se interpreta', async () => {
    const text = '<img src=x onerror="alert(1)"><script>alert(2)</script><b>negrita</b>'
    const { container } = renderTerms([{ path: TERMS, body: { current: { ...current, text }, acceptance: null } }])

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
  })

  it('mientras carga lo dice, y si falla ofrece reintentar', async () => {
    renderTerms([{ path: TERMS, status: 500, body: problem(500, 'Fallo') }])

    expect(screen.getByRole('status')).toHaveTextContent('Cargando los términos')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los términos')
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('sin términos publicados', () => {
  const none = { path: TERMS, body: { current: null, acceptance: null } }

  it('a quien no administra se lo dice sin culparla, y no le ofrece publicar', async () => {
    renderTerms([none])

    expect(await screen.findByText('Tu organización aún no ha publicado sus términos')).toBeInTheDocument()
    expect(screen.getByText(/nadie puede matricularse/)).toBeInTheDocument()
    expect(screen.getByText(/No es por nada que hayas hecho/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Publicar los términos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aceptar/ })).not.toBeInTheDocument()
  })

  it('a quien administra le dice que debe publicarlos y la lleva allí', async () => {
    renderTerms([none], { permissions: MANAGER })

    const link = await screen.findByRole('link', { name: 'Publicar los términos' })
    expect(link).toHaveAttribute('href', '/administracion/terminos')
    expect(link).toHaveAttribute('data-variant', 'primary')
    expect(screen.getByText(/Debes publicarlos/)).toBeInTheDocument()
  })

  it('sin la pantalla de publicar registrada no hay enlace muerto', async () => {
    renderTerms([none], { permissions: MANAGER, modules: [learningStub, termsModule()] })

    await screen.findByText(/Debes publicarlos/)
    expect(screen.queryByRole('link', { name: 'Publicar los términos' })).not.toBeInTheDocument()
  })
})

describe('aceptar', () => {
  const RETURN = '/terminos?returnTo=%2Fcursos%2Fsrtm%3Fx%3D1'

  it('sin aceptación, acepta la versión que está leyendo y lo dice', async () => {
    renderTerms([
      { path: TERMS, body: { current, acceptance: null } },
      { method: 'POST', path: ACCEPTANCE, body: accepted() }
    ])

    expect(await screen.findByText('Aún no has aceptado estos términos')).toBeInTheDocument()
    const accept = screen.getByRole('button', { name: 'Aceptar los términos' })
    expect(accept).toHaveAttribute('data-variant', 'primary')
    await userEvent.click(accept)

    expect(await screen.findByText('Aceptaste estos términos')).toBeInTheDocument()
    expect(posts()[0]?.body).toEqual({ version: 3 })
    expect(screen.queryByRole('button', { name: 'Aceptar los términos' })).not.toBeInTheDocument()
  })

  it('al aceptar vuelve a lo que estaba haciendo', async () => {
    renderTerms(
      [
        { path: TERMS, body: { current, acceptance: null } },
        { method: 'POST', path: ACCEPTANCE, body: accepted() }
      ],
      { route: RETURN }
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar los términos' }))
    expect(await screen.findByText('la ficha del curso')).toBeInTheDocument()
  })

  it('ofrece volver sin aceptar, como acción secundaria', async () => {
    renderTerms([{ path: TERMS, body: { current, acceptance: null } }], { route: RETURN })

    const back = await screen.findByRole('link', { name: 'Volver sin aceptar' })
    expect(back).toHaveAttribute('href', '/cursos/srtm?x=1')
    expect(back).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByText(/Para continuar con lo que estabas haciendo/)).toBeInTheDocument()
  })

  it.each(['https://mal.example', '//mal.example', '/\\mal.example', '/terminos'])('no vuelve a un destino inseguro (%s)', async (target) => {
    renderTerms(
      [
        { path: TERMS, body: { current, acceptance: null } },
        { method: 'POST', path: ACCEPTANCE, body: accepted() }
      ],
      { route: `/terminos?returnTo=${encodeURIComponent(target)}` }
    )

    await screen.findByRole('button', { name: 'Aceptar los términos' })
    expect(screen.queryByRole('link', { name: 'Volver sin aceptar' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar los términos' }))
    expect(await screen.findByText('Aceptaste estos términos')).toBeInTheDocument()
    expect(screen.queryByText('la ficha del curso')).not.toBeInTheDocument()
  })

  it('con la aceptación ya vigente y una vuelta pendiente, la vuelta es la acción', async () => {
    renderTerms([{ path: TERMS, body: { current, acceptance: accepted() } }], { route: RETURN })

    const back = await screen.findByRole('link', { name: 'Volver a lo que hacías' })
    expect(back).toHaveAttribute('data-variant', 'primary')
    expect(screen.queryByRole('button', { name: /Aceptar/ })).not.toBeInTheDocument()
  })

  it('una aceptación de una versión anterior sigue vigente y aceptar la nueva es opcional', async () => {
    renderTerms([
      { path: TERMS, body: { current, acceptance: accepted({ version: 2 }) } },
      { method: 'POST', path: ACCEPTANCE, body: accepted() }
    ])

    expect(await screen.findByText('Tu aceptación sigue vigente')).toBeInTheDocument()
    expect(screen.getByText(/versión 2/)).toBeInTheDocument()
    expect(screen.getByText(/No tienes que hacer nada para seguir/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar la versión 3' }))
    expect(await screen.findByText('Aceptaste estos términos')).toBeInTheDocument()
    expect(posts()[0]?.body).toEqual({ version: 3 })
  })

  describe('el 409 según lo que diga después GET /terms', () => {
    const refused = { method: 'POST', path: ACCEPTANCE, status: 409, body: problem(409, 'Conflicto del servidor') }

    const serving = (body: unknown): MockRoute[] => [{ path: TERMS, body }, refused]

    it('con la anterior retirada: sus datos se están suprimiendo, que vuelva en unos minutos', async () => {
      const withdrawn = accepted({ valid: false, withdrawnAt: '2026-11-03T15:00:00Z' })
      renderTerms(serving({ current, acceptance: withdrawn }))

      await userEvent.click(await screen.findByRole('button', { name: 'Volver a aceptar' }))
      expect(await screen.findByText(/todavía se están suprimiendo/)).toBeInTheDocument()
      expect(screen.getByText(/en unos minutos/)).toBeInTheDocument()
      expect(screen.queryByText('la ficha del curso')).not.toBeInTheDocument()
    })

    it('con la anterior vencida, lo mismo', async () => {
      renderTerms(serving({ current, acceptance: accepted({ valid: false }) }))

      expect(await screen.findByText('Tu aceptación venció')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Volver a aceptar' }))
      expect(await screen.findByText(/todavía se están suprimiendo/)).toBeInTheDocument()
    })

    it('si mientras leía se publicó otra versión, muestra la nueva y pide leerla', async () => {
      const terms = { path: TERMS, body: { current, acceptance: null } as unknown }
      renderTerms([terms, refused])

      const accept = await screen.findByRole('button', { name: 'Aceptar los términos' })
      terms.body = { current: { ...current, version: 4, text: 'Texto nuevo' }, acceptance: null }
      await userEvent.click(accept)
      expect(await screen.findByText(/Se publicó una versión nueva/)).toBeInTheDocument()
      expect(screen.getByText('Texto nuevo')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  it('cualquier otro error lo dice sin dar por hecha la aceptación', async () => {
    renderTerms([
      { path: TERMS, body: { current, acceptance: null } },
      { method: 'POST', path: ACCEPTANCE, status: 500, body: problem(500, 'Fallo') }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar los términos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos registrar tu aceptación')
    expect(screen.getByRole('button', { name: 'Aceptar los términos' })).toBeEnabled()
  })
})

describe('retirar', () => {
  const valid = { path: TERMS, body: { current, acceptance: accepted() } }
  const JOB = '6f1c1e2a-1111-4222-8333-444455556666'
  const withdraw = () => screen.findByRole('button', { name: 'Retirar mi aceptación' })

  it('dice qué se suprime y qué no, y no es la acción primaria', async () => {
    renderTerms([valid])

    const button = await withdraw()
    expect(button).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByText(/eventos de aprendizaje, progreso, asistencias, entregas, intentos sin calificar/)).toBeInTheDocument()
    expect(screen.getByText(/matrículas .*intentos calificados.*certificados/)).toBeInTheDocument()
    expect(screen.getByText(/Tu cuenta/)).toBeInTheDocument()
  })

  it('sin aceptación vigente no se ofrece', async () => {
    renderTerms([{ path: TERMS, body: { current, acceptance: null } }])

    await screen.findByText(/Primera línea/)
    expect(screen.queryByRole('button', { name: 'Retirar mi aceptación' })).not.toBeInTheDocument()
  })

  it('pide confirmación explícita; cancelar no envía nada y devuelve el foco', async () => {
    renderTerms([valid])

    const button = await withdraw()
    button.focus()
    await userEvent.click(button)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument()
    expect(deletes()).toEqual([])

    await userEvent.click(within(dialog).getByRole('button', { name: 'Conservarla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(button).toHaveFocus())
    expect(deletes()).toEqual([])
  })

  it('202: dice que está en curso, sin afirmar que terminó, y el foco pasa al aviso', async () => {
    const terms = { ...valid } as { path: string; body: unknown }
    renderTerms([terms, { method: 'DELETE', path: ACCEPTANCE, status: 202, body: { jobId: JOB } }])

    await userEvent.click(await withdraw())
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Retirar y suprimir' })
    // lo que responderá el servidor al volver a leer
    terms.body = { current, acceptance: accepted({ valid: false, withdrawnAt: '2026-11-03T15:00:00Z' }) }
    await userEvent.click(confirm)

    const notice = await screen.findByText('Tu retirada está en curso')
    expect(screen.getByText(/Aún no ha terminado/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(JOB))).toBeInTheDocument()
    expect(screen.queryByText(/se han suprimido|ya se suprimieron/)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirar mi aceptación' })).not.toBeInTheDocument()
    await waitFor(() => expect(notice.closest('[tabindex="-1"]')).toHaveFocus())
  })

  it('404: no hay aceptación que retirar', async () => {
    renderTerms([valid, { method: 'DELETE', path: ACCEPTANCE, status: 404, body: problem(404, 'No tienes') }])

    await userEvent.click(await withdraw())
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Retirar y suprimir' }))

    expect(await screen.findByText(/No tienes una aceptación que retirar/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('otro error: se queda en el diálogo y lo explica', async () => {
    renderTerms([valid, { method: 'DELETE', path: ACCEPTANCE, status: 500, body: problem(500, 'Fallo') }])

    await userEvent.click(await withdraw())
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retirar y suprimir' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos retirar tu aceptación')
  })

  it('al volver con la retirada en curso, lo sigue diciendo sin afirmar que terminó', async () => {
    renderTerms([{ path: TERMS, body: { current, acceptance: accepted({ valid: false, withdrawnAt: '2026-11-03T15:00:00Z' }) } }])

    expect(await screen.findByText('Retiraste tu aceptación')).toBeInTheDocument()
    expect(screen.getByText(/se están suprimiendo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a aceptar' })).toHaveAttribute('data-variant', 'secondary')
    expect(screen.queryByRole('button', { name: 'Retirar mi aceptación' })).not.toBeInTheDocument()
  })
})
