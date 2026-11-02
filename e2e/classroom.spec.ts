import { expect, test, type Page } from '@playwright/test'
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
  // el riel también lee el aula y las sesiones de cada matrícula: el orden se comprueba entre estas dos peticiones
  const list = 'GET /api/lms/classroom/enrollments'
  const opened = 'GET /api/lms/classroom/enrollments/mat-srtm-1'
  expect(api.classroomRequests.filter((request) => request === list || request === opened).slice(0, 2)).toEqual([list, opened])
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
  await expect(page.frameLocator('iframe[title="Tipos de anuncio (lectura)"]').getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  // abrirla la inició en el servidor
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Empezada' })).toBeVisible()

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  const next = page.getByRole('link', { name: 'Siguiente lección: Recorrido por la pantalla' })
  await expect(next).toBeFocused()
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Completada' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '33')
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
    { id: 'lec-html', title: 'Tipos de anuncio', position: 'Unidad 1 · Lección 1' },
    { id: 'lec-video', title: 'Recorrido por la pantalla', position: 'Unidad 1 · Lección 2' },
    { id: 'lec-pdf', title: 'Guía de liquidación', position: 'Unidad 2 · Lección 1' },
    { id: 'lec-quiz', title: 'Cuestionario de la unidad', position: 'Unidad 2 · Lección 2' }
  ]

  for (const [index, lesson] of walk.entries()) {
    if (index > 0) await steps.getByRole('link', { name: `Siguiente ${lesson.title}` }).click()
    await expect(page).toHaveURL(`/mis-cursos/mat-srtm-1?leccion=${lesson.id}`)
    await expect(page.getByRole('heading', { level: 2, name: lesson.title })).toBeVisible()
    await expect(page.getByText(lesson.position)).toBeVisible()
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

  await toMyCourses(page).click()
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  await expect(card.getByText('Siguiente: Recorrido por la pantalla')).toBeVisible()
})

// el panel ya leyó el aula: entrar en ella sale de la caché, pero STARTED se envía igual y el avance se ve al volver
test('entrar desde el panel inicia la lección una sola vez y al volver se ve lo que guardó el servidor', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
  await expect(page.getByRole('region', { name: 'Evaluaciones pendientes' }).getByRole('link', { name: /Evaluación final/ })).toBeVisible()

  await card.getByRole('link', { name: `Continuar «${COURSE}»` }).click()
  const units = page.getByRole('navigation', { name: 'Unidades del curso' })
  await expect(units.getByRole('link', { name: 'Tipos de anuncio Empezada' })).toBeVisible()
  const started = 'POST /api/lms/classroom/enrollments/mat-srtm-1/lessons/lec-html/events'
  expect(api.classroomRequests.filter((request) => request === started)).toEqual([started])

  await page.getByRole('button', { name: 'Marcar como completada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  await toMyCourses(page).click()
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  await expect(card.getByText('Siguiente: Recorrido por la pantalla')).toBeVisible()

  // volver a entrar a la lección ya iniciada no la inicia otra vez
  await card.getByRole('link', { name: COURSE, exact: true }).click()
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

    await expect(page.getByText('Hola, Rosa Estudiante. Tienes 1 sesión en vivo en los próximos 7 días.')).toBeVisible()
    // SGSPE lleva 1 de 3 y SRTM sin empezar: gana la que tiene avance
    const hero = page.getByRole('region', { name: 'Continuar aprendiendo' })
    await expect(hero.getByRole('heading', { name: 'Introducción al SGSPE' })).toBeVisible()
    await expect(hero.getByText('Unidad 1 · Lección 2')).toBeVisible()
    await expect(hero.getByRole('link', { name: 'Continuar «Introducción al SGSPE»' })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1?leccion=lec-eva')
    await expect(page.locator('main [data-slot="button"][data-variant="primary"]')).toHaveCount(1)

    const sessions = page.getByRole('region', { name: 'Próximas sesiones' })
    await expect(sessions.getByRole('link', { name: /Recuperación de la consulta/ })).toHaveAttribute('href', '/mis-cursos/mat-sgspe-1/sesiones')
    await expect(sessions.getByRole('link', { name: /Consulta de la unidad/ })).toHaveCount(0)
    await expect(sessions.locator('time')).toContainText('mar')
    await expect(page.getByRole('region', { name: 'Evaluaciones pendientes' }).getByRole('link', { name: /Evaluación final/ })).toContainText(
      'Quedan 2 intentos'
    )
    expect(api.unexpected).toEqual([])
  })

  test('si fallan las sesiones solo lo dice su bloque y «Reintentar» lo recupera', async ({ page }) => {
    await page.clock.setFixedTime(BEFORE_SESSION)
    const api = await fakeApi(page, { signedIn: true })
    api.failOnce((url) => url.pathname.endsWith('/mat-sgspe-1/sessions'), 503)
    await page.goto('/mis-cursos')

    const sessions = page.getByRole('region', { name: 'Próximas sesiones' })
    await expect(sessions.getByRole('alert')).toContainText('No pudimos cargar tus próximas sesiones.')
    await expect(page.getByRole('alert')).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Continuar aprendiendo' }).getByRole('link', { name: /^Continuar/ })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Evaluaciones pendientes' }).getByRole('link', { name: /Evaluación final/ })).toBeVisible()
    await expect(page.getByText(/próximos 7 días/)).toHaveCount(0)

    await sessions.getByRole('button', { name: 'Reintentar las sesiones' }).click()
    await expect(sessions.getByRole('link', { name: /Recuperación de la consulta/ })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('sin matrículas ofrece el catálogo', async ({ page }) => {
    // sin SRTM queda SGSPE, que la simulación siempre tiene: se vacía la lista para ver el estado vacío
    await fakeApi(page, { signedIn: true })
    await page.route('**/api/lms/classroom/enrollments', (route) => route.fulfill({ json: [] }))
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
      await expect(page.getByRole('region', { name: 'Continuar aprendiendo' })).toBeVisible()
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

test('la lección HTML se lee en un iframe aislado: su script no corre', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')

  await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()
  const frame = page.locator('iframe[title="Tipos de anuncio (lectura)"]')
  await expect(frame).toHaveAttribute('sandbox', '')
  const content = page.frameLocator('iframe[title="Tipos de anuncio (lectura)"]')
  await expect(content.getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  await expect(content.locator('body')).not.toHaveAttribute('data-script')
  expect(api.fileRequests).toEqual([{ path: '/api/objects/version_recurso/records/vr-html/files/archivo', authorization: 'Bearer token-e2e' }])
})

test('la lectura HTML no pide nada fuera: ni imágenes, ni estilos, ni fuentes remotas, y un meta refresh no la lleva a otra página', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  const outside: string[] = []
  await page.route('https://rastreo.example/**', (route) => {
    outside.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'image/png', body: '' })
  })
  // gana a la simulación: Playwright prueba primero la última ruta registrada
  await page.route('**/api/objects/version_recurso/records/vr-html/files/archivo', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body:
        '<!doctype html><html><head><meta http-equiv="refresh" content="0; url=https://rastreo.example/fuera">' +
        '<link rel="stylesheet" href="https://rastreo.example/estilo.css"><style>@font-face { font-family: f; src: url(https://rastreo.example/f.woff2) }' +
        ' body { font-family: f }</style></head><body><h1>Tipos de anuncio</h1><img alt="píxel" src="https://rastreo.example/pixel.png">' +
        '<img alt="en línea" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></body></html>'
    })
  )
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')

  const content = page.frameLocator('iframe[title="Tipos de anuncio (lectura)"]')
  await expect(content.getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  await expect(content.getByRole('img', { name: 'en línea' })).toBeVisible()
  // tiempo de sobra para que el refresh, la imagen, el estilo o la fuente se hubieran pedido
  await page.waitForTimeout(1500)
  await expect(content.getByRole('heading', { name: 'Tipos de anuncio' })).toBeVisible()
  expect(outside).toEqual([])
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

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('el temario se abre en una hoja inferior y el aula no desborda su área', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos/mat-srtm-1')
    await expect(page.getByRole('heading', { level: 2, name: 'Tipos de anuncio' })).toBeVisible()

    // la lectura empieza en la primera mitad de la pantalla, no tras una columna de metadatos
    const reading = await page.locator('iframe').boundingBox()
    expect(reading?.y).toBeLessThan(844 / 2)

    const units = page.getByRole('navigation', { name: 'Unidades del curso' })
    await expect(units).toBeHidden()
    await page.getByRole('button', { name: 'Temario' }).click()
    await expect(units).toBeVisible()
    await openUnit(page, /^Unidad 2\./)
    await units.getByRole('link', { name: /^Guía de liquidación/ }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Guía de liquidación' })).toBeVisible()
    await expect(units).toBeHidden()

    // el menú lateral del shell de @wasichai/core no se pliega en el móvil (es de core); lo del aula cabe en el resto
    const wider = await page.locator('main').evaluate((main) => {
      const right = main.getBoundingClientRect().right
      return [...main.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > right + 0.5)
        .map((element) => `${element.tagName}.${String(element.className).slice(0, 80)}`)
    })
    expect(wider).toEqual([])
  })
})

test('las pestañas del curso cambian de sección por URL, y volver a Temario no cambia la lección abierta', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-video')
  const tabs = page.getByRole('navigation', { name: 'Secciones del curso' })
  await expect(tabs.getByRole('link', { name: 'Temario' })).toHaveAttribute('aria-current', 'page')

  await tabs.getByRole('link', { name: 'Temario' }).click()
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
