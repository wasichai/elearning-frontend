import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AttendancePage } from './AttendancePage'
import { teachingModule } from './module'
import { OfferingSessionsPage } from './OfferingSessionsPage'
import { attendanceRows, offering, otherOffering, problem, teachingSessions } from './test/fixtures'

// sesiones y asistencia de una edición (ADR-0016)

const CODE = 'edicion-sgspe-2026-09'
const OFFERINGS = '/lms/teaching/offerings'
const SESSIONS = `${OFFERINGS}/${CODE}/sessions`
const SESSION = '/lms/teaching/sessions/ses-1'
const ATTENDANCE = `${SESSION}/attendance`

let fetchMock: FetchMock
beforeEach(() => vi.setSystemTime(new Date('2026-11-02T15:00:00Z')))
afterEach(() => {
  fetchMock?.restore()
  vi.useRealTimers()
})

function renderPages(routes: MockRoute[], route = `/docencia/${CODE}/sesiones`, language?: string) {
  // la misma lista: una prueba puede cambiar una respuesta a mitad de camino
  if (!routes.some((candidate) => candidate.path === OFFERINGS)) routes.push({ path: OFFERINGS, body: [offering] })
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/docencia/:code/sesiones" element={<OfferingSessionsPage />} />
      <Route path="/docencia/:code/sesiones/:sessionId/asistencia" element={<AttendancePage />} />
    </Routes>,
    { modules: [teachingModule()], route, language }
  )
}

const posted = (path: string) => fetchMock.calls.filter((call) => call.method !== 'GET' && call.path === path)
const LIST: MockRoute = { path: SESSIONS, body: teachingSessions }

describe('las sesiones de la edición', () => {
  it('lista con su hora en la zona de la edición, y una cancelada no ofrece acciones', async () => {
    renderPages([LIST])

    const active = within(await screen.findByRole('article', { name: 'Presentación del curso' }))
    expect(active.getByText(/^8:00.9:30$/)).toBeInTheDocument()
    expect(active.getByText('Teoría')).toBeInTheDocument()
    expect(active.getByText('Virtual')).toBeInTheDocument()
    expect(active.getByText('Programada')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /martes, 10 de noviembre de 2026/ })).toBeInTheDocument()
    expect(await screen.findByText(/^Horas en hora (estándar )?de Perú$/)).toBeInTheDocument()
    expect(active.getByRole('link', { name: 'Pasar asistencia de «Presentación del curso»' })).toHaveAttribute(
      'href',
      `/docencia/${CODE}/sesiones/ses-1/asistencia`
    )
    expect(active.getByRole('link', { name: /Abrir el enlace/ })).toHaveAttribute('href', 'https://meet.example/sgspe-1')
    const cancelled = within(screen.getByRole('article', { name: 'Consulta cancelada' }))
    expect(cancelled.getByText('Cancelada')).toBeInTheDocument()
    expect(cancelled.getByRole('heading', { name: 'Consulta cancelada' })).toHaveClass('line-through')
    expect(cancelled.queryByRole('button')).not.toBeInTheDocument()
    expect(cancelled.queryByRole('link')).not.toBeInTheDocument()
  })

  it('separa próximas y pasadas, y la sesión en curso lo dice', async () => {
    const past = { ...teachingSessions[0]!, id: 'ses-0', title: 'Ya fue', start: '2026-10-01T13:00:00Z', end: '2026-10-01T14:00:00Z' }
    const running = { ...teachingSessions[0]!, id: 'ses-3', title: 'Ahora', start: '2026-11-02T14:30:00Z', end: '2026-11-02T16:00:00Z' }
    renderPages([{ path: SESSIONS, body: [...teachingSessions, past, running] }])

    const upcoming = within(await screen.findByRole('region', { name: 'Próximas' }))
    expect(upcoming.getAllByRole('article').map((item) => item.getAttribute('aria-label'))).toEqual(['Ahora', 'Presentación del curso', 'Consulta cancelada'])
    expect(within(upcoming.getByRole('article', { name: 'Ahora' })).getByText('En curso')).toBeInTheDocument()
    const earlier = within(screen.getByRole('region', { name: 'Pasadas' }))
    expect(earlier.getAllByRole('article').map((item) => item.getAttribute('aria-label'))).toEqual(['Ya fue'])
    // de una pasada no se dice «Programada»: ya no lo está
    expect(within(earlier.getByRole('article')).queryByText('Programada')).not.toBeInTheDocument()
  })

  it('«Programar sesión» es la única primaria', async () => {
    renderPages([LIST])

    const open = await screen.findByRole('button', { name: 'Programar sesión' })
    expect(open).toHaveAttribute('data-variant', 'primary')
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
  })

  it('vacía lo dice; una edición ajena (404) se explica; un error deja reintentar', async () => {
    const first = renderPages([{ path: SESSIONS, body: [] }])
    expect(await screen.findByText('Esta edición todavía no tiene sesiones.')).toBeInTheDocument()
    first.unmount()
    fetchMock.restore()

    const second = renderPages([{ path: SESSIONS, status: 404, body: problem(404, 'No existe') }])
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta edición no está entre las tuyas')
    second.unmount()
    fetchMock.restore()

    renderPages([{ path: SESSIONS, status: 500, body: problem(500, 'fallo') }])
    expect(await screen.findByRole('alert')).toHaveTextContent('error 500')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('cancelar pide confirmación con motivo: sin él no se envía; cerrar el diálogo no hace nada', async () => {
    renderPages([LIST, { method: 'POST', path: `${SESSION}/cancel`, body: { ...teachingSessions[0], status: 'CANCELADA' } }])

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar la sesión «Presentación del curso»' }))
    let dialog = within(await screen.findByRole('dialog', { name: '¿Cancelar «Presentación del curso»?' }))
    // las alertas se envían siempre; el correo, solo si está configurado (docs/api/lms.md)
    expect(
      dialog.getByText(/Se avisará a los matriculados de esta edición con una alerta y, si hay correo configurado, también por correo/)
    ).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Sí, cancelar la sesión' }))
    expect(dialog.getByRole('alert')).toBeInTheDocument()
    expect(posted(`${SESSION}/cancel`)).toEqual([])
    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(posted(`${SESSION}/cancel`)).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar la sesión «Presentación del curso»' }))
    dialog = within(await screen.findByRole('dialog'))
    await userEvent.type(dialog.getByRole('textbox'), 'El docente está enfermo')
    await userEvent.click(dialog.getByRole('button', { name: 'Sí, cancelar la sesión' }))

    await waitFor(() => expect(posted(`${SESSION}/cancel`)).toHaveLength(1))
    expect(posted(`${SESSION}/cancel`)[0]?.body).toEqual({ reason: 'El docente está enfermo' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('un 409 al cancelar se explica dentro del diálogo, que sigue abierto', async () => {
    renderPages([LIST, { method: 'POST', path: `${SESSION}/cancel`, status: 409, body: problem(409, 'La sesión ya pasó') }])

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar la sesión «Presentación del curso»' }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.type(dialog.getByRole('textbox'), 'Motivo')
    await userEvent.click(dialog.getByRole('button', { name: 'Sí, cancelar la sesión' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('El servidor no lo aceptó: La sesión ya pasó')
  })

  it('reprogramar parte de la hora local de la edición y exige motivo', async () => {
    renderPages([LIST, { method: 'POST', path: `${SESSION}/reschedule`, body: { ...teachingSessions[0], status: 'REPROGRAMADA' } }])

    await userEvent.click(await screen.findByRole('button', { name: 'Reprogramar «Presentación del curso»' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Reprogramar «Presentación del curso»' }))
    expect(dialog.getByLabelText('Nueva fecha')).toHaveValue('2026-11-10')
    expect(dialog.getByLabelText('Nueva hora local')).toHaveValue('08:00')
    expect(dialog.getByText(/con una alerta y, si hay correo configurado, también por correo/)).toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Reprogramar y avisar' }))
    expect(dialog.getByRole('alert')).toBeInTheDocument()
    expect(posted(`${SESSION}/reschedule`)).toEqual([])

    await userEvent.clear(dialog.getByLabelText('Nueva hora local'))
    await userEvent.type(dialog.getByLabelText('Nueva hora local'), '10:30')
    await userEvent.type(dialog.getByLabelText('Motivo'), 'Cruce de horarios')
    await userEvent.click(dialog.getByRole('button', { name: 'Reprogramar y avisar' }))

    await waitFor(() => expect(posted(`${SESSION}/reschedule`)).toHaveLength(1))
    expect(posted(`${SESSION}/reschedule`)[0]?.body).toEqual({ date: '2026-11-10', localTime: '10:30', reason: 'Cruce de horarios' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('crear sesiones', () => {
  const open = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Programar sesión' }))
    return within(await screen.findByRole('form', { name: 'Crear una sesión o una serie' }))
  }
  const choose = async (name: string, option: string) => {
    await userEvent.click(screen.getByRole('combobox', { name }))
    await userEvent.click(await screen.findByRole('option', { name: option }))
  }

  it('una sola: con hora local, la fecha final es la misma y sin días', async () => {
    renderPages([LIST, { method: 'POST', path: SESSIONS, body: [teachingSessions[0]] }])

    const form = await open()
    await userEvent.type(form.getByLabelText('Título'), 'Repaso')
    await userEvent.type(form.getByLabelText('Enlace de la reunión (https, opcional)'), 'https://meet.example/repaso')
    await userEvent.type(form.getByLabelText('Fecha'), '2026-11-20')
    await userEvent.type(form.getByLabelText('Hora local'), '08:00')
    expect(form.getByText(/La hora es local en hora (estándar )?de Perú/)).toBeInTheDocument()
    await userEvent.click(form.getByRole('button', { name: 'Crear la sesión' }))

    await waitFor(() => expect(posted(SESSIONS)).toHaveLength(1))
    expect(posted(SESSIONS)[0]?.body).toEqual({
      title: 'Repaso',
      type: 'TEORIA',
      modality: 'VIRTUAL',
      durationMinutes: 60,
      link: 'https://meet.example/repaso',
      location: null,
      lessonId: null,
      recurrence: { pattern: 'ONCE', days: [], startDate: '2026-11-20', endDate: '2026-11-20', localTime: '08:00' }
    })
    expect(await screen.findByText('Se creó 1 sesión.')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('una serie por días de la semana, presencial', async () => {
    renderPages([LIST, { method: 'POST', path: SESSIONS, body: teachingSessions }])

    const form = await open()
    await userEvent.type(form.getByLabelText('Título'), 'Clase')
    await choose('Modalidad', 'Presencial')
    await userEvent.type(form.getByLabelText('Lugar'), 'Aula 204')
    await choose('Repetición', 'Días de la semana')
    await userEvent.type(form.getByLabelText('Desde'), '2026-11-09')
    await userEvent.type(form.getByLabelText('Hasta'), '2026-11-27')
    await userEvent.type(form.getByLabelText('Hora local'), '18:30')
    await userEvent.click(form.getByRole('button', { name: 'Crear la serie' }))
    // sin días no se envía
    expect(await form.findByText('Elige al menos un día.')).toBeInTheDocument()
    expect(posted(SESSIONS)).toEqual([])

    await userEvent.click(form.getByRole('checkbox', { name: 'Lunes' }))
    await userEvent.click(form.getByRole('checkbox', { name: 'Miércoles' }))
    await userEvent.click(form.getByRole('button', { name: 'Crear la serie' }))

    await waitFor(() => expect(posted(SESSIONS)).toHaveLength(1))
    expect(posted(SESSIONS)[0]?.body).toMatchObject({
      modality: 'PRESENCIAL',
      link: null,
      location: 'Aula 204',
      recurrence: { pattern: 'WEEKDAYS', days: ['MONDAY', 'WEDNESDAY'], startDate: '2026-11-09', endDate: '2026-11-27', localTime: '18:30' }
    })
    expect(await screen.findByText('Se crearon 2 sesiones.')).toBeInTheDocument()
  })

  it('una recuperación lleva la sesión que recupera', async () => {
    renderPages([LIST, { method: 'POST', path: SESSIONS, body: [teachingSessions[0]] }])

    const form = await open()
    await userEvent.type(form.getByLabelText('Título'), 'Recuperación')
    await choose('Tipo', 'Recuperación')
    await userEvent.type(form.getByLabelText('Fecha'), '2026-11-20')
    await userEvent.type(form.getByLabelText('Hora local'), '08:00')
    await userEvent.click(form.getByRole('button', { name: 'Crear la sesión' }))
    expect(await form.findByText('Este dato es obligatorio.')).toBeInTheDocument()
    expect(posted(SESSIONS)).toEqual([])

    await userEvent.click(form.getByRole('combobox', { name: 'Sesión que recupera' }))
    await userEvent.click(await screen.findByRole('option', { name: /^Consulta cancelada/ }))
    await userEvent.click(form.getByRole('button', { name: 'Crear la sesión' }))

    await waitFor(() => expect(posted(SESSIONS)).toHaveLength(1))
    expect(posted(SESSIONS)[0]?.body).toMatchObject({ type: 'RECUPERACION', originalSessionId: 'ses-2' })
  })

  it('valida antes de enviar: obligatorios, enlace https y fechas en orden; un 400 del servidor se explica', async () => {
    renderPages([LIST, { method: 'POST', path: SESSIONS, status: 400, body: problem(400, 'Enlace no admitido') }])

    const form = await open()
    await userEvent.type(form.getByLabelText('Enlace de la reunión (https, opcional)'), 'http://meet.example/x')
    await choose('Repetición', 'Todos los días')
    await userEvent.type(form.getByLabelText('Desde'), '2026-11-20')
    await userEvent.type(form.getByLabelText('Hasta'), '2026-11-10')
    await userEvent.click(form.getByRole('button', { name: 'Crear la serie' }))

    expect(await form.findByText('El enlace debe empezar por https://.')).toBeInTheDocument()
    expect(form.getByText('La fecha final no puede ser anterior a la inicial.')).toBeInTheDocument()
    expect(form.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true')
    expect(form.getByLabelText('Título')).toHaveFocus()
    expect(form.getByLabelText('Título')).toHaveAccessibleDescription('Este dato es obligatorio.')
    expect(posted(SESSIONS)).toEqual([])

    await userEvent.type(form.getByLabelText('Título'), 'Clase')
    await userEvent.clear(form.getByLabelText('Enlace de la reunión (https, opcional)'))
    await userEvent.type(form.getByLabelText('Enlace de la reunión (https, opcional)'), 'https://meet.example/x')
    await userEvent.clear(form.getByLabelText('Hasta'))
    await userEvent.type(form.getByLabelText('Hasta'), '2026-11-30')
    await userEvent.type(form.getByLabelText('Hora local'), '08:00')
    await userEvent.click(form.getByRole('button', { name: 'Crear la serie' }))

    expect(await form.findByText('El servidor rechazó los datos: Enlace no admitido')).toBeInTheDocument()
  })
})

describe('salir con un formulario de sesión a medias', () => {
  const OTHER_SESSIONS = `${OFFERINGS}/${otherOffering.code}/sessions`
  const routes = (): MockRoute[] => [{ path: OFFERINGS, body: [offering, otherOffering] }, LIST, { path: OTHER_SESSIONS, body: [] }]
  const write = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Programar sesión' }))
    const form = within(await screen.findByRole('form', { name: 'Crear una sesión o una serie' }))
    await userEvent.type(form.getByLabelText('Título'), 'Repaso')
    return form
  }
  const asked = () => screen.findByRole('dialog', { name: '¿Salir sin guardar?' })

  it('un formulario abierto sin escribir no avisa', async () => {
    renderPages(routes())
    await userEvent.click(await screen.findByRole('button', { name: 'Programar sesión' }))
    await screen.findByRole('form', { name: 'Crear una sesión o una serie' })

    await userEvent.click(screen.getByRole('link', { name: 'Matriculados' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('una pestaña avisa, y seguir aquí no pierde lo escrito', async () => {
    renderPages(routes())
    const form = await write()

    await userEvent.click(screen.getByRole('link', { name: 'Matriculados' }))
    await userEvent.click(within(await asked()).getByRole('button', { name: 'Seguir aquí' }))

    expect(form.getByLabelText('Título')).toHaveValue('Repaso')
    expect(screen.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('aria-current', 'page')
  })

  it('la ruta y «Pasar asistencia» también avisan', async () => {
    renderPages(routes())
    await write()

    await userEvent.click(screen.getByRole('link', { name: 'Mis ediciones' }))
    await userEvent.click(within(await asked()).getByRole('button', { name: 'Seguir aquí' }))
    await userEvent.click(screen.getByRole('link', { name: 'Pasar asistencia de «Presentación del curso»' }))
    expect(await asked()).toBeInTheDocument()
  })

  it('cambiar de edición avisa, y salir a sabiendas lleva a la misma sección de la otra', async () => {
    renderPages(routes())
    await write()
    const box = screen.getByRole('combobox', { name: 'Cambiar de edición' })
    box.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await screen.findByRole('option', { name: /Licencias de anuncios con SRTM/ }))

    await userEvent.click(within(await asked()).getByRole('button', { name: 'Salir sin guardar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('cerrar el formulario lo descarta sin salir de la pantalla, y crear deja de avisar', async () => {
    renderPages(routes())
    await write()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sin crear' }))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Matriculados' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('pasar asistencia', () => {
  const route = `/docencia/${CODE}/sesiones/ses-1/asistencia`
  const group = (name: string) => within(screen.getByRole('group', { name: `Asistencia de ${name}` }))
  const mark = (student: string, name: string) => group(student).getByRole('button', { name })

  it('registrar por primera vez no pide motivo y solo envía lo que cambió', async () => {
    renderPages(
      [
        LIST,
        { path: ATTENDANCE, body: attendanceRows },
        { method: 'PUT', path: ATTENDANCE, body: attendanceRows.map((row) => ({ ...row, status: 'PRESENTE' })) }
      ],
      route
    )

    await screen.findByRole('list', { name: 'Asistencia' })
    expect(await screen.findByText('Presentación del curso')).toBeInTheDocument()
    expect(mark('ana.torres@demo.local', 'Presente')).toHaveAttribute('aria-pressed', 'true')
    expect(mark('estudiante@demo.local', 'Presente')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Sin marcar', { selector: 'li *' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar la asistencia' })).toBeDisabled()
    await userEvent.click(mark('estudiante@demo.local', 'Presente'))
    expect(screen.queryByLabelText('Motivo del cambio')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))

    await waitFor(() => expect(posted(ATTENDANCE)).toHaveLength(1))
    expect(posted(ATTENDANCE)[0]?.body).toEqual({ records: [{ enrollmentId: 'mat-sgspe-1', status: 'PRESENTE' }], reason: null })
    expect(await screen.findByText('Asistencia guardada')).toBeInTheDocument()
  })

  it('cambiar una ya registrada exige motivo: sin él no se envía', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }, { method: 'PUT', path: ATTENDANCE, body: attendanceRows }], route)

    await screen.findByRole('list', { name: 'Asistencia' })
    await userEvent.click(mark('ana.torres@demo.local', 'Justificada'))
    const reason = screen.getByLabelText('Motivo del cambio')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Indica un motivo')
    expect(reason).toHaveAttribute('aria-invalid', 'true')
    expect(posted(ATTENDANCE)).toEqual([])

    await userEvent.type(reason, 'Presentó constancia')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))

    await waitFor(() => expect(posted(ATTENDANCE)).toHaveLength(1))
    expect(posted(ATTENDANCE)[0]?.body).toEqual({ records: [{ enrollmentId: 'mat-sgspe-2', status: 'JUSTIFICADO' }], reason: 'Presentó constancia' })
  })

  it('pulsar otra vez lo marcado sin guardar lo deshace', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }], route)

    await screen.findByRole('list', { name: 'Asistencia' })
    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    expect(mark('estudiante@demo.local', 'Tarde')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    expect(mark('estudiante@demo.local', 'Tarde')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Guardar la asistencia' })).toBeDisabled()
  })

  it('el resumen cuenta por estado y dice cuánto queda sin guardar', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }], route)

    const summary = within(await screen.findByRole('region', { name: 'Resumen de la asistencia' }))
    const figure = (label: string) => summary.getByText(label).parentElement!.querySelector('dd')!.textContent
    expect(figure('Presente')).toBe('1')
    expect(figure('Sin marcar')).toBe('1')
    expect(screen.getByText('Todo guardado')).toBeInTheDocument()

    await userEvent.click(mark('estudiante@demo.local', 'Ausente'))

    expect(figure('Ausente')).toBe('1')
    expect(figure('Sin marcar')).toBe('0')
    expect(screen.getByText('1 cambio sin guardar')).toBeInTheDocument()
  })

  it('«Marcar a todos presentes» no envía nada ni pisa lo ya marcado', async () => {
    const rows = [...attendanceRows, { enrollmentId: 'mat-3', email: 'tercero@demo.local', status: 'AUSENTE' }]
    renderPages([LIST, { path: ATTENDANCE, body: rows }, { method: 'PUT', path: ATTENDANCE, body: rows }], route)

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar a todos presentes' }))

    expect(posted(ATTENDANCE)).toEqual([])
    expect(mark('estudiante@demo.local', 'Presente')).toHaveAttribute('aria-pressed', 'true')
    expect(mark('tercero@demo.local', 'Ausente')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('Motivo del cambio')).not.toBeInTheDocument()
    expect(screen.getByText(/Solo cambia a quienes siguen sin marcar/)).toBeInTheDocument()
    // ya no queda a quién marcar
    expect(screen.getByRole('button', { name: 'Marcar a todos presentes' })).toBeDisabled()
  })

  it('un fallo al guardar lo dice con un aviso, no pierde lo marcado y se puede reintentar', async () => {
    const routes: MockRoute[] = [
      LIST,
      { path: ATTENDANCE, body: attendanceRows },
      { method: 'PUT', path: ATTENDANCE, status: 500, body: problem(500, 'fallo') }
    ]
    renderPages(routes, route)

    await screen.findByRole('list', { name: 'Asistencia' })
    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))

    expect(await screen.findByText(/No se guardó\. Lo que marcaste sigue aquí/)).toBeInTheDocument()
    expect(mark('estudiante@demo.local', 'Tarde')).toHaveAttribute('aria-pressed', 'true')

    routes[2] = { method: 'PUT', path: ATTENDANCE, body: attendanceRows.map((row) => ({ ...row, status: row.status ?? 'TARDE' })) }
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))
    expect(await screen.findByText('Asistencia guardada')).toBeInTheDocument()
  })

  it('salir con marcas sin guardar avisa; sin cambios, no', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }], route)

    await screen.findByRole('list', { name: 'Asistencia' })
    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    await userEvent.click(screen.getByRole('link', { name: '← Sesiones de la edición' }))
    const dialog = within(await screen.findByRole('dialog', { name: '¿Salir sin guardar?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Seguir aquí' }))
    expect(mark('estudiante@demo.local', 'Tarde')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    await userEvent.click(screen.getByRole('link', { name: '← Sesiones de la edición' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Programar sesión' })).toBeInTheDocument()
  })

  it('un 409 se explica; una sesión ajena (404) también; un contrato roto deja reintentar', async () => {
    const first = renderPages(
      [LIST, { path: ATTENDANCE, body: attendanceRows }, { method: 'PUT', path: ATTENDANCE, status: 409, body: problem(409, 'Falta el motivo') }],
      route
    )
    await screen.findByRole('list', { name: 'Asistencia' })
    await userEvent.click(mark('estudiante@demo.local', 'Tarde'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor no lo aceptó: Falta el motivo')
    first.unmount()
    fetchMock.restore()

    const second = renderPages([LIST, { path: ATTENDANCE, status: 404, body: problem(404, 'No existe') }], route)
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta sesión no es de tus ediciones')
    second.unmount()
    fetchMock.restore()

    renderPages([LIST, { path: ATTENDANCE, body: [{ ...attendanceRows[0], status: 'QUIZAS' }] }], route)
    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }], route, 'en')

    expect(await screen.findByRole('list', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Attendance of ana.torres@demo.local' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save the attendance' })).toBeDisabled()
  })
})
