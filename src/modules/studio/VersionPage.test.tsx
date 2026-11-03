import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { studioModule } from './module'
import {
  createdVersion,
  draftDetail,
  draftDiff,
  draftVersion,
  firstDraftDetail,
  noLessonsDetail,
  problem,
  publishedDetail,
  publishedDiff,
  publishedVersion
} from './test/fixtures'
import { VersionPage } from './VersionPage'

// una versión propia (ADR-0018): su temario, editarla en Wasichai si es borrador, enviarla a revisión, ver comentarios y
// decisiones, y crear una versión nueva a partir de ella

const detailPath = (id: string) => `/lms/studio/versions/${id}`
const SUBMIT = `${detailPath(draftVersion.id)}/submit`
const NEW_VERSION = `/lms/studio/courses/${publishedVersion.course.id}/versions`
const diffPath = (id: string) => `${detailPath(id)}/diff`
// las pruebas que no miran las diferencias reciben unas cualesquiera
const ANY_DIFF: MockRoute = { path: /\/lms\/studio\/versions\/[^/]+\/diff$/, body: draftDiff }

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderVersion(id: string, routes: MockRoute[], language?: string) {
  fetchMock = mockFetch([...routes, ANY_DIFF])
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
    const trail = within(screen.getByRole('navigation', { name: 'Ruta' }))
    expect(trail.getByRole('link', { name: 'Mis versiones' })).toHaveAttribute('href', '/estudio')
    expect(trail.getByText('Versión 2')).toHaveAttribute('aria-current', 'page')
    expect(within(screen.getByRole('banner')).getByText('Borrador').closest('[data-state]')).toHaveAttribute('data-state', 'todo')
    expect(screen.queryByText('Solo lectura')).not.toBeInTheDocument()

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
    // la fuente técnica va plegada y se abre
    const source = syllabus.getByText('Fuente: wasichai/manual-sgspe@4f2a9c1:acceso.adoc#entrar')
    expect(source).not.toBeVisible()
    await userEvent.setup().click(syllabus.getByText('Fuente técnica'))
    expect(source).toBeVisible()

    expect(screen.getByText('El revisor no ha dejado comentarios.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay decisiones sobre esta versión.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear versión nueva' })).not.toBeInTheDocument()
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

  it('nunca envía sin haber comprobado antes que tiene lecciones: lo lee de nuevo al abrir el diálogo', async () => {
    const user = userEvent.setup()
    renderVersion(draftVersion.id, [{ path: detailPath(draftVersion.id), body: draftDetail }])

    const reads = () => fetchMock.calls.filter((call) => call.method === 'GET' && call.path === detailPath(draftVersion.id)).length
    await user.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
    await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Sí, enviar a revisión' })
    await waitFor(() => expect(reads()).toBeGreaterThan(1))
  })

  describe('el rechazo del servidor (409), que no se distingue por su código ni por su detail', () => {
    const rejected = (status: number): MockRoute => ({ method: 'POST', path: SUBMIT, status, body: problem(status, 'detail que no es contrato') })

    // la primera lectura es la de la pantalla y la del diálogo, con lecciones; lo que cambia es lo que se lee tras el rechazo
    async function confirmAndReject(routes: MockRoute[], reread: Partial<MockRoute>) {
      const user = userEvent.setup()
      const live = [...routes, ANY_DIFF]
      fetchMock = mockFetch(live)
      renderWithProviders(
        <Routes>
          <Route path="/estudio/versiones/:id" element={<VersionPage />} />
        </Routes>,
        { modules: [studioModule()], route: `/estudio/versiones/${draftVersion.id}` }
      )
      await user.click(await screen.findByRole('button', { name: 'Enviar a revisión' }))
      const confirm = await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Sí, enviar a revisión' })
      live[0] = { path: detailPath(draftVersion.id), ...reread }
      await user.click(confirm)
      return user
    }

    it('sin lecciones al releerla, dice que le faltan lecciones y lleva a añadirlas', async () => {
      await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(409)], { body: { ...draftDetail, units: [] } })

      const dialog = await screen.findByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('El servidor no aceptó el envío: la versión 2 no tiene lecciones.')
      expect(dialog).not.toHaveTextContent('detail que no es contrato')
      expect(within(dialog).getByRole('button', { name: 'Añadir la primera unidad' })).toBeInTheDocument()
      expect(screen.queryByText('Enviada a revisión.')).not.toBeInTheDocument()
    })

    it('con lecciones y aún en borrador, dice que el estado cambió, y deja reintentar', async () => {
      await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(409)], { body: draftDetail })

      const dialog = await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('El servidor no aceptó el envío: el estado de la versión cambió hace un momento.')
      expect(dialog).not.toHaveTextContent('lecciones')
      expect(within(dialog).getByRole('button', { name: 'Sí, enviar a revisión' })).toBeEnabled()
    })

    it('si ya está en revisión, lo dice en vez de cerrarse, y no da a entender que se envió desde aquí', async () => {
      await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(409)], { body: { ...draftDetail, status: 'EN_REVISION' } })

      const dialog = await screen.findByRole('dialog', { name: 'Esta versión ya no es un borrador' })
      expect(dialog).toHaveTextContent('Ahora está en estado «En revisión»')
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('el estado de la versión cambió hace un momento')
      expect(screen.queryByText('Enviada a revisión.')).not.toBeInTheDocument()
    })

    it('si no se puede releer, no afirma ninguna causa y no vuelve a enviar: reintenta la lectura', async () => {
      const user = await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(409)], {
        status: 500,
        body: problem(500, 'fallo')
      })

      const dialog = await screen.findByRole('dialog', { name: '¿Enviar a revisión?' })
      const alert = await within(dialog).findByRole('alert')
      expect(alert).toHaveTextContent('El servidor no aceptó el envío y no pudimos comprobar por qué.')
      expect(alert).not.toHaveTextContent('no tiene lecciones')
      expect(alert).not.toHaveTextContent('estado de la versión cambió')
      await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
      expect(await within(screen.getByRole('dialog')).findByText(/No pudimos comprobar si la versión tiene lecciones/)).toBeInTheDocument()
      expect(posts(SUBMIT)).toHaveLength(1)
    })

    it('un 403 sigue diciendo que no hay permiso, y no habla de lecciones', async () => {
      await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(403)], { body: draftDetail })

      const alert = await within(screen.getByRole('dialog')).findByRole('alert')
      expect(alert).toHaveTextContent('No tienes permiso para hacerlo.')
      expect(alert).not.toHaveTextContent('lecciones')
    })

    it('al cerrar, si el botón ya no está, el foco no se pierde: va a las acciones de la versión', async () => {
      const user = await confirmAndReject([{ path: detailPath(draftVersion.id), body: draftDetail }, rejected(409)], { body: { ...draftDetail, units: [] } })

      const dialog = await screen.findByRole('dialog', { name: 'Aún no se puede enviar a revisión' })
      await within(dialog).findByRole('alert')
      await user.click(within(dialog).getByRole('button', { name: 'Volver' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const edit = screen.getByRole('link', { name: 'Editar la versión' })
      await waitFor(() => expect(document.activeElement).toContainElement(edit))
    })
  })
})

describe('VersionPage: las diferencias con la versión anterior', () => {
  it('muestra lo añadido y lo cambiado respecto de la versión 1, con sus campos; lo igual, plegado', async () => {
    renderVersion(draftVersion.id, [
      { path: detailPath(draftVersion.id), body: draftDetail },
      { path: diffPath(draftVersion.id), body: draftDiff }
    ])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByText('Comparada con la versión 1.')).toBeInTheDocument()
    expect(diff.getByText('Lección 1.1. Entrar al portal').closest('li')).toHaveTextContent('Cambió: recursos')
    expect(diff.getByText('Lección 1.2. Recorrido por el portal').closest('li')).toHaveTextContent(/^Añadida/)
    expect(diff.getByText('Unidad 2. Liquidaciones').closest('li')).toHaveTextContent('Cambió: títuloAntes: LiquidaciónAhora: Liquidaciones')
    expect(diff.getByText('1 lección sin cambios')).toBeVisible()
    expect(diff.getByText('Lección 2.1. Evaluación final')).not.toBeVisible()
    expect(fetchMock.calls.filter((call) => call.path === diffPath(draftVersion.id))).toHaveLength(1)
  })

  it('la primera versión del curso dice que todo es nuevo', async () => {
    renderVersion(publishedVersion.id, [
      { path: detailPath(publishedVersion.id), body: publishedDetail },
      { path: diffPath(publishedVersion.id), body: publishedDiff }
    ])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByText(/Es la primera versión de este curso/)).toBeInTheDocument()
    expect(diff.queryByRole('list')).not.toBeInTheDocument()
  })

  it('si no se pueden cargar, lo dice ahí y el resto de la versión sigue a la vista', async () => {
    renderVersion(draftVersion.id, [
      { path: detailPath(draftVersion.id), body: draftDetail },
      { path: diffPath(draftVersion.id), status: 500, body: problem(500, 'fallo') }
    ])

    const diff = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await diff.findByRole('alert')).toHaveTextContent('No pudimos cargar las diferencias con la versión anterior.')
    expect(diff.getByRole('button', { name: 'Reintentar la comparación' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Contenido' })).toHaveTextContent('Unidad 1. Primeros pasos')
    expect(screen.getByRole('button', { name: 'Enviar a revisión' })).toBeInTheDocument()
  })
})

describe('VersionPage: una versión publicada', () => {
  it('no se edita; muestra los comentarios y las decisiones del revisor como texto', async () => {
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: publishedDetail }])

    expect(await screen.findByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeInTheDocument()
    expect(screen.getByText('Solo lectura').closest('[role]')).toHaveTextContent(/Está publicada y no cambia/)
    expect(screen.getByRole('button', { name: 'Crear versión nueva' })).toHaveAttribute('data-variant', 'primary')
    expect(screen.queryByRole('link', { name: 'Editar la versión' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Editar la (unidad|lección)/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument()

    // cada comentario, junto a su lección y con su estado, sin el nombre técnico de la sección
    const comments = within(screen.getByRole('region', { name: 'Comentarios de revisión' }))
    expect(comments.getByText('1 comentario por atender')).toBeInTheDocument()
    expect(screen.queryByText('unidad:1/leccion:1')).not.toBeInTheDocument()
    const syllabus = within(screen.getByRole('region', { name: 'Contenido' }))
    const first = syllabus.getByRole('list', { name: 'Comentarios de Entrar al portal' })
    expect(first).toHaveTextContent('El primer paso no dice qué navegador usar.')
    expect(within(first).getByText('Resuelto').closest('[data-state]')).toHaveAttribute('data-state', 'done')
    const second = syllabus.getByRole('list', { name: 'Comentarios de Evaluación final' })
    expect(second).toHaveTextContent('La evaluación pide algo que la unidad no enseña.')
    expect(within(second).getByText('Por atender').closest('[data-state]')).toHaveAttribute('data-state', 'warning')

    // la más reciente primero, como la línea de estados
    const decisions = within(screen.getByRole('region', { name: 'Decisiones del revisor' }))
    expect(decisions.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Aprobada/),
      expect.stringMatching(/^Pidió cambios.*Faltan ejemplos en la unidad 2\.$/)
    ])
  })

  it('la línea de estados dice qué pasó y qué falta, derivado del estado', async () => {
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: { ...publishedDetail, status: 'APROBADA' } }])

    const state = within(await screen.findByRole('region', { name: 'Estado: Aprobada' }))
    const steps = within(state.getByRole('list', { name: 'Recorrido de la versión' })).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringMatching(/^Publicada.*pendiente/),
      expect.stringMatching(/^Aprobada.*Actualizada el/),
      expect.stringMatching(/^En revisión.*hecho/),
      expect.stringMatching(/^Borrador.*hecho/)
    ])
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(steps.filter((step) => step.hasAttribute('aria-current'))).toHaveLength(1)
  })

  it('una retirada no pinta un recorrido que no se sabe si hizo', async () => {
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: { ...publishedDetail, status: 'RETIRADA' } }])

    const state = within(await screen.findByRole('region', { name: 'Estado: Retirada' }))
    expect(state.queryByRole('list', { name: 'Recorrido de la versión' })).not.toBeInTheDocument()
    expect(screen.getByText('Solo lectura')).toBeInTheDocument()
  })

  it('los comentarios de toda la versión y de una sección que ya no está van aparte, sin nombres técnicos', async () => {
    const extra = [
      { id: 'c-a', section: 'version', text: 'Revisa el enfoque general.', authorId: null, createdAt: null, resolved: false },
      { id: 'c-b', section: 'unidad:9/leccion:9', text: 'Esta lección sobraba.', authorId: null, createdAt: null, resolved: true },
      { id: 'c-c', section: 'unidad:1', text: 'La unidad es muy larga.', authorId: null, createdAt: null, resolved: false }
    ]
    renderVersion(publishedVersion.id, [{ path: detailPath(publishedVersion.id), body: { ...publishedDetail, comments: extra } }])

    const comments = within(await screen.findByRole('region', { name: 'Comentarios de revisión' }))
    expect(comments.getByText('2 comentarios por atender')).toBeInTheDocument()
    expect(comments.getByRole('list', { name: 'Comentarios de toda la versión' })).toHaveTextContent('Revisa el enfoque general.')
    expect(comments.getByRole('list', { name: 'Comentarios de secciones que ya no están' })).toHaveTextContent('Esta lección sobraba.')
    expect(screen.queryByText(/unidad:9/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Contenido' })).getByRole('list', { name: 'Comentarios de Primeros pasos' })).toHaveTextContent(
      'La unidad es muy larga.'
    )
  })

  it('crea una versión nueva a partir de ella, tras confirmarlo, y la abre', async () => {
    const user = userEvent.setup()
    renderVersion(publishedVersion.id, [
      { path: detailPath(publishedVersion.id), body: publishedDetail },
      { method: 'POST', path: NEW_VERSION, status: 201, body: createdVersion },
      { path: detailPath(createdVersion.id), body: { ...draftDetail, ...createdVersion } }
    ])

    await user.click(await screen.findByRole('button', { name: 'Crear versión nueva' }))
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

    await user.click(await screen.findByRole('button', { name: 'Crear versión nueva' }))
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
    renderVersion(
      publishedVersion.id,
      [
        { path: detailPath(publishedVersion.id), body: publishedDetail },
        { path: diffPath(publishedVersion.id), body: publishedDiff }
      ],
      'en'
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Status: Published' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create new version' })).toBeInTheDocument()
    expect(screen.getByText('Requested changes')).toBeInTheDocument()
    expect(screen.getByText('Reading · 1 resource')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Changes' })).findByText(/This is the first version of this course/)).toBeInTheDocument()
  })

  describe('un borrador sin lecciones', () => {
    const renderDetail = (detail: { id: string }, language?: string) =>
      renderVersion(
        detail.id,
        [
          { path: detailPath(detail.id), body: detail },
          { path: diffPath(detail.id), body: { baseVersion: null, units: [] } }
        ],
        language
      )

    it('sin unidades, no ofrece enviar: dice qué falta y la única primaria es añadir la primera unidad', async () => {
      renderDetail(firstDraftDetail)

      const add = await screen.findByRole('link', { name: 'Añadir la primera unidad' })
      expect(add).toHaveAttribute('href', `/estudio/versiones/${firstDraftDetail.id}/unidades/nueva`)
      expect(add).toHaveAttribute('data-variant', 'primary')
      expect(screen.getByText('Aún no se puede enviar a revisión').closest('[role="status"]')).toHaveTextContent('no tiene lecciones')
      expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument()
      expect(screen.queryByText(/cuando esté lista/)).not.toBeInTheDocument()
      expect(screen.getByText(/modalidad asíncrona/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Editar la versión' })).toHaveAttribute('data-variant', 'secondary')
      expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    })

    it('con unidades sin lecciones, lleva a añadir la primera lección a la primera unidad, y cada unidad ofrece la suya', async () => {
      renderDetail(noLessonsDetail)

      const add = await screen.findByRole('link', { name: 'Añadir la primera lección' })
      expect(add).toHaveAttribute('href', `/estudio/versiones/${noLessonsDetail.id}/unidades/u-vacia-1/lecciones/nueva`)
      expect(add).toHaveAttribute('data-variant', 'primary')
      expect(screen.getByText(/Sus unidades aún no tienen lecciones/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Añadir una lección a «Pagos»' })).toHaveAttribute(
        'href',
        `/estudio/versiones/${noLessonsDetail.id}/unidades/u-vacia-2/lecciones/nueva`
      )
      expect(screen.queryByRole('button', { name: 'Enviar a revisión' })).not.toBeInTheDocument()
      expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    })

    it('con una sola lección en cualquier unidad, ya se puede enviar', async () => {
      const [lesson] = draftDetail.units[0]!.lessons
      const detail = { ...noLessonsDetail, units: [noLessonsDetail.units[0]!, { ...noLessonsDetail.units[1]!, lessons: [lesson!] }] }
      renderDetail(detail)

      expect(await screen.findByRole('button', { name: 'Enviar a revisión' })).toHaveAttribute('data-variant', 'primary')
      expect(screen.queryByText('Aún no se puede enviar a revisión')).not.toBeInTheDocument()
    })

    it('en inglés', async () => {
      renderDetail(noLessonsDetail, 'en')

      expect(await screen.findByRole('link', { name: 'Add the first lesson' })).toBeInTheDocument()
      expect(screen.getByText('It cannot be sent for review yet')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Send for review' })).not.toBeInTheDocument()
    })

    it('con unidades, enviar sigue siendo la primera acción y añadir otra es secundaria', async () => {
      fetchMock = mockFetch([{ path: detailPath(draftDetail.id), body: draftDetail }, ANY_DIFF])
      renderWithProviders(
        <Routes>
          <Route path="/estudio/versiones/:id" element={<VersionPage />} />
        </Routes>,
        { modules: [studioModule()], route: `/estudio/versiones/${draftDetail.id}` }
      )

      expect(await screen.findByRole('button', { name: 'Enviar a revisión' })).toHaveAttribute('data-variant', 'primary')
      expect(screen.getByRole('link', { name: 'Añadir una unidad' })).toHaveAttribute('data-variant', 'secondary')
    })

    it('una versión que no es borrador no ofrece añadir unidades', async () => {
      fetchMock = mockFetch([{ path: detailPath(publishedDetail.id), body: publishedDetail }, ANY_DIFF])
      renderWithProviders(
        <Routes>
          <Route path="/estudio/versiones/:id" element={<VersionPage />} />
        </Routes>,
        { modules: [studioModule()], route: `/estudio/versiones/${publishedDetail.id}` }
      )

      expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /^Añadir/ })).not.toBeInTheDocument()
    })
  })
})
