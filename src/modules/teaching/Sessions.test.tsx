import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AttendancePage } from './AttendancePage'
import { teachingModule } from './module'
import { OfferingSessionsPage } from './OfferingSessionsPage'
import { attendanceRows, offering, problem, teachingSessions } from './test/fixtures'

// sesiones y asistencia de una edición (ADR-0016)

const CODE = 'edicion-sgspe-2026-09'
const OFFERINGS = '/lms/teaching/offerings'
const SESSIONS = `${OFFERINGS}/${CODE}/sessions`
const SESSION = '/lms/teaching/sessions/ses-1'
const ATTENDANCE = `${SESSION}/attendance`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderPages(routes: MockRoute[], route = `/docencia/${CODE}/sesiones`, language?: string) {
  fetchMock = mockFetch([{ path: OFFERINGS, body: [offering] }, ...routes])
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
    expect(active.getByText(/10 de noviembre de 2026, 8:00.9:30/)).toBeInTheDocument()
    expect(await screen.findByText(/^Horas en hora (estándar )?de Perú$/)).toBeInTheDocument()
    expect(active.getByRole('link', { name: 'Pasar asistencia de «Presentación del curso»' })).toHaveAttribute(
      'href',
      `/docencia/${CODE}/sesiones/ses-1/asistencia`
    )
    expect(active.getByRole('link', { name: /Abrir el enlace/ })).toHaveAttribute('href', 'https://meet.example/sgspe-1')
    const cancelled = within(screen.getByRole('article', { name: 'Consulta cancelada' }))
    expect(cancelled.getByText('Cancelada')).toBeInTheDocument()
    expect(cancelled.queryByRole('button')).not.toBeInTheDocument()
    expect(cancelled.queryByRole('link')).not.toBeInTheDocument()
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
    expect(dialog.getByText(/Se avisará a los matriculados/)).toBeInTheDocument()
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
    await userEvent.click(await screen.findByRole('button', { name: 'Crear sesiones' }))
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

describe('pasar asistencia', () => {
  const route = `/docencia/${CODE}/sesiones/ses-1/asistencia`
  const group = (name: string) => within(screen.getByRole('radiogroup', { name: `Asistencia de ${name}` }))

  it('registrar por primera vez no pide motivo y solo envía lo que cambió', async () => {
    renderPages(
      [
        LIST,
        { path: ATTENDANCE, body: attendanceRows },
        { method: 'PUT', path: ATTENDANCE, body: attendanceRows.map((row) => ({ ...row, status: 'PRESENTE' })) }
      ],
      route
    )

    await screen.findByRole('table', { name: 'Asistencia' })
    expect(await screen.findByText('Presentación del curso')).toBeInTheDocument()
    expect(group('ana.torres@demo.local').getByRole('radio', { name: 'Presente' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Guardar la asistencia' })).toBeDisabled()
    await userEvent.click(group('estudiante@demo.local').getByRole('radio', { name: 'Presente' }))
    expect(screen.queryByLabelText('Motivo del cambio')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar la asistencia' }))

    await waitFor(() => expect(posted(ATTENDANCE)).toHaveLength(1))
    expect(posted(ATTENDANCE)[0]?.body).toEqual({ records: [{ enrollmentId: 'mat-sgspe-1', status: 'PRESENTE' }], reason: null })
    expect(await screen.findByText('Asistencia guardada')).toBeInTheDocument()
  })

  it('cambiar una ya registrada exige motivo: sin él no se envía', async () => {
    renderPages([LIST, { path: ATTENDANCE, body: attendanceRows }, { method: 'PUT', path: ATTENDANCE, body: attendanceRows }], route)

    await screen.findByRole('table', { name: 'Asistencia' })
    await userEvent.click(group('ana.torres@demo.local').getByRole('radio', { name: 'Justificado' }))
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

  it('un 409 se explica; una sesión ajena (404) también; un contrato roto deja reintentar', async () => {
    const first = renderPages(
      [LIST, { path: ATTENDANCE, body: attendanceRows }, { method: 'PUT', path: ATTENDANCE, status: 409, body: problem(409, 'Falta el motivo') }],
      route
    )
    await screen.findByRole('table', { name: 'Asistencia' })
    await userEvent.click(group('estudiante@demo.local').getByRole('radio', { name: 'Tarde' }))
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

    expect(await screen.findByRole('table', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Attendance of ana.torres@demo.local' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save the attendance' })).toBeDisabled()
  })
})
