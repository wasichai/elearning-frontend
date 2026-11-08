import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, API_URL, courseProgress, expandedUnits, newStudent, signIn, token } from './helpers'

// recorridos 1–4 del aula contra el backend de verdad (perfil dev con los datos de demostración aplicados; README,
// «Humo contra el backend real»): iniciar sesión, matricularse desde la ficha, abrir la unidad y sus recursos, completar
// y conservar el progreso al recargar. cada ejecución crea su estudiante con el administrador del perfil dev, así que
// se puede repetir sin limpiar nada. solo con E2E_REAL=1 (yarn e2e:real)
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

const DEMO_PASSWORD = process.env.WASICHAI_DEMO_PASSWORD
const COURSE = /^Rentas municipales \(SRTM\)/

async function srtmSlug(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_URL}/api/lms/public/catalog/courses?q=SRTM`)
  const body = (await response.json()) as { content: { code: string; slug: string }[] }
  const course = body.content.find((c) => c.code === 'SRTM-ANU-101')
  expect(course, 'el catálogo aún no muestra SRTM-ANU-101: aplica la demo y espera el refresco (30 s)').toBeDefined()
  return course!.slug
}

test('un estudiante inicia sesión, se matricula desde la ficha, estudia y conserva su progreso', async ({ page, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)

  // 1. iniciar sesión y 2. matricularse desde la ficha pública
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()

  // 3. abrir la unidad y su lectura: el documento de bloques del servidor, pintado en la página
  await (await expandedUnits(page)).getByRole('link', { name: /^Lo que necesita para entrar/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Lo que necesita para entrar' })).toBeVisible()
  const reading = page.getByRole('region', { name: 'Entrar y salir del portal (lectura)' })
  await expect(reading.locator('[data-reading]')).toContainText(/\S/)
  await expect(page.locator('iframe')).toHaveCount(0)

  // 4. completar y verlo tras recargar: lo guardó el servidor
  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Lo que necesita para entrar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  await expect((await expandedUnits(page)).getByRole('link', { name: /^Lo que necesita para entrar.*Completada/ })).toBeVisible()
  // el progreso del curso cuenta ya alguna completada
  await expect(courseProgress(page)).toHaveAccessibleName(/^[1-9]\d* de [1-9]\d* completadas/)
})

// RF-AUL-05: el progreso vive en el servidor. otro contexto de navegador no comparte almacenamiento ni sesión con el primero
test('tras completar una lección, «Continuar» lleva a la siguiente pendiente desde otro navegador', async ({ page, browser, baseURL, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)
  await (await expandedUnits(page)).getByRole('link', { name: /^Lo que necesita para entrar/ }).click()
  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await page.context().close()

  const other = await browser.newContext({ baseURL, locale: 'es-PE', timezoneId: 'America/Lima' })
  try {
    const elsewhere = await other.newPage()
    await signIn(elsewhere, student)
    await elsewhere.getByRole('link', { name: 'Mis cursos' }).click()
    const card = elsewhere.getByRole('article').filter({ has: elsewhere.getByRole('heading', { name: COURSE }) })
    await card.getByRole('link', { name: /^Continuar «/ }).click()
    await expect(elsewhere.getByRole('heading', { level: 2, name: 'Ingresar y resolver un ingreso fallido' })).toBeVisible()
    await expect((await expandedUnits(elsewhere)).getByRole('link', { name: /^Lo que necesita para entrar.*Completada/ })).toBeVisible()
  } finally {
    await other.close()
  }
})

test('la guía PDF se descarga y el vídeo completa su lección al terminar', async ({ page, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)

  await (await expandedUnits(page)).getByRole('link', { name: /^Cómo se deduce el estado/ }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Descargar guia-estados-del-anuncio\.pdf/ }).click()
  expect((await downloading).suggestedFilename()).toBe('guia-estados-del-anuncio.pdf')

  await (await expandedUnits(page)).getByRole('link', { name: /^Recorrido en vídeo/ }).click()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  const video = page.locator('video')
  await expect(video).toHaveAttribute('src', /^blob:/)
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true
    await element.play()
  })
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect((await expandedUnits(page)).getByRole('link', { name: /^Recorrido en vídeo.*Completada/ })).toBeVisible()
})

// RF-AUL-03: la presentación de la demo; la interfaz la ofrece como descarga (ADR-0012 del backend) y se completa al marcarla
test('la presentación de la demo se abre, se descarga y se completa al marcarla', async ({ page, request }) => {
  const student = await newStudent(request)
  const slug = await srtmSlug(request)
  await signIn(page, student)
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)

  await (await expandedUnits(page)).getByRole('link', { name: /^Consultar el padrón con filtros/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Consultar el padrón con filtros' })).toBeVisible()
  // la línea de la lección (tipo y minutos); la del índice y la de las notas («Presentación · tamaño») son otras
  await expect(page.getByRole('article', { name: 'Consultar el padrón con filtros' }).getByText(/^Presentación · \d+ min$/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Consultar el padrón con filtros (presentación)' })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Descargar presentacion-padron-con-filtros\.pdf/ }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('presentacion-padron-con-filtros.pdf')
  const stream = await download.createReadStream()
  const head = await new Promise<string>((resolve, reject) => {
    stream.once('data', (chunk: Buffer) => resolve(chunk.subarray(0, 5).toString()))
    stream.once('error', reject)
  })
  stream.destroy()
  expect(head).toBe('%PDF-')

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
})

test('«Mis cursos» lee el panel del servidor, sin la lista aparte ni una petición por matrícula', async ({ page }) => {
  test.skip(!DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')
  const read: string[] = []
  page.on('request', (sent) => {
    const { pathname } = new URL(sent.url())
    if (pathname.startsWith('/api/lms/classroom/')) read.push(pathname)
  })
  const answered = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/lms/classroom/panel')
  await signIn(page, { email: 'estudiante@demo.wasichai-learning.test', password: DEMO_PASSWORD! })
  await page.goto('/mis-cursos')

  const response = await answered
  expect(response.status()).toBe(200)
  const panel = (await response.json()) as { course: { title: string }; upcomingSessions: unknown[]; pendingAssessments: unknown[] }[]
  const mine = panel.find((item) => COURSE.test(item.course.title))
  expect(mine, 'el panel trae la matrícula del estudiante demo').toBeDefined()
  expect(Array.isArray(mine!.upcomingSessions) && Array.isArray(mine!.pendingAssessments)).toBe(true)

  await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(new Set(read)).toEqual(new Set(['/api/lms/classroom/panel']))
})

test('el estudiante demo encuentra su curso en «Mis cursos»', async ({ page }) => {
  test.skip(!DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')
  await signIn(page, { email: 'estudiante@demo.wasichai-learning.test', password: DEMO_PASSWORD! })
  await page.getByRole('link', { name: 'Mis cursos' }).click()
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar', { name: 'Progreso del curso' })).toBeVisible()
  await card.getByRole('link', { name: /^(Continuar|Repasar) «/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
})

// RF-AUL-08 (#154): la semilla trae su intento en CORTO-101-A, calificado por el docente: 8 de 10, aprobado con 80 % (mínimo 60 %). la prueba no crea
// nada: si la semilla no lo diera, tiene que fallar. el id de la matrícula sale de la API para no depender de cómo pinte «Mis cursos»
test('el estudiante demo ve en CORTO-101-A el logro de su evaluación aprobada, con fecha y enlace a su lección', async ({ page, request }) => {
  test.skip(!DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')
  const account = { email: 'estudiante@demo.wasichai-learning.test', password: DEMO_PASSWORD! }
  const headers = { Authorization: `Bearer ${await token(request, account.email, account.password)}` }
  const enrollments = (await (await request.get(`${API_URL}/api/lms/classroom/enrollments`, { headers })).json()) as {
    id: string
    offering: { code: string }
  }[]
  const enrollment = enrollments.find((candidate) => candidate.offering.code === 'CORTO-101-A')
  expect(enrollment, 'la semilla no matricula al estudiante demo en CORTO-101-A').toBeDefined()

  const assessment = 'Evaluación: reescribir un mensaje'
  await signIn(page, account)
  await page.goto(`/mis-cursos/${enrollment!.id}`)
  const achievements = page.getByRole('region', { name: 'Logros' })
  const link = achievements.getByRole('link', { name: new RegExp(`^${assessment}.*Evaluación aprobada`) })
  await expect(link).toBeVisible()
  await expect(link.locator('time')).toHaveText(/\d{4}/)
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/mis-cursos/${enrollment!.id}\\?leccion=`))
  await expect(page.getByRole('heading', { level: 2, name: assessment })).toBeVisible()
})

// la lección de repaso (elearning-backend#309): la demo no enlaza ninguna y lo publicado no cambia, así que la prueba escribe su propio curso.
// sin soluciones (NUNCA): el repaso sale igual, y sigue ahí con el intento ya cerrado
test('el resultado de un intento enlaza a la lección de repaso que da el servidor, y solo en su pregunta', { tag: '@publishes' }, async ({ page, request }) => {
  test.skip(!DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')
  test.setTimeout(120_000)
  const run = randomUUID().slice(0, 8)
  const code = `REPASO-${run}`.toUpperCase()
  const reviewTitle = `Lectura para repasar ${run}`
  const assessmentTitle = `Evaluación con repaso ${run}`

  const as = async (email: string, password: string) => {
    const headers = { Authorization: `Bearer ${await token(request, email, password)}` }
    return async (path: string, data: unknown, status = 201) => {
      const response = await request.post(`${API_URL}${path}`, { headers, data })
      expect(response.status(), `POST ${path}: ${await response.text()}`).toBe(status)
      return (await response.json()) as { id: string }
    }
  }
  const creator = await as('creador@demo.wasichai-learning.test', DEMO_PASSWORD!)
  const reviewer = await as('revisor@demo.wasichai-learning.test', DEMO_PASSWORD!)
  const admin = await as(ADMIN.email, ADMIN.password)
  const record = async (object: string, attributes: Record<string, unknown>) => (await creator(`/api/objects/${object}/records`, { attributes })).id

  const course = await record('curso', { codigo: code, slug: code.toLowerCase(), titulo: `Curso con repaso ${run}`, idioma: 'es', nivel: 'INICIAL' })
  const version = await creator(`/api/lms/studio/courses/${course}/versions`, { fromVersionId: null })
  const unit = await record('unidad', { version_curso: version.id, orden: 1, titulo: 'Unidad 1' })
  const reading = await record('leccion', { unidad: unit, orden: 1, titulo: reviewTitle, tipo: 'LECTURA' })
  const assessed = await record('leccion', { unidad: unit, orden: 2, titulo: assessmentTitle, tipo: 'EVALUACION' })
  const evaluation = await record('evaluacion', { leccion: assessed, titulo: assessmentTitle, intentos_max: 2, nota_minima: 60, mostrar_soluciones: 'NUNCA' })
  const question = async (orden: number, enunciado: string, extra: Record<string, unknown>) => {
    const id = await record('pregunta', { evaluacion: evaluation, orden, tipo: 'UNICA', enunciado, puntos: 1, ...extra })
    await record('opcion', { pregunta: id, orden: 1, texto: 'Correcta', correcta: true })
    await record('opcion', { pregunta: id, orden: 2, texto: 'Incorrecta', correcta: false })
  }
  await question(1, 'Con repaso', { leccion_repaso: reading })
  await question(2, 'Sin repaso', {})
  await creator(`/api/lms/studio/versions/${version.id}/submit`, {}, 200)
  await reviewer(`/api/lms/review/versions/${version.id}/decision`, { decision: 'APROBAR', reason: null }, 200)
  await admin(`/api/lms/review/versions/${version.id}/publish`, {}, 200)
  // retirarla al acabar saca el curso del catálogo: una segunda ejecución sobre la misma base sigue contando los de la demo
  const adminHeaders = { Authorization: `Bearer ${await token(request, ADMIN.email, ADMIN.password)}` }
  try {
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
    await admin('/api/objects/edicion_curso/records', {
      attributes: {
        codigo: code,
        version_curso: version.id,
        estado: 'INSCRIPCION_ABIERTA',
        fecha_inicio: day(0),
        fecha_fin: day(30),
        zona_horaria: 'America/Lima',
        inscripcion_desde: day(-1),
        inscripcion_hasta: day(5)
      }
    })

    const student = await newStudent(request)
    const enrolled = await (await as(student.email, student.password))('/api/lms/enrollments', { offering: code })
    await signIn(page, student)
    await page.goto(`/mis-cursos/${enrolled.id}?leccion=${assessed}`)
    await page.getByRole('button', { name: /^Comenzar intento 1 de / }).click()
    await page.getByRole('dialog', { name: '¿Comenzar el intento?' }).getByRole('button', { name: 'Comenzar' }).click()
    await page.getByRole('group', { name: '1. Con repaso' }).getByRole('radio', { name: 'Incorrecta', exact: true }).check()
    await page.getByRole('group', { name: '2. Sin repaso' }).getByRole('radio', { name: 'Correcta', exact: true }).check()
    await page.getByRole('button', { name: 'Entregar' }).click()
    await page.getByRole('dialog', { name: '¿Entregar el intento?' }).getByRole('button', { name: 'Entregar' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
    const attemptUrl = page.url()

    const reviewed = page.getByRole('article', { name: '1. Con repaso' })
    const plain = page.getByRole('article', { name: '2. Sin repaso' })
    await expect(reviewed.getByRole('link', { name: reviewTitle })).toHaveAttribute('href', `/mis-cursos/${enrolled.id}?leccion=${reading}`)
    await expect(plain.getByRole('link')).toHaveCount(0)
    await expect(page.getByText(/^Respuesta correcta/)).toHaveCount(0)

    // con el intento ya cerrado, tras recargar, y de ida y vuelta
    await page.reload()
    await reviewed.getByRole('link', { name: reviewTitle }).click()
    await expect(page.getByRole('heading', { level: 2, name: reviewTitle })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(attemptUrl)
    await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
  } finally {
    const retired = await request.patch(`${API_URL}/api/objects/version_curso/records/${version.id}`, {
      headers: adminHeaders,
      data: { attributes: { estado: 'RETIRADA' } }
    })
    expect(retired.status(), 'retirar la versión de la prueba').toBe(200)
  }
})
