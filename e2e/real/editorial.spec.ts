import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API_URL, browserFor, newStudent, newUser, token } from './helpers'

// el estudio editorial de la Fase 4 contra el backend de verdad, en el navegador: los recorridos 8–12 de §20 (crear y
// editar un borrador, enviarlo a revisión, revisar y pedir cambios, aprobar, publicar y que lo publicado llegue al
// estudiante) y que publicar la versión nueva no altera la anterior ni el progreso de quien la cursa. además, la
// autorización negativa por la API: otro creador y un revisor no asignado no llegan. solo con E2E_REAL=1 y con
// WASICHAI_DEMO_PASSWORD, la de los usuarios demo
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')
test.skip(!process.env.WASICHAI_DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')

const DEMO_PASSWORD = process.env.WASICHAI_DEMO_PASSWORD ?? ''
const CREATOR = { email: 'creador@demo.wasichai-learning.test', password: DEMO_PASSWORD }
const REVIEWER = { email: 'revisor@demo.wasichai-learning.test', password: DEMO_PASSWORD }
// revisora de verdad (rol REVISOR), para la versión que se asigna a otra persona
const OTHER_REVIEWER = { email: 'docente.revisor@demo.wasichai-learning.test', password: DEMO_PASSWORD }

// SGSPE-101: su versión 1 está publicada y ningún otro recorrido real depende de sus ediciones. publicar una versión nueva
// la vuelve la del catálogo, que deja de ofrecer las ediciones de la 1: con CORTO-101 o SRTM-ANU-101 rompería los demás
const CODE = 'SGSPE-101'
const COURSE = 'SGSPE: primeros pasos y gestión de compromisos'
const LESSON = 'Iniciar sesión y qué hacer si falla'

// cada ejecución escribe sus propios textos: un reintento no confunde lo suyo con lo de la anterior
const RUN = randomUUID().slice(0, 8)
const EDITED = `Iniciar sesión y recuperar el acceso (${RUN})`
const FINAL = `Entrar al portal y recuperar el acceso (${RUN})`
const COMMENT = 'El título promete recuperar el acceso, pero la lección no dice a quién pedirlo.'
const REASON = 'Ajusta el título de la lección 1.1 a lo que enseña.'

interface Version {
  id: string
  number: number
  status: string
  reviewerId: string | null
  course: { id: string; code: string; title: string }
}
interface VersionDetail extends Version {
  units: { order: number; lessons: { id: string; order: number; title: string }[] }[]
}

function client(request: APIRequestContext, bearer: string) {
  const headers = { Authorization: `Bearer ${bearer}` }
  return {
    get: (path: string) => request.get(`${API_URL}${path}`, { headers }),
    post: (path: string, data: unknown = {}) => request.post(`${API_URL}${path}`, { headers, data }),
    patch: (path: string, data: unknown) => request.patch(`${API_URL}${path}`, { headers, data })
  }
}

async function json<T>(response: { status(): number; json(): Promise<unknown> }, status: number, what: string): Promise<T> {
  expect(response.status(), what).toBe(status)
  return (await response.json()) as T
}

const firstLesson = (version: VersionDetail) =>
  [...version.units]
    .sort((a, b) => a.order - b.order)[0]!
    .lessons.slice()
    .sort((a, b) => a.order - b.order)[0]!

// hoy en Lima, más o menos días, como fecha ISO
function limaDate(days: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(Date.now() + days * 86_400_000))
}

// editar una lección es la pantalla de registros de Wasichai a la que lleva el estudio: cambia su título y guarda
async function retitle(page: Page, current: string, next: string) {
  const edit = page.getByRole('link', { name: `Editar la lección «${current}»` })
  const lessonId = (await edit.getAttribute('href'))!.split('/').pop()!
  await edit.click()
  await expect(page).toHaveURL(`/data/objects/leccion/records/${lessonId}`)
  const title = page.getByRole('textbox', { name: /^Título/ })
  await expect(title).toHaveValue(current)
  await title.fill(next)
  const saved = page.waitForResponse((response) => response.url().endsWith(`/api/objects/leccion/records/${lessonId}`) && response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  expect((await saved).status(), 'guardar la lección del borrador').toBe(200)
  return lessonId
}

// por el menú, como una persona: con la bandeja ya abierta, su entrada la vuelve a pedir (#76)
async function openInInbox(page: Page, number: number) {
  await page.getByRole('link', { name: 'Bandeja de revisión', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Bandeja de revisión' })).toBeVisible()
  const item = page.getByRole('article').filter({ hasText: new RegExp(`${CODE} · versión ${number}(?!\\d)`) })
  await expect(item).toHaveCount(1)
  await item.getByRole('link', { name: COURSE }).click()
}

test('una versión nueva por copia: se edita, se revisa con cambios pedidos, se aprueba y se publica sin tocar la anterior', async ({
  browser,
  baseURL,
  request
}) => {
  test.setTimeout(300_000)
  const creatorApi = client(request, await token(request, CREATOR.email, CREATOR.password))
  const reviewerApi = client(request, await token(request, REVIEWER.email, REVIEWER.password))
  const adminApi = client(request, await token(request, ADMIN.email, ADMIN.password))

  // la versión 1 publicada de la demo, escrita por la creadora
  const mine = await json<Version[]>(await creatorApi.get('/api/lms/studio/versions'), 200, 'GET studio/versions')
  const v1 = mine.find((version) => version.course.code === CODE && version.number === 1)
  expect(v1, `la demo no tiene la versión 1 de ${CODE} escrita por ${CREATOR.email}`).toBeDefined()
  expect(v1!.status).toBe('PUBLICADA')
  const courseId = v1!.course.id
  const original = await json<VersionDetail>(await creatorApi.get(`/api/lms/studio/versions/${v1!.id}`), 200, 'GET la versión 1')
  expect(firstLesson(original).title).toBe(LESSON)

  // quien cursa la versión 1: una edición abierta hoy, de usar y tirar (las de la demo para SGSPE-101 aún no abren)
  const offering = `SGSPE-E2E-${RUN}`
  await json(
    await adminApi.post('/api/objects/edicion_curso/records', {
      attributes: {
        codigo: offering,
        estado: 'INSCRIPCION_ABIERTA',
        fecha_inicio: limaDate(7),
        fecha_fin: limaDate(21),
        zona_horaria: 'America/Lima',
        inscripcion_desde: limaDate(-1),
        inscripcion_hasta: limaDate(5),
        capacidad: 5,
        version_curso: v1!.id
      }
    }),
    201,
    'crear la edición de la versión 1'
  )
  const student = await newStudent(request)
  const studentApi = client(request, await token(request, student.email, student.password))
  const enrollment = await json<{ id: string; version: number }>(await studentApi.post('/api/lms/enrollments', { offering }), 201, 'matricular en la versión 1')
  expect(enrollment.version).toBe(1)

  const learner = await browserFor(browser, baseURL, student)
  const creator = await browserFor(browser, baseURL, CREATOR)
  const reviewer = await browserFor(browser, baseURL, REVIEWER)
  let draftId = ''
  let number = 0
  let progress = ''
  try {
    const units = learner.page.getByRole('navigation', { name: 'Unidades del curso' })
    const bar = learner.page.getByRole('progressbar', { name: 'Progreso del curso' })

    await test.step('quien cursa la versión 1 completa su primera lección', async () => {
      await learner.page.goto(`/mis-cursos/${enrollment.id}`)
      await expect(learner.page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
      await units.getByRole('link', { name: new RegExp(`^${LESSON}`) }).click()
      await expect(learner.page.getByRole('heading', { level: 2, name: LESSON })).toBeVisible()
      await learner.page.getByRole('button', { name: 'Marcar como completada' }).click()
      await expect(learner.page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
      await expect(bar).not.toHaveAttribute('aria-valuenow', '0')
      progress = (await bar.getAttribute('aria-valuenow'))!
    })

    await test.step('recorrido 8: la creadora crea una versión nueva por copia de la publicada', async () => {
      const { page } = creator
      await page.getByRole('link', { name: 'Mis versiones' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Mis versiones' })).toBeVisible()
      await page.getByRole('link', { name: `${COURSE} — versión 1`, exact: true }).click()
      await expect(page).toHaveURL(`/estudio/versiones/${v1!.id}`)
      await expect(page.getByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeVisible()
      await page.getByRole('button', { name: 'Crear una versión nueva a partir de esta' }).click()
      await page.getByRole('dialog', { name: '¿Crear una versión nueva?' }).getByRole('button', { name: 'Sí, crear el borrador' }).click()

      await expect(page).not.toHaveURL(`/estudio/versiones/${v1!.id}`)
      await expect(page).toHaveURL(/\/estudio\/versiones\/[0-9a-f-]{36}$/)
      draftId = new URL(page.url()).pathname.split('/').pop()!
      const draft = await json<VersionDetail>(await creatorApi.get(`/api/lms/studio/versions/${draftId}`), 200, 'GET el borrador')
      number = draft.number
      expect(number).toBeGreaterThan(1)
      expect(firstLesson(draft).title).toBe(LESSON)
      await expect(page.getByText(`Versión ${number} · ${CODE}`)).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
      // la copia de la 1 es igual a ella; tras un reintento, la anterior puede ser la copia ya editada del intento previo
      await expect(page.getByRole('region', { name: 'Cambios', exact: true })).toContainText(
        new RegExp(`(Su contenido es el mismo que el de|Comparada con) la versión ${number - 1}\\.`)
      )
    })

    let lessonId = ''
    await test.step('recorrido 8: la edita en las pantallas de registros y el estudio muestra qué cambió', async () => {
      const { page } = creator
      lessonId = await retitle(page, LESSON, EDITED)
      await page.goto(`/estudio/versiones/${draftId}`)
      await expect(page.getByText(`1. ${EDITED}`, { exact: true })).toBeVisible()
      const diff = page.getByRole('region', { name: 'Cambios', exact: true })
      await expect(diff).toContainText(`CambiadaLección 1.1. ${EDITED}`)
      await expect(diff).toContainText('Cambió: título')
    })

    await test.step('otro creador no llega al borrador ajeno, ni en el estudio ni por la API de registros', async () => {
      const other = await newUser(request, 'CREADOR', 'Creador e2e')
      const otherApi = client(request, await token(request, other.email, other.password))
      for (const path of [`/api/lms/studio/versions/${draftId}`, `/api/lms/studio/versions/${draftId}/diff`]) {
        expect((await otherApi.get(path)).status(), `otro creador: GET ${path}`).toBe(404)
      }
      expect((await otherApi.post(`/api/lms/studio/versions/${draftId}/submit`)).status(), 'otro creador: enviar a revisión').toBe(404)
      const listed = await json<Version[]>(await otherApi.get('/api/lms/studio/versions'), 200, 'otro creador: sus versiones')
      expect(listed.map((version) => version.id)).not.toContain(draftId)
      const touched = await otherApi.patch(`/api/objects/leccion/records/${lessonId}`, { attributes: { titulo: 'Cambiada por otra persona' } })
      expect(touched.status(), 'otro creador: PATCH a una lección del borrador ajeno').toBe(403)
      // la autora tampoco decide su revisión
      const own = await creatorApi.post(`/api/lms/review/versions/${draftId}/decision`, { decision: 'APROBAR' })
      expect(own.status(), 'la autora: decidir su propia versión').toBe(403)

      const elsewhere = await browserFor(browser, baseURL, other)
      try {
        await elsewhere.page.goto(`/estudio/versiones/${draftId}`)
        await expect(elsewhere.page.getByRole('alert')).toContainText('Esta versión no está entre las tuyas')
      } finally {
        await elsewhere.context.close()
      }
    })

    await test.step('recorrido 9: la envía a revisión', async () => {
      const { page } = creator
      await page.getByRole('button', { name: 'Enviar a revisión' }).click()
      await page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Enviada a revisión.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Editar la versión' })).toHaveCount(0)
    })

    await test.step('recorrido 10: el revisor la ve en su bandeja con sus diferencias, comenta la lección y pide cambios', async () => {
      const { page } = reviewer
      await openInInbox(page, number)
      await expect(page).toHaveURL(`/revision/${draftId}`)
      await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Cambios', exact: true })).toContainText(`CambiadaLección 1.1. ${EDITED}`)

      const section = `Lección 1.1. ${EDITED}`
      await page.getByRole('button', { name: `Comentar ${section}` }).click()
      const form = page.getByRole('form', { name: `Nuevo comentario sobre ${section}` })
      await form.getByRole('textbox', { name: 'Comentario' }).fill(COMMENT)
      await form.getByRole('button', { name: 'Enviar comentario' }).click()
      await expect(page.getByRole('list', { name: `Comentarios de ${section}` })).toContainText(COMMENT)
      await expect(page.getByText('1 comentario abierto')).toBeVisible()

      await page.getByRole('button', { name: 'Pedir cambios', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: '¿Pedir cambios?' })
      await dialog.getByRole('textbox').fill(REASON)
      await dialog.getByRole('button', { name: 'Pedir cambios' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Cambios pedidos. Estado: Borrador.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
      await expect(page.getByRole('region', { name: 'Historial de decisiones' })).toContainText(REASON)

      // vuelve a la autora: sale de la bandeja
      await page.getByRole('link', { name: '← Bandeja de revisión' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Bandeja de revisión' })).toBeVisible()
      await expect(page.getByRole('article').filter({ hasText: new RegExp(`${CODE} · versión ${number}(?!\\d)`) })).toHaveCount(0)
    })

    await test.step('la creadora ve el comentario y la decisión, corrige y la vuelve a enviar', async () => {
      const { page } = creator
      await page.reload()
      await expect(page.getByRole('heading', { level: 2, name: 'Estado: Borrador' })).toBeVisible()
      const comments = page.getByRole('region', { name: 'Comentarios de revisión' })
      await expect(comments).toContainText(COMMENT)
      await expect(comments).toContainText('Por atender')
      const decisions = page.getByRole('region', { name: 'Decisiones del revisor' })
      await expect(decisions).toContainText('Pidió cambios')
      await expect(decisions).toContainText(REASON)

      await retitle(page, EDITED, FINAL)
      await page.goto(`/estudio/versiones/${draftId}`)
      await expect(page.getByText(`1. ${FINAL}`, { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Enviar a revisión' }).click()
      await page.getByRole('dialog', { name: '¿Enviar a revisión?' }).getByRole('button', { name: 'Sí, enviar a revisión' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Estado: En revisión' })).toBeVisible()
    })

    await test.step('recorrido 11: el revisor marca resuelto el comentario y aprueba; sin PUBLICAR no publica', async () => {
      const { page } = reviewer
      await openInInbox(page, number)
      await expect(page).toHaveURL(`/revision/${draftId}`)
      await expect(page.getByRole('region', { name: 'Cambios', exact: true })).toContainText(`CambiadaLección 1.1. ${FINAL}`)
      const comments = page.getByRole('list', { name: `Comentarios de Lección 1.1. ${FINAL}` })
      await expect(comments).toContainText(COMMENT)
      await comments.getByRole('button', { name: 'Marcar como resuelto' }).click()
      await expect(comments).toContainText('Resuelto')
      await expect(page.getByText('Sin comentarios abiertos')).toBeVisible()

      await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
      await page.getByRole('dialog', { name: '¿Aprobar esta versión?' }).getByRole('button', { name: 'Aprobar' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Versión aprobada. Estado: Aprobada.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Publicar la versión' })).toHaveCount(0)
      expect((await reviewerApi.post(`/api/lms/review/versions/${draftId}/publish`)).status(), 'el revisor: publicar').toBe(403)
    })

    await test.step('recorrido 12: quien tiene PUBLICAR la publica', async () => {
      const admin = await browserFor(browser, baseURL, ADMIN)
      try {
        const { page } = admin
        await page.goto(`/revision/${draftId}`)
        await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
        await page.getByRole('button', { name: 'Publicar la versión' }).click()
        await page.getByRole('dialog', { name: '¿Publicar esta versión?' }).getByRole('button', { name: 'Publicar la versión' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Versión publicada.' })).toBeVisible()
        await expect(page.getByText('Publicada', { exact: true }).first()).toBeVisible()
      } finally {
        await admin.context.close()
      }
      await creator.page.reload()
      await expect(creator.page.getByRole('heading', { level: 2, name: 'Estado: Publicada' })).toBeVisible()
      await expect(creator.page.getByRole('button', { name: 'Crear una versión nueva a partir de esta' })).toBeVisible()
    })

    await test.step('recorrido 12: el catálogo ofrece la versión nueva', async () => {
      const list = await json<{ content: { code: string; slug: string }[] }>(
        await request.get(`${API_URL}/api/lms/public/catalog/courses?q=SGSPE`),
        200,
        'GET catálogo'
      )
      const slug = list.content.find((course) => course.code === CODE)!.slug
      // el catálogo se refresca cada pocos segundos (LMS_CATALOG_REFRESH)
      const published = async () => {
        const response = await request.get(`${API_URL}/api/lms/public/catalog/courses/${slug}`)
        return (await response.json()) as { version: { number: number }; units: { order: number; lessons: { order: number; title: string }[] }[] }
      }
      await expect.poll(async () => (await published()).version.number, { timeout: 60_000, intervals: [1_000] }).toBe(number)
      const detail = await published()
      expect(detail.units.find((unit) => unit.order === 1)!.lessons.find((lesson) => lesson.order === 1)!.title).toBe(FINAL)
    })

    await test.step('la versión 1 sigue intacta, y también el progreso de quien la cursa', async () => {
      const after = await json<VersionDetail>(await creatorApi.get(`/api/lms/studio/versions/${v1!.id}`), 200, 'GET la versión 1 después')
      expect(after.status).toBe('PUBLICADA')
      expect(firstLesson(after).title).toBe(LESSON)
      const classroom = await json<{ version: number }>(
        await studentApi.get(`/api/lms/classroom/enrollments/${enrollment.id}`),
        200,
        'GET el aula de la matrícula'
      )
      expect(classroom.version).toBe(1)

      await learner.page.goto(`/mis-cursos/${enrollment.id}`)
      await expect(learner.page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
      await expect(units.getByRole('link', { name: new RegExp(`^${LESSON}.*Completada`) })).toBeVisible()
      await expect(units.getByRole('link', { name: FINAL })).toHaveCount(0)
      await expect(bar).toHaveAttribute('aria-valuenow', progress)
    })

    await test.step('con revisor asignado, otra revisora no la ve ni la decide (404)', async () => {
      // otra versión, para no mezclarla con la publicada: copia de la 1, enviada y asignada por quien publica
      const copy = await json<Version>(
        await creatorApi.post(`/api/lms/studio/courses/${courseId}/versions`, { fromVersionId: v1!.id }),
        201,
        'copiar la versión 1'
      )
      await json(await creatorApi.post(`/api/lms/studio/versions/${copy.id}/submit`), 200, 'enviar la copia a revisión')
      const reviewerId = (await json<{ userId: string }>(await reviewerApi.get('/api/auth/me'), 200, 'GET auth/me del revisor')).userId
      await json(await adminApi.patch(`/api/objects/version_curso/records/${copy.id}`, { attributes: { revisor_id: reviewerId } }), 200, 'asignar el revisor')

      const otherApi = client(request, await token(request, OTHER_REVIEWER.email, OTHER_REVIEWER.password))
      const inbox = await json<Version[]>(await otherApi.get('/api/lms/review/versions'), 200, 'otra revisora: su bandeja')
      expect(inbox.map((version) => version.id)).not.toContain(copy.id)
      for (const path of [`/api/lms/review/versions/${copy.id}`, `/api/lms/review/versions/${copy.id}/diff`]) {
        expect((await otherApi.get(path)).status(), `otra revisora: GET ${path}`).toBe(404)
      }
      const commented = await otherApi.post(`/api/lms/review/versions/${copy.id}/comments`, { section: 'version', text: 'No debería poder.' })
      expect(commented.status(), 'otra revisora: comentar').toBe(404)
      const decided = await otherApi.post(`/api/lms/review/versions/${copy.id}/decision`, { decision: 'APROBAR' })
      expect(decided.status(), 'otra revisora: aprobar').toBe(404)
      const other = await browserFor(browser, baseURL, OTHER_REVIEWER)
      try {
        await other.page.goto(`/revision/${copy.id}`)
        await expect(other.page.getByRole('alert')).toContainText('Esta versión no está a tu cargo')
      } finally {
        await other.context.close()
      }

      // el asignado sí la tiene; la rechaza para que no quede esperando en su bandeja
      const assigned = await json<Version[]>(await reviewerApi.get('/api/lms/review/versions'), 200, 'el revisor: su bandeja')
      expect(assigned.find((version) => version.id === copy.id)?.reviewerId).toBe(reviewerId)
      const rejected = await json<Version>(
        await reviewerApi.post(`/api/lms/review/versions/${copy.id}/decision`, { decision: 'RECHAZAR', reason: 'Copia de la prueba de alcance.' }),
        200,
        'el revisor asignado: rechazar'
      )
      expect(rejected.status).toBe('RETIRADA')
    })
  } finally {
    await Promise.all([learner.context.close(), creator.context.close(), reviewer.context.close()])
  }
})

// la importación contra GitHub no se prueba aquí (sin red controlada ni orígenes configurados). lo que sí se comprueba sin
// red: un origen fuera de la lista no se encola (403) y quien no crea versiones no importa
test('la importación rechaza un origen no permitido y a quien no puede importar, sin salir a la red', async ({ browser, baseURL, request }) => {
  const creatorApi = client(request, await token(request, CREATOR.email, CREATOR.password))
  const mine = await json<Version[]>(await creatorApi.get('/api/lms/studio/versions'), 200, 'GET studio/versions')
  const courseId = mine.find((version) => version.course.code === CODE)!.course.id
  const sources = await json<{ repository: string }[]>(await creatorApi.get('/api/lms/studio/import/sources'), 200, 'GET import/sources')
  const source = `e2e-no-permitido/manual@${'0123456789abcdef'.repeat(3).slice(0, 40)}:manual/maestro.adoc`
  expect(sources.map((allowed) => allowed.repository)).not.toContain('e2e-no-permitido/manual')

  expect((await creatorApi.post('/api/lms/studio/import', { source, courseId })).status(), 'creadora: origen no permitido').toBe(403)
  const student = await newStudent(request)
  const studentApi = client(request, await token(request, student.email, student.password))
  expect((await studentApi.get('/api/lms/studio/import/sources')).status(), 'estudiante: orígenes').toBe(403)
  expect((await studentApi.post('/api/lms/studio/import', { source, courseId })).status(), 'estudiante: importar').toBe(403)

  // sin orígenes configurados (como en CI), la pantalla lo explica en vez de ofrecer el formulario
  test.skip(sources.length > 0, 'este backend tiene orígenes permitidos: la pantalla vacía no aplica')
  const creator = await browserFor(browser, baseURL, CREATOR)
  try {
    await creator.page.goto('/estudio')
    await creator.page.getByRole('link', { name: 'Importar desde un repositorio' }).click()
    await expect(creator.page.getByRole('heading', { level: 1, name: 'Importar un manual' })).toBeVisible()
    await expect(creator.page.getByText('No hay orígenes permitidos')).toBeVisible()
    await expect(creator.page.getByLabel('Commit')).toHaveCount(0)
  } finally {
    await creator.context.close()
  }
})
