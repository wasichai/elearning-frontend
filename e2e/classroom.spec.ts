import { expect, test, type Page } from '@playwright/test'
import { enrollment } from '../src/modules/classroom/test/fixtures'
import { fakeApi } from './api'

// el aula del estudiante con la API simulada y una sesión de estudiante

const COURSE = 'Licencias de anuncios con SRTM'

// la unidad plegada se abre pulsando su cabecera: sus lecciones no están en el árbol hasta entonces
const openUnit = (page: Page, name: RegExp) => page.getByRole('navigation', { name: 'Unidades del curso' }).locator('summary').filter({ hasText: name }).click()
const toMyCourses = (page: Page) => page.getByRole('navigation', { name: 'Ruta' }).getByRole('link', { name: 'Mis cursos' })

test('«Mis cursos» está en el menú y lleva a la siguiente lección con «Continuar»', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/')

  await page.getByRole('link', { name: 'Mis cursos' }).click()
  await expect(page).toHaveURL('/mis-cursos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()

  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '0')
  await expect(card.getByText('9 nov – 4 dic 2026')).toBeVisible()
  await card.getByRole('link', { name: `Continuar «${COURSE}»` }).click()

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-html')
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  // «Mis cursos» lee el panel, la agenda y el aula de «Continuar» (aquí SGSPE); el aula de SRTM no se pide hasta abrirla. aterrizar y pulsar
  // su entrada del menú pueden leer una o dos veces el panel, según si la primera lectura ya acabó: aquí se mira el orden, no cuántas
  const panel = 'GET /api/lms/classroom/panel'
  const opened = 'GET /api/lms/classroom/enrollments/mat-srtm-1'
  const reads = api.classroomRequests.filter((request) => request === panel || request === opened)
  expect(reads[0]).toBe(panel)
  expect(reads.filter((request) => request === panel).length).toBeLessThanOrEqual(2)
  expect(reads.indexOf(opened)).toBeGreaterThan(0)
  expect(api.classroomRequests).not.toContain('GET /api/lms/classroom/enrollments')
  expect(api.unexpected).toEqual([])
})

test('recorrido: mis cursos → aula → lección HTML → marcar completada → recargar y sigue completada', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')

  await page.getByRole('link', { name: COURSE, exact: true }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  await units.getByRole('link', { name: /^Tipos de anuncio/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 4, name: 'Entrar y salir del portal' })).toBeVisible()
  // abrirla la inició en el servidor
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Empezada' })).toBeVisible()

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  const next = page.getByRole('link', { name: 'Siguiente lección: Recorrido por la pantalla' })
  await expect(next).toBeFocused()
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Índice' }).getByRole('img', { name: '1 de 3 completadas' })).toBeVisible()
  await expect(units.getByRole('heading', { name: /^Unidad 1\./ })).toContainText('1 de 2')

  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como completada' })).toHaveCount(0)
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()

  const events = api.classroomRequests.filter((request) => request.startsWith('POST'))
  expect(events).toEqual([
    'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events',
    'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events'
  ])
  expect(api.unexpected).toEqual([])
})

// RF-AUL-02: una unidad entera, y de ella a la siguiente, sin más acción que «Siguiente»
test('una unidad se recorre entera solo con «Siguiente»: cada lección abierta, la siguiente unidad después', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  const steps = page.getByRole('navigation', { name: 'Lección anterior y siguiente' })
  const walk = [
    { id: 'lec-html', title: 'Tipos de anuncio', position: '§1.1' },
    { id: 'lec-video', title: 'Recorrido por la pantalla', position: '§1.2' },
    { id: 'lec-pdf', title: 'Guía de liquidación', position: '§2.1' },
    { id: 'lec-quiz', title: 'Cuestionario de la unidad', position: '§2.2' }
  ]

  for (const [index, lesson] of walk.entries()) {
    if (index > 0) await steps.getByRole('link', { name: `Siguiente ${lesson.title}` }).click()
    await expect(page).toHaveURL(`/mis-cursos/mat-srtm-1?leccion=${lesson.id}`)
    await expect(page.getByRole('heading', { level: 2, name: lesson.title })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Ruta' }).getByText(lesson.position)).toBeVisible()
    // la navegación lateral sigue ahí y marca la lección abierta
    await expect(units.locator('[aria-current="page"]')).toContainText(lesson.title)
  }
  // la última del curso no tiene «Siguiente»
  await expect(steps.getByRole('link', { name: /^Siguiente/ })).toHaveCount(0)
  await expect(steps.getByRole('link', { name: 'Anterior Guía de liquidación' })).toBeVisible()
  // la unidad abierta siguió a la lección; la primera se plegó
  await expect(units.getByRole('link', { name: /^Tipos de anuncio/ })).toHaveCount(0)
  await openUnit(page, /^Unidad 1\./)
  // pasar de lección no completa nada: abrirlas solo las inicia
  await expect(units.getByRole('link', { name: /Empezada$/ })).toHaveCount(4)
  await expect(units.getByRole('link', { name: /Completada$/ })).toHaveCount(0)
  expect(api.unexpected).toEqual([])
})

test('«Mis cursos» muestra el avance que guardó el servidor', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()

  // con el mismo avance que SGSPE, SRTM pasa a «Continuar» (la primera del servidor), con el progreso por lección de su aula
  await toMyCourses(page).click()
  const hero = page.getByRole('region', { name: 'Continuar', exact: true })
  await expect(hero.getByRole('heading', { name: COURSE })).toBeVisible()
  await expect(hero.getByRole('img', { name: '1 de 3 completadas' })).toBeVisible()
  await expect(hero.getByText('Recorrido por la pantalla')).toBeVisible()
})

// STARTED se envía una sola vez al entrar y el avance se ve al volver
test('entrar desde el panel inicia la lección una sola vez y al volver se ve lo que guardó el servidor', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(page.getByRole('region', { name: 'Por hacer' }).getByRole('link', { name: /Evaluación final/ })).toBeVisible()

  await card.getByRole('link', { name: `Continuar «${COURSE}»` }).click()
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Empezada' })).toBeVisible()
  const started = 'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events'
  expect(api.classroomRequests.filter((request) => request === started)).toEqual([started])

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  // con el mismo avance que SGSPE, SRTM pasa a «Continuar»
  await toMyCourses(page).click()
  const hero = page.getByRole('region', { name: 'Continuar', exact: true })
  await expect(hero.getByRole('img', { name: '1 de 3 completadas' })).toBeVisible()
  await expect(hero.getByText('Recorrido por la pantalla')).toBeVisible()

  // volver a entrar a la lección ya iniciada no la inicia otra vez
  await hero.getByRole('link', { name: `Continuar «${COURSE}»` }).click()
  await units.getByRole('link', { name: /^Tipos de anuncio/ }).click()
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()
  expect(api.classroomRequests.filter((request) => request === started)).toHaveLength(2)
  expect(api.unexpected).toEqual([])
})

test.describe('el panel del estudiante', () => {
  // las sesiones de los ejemplos tienen fecha fija: se mira el panel antes de la de noviembre
  const BEFORE_SESSION = new Date('2026-11-13T12:00:00Z')

  test('saluda, destaca una sola primaria y el riel dice lo que viene', async ({ page }) => {
    await page.clock.setFixedTime(BEFORE_SESSION)
    const api = await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos')

    await expect(page.getByText('Hola, Rosa Estudiante.')).toBeVisible()
    await expect(page.getByText('Tienes 1 sesión en vivo en los próximos 7 días. Tienes 1 evaluación por hacer.')).toBeVisible()
    // SGSPE lleva 1 de 3 y SRTM sin empezar: gana la que tiene avance
    const hero = page.getByRole('region', { name: 'Continuar', exact: true })
    await expect(hero.getByRole('heading', { name: 'Introducción al SGSPE' })).toBeVisible()
    await expect(hero.getByText('Unidad 1 · §1.2')).toBeVisible()
    await expect(hero.getByRole('img', { name: /^1 de \d+ completadas/ })).toBeVisible()
    await expect(hero.getByRole('link', { name: 'Continuar «Introducción al SGSPE»' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-eva')
    await expect(page.locator('main [data-slot="button"][data-variant="primary"]')).toHaveCount(1)

    // la semana sale de la agenda: una sola petición, el día en su zona
    const sessions = page.getByRole('region', { name: 'Esta semana' })
    await expect(sessions.getByRole('link', { name: /Recuperación de la consulta/ })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/sesiones')
    await expect(sessions.getByRole('link', { name: /Consulta de la unidad/ })).toHaveCount(0)
    await expect(sessions.getByText('mar', { exact: true })).toBeVisible()
    await expect(sessions.locator('time')).toContainText('8:00')
    expect(api.classroomRequests.filter((request) => request === 'GET /api/lms/classroom/sessions')).toHaveLength(1)
    expect(api.classroomRequests.filter((request) => /^GET \/api\/lms\/classroom\/enrollments\/[^/]+\/sessions$/.test(request))).toEqual([])
    await expect(page.getByRole('region', { name: 'Por hacer' }).getByRole('link', { name: /Evaluación final/ })).toContainText('Quedan 2 intentos')
    expect(api.unexpected).toEqual([])
  })

  test('si falla el panel, los cursos y la semana siguen, «Por hacer» lo dice y «Reintentar» lo recupera', async ({ page }) => {
    await page.clock.setFixedTime(BEFORE_SESSION)
    const api = await fakeApi(page, { signedIn: true })
    api.failOnce((url) => url.pathname === '/api/lms/classroom/panel', 503)
    await page.goto('/mis-cursos')

    const pending = page.getByRole('region', { name: 'Por hacer' })
    await expect(pending.getByRole('alert')).toContainText('No pudimos cargar tus evaluaciones.')
    await expect(page.getByRole('region', { name: 'Continuar', exact: true }).getByRole('link', { name: /^Continuar/ })).toBeVisible()
    // la semana no depende del panel: sale de la agenda
    await expect(page.getByRole('region', { name: 'Esta semana' }).getByRole('link', { name: /Recuperación de la consulta/ })).toBeVisible()
    await expect(page.getByText('Tienes 1 sesión en vivo en los próximos 7 días.')).toBeVisible()
    // en la buena no se pide: esta lista solo existe para no dejar la pantalla en blanco
    expect(api.classroomRequests.filter((request) => request === 'GET /api/lms/classroom/enrollments')).toHaveLength(1)

    await pending.getByRole('button', { name: 'Reintentar las evaluaciones' }).click()
    await expect(pending.getByRole('link', { name: /Evaluación final/ })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('con más matrículas que una página las lee todas; si falla una posterior, no da por completo lo leído', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true })
    const COUNT = 130
    const read: number[] = []
    let down = true
    await page.route('**/api/lms/classroom/panel*', (route) => {
      const { searchParams } = new URL(route.request().url())
      const number = Number(searchParams.get('page'))
      const size = Number(searchParams.get('size'))
      read.push(number)
      if (number === 1 && down) return route.fulfill({ status: 500, json: { status: 500, title: 'Error', detail: 'fallo' } })
      const rows = Array.from({ length: COUNT }, (_, index) => ({ ...enrollment, id: `mat-${index}`, upcomingSessions: [], pendingAssessments: [] }))
      return route.fulfill({ json: rows.slice(number * size, (number + 1) * size) })
    })
    await page.route('**/api/lms/classroom/enrollments', (route) => route.fulfill({ json: [enrollment] }))
    await page.goto('/mis-cursos')

    await expect(page.getByRole('region', { name: 'Por hacer' }).getByRole('alert')).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(1)

    down = false
    await page.getByRole('button', { name: 'Reintentar las evaluaciones' }).click()
    await expect(page.getByRole('article')).toHaveCount(COUNT)
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(read).toEqual([0, 1, 0, 1])
    // por matrícula, solo el aula de la de «Continuar»: la de la lista de respaldo y, ya leído el panel, la primera de sus páginas
    expect(new Set(api.classroomRequests.filter((request) => /enrollments\/mat-/.test(request)))).toEqual(
      new Set(['GET /api/lms/classroom/enrollments/mat-srtm-1', 'GET /api/lms/classroom/enrollments/mat-0'])
    )
  })

  test('sin matrículas ofrece el catálogo', async ({ page }) => {
    // sin SRTM queda SGSPE, que la simulación siempre tiene: se vacía la lista para ver el estado vacío
    await fakeApi(page, { signedIn: true })
    await page.route('**/api/lms/classroom/panel*', (route) => route.fulfill({ json: [] }))
    await page.goto('/mis-cursos')
    await expect(page.getByText('Todavía no estás matriculado en ningún curso')).toBeVisible()
    await page.getByRole('link', { name: 'Ver el catálogo' }).click()
    await expect(page).toHaveURL('/cursos')
  })

  for (const width of [360, 390, 1024, 1440, 1920])
    test(`no desborda en horizontal a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await fakeApi(page, { signedIn: true })
      await page.goto('/mis-cursos')
      await expect(page.getByRole('region', { name: 'Continuar', exact: true })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
})

test('sin sesión, «Mis cursos» pide iniciar sesión y recuerda adónde iba', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/mis-cursos')
  await expect(page).toHaveURL('/login?returnTo=%2Fmis-cursos')
})

test('una matrícula ajena es «No encontramos este curso en tus matrículas»', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/de-otra-persona')
  await expect(page.getByRole('heading', { level: 1, name: 'No encontramos este curso en tus matrículas' })).toBeVisible()
  await page.getByRole('link', { name: '← Mis cursos' }).click()
  await expect(page).toHaveURL('/mis-cursos')
})

test('la lección HTML se lee en la página, desde su lectura en bloques: sin iframe ni archivo', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')

  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  const reading = page.getByRole('region', { name: 'Tipos de anuncio (lectura)' })
  await expect(reading.getByRole('heading', { level: 4, name: 'Entrar y salir del portal' })).toHaveAttribute('id', 'lectura-_entrar_y_salir_del_portal')
  await expect(reading.getByRole('note', { name: 'Nota' })).toContainText('Lectura ilustrativa de la demostración')
  await expect(reading.getByText(/^Necesita tres cosas/)).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(api.classroomRequests).toContain('GET /api/lms/classroom/enrollments/mat-srtm-1/resources/rec-html/reading')
  expect(api.fileRequests).toEqual([])
})

test('la lectura no pide nada fuera ni ejecuta nada: un bloque desconocido, un enlace javascript: y una imagen remota no llegan', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  const outside: string[] = []
  await page.route('https://rastreo.example/**', (route) => {
    outside.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'image/png', body: '' })
  })
  const dialogs: string[] = []
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message())
    void dialog.dismiss()
  })
  // gana a la simulación: Playwright prueba primero la última ruta registrada
  await page.route('**/api/lms/classroom/enrollments/mat-srtm-1/resources/rec-html/reading', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        title: null,
        blocks: [
          { type: 'heading', level: 2, id: 'app', content: [{ type: 'text', text: 'Tipos de anuncio' }] },
          { type: 'html', html: '<img src="https://rastreo.example/pixel.png" onerror="alert(1)">' },
          { type: 'figure', src: 'https://rastreo.example/figura.png', alt: 'remota', caption: null },
          { type: 'figure', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: 'en línea', caption: null },
          { type: 'paragraph', content: [{ type: 'link', href: 'javascript:alert(2)', content: [{ type: 'text', text: 'pulsa aquí' }] }] },
          { type: 'paragraph', content: [{ type: 'link', href: 'https://example.org/', content: [{ type: 'text', text: 'un sitio' }] }] }
        ]
      })
    })
  )
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')

  const reading = page.getByRole('region', { name: 'Tipos de anuncio (lectura)' })
  await expect(reading.getByRole('heading', { level: 4, name: 'Tipos de anuncio' })).toHaveAttribute('id', 'lectura-app')
  await expect(reading.getByRole('img', { name: 'en línea' })).toBeVisible()
  await expect(reading.getByRole('img')).toHaveCount(1)
  await expect(reading.getByText('pulsa aquí')).toBeVisible()
  await expect(reading.getByRole('link', { name: 'pulsa aquí' })).toHaveCount(0)
  const external = reading.getByRole('link', { name: 'un sitio (abre en otra pestaña)' })
  await expect(external).toHaveAttribute('target', '_blank')
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  // tiempo de sobra para que la imagen se hubiera pedido o el script hubiera corrido
  await page.waitForTimeout(1000)
  expect(outside).toEqual([])
  expect(dialogs).toEqual([])
})

test('el PDF se descarga con su nombre y el vídeo se reproduce desde memoria', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-pdf')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Descargar guia-liquidacion\.pdf/ }).click()
  expect((await download).suggestedFilename()).toBe('guia-liquidacion.pdf')

  await openUnit(page, /^Unidad 1\./)
  await page
    .getByRole('navigation', { name: 'Unidades del curso' })
    .getByRole('link', { name: /^Recorrido por la pantalla/ })
    .click()
  await expect(page.locator('video')).toHaveAttribute('src', /^blob:/)
  expect(api.fileRequests.map((file) => file.authorization)).toEqual(['Bearer token-e2e', 'Bearer token-e2e'])
})

test('las unidades se recorren con el teclado y el foco va a la lección abierta', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1')
  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()

  // la unidad plegada se abre con el teclado, y sus lecciones entran en el orden de tabulación
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  const closed = units.locator('summary').filter({ hasText: /^Unidad 2\./ })
  for (let i = 0; i < 40 && !(await closed.evaluate((element) => element === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(closed).toBeFocused()
  await page.keyboard.press('Enter')
  const target = units.getByRole('link', { name: /^Guía de liquidación/ })
  await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-pdf')
  await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeFocused()
  await expect(target).toHaveAttribute('aria-current', 'page')
})

test.describe('el horario', () => {
  // el lunes 16 de noviembre por la mañana en Lima: la recuperación de SGSPE es el martes 17 a las 08:00 de Lima
  const MONDAY = new Date('2026-11-16T14:00:00Z')

  test('«Horario» está en el menú; la semana va en la URL y atrás vuelve a la anterior', async ({ page }) => {
    await page.clock.setFixedTime(MONDAY)
    const api = await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos')

    await page.getByRole('link', { name: 'Horario', exact: true }).click()
    await expect(page).toHaveURL('/horario')
    await expect(page.getByRole('heading', { level: 1, name: 'Semana del 16 al 22 de noviembre' })).toBeVisible()
    const details = page.getByRole('region', { name: 'Sesiones de la semana' })
    const recovery = details.getByRole('article', { name: 'Recuperación de la consulta' })
    await expect(recovery).toContainText('8:00')
    await expect(recovery).toContainText('Introducción al SGSPE')
    // el bloque de la rejilla lleva a su detalle
    await page.getByRole('link', { name: /Recuperación de la consulta, Programada$/ }).click()
    await expect(page).toHaveURL(/#sesion-mat-sgspe-1-ses-3$/)

    await page.getByRole('link', { name: 'Semana siguiente' }).click()
    await expect(page).toHaveURL('/horario?semana=2026-11-23')
    await expect(page.getByText('No tienes sesiones esta semana')).toBeVisible()
    await page.goBack()
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Semana del 16 al 22 de noviembre' })).toBeVisible()

    // la lista, elegida, se recuerda al volver
    await page.getByRole('button', { name: 'Lista' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('region', { name: 'Sesiones de la semana' })).toHaveCount(0)
    expect(api.unexpected).toEqual([])
  })

  for (const width of [360, 390, 768, 1024, 1440])
    test(`no desborda en horizontal a ${width} px`, async ({ page }) => {
      await page.clock.setFixedTime(MONDAY)
      await page.setViewportSize({ width, height: 800 })
      await fakeApi(page, { signedIn: true })
      await page.goto('/horario')
      await expect(page.getByRole('article', { name: 'Recuperación de la consulta' })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('el índice se abre en una hoja inferior y el aula no desborda su área', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos/mat-srtm-1')
    await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()

    // la lectura empieza en la primera mitad de la pantalla, no tras una columna de metadatos
    const reading = await page.locator('[data-reading]').boundingBox()
    expect(reading?.y).toBeLessThan(844 / 2)

    const units = page.getByRole('navigation', { name: 'Unidades del curso' })
    await expect(units).toBeHidden()
    await page.getByRole('button', { name: 'Índice' }).click()
    await expect(units).toBeVisible()
    await openUnit(page, /^Unidad 2\./)
    await units.getByRole('link', { name: /^Guía de liquidación/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeVisible()
    await expect(units).toBeHidden()

    // lo del aula cabe en el área que deja el shell
    const wider = await page.locator('main').evaluate((main) => {
      const right = main.getBoundingClientRect().right
      return [...main.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > right + 0.5)
        .map((element) => `${element.tagName}.${String(element.className).slice(0, 80)}`)
    })
    expect(wider).toEqual([])
  })
})

test('las pestañas del curso cambian de sección por URL, y volver a Lecciones no cambia la lección abierta', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-video')
  const tabs = page.getByRole('navigation', { name: 'Secciones del curso' })
  await expect(tabs.getByRole('link', { name: 'Lecciones' })).toHaveAttribute('aria-current', 'page')

  await tabs.getByRole('link', { name: 'Lecciones' }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-video')
  await expect(page.getByRole('heading', { level: 2, name: 'Recorrido por la pantalla' })).toBeVisible()

  await tabs.getByRole('link', { name: 'Sesiones' }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1/sesiones')
  await expect(tabs.getByRole('link', { name: 'Sesiones' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('list', { name: 'Tu avance' })).toBeVisible()

  await tabs.getByRole('link', { name: 'Finalización' }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1/finalizacion')
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
  expect(api.unexpected).toEqual([])
})

test('las filas del temario y las pestañas tienen objetivos de 44 px o más', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1')
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  for (const row of await units.getByRole('link').all()) expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  for (const summary of await units.locator('summary').all()) expect((await summary.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  for (const tab of await page.getByRole('navigation', { name: 'Secciones del curso' }).getByRole('link').all())
    expect((await tab.boundingBox())?.height).toBeGreaterThanOrEqual(44)
})

for (const width of [360, 390, 1024, 1440, 1920])
  for (const path of ['/mis-cursos/mat-sgspe-1', '/mis-cursos/mat-sgspe-1/sesiones', '/mis-cursos/mat-sgspe-1/finalizacion'])
    test(`${path} no desborda en horizontal a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await fakeApi(page, { signedIn: true })
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: 'Secciones del curso' })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })

// RF-AUL-08: los logros, en el panel del temario junto al avance
const achievements = (page: Page) => page.getByRole('region', { name: 'Logros' })

test('sin logros no hay sección; al completar la última lección de la unidad aparece el logro y enlaza a ella', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-pdf')
  await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeVisible()
  await expect(achievements(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Marcar como completada' }).click()

  const link = achievements(page).getByRole('link', { name: /^La liquidación.*Unidad completada/ })
  await expect(link).toBeVisible()
  await expect(link.locator('time')).toHaveAttribute('datetime', /^\d{4}-/)
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  await achievements(page)
    .getByRole('link', { name: /^La liquidación/ })
    .click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-pdf')
})

test('la evaluación aprobada y el certificado enlazan a su lección y a su certificado; a 390 px, desde la hoja del temario', async ({ page }) => {
  await fakeApi(page, { signedIn: true, courseComplete: true, certificateIssued: true })
  await page.setViewportSize({ width: 390, height: 844 })
  // la simulación no emite el certificado al cargar: se añade a la respuesta
  const url = '**/api/lms/classroom/enrollments/mat-sgspe-1'
  await page.goto('/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1')
  const data = await page.evaluate(() => fetch('/api/lms/classroom/enrollments/mat-sgspe-1').then((response) => response.json()))
  await page.route(url, (route) =>
    route.fulfill({
      json: { ...data, achievements: [...data.achievements, { kind: 'CERTIFICATE_ISSUED', at: '2026-11-05T09:00:00Z', ref: 'K7Q2-M9XW-4RTB' }] }
    })
  )
  await page.reload()

  await page.getByRole('button', { name: 'Índice' }).click()
  await achievements(page)
    .getByRole('link', { name: /^Evaluación final.*Evaluación aprobada/ })
    .click()
  await expect(page).toHaveURL('/mis-cursos/mat-sgspe-1?leccion=lec-eva')
  // la hoja se cerró al elegir
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Índice' }).click()
  await achievements(page)
    .getByRole('link', { name: /^Certificado emitido.*5 nov 2026/ })
    .click()
  await expect(page).toHaveURL('/certificados/K7Q2-M9XW-4RTB')
})

test('fecha nula, referencia sin resolver y tipo desconocido no rompen el aula', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1')
  const data = await page.evaluate(() => fetch('/api/lms/classroom/enrollments/mat-sgspe-1').then((response) => response.json()))
  await page.route('**/api/lms/classroom/enrollments/mat-sgspe-1', (route) =>
    route.fulfill({
      json: {
        ...data,
        achievements: [
          { kind: 'ASSESSMENT_PASSED', at: '2026-11-04T10:05:00Z', ref: 'eva-de-otra-version' },
          { kind: 'NUEVO_TIPO', at: '2026-11-04T10:06:00Z', ref: 'x' },
          { kind: 'UNIT_COMPLETED', at: null, ref: 'uni-sg-1' }
        ]
      }
    })
  )
  await page.reload()

  await expect(page.getByRole('heading', { level: 2, name: 'Qué es el SGSPE' })).toBeVisible()
  const rows = achievements(page).getByRole('listitem')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toHaveText(/Evaluación aprobada.*4 nov 2026/)
  await expect(rows.first().getByRole('link')).toHaveCount(0)
  await expect(rows.last().getByRole('link', { name: /^El SGSPE/ })).toBeVisible()
  await expect(rows.last().locator('time')).toHaveCount(0)
})

test('los logros no añaden peticiones: las lecturas del aula son las mismas con ellos y sin ellos', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  const path = '/mis-cursos/mat-sgspe-1?leccion=lec-sgspe-1'
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  let reads: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname.startsWith('/api/')) reads.push(new URL(request.url()).pathname)
  })
  const load = async () => {
    reads = []
    await page.reload()
    await page.waitForLoadState('networkidle')
    return [...reads].sort()
  }
  const without = await load()
  await expect(achievements(page)).toHaveCount(0)

  const data = await page.evaluate(() => fetch('/api/lms/classroom/enrollments/mat-sgspe-1').then((response) => response.json()))
  await page.route('**/api/lms/classroom/enrollments/mat-sgspe-1', (route) =>
    route.fulfill({ json: { ...data, achievements: [{ kind: 'UNIT_COMPLETED', at: '2026-11-03T15:20:00Z', ref: 'uni-sg-1' }] } })
  )
  const withThem = await load()
  await expect(achievements(page)).toBeVisible()
  expect(withThem).toEqual(without)
})
