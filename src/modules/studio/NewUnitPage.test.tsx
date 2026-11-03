import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { NewUnitPage } from './NewUnitPage'
import { draftDetail, firstDraftDetail, problem, publishedDetail, unitDefinition } from './test/fixtures'

// añadir una unidad a un borrador sin tener que elegir la versión en el formulario de core, que las nombra por su estado

const DEFINITION = '/metadata/objects/unidad'
const UNITS = '/objects/unidad/records'
const detailPath = (id: string) => `/lms/studio/versions/${id}`
const CREATED = { id: 'u-nueva', createdAt: null, updatedAt: null, attributes: { orden: 1, titulo: 'Primeros pasos' } }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPage(id: string, routes: MockRoute[]) {
  fetchMock = mockFetch([{ path: DEFINITION, body: unitDefinition }, { method: 'POST', path: UNITS, status: 201, body: CREATED }, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/estudio/versiones/:id/unidades/nueva" element={<NewUnitPage />} />
      <Route path="/estudio/versiones/:id" element={<p>La versión</p>} />
    </Routes>,
    { modules: [studioModule()], route: `/estudio/versiones/${id}/unidades/nueva` }
  )
}

describe('NewUnitPage: una unidad del borrador', () => {
  it('propone el orden siguiente, no pregunta la versión y la envía con el id de esta versión', async () => {
    const user = userEvent.setup()
    renderPage(firstDraftDetail.id, [{ path: detailPath(firstDraftDetail.id), body: firstDraftDetail }])

    expect(await screen.findByLabelText(/Orden/)).toHaveValue(1)
    expect(screen.queryByText('Versión del curso')).not.toBeInTheDocument()
    expect(screen.queryByText('Fuente')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/Título/), 'Primeros pasos')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La versión')).toBeInTheDocument()
    const post = fetchMock.calls.find((call) => call.method === 'POST')
    expect(post?.body).toMatchObject({ attributes: { orden: 1, titulo: 'Primeros pasos', version_curso: firstDraftDetail.id } })
  })

  it('con unidades, el orden siguiente al mayor', async () => {
    renderPage(draftDetail.id, [{ path: detailPath(draftDetail.id), body: draftDetail }])

    expect(await screen.findByLabelText(/Orden/)).toHaveValue(3)
  })

  it('una versión que no es borrador no ofrece el formulario', async () => {
    renderPage(publishedDetail.id, [{ path: detailPath(publishedDetail.id), body: publishedDetail }])

    expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la versión' })).toHaveAttribute('href', `/estudio/versiones/${publishedDetail.id}`)
  })

  it('una versión ajena o inexistente se explica, sin formulario', async () => {
    renderPage('otra', [{ path: detailPath('otra'), status: 404, body: problem(404, 'no') }])

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta versión no está entre las tuyas')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument())
  })
})
