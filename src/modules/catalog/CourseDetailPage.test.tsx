import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { CourseDetailPage } from './CourseDetailPage'
import { catalogModule } from './module'
import { courseDetail, problem } from './test/fixtures'
import { learningGroup } from './test/learningGroup'

const COURSE = '/lms/public/catalog/courses/srtm-anuncios'
let fetchMock: FetchMock

afterEach(() => fetchMock?.restore())

function renderCourse(routes: MockRoute[], route = '/cursos/srtm-anuncios') {
  fetchMock = mockFetch(routes)
  return renderWithProviders(
    <Routes>
      <Route path="/cursos" element={<p>catálogo</p>} />
      <Route path="/cursos/:slug" element={<CourseDetailPage />} />
    </Routes>,
    { modules: [catalogModule(), learningGroup], route, user: null, permissions: null }
  )
}

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!

// docs/api/lms.md: el resumen, las horas de una unidad y los minutos de una lección pueden ser null
const withNulls = {
  ...courseDetail,
  summary: null,
  units: courseDetail.units.map((unit, u) => ({
    ...unit,
    estimatedHours: u === 0 ? null : unit.estimatedHours,
    lessons: unit.lessons.map((lesson, l) => (u === 0 && l === 0 ? { ...lesson, durationMinutes: null } : lesson))
  }))
}

describe('CourseDetailPage', () => {
  it('admite los nulos del contrato sin pintar «null» ni datos vacíos', async () => {
    renderCourse([{ path: COURSE, body: withNulls }])

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.queryByText(/null|NaN|undefined/)).not.toBeInTheDocument()
    const firstUnit = within(section('Temario')).getAllByRole('listitem')[0]!
    expect(within(firstUnit).queryByText(/h estimadas/)).not.toBeInTheDocument()
    expect(within(firstUnit).queryByText(/\bmin\b/)).toBeInTheDocument()
    expect(within(firstUnit).getByText(courseDetail.units[0]!.lessons[0]!.title).closest('li')?.textContent).not.toMatch(/min/)
  })

  it('pinta el hueco de la ficha mientras carga, con su aviso', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(screen.getByRole('status')).toHaveTextContent('Cargando el curso…')
    expect(document.querySelector('[data-slot="course-skeleton"]')).not.toBeNull()
    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="course-skeleton"]')).toBeNull()
  })

  it('la cabecera lleva los hechos del contrato, sin banda decorativa', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(document.querySelector('[data-slot="cord-banner"]')).toBeNull()
    for (const [label, value] of [
      ['Duración', '6 semanas · 216 h'],
      ['Créditos', '8 ECTS, propuesta'],
      ['Modalidad', 'Asíncrona'],
      ['Nivel', 'Inicial'],
      ['Idioma', 'español']
    ]) {
      const term = screen.getAllByText(label!, { selector: 'dt' }).find((dt) => dt.nextElementSibling?.textContent === value)
      expect(term, `${label}: ${value}`).toBeDefined()
    }
    // la categoría, sin mayúsculas sostenidas
    expect(screen.getByText('Gestión municipal')).not.toHaveClass('uppercase')
  })

  it('con créditos aprobados, la cabecera da la cifra aprobada; sin sistema, no habla de ellos', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, approved: 7.5 } } }])
    expect(await screen.findByText('7,5 ECTS')).toBeInTheDocument()
    expect(screen.queryByText(/propuesta/)).not.toBeInTheDocument()
  })

  it('«Cómo se calculó» se conserva, abajo y plegado, junto a la carga de trabajo', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])
    await screen.findByRole('heading', { level: 1, name: courseDetail.title })

    const how = within(section('Carga de trabajo y créditos')).getByText('Cómo se calculó')
    expect(how.tagName).toBe('SUMMARY')
    expect(how.closest('details')).not.toHaveAttribute('open')
  })

  it('pinta la ficha completa', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.getByText(courseDetail.summary)).toBeInTheDocument()
    expect(screen.getByText('Contenido ilustrativo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Catálogo' })).toHaveAttribute('href', '/cursos')
    expect(screen.getByText('6 semanas · 216 h')).toBeInTheDocument()
    expect(screen.getByText('español')).toBeInTheDocument()
    expect(screen.getByText(/^1, publicada el 20 oct 2026$/)).toBeInTheDocument()

    expect(within(section('Qué aprenderás')).getByText('Registrar una solicitud de licencia')).toBeInTheDocument()
    expect(within(section('Qué aprenderás')).getByText('Tramita una licencia de anuncio de principio a fin')).toBeInTheDocument()
    expect(within(section('Antes de empezar')).getByText('Manejo básico de hoja de cálculo.')).toBeInTheDocument()
    expect(within(section('Antes de empezar')).getByText('Cuenta de usuario en SRTM de pruebas.')).toBeInTheDocument()

    const syllabus = within(section('Temario'))
    expect(syllabus.getByRole('heading', { level: 3, name: 'Unidad 1. El trámite de anuncios' })).toBeInTheDocument()
    expect(syllabus.getByText('2 lecciones · 6 h estimadas')).toBeInTheDocument()
    expect(syllabus.getByText('Lectura · 30 min')).toBeVisible()
    expect(syllabus.getByText('Vídeo · 15 min')).toBeVisible()

    const offerings = within(section('Ediciones'))
    expect(offerings.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(offerings.getByText('15 oct – 6 nov 2026')).toBeInTheDocument()
    expect(offerings.getByText('30 plazas')).toBeInTheDocument()
    expect(offerings.getByText('Martes y jueves, 18:00–20:00')).toBeInTheDocument()
    expect(offerings.getByText(/\(America\/Lima\)$/)).toBeInTheDocument()
    expect(offerings.getByText('Ana Quispe (titular)')).toBeInTheDocument()

    expect(within(section('Docentes')).getByText('Diez años en rentas municipales.')).toBeInTheDocument()

    const workload = within(section('Carga de trabajo y créditos'))
    const table = workload.getByRole('table', { name: 'Horas en 6 semanas' })
    expect(within(table).getByRole('row', { name: 'Teoría 12 72' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Total 36 216' })).toBeInTheDocument()
    // horas de contacto y dirigidas
    expect(workload.getAllByText('144 h', { selector: 'dd' })).toHaveLength(2)

    expect(within(section('Evaluación y certificación')).getByText('Constancia de participación.')).toBeInTheDocument()
    expect(within(section('Fuentes')).getByText('Manual de usuario SRTM, módulo de anuncios')).toBeInTheDocument()
  })

  // RF-CAT-08: las claves que declaró la versión publicada, junto al texto libre
  it('nombra los conocimientos previos declarados, y sin texto libre también abre «Antes de empezar»', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, prerequisiteKnowledge: null, requirements: null } }])

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    const before = within(section('Antes de empezar'))
    expect(before.getByRole('list', { name: 'Conocimientos previos' })).toBeInTheDocument()
    expect(before.getByRole('listitem')).toHaveTextContent('Hoja de cálculo')
  })

  it('sin conocimientos previos ni requisitos no hay «Antes de empezar»', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, prerequisiteKnowledge: null, requirements: null, prerequisiteKnowledgeTags: [] } }])

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Antes de empezar' })).not.toBeInTheDocument()
  })

  it('créditos propuestos: dice que no son oficiales y enseña el método solo bajo demanda', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: COURSE, body: courseDetail }])

    expect(await screen.findByText('8 créditos ECTS propuestos — no oficiales')).toBeInTheDocument()
    const method = screen.getByText(courseDetail.credits.proposal.method)
    expect(method).not.toBeVisible()
    expect(screen.queryByText('Avisos de la propuesta')).not.toBeInTheDocument()

    await user.click(screen.getByText('Cómo se calculó'))

    expect(method).toBeVisible()
    expect(screen.getByText('Guía ECTS 2015, sección 4')).toBeVisible()
    expect(screen.getByText('horasPorCredito = 27, paso = 0.5')).toBeVisible()
    expect(screen.getByText('ects-carga-total, versión 1')).toBeVisible()
  })

  it('muestra los avisos de la propuesta', async () => {
    const proposal = { ...courseDetail.credits.proposal, calculated: 7.6, proposed: 7.5, warnings: ['La carga no es múltiplo exacto de las horas por crédito'] }
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, proposal } } }])

    expect(await screen.findByText('7,5 créditos ECTS propuestos — no oficiales')).toBeInTheDocument()
    expect(screen.getByText('La carga no es múltiplo exacto de las horas por crédito')).toBeVisible()
  })

  it('créditos aprobados: solo la cifra aprobada, sin «no oficiales»', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, approved: 7.5 } } }])

    expect(await screen.findByText('Créditos aprobados: 7,5 ECTS')).toBeInTheDocument()
    expect(screen.queryByText(/no oficial/)).not.toBeInTheDocument()
    expect(screen.queryByText('Cómo se calculó')).not.toBeInTheDocument()
  })

  it('sin sistema de créditos no habla de créditos', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { system: null, approved: null, proposal: null } } }])

    expect(await screen.findByRole('heading', { level: 2, name: 'Carga de trabajo' })).toBeInTheDocument()
    expect(screen.queryByText(/crédito/i)).not.toBeInTheDocument()
  })

  it('el temario abre solo la primera unidad, en un desplegable nativo, con sus contadores y sin avance', async () => {
    const user = userEvent.setup()
    const second = {
      ...courseDetail.units[0]!,
      order: 2,
      title: 'La liquidación',
      estimatedHours: null,
      lessons: [{ ...courseDetail.units[0]!.lessons[0]!, order: 1, title: 'Emitir la liquidación', type: 'EVALUACION', durationMinutes: null }]
    }
    renderCourse([{ path: COURSE, body: { ...courseDetail, units: [second, courseDetail.units[0]] } }])

    // por orden de unidad, no por el de la respuesta
    const first = await screen.findByText('Tipos de anuncio')
    expect(first).toBeVisible()
    const syllabus = within(section('Temario'))
    expect(syllabus.getByText('2 unidades y 3 lecciones')).toBeInTheDocument()
    expect(syllabus.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Unidad 1. El trámite de anuncios',
      'Unidad 2. La liquidación'
    ])

    const lesson = syllabus.getByText('Emitir la liquidación')
    expect(lesson).not.toBeVisible()
    expect(syllabus.getByText('1 lección')).toBeVisible()

    // <details>/<summary> nativo: el navegador lo abre con Enter o Espacio; jsdom solo implementa el clic
    await user.click(syllabus.getByRole('heading', { level: 3, name: 'Unidad 2. La liquidación' }))
    expect(lesson).toBeVisible()
    expect(syllabus.getByText('Evaluación')).toBeVisible()

    // público: ni enlaces a las lecciones ni estados de avance
    expect(syllabus.queryByRole('link')).not.toBeInTheDocument()
    expect(syllabus.queryByText(/completada|pendiente/i)).not.toBeInTheDocument()
  })

  it('sin ediciones lo dice con un aviso, sin ofrecer «Avisarme» ni ninguna acción', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, offerings: [] } }])
    await screen.findByRole('heading', { level: 1, name: courseDetail.title })

    const offerings = section('Ediciones')
    expect(offerings).toHaveTextContent('Sin ediciones programadas por ahora')
    expect(within(offerings).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/avisarme/i)).not.toBeInTheDocument()
  })

  it('un 404 es «Curso no encontrado» con vuelta al catálogo', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: '/lms/public/catalog/courses/no-existe', status: 404, body: problem(404, 'Curso no encontrado') }], '/cursos/no-existe')

    expect(await screen.findByRole('heading', { level: 1, name: 'Curso no encontrado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '← Catálogo' }))

    expect(await screen.findByText('catálogo')).toBeInTheDocument()
  })

  it('un error del servidor se explica y se puede reintentar', async () => {
    const user = userEvent.setup()
    renderCourse([{ path: COURSE, status: 503, body: problem(503, 'Service Unavailable') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el curso')
    expect(alert).toHaveTextContent('Código del error: 503')

    fetchMock.restore()
    fetchMock = mockFetch([{ path: COURSE, body: courseDetail }])
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
  })

  it('un 401 no deja la ficha cargando para siempre', async () => {
    renderCourse([{ path: COURSE, status: 401, body: problem(401, 'Full authentication is required') }])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos abrir este curso')
    expect(alert).toHaveTextContent('Código del error: 401')
  })

  it('una ficha fuera de contrato no se pinta a medias', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, credits: { ...courseDetail.credits, system: 'SCH' } } }])

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer la respuesta del servidor')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})

// el navegador en UTC+14: una fecha civil tratada como medianoche local o UTC cambiaría de día en zonas lejanas
describe('CourseDetailPage con el navegador en otra zona horaria', () => {
  const browserZone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Pacific/Kiritimati'
  })

  afterAll(() => {
    process.env.TZ = browserZone
  })

  it('escribe las fechas de cada edición en la zona de la edición', async () => {
    expect(new Date('2026-11-09T00:00:00Z').getTimezoneOffset()).toBe(-14 * 60)
    const lima = courseDetail.offerings[0]!
    const pagoPago = {
      ...lima,
      code: 'edicion-samoa',
      status: 'PROGRAMADA',
      enrollmentOpen: false,
      enrollmentStatus: 'CLOSED',
      timeZone: 'Pacific/Pago_Pago',
      startDate: '2027-01-04',
      endDate: '2027-01-29',
      enrollmentFrom: null,
      enrollmentUntil: '2027-01-01'
    }
    renderCourse([{ path: COURSE, body: { ...courseDetail, offerings: [lima, pagoPago] } }])

    await screen.findByRole('heading', { level: 1, name: courseDetail.title })
    // la recomendada (la abierta) arriba; la otra, debajo
    const [first, second] = within(section('Ediciones'))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.closest<HTMLElement>('[data-slot$="offering"]')!)
    expect(first).toHaveAttribute('data-slot', 'recommended-offering')
    expect(within(first!).getByRole('heading', { level: 3 })).toHaveTextContent('9 nov – 4 dic 2026')
    expect(within(first!).getByText('15 oct – 6 nov 2026')).toBeInTheDocument()
    expect(within(second!).getByRole('heading', { level: 3 })).toHaveTextContent('4–29 ene 2027')
    expect(within(second!).getByRole('heading', { level: 3 })).toHaveTextContent('Inscripción aún no abierta')
    expect(within(second!).getByText('hasta el 1 ene 2027')).toBeInTheDocument()
    expect(within(second!).getByText(/\(Pacific\/Pago_Pago\)$/)).toBeInTheDocument()
    expect(within(second!).getByText('Esta edición todavía no admite matrículas.')).toBeInTheDocument()
  })
})

describe('CourseDetailPage: una ficha que se recorre', () => {
  it('sections are numbered and indexed', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    const index = await screen.findByRole('navigation', { name: 'En esta página' })
    // el índice va en la columna fija, no entre el contenido
    expect(index.closest('aside')).not.toBeNull()
    const titles = [
      'Qué aprenderás',
      'Temario',
      'Antes de empezar',
      'Evaluación y certificación',
      'Docentes',
      'Carga de trabajo y créditos',
      'Fuentes',
      'Datos del curso'
    ]
    const links = within(index).getAllByRole('link')
    expect(links).toHaveLength(titles.length)
    titles.forEach((title, i) => {
      const target = section(title)
      expect(within(target).getByText(`§${i + 1}`)).toBeInTheDocument()
      expect(links[i]).toHaveAccessibleName(title)
      expect(links[i]).toHaveTextContent(`§${i + 1}${title}`)
      expect(links[i]).toHaveAttribute('href', `#${target.id}`)
    })
  })

  it('sections are numbered without gaps when some are missing', async () => {
    renderCourse([{ path: COURSE, body: { ...courseDetail, sources: [], prerequisiteKnowledge: null, requirements: null, prerequisiteKnowledgeTags: [] } }])

    const index = within(await screen.findByRole('navigation', { name: 'En esta página' }))
    expect(index.getAllByRole('link').map((link) => link.textContent)).toEqual([
      '§1Qué aprenderás',
      '§2Temario',
      '§3Evaluación y certificación',
      '§4Docentes',
      '§5Carga de trabajo y créditos',
      '§6Datos del curso'
    ])
    expect(within(section('Datos del curso')).getByText('§6')).toBeInTheDocument()
  })

  it('workload rows without data are not rendered', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])
    await screen.findByRole('heading', { level: 1, name: courseDetail.title })

    // el fixture no tiene horas supervisadas: ni por semana ni en total
    const table = within(section('Carga de trabajo y créditos')).getByRole('table', { name: 'Horas en 6 semanas' })
    expect(within(table).queryByRole('row', { name: /^Supervisadas/ })).not.toBeInTheDocument()
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.textContent)
    ).toEqual(['ComponentePor semanaTotal', 'Teoría1272', 'Práctica1272', 'Autónomas1272', 'Total36216'])
  })

  // un componente con horas por semana y total 0, o al revés, sigue teniendo dato: su fila se pinta con su cero
  it('una fila con horas por semana y total 0 se pinta, y también la que tiene total y 0 por semana', async () => {
    const workload = {
      ...courseDetail.workload,
      weekly: { theory: 12, practice: 0, supervised: 3, autonomous: 0 },
      theoryHours: 0,
      practiceHours: 30,
      supervisedHours: 0,
      autonomousHours: 0
    }
    renderCourse([{ path: COURSE, body: { ...courseDetail, workload } }])
    await screen.findByRole('heading', { level: 1, name: courseDetail.title })

    const table = within(section('Carga de trabajo y créditos')).getByRole('table', { name: 'Horas en 6 semanas' })
    expect(within(table).getByRole('row', { name: 'Teoría 12 0' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Práctica 0 30' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Supervisadas 3 0' })).toBeInTheDocument()
    expect(within(table).queryByRole('row', { name: /^Autónomas/ })).not.toBeInTheDocument()
  })

  it('sin ningún componente con horas no hay tabla: un total de ceros no dice nada', async () => {
    const workload = {
      ...courseDetail.workload,
      weekly: { theory: 0, practice: 0, supervised: 0, autonomous: 0 },
      theoryHours: 0,
      practiceHours: 0,
      supervisedHours: 0,
      autonomousHours: 0
    }
    renderCourse([{ path: COURSE, body: { ...courseDetail, workload } }])
    await screen.findByRole('heading', { level: 1, name: courseDetail.title })

    expect(within(section('Carga de trabajo y créditos')).queryByRole('table')).not.toBeInTheDocument()
  })

  it('«En esta página» enlaza a cada sección presente, y cada una es su destino', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    const index = within(await screen.findByRole('navigation', { name: 'En esta página' }))
    const links = index.getAllByRole('link')
    expect(links.length).toBeGreaterThan(2)
    for (const link of links) {
      const target = document.getElementById(link.getAttribute('href')!.slice(1))
      expect(target, link.textContent!).not.toBeNull()
      expect(within(target!).getByRole('heading', { level: 2 })).toHaveAccessibleName(link.textContent!.replace(/^§\d+/, ''))
    }
    expect(index.getByRole('link', { name: 'Temario' })).toHaveAttribute('href', '#temario')
    // sin fuentes, no hay entrada ni sección
    expect(index.getByRole('link', { name: 'Fuentes' })).toBeInTheDocument()
  })

  it('una fuente de un repositorio se lee por su documento; la ruta exacta queda debajo, y el texto libre, tal cual', async () => {
    const sources = ['wasichai/srtm-backend@6daacd3:docs/manuales/usuario/anuncios-y-padron.adoc', 'Los manuales no declaran licencia.']
    renderCourse([{ path: COURSE, body: { ...courseDetail, sources } }])

    const items = within(
      within(await screen.findByRole('heading', { level: 2, name: 'Fuentes' }).then((h) => h.closest('section')!)).getByRole('list')
    ).getAllByRole('listitem')
    expect(within(items[0]!).getByText('Anuncios y padron')).toBeInTheDocument()
    const path = within(items[0]!).getByText('wasichai/srtm-backend@6daacd3:docs/manuales/usuario/anuncios-y-padron.adoc')
    expect(path).toHaveClass('font-mono')
    expect(within(items[1]!).getByText('Los manuales no declaran licencia.')).toBeInTheDocument()
  })

  it('cada docente lleva sus iniciales, que no lee el lector de pantalla', async () => {
    renderCourse([{ path: COURSE, body: courseDetail }])

    const teachers = within(await screen.findByRole('heading', { level: 2, name: 'Docentes' }).then((h) => h.closest('section')!))
    const initials = teachers.getByText('AQ')
    expect(initials).toHaveAttribute('aria-hidden', 'true')
  })
})
