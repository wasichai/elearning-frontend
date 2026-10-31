import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CallerPermissions } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { reviewModule } from './module'
import { problem, versionDetail, versionInReview } from './test/fixtures'
import { VersionReviewPage } from './VersionReviewPage'

// revisar una versión (ADR-0018): contenido con comentarios por sección, decisiones con motivo salvo aprobar, publicar

const VERSION = '/lms/review/versions/ver-sgspe-2'
const COMMENTS = `${VERSION}/comments`
const DECISION = `${VERSION}/decision`
const PUBLISH = `${VERSION}/publish`
const RESOLVE = '/lms/review/comments/com-1/resolve'
const REVIEWER: CallerPermissions = { admin: false, objects: { version_curso: ['READ', 'UPDATE', 'APROBAR'] } }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderVersion(routes: MockRoute[], options: { language?: string; permissions?: CallerPermissions } = {}) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/revision/:versionId" element={<VersionReviewPage />} />
    </Routes>,
    { modules: [reviewModule()], route: '/revision/ver-sgspe-2', language: options.language, permissions: options.permissions ?? REVIEWER }
  )
}

const posts = (path: string) => fetchMock.calls.filter((call) => call.method === 'POST' && call.path === path)
const gets = () => fetchMock.calls.filter((call) => call.method === 'GET' && call.path === VERSION)

describe('VersionReviewPage: revisar una versión', () => {
  it('muestra el contenido por unidades y lecciones, los comentarios de cada sección y el historial de decisiones', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    expect(screen.getByText('SGSPE-101 · versión 2')).toBeInTheDocument()
    expect(screen.getByText('En revisión')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Bandeja de revisión' })).toHaveAttribute('href', '/revision')
    const unit = within(screen.getByRole('region', { name: 'Unidad 1. El sistema y sus actores' }))
    expect(unit.getByRole('heading', { level: 3, name: 'Lección 1.1. Qué es el SGSPE' })).toBeInTheDocument()
    expect(unit.getByText('Lectura · 1 recurso')).toBeInTheDocument()
    expect(unit.getByText('Evaluación · 0 recursos · con evaluación')).toBeInTheDocument()
    const lessonComments = within(screen.getByRole('list', { name: 'Comentarios de Lección 1.1. Qué es el SGSPE' }))
    expect(lessonComments.getByText('Falta citar la ordenanza.')).toBeInTheDocument()
    expect(lessonComments.getByRole('button', { name: 'Marcar como resuelto' })).toBeInTheDocument()
    const general = within(screen.getByRole('list', { name: 'Comentarios de La versión completa' }))
    expect(general.getByText('Revisar el título del curso.')).toBeInTheDocument()
    expect(general.getByText('Resuelto')).toBeInTheDocument()
    const history = within(screen.getByRole('region', { name: 'Historial de decisiones' }))
    expect(history.getByText('Cambios pedidos')).toBeInTheDocument()
    expect(history.getByText('Faltan las referencias normativas.')).toBeInTheDocument()
  })

  it('un comentario va con la sección de la lección; vacío no se envía', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      {
        method: 'POST',
        path: COMMENTS,
        status: 201,
        body: { ...versionDetail.comments[0]!, id: 'com-2', section: 'unidad:1/leccion:2', text: 'Añade una pregunta.' }
      }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Comentar Lección 1.2. Evaluación de la unidad' }))
    const form = within(screen.getByRole('form', { name: 'Nuevo comentario sobre Lección 1.2. Evaluación de la unidad' }))
    await userEvent.click(form.getByRole('button', { name: 'Enviar comentario' }))
    expect(form.getByRole('alert')).toHaveTextContent('Escribe el comentario.')
    expect(posts(COMMENTS)).toEqual([])

    await userEvent.type(form.getByRole('textbox', { name: 'Comentario' }), '  Añade una pregunta.  ')
    await userEvent.click(form.getByRole('button', { name: 'Enviar comentario' }))

    await waitFor(() => expect(posts(COMMENTS)).toHaveLength(1))
    expect(posts(COMMENTS)[0]?.body).toEqual({ section: 'unidad:1/leccion:2', text: 'Añade una pregunta.' })
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
    await waitFor(() => expect(gets().length).toBeGreaterThan(1))
  })

  it('un comentario rechazado (409: la versión ya no está en revisión) se explica y el formulario queda', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: COMMENTS, status: 409, body: problem(409, 'Solo se comenta una versión en revisión') }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Comentar La versión completa' }))
    const form = within(screen.getByRole('form'))
    await userEvent.type(form.getByRole('textbox'), 'Revisa la portada.')
    await userEvent.click(form.getByRole('button', { name: 'Enviar comentario' }))

    expect(await form.findByRole('alert')).toHaveTextContent('El servidor no lo aceptó: Solo se comenta una versión en revisión')
  })

  it('marcar un comentario como resuelto', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: RESOLVE, body: { ...versionDetail.comments[0]!, resolved: true } }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como resuelto' }))

    await waitFor(() => expect(posts(RESOLVE)).toHaveLength(1))
    await waitFor(() => expect(gets().length).toBeGreaterThan(1))
  })

  it('aprobar se confirma y no lleva motivo', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: DECISION, body: { ...versionInReview, status: 'APROBADA' } }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Aprobar esta versión?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(posts(DECISION)).toHaveLength(1))
    expect(posts(DECISION)[0]?.body).toEqual({ decision: 'APROBAR', reason: null })
    expect(await screen.findByText('Versión aprobada. Estado: Aprobada.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each([
    ['Pedir cambios', '¿Pedir cambios?', 'PEDIR_CAMBIOS', 'BORRADOR', 'Cambios pedidos. Estado: Borrador.'],
    ['Rechazar', '¿Rechazar esta versión?', 'RECHAZAR', 'RETIRADA', 'Versión rechazada. Estado: Retirada.']
  ])('%s exige motivo: sin él no se envía, y con él viaja', async (button, title, decision, status, notice) => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: DECISION, body: { ...versionInReview, status } }
    ])

    await userEvent.click(await screen.findByRole('button', { name: button }))
    const dialog = within(await screen.findByRole('dialog', { name: title }))
    await userEvent.click(dialog.getByRole('button', { name: button }))
    expect(dialog.getByRole('alert')).toBeInTheDocument()
    expect(posts(DECISION)).toEqual([])

    await userEvent.type(dialog.getByRole('textbox'), 'Faltan las fuentes.')
    await userEvent.click(dialog.getByRole('button', { name: button }))

    await waitFor(() => expect(posts(DECISION)).toHaveLength(1))
    expect(posts(DECISION)[0]?.body).toEqual({ decision, reason: 'Faltan las fuentes.' })
    expect(await screen.findByText(notice)).toBeInTheDocument()
  })

  it('una decisión que el servidor niega (403) se explica en el diálogo', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: DECISION, status: 403, body: problem(403, 'Nadie revisa su propia versión') }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: 'Aprobar' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('No tienes permiso para hacerlo.')
  })

  it('una versión aprobada se publica con PUBLICAR; sin ese permiso no se ofrece', async () => {
    const approved = { ...versionDetail, status: 'APROBADA', comments: [], openComments: 0 }
    const first = renderVersion(
      [
        { path: VERSION, body: approved },
        { method: 'POST', path: PUBLISH, body: { ...versionInReview, status: 'PUBLICADA' } }
      ],
      { permissions: { admin: false, objects: { version_curso: ['READ', 'APROBAR', 'PUBLICAR'] } } }
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar la versión' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Publicar esta versión?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Publicar la versión' }))
    await waitFor(() => expect(posts(PUBLISH)).toHaveLength(1))
    expect(await screen.findByText('Versión publicada.')).toBeInTheDocument()
    // aprobada ya no admite decisiones ni comentarios
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Comentar/ })).not.toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    renderVersion([{ path: VERSION, body: approved }])
    expect(await screen.findByText(/Esta versión ya no está en revisión/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar la versión' })).not.toBeInTheDocument()
  })

  it('una versión ajena (404) se explica y deja volver a la bandeja', async () => {
    renderVersion([{ path: VERSION, status: 404, body: problem(404, 'Versión no encontrada') }])

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta versión no está a tu cargo')
    expect(screen.getByRole('link', { name: '← Bandeja de revisión' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }], { language: 'en' })

    expect(await screen.findByText('SGSPE-101 · version 2')).toBeInTheDocument()
    expect(screen.getByText('Reading · 1 resource')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Decision history' })).toBeInTheDocument()
  })
})
