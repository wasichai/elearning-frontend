import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { createdVersion, draftDetail, draftVersion, problem, publishedDetail, publishedVersion } from './test/fixtures'
import { VersionPage } from './VersionPage'

// una versión propia (ADR-0018): su temario, editarla en Wasichai si es borrador, enviarla a revisión, ver comentarios y
// decisiones, y crear una versión nueva a partir de ella

const detailPath = (id: string) => `/lms/studio/versions/${id}`
const SUBMIT = `${detailPath(draftVersion.id)}/submit`
const NEW_VERSION = `/lms/studio/courses/${publishedVersion.course.id}/versions`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderVersion(id: string, routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/estudio/versiones/:id" element={<VersionPage />} />
    </Routes>,
    { modules: [studioModule()], route: `/estudio/versiones/${id}`, language }
  )
}

const posts = (path: string) => fetchMock.calls.filter((call) => call.method === 'POST' && call.path === path)

describe('VersionPage: un borrador', () => {
  it('muestra el temario en orden, con enlaces para editar en Wasichai, y sin comentarios ni decisiones', async () => {
    renderVersion(draftVersion.id, [{ path: detailPath(draftVersion.id), body: draftDetail }])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    expect(screen.getByText('Versión 2 · SGSPE-101')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar la versión' })).toHaveAttribute('href', `/data/objects/version_curso/records/${draftVersion.id}`)
    expect(screen.getByRole('link', { name: '← Mis versiones' })).toHaveAttribute('href', '/estudio')

    const syllabus = within(screen.getByRole('region', { name: 'Contenido' }))
    expect(syllabus.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Unidad 1. Primeros pasos',
      'Unidad 2. Liquidaciones'
    ])
    expect(syllabus.getByRole('link', { name: 'Editar la unidad «Primeros pasos»' })).toHaveAttribute('href', '/data/objects/unidad/records/u-1')
    expect(syllabus.getByRole('link', { name: 'Editar la lección «Entrar al portal»' })).toHaveAttribute('href', '/data/objects/leccion/records/l-1')
    const lessons = syllabus.getAllByText(/^\d\. /).map((lesson) => lesson.textContent)
    expect(lessons).toEqual(['1. Entrar al portal', '2. Recorrido por el portal', '1. Evaluación final'])
    expect(syllabus.getByText('Lectura · 1 recurso')).toBeInTheDocument()
    expect(syllabus.getByText('Video · 2 recursos')).toBeInTheDocument()
    expect(syllabus.getByText('Evaluación · con evaluación · 0 recursos')).toBeInTheDocument()
    expect(syllabus.getByText('Fuente: wasichai/manual-sgspe@4f2a9c1:acceso.adoc#entrar')).toBeInTheDocument()

    expect(screen.getByText('El revisor no ha dejado comentarios.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay decisiones sobre esta versión.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear una versión nueva a partir de esta' })).not.toBeInTheDocument()
  })

  it('se envía a revisión tras confirmarlo; cancelar no envía nada', async () => {
    const user = userEvent.setup()
    renderVersion(draftVersion.id, [
      { path: detailPath(draftVersion.id), body: draftDetail },
      { method: 'POST', path: SUBMIT, body: { ...draftVersion, status: 'EN_REVISION' } }
    ])

    await user.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })
    expect(dialog).toHaveTextContent('Mientras la versión 2 esté en revisión no podrás editarla.')
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(posts(SUBMIT)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, enviar a revisión' }))
    expect(await screen.findByText('Enviada a revisión.')).toBeInTheDocument()
    expect(posts(SUBMIT)).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // el servidor manda: tras enviar se relee la versión
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'GET' && call.path === detailPath(draftVersion.id)).length).toBeGreaterThan(1))
  })

  it('si el servidor no lo acepta (409), el diálogo dice por qué', async () => {
    const user = userEvent.setup()
    renderVersion(draftVersion.id, [
      { path: detailPath(draftVersion.id), body: draftDetail },
      { method: 'POST', path: SUBMIT, status: 409, body: problem(409, 'Solo se envía a revisión un borrador') }
    ])

    await user.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, enviar a revisión' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('El servidor no lo aceptó: Solo se envía a revisión un borrador')
    expect(screen.queryByText('Enviada a revisión.')).not.toBeInTheDocument()
  })
})

describe('VersionPage: una versión publicada', () => {
  it('no se edita; muestra los comentarios y las decisiones del revisor como texto', async () => {
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: publishedDetail }])

    expect(await screen.findByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeInTheDocument()
    expect(screen.getByText(/Está publicada y no cambia/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar la versión' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Editar la (unidad|lección)/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument()

    const comments = within(screen.getByRole('region', { name: 'Comentarios de revisión' }))
    expect(comments.getByText('1 comentario por atender')).toBeInTheDocument()
    const items = comments.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('unidad:1/leccion:1')
    expect(items[0]).toHaveTextContent('Resuelto')
    expect(items[1]).toHaveTextContent('La evaluación pide algo que la unidad no enseña.')
    expect(items[1]).toHaveTextContent('Por atender')

    const decisions = within(screen.getByRole('region', { name: 'Decisiones del revisor' }))
    expect(decisions.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Pidió cambios.*Faltan ejemplos en la unidad 2\.$/),
      expect.stringMatching(/^Aprobada/)
    ])
  })

  it('crea una versión nueva a partir de ella, tras confirmarlo, y la abre', async () => {
    const user = userEvent.setup()
    renderVersion(publishedVersion.id, [
      { path: detailPath(publishedVersion.id), body: publishedDetail },
      { method: 'POST', path: NEW_VERSION, status: 201, body: createdVersion },
      { path: detailPath(createdVersion.id), body: { ...draftDetail, ...createdVersion } }
    ])

    await user.click(await screen.findByRole('button', { name: 'Crear una versión nueva a partir de esta' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Crear una versión nueva?' })
    expect(dialog).toHaveTextContent('La versión 1 y quien la cursa no cambian')
    await user.click(within(dialog).getByRole('button', { name: 'Sí, crear el borrador' }))

    expect(await screen.findByText('Versión 3 · SGSPE-101')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeInTheDocument()
    expect(posts(NEW_VERSION).map((call) => call.body)).toEqual([{ fromVersionId: publishedVersion.id }])
  })

  it('un fallo al crearla se explica en el diálogo', async () => {
    const user = userEvent.setup()
    renderVersion(publishedVersion.id, [
      { path: detailPath(publishedVersion.id), body: publishedDetail },
      { method: 'POST', path: NEW_VERSION, status: 403, body: problem(403, 'Forbidden') }
    ])

    await user.click(await screen.findByRole('button', { name: 'Crear una versión nueva a partir de esta' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, crear el borrador' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('No tienes permiso para hacerlo.')
  })
})

describe('VersionPage: errores e idioma', () => {
  it('una versión ajena (404) se explica sin reintentar; un error del servidor deja reintentar', async () => {
    const first = renderVersion('ajena', [{ path: detailPath('ajena'), status: 404, body: problem(404, 'Versión no encontrada') }])
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta versión no está entre las tuyas')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    renderVersion(draftVersion.id, [{ path: detailPath(draftVersion.id), status: 500, body: problem(500, 'fallo') }])
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la versión')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: publishedDetail }], 'en')

    expect(await screen.findByRole('heading', { level: 2, name: 'Status: Published' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a new version from this one' })).toBeInTheDocument()
    expect(screen.getByText('Requested changes')).toBeInTheDocument()
    expect(screen.getByText('Reading · 1 resource')).toBeInTheDocument()
  })
})
