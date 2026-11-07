import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WasichaiModule } from '@wasichai/core'
import { mockFetch, renderWithProviders, type FetchMock, type MockRoute } from '@wasichai/testing'
import { Route, Routes, useLocation, useParams } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { CourseDetailPage } from './CourseDetailPage'
import { catalogModule } from './module'
import { courseDetail, problem } from './test/fixtures'
import { learningGroup } from './test/learningGroup'

const COURSE = '/lms/public/catalog/courses/srtm-anuncios'
const ENROLLMENTS = '/lms/enrollments'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
// Intl separa el rango con espacios finos: el nombre accesible se compara con una expresión
const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/

// el aula es otro módulo: para la ficha basta que su ruta exista en el registro con la clave 'classroom:classroom'
const classroomStub: WasichaiModule = {
  id: 'classroom',
  navGroups: learningGroup.navGroups,
  routes: [{ id: 'classroom', path: 'mis-cursos/:enrollmentId', chrome: 'shell', component: () => null }]
}

// los términos también son otro módulo: basta su ruta en el registro con la clave 'terms:terms'
const termsStub: WasichaiModule = {
  id: 'terms',
  routes: [{ id: 'terms', path: 'terminos', chrome: 'shell', component: () => null }]
}
const TERMS = '/lms/terms'
const terms = { version: 3, text: 'Texto', retentionDays: 730, publishedAt: '2026-11-01T15:00:00Z' }
const acceptance = (over = {}) => ({
  version: 3,
  acceptedAt: '2026-11-02T15:00:00Z',
  expiresAt: '2028-11-01T15:00:00Z',
  withdrawnAt: null,
  valid: true,
  ...over
})

function TermsScreen() {
  const location = useLocation()
  return <p>{`términos ${location.search}`}</p>
}

function Classroom() {
  const { enrollmentId } = useParams()
  return <p>{`aula ${enrollmentId}`}</p>
}

let fetchMock: FetchMock
afterEach(() => fetchMock?.restore())

function renderCourse(routes: MockRoute[], { signedIn = true, modules = [catalogModule(), classroomStub], course = courseDetail as unknown } = {}) {
  fetchMock = mockFetch([{ path: COURSE, body: course }, ...routes])
  return renderWithProviders(
    <Routes>
      <Route path="/cursos/:slug" element={<CourseDetailPage />} />
      <Route path="/mis-cursos/:enrollmentId" element={<Classroom />} />
      <Route path="/login" element={<p>inicio de sesión</p>} />
      <Route path="/terminos" element={<TermsScreen />} />
    </Routes>,
    { modules, route: '/cursos/srtm-anuncios', ...(signedIn ? { permissions: { admin: false, objects: {} } } : { user: null, permissions: null }) }
  )
}

const offerings = async () => {
  const heading = await screen.findByRole('heading', { level: 2, name: 'Ediciones' })
  return within(heading.closest('section')!)
}

const MY_ENROLLMENTS = '/lms/classroom/enrollments'
const myEnrollment = (id: string, status = 'ACTIVA', code = 'edicion-srtm-2026-11', slug = 'srtm-anuncios') => ({
  id,
  status,
  course: { slug },
  offering: { code }
})
const second = { ...courseDetail.offerings[0]!, code: 'edicion-srtm-2027-01', startDate: '2027-01-11', endDate: '2027-02-05' }
const SECOND_ACTION = /^Matricularme en la edición 11 ene\s–\s5 feb 2027$/

function mockViewport(wide: boolean) {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

describe('una sola acción principal', () => {
  it('con dos ediciones abiertas, la primera es la primaria y la otra, secundaria', async () => {
    renderCourse([], { course: { ...courseDetail, offerings: [courseDetail.offerings[0], second] } })

    const section = await offerings()
    expect(section.getByRole('button', { name: ACTION })).toHaveAttribute('data-variant', 'primary')
    expect(section.getByRole('button', { name: SECOND_ACTION })).toHaveAttribute('data-variant', 'secondary')
  })

  it('sin sesión, la entrada también es la única primaria', async () => {
    renderCourse([], { signedIn: false })

    const signIn = (await offerings()).getByRole('link', { name: 'Inicia sesión para matricularte' })
    expect(signIn).toHaveAttribute('data-variant', 'primary')
  })
})

describe('ya matriculada', () => {
  it('su edición cambia a «Ir al curso», que abre el aula, y no se vuelve a matricular', async () => {
    renderCourse([{ path: MY_ENROLLMENTS, body: [myEnrollment('mat-srtm-1'), myEnrollment('mat-otra', 'ACTIVA', 'otra', 'otro-curso')] }])

    const section = await offerings()
    const go = await section.findByRole('link', { name: 'Ir al curso' })
    expect(go).toHaveAttribute('href', '/mis-cursos/mat-srtm-1')
    expect(go).toHaveAttribute('data-variant', 'primary')
    expect(section.getByText('Tienes matrícula')).toBeInTheDocument()
    expect(section.queryByText('Inscripción abierta')).not.toBeInTheDocument()
    expect(section.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()
  })

  it('una matrícula finalizada también lleva al curso, y lo dice', async () => {
    renderCourse([{ path: MY_ENROLLMENTS, body: [myEnrollment('mat-srtm-1', 'FINALIZADA')] }])

    const section = await offerings()
    expect(await section.findByText('Matrícula finalizada')).toBeInTheDocument()
    expect(section.getByRole('link', { name: 'Ir al curso' })).toBeInTheDocument()
  })

  it('otra edición abierta del mismo curso queda como secundaria', async () => {
    renderCourse([{ path: MY_ENROLLMENTS, body: [myEnrollment('mat-srtm-1')] }], {
      course: { ...courseDetail, offerings: [courseDetail.offerings[0], second] }
    })

    const section = await offerings()
    expect(await section.findByRole('link', { name: 'Ir al curso' })).toHaveAttribute('data-variant', 'primary')
    expect(section.getByRole('button', { name: SECOND_ACTION })).toHaveAttribute('data-variant', 'secondary')
  })

  it('con una matrícula en una edición que ya no se ofrece, lo avisa y lleva al curso', async () => {
    renderCourse([{ path: MY_ENROLLMENTS, body: [myEnrollment('mat-vieja', 'ACTIVA', 'edicion-pasada')] }], { course: { ...courseDetail, offerings: [] } })

    expect(await screen.findByText('Ya tienes matrícula en este curso.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al curso' })).toHaveAttribute('href', '/mis-cursos/mat-vieja')
  })

  it('si la consulta de matrículas falla, no se explica nada y se ofrece matricularse', async () => {
    renderCourse([{ path: MY_ENROLLMENTS, status: 403, body: problem(403, 'Sin permiso') }])

    const section = await offerings()
    await waitFor(() => expect(fetchMock.calls.some((call) => call.path === MY_ENROLLMENTS)).toBe(true))
    expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin sesión no se pregunta por las matrículas', async () => {
    renderCourse([], { signedIn: false })

    await offerings()
    expect(fetchMock.calls.some((call) => call.path === MY_ENROLLMENTS)).toBe(false)
  })
})

describe('en una sola columna', () => {
  let restore: () => void
  afterEach(() => restore())
  const footer = () => document.querySelector<HTMLElement>('[data-slot="course-action"]')

  it('la acción va al pie, una sola vez, y el 409 se explica allí', async () => {
    restore = mockViewport(false)
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 409, body: problem(409, 'No quedan plazas en esta edición.') }])

    const section = await offerings()
    expect(section.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: ACTION })).toHaveLength(1)
    const bar = within(footer()!)
    await userEvent.click(bar.getByRole('button', { name: ACTION }))
    expect(await bar.findByRole('alert')).toHaveTextContent('No quedan plazas en esta edición.')
  })

  it('ya matriculada, el pie lleva «Ir al curso»', async () => {
    restore = mockViewport(false)
    renderCourse([{ path: MY_ENROLLMENTS, body: [myEnrollment('mat-srtm-1')] }])

    await offerings()
    expect(await within(footer()!).findByRole('link', { name: 'Ir al curso' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ir al curso' })).toHaveLength(1)
  })

  it('sin nada que hacer no hay pie', async () => {
    restore = mockViewport(false)
    renderCourse([], {
      course: { ...courseDetail, offerings: [{ ...courseDetail.offerings[0]!, enrollmentOpen: false, enrollmentStatus: 'FULL', full: true }] }
    })

    await offerings()
    expect(footer()).toBeNull()
  })

  it('en dos columnas no hay pie: la acción va en su tarjeta', async () => {
    restore = mockViewport(true)
    renderCourse([])

    expect((await offerings()).getByRole('button', { name: ACTION })).toBeInTheDocument()
    expect(footer()).toBeNull()
  })
})

describe('matricularse desde la ficha', () => {
  it('sin sesión, la edición abierta lleva al inicio de sesión de Wasichai, que vuelve a la ficha', async () => {
    renderCourse([], { signedIn: false })

    const section = await offerings()
    const signIn = section.getByRole('link', { name: 'Inicia sesión para matricularte' })
    expect(signIn).toHaveAttribute('href', '/login?returnTo=%2Fcursos%2Fsrtm-anuncios')
    expect(section.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()

    await userEvent.click(signIn)
    expect(await screen.findByText('inicio de sesión')).toBeInTheDocument()
  })

  it('con sesión matricula con Idempotency-Key y abre el aula de la matrícula', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 201, body: { id: 'mat-nueva', status: 'ACTIVA' } }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))

    expect(await screen.findByText('aula mat-nueva')).toBeInTheDocument()
    const post = fetchMock.calls.find((call) => call.method === 'POST')!
    expect(post.path).toBe(ENROLLMENTS)
    expect(post.body).toEqual({ offering: 'edicion-srtm-2026-11' })
    expect(post.headers['idempotency-key']).toMatch(UUID)
  })

  it('si ya estaba matriculada (200), abre la misma matrícula', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 200, body: { id: 'mat-srtm-1' } }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))
    expect(await screen.findByText('aula mat-srtm-1')).toBeInTheDocument()
  })

  describe('un 403 según lo que diga GET /terms', () => {
    const refused = { method: 'POST', path: ENROLLMENTS, status: 403, body: problem(403, 'Para matricularte debes aceptar los términos de uso vigentes') }
    const withTerms = { modules: [catalogModule(), classroomStub, termsStub] }

    it.each([
      ['sin aceptación', { current: terms, acceptance: null }],
      ['con la aceptación retirada', { current: terms, acceptance: acceptance({ valid: false, withdrawnAt: '2026-11-03T15:00:00Z' }) }],
      ['con la aceptación vencida', { current: terms, acceptance: acceptance({ valid: false }) }],
      ['sin términos publicados', { current: null, acceptance: null }]
    ])('%s lleva a los términos, con la vuelta a la ficha, y no matricula', async (_case, body) => {
      renderCourse([refused, { path: TERMS, body }], withTerms)

      await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))

      expect(await screen.findByText('términos ?returnTo=%2Fcursos%2Fsrtm-anuncios')).toBeInTheDocument()
      expect(fetchMock.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
    })

    it.each([
      ['vigente', acceptance()],
      ['vigente de una versión anterior', acceptance({ version: 2 })]
    ])('con la aceptación %s no se culpa a los términos: es otra causa', async (_case, accepted) => {
      renderCourse([refused, { path: TERMS, body: { current: terms, acceptance: accepted } }], withTerms)

      const section = await offerings()
      await userEvent.click(section.getByRole('button', { name: ACTION }))

      expect(await section.findByRole('alert')).toHaveTextContent('Tu cuenta no puede matricularse en cursos')
      expect(screen.queryByText(/^términos /)).not.toBeInTheDocument()
    })

    it('si no se puede comprobar, no supone ninguna causa', async () => {
      renderCourse([refused, { path: TERMS, status: 500, body: problem(500, 'Fallo') }], withTerms)

      const section = await offerings()
      await userEvent.click(section.getByRole('button', { name: ACTION }))

      const alert = await section.findByRole('alert')
      expect(alert).toHaveTextContent('ni comprobar por qué')
      expect(alert).not.toHaveTextContent(/cuenta|términos/)
      expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
    })

    it('sin la pantalla de términos registrada, lo explica sin enlace muerto', async () => {
      renderCourse([refused, { path: TERMS, body: { current: terms, acceptance: null } }])

      const section = await offerings()
      await userEvent.click(section.getByRole('button', { name: ACTION }))

      expect(await section.findByRole('alert')).toHaveTextContent('Para matricularte debes aceptar los términos de uso.')
      expect(section.queryByRole('link', { name: /términos/ })).not.toBeInTheDocument()
    })
  })

  it.each([
    [409, 'No quedan plazas en esta edición.', 'No quedan plazas en esta edición.'],
    [404, 'Esta edición ya no está disponible.', undefined],
    [500, 'No pudimos matricularte. Inténtalo de nuevo.', undefined]
  ])('un %i se explica con claridad y deja la ficha a la vista', async (status, message, detail) => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status, body: problem(status, 'No quedan plazas en esta edición.') }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))

    const alert = await section.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    if (detail) expect(alert).toHaveTextContent(detail)
    else expect(alert).not.toHaveTextContent('No quedan plazas en esta edición.')
    expect(screen.getByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
  })

  // RF-ACA-08: el 409 de un prerrequisito sin cumplir no se explica como cupo ni como inscripción cerrada
  it('un 409 por prerrequisito muestra el motivo del servidor, sin culpar al cupo', async () => {
    const detail = 'Para matricularte en esta edición antes debes aprobar: PRE-X (Fundamentos); PRE-Y (Normativa)'
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 409, body: problem(409, detail) }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))

    const alert = await section.findByRole('alert')
    expect(alert).toHaveTextContent(detail)
    expect(alert).not.toHaveTextContent(/plazas|cerrada/)
    expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
  })

  it.each([
    ['solo con título', { type: 'about:blank', title: 'Conflict', status: 409 }],
    ['sin cuerpo', '']
  ])('un 409 sin detail (%s) dice un texto general que no adivina el motivo', async (_case, body) => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 409, body }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))

    const alert = await section.findByRole('alert')
    expect(alert).toHaveTextContent(/^No pudimos matricularte en esta edición\.$/)
  })

  it('con la sesión caducada (401), core la cierra y el botón pasa a pedir el inicio de sesión', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 401, body: problem(401, 'Sesión caducada') }])

    await userEvent.click((await offerings()).getByRole('button', { name: ACTION }))

    expect(await screen.findByRole('link', { name: 'Inicia sesión para matricularte' })).toHaveAttribute('href', '/login?returnTo=%2Fcursos%2Fsrtm-anuncios')
    expect(screen.getByRole('heading', { level: 1, name: courseDetail.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('una respuesta sin id no navega a ninguna parte', async () => {
    renderCourse([{ method: 'POST', path: ENROLLMENTS, status: 201, body: { status: 'ACTIVA' } }])

    const section = await offerings()
    await userEvent.click(section.getByRole('button', { name: ACTION }))
    expect(await section.findByRole('alert')).toHaveTextContent('No pudimos matricularte. Inténtalo de nuevo.')
  })

  it('solo las ediciones con la inscripción abierta ofrecen matricularse', async () => {
    const closed = { ...courseDetail, offerings: [{ ...courseDetail.offerings[0]!, enrollmentOpen: false, enrollmentStatus: 'CLOSED' }] }
    fetchMock = mockFetch([{ path: COURSE, body: closed }])
    renderWithProviders(<CourseDetailPage />, { modules: [catalogModule(), classroomStub], route: '/cursos/srtm-anuncios', path: '/cursos/:slug' })

    const section = await offerings()
    expect(section.getByText('Inscripción cerrada')).toBeInTheDocument()
    expect(section.queryByRole('button')).not.toBeInTheDocument()
    expect(section.queryByRole('link')).not.toBeInTheDocument()
  })

  // RF-CAT-09: completa no es lo mismo que cerrada; tampoco se ofrece matricularse, ni a quien tiene sesión
  it('una edición completa lo dice y no ofrece matricularse', async () => {
    const full = { ...courseDetail.offerings[0]!, enrollmentOpen: false, enrollmentStatus: 'FULL', full: true }
    renderCourse([], { course: { ...courseDetail, offerings: [full] } })

    const section = await offerings()
    expect(section.getByText('Edición completa')).toBeInTheDocument()
    expect(section.queryByText('Inscripción abierta')).not.toBeInTheDocument()
    expect(section.queryByRole('button')).not.toBeInTheDocument()
    expect(section.queryByRole('link')).not.toBeInTheDocument()
  })

  it('con un backend que aún no manda enrollmentStatus, decide enrollmentOpen', async () => {
    const { enrollmentStatus: _status, full: _full, ...legacy } = courseDetail.offerings[0]!
    renderCourse([], { course: { ...courseDetail, offerings: [legacy] } })

    const section = await offerings()
    expect(section.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(section.getByRole('button', { name: ACTION })).toBeEnabled()
  })

  it('sin el módulo del aula registrado, la ficha no ofrece matricularse', async () => {
    renderCourse([], { modules: [catalogModule(), learningGroup] })

    const section = await offerings()
    expect(section.getByText('Inscripción abierta')).toBeInTheDocument()
    expect(section.queryByRole('button')).not.toBeInTheDocument()
    await waitFor(() => expect(fetchMock.calls.filter((call) => call.method === 'POST')).toEqual([]))
  })
})
