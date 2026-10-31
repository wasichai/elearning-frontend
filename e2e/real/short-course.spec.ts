import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { API_URL, newStudent, signIn, token, type Account } from './helpers'

// el curso corto de punta a punta contra el backend de verdad (CORTO-101, ADR-0016), en el navegador. son los recorridos
// 5 (evaluación), 6 (resultado), 7 (el docente ve lo permitido) y 13 (sin permiso no puede), hasta el certificado
// verificado sin sesión. solo con E2E_REAL=1 (yarn e2e:real) y con WASICHAI_DEMO_PASSWORD, la de los usuarios demo
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')
test.skip(!process.env.WASICHAI_DEMO_PASSWORD, 'necesita WASICHAI_DEMO_PASSWORD, la de los usuarios demo')

const DEMO_PASSWORD = process.env.WASICHAI_DEMO_PASSWORD ?? ''
const TEACHER = { email: 'docente@demo.wasichai-learning.test', password: DEMO_PASSWORD }
// docente de verdad (rol DOCENTE), pero sin esta edición asignada
const OTHER_TEACHER = { email: 'docente.revisor@demo.wasichai-learning.test', password: DEMO_PASSWORD }

const OFFERING = 'CORTO-101-A'
const COURSE = 'Curso corto: mensajes de error claros'
const READING = 'Entrar, salir y qué decir cuando falla'
const ASSESSMENT = 'Evaluación: reescribir un mensaje'
const SESSION_LESSON = 'Sesión de revisión en grupo'
const OPEN_QUESTION = '3. Reescribe «Operación inválida» para que ayude a quien lo lee.'
const HOLDER = 'Rosa Quispe Mamani'

const units = (page: Page) => page.getByRole('navigation', { name: 'Unidades del curso' })

async function shortCourseSlug(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_URL}/api/lms/public/catalog/courses?q=mensajes`)
  const body = (await response.json()) as { content: { code: string; slug: string }[] }
  const course = body.content.find((candidate) => candidate.code === 'CORTO-101')
  expect(course, 'el catálogo aún no muestra CORTO-101: aplica la demo y espera el refresco').toBeDefined()
  return course!.slug
}

// cada persona en su propio contexto: ni sesión ni almacenamiento compartidos
async function browserFor(browser: Browser, baseURL: string | undefined, account?: Account) {
  const context = await browser.newContext({ baseURL, locale: 'es-PE', timezoneId: 'America/Lima' })
  const page = await context.newPage()
  if (account) await signIn(page, account)
  return { context, page }
}

async function enroll(page: Page, slug: string): Promise<string> {
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)
  return /\/mis-cursos\/([0-9a-f-]{36})/.exec(page.url())![1]!
}

test('el curso corto: matrícula, evaluación, corrección, asistencia y certificado verificado; sin permiso no se llega', async ({
  page,
  browser,
  baseURL,
  request
}) => {
  test.setTimeout(240_000)
  const student = await newStudent(request)
  const slug = await shortCourseSlug(request)
  let attemptUrl = ''
  let attemptId = ''

  await test.step('recorrido 5: se matricula, completa la lectura, responde la evaluación y envía', async () => {
    await signIn(page, student)
    await enroll(page, slug)
    await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()

    await units(page)
      .getByRole('link', { name: new RegExp(`^${READING}`) })
      .click()
    await expect(page.getByRole('heading', { level: 2, name: READING })).toBeVisible()
    await page.getByRole('button', { name: 'Marcar como completada' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()

    await units(page)
      .getByRole('link', { name: new RegExp(`^${ASSESSMENT}`) })
      .click()
    await expect(page.getByText('Se completa al aprobar la evaluación.')).toBeVisible()
    await page.getByRole('button', { name: 'Empezar el intento' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeVisible()
    await expect(page).toHaveURL(/intento=/)
    attemptUrl = page.url()
    attemptId = new URL(attemptUrl).searchParams.get('intento')!

    await page
      .getByRole('group', { name: /^1\. / })
      .getByRole('radio', { name: /^Qué pasó/ })
      .check()
    await page.getByRole('group', { name: /^2\. / }).getByRole('radio', { name: 'Falso' }).check()
    await page.getByRole('textbox', { name: OPEN_QUESTION }).fill('No pudimos guardar: falta la fecha. Complétala e inténtalo de nuevo.')
    await expect(page.getByText('Dice qué hacer a continuación (3 puntos)')).toBeVisible()

    // lo guardado sobrevive a recargar: lo tiene el servidor
    await page.getByRole('button', { name: 'Guardar respuestas' }).click()
    await expect(page.getByText(/^Respuestas guardadas a las/)).toBeVisible()
    await page.reload()
    await expect(page.getByRole('textbox', { name: OPEN_QUESTION })).toHaveValue(/^No pudimos guardar/)

    await page.getByRole('button', { name: 'Enviar el intento' }).click()
    const confirm = page.getByRole('dialog', { name: '¿Enviar el intento?' })
    await expect(confirm).toContainText('Respondiste todas las preguntas.')
    await confirm.getByRole('button', { name: 'Enviar' }).click()

    await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Pendiente de corrección' })).toContainText('Por ahora llevas 4 de 10 puntos.')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  await test.step('recorrido 13: sin permiso no se llega a esa edición ni a ese intento', async () => {
    const paths = [`/docencia/${OFFERING}`, `/docencia/${OFFERING}/correccion`, `/docencia/${OFFERING}/correccion/${attemptId}`]
    const apis = [
      `/api/lms/teaching/offerings/${OFFERING}/students`,
      `/api/lms/teaching/offerings/${OFFERING}/attempts`,
      `/api/lms/teaching/attempts/${attemptId}`,
      `/api/lms/teaching/offerings/${OFFERING}/sessions`
    ]

    // otro docente: tiene el menú, pero la edición y el intento no son suyos
    const other = await browserFor(browser, baseURL, OTHER_TEACHER)
    try {
      await other.page.getByRole('link', { name: 'Mis ediciones' }).click()
      await expect(other.page.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeVisible()
      await expect(other.page.getByRole('link', { name: COURSE })).toHaveCount(0)
      await other.page.goto(paths[0]!)
      await expect(other.page.getByRole('alert')).toContainText('Esta edición no está entre las tuyas')
      await other.page.goto(paths[1]!)
      await expect(other.page.getByRole('alert')).toContainText('Esta edición no está entre las tuyas')
      await other.page.goto(paths[2]!)
      await expect(other.page.getByRole('alert')).toContainText('Este intento no es de tus ediciones')
    } finally {
      await other.context.close()
    }
    const otherToken = await token(request, OTHER_TEACHER.email, OTHER_TEACHER.password)
    for (const path of apis) {
      const response = await request.get(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${otherToken}` } })
      expect(response.status(), `otro docente: GET ${path}`).toBe(404)
    }
    const graded = await request.post(`${API_URL}/api/lms/teaching/attempts/${attemptId}/grades`, {
      headers: { Authorization: `Bearer ${otherToken}` },
      data: { questionId: 'cualquiera', points: 6, comment: null, reason: null }
    })
    expect(graded.status(), 'otro docente: POST grades').toBe(404)

    // otro estudiante: ni menú ni edición, y el intento de quien sea no es suyo
    const intruder = await newStudent(request)
    const stranger = await browserFor(browser, baseURL, intruder)
    try {
      await expect(stranger.page.getByRole('link', { name: 'Mis cursos' })).toBeVisible()
      await expect(stranger.page.getByRole('link', { name: 'Mis ediciones' })).toHaveCount(0)
      await stranger.page.goto(paths[2]!)
      await expect(stranger.page.getByRole('alert')).toContainText('Este intento no es de tus ediciones')
      await stranger.page.goto(paths[0]!)
      await expect(stranger.page.getByRole('alert')).toContainText('Esta edición no está entre las tuyas')
    } finally {
      await stranger.context.close()
    }
    const intruderToken = await token(request, intruder.email, intruder.password)
    for (const path of [...apis, `/api/lms/classroom/attempts/${attemptId}`]) {
      const response = await request.get(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${intruderToken}` } })
      expect(response.status(), `otro estudiante: GET ${path}`).toBe(404)
    }
  })

  await test.step('recorrido 7: el docente, por Docencia, ve su edición y su matriculado, corrige con la rúbrica y pasa asistencia', async () => {
    const teacher = await browserFor(browser, baseURL, TEACHER)
    try {
      const { page: desk } = teacher
      await desk.getByRole('link', { name: 'Mis ediciones' }).click()
      await desk.getByRole('article').filter({ hasText: OFFERING }).getByRole('link', { name: COURSE }).click()
      await expect(desk).toHaveURL(`/docencia/${OFFERING}`)

      const row = desk.getByRole('row').filter({ has: desk.getByRole('rowheader', { name: student.email }) })
      await expect(row).toContainText('Evaluación: reescribir un mensaje: pendiente de corrección')
      await expect(row).toContainText('33 % (1 de 3 lecciones)')

      await desk.getByRole('link', { name: /^Cola de corrección/ }).click()
      await desk.getByRole('link', { name: `Corregir «${ASSESSMENT}» de ${student.email}` }).click()
      await expect(desk.getByText(`Estudiante: ${student.email}`)).toBeVisible()
      const question = desk.getByRole('article', { name: OPEN_QUESTION })
      await expect(question).toContainText('No pudimos guardar: falta la fecha.')
      await expect(question).toContainText('Dice qué pasó (3 pts)')
      await expect(question).toContainText('Dice qué hacer a continuación (3 pts)')
      await expect(desk.getByText('Respuesta correcta: Falso')).toBeVisible()

      const form = desk.getByRole('form', { name: `Calificar ${OPEN_QUESTION}` })
      await form.getByLabel('Puntos (de 0 a 6)').fill('6')
      await form.getByLabel('Comentario para el estudiante (opcional)').fill('Claro y útil.')
      await form.getByRole('button', { name: 'Guardar la nota' }).click()
      await expect(desk.getByText('Corregido: 100 %, aprobado (10 de 10 puntos)')).toBeVisible()

      await desk.goto(`/docencia/${OFFERING}/sesiones`)
      await desk.getByRole('link', { name: `Pasar asistencia de «${SESSION_LESSON}»` }).click()
      const attendance = desk.getByRole('radiogroup', { name: `Asistencia de ${student.email}` })
      await attendance.getByRole('radio', { name: 'Presente' }).check()
      await desk.getByRole('button', { name: 'Guardar la asistencia' }).click()
      await expect(desk.getByText('Asistencia guardada')).toBeVisible()
      await desk.reload()
      await expect(desk.getByRole('radiogroup', { name: `Asistencia de ${student.email}` }).getByRole('radio', { name: 'Presente' })).toBeChecked()

      await desk.goto(`/docencia/${OFFERING}`)
      const after = desk.getByRole('row').filter({ has: desk.getByRole('rowheader', { name: student.email }) })
      await expect(after).toContainText('100 %, aprobada')
      await expect(after).toContainText('1 de 1 sesiones')
    } finally {
      await teacher.context.close()
    }
  })

  await test.step('recorrido 6: el estudiante ve su resultado, con el comentario y las soluciones', async () => {
    await page.goto(attemptUrl)
    await expect(page.getByRole('status').filter({ hasText: '100 % · Aprobado' })).toBeVisible()
    await expect(page.getByRole('article', { name: OPEN_QUESTION })).toContainText('Claro y útil.')
    await expect(page.getByText('Respuesta correcta: Falso')).toBeVisible()
    await expect(units(page).getByRole('link', { name: new RegExp(`^${ASSESSMENT}.*Aprobada`) })).toBeVisible()
    await expect(units(page).getByRole('link', { name: new RegExp(`^${SESSION_LESSON}.*Completada`) })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '100')
  })

  let code = ''
  await test.step('las reglas cumplidas, y pide su certificado con el nombre', async () => {
    await page.getByRole('navigation', { name: 'Más del curso' }).getByRole('link', { name: 'Finalización y certificado' }).click()
    await expect(page.getByText('Cumples todas las reglas: ya puedes pedir tu certificado.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Para terminar el curso' })).not.toContainText('(pendiente)')
    await page.getByRole('textbox', { name: 'Nombre para el certificado' }).fill(HOLDER)
    await page.getByRole('button', { name: 'Emitir mi certificado' }).click()
    await expect(page.getByText(`Certificado emitido a nombre de ${HOLDER}.`)).toBeVisible()
    await page.getByRole('link', { name: 'Ver e imprimir el certificado' }).click()
    await expect(page).toHaveURL(/\/certificados\/[^/]+$/)
    await expect(page.getByRole('heading', { level: 1, name: HOLDER })).toBeVisible()
    code = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!)

    // la matrícula queda finalizada, en «Mis cursos» y con el enlace a su certificado
    await page.goto('/mis-cursos')
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: COURSE }) })
    await expect(card.getByText('Certificado emitido')).toBeVisible()
  })

  await test.step('el certificado se verifica en la ruta pública, sin sesión, y se imprime solo', async () => {
    const visitor = await browserFor(browser, baseURL)
    try {
      await visitor.page.goto('/certificados')
      await visitor.page.getByRole('textbox', { name: 'Código del certificado' }).fill(code.toLowerCase())
      await visitor.page.getByRole('button', { name: 'Verificar' }).click()
      await expect(visitor.page).toHaveURL(`/certificados/${code}`)
      await expect(visitor.page.getByRole('status')).toHaveText('Certificado auténtico, emitido por esta plataforma.')
      await expect(visitor.page.getByRole('heading', { level: 1, name: HOLDER })).toBeVisible()
      await expect(visitor.page.getByText(`aprobó el curso «${COURSE}».`)).toBeVisible()
      await visitor.page.emulateMedia({ media: 'print' })
      await expect(visitor.page.getByRole('button', { name: 'Imprimir' })).toBeHidden()
      await visitor.page.emulateMedia({ media: 'screen' })

      await visitor.page.goto('/certificados/NO-EXISTE-ESTE')
      await expect(visitor.page.getByRole('heading', { level: 1, name: 'No hay ningún certificado con ese código' })).toBeVisible()
    } finally {
      await visitor.context.close()
    }
  })
})

// RF-AUL-09: el aviso por correo. solo si hay un buzón al que el backend envía (E2E_MAILPIT_URL, su API HTTP). el correo
// sale por un trabajo periódico de wasichai-notifications, así que puede tardar cerca de un minuto
test('reprogramar una sesión avisa por correo a los matriculados de esa edición y a nadie más', async ({ page, browser, baseURL, request }) => {
  const mailpit = process.env.E2E_MAILPIT_URL
  test.skip(!mailpit, 'necesita E2E_MAILPIT_URL y el backend enviando a ese Mailpit')
  test.setTimeout(240_000)
  const enrolled = await newStudent(request)
  const bystander = await newStudent(request)
  await signIn(page, enrolled)
  await enroll(page, await shortCourseSlug(request))

  const teacher = await browserFor(browser, baseURL, TEACHER)
  try {
    await teacher.page.goto(`/docencia/${OFFERING}/sesiones`)
    await teacher.page.getByRole('button', { name: `Reprogramar «${SESSION_LESSON}»` }).click()
    const dialog = teacher.page.getByRole('dialog', { name: `Reprogramar «${SESSION_LESSON}»` })
    const time = dialog.getByLabel('Nueva hora local')
    // la misma fecha y otra hora: repetir la prueba no acerca ni aleja la sesión del curso
    await time.fill((await time.inputValue()) === '10:00' ? '09:00' : '10:00')
    await dialog.getByLabel('Motivo').fill('Cruce de horarios')
    await dialog.getByRole('button', { name: 'Reprogramar y avisar' }).click()
    await expect(dialog).toBeHidden()
    await expect(teacher.page.getByRole('article', { name: SESSION_LESSON })).toContainText('Reprogramada')
  } finally {
    await teacher.context.close()
  }

  const inbox = async (email: string) => {
    const response = await request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    expect(response.status()).toBe(200)
    return ((await response.json()) as { messages: { Subject: string; From: { Address: string } }[] }).messages
  }
  await expect.poll(async () => (await inbox(enrolled.email)).length, { timeout: 120_000, intervals: [2_000] }).toBeGreaterThan(0)
  const [message] = await inbox(enrolled.email)
  expect(message!.From.Address).toBe('avisos@wasichai-learning.test')
  expect(message!.Subject).toBe(`Sesión reprogramada: ${SESSION_LESSON}`)
  expect(await inbox(bystander.email)).toEqual([])
})
