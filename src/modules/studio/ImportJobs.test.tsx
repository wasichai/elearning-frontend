import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ImportPage } from './ImportPage'
import { studioModule } from './module'
import { problem } from './test/fixtures'
import { ANY_SHA, courseRecords, doneJob, failedJob, IMPORT_JOB_ID, IMPORTED_VERSION_ID, importSources, pendingJob, runningJob } from './test/importFixtures'

// los trabajos de importación de quien entra (GET /studio/import): retomar una importación al volver a la pantalla

const SOURCES = '/lms/studio/import/sources'
const IMPORT = '/lms/studio/import'
const JOB = `/lms/studio/import/${IMPORT_JOB_ID}`
const COURSES = '/objects/curso/records'
const COURSE_TITLE = 'Introducción al SGSPE'

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderImport(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<ImportPage pollInterval={20} />, { modules: [studioModule()], route: '/estudio/importar', language })
}

const page = (jobs: unknown, ...more: MockRoute[]): MockRoute[] => [
  ...more,
  { path: IMPORT, body: jobs },
  { path: SOURCES, body: importSources },
  { path: COURSES, body: courseRecords }
]

// la respuesta avanza una vez por consulta y se queda en la última
function advancing(path: string, ...replies: { status?: number; body: unknown }[]): MockRoute {
  const queue = [...replies]
  let reply = queue[0]!
  return {
    path,
    get status() {
      return reply.status ?? 200
    },
    get body() {
      reply = queue.length > 1 ? queue.shift()! : queue[0]!
      return reply.body
    }
  }
}

const calls = (method: string, path: string) => fetchMock.calls.filter((call) => call.method === method && call.path.split('?')[0] === path)
const block = () => screen.findByRole('region', { name: 'Tus importaciones' })
const form = () => screen.findByRole('button', { name: 'Importar como borrador' })

const finished = (index: number) => ({ ...doneJob, id: `job-${index}`, versionId: `version-${index}` })

describe('ImportPage: mis importaciones', () => {
  it('quien vuelve ve su importación en curso antes del formulario y la retoma, sin encolar otra', async () => {
    const user = userEvent.setup()
    renderImport(page([runningJob], { path: JOB, body: runningJob }))

    const list = within(await block())
    const row = (await list.findAllByRole('listitem'))[0]!
    expect(row).toHaveTextContent('Importando')
    expect(row).toHaveTextContent(`wasichai/manual-sgspe:manual/maestro.adoc`)
    expect(row).toHaveTextContent('Pedida el 2 nov 2026')
    // el curso, por su nombre; el estado, con palabra e icono
    expect(await within(row).findByText(COURSE_TITLE)).toBeInTheDocument()
    expect(within(row).getByText('Importando').closest('[data-state]')).toHaveAttribute('data-state', 'active')

    // la lista va antes de la acción primaria, que sigue siendo la única
    const submit = await form()
    expect(row.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(submit).toHaveAttribute('data-variant', 'primary')

    await user.click(within(row).getByRole('button', { name: `Seguir la importación: ${COURSE_TITLE}` }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Estado de la importación' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Importando')
    expect(calls('POST', IMPORT)).toHaveLength(0)
    // dice la verdad: salir no pierde el trabajo
    expect(screen.getByText(/podrás retomarlo desde esta pantalla/)).toBeInTheDocument()
    await waitFor(() => expect(calls('GET', JOB).length).toBeGreaterThanOrEqual(2))
  })

  it('el foco acompaña al abrir un trabajo, y volver conserva lo escrito en el formulario', async () => {
    const user = userEvent.setup()
    renderImport(page([doneJob], { path: JOB, body: doneJob }))

    await user.type(await screen.findByLabelText('Ruta del maestro'), 'a.adoc')
    await user.click(await within(await block()).findByRole('button', { name: /^Ver el informe/ }))

    expect(await screen.findByRole('region', { name: 'Informe' })).toBeInTheDocument()
    expect(document.activeElement).toContainElement(screen.getByRole('heading', { level: 2, name: 'Estado de la importación' }))
    // abierto desde la lista no ofrece empezar de cero, que borraría lo escrito
    expect(screen.queryByRole('button', { name: 'Importar otro manual' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver a tus importaciones' }))
    expect(await screen.findByLabelText('Ruta del maestro')).toHaveValue('a.adoc')
    expect(document.activeElement).toContainElement(screen.getByLabelText('Ruta del maestro'))
  })

  it('un trabajo terminado da su informe y su borrador; el fallido, su motivo', async () => {
    const user = userEvent.setup()
    const failed = { ...failedJob, id: 'job-failed', courseId: courseRecords.content[1]!.id }
    renderImport(page([doneJob, failed], { path: JOB, body: doneJob }, { path: `${IMPORT}/job-failed`, body: failed }))

    const list = within(await block())
    const [done, broken] = await list.findAllByRole('listitem')
    expect(done).toHaveTextContent('Terminada')
    expect(done).toHaveTextContent('Terminó el 2 nov 2026')
    expect(within(done!).getByText('Terminada').closest('[data-state]')).toHaveAttribute('data-state', 'done')
    expect(within(done!).getByRole('link', { name: /^Abrir el borrador/ })).toHaveAttribute('href', `/estudio/versiones/${IMPORTED_VERSION_ID}`)
    expect(broken).toHaveTextContent('Falló')
    expect(within(broken!).getByText('Falló').closest('[data-state]')).toHaveAttribute('data-state', 'overdue')
    expect(within(broken!).queryByRole('link', { name: /^Abrir el borrador/ })).not.toBeInTheDocument()

    await user.click(within(done!).getByRole('button', { name: /^Ver el informe/ }))
    expect(await screen.findByRole('region', { name: 'Informe' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver a tus importaciones' }))

    await user.click(await screen.findByRole('button', { name: /^Ver el motivo/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Motivo: manual/maestro.adoc does not exist at this commit')
  })

  it('reintentar un fallo abierto desde la lista rellena el formulario con lo que se pidió', async () => {
    const user = userEvent.setup()
    renderImport(page([failedJob], { path: JOB, body: failedJob }))

    await user.click(await screen.findByRole('button', { name: /^Ver el motivo/ }))
    await user.click(await screen.findByRole('button', { name: 'Revisar y reintentar' }))

    expect(await screen.findByLabelText('Commit')).toHaveValue(ANY_SHA)
    expect(screen.getByLabelText('Ruta del maestro')).toHaveValue('manual/maestro.adoc')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Curso' })).toHaveTextContent('Introducción al SGSPE (SGSPE-101)'))
  })

  it('reintentar un fallo cuyo origen ya no está permitido deja el formulario como estaba', async () => {
    const user = userEvent.setup()
    const gone = { ...failedJob, source: `otro/manual@${ANY_SHA}:manual/maestro.adoc` }
    renderImport(page([gone], { path: JOB, body: gone }))

    await user.click(await screen.findByRole('button', { name: /^Ver el motivo/ }))
    await user.click(await screen.findByRole('button', { name: 'Revisar y reintentar' }))
    expect(await screen.findByLabelText('Commit')).toHaveValue('')
  })

  it('sin el curso entre los legibles, el trabajo se nombra por su archivo; una fuente con otra forma, tal cual y como texto', async () => {
    const odd = { ...failedJob, id: 'job-odd', source: 'otro<b>origen' }
    renderImport(page([{ ...doneJob, courseId: 'desconocido' }, odd]))

    const rows = await within(await block()).findAllByRole('listitem')
    expect(within(rows[0]!).getByRole('button', { name: 'Ver el informe: manual/maestro.adoc' })).toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('otro<b>origen')
  })

  it('dice cuánto se guarda: no promete un historial completo', async () => {
    renderImport(page([doneJob]))
    const region = await block()
    expect(await within(region).findByText(/^Hasta las 50 más recientes\. Las terminadas se guardan 30 días/)).toBeInTheDocument()
  })

  it('respeta el orden del servidor y pliega lo terminado que sobra; lo que sigue en marcha no se pliega', async () => {
    const user = userEvent.setup()
    const old = { ...runningJob, id: 'job-old' }
    renderImport(page([finished(1), finished(2), finished(3), finished(4), old, finished(5)]))

    const list = within(await block())
    const links = () => list.getAllByRole('link', { name: /^Abrir el borrador/ }).map((link) => link.getAttribute('href'))
    await list.findAllByRole('listitem')
    expect(links()).toEqual(['/estudio/versiones/version-1', '/estudio/versiones/version-2', '/estudio/versiones/version-3'])
    expect(list.getByRole('button', { name: /^Seguir la importación/ })).toBeInTheDocument()

    const more = list.getByRole('button', { name: 'Ver 2 más' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)
    expect(links()).toHaveLength(5)
    expect(list.getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true')
    expect(list.getByRole('button', { name: 'Ver menos' })).toHaveFocus()
  })

  it('sigue consultando la lista mientras algo está en marcha, lo anuncia y para al terminar', async () => {
    const list = advancing(IMPORT, { body: [pendingJob] }, { body: [pendingJob] }, { body: [runningJob] }, { body: [doneJob] })
    const view = renderImport(page([], list))

    expect(await screen.findByRole('link', { name: /^Abrir el borrador/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 importaciones en marcha')
    const polls = calls('GET', IMPORT).length
    expect(polls).toBeGreaterThanOrEqual(4)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(calls('GET', IMPORT)).toHaveLength(polls)
    view.unmount()
  })

  it('al abrir un trabajo deja de consultar la lista', async () => {
    const user = userEvent.setup()
    renderImport(page([runningJob], { path: JOB, body: runningJob }))

    await user.click(await screen.findByRole('button', { name: /^Seguir la importación/ }))
    await screen.findByRole('heading', { level: 2, name: 'Estado de la importación' })
    const polls = calls('GET', IMPORT).length
    await waitFor(() => expect(calls('GET', JOB).length).toBeGreaterThanOrEqual(3))
    expect(calls('GET', IMPORT)).toHaveLength(polls)
  })

  it('sin trabajos lo dice, y el formulario sigue siendo lo primero que se hace', async () => {
    renderImport(page([]))
    const region = within(await block())
    expect(await region.findByText(/^Aún no tienes importaciones/)).toBeInTheDocument()
    expect(region.queryByRole('list')).not.toBeInTheDocument()
    expect(region.queryByText(/30 días/)).not.toBeInTheDocument()
    expect(await form()).toBeEnabled()
  })

  it('mientras carga lo dice, sin tapar el formulario', async () => {
    fetchMock = mockFetch([
      { path: SOURCES, body: importSources },
      { path: COURSES, body: courseRecords }
    ])
    const original = globalThis.fetch
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      String(input instanceof Request ? input.url : input)
        .split('?')[0]!
        .endsWith(IMPORT)
        ? new Promise<Response>(() => {})
        : original(input, init)) as typeof fetch
    try {
      renderWithProviders(<ImportPage pollInterval={20} />, { modules: [studioModule()], route: '/estudio/importar' })
      expect(within(await block()).getByRole('status')).toHaveTextContent('Cargando tus importaciones…')
      expect(await form()).toBeEnabled()
    } finally {
      globalThis.fetch = original
    }
  })

  it('si la lista falla, solo se degrada ese bloque: el formulario sigue y se puede reintentar', async () => {
    const user = userEvent.setup()
    const list = advancing(IMPORT, { status: 500, body: problem(500, 'fallo') }, { body: [runningJob] })
    renderImport(page([], list))

    const region = within(await block())
    expect(await region.findByText(/^No pudimos cargar tus importaciones\. Puedes importar igual\./)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await form()).toBeEnabled()

    await user.click(region.getByRole('button', { name: 'Reintentar' }))
    expect(await region.findByRole('button', { name: /^Seguir la importación/ })).toBeInTheDocument()
  })

  it('una lista con el contrato roto también degrada solo su bloque', async () => {
    renderImport(page([{ ...pendingJob, createdAt: 'ayer' }]))
    expect(await within(await block()).findByText(/^No pudimos cargar tus importaciones/)).toBeInTheDocument()
    expect(await form()).toBeEnabled()
  })

  it('un 403 solo de la lista lo explica sin reintentar y deja el formulario', async () => {
    renderImport(page([], { path: IMPORT, status: 403, body: problem(403, 'Forbidden') }))

    const region = within(await block())
    expect(await region.findByText(/^No puedes ver tus importaciones\./)).toBeInTheDocument()
    expect(region.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(await form()).toBeEnabled()
  })

  it('sin permiso para importar (403 en los dos) hay un solo aviso y ningún bloque de trabajos', async () => {
    renderImport([
      { path: SOURCES, status: 403, body: problem(403, 'Forbidden') },
      { path: IMPORT, status: 403, body: problem(403, 'Forbidden') },
      { path: COURSES, body: courseRecords }
    ])

    expect(await screen.findByRole('alert')).toHaveTextContent('No puedes importar manuales')
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Tus importaciones' })).not.toBeInTheDocument())
  })

  it('si fallan los orígenes, la lista sigue a mano para retomar lo que corre', async () => {
    const user = userEvent.setup()
    renderImport([
      { path: SOURCES, status: 500, body: problem(500, 'fallo') },
      { path: IMPORT, body: [runningJob] },
      { path: JOB, body: runningJob },
      { path: COURSES, body: courseRecords }
    ])

    await user.click(await screen.findByRole('button', { name: /^Seguir la importación/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Estado de la importación' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderImport(page([doneJob, failedJob, runningJob]), 'en')

    const region = within(await screen.findByRole('region', { name: 'Your imports' }))
    await region.findAllByRole('listitem')
    expect(region.getByText('Finished')).toBeInTheDocument()
    expect(region.getByText('Failed')).toBeInTheDocument()
    expect(region.getByText('Importing')).toBeInTheDocument()
    expect(region.getByRole('button', { name: /^See the report/ })).toBeInTheDocument()
    expect(region.getByRole('button', { name: /^See the reason/ })).toBeInTheDocument()
    expect(region.getByRole('button', { name: /^Follow the import/ })).toBeInTheDocument()
  })
})
