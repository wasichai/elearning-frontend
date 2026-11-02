import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CallerPermissions } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { reviewModule } from './module'
import { firstVersionDiff, problem, versionDetail, versionDiff, versionInReview } from './test/fixtures'
import { VersionReviewPage } from './VersionReviewPage'

// revisar una versión (ADR-0018): contenido con comentarios por sección, decisiones con motivo salvo aprobar, publicar

const VERSION = '/lms/review/versions/ver-sgspe-2'
const COMMENTS = `${VERSION}/comments`
const DECISION = `${VERSION}/decision`
const PUBLISH = `${VERSION}/publish`
const RESOLVE = '/lms/review/comments/com-1/resolve'
const DIFF = `${VERSION}/diff`
const REVIEWER: CallerPermissions = { admin: false, objects: { version_curso: ['READ', 'UPDATE', 'APROBAR'] } }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

// las pruebas que no miran las diferencias reciben unas cualesquiera
function renderVersion(routes: MockRoute[], options: { language?: string; permissions?: CallerPermissions } = {}) {
  fetchMock = mockFetch([...routes, { path: DIFF, body: versionDiff }])
  return renderWithProviders(
    <Routes>
      <Route path="/revision/:versionId" element={<VersionReviewPage />} />
    </Routes>,
    { modules: [reviewModule()], route: '/revision/ver-sgspe-2', language: options.language, permissions: options.permissions ?? REVIEWER }
  )
}

const posts = (path: string) => fetchMock.calls.filter((call) => call.method === 'POST' && call.path === path)
const gets = () => fetchMock.calls.filter((call) => call.method === 'GET' && call.path === VERSION)

describe('VersionReviewPage: las diferencias con la versión anterior', () => {
  it('muestra lo añadido, lo quitado y lo cambiado respecto de la versión 1, con sus campos', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByText('Comparada con la versión 1.')).toBeInTheDocument()
    expect(diff.getByText('Lección 1.1. Qué es el SGSPE').closest('li')).toHaveTextContent('CambiadaLección 1.1. Qué es el SGSPECambió: recursos y resumen')
    expect(diff.getByText('Lección 1.2. Evaluación de la unidad').closest('li')).toHaveTextContent(/^Añadida/)
    // lo quitado se nombra por su título de antes
    expect(diff.getByText('Unidad 2. Anexos').closest('li')).toHaveTextContent(/^QuitadaUnidad 2\. AnexosQuitadaLección 2\.1\. Glosario$/)
    // el contenido sigue siendo el de esta versión, con sus comentarios
    expect(screen.getByRole('region', { name: 'Unidad 1. El sistema y sus actores' })).toBeInTheDocument()
    expect(fetchMock.calls.filter((call) => call.method === 'GET' && call.path === DIFF)).toHaveLength(1)
  })

  it('la primera versión de un curso dice que todo es nuevo', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { path: DIFF, body: firstVersionDiff }
    ])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByText(/no hay una versión anterior con la que compararla/)).toBeInTheDocument()
  })

  it('una respuesta que no cumple el contrato se explica ahí, sin tapar la revisión', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { path: DIFF, body: { baseVersion: 1, units: [{ order: 1, change: 'MOVIDA' }] } }
    ])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByRole('alert')).toHaveTextContent('No pudimos cargar las diferencias con la versión anterior.')
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }], { language: 'en' })

    const diff = within(await screen.findByRole('region', { name: 'Changes' }))
    expect(await diff.findByText('Compared with version 1.')).toBeInTheDocument()
    expect(diff.getByText('Changed: resources and summary')).toBeInTheDocument()
    expect(diff.getByText('Lesson 1.2. Evaluación de la unidad')).toBeInTheDocument()
  })
})

describe('VersionReviewPage: revisar una versión', () => {
  it('muestra el contenido por unidades y lecciones, los comentarios de cada sección y el historial de decisiones', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    expect(screen.getByText('SGSPE-101 · versión 2')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('En revisión').closest('[data-state]')).toHaveAttribute('data-state', 'review')
    const trail = within(screen.getByRole('navigation', { name: 'Ruta' }))
    expect(trail.getByRole('link', { name: 'Bandeja de revisión' })).toHaveAttribute('href', '/revision')
    expect(trail.getByText('Versión 2')).toHaveAttribute('aria-current', 'page')
    const unit = within(screen.getByRole('region', { name: 'Unidad 1. El sistema y sus actores' }))
    expect(unit.getByRole('heading', { level: 3, name: 'Lección 1.1. Qué es el SGSPE' })).toBeInTheDocument()
    expect(unit.getByText('Lectura · 1 recurso')).toBeInTheDocument()
    expect(unit.getByText('Evaluación · 0 recursos · con evaluación')).toBeInTheDocument()
    const lessonComments = within(screen.getByRole('list', { name: 'Comentarios de Lección 1.1. Qué es el SGSPE' }))
    expect(lessonComments.getByText('Falta citar la ordenanza.')).toBeInTheDocument()
    expect(lessonComments.getByRole('button', { name: 'Marcar como resuelto' })).toBeInTheDocument()
    expect(lessonComments.getByText('Abierto').closest('[data-state]')).toHaveAttribute('data-state', 'warning')
    // lo resuelto, plegado con su contador; se despliega
    expect(screen.queryByRole('list', { name: 'Comentarios de La versión completa' })).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Comentarios de La versión completa: 1 resuelto' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const general = within(screen.getByRole('list', { name: 'Comentarios de La versión completa' }))
    expect(general.getByText('Revisar el título del curso.')).toBeInTheDocument()
    expect(general.getByText('Resuelto')).toBeInTheDocument()
    // y se vuelve a plegar lo abierto
    const lessonToggle = screen.getByRole('button', { name: 'Comentarios de Lección 1.1. Qué es el SGSPE: 1 abierto' })
    expect(lessonToggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(lessonToggle)
    expect(screen.queryByText('Falta citar la ordenanza.')).not.toBeInTheDocument()
    const history = within(screen.getByRole('region', { name: 'Historial de decisiones' }))
    expect(history.getByText('Cambios pedidos')).toBeInTheDocument()
    expect(history.getByText('Faltan las referencias normativas.')).toBeInTheDocument()
  })

  it('el panel dice qué se revisa, qué falta y qué pasa con cada decisión, con una sola primaria', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    const panel = within(await screen.findByRole('region', { name: 'Tu decisión' }))
    expect(screen.getByText('Revisas la versión 2 de Introducción al SGSPE.')).toBeInTheDocument()
    expect(panel.getByText('Falta tu decisión')).toBeInTheDocument()
    expect(screen.getByText('1 comentario abierto')).toBeInTheDocument()
    expect(panel.getByText(/^Queda lista para publicar/)).toBeInTheDocument()
    expect(panel.getByText(/^Vuelve a quien la escribió como borrador/)).toBeInTheDocument()
    expect(panel.getByText(/^Queda retirada y no se podrá publicar/)).toBeInTheDocument()
    expect(panel.getByRole('button', { name: 'Aprobar' })).toHaveAttribute('data-variant', 'primary')
    expect(panel.getByRole('button', { name: 'Pedir cambios' })).toHaveAttribute('data-variant', 'secondary')
    expect(panel.getByRole('button', { name: 'Rechazar' })).toHaveAttribute('data-variant', 'secondary')
    // la línea de estados, derivada del estado; las decisiones, la más reciente primero
    const steps = within(screen.getByRole('list', { name: 'Recorrido de la versión' })).getAllByRole('listitem')
    expect(steps[2]).toHaveAttribute('aria-current', 'step')
    expect(steps[2]).toHaveTextContent(/^En revisiónActualizada el 20 oct 2026$/)
    expect(steps[3]).toHaveTextContent('hecho')
    expect(steps[0]).toHaveTextContent('pendiente')
  })

  it('en cada sección, lo abierto va antes que lo resuelto', async () => {
    const comments = [
      { ...versionDetail.comments[1]!, id: 'r', text: 'Ya resuelto.' },
      { ...versionDetail.comments[1]!, id: 'a', text: 'Aún abierto.', resolved: false }
    ]
    renderVersion([{ path: VERSION, body: { ...versionDetail, comments, openComments: 1 } }])

    const list = await screen.findByRole('list', { name: 'Comentarios de La versión completa' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([expect.stringMatching(/^Aún abierto\./), expect.stringMatching(/^Ya resuelto\./)])
  })

  it('aprobar con comentarios abiertos lo avisa antes de confirmar', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    expect(await screen.findByRole('dialog', { name: '¿Aprobar esta versión?' })).toHaveTextContent('Queda 1 comentario abierto.')
  })

  it('el motivo dice quién lo leerá; rechazar no envía nada de un clic ni al cancelar', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }])

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Rechazar esta versión?' }))
    expect(posts(DECISION)).toEqual([])
    expect(dialog.getByRole('textbox', { name: 'Motivo (lo leerá quien escribió la versión)' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Rechazar' })).toHaveAttribute('data-variant', 'danger')
    await userEvent.type(dialog.getByRole('textbox'), 'No procede.')
    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posts(DECISION)).toEqual([])
  })

  it('un motivo rechazado por el servidor se explica sin perder lo escrito', async () => {
    renderVersion([
      { path: VERSION, body: versionDetail },
      { method: 'POST', path: DECISION, status: 409, body: problem(409, 'Solo se decide una versión en revisión') }
    ])

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir cambios' }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.type(dialog.getByRole('textbox'), 'Faltan fuentes.')
    await userEvent.click(dialog.getByRole('button', { name: 'Pedir cambios' }))
    expect(await dialog.findByRole('alert')).toHaveTextContent('El servidor no lo aceptó: Solo se decide una versión en revisión')
    expect(dialog.getByRole('textbox')).toHaveValue('Faltan fuentes.')
  })

  it('un comentario sin enviar avisa: en el panel, al cancelar y al salir por un enlace', async () => {
    const user = userEvent.setup()
    fetchMock = mockFetch([
      { path: VERSION, body: versionDetail },
      { path: DIFF, body: versionDiff }
    ])
    renderWithProviders(
      <>
        <Link to="/otra">Menú</Link>
        <Routes>
          <Route path="/revision/:versionId" element={<VersionReviewPage />} />
          <Route path="/otra" element={<p>Otra pantalla</p>} />
        </Routes>
      </>,
      { modules: [reviewModule()], route: '/revision/ver-sgspe-2', permissions: REVIEWER }
    )

    await user.click(await screen.findByRole('button', { name: 'Comentar La versión completa' }))
    const form = within(screen.getByRole('form'))
    // el formulario abierto y vacío no retiene a nadie
    expect(screen.queryByText(/sin enviar/)).not.toBeInTheDocument()
    await user.type(form.getByRole('textbox'), 'A medias')
    expect(screen.getByText('Tienes un comentario sin enviar: si decides ahora, se perderá.')).toBeInTheDocument()

    await user.click(form.getByRole('button', { name: 'Cancelar' }))
    await user.click(within(await screen.findByRole('dialog', { name: '¿Descartar el comentario?' })).getByRole('button', { name: 'Seguir escribiendo' }))
    expect(screen.getByRole('textbox')).toHaveValue('A medias')

    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)

    await user.click(screen.getByRole('link', { name: 'Menú' }))
    const leaving = within(await screen.findByRole('dialog', { name: '¿Salir sin enviar el comentario?' }))
    expect(screen.queryByText('Otra pantalla')).not.toBeInTheDocument()
    await user.click(leaving.getByRole('button', { name: 'Seguir escribiendo' }))
    expect(screen.getByRole('textbox')).toHaveValue('A medias')

    await user.click(screen.getByRole('link', { name: 'Menú' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salir sin enviar' }))
    expect(await screen.findByText('Otra pantalla')).toBeInTheDocument()
    const later = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(later)
    expect(later.defaultPrevented).toBe(false)
  })

  it('sin texto se sale y se cancela sin preguntar', async () => {
    const user = userEvent.setup()
    fetchMock = mockFetch([
      { path: VERSION, body: versionDetail },
      { path: DIFF, body: versionDiff }
    ])
    renderWithProviders(
      <>
        <Link to="/otra">Menú</Link>
        <Routes>
          <Route path="/revision/:versionId" element={<VersionReviewPage />} />
          <Route path="/otra" element={<p>Otra pantalla</p>} />
        </Routes>
      </>,
      { modules: [reviewModule()], route: '/revision/ver-sgspe-2', permissions: REVIEWER }
    )

    await user.click(await screen.findByRole('button', { name: 'Comentar La versión completa' }))
    await user.click(within(screen.getByRole('form')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Menú' }))
    expect(await screen.findByText('Otra pantalla')).toBeInTheDocument()
  })

  it('un comentario de una sección que ya no está va aparte, sin el nombre técnico', async () => {
    const orphan = { ...versionDetail.comments[0]!, id: 'com-9', section: 'unidad:9/leccion:9', text: 'Esta lección sobraba.' }
    renderVersion([{ path: VERSION, body: { ...versionDetail, comments: [orphan] } }])

    expect(await screen.findByRole('list', { name: 'Otros comentarios' })).toHaveTextContent('Esta lección sobraba.')
    expect(screen.queryByText(/unidad:9/)).not.toBeInTheDocument()
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
    expect(screen.getByText(/^Falta publicarla: lo hace quien tiene el permiso de publicar/)).toBeInTheDocument()
  })

  it('publicar va por el permiso PUBLICAR, nunca por el rol, y solo sobre una aprobada', async () => {
    const approved = { ...versionDetail, status: 'APROBADA', comments: [], openComments: 0 }
    const asRole = (roles: string[], objects: CallerPermissions['objects'], body: unknown) => {
      fetchMock = mockFetch([
        { path: VERSION, body },
        { path: DIFF, body: versionDiff }
      ])
      return renderWithProviders(
        <Routes>
          <Route path="/revision/:versionId" element={<VersionReviewPage />} />
        </Routes>,
        {
          modules: [reviewModule()],
          route: '/revision/ver-sgspe-2',
          user: { id: 'u', email: 'u@demo.local', displayName: 'U', organizationId: 'o', roles },
          permissions: { admin: false, objects }
        }
      )
    }

    // un rol que se llama publicador, sin el permiso: nada
    const named = asRole(['PUBLICADOR', 'ADMIN'], { version_curso: ['READ', 'APROBAR'] }, approved)
    expect(await screen.findByText(/Esta versión ya no está en revisión/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar la versión' })).not.toBeInTheDocument()
    named.unmount()
    fetchMock.restore()

    // con el permiso, sea cual sea el rol
    const allowed = asRole(['ESTUDIANTE'], { version_curso: ['READ', 'PUBLICAR'] }, approved)
    expect(await screen.findByRole('button', { name: 'Publicar la versión' })).toHaveAttribute('data-variant', 'primary')
    allowed.unmount()
    fetchMock.restore()

    // con el permiso, pero en revisión: aún no
    asRole(['ESTUDIANTE'], { version_curso: ['READ', 'APROBAR', 'PUBLICAR'] }, versionDetail)
    expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar la versión' })).not.toBeInTheDocument()
  })

  it('un estado cerrado no ofrece decidir ni pinta un recorrido que no se sabe si hizo', async () => {
    renderVersion([{ path: VERSION, body: { ...versionDetail, status: 'RETIRADA' } }])

    expect(await screen.findByRole('region', { name: 'Estado: Retirada' })).toBeInTheDocument()
    expect(screen.getByText('Estás viendo la versión 2 de Introducción al SGSPE.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Recorrido de la versión' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Comentar / })).not.toBeInTheDocument()
  })

  it('una versión ajena (404) se explica y deja volver a la bandeja', async () => {
    renderVersion([{ path: VERSION, status: 404, body: problem(404, 'Versión no encontrada') }])

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta versión no está a tu cargo')
    expect(within(screen.getByRole('navigation', { name: 'Ruta' })).getByRole('link', { name: 'Bandeja de revisión' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderVersion([{ path: VERSION, body: versionDetail }], { language: 'en' })

    expect(await screen.findByText('SGSPE-101 · version 2')).toBeInTheDocument()
    expect(screen.getByText('Reading · 1 resource')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Decision history' })).toBeInTheDocument()
  })
})
