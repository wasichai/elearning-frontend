import { expect, test, type Page } from '@playwright/test'
import { fakeApi } from './api'

// la evaluación en el aula (ADR-0016) con la API simulada: el servidor simulado impone intentos y plazo, corrige lo
// automático al enviar y deja lo abierto y la entrega pendientes del docente

const LESSON = '/mis-cursos/mat-sgspe-1?leccion=lec-eva'

async function answerAll(page: Page) {
  await page.getByRole('group', { name: '1. ¿Quién otorga la licencia de anuncio?' }).getByRole('radio', { name: 'La municipalidad' }).check()
  const multiple = page.getByRole('group', { name: '2. ¿Qué tipos de anuncio existen?' })
  await multiple.getByRole('checkbox', { name: 'Adosado' }).check()
  await multiple.getByRole('checkbox', { name: 'Luminoso' }).check()
  await page.getByRole('group', { name: '3. El SGSPE registra los expedientes.' }).getByRole('radio', { name: 'Verdadero' }).check()
  await page.getByRole('textbox', { name: '4. ¿Cuáles son las siglas del sistema de rentas?' }).fill(' srtm ')
  await page.getByRole('textbox', { name: '5. Explica cómo se liquida una licencia.' }).fill('Se aplica la tasa de la ordenanza al área.')
}

test('recorrido: empezar, responder cada tipo, entregar un archivo, enviar con confirmación y ver el resultado pendiente', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  await page.getByRole('link', { name: 'Introducción al SGSPE', exact: true }).click()
  await page
    .getByRole('navigation', { name: 'Unidades del curso' })
    .getByRole('link', { name: /^Evaluación final/ })
    .click()

  const rules = page.getByRole('region', { name: 'Evaluación final' })
  await expect(rules.getByText('0 de 2 usados')).toBeVisible()
  await rules.getByRole('button', { name: 'Empezar el intento' }).click()
  // empezar gasta un intento y pone en marcha el reloj: se confirma (RNF-UX-08)
  const start = page.getByRole('dialog', { name: '¿Empezar el intento?' })
  await expect(start).toContainText('Usarás el intento 1 de 2 y tendrás 30 min')
  await start.getByRole('button', { name: 'Empezar' }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeFocused()
  await expect(page).toHaveURL(`${LESSON}&intento=int-1`)
  await expect(page.getByRole('timer')).toHaveText(/^(30:00|29:\d\d)$/)
  await answerAll(page)
  await page
    .getByLabel('6. Sube la liquidación de ejemplo.')
    .setInputFiles({ name: 'liquidacion.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') })
  await expect(page.getByText('Entregado: liquidacion.pdf')).toBeVisible()
  expect(api.uploads).toEqual([{ path: '/api/objects/entrega/records/ent-1/files/archivo', name: 'liquidacion.pdf', authorization: 'Bearer token-e2e' }])

  await page.getByRole('button', { name: 'Enviar el intento' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Enviar el intento?' })
  await expect(dialog).toContainText('Respondiste todas las preguntas.')
  await dialog.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
  await expect(page.getByText('Por ahora llevas 6 de 10 puntos.', { exact: false })).toBeVisible()
  await expect(page.getByRole('article', { name: '6. Sube la liquidación de ejemplo.' }).getByText('liquidacion.pdf')).toBeVisible()

  // el servidor lo guardó: al recargar sigue el resultado, y la evaluación cuenta el intento y su estado
  await page.reload()
  await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
  await page.getByRole('link', { name: '← Volver a la evaluación' }).click()
  await expect(rules.getByText('1 de 2 usados')).toBeVisible()
  await expect(rules.getByText('Pendiente de corrección')).toBeVisible()
  await expect(rules.getByRole('button', { name: 'Empezar otro intento' })).toBeVisible()
  const writes = api.classroomRequests.filter((request) => !request.startsWith('GET') && !request.includes('/events'))
  expect(writes).toEqual([
    'POST /api/lms/classroom/enrollments/mat-sgspe-1/lessons/lec-eva/attempts',
    'POST /api/lms/classroom/attempts/int-1/questions/p-file/submission',
    'PUT /api/lms/classroom/attempts/int-1/answers',
    'PUT /api/lms/classroom/attempts/int-1/answers',
    'POST /api/lms/classroom/attempts/int-1/submit'
  ])
  expect(api.unexpected).toEqual([])
})

test('al acabarse el tiempo la cuenta atrás lo dice, y el 409 del servidor por plazo vencido se explica', async ({ page }) => {
  await page.clock.install()
  const api = await fakeApi(page, { signedIn: true })
  await page.goto(LESSON)
  await page.getByRole('button', { name: 'Empezar el intento' }).click()
  await page.getByRole('dialog', { name: '¿Empezar el intento?' }).getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeVisible()

  await page.clock.fastForward('31:00')
  await expect(page.getByRole('timer')).toHaveText('00:00')
  await expect(page.getByText(/^Se acabó el tiempo\. El servidor solo acepta/)).toBeVisible()

  api.failOnce((url, method) => method === 'PUT' && url.pathname.endsWith('/answers'), 409, 'El plazo del intento venció')
  await page.getByRole('button', { name: 'Enviar el intento' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('El plazo de este intento ya venció')).toBeVisible()
  await expect(page.getByText('El servidor dice: «El plazo del intento venció». Te mostramos el estado actual.')).toBeVisible()
})

test('con los intentos agotados la evaluación lo dice', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto(LESSON)
  for (const number of [1, 2]) {
    await page.getByRole('button', { name: number === 1 ? 'Empezar el intento' : 'Empezar otro intento' }).click()
    await page.getByRole('dialog', { name: '¿Empezar el intento?' }).getByRole('button', { name: 'Empezar' }).click()
    await expect(page.getByRole('heading', { level: 3, name: `Intento ${number}` })).toBeVisible()
    await page.getByRole('button', { name: 'Enviar el intento' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByRole('heading', { level: 3, name: `Resultado del intento ${number}` })).toBeVisible()
    await page.getByRole('link', { name: '← Volver a la evaluación' }).click()
  }
  await expect(page.getByText('Ya usaste tus 2 intentos.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Empezar/ })).toHaveCount(0)
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('el intento cabe en el área del aula', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto(LESSON)
    await page.getByRole('button', { name: 'Empezar el intento' }).click()
    await page.getByRole('dialog', { name: '¿Empezar el intento?' }).getByRole('button', { name: 'Empezar' }).click()
    await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeVisible()

    const wider = await page.locator('main').evaluate((main) => {
      const right = main.getBoundingClientRect().right
      return [...main.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > right + 0.5)
        .map((element) => `${element.tagName}.${String(element.className).slice(0, 80)}`)
    })
    expect(wider).toEqual([])
  })
})
