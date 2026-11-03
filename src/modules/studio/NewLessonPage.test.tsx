import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import { NewLessonPage } from './NewLessonPage'
import { draftDetail, lessonDefinition, noLessonsDetail, problem, publishedDetail } from './test/fixtures'

// añadir una lección desde su unidad: el selector de unidad del formulario de core solo trae cien, de todos los cursos

const DEFINITION = '/metadata/objects/leccion'
const LESSONS = '/objects/leccion/records'
const detailPath = (id: string) => `/lms/studio/versions/${id}`
const CREATED = { id: 'l-nueva', createdAt: null, updatedAt: null, attributes: { orden: 1, titulo: 'Entrar', tipo: 'LECTURA' } }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPage(id: string, unit: string, routes: MockRoute[], language?: string) {
  fetchMock = mockFetch([{ path: DEFINITION, body: lessonDefinition }, { method: 'POST', path: LESSONS, status: 201, body: CREATED }, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/estudio/versiones/:id/unidades/:unitId/lecciones/nueva" element={<NewLessonPage />} />
      <Route path="/estudio/versiones/:id" element={<p>La versión</p>} />
    </Routes>,
    { modules: [studioModule()], route: `/estudio/versiones/${id}/unidades/${unit}/lecciones/nueva`, language }
  )
}

describe('NewLessonPage: una lección de una unidad del borrador', () => {
  it('dice en qué unidad está, no la pregunta, y la envía con el id de esta unidad', async () => {
    const user = userEvent.setup()
    renderPage(noLessonsDetail.id, 'u-vacia-1', [{ path: detailPath(noLessonsDetail.id), body: noLessonsDetail }])

    expect(await screen.findByLabelText(/Orden/)).toHaveValue(1)
    expect(screen.getByText('De la unidad 1. Primeros pasos')).toBeInTheDocument()
    expect(screen.queryByText('Unidad')).not.toBeInTheDocument()
    expect(screen.queryByText('Fuente')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/Título/), 'Entrar')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La versión')).toBeInTheDocument()
    const post = fetchMock.calls.find((call) => call.method === 'POST')
    expect(post?.body).toMatchObject({ attributes: { orden: 1, titulo: 'Entrar', tipo: 'LECTURA', unidad: 'u-vacia-1' } })
  })

  it('con lecciones, el orden siguiente al mayor de esa unidad', async () => {
    renderPage(draftDetail.id, 'u-1', [{ path: detailPath(draftDetail.id), body: draftDetail }])

    expect(await screen.findByLabelText(/Orden/)).toHaveValue(3)
  })

  it('una versión que no es borrador no ofrece el formulario', async () => {
    renderPage(publishedDetail.id, 'u-1', [{ path: detailPath(publishedDetail.id), body: publishedDetail }])

    expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('una unidad que ya no está en la versión se explica, sin formulario', async () => {
    renderPage(noLessonsDetail.id, 'otra', [{ path: detailPath(noLessonsDetail.id), body: noLessonsDetail }])

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta unidad ya no está en la versión')
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la versión' })).toHaveAttribute('href', `/estudio/versiones/${noLessonsDetail.id}`)
  })

  it('una versión ajena o inexistente se explica, sin formulario', async () => {
    renderPage('otra', 'u-1', [{ path: detailPath('otra'), status: 404, body: problem(404, 'no') }])

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta versión no está entre las tuyas')
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it.each([
    ['en', ['Order', 'Title', 'Type', 'Estimated duration (minutes)', 'Summary']],
    ['es', ['Orden', 'Título', 'Tipo', 'Duración estimada (minutos)', 'Resumen']]
  ])('las etiquetas de los campos salen en %s', async (language, labels) => {
    renderPage(noLessonsDetail.id, 'u-vacia-1', [{ path: detailPath(noLessonsDetail.id), body: noLessonsDetail }], language)

    await screen.findByText(labels[0]!)
    for (const label of labels) expect(screen.getByText(label)).toBeInTheDocument()
  })
})
