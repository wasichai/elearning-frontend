import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, API_URL, newUser, signIn, token } from './helpers'

// los términos de uso contra el backend de verdad (ADR-0037): un estudiante recién creado, sin aceptación, los acepta por la pantalla y se matricula;
// la retirada, solo con ese mismo estudiante, nunca con la cuenta demo compartida. publicar no se ejecuta aquí: cambia la versión vigente para los
// recorridos que corren a la vez (y newStudent, que nombra la vigente, recibiría un 409). solo con E2E_REAL=1
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

async function srtmSlug(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_URL}/api/lms/public/catalog/courses?q=SRTM`)
  const body = (await response.json()) as { content: { code: string; slug: string }[] }
  const course = body.content.find((c) => c.code === 'SRTM-ANU-101')
  expect(course, 'el catálogo aún no muestra SRTM-ANU-101: aplica la demo y espera el refresco (30 s)').toBeDefined()
  return course!.slug
}

test('un estudiante nuevo acepta los términos por la pantalla, vuelve a la ficha, se matricula y luego los retira', async ({ page, request }) => {
  const student = await newUser(request, 'ESTUDIANTE', 'Estudiante de términos e2e')
  const slug = await srtmSlug(request)
  await signIn(page, student)

  // el 403 sin aceptación lleva a los términos, con la vuelta a la ficha
  await page.goto(`/cursos/${slug}`)
  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(`/terminos?returnTo=%2Fcursos%2F${slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Términos de uso' })).toBeVisible()
  await expect(page.getByText('Plazo de conservación', { exact: true })).toBeVisible()
  await expect(page.getByText('Aún no has aceptado estos términos', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Aceptar los términos' }).click()
  await expect(page).toHaveURL(`/cursos/${slug}`)

  await page.getByRole('button', { name: /^Matricularme en la edición/ }).click()
  await expect(page).toHaveURL(/\/mis-cursos\/[0-9a-f-]{36}/)

  // sus términos, desde el menú, para retirarlos
  await page.getByRole('link', { name: 'Términos de uso' }).click()
  await expect(page.getByText('Aceptaste estos términos', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retirar mi aceptación' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Retirar y suprimir' }).click()
  await expect(page.getByText('Tu retirada está en curso')).toBeVisible()
})

test('un estudiante no ve publicar los términos y el servidor se lo niega; quien administra ve el formulario', async ({ page, browser, baseURL, request }) => {
  const student = await newUser(request, 'ESTUDIANTE', 'Estudiante sin permiso e2e')
  await signIn(page, student)
  await page.goto('/administracion/terminos')
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para publicar los términos')
  await expect(page.getByRole('textbox')).toHaveCount(0)

  const headers = { Authorization: `Bearer ${await token(request, student.email, student.password)}` }
  const refused = await request.post(`${API_URL}/api/lms/terms`, { headers, data: { text: 'x', retentionDays: 1 } })
  expect(refused.status()).toBe(403)

  const context = await browser.newContext({ baseURL, locale: 'es-PE', timezoneId: 'America/Lima' })
  const adminPage = await context.newPage()
  await signIn(adminPage, ADMIN)
  await adminPage.goto('/data/objects')
  await adminPage.getByRole('link', { name: 'Términos de uso' }).click()
  await expect(adminPage).toHaveURL('/administracion/terminos')
  await expect(adminPage.getByRole('textbox', { name: 'Texto de los términos' })).toBeVisible()
  await context.close()
})
