import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { teachingModule } from './module'
import { RosterPage } from './RosterPage'
import { offering, otherOffering, problem, roster } from './test/fixtures'

const OFFERINGS = '/lms/teaching/offerings'
const STUDENTS = `${OFFERINGS}/edicion-sgspe-2026-09/students`

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderRoster(routes: MockRoute[], code = 'edicion-sgspe-2026-09', language?: string) {
  fetchMock = mockFetch(routes)
  return renderWithProviders(<RosterPage />, { modules: [teachingModule()], route: `/docencia/${code}`, path: '/docencia/:code', language })
}

describe('RosterPage: matriculados de una edición', () => {
  it('muestra cada matriculado con su progreso, su asistencia y sus evaluaciones', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: roster }
    ])

    expect(await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: '2 matriculados' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Estudiante', 'Matrícula', 'Progreso', 'Asistencia', 'Evaluaciones'])
    const rows = within(table).getAllByRole('row').slice(1)
    // por correo
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['ana.torres@demo.local', 'estudiante@demo.local'])
    const pending = within(rows[1]!)
    expect(pending.getByText('Activa')).toBeInTheDocument()
    expect(pending.getByText('33 % (1 de 3 lecciones)')).toBeInTheDocument()
    expect(pending.getByText('1 de 2 sesiones')).toBeInTheDocument()
    expect(pending.getByText('Evaluación final')).toBeInTheDocument()
    expect(pending.getByText('Pendiente de corrección')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('85 %, aprobada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mis ediciones' })).toHaveAttribute('href', '/docencia')
  })

  it('una matrícula sin correo (anterior a que se guardara) no rompe la lista, y sin asistencia ni evaluaciones todavía lo dice', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [{ ...roster[0], email: null, attendance: { attended: 0, total: 0 }, assessments: [] }, roster[1]] }
    ])

    const table = await screen.findByRole('table', { name: '2 matriculados' })
    const rows = within(table).getAllByRole('row').slice(1)
    // quien no tiene correo va al final
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['ana.torres@demo.local', 'Sin correo registrado'])
    expect(within(rows[1]!).getByText('Sin sesiones aún')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Sin evaluaciones')).toBeInTheDocument()
  })

  it('con el nombre de cada matriculado: el nombre delante y el correo debajo, también en «Menor avance» y en las tarjetas', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [{ ...roster[0], name: 'Rosa Estudiante' }, roster[1]] }
    ])

    const table = await screen.findByRole('table', { name: '2 matriculados' })
    const header = within(table).getByRole('rowheader', { name: /Rosa Estudiante/ })
    expect(within(header).getByText('Rosa Estudiante')).toBeInTheDocument()
    expect(within(header).getByText(String(roster[0]!.email))).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'Rosa Estudiante' })).toBeInTheDocument()
  })

  it('una edición ajena (404) se explica: solo se ven las asignadas', async () => {
    renderRoster(
      [
        { path: OFFERINGS, body: [offering] },
        { path: /^\/lms\/teaching\/offerings\/ajena\/students$/, status: 404, body: problem(404, 'No existe') }
      ],
      'ajena'
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Esta edición no está entre las tuyas')
    expect(alert).toHaveTextContent('Solo ves las ediciones que tienes asignadas como docente.')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Edición' })).toBeInTheDocument()
    // sin secciones a las que ir, pero con la vuelta a las suyas
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Secciones de la edición' })).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Mis ediciones' })).toHaveAttribute('href', '/docencia')
  })

  it('sin matriculados lo dice', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [] }
    ])

    expect(await screen.findByText('Esta edición aún no tiene matriculados.')).toBeInTheDocument()
  })

  it('un error o un contrato roto se explican y dejan reintentar', async () => {
    renderRoster([
      { path: OFFERINGS, body: [offering] },
      { path: STUDENTS, body: [{ ...roster[0], attendance: { attended: 5, total: 2 } }] }
    ])

    expect(await screen.findByText('No pudimos leer la respuesta del servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    renderRoster(
      [
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ],
      undefined,
      'en'
    )

    expect(await screen.findByRole('table', { name: '2 students' })).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('33% (1 of 3 lessons)')).toBeInTheDocument()
    expect(within(table).getByText('Awaiting grading')).toBeInTheDocument()
  })

  describe('el marco de la edición', () => {
    const CODE = offering.code
    const OTHER = otherOffering.code

    function Where() {
      return <output aria-label="ruta">{useLocation().pathname}</output>
    }

    it('lleva a sus secciones por URL, con la cifra de lo que hay por corregir, y marca dónde se está', async () => {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ])

      const tabs = within(await screen.findByRole('navigation', { name: 'Secciones de la edición' }))
      expect(await tabs.findByRole('link', { name: 'Corrección (1)' })).toHaveAttribute('href', `/docencia/${CODE}/correccion`)
      expect(tabs.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', `/docencia/${CODE}/sesiones`)
      expect(tabs.getByRole('link', { name: 'Matriculados' })).toHaveAttribute('aria-current', 'page')
    })

    it('sin nada por corregir la pestaña no da cifra; y dice el estado, el código y las fechas de la edición', async () => {
      renderRoster([
        { path: OFFERINGS, body: [{ ...offering, pendingAttempts: 0 }] },
        { path: STUDENTS, body: roster }
      ])

      const header = within(screen.getByRole('banner'))
      expect(await header.findByText('En curso')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Corrección' })).toBeInTheDocument()
      expect(header.getByText('SGSPE-101')).toBeInTheDocument()
      expect(header.getByText('7 sept – 16 oct 2026')).toBeInTheDocument()
    })

    it('con una sola edición no ofrece cambiar de edición', async () => {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ])

      await screen.findByRole('heading', { level: 1, name: 'Introducción al SGSPE' })
      expect(screen.queryByRole('combobox', { name: 'Cambiar de edición' })).not.toBeInTheDocument()
    })

    it('el selector de edición navega a la misma sección de la otra', async () => {
      fetchMock = mockFetch([
        { path: OFFERINGS, body: [offering, otherOffering] },
        { path: STUDENTS, body: roster },
        { path: `${OFFERINGS}/${OTHER}/students`, body: [] }
      ])
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderWithProviders(
        <>
          <Where />
          <RosterPage />
        </>,
        { modules: [teachingModule()], route: `/docencia/${CODE}`, path: '/docencia/:code' }
      )

      const box = await screen.findByRole('combobox', { name: 'Cambiar de edición' })
      expect(box).toHaveTextContent('Introducción al SGSPE')
      box.focus()
      await user.keyboard('{Enter}')
      await user.click(await screen.findByRole('option', { name: /Licencias de anuncios con SRTM/ }))

      await waitFor(() => expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(`/docencia/${OTHER}`))
      expect(await screen.findByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeInTheDocument()
    })
  })

  describe('el resumen', () => {
    it('da las cifras del roster y explica el avance medio', async () => {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ])

      const summary = within(await screen.findByRole('region', { name: 'Resumen de la edición' }))
      const figure = (label: string) => summary.getByText(label).parentElement!.querySelector('dd')!.textContent
      expect(figure('Matriculados')).toBe('2')
      expect(figure('Avance medio')).toBe('67 %')
      expect(summary.getByText('Media del avance de cada estudiante, redondeada.')).toBeInTheDocument()
      expect(figure('Asistencia')).toBe('3 de 4')
      expect(figure('Evaluaciones por corregir')).toBe('1')
    })

    it('no da cifras que no sabe: sin lecciones, sesiones ni evaluaciones, solo los matriculados', async () => {
      const bare = { ...roster[0], progress: { completedLessons: 0, totalLessons: 0, percent: 0 }, attendance: { attended: 0, total: 0 }, assessments: [] }
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: [bare] }
      ])

      const summary = within(await screen.findByRole('region', { name: 'Resumen de la edición' }))
      expect(summary.getByText('Matriculados')).toBeInTheDocument()
      expect(summary.queryByText('Avance medio')).not.toBeInTheDocument()
      expect(summary.queryByText('Asistencia')).not.toBeInTheDocument()
      expect(summary.queryByText('Evaluaciones por corregir')).not.toBeInTheDocument()
    })
  })

  describe('la tabla', () => {
    const many = [
      { ...roster[0], enrollmentId: 'a', email: 'ana@demo.local', progress: { completedLessons: 3, totalLessons: 3, percent: 100 }, assessments: [] },
      { ...roster[0], enrollmentId: 'b', email: 'beto@demo.local', progress: { completedLessons: 1, totalLessons: 3, percent: 33 }, assessments: [] },
      { ...roster[1], enrollmentId: 'c', email: 'carla@otra.local', progress: { completedLessons: 2, totalLessons: 3, percent: 67 } },
      { ...roster[0], enrollmentId: 'd', email: 'dario@demo.local', progress: { completedLessons: 0, totalLessons: 3, percent: 0 } }
    ]
    const shownEmails = () =>
      within(screen.getByRole('table'))
        .getAllByRole('rowheader')
        .map((header) => header.textContent)

    async function renderMany() {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: many }
      ])
      await screen.findByRole('table')
      return userEvent.setup({ pointerEventsCheck: 0 })
    }

    it('ordena con un botón en el encabezado y lo dice con aria-sort', async () => {
      const user = await renderMany()
      const table = within(screen.getByRole('table'))
      const header = (name: string) => table.getByRole('columnheader', { name })

      expect(header('Estudiante')).toHaveAttribute('aria-sort', 'ascending')
      await user.click(within(header('Progreso')).getByRole('button', { name: 'Progreso' }))
      expect(header('Progreso')).toHaveAttribute('aria-sort', 'ascending')
      expect(header('Estudiante')).not.toHaveAttribute('aria-sort')
      expect(shownEmails()).toEqual(['dario@demo.local', 'beto@demo.local', 'carla@otra.local', 'ana@demo.local'])

      await user.click(within(header('Progreso')).getByRole('button', { name: 'Progreso' }))
      expect(header('Progreso')).toHaveAttribute('aria-sort', 'descending')
      expect(shownEmails()[0]).toBe('ana@demo.local')
    })

    it('busca por correo y dice cuántos quedan', async () => {
      const user = await renderMany()

      await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'OTRA')

      expect(shownEmails()).toEqual(['carla@otra.local'])
      expect(screen.getByText('1 de 4 matriculados')).toBeInTheDocument()
    })

    it('filtra por estado y por lo que hay por corregir, con su recuento y su estado pulsado', async () => {
      const user = await renderMany()
      const filters = within(screen.getByRole('group', { name: 'Filtrar matriculados' }))

      expect(filters.getByRole('button', { name: 'Todos (4)' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(filters.getByRole('button', { name: 'Finalizada (1)' }))
      expect(shownEmails()).toEqual(['carla@otra.local'])
      expect(filters.getByRole('button', { name: 'Finalizada (1)' })).toHaveAttribute('aria-pressed', 'true')

      await user.click(filters.getByRole('button', { name: 'Con evaluación por corregir (1)' }))
      expect(shownEmails()).toEqual(['dario@demo.local'])
    })

    it('sin resultados lo dice y deja quitar los filtros', async () => {
      const user = await renderMany()

      await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'nadie')

      expect(screen.getByText('Nadie coincide con la búsqueda')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Quitar los filtros' }))
      expect(shownEmails()).toHaveLength(4)
      expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' })).toHaveValue('')
    })

    it('las tarjetas traen lo mismo y su orden se elige con una lista', async () => {
      const user = await renderMany()
      const cards = () => within(screen.getByRole('list', { name: '4 matriculados' })).getAllByRole('listitem', { name: /@/ })

      expect(cards().map((card) => within(card).getByText(/@/).textContent)).toEqual([
        'ana@demo.local',
        'beto@demo.local',
        'carla@otra.local',
        'dario@demo.local'
      ])
      expect(within(cards()[1]!).getByText('33 % (1 de 3 lecciones)')).toBeInTheDocument()
      expect(within(cards()[1]!).getByText('1 de 2 sesiones')).toBeInTheDocument()

      screen.getByRole('combobox', { name: 'Ordenar por' }).focus()
      await user.keyboard('{Enter}')
      await user.click(await screen.findByRole('option', { name: 'Menor avance primero' }))
      expect(within(cards()[0]!).getByText('dario@demo.local')).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(within(screen.getByRole('columnheader', { name: 'Progreso' })).getByRole('button')).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Progreso' })).toHaveAttribute('aria-sort', 'ascending')
    })

    const active = many.map((student) => ({ ...student, status: 'ACTIVA' }))

    it('«Menor avance» ordena por la cifra real, con una acción directa y sin etiquetas de nivel', async () => {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: active }
      ])
      await screen.findByRole('table')

      const section = within(screen.getByRole('region', { name: 'Menor avance' }))
      const rows = section.getAllByRole('listitem')
      expect(rows.map((row) => within(row).getByText(/@/).textContent)).toEqual(['dario@demo.local', 'beto@demo.local', 'carla@otra.local'])
      expect(within(rows[0]!).getByText('0 % (0 de 3 lecciones)')).toBeInTheDocument()
      expect(within(rows[0]!).getByRole('link', { name: 'Escribir a dario@demo.local' })).toHaveAttribute('href', 'mailto:dario@demo.local')
    })

    it('el enlace de correo no deja colar parámetros', async () => {
      const crafted = active.map((student, index) => (index === 3 ? { ...student, email: 'a@b.pe?bcc=x@y.pe' } : student))
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: crafted }
      ])

      const link = await screen.findByRole('link', { name: /Escribir a a@b/ })
      expect(link.getAttribute('href')).toBe('mailto:a@b.pe%3Fbcc%3Dx%40y.pe')
    })

    it('con pocos estudiantes «Menor avance» no sale: lo dice la tabla', async () => {
      renderRoster([
        { path: OFFERINGS, body: [offering] },
        { path: STUDENTS, body: roster }
      ])

      await screen.findByRole('table')
      expect(screen.queryByRole('region', { name: 'Menor avance' })).not.toBeInTheDocument()
    })
  })
})
