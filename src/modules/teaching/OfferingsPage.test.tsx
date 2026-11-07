import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_PANEL_PAGES, PANEL_PAGE_SIZE } from '../../shared/pages'
import { teachingModule } from './module'
import { OfferingsPage } from './OfferingsPage'
import { MAX_TRAY_ROWS } from './panel'
import { offering, otherOffering, panelItem, pendingAttempts, problem, teachingSessions } from './test/fixtures'

const OFFERINGS = '/lms/teaching/offerings'
const PANEL = '/lms/teaching/panel'
const queuePath = (code: string) => `${OFFERINGS}/${code}/attempts`
// lo que el panel ya trae y antes se leía aparte por edición: su cola o sus sesiones
const PER_OFFERING = /^\/lms\/teaching\/offerings\/./
const pageOf = (page: number) => new RegExp(`^/lms/teaching/panel\\?page=${page}&size=${PANEL_PAGE_SIZE}$`)
const panelOf = (...items: object[]): MockRoute => ({ path: PANEL, body: items.map((item) => ('oldestPending' in item ? item : panelItem(item))) })
const panelDown = (status = 500): MockRoute => ({ path: PANEL, status, body: problem(status, 'fallo') })

const SGSPE = offering.code
const SRTM = otherOffering.code
const BOTH = [panelItem(offering, { oldestPending: pendingAttempts, upcomingSessions: teachingSessions }), panelItem(otherOffering)]

let fetchMock: FetchMock
beforeEach(() => vi.setSystemTime(new Date('2026-11-02T15:00:00Z')))
afterEach(() => {
  fetchMock?.restore()
  vi.useRealTimers()
})

function renderOfferings(routes: MockRoute[], language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<OfferingsPage />, { modules: [teachingModule()], route: '/docencia', language })
}

const figure = (label: string) => screen.getByText(label).parentElement!.querySelector('dd')!.textContent
const called = (path: string) => fetchMock.calls.filter((call) => call.path.split('?')[0] === path).length

describe('OfferingsPage: el panel docente', () => {
  it('con todas las ediciones en una zona, la dice una vez, en «Tus ediciones», y no en cada tarjeta', async () => {
    renderOfferings([panelOf(...BOTH)])

    const items = await screen.findAllByRole('article')
    for (const item of items) expect(within(item).queryByText(/Perú/)).not.toBeInTheDocument()
    const offerings = within(screen.getByRole('heading', { level: 2, name: 'Tus ediciones' }).closest('section')!)
    expect(offerings.getAllByText(/^Fechas en hora .*Perú$/)).toHaveLength(1)
  })

  it('cuenta ediciones, intentos por corregir y matriculados con sumas exactas', async () => {
    renderOfferings([panelOf(...BOTH)])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus ediciones…')).toBeInTheDocument()
    await screen.findAllByRole('article')
    expect(figure('Ediciones asignadas')).toBe('2')
    expect(figure('Intentos por corregir')).toBe('1')
    expect(figure('Matriculados')).toBe('3')
    // una cifra, no una alerta: lo que hay que hacer con ella está en la bandeja, justo debajo
    const pending = screen.getByText('Intentos por corregir').parentElement!
    expect(pending.innerHTML).not.toMatch(/text-notice/)
  })

  it('con ediciones en zonas distintas, cada tarjeta dice la suya', async () => {
    const [first, second] = BOTH
    const madrid = { ...second!, timeZone: 'Europe/Madrid' }
    renderOfferings([panelOf(first!, madrid)])

    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByText(/^Fechas en /).textContent)).toHaveLength(2)
    // y la sección no añade la suya: solo las dos de las tarjetas
    expect(within(screen.getByRole('heading', { level: 2, name: 'Tus ediciones' }).closest('section')!).getAllByText(/^Fechas en /)).toHaveLength(2)
  })

  it('una tarjeta por edición, con lo que más espera primero, su estado, sus fechas en su zona y sus tres accesos', async () => {
    renderOfferings([panelOf(...[...BOTH].reverse())])

    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Introducción al SGSPE', 'Licencias de anuncios con SRTM'])
    const first = within(items[0]!)
    expect(first.getByRole('link', { name: 'Introducción al SGSPE' })).toHaveAttribute('href', `/docencia/${SGSPE}`)
    expect(first.getByText('SGSPE-101')).toBeInTheDocument()
    expect(first.getByText('En curso')).toBeInTheDocument()
    expect(first.getByText('7 sept – 16 oct 2026')).toBeInTheDocument()
    // la zona, compartida por las dos, la dice «Tus ediciones»
    expect(first.queryByText(/Fechas en /)).not.toBeInTheDocument()
    expect(first.getByRole('link', { name: '2 matriculados' })).toHaveAttribute('href', `/docencia/${SGSPE}`)
    expect(first.getByRole('link', { name: '1 intento por corregir' })).toHaveAttribute('href', `/docencia/${SGSPE}/correccion`)
    expect(await first.findByRole('link', { name: '1 próxima sesión' })).toHaveAttribute('href', `/docencia/${SGSPE}/sesiones`)
    const second = within(items[1]!)
    expect(second.getByRole('link', { name: 'Nada por corregir' })).toHaveAttribute('href', `/docencia/${SRTM}/correccion`)
    expect(await second.findByRole('link', { name: 'Sin sesiones próximas' })).toHaveAttribute('href', `/docencia/${SRTM}/sesiones`)
    expect(screen.queryByText(new RegExp(`edición ${SGSPE}`))).not.toBeInTheDocument()
  })

  it('una edición terminada no tiene agenda: su tarjeta no da cifra y sus sesiones no se pintan', async () => {
    const closed = panelItem({ ...otherOffering, status: 'FINALIZADA' }, { upcomingSessions: teachingSessions })
    renderOfferings([panelOf(closed)])

    const card = within(await screen.findByRole('article'))
    expect(card.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', `/docencia/${SRTM}/sesiones`)
    expect(card.getByText('Finalizada')).toBeInTheDocument()
    expect(screen.getByText('No tienes sesiones próximas.')).toBeInTheDocument()
  })

  it('una sola lectura: ni la lista de ediciones aparte ni una petición por edición', async () => {
    renderOfferings([panelOf(...BOTH)])

    await screen.findByText('estudiante@demo.local')
    expect(called(PANEL)).toBe(1)
    expect(called(OFFERINGS)).toBe(0)
    expect(fetchMock.calls.filter((call) => PER_OFFERING.test(call.path))).toEqual([])
  })

  // antes: «avisa cuando el tope deja ediciones sin leer»
  it('con más ediciones que una página las lee todas, recorriendo páginas, sin ningún aviso, y las cifras son exactas', async () => {
    const many = Array.from({ length: PANEL_PAGE_SIZE + 2 }, (_, index) =>
      panelItem(
        { ...offering, code: `e${index}`, pendingAttempts: 1 },
        { oldestPending: [{ ...pendingAttempts[0]!, attemptId: `int-${index}`, email: `persona${index}@demo.local` }] }
      )
    )
    renderOfferings([
      { path: pageOf(0), body: many.slice(0, PANEL_PAGE_SIZE) },
      { path: pageOf(1), body: many.slice(PANEL_PAGE_SIZE) }
    ])

    await screen.findAllByRole('article')
    expect(screen.getAllByRole('article')).toHaveLength(many.length)
    expect(figure('Ediciones asignadas')).toBe(String(many.length))
    expect(figure('Intentos por corregir')).toBe(String(many.length))
    expect(screen.getByText(`persona${PANEL_PAGE_SIZE + 1}@demo.local`)).toBeInTheDocument()
    expect(fetchMock.calls.map((call) => call.path).filter((path) => path.startsWith('/lms/'))).toEqual([
      `${PANEL}?page=0&size=${PANEL_PAGE_SIZE}`,
      `${PANEL}?page=1&size=${PANEL_PAGE_SIZE}`
    ])
    expect(screen.queryByText(/ediciones con más trabajo/)).not.toBeInTheDocument()
  })

  describe('si no se puede leer el panel', () => {
    it('la bandeja y la agenda lo dicen, las tarjetas y las cifras siguen y «Reintentar» lo recupera', async () => {
      const routes: MockRoute[] = [panelDown(), { path: OFFERINGS, body: [offering, otherOffering] }]
      renderOfferings(routes)

      const tray = within((await screen.findByRole('heading', { level: 2, name: 'Por corregir' })).closest('section')!)
      const alert = await tray.findByRole('alert')
      expect(alert).toHaveTextContent('No pudimos cargar la cola de corrección')
      expect(tray.queryByText('No tienes entregas por corregir.')).not.toBeInTheDocument()
      const agenda = within(screen.getByRole('heading', { level: 2, name: 'Próximas sesiones' }).closest('section')!)
      expect(agenda.getByRole('alert')).toHaveTextContent('No pudimos cargar tus próximas sesiones.')
      expect(screen.getAllByRole('article')).toHaveLength(2)
      expect(figure('Intentos por corregir')).toBe('1')
      // sin leer sus sesiones, la tarjeta no da cifra
      expect(screen.getAllByRole('link', { name: 'Sesiones' })).toHaveLength(2)

      routes[0] = panelOf(...BOTH)
      await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar: cola de corrección' }))
      expect(await tray.findByText('estudiante@demo.local')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(fetchMock.calls.filter((call) => PER_OFFERING.test(call.path))).toEqual([])
    })

    it('sin nada por corregir ni ediciones vivas, no avisa de bloques que no tendrían nada', async () => {
      renderOfferings([panelDown(), { path: OFFERINGS, body: [{ ...otherOffering, status: 'FINALIZADA' }] }])

      expect(await screen.findByText('No tienes entregas por corregir.')).toBeInTheDocument()
      expect(screen.getByText('No tienes sesiones próximas.')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('si falla una página posterior, no da por completo lo leído: sin filas de la bandeja y con las cifras de toda la lista', async () => {
      const first = Array.from({ length: PANEL_PAGE_SIZE }, (_, index) =>
        panelItem({ ...offering, code: `e${index}`, pendingAttempts: 1 }, { oldestPending: pendingAttempts, upcomingSessions: teachingSessions })
      )
      const all = [...first.map(({ upcomingSessions: _sessions, oldestPending: _queue, ...rest }) => rest), { ...offering, code: 'ultima', pendingAttempts: 3 }]
      renderOfferings([
        { path: pageOf(0), body: first },
        { path: pageOf(1), status: 500, body: problem(500, 'fallo') },
        { path: OFFERINGS, body: all }
      ])

      const tray = within((await screen.findByRole('heading', { level: 2, name: 'Por corregir' })).closest('section')!)
      expect(await tray.findByRole('alert')).toHaveTextContent('No pudimos cargar la cola de corrección')
      expect(tray.queryByRole('link', { name: /^Corregir/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Presentación del curso/ })).not.toBeInTheDocument()
      expect(figure('Intentos por corregir')).toBe(String(PANEL_PAGE_SIZE + 3))
      expect(screen.getAllByRole('article')).toHaveLength(all.length)
    })

    it('si las páginas nunca terminan, para en el límite de seguridad y lo trata como un fallo', async () => {
      const full = Array.from({ length: PANEL_PAGE_SIZE }, (_, index) => panelItem({ ...offering, code: `e${index}`, pendingAttempts: 0 }))
      renderOfferings([
        { path: /^\/lms\/teaching\/panel\?/, body: full },
        { path: OFFERINGS, body: [offering] }
      ])

      expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('No pudimos cargar')
      expect(called(PANEL)).toBe(MAX_PANEL_PAGES)
      expect(screen.getAllByRole('article')).toHaveLength(1)
    })
  })

  describe('la bandeja «Por corregir»', () => {
    const tray = async () => within((await screen.findByRole('heading', { level: 2, name: 'Por corregir' })).closest('section')!)

    it('trae correo, lección, antigüedad y acceso directo, sin leer ninguna cola', async () => {
      renderOfferings([panelOf(...BOTH)])

      const section = await tray()
      expect(await section.findByText('estudiante@demo.local')).toBeInTheDocument()
      // la inicial de quien entregó, para recorrer la lista de un vistazo; el lector de pantalla ya tiene el correo
      const avatar = section.getAllByText('E').find((element) => element.getAttribute('data-slot') === 'avatar')!
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
      expect(section.getByText('Evaluación final')).toBeInTheDocument()
      expect(section.getByText('Enviado hace 4 días')).toBeInTheDocument()
      expect(section.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' })).toHaveAttribute(
        'href',
        `/docencia/${SGSPE}/correccion/int-1`
      )
      expect(section.getByRole('link', { name: 'Ver la cola' })).toHaveAttribute('href', `/docencia/${SGSPE}/correccion`)
      expect(called(queuePath(SGSPE))).toBe(0)
      expect(called(queuePath(SRTM))).toBe(0)
    })

    it('agrupa por edición si hay más de una, con la entrega más antigua arriba, y solo esa es primaria', async () => {
      const older = { ...pendingAttempts[0]!, attemptId: 'int-9', email: 'ana.torres@demo.local', lessonTitle: 'Práctica', submittedAt: '2026-10-01T10:00:00Z' }
      renderOfferings([
        panelOf(panelItem(offering, { oldestPending: pendingAttempts }), panelItem({ ...otherOffering, pendingAttempts: 1 }, { oldestPending: [older] }))
      ])

      const section = await tray()
      await section.findByText('ana.torres@demo.local')
      await section.findByText('estudiante@demo.local')
      expect(section.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
        'Licencias de anuncios con SRTM',
        'Introducción al SGSPE'
      ])
      const grade = section.getAllByRole('link', { name: /^Corregir/ })
      expect(grade).toHaveLength(2)
      expect(grade[0]).toHaveAccessibleName('Corregir «Práctica» de ana.torres@demo.local')
      expect(grade[0]).toHaveAttribute('data-variant', 'primary')
      expect(grade[1]).toHaveAttribute('data-variant', 'secondary')
    })

    it('una entrega sin correo lo dice', async () => {
      renderOfferings([panelOf(panelItem(offering, { oldestPending: [{ ...pendingAttempts[0], email: null }] }))])

      expect(await (await tray()).findByText('Sin correo registrado')).toBeInTheDocument()
    })

    const queueOf = (count: number) => Array.from({ length: count }, (_, index) => ({ ...pendingAttempts[0]!, attemptId: `int-${index}` }))

    // antes contaba las filas de la cola entera, que ya no se lee: el total sale de pendingAttempts
    it('muestra los que trae el panel y lleva a la cola para los demás, con el total real', async () => {
      renderOfferings([panelOf(panelItem({ ...offering, pendingAttempts: 42 }, { oldestPending: queueOf(MAX_TRAY_ROWS) }))])

      const section = await tray()
      expect(await section.findByRole('link', { name: `Ver ${42 - MAX_TRAY_ROWS} entregas más en la cola` })).toHaveAttribute(
        'href',
        `/docencia/${SGSPE}/correccion`
      )
      expect(section.getAllByRole('link', { name: /^Corregir/ })).toHaveLength(MAX_TRAY_ROWS)
      expect(figure('Intentos por corregir')).toBe('42')
    })

    it('con la bandeja justa, o con menos filas de las que caben, no promete más', async () => {
      renderOfferings([panelOf(panelItem({ ...offering, pendingAttempts: MAX_TRAY_ROWS }, { oldestPending: queueOf(MAX_TRAY_ROWS) }))])
      expect((await (await tray()).findAllByRole('link', { name: /^Corregir/ })).length).toBe(MAX_TRAY_ROWS)
      expect(screen.queryByRole('link', { name: /más en la cola/ })).not.toBeInTheDocument()
    })

    it('si el total cuenta entregas que la cola no enseña, menos filas de las que caben son la cola entera', async () => {
      // pendingAttempts cuenta todos los enviados; la cola deja fuera los propios de quien la mira
      renderOfferings([panelOf(panelItem({ ...offering, pendingAttempts: 3 }, { oldestPending: queueOf(2) }))])

      expect(await (await tray()).findAllByRole('link', { name: /^Corregir/ })).toHaveLength(2)
      expect(screen.queryByRole('link', { name: /más en la cola/ })).not.toBeInTheDocument()
    })

    it('sin nada por corregir lo dice, sin primaria', async () => {
      renderOfferings([panelOf(otherOffering)])

      const section = await tray()
      expect(section.getByText('No tienes entregas por corregir.')).toBeInTheDocument()
      expect(document.querySelector('[data-variant="primary"]')).toBeNull()
    })

    it('una edición con total pero sin filas a la vista no se pinta', async () => {
      renderOfferings([panelOf({ ...panelItem(offering), pendingAttempts: 1 })])

      expect((await tray()).getByText('No tienes entregas por corregir.')).toBeInTheDocument()
    })
  })

  describe('la agenda «Próximas sesiones»', () => {
    const agenda = async () => within((await screen.findByRole('heading', { level: 2, name: 'Próximas sesiones' })).closest('section')!)

    it('trae las futuras no canceladas, con día de la semana, hora y zona, y enlaza a las sesiones de la edición', async () => {
      renderOfferings([panelOf(...BOTH)])

      const section = await agenda()
      const row = await section.findByRole('link', { name: /Presentación del curso/ })
      expect(row).toHaveAttribute('href', `/docencia/${SGSPE}/sesiones`)
      // 13:00 UTC son las 8 en Lima; el 10 de noviembre de 2026 es martes
      expect(row).toHaveTextContent(/mar.*10.*nov.*8:00/i)
      expect(row).toHaveTextContent('Introducción al SGSPE')
      expect(section.getByText(/^Horas en /)).toBeInTheDocument()
      expect(section.queryByText('Consulta cancelada')).not.toBeInTheDocument()
    })

    it('con ediciones en zonas distintas, cada fila dice la suya', async () => {
      const madridSession = { ...teachingSessions[0]!, id: 'ses-9', title: 'En Madrid', timeZone: 'Europe/Madrid' }
      renderOfferings([panelOf(panelItem(offering, { upcomingSessions: teachingSessions }), panelItem(otherOffering, { upcomingSessions: [madridSession] }))])

      const section = await agenda()
      const madrid = await section.findByRole('link', { name: /En Madrid/ })
      await section.findByRole('link', { name: /Presentación del curso/ })
      expect(madrid).toHaveTextContent(/14:00/)
      expect(madrid).toHaveTextContent(/Europa|central/i)
      expect(section.queryByText(/^Horas en /)).not.toBeInTheDocument()
    })

    it('la sesión en curso lo dice y lleva a pasar asistencia', async () => {
      const running = { ...teachingSessions[0]!, start: '2026-11-02T14:30:00Z', end: '2026-11-02T16:00:00Z' }
      renderOfferings([panelOf(panelItem({ ...offering, pendingAttempts: 0 }, { upcomingSessions: [running] }))])

      const row = await (await agenda()).findByRole('link', { name: /Presentación del curso/ })
      expect(row).toHaveAttribute('href', `/docencia/${SGSPE}/sesiones/ses-1/asistencia`)
      expect(row).toHaveTextContent('En curso')
      expect(row).toHaveTextContent('Pasar asistencia')
    })

    it('una reprogramada lo dice', async () => {
      renderOfferings([panelOf(panelItem({ ...offering, pendingAttempts: 0 }, { upcomingSessions: [{ ...teachingSessions[0]!, status: 'REPROGRAMADA' }] }))])

      expect(await (await agenda()).findByRole('link', { name: /Reprogramada/ })).toBeInTheDocument()
    })

    it('sin sesiones por delante lo dice', async () => {
      renderOfferings([panelOf({ ...offering, pendingAttempts: 0 })])

      expect(await (await agenda()).findByText('No tienes sesiones próximas.')).toBeInTheDocument()
    })
  })

  it('sin ediciones asignadas lo dice con claridad, sin cifras en cero ni bloques vacíos', async () => {
    renderOfferings([panelOf()])

    expect(await screen.findByText('No tienes ediciones asignadas')).toBeInTheDocument()
    expect(screen.getByText(/Cuando la coordinación te asigne/)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText('Ediciones asignadas')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Por corregir' })).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y deja reintentar', async () => {
    renderOfferings([panelDown(), { path: OFFERINGS, status: 500, body: problem(500, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus ediciones')
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('«Reintentar», con todo caído, recupera el panel', async () => {
    const routes: MockRoute[] = [panelDown(), { path: OFFERINGS, status: 500, body: problem(500, 'fallo') }]
    renderOfferings(routes)

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    routes[0] = panelOf(...BOTH)
    await userEvent.click(retry)

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('quien no puede leer las ediciones no ve el panel: un 403 se explica, sin cifras ni tarjetas', async () => {
    renderOfferings([panelDown(403), { path: OFFERINGS, status: 403, body: problem(403, 'prohibido') }])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Ediciones asignadas')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no muestra datos a medias', async () => {
    const broken = { ...offering, enrolled: '2' }
    renderOfferings([panelOf(broken), { path: OFFERINGS, body: [broken] }])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderOfferings([panelOf(BOTH[0]!)], 'en')

    expect(screen.getByRole('heading', { level: 1, name: 'My offerings' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '2 students' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1 attempt to grade' })).toBeInTheDocument()
    expect(screen.getByText('Sep 7 – Oct 16, 2026')).toBeInTheDocument()
    expect(await screen.findByText('Submitted 4 days ago')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '1 upcoming session' })).toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con el panel abierto, volver a pulsar su entrada del menú lo vuelve a pedir y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [panelOf(BOTH[0]!)]
    fetchMock = mockFetch(routes)
    renderWithProviders(
      <>
        <Link to="/docencia">Menú</Link>
        <OfferingsPage />
      </>,
      { modules: [teachingModule()], route: '/docencia' }
    )
    expect(await screen.findAllByRole('article')).toHaveLength(1)
    await screen.findByText('estudiante@demo.local')
    expect(called(PANEL)).toBe(1)

    routes[0] = panelOf(...BOTH)
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(called(PANEL)).toBe(2)
  })
})
