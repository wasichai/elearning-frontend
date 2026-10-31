import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ImportPage } from './ImportPage'
import { studioModule } from './module'
import { problem } from './test/fixtures'
import {
  ANY_SHA,
  courseRecords,
  doneJob,
  failedJob,
  IMPORT_JOB_ID,
  IMPORTED_VERSION_ID,
  importReport,
  importSources,
  pendingJob,
  PINNED_SHA,
  runningJob,
  SOURCE
} from './test/importFixtures'

// importar un manual a un borrador (ADR-0018 §5): orígenes permitidos, formulario, sondeo del trabajo e informe

const SOURCES = '/lms/studio/import/sources'
const IMPORT = '/lms/studio/import'
const JOB = `/lms/studio/import/${IMPORT_JOB_ID}`
const COURSES = '/objects/curso/records'
const COURSE_ID = courseRecords.content[0]!.id

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderImport(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<ImportPage pollInterval={20} />, { modules: [studioModule()], route: '/estudio/importar', language })
}

// el trabajo avanza una vez por consulta y se queda en el último estado, como en el servidor
function jobRoute(...states: unknown[]): MockRoute {
  const queue = [...states]
  return {
    path: JOB,
    get body() {
      return queue.length > 1 ? queue.shift() : queue[0]
    }
  }
}

const baseRoutes = (...more: MockRoute[]): MockRoute[] => [...more, { path: SOURCES, body: importSources }, { path: COURSES, body: courseRecords }]

const calls = (method: string, path: string) => fetchMock.calls.filter((call) => call.method === method && call.path.split('?')[0] === path)

async function choose(user: UserEvent, label: string, option: string) {
  const box = screen.getByRole('combobox', { name: label })
  await waitFor(() => expect(box).toBeEnabled())
  box.focus()
  await user.keyboard('{Enter}')
  await user.click(await screen.findByRole('option', { name: option }))
}

async function fillForm(user: UserEvent, { sha = ANY_SHA, path = 'manual/maestro.adoc' } = {}) {
  await user.type(await screen.findByLabelText('Commit'), sha)
  await user.type(screen.getByLabelText('Ruta del maestro'), path)
  await choose(user, 'Curso', 'Introducción al SGSPE (SGSPE-101)')
}

describe('ImportPage: el formulario', () => {
  it('muestra los orígenes permitidos y, si el origen fija el commit, no deja cambiarlo', async () => {
    const user = userEvent.setup()
    renderImport(baseRoutes())

    expect(screen.getByRole('heading', { level: 1, name: 'Importar un manual' })).toBeInTheDocument()
    const sources = within(await screen.findByRole('region', { name: 'Orígenes permitidos' }))
    expect(sources.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'wasichai/manual-sgspecualquier commit',
      `wasichai/manual-srtmsolo el commit ${PINNED_SHA}`
    ])
    expect(screen.getByLabelText('Commit')).not.toHaveAttribute('readonly')
    expect(screen.getByRole('link', { name: '← Mis versiones' })).toHaveAttribute('href', '/estudio')

    await choose(user, 'Repositorio', 'wasichai/manual-srtm')
    expect(screen.getByLabelText('Commit')).toHaveValue(PINNED_SHA)
    expect(screen.getByLabelText('Commit')).toHaveAttribute('readonly')
    expect(screen.getByText('Este origen solo permite este commit.')).toBeInTheDocument()
    // los cursos salen de la API de registros, los que la persona puede leer
    await choose(user, 'Curso', 'Administración tributaria municipal (SRTM-201)')
    expect(calls('GET', COURSES)[0]?.path).toContain('size=200')
  })

  it('no encola nada con un commit incompleto, una ruta con «..» o sin curso', async () => {
    const user = userEvent.setup()
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }))

    await user.type(await screen.findByLabelText('Commit'), '4f2a9c1')
    await user.type(screen.getByLabelText('Ruta del maestro'), '../secreto.adoc')
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    expect(screen.getByText('Escribe el commit completo: 40 caracteres entre 0-9 y a-f.')).toBeInTheDocument()
    expect(screen.getByLabelText('Commit')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/^Escribe una ruta dentro del repositorio/)).toBeInTheDocument()
    expect(screen.getByText('Elige el curso al que irá el borrador.')).toBeInTheDocument()
    expect(calls('POST', IMPORT)).toHaveLength(0)
  })

  it('encola con la fuente completa, sigue el trabajo hasta HECHO y deja de consultar', async () => {
    const user = userEvent.setup()
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(pendingJob, runningJob, doneJob)))

    // un sha en mayúsculas se manda en minúsculas, como lo guarda el servidor
    await fillForm(user, { sha: ANY_SHA.toUpperCase() })
    expect(screen.getByText(`Se importará ${SOURCE}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Estado de la importación' })).toBeInTheDocument()
    expect(calls('POST', IMPORT)[0]?.body).toEqual({ source: SOURCE, courseId: COURSE_ID })
    expect(await screen.findByText('Importación terminada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir el borrador' })).toHaveAttribute('href', `/estudio/versiones/${IMPORTED_VERSION_ID}`)

    const polls = calls('GET', JOB).length
    expect(polls).toBeGreaterThanOrEqual(3)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(calls('GET', JOB)).toHaveLength(polls)

    // otro manual: vuelve el formulario
    await user.click(screen.getByRole('button', { name: 'Importar otro manual' }))
    expect(await screen.findByRole('button', { name: 'Importar como borrador' })).toBeInTheDocument()
  })

  it('al salir de la página deja de consultar', async () => {
    const user = userEvent.setup()
    const view = renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(pendingJob)))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))
    expect(await screen.findByText('En cola')).toBeInTheDocument()
    await waitFor(() => expect(calls('GET', JOB).length).toBeGreaterThanOrEqual(2))

    view.unmount()
    const polls = calls('GET', JOB).length
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(calls('GET', JOB)).toHaveLength(polls)
  })

  it.each([
    [
      400,
      'sha must be a full 40-character lower-case commit id',
      'El servidor rechazó la fuente o el curso: sha must be a full 40-character lower-case commit id'
    ],
    [403, 'Origen no permitido', 'El servidor no lo permitió: el repositorio o el commit no están entre los orígenes permitidos'],
    [404, 'Curso no encontrado', 'El curso elegido ya no existe. Elige otro.'],
    [500, 'fallo', 'No pudimos encolar la importación (error 500). Inténtalo de nuevo.']
  ])('un %i al encolar se explica y deja el formulario', async (status, detail, text) => {
    const user = userEvent.setup()
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status, body: problem(status, detail) }))

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByRole('button', { name: 'Importar como borrador' })).toBeEnabled()
    expect(calls('GET', JOB)).toHaveLength(0)
  })
})

describe('ImportPage: el resultado', () => {
  it('el informe agrupa los problemas por tipo, traducidos, con su archivo y su línea', async () => {
    const user = userEvent.setup()
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(doneJob)))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    const report = within(await screen.findByRole('region', { name: 'Informe' }))
    expect(report.getByText(`Fuente: ${SOURCE}`)).toBeInTheDocument()
    expect(report.getByText('Lecciones').nextSibling).toHaveTextContent('11')
    expect(report.getByText(/^3 problemas\./)).toBeInTheDocument()
    expect(report.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Inclusión que no existe (1)',
      'Imagen que no existe (2)'
    ])
    expect(report.getByText(`wasichai/manual-sgspe@${ANY_SHA}:manual/acceso.adoc, línea 12`)).toBeInTheDocument()
    expect(report.getByText(`wasichai/manual-sgspe@${ANY_SHA}:manual/pagos.adoc, el archivo entero`)).toBeInTheDocument()
    expect(report.getByText('img/portal.png')).toBeInTheDocument()
  })

  it('un informe recortado dice cuántos problemas hay en total; sin problemas, lo dice', async () => {
    const user = userEvent.setup()
    const truncated = { ...doneJob, report: { ...importReport, problemCount: 812 } }
    const first = renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(truncated)))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))
    expect(await screen.findByText(/^812 problemas\..*Se muestran 3 de 812\.$/)).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    const clean = { ...doneJob, report: { ...importReport, problemCount: 0, problems: [] } }
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(clean)))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))
    expect(await screen.findByText('Sin problemas: todo se resolvió.')).toBeInTheDocument()
  })

  it('si falla, explica el motivo y no ofrece borrador', async () => {
    const user = userEvent.setup()
    const transient = { ...runningJob, error: 'GitHub respondió 502' }
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, jobRoute(transient, transient, failedJob)))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    expect(await screen.findByText('Último fallo pasajero, se reintenta solo: GitHub respondió 502')).toBeInTheDocument()
    expect(await screen.findByText('La importación falló')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Motivo: manual/maestro.adoc does not exist at this commit')
    expect(screen.getByText(/^Suele pasar si el maestro no existe en ese commit/)).toBeInTheDocument()
    expect(screen.queryByText('Último fallo pasajero', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir el borrador' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar otro manual' })).toBeInTheDocument()
  })

  it('un trabajo ajeno (404) se explica', async () => {
    const user = userEvent.setup()
    renderImport(baseRoutes({ method: 'POST', path: IMPORT, status: 202, body: pendingJob }, { path: JOB, status: 404, body: problem(404, 'No encontrado') }))
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Importar como borrador' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta importación no está entre las tuyas')
  })
})

describe('ImportPage: sin orígenes o sin permiso', () => {
  it('sin permiso (403) explica qué hace falta y no muestra el formulario', async () => {
    renderImport([
      { path: SOURCES, status: 403, body: problem(403, 'Forbidden') },
      { path: COURSES, body: courseRecords }
    ])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No puedes importar manuales')
    expect(alert).toHaveTextContent('Importar exige poder crear versiones de curso, unidades y lecciones.')
    expect(screen.queryByRole('button', { name: 'Importar como borrador' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('sin orígenes permitidos lo dice y no muestra el formulario', async () => {
    renderImport([
      { path: SOURCES, body: [] },
      { path: COURSES, body: courseRecords }
    ])

    expect(await screen.findByText('No hay orígenes permitidos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar como borrador' })).not.toBeInTheDocument()
  })

  it('un error del servidor deja reintentar; un contrato roto no muestra datos a medias', async () => {
    const first = renderImport([{ path: SOURCES, status: 500, body: problem(500, 'fallo') }])
    expect(await screen.findByRole('alert')).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    renderImport([{ path: SOURCES, body: [{ repository: 'wasichai/manual', sha: '4f2a9c1' }] }])
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByLabelText('Commit')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderImport(baseRoutes(), 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'Import a manual' })).toBeInTheDocument()
    expect(await screen.findByText('any commit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import as a draft' })).toBeInTheDocument()
  })
})
