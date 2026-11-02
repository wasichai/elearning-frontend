import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Link } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { teachingModule } from './module'
import { OfferingsPage } from './OfferingsPage'
import { MAX_PANEL_OFFERINGS, MAX_TRAY_ROWS } from './panel'
import { offering, otherOffering, pendingAttempts, problem, teachingSessions } from './test/fixtures'

const OFFERINGS = '/lms/teaching/offerings'
const queuePath = (code: string) => `${OFFERINGS}/${code}/attempts`
const sessionsPath = (code: string) => `${OFFERINGS}/${code}/sessions`

// las rutas de una edición sin nada que leer
const quiet = (code: string): MockRoute[] => [
  { path: queuePath(code), body: [] },
  { path: sessionsPath(code), body: [] }
]

const SGSPE = offering.code
const SRTM = otherOffering.code
const OFFERING_ROUTES: MockRoute[] = [{ path: queuePath(SGSPE), body: pendingAttempts }, { path: sessionsPath(SGSPE), body: teachingSessions }, ...quiet(SRTM)]

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
const called = (path: string) => fetchMock.calls.filter((call) => call.path === path).length

describe('OfferingsPage: el panel docente', () => {
  it('cuenta ediciones, intentos por corregir y matriculados con sumas exactas', async () => {
    renderOfferings([{ path: OFFERINGS, body: [offering, otherOffering] }, ...OFFERING_ROUTES])

    expect(screen.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus ediciones…')).toBeInTheDocument()
    await screen.findAllByRole('article')
    expect(figure('Ediciones asignadas')).toBe('2')
    expect(figure('Intentos por corregir')).toBe('1')
    expect(figure('Matriculados')).toBe('3')
  })

  it('una tarjeta por edición, con lo que más espera primero, su estado, sus fechas en su zona y sus tres accesos', async () => {
    renderOfferings([{ path: OFFERINGS, body: [otherOffering, offering] }, ...OFFERING_ROUTES])

    const items = await screen.findAllByRole('article')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual(['Introducción al SGSPE', 'Licencias de anuncios con SRTM'])
    const first = within(items[0]!)
    expect(first.getByRole('link', { name: 'Introducción al SGSPE' })).toHaveAttribute('href', `/docencia/${SGSPE}`)
    expect(first.getByText('SGSPE-101')).toBeInTheDocument()
    expect(first.getByText('En curso')).toBeInTheDocument()
    expect(first.getByText('7 sept – 16 oct 2026')).toBeInTheDocument()
    expect(first.getByText(/Fechas en /)).toBeInTheDocument()
    expect(first.getByRole('link', { name: '2 matriculados' })).toHaveAttribute('href', `/docencia/${SGSPE}`)
    expect(first.getByRole('link', { name: '1 intento por corregir' })).toHaveAttribute('href', `/docencia/${SGSPE}/correccion`)
    expect(await first.findByRole('link', { name: '1 próxima sesión' })).toHaveAttribute('href', `/docencia/${SGSPE}/sesiones`)
    const second = within(items[1]!)
    expect(second.getByRole('link', { name: 'Nada por corregir' })).toHaveAttribute('href', `/docencia/${SRTM}/correccion`)
    expect(await second.findByRole('link', { name: 'Sin sesiones próximas' })).toHaveAttribute('href', `/docencia/${SRTM}/sesiones`)
    expect(screen.queryByText(new RegExp(`edición ${SGSPE}`))).not.toBeInTheDocument()
  })

  it('sin leer sus sesiones, la tarjeta no da una cifra que no sabe', async () => {
    const closed = { ...otherOffering, status: 'FINALIZADA' }
    renderOfferings([{ path: OFFERINGS, body: [closed] }])

    const card = within(await screen.findByRole('article'))
    expect(card.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', `/docencia/${SRTM}/sesiones`)
    expect(card.getByText('Finalizada')).toBeInTheDocument()
    expect(called(sessionsPath(SRTM))).toBe(0)
  })

  describe('la bandeja «Por corregir»', () => {
    const tray = async () => within((await screen.findByRole('heading', { level: 2, name: 'Por corregir' })).closest('section')!)

    it('trae correo, lección, antigüedad y acceso directo, y lee solo las colas con algo pendiente', async () => {
      renderOfferings([{ path: OFFERINGS, body: [offering, otherOffering] }, ...OFFERING_ROUTES])

      const section = await tray()
      expect(await section.findByText('estudiante@demo.local')).toBeInTheDocument()
      expect(section.getByText('Evaluación final')).toBeInTheDocument()
      expect(section.getByText('Enviado hace 4 días')).toBeInTheDocument()
      expect(section.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' })).toHaveAttribute(
        'href',
        `/docencia/${SGSPE}/correccion/int-1`
      )
      expect(section.getByRole('link', { name: 'Ver la cola' })).toHaveAttribute('href', `/docencia/${SGSPE}/correccion`)
      expect(called(queuePath(SGSPE))).toBe(1)
      expect(called(queuePath(SRTM))).toBe(0)
    })

    it('agrupa por edición si hay más de una, con la entrega más antigua arriba, y solo esa es primaria', async () => {
      const busy = { ...otherOffering, pendingAttempts: 1 }
      const older = { ...pendingAttempts[0]!, attemptId: 'int-9', email: 'ana.torres@demo.local', lessonTitle: 'Práctica', submittedAt: '2026-10-01T10:00:00Z' }
      renderOfferings([
        { path: OFFERINGS, body: [offering, busy] },
        { path: queuePath(SGSPE), body: pendingAttempts },
        { path: sessionsPath(SGSPE), body: [] },
        { path: queuePath(SRTM), body: [older] },
        { path: sessionsPath(SRTM), body: [] }
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
      renderOfferings([
        { path: OFFERINGS, body: [offering] },
        { path: queuePath(SGSPE), body: [{ ...pendingAttempts[0], email: null }] },
        { path: sessionsPath(SGSPE), body: [] }
      ])

      expect(await (await tray()).findByText('Sin correo registrado')).toBeInTheDocument()
    })

    it('muestra un máximo de entregas y lleva a la cola para las demás', async () => {
      const queue = Array.from({ length: MAX_TRAY_ROWS + 2 }, (_, index) => ({ ...pendingAttempts[0]!, attemptId: `int-${index}` }))
      renderOfferings([
        { path: OFFERINGS, body: [{ ...offering, pendingAttempts: queue.length }] },
        { path: queuePath(SGSPE), body: queue },
        { path: sessionsPath(SGSPE), body: [] }
      ])

      const section = await tray()
      expect(await section.findByRole('link', { name: 'Ver 2 entregas más en la cola' })).toHaveAttribute('href', `/docencia/${SGSPE}/correccion`)
      expect(section.getAllByRole('link', { name: /^Corregir/ })).toHaveLength(MAX_TRAY_ROWS)
    })

    it('sin nada por corregir lo dice, sin primaria y sin pedir ninguna cola', async () => {
      renderOfferings([{ path: OFFERINGS, body: [otherOffering] }, ...quiet(SRTM)])

      const section = await tray()
      expect(section.getByText('No tienes entregas por corregir.')).toBeInTheDocument()
      expect(called(queuePath(SRTM))).toBe(0)
      expect(document.querySelector('[data-variant="primary"]')).toBeNull()
    })

    it('una cola que falla degrada solo su bloque: lo dice, deja reintentar y lo demás se ve', async () => {
      const busy = { ...otherOffering, pendingAttempts: 1 }
      const routes: MockRoute[] = [
        { path: OFFERINGS, body: [offering, busy] },
        { path: queuePath(SGSPE), status: 500, body: problem(500, 'fallo') },
        { path: sessionsPath(SGSPE), body: teachingSessions },
        { path: queuePath(SRTM), body: [{ ...pendingAttempts[0]!, attemptId: 'int-9', email: 'ana.torres@demo.local' }] },
        { path: sessionsPath(SRTM), body: [] }
      ]
      renderOfferings(routes)

      const section = await tray()
      const alert = await section.findByRole('alert')
      expect(alert).toHaveTextContent('No pudimos cargar la cola de corrección')
      expect(await section.findByText('ana.torres@demo.local')).toBeInTheDocument()
      expect(screen.getAllByRole('article')).toHaveLength(2)
      expect(await screen.findByText('Presentación del curso')).toBeInTheDocument()

      routes[1] = { path: queuePath(SGSPE), body: pendingAttempts }
      await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar: cola de Introducción al SGSPE' }))
      expect(await section.findByText('estudiante@demo.local')).toBeInTheDocument()
      expect(section.queryByRole('alert')).not.toBeInTheDocument()
      expect(called(queuePath(SRTM))).toBe(1)
    })

    it('avisa cuando el tope deja ediciones sin leer', async () => {
      const many = Array.from({ length: MAX_PANEL_OFFERINGS + 1 }, (_, index) => ({ ...offering, code: `e${index}` }))
      renderOfferings([{ path: OFFERINGS, body: many }, ...many.flatMap(({ code }) => quiet(code))])

      expect(
        (await screen.findAllByText(`Aquí se leen las ${MAX_PANEL_OFFERINGS} ediciones con más trabajo. Las demás, desde su tarjeta.`)).length
      ).toBeGreaterThan(0)
      await waitFor(() => expect(called(queuePath('e0'))).toBe(1))
      expect(called(queuePath(`e${MAX_PANEL_OFFERINGS}`))).toBe(0)
    })
  })

  describe('la agenda «Próximas sesiones»', () => {
    const agenda = async () => within((await screen.findByRole('heading', { level: 2, name: 'Próximas sesiones' })).closest('section')!)

    it('trae las futuras no canceladas, con día de la semana, hora y zona, y enlaza a las sesiones de la edición', async () => {
      renderOfferings([{ path: OFFERINGS, body: [offering, otherOffering] }, ...OFFERING_ROUTES])

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
      renderOfferings([
        { path: OFFERINGS, body: [offering, otherOffering] },
        { path: queuePath(SGSPE), body: [] },
        { path: sessionsPath(SGSPE), body: teachingSessions },
        { path: queuePath(SRTM), body: [] },
        { path: sessionsPath(SRTM), body: [madridSession] }
      ])

      const section = await agenda()
      const madrid = await section.findByRole('link', { name: /En Madrid/ })
      await section.findByRole('link', { name: /Presentación del curso/ })
      expect(madrid).toHaveTextContent(/14:00/)
      expect(madrid).toHaveTextContent(/Europa|central/i)
      expect(section.queryByText(/^Horas en /)).not.toBeInTheDocument()
    })

    it('la sesión en curso lo dice y lleva a pasar asistencia', async () => {
      const running = { ...teachingSessions[0]!, start: '2026-11-02T14:30:00Z', end: '2026-11-02T16:00:00Z' }
      renderOfferings([
        { path: OFFERINGS, body: [{ ...offering, pendingAttempts: 0 }] },
        { path: sessionsPath(SGSPE), body: [running] }
      ])

      const row = await (await agenda()).findByRole('link', { name: /Presentación del curso/ })
      expect(row).toHaveAttribute('href', `/docencia/${SGSPE}/sesiones/ses-1/asistencia`)
      expect(row).toHaveTextContent('En curso')
      expect(row).toHaveTextContent('Pasar asistencia')
    })

    it('una reprogramada lo dice', async () => {
      renderOfferings([
        { path: OFFERINGS, body: [{ ...offering, pendingAttempts: 0 }] },
        { path: sessionsPath(SGSPE), body: [{ ...teachingSessions[0]!, status: 'REPROGRAMADA' }] }
      ])

      expect(await (await agenda()).findByRole('link', { name: /Reprogramada/ })).toBeInTheDocument()
    })

    it('sin sesiones por delante lo dice', async () => {
      renderOfferings([
        { path: OFFERINGS, body: [{ ...offering, pendingAttempts: 0 }] },
        { path: sessionsPath(SGSPE), body: [teachingSessions[1]] }
      ])

      expect(await (await agenda()).findByText('No tienes sesiones próximas.')).toBeInTheDocument()
    })

    it('unas sesiones que fallan degradan solo su bloque: dice de qué curso, deja reintentar y la tarjeta no da cifra', async () => {
      const routes: MockRoute[] = [
        { path: OFFERINGS, body: [offering] },
        { path: queuePath(SGSPE), body: pendingAttempts },
        { path: sessionsPath(SGSPE), status: 500, body: problem(500, 'fallo') }
      ]
      renderOfferings(routes)

      const section = await agenda()
      const alert = await section.findByRole('alert')
      expect(alert).toHaveTextContent('No pudimos cargar las sesiones de Introducción al SGSPE.')
      expect(screen.getByRole('link', { name: 'Sesiones' })).toBeInTheDocument()
      expect(await screen.findByText('estudiante@demo.local')).toBeInTheDocument()

      routes[2] = { path: sessionsPath(SGSPE), body: teachingSessions }
      await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar: sesiones' }))
      expect(await section.findByRole('link', { name: /Presentación del curso/ })).toBeInTheDocument()
      expect(section.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('sin ediciones asignadas lo dice con claridad, sin cifras en cero ni bloques vacíos', async () => {
    renderOfferings([{ path: OFFERINGS, body: [] }])

    expect(await screen.findByText('No tienes ediciones asignadas')).toBeInTheDocument()
    expect(screen.getByText(/Cuando la coordinación te asigne/)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText('Ediciones asignadas')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Por corregir' })).not.toBeInTheDocument()
  })

  it('un error del servidor se explica y deja reintentar', async () => {
    renderOfferings([{ path: OFFERINGS, status: 500, body: problem(500, 'fallo') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus ediciones')
    expect(alert).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('quien no puede leer las ediciones no ve el panel: un 403 se explica, sin cifras ni tarjetas', async () => {
    renderOfferings([{ path: OFFERINGS, status: 403, body: problem(403, 'prohibido') }])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Ediciones asignadas')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('una respuesta fuera de contrato no muestra datos a medias', async () => {
    renderOfferings([{ path: OFFERINGS, body: [{ ...offering, enrolled: '2' }] }])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderOfferings(
      [
        { path: OFFERINGS, body: [offering] },
        { path: queuePath(SGSPE), body: pendingAttempts },
        { path: sessionsPath(SGSPE), body: teachingSessions }
      ],
      'en'
    )

    expect(screen.getByRole('heading', { level: 1, name: 'My offerings' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '2 students' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1 attempt to grade' })).toBeInTheDocument()
    expect(screen.getByText('Sep 7 – Oct 16, 2026')).toBeInTheDocument()
    expect(await screen.findByText('Submitted 4 days ago')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '1 upcoming session' })).toBeInTheDocument()
  })

  // el menú lleva a la misma ruta: la página no se vuelve a montar y solo cambia la entrada del historial (#76)
  it('con el panel abierto, volver a pulsar su entrada del menú lo vuelve a pedir, con sus bloques, y pinta lo nuevo', async () => {
    const routes: MockRoute[] = [{ path: OFFERINGS, body: [offering] }, ...OFFERING_ROUTES]
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
    expect(called(OFFERINGS)).toBe(1)
    expect(called(queuePath(SGSPE))).toBe(1)

    routes[0] = { path: OFFERINGS, body: [offering, otherOffering] }
    await userEvent.click(screen.getByRole('link', { name: 'Menú' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(called(OFFERINGS)).toBe(2)
    await waitFor(() => expect(called(queuePath(SGSPE))).toBe(2))
  })
})
