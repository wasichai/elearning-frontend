import { expect, test, type Page } from '@playwright/test'
import { fakeApi, isCourseList } from './api'
import { horizontalOverflow } from './overflow'

// los términos de uso (ADR-0037 del backend): leerlos, aceptarlos y volver, retirarlos, publicarlos, y lo que pasa sin ellos al matricularse o avanzar

const SLUG = 'srtm-anuncios'
const COURSE = `/cursos/${SLUG}`
const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/
const TERMS = '/terminos'
const PUBLISH = '/administracion/terminos'
const offerings = (page: Page) => page.getByRole('heading', { level: 2, name: 'Ediciones' }).locator('..')
const accept = (page: Page) => page.getByRole('button', { name: 'Aceptar los términos' })

test('sin aceptación, matricularse lleva a los términos; al aceptar vuelve a la ficha y ya se matricula', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false, terms: 'none' })
  await page.goto(COURSE)

  await offerings(page).getByRole('button', { name: ACTION }).click()
  await expect(page).toHaveURL(`${TERMS}?returnTo=%2Fcursos%2F${SLUG}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Términos de uso' })).toBeVisible()
  await expect(page.getByText('730 días')).toBeVisible()
  await expect(page.getByText('Para continuar con lo que estabas haciendo')).toBeVisible()

  await accept(page).click()
  await expect(page).toHaveURL(COURSE)
  expect(api.termsRequests).toContain('POST /api/lms/terms/acceptance')
  // aceptar no matricula sin pedirlo: fue el único intento hasta aquí
  expect(api.enrollRequests).toHaveLength(1)

  await offerings(page).getByRole('button', { name: ACTION }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
  expect(api.enrollRequests).toHaveLength(2)
  expect(api.unexpected).toEqual([])
})

test('«Volver sin aceptar» deja en la ficha sin aceptar nada', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false, terms: 'none' })
  await page.goto(COURSE)
  await offerings(page).getByRole('button', { name: ACTION }).click()

  await page.getByRole('link', { name: 'Volver sin aceptar' }).click()
  await expect(page).toHaveURL(COURSE)
  expect(api.termsRequests).not.toContain('POST /api/lms/terms/acceptance')
})

test('un 403 por otra causa no lleva a los términos: se explica en la ficha', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, enrolled: false })
  api.failOnce((url, method) => method === 'POST' && url.pathname === '/api/lms/enrollments', 403, 'Sin permiso de matricularse')
  await page.goto(COURSE)

  await offerings(page).getByRole('button', { name: ACTION }).click()
  await expect(offerings(page).getByRole('alert')).toContainText('Tu cuenta no puede matricularse en cursos')
  await expect(page).toHaveURL(COURSE)
})

test('una versión nueva no bloquea a quien aceptó la anterior: se matricula sin pasar por los términos', async ({ page }) => {
  await fakeApi(page, { signedIn: true, enrolled: false, terms: 'older' })
  await page.goto(COURSE)

  await offerings(page).getByRole('button', { name: ACTION }).click()
  await expect(page).toHaveURL('/mis-cursos/mat-srtm-1')
})

test('con la aceptación retirada, los términos explican el 409 y Retry-After sin dar por hecha la aceptación', async ({ page }) => {
  await fakeApi(page, { signedIn: true, enrolled: false, terms: 'withdrawn' })
  await page.goto(COURSE)
  await offerings(page).getByRole('button', { name: ACTION }).click()

  await expect(page.getByText('Retiraste tu aceptación')).toBeVisible()
  await page.getByRole('button', { name: 'Volver a aceptar' }).click()
  await expect(page.getByText(/todavía se están suprimiendo/)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`^.*${TERMS}\\?returnTo=`))
})

test('sin términos publicados, matricularse lo explica sin culpar a la persona', async ({ page }) => {
  await fakeApi(page, { signedIn: true, enrolled: false, terms: 'unpublished' })
  await page.goto(COURSE)
  await offerings(page).getByRole('button', { name: ACTION }).click()

  await expect(page.getByText('Tu organización aún no ha publicado sus términos')).toBeVisible()
  await expect(page.getByText(/No es por nada que hayas hecho/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Publicar los términos' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Volver a lo que hacías' }).click()
  await expect(page).toHaveURL(COURSE)
})

test('a quien administra, sin términos publicados, le dice que debe publicarlos y la lleva allí', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'administrator', terms: 'unpublished' })
  await page.goto(TERMS)

  await page.getByRole('link', { name: 'Publicar los términos' }).click()
  await expect(page).toHaveURL(PUBLISH)
  await expect(page.getByRole('heading', { level: 1, name: 'Publicar términos de uso' })).toBeVisible()
})

test.describe('registrar progreso sin aceptación', () => {
  test('marcar una lección lo explica y lleva a los términos con la vuelta a la lección', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true, terms: 'withdrawn' })
    await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-pdf')

    await page.getByRole('button', { name: 'Marcar como completada' }).click()
    await expect(page.getByText(/Para registrar tu progreso necesitas una aceptación vigente/)).toBeVisible()
    await page.getByRole('link', { name: 'Ver los términos de uso' }).click()
    await expect(page).toHaveURL(`${TERMS}?returnTo=%2Fmis-cursos%2Fmat-srtm-1%3Fleccion%3Dlec-pdf`)

    // cuando la supresión termina ya no hay aceptación, y aceptar devuelve a la lección
    api.terms.acceptance = null
    await page.reload()
    await accept(page).click()
    await expect(page).toHaveURL('/mis-cursos/mat-srtm-1?leccion=lec-pdf')
    await page.getByRole('button', { name: 'Marcar como completada' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
  })
})

test.describe('retirar', () => {
  test('desde el menú, confirma, dice que está en curso y deja el foco en el aviso', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos')
    await page.getByRole('link', { name: 'Términos de uso' }).click()
    await expect(page).toHaveURL(TERMS)

    await expect(page.getByText('Aceptaste estos términos')).toBeVisible()
    await page.getByRole('button', { name: 'Retirar mi aceptación' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/no se puede deshacer/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Retirar y suprimir' }).click()

    await expect(page.getByText('Tu retirada está en curso')).toBeVisible()
    await expect(page.getByText('Aún no ha terminado')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Tu aceptación' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Retirar mi aceptación' })).toHaveCount(0)
    expect(api.termsRequests).toContain('DELETE /api/lms/terms/acceptance')

    // tras recargar sigue sin afirmar que terminó
    await page.reload()
    await expect(page.getByText('Retiraste tu aceptación')).toBeVisible()
    await expect(page.getByText(/se están suprimiendo/)).toBeVisible()
  })

  test('cancelar no envía nada y el foco vuelve al botón, con el teclado', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true })
    await page.goto(TERMS)

    const withdraw = page.getByRole('button', { name: 'Retirar mi aceptación' })
    await withdraw.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(withdraw).toBeFocused()
    expect(api.termsRequests).not.toContain('DELETE /api/lms/terms/acceptance')
  })

  test('un 404 dice que no hay aceptación que retirar', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true })
    await page.goto(TERMS)
    await page.getByRole('button', { name: 'Retirar mi aceptación' }).click()
    api.failOnce((url, method) => method === 'DELETE' && url.pathname === '/api/lms/terms/acceptance', 404, 'No tienes')
    api.terms.acceptance = null
    await page.getByRole('button', { name: 'Retirar y suprimir' }).click()

    await expect(page.getByText('No tienes una aceptación que retirar.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test('el texto de los términos se muestra como texto', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto(TERMS)

  await expect(page.getByText('<b>Esta etiqueta es texto y no se interpreta.</b>')).toBeVisible()
  await expect(page.locator('main b')).toHaveCount(0)
})

test('un destino de vuelta ajeno se ignora', async ({ page }) => {
  await fakeApi(page, { signedIn: true, terms: 'none' })
  await page.goto(`${TERMS}?returnTo=${encodeURIComponent('https://mal.example/')}`)

  await expect(page.getByRole('link', { name: 'Volver sin aceptar' })).toHaveCount(0)
  await accept(page).click()
  await expect(page.getByText('Aceptaste estos términos')).toBeVisible()
  await expect(page).toHaveURL(/\/terminos\?/)
})

test.describe('publicar', () => {
  test('quien administra entra por el menú de la sección, publica una versión y se confirma antes', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true, as: 'administrator' })
    await page.goto('/data/objects')

    await page.getByRole('navigation').getByRole('link', { name: 'Términos de uso' }).click()
    await expect(page).toHaveURL(PUBLISH)
    // sigue dentro de la sección: el menú de administración y no el del LMS
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Usuarios' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Mis cursos' })).toHaveCount(0)

    await page.getByRole('textbox', { name: 'Texto de los términos' }).fill('Texto de la versión nueva')
    await page.getByRole('textbox', { name: 'Plazo de conservación, en días' }).fill('365')
    await page.getByRole('button', { name: 'Publicar versión nueva' }).click()
    await expect(page.getByRole('dialog').getByText(/no se puede cambiar/)).toBeVisible()
    expect(api.termsRequests).not.toContain('POST /api/lms/terms')

    await page.getByRole('dialog').getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page.getByText('Publicaste la versión 4')).toBeVisible()
    await expect(page.getByText(/Versión vigente: 4/)).toBeVisible()
    expect(api.terms.current?.text).toBe('Texto de la versión nueva')
  })

  test('no se sale de un toque con el texto a medias', async ({ page }) => {
    await fakeApi(page, { signedIn: true, as: 'administrator' })
    await page.goto(PUBLISH)

    await page.getByRole('textbox', { name: 'Texto de los términos' }).fill('Un borrador a medias')
    await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('¿Salir sin publicar?')).toBeVisible()
    await expect(page).toHaveURL(PUBLISH)

    await dialog.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(page.getByRole('textbox', { name: 'Texto de los términos' })).toHaveValue('Un borrador a medias')

    await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salir' }).click()
    await expect(page).toHaveURL('/admin/users')
  })

  test('el plazo fuera de rango se explica junto al campo y no se envía', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true, as: 'administrator' })
    await page.goto(PUBLISH)

    await page.getByRole('textbox', { name: 'Plazo de conservación, en días' }).fill('36501')
    await page.getByRole('button', { name: 'Publicar versión nueva' }).click()
    await expect(page.getByText('Escribe un número entero de días, de 1 a 36 500.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Plazo de conservación, en días' })).toBeFocused()
    expect(api.termsRequests).not.toContain('POST /api/lms/terms')
  })

  test('sin MANAGE_ORGANIZATION no ve la entrada ni el formulario, y el servidor tampoco deja publicar', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true })
    await page.goto(PUBLISH)

    await expect(page.getByRole('alert')).toContainText('No tienes permiso para publicar los términos')
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Publicar versión nueva' })).toHaveCount(0)
    expect(api.termsRequests).toEqual([])
    // su menú sigue siendo el del LMS, con sus términos y sin la sección
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Mis cursos' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await page.getByRole('navigation').getByRole('link', { name: 'Términos de uso' }).click()
    await expect(page).toHaveURL(TERMS)

    const response = await page.evaluate(async () => {
      const token = localStorage.getItem('elearning.token')
      const reply = await fetch('/api/lms/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: 'x', retentionDays: 1 })
      })
      return reply.status
    })
    expect(response).toBe(403)
  })
})

test.describe('en un móvil', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('los objetivos miden 44 px y nada desborda', async ({ page }) => {
    await fakeApi(page, { signedIn: true, enrolled: false, terms: 'none' })
    await page.goto(`${TERMS}?returnTo=%2Fcursos%2F${SLUG}`)

    for (const target of [accept(page), page.getByRole('link', { name: 'Volver sin aceptar' })]) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
    const overflow = await horizontalOverflow(page)
    expect(overflow.wider).toEqual([])
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
  })
})

// el catálogo público no pide nada
test('sin sesión, el catálogo no pregunta por los términos', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(api.catalogRequests.some(isCourseList)).toBe(true)
  expect(api.termsRequests).toEqual([])
})
