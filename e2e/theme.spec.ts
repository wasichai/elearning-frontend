import { expect, test, type Locator, type Page } from '@playwright/test'
import { fakeApi } from './api'

// la hoja de controles del tema Colofón (src/theme/colofon-controls.css), medida en el navegador: objetivos de 44px y campos
// de 16px en Colofón; los temas de Wasichai no cambian

const ACTION = /^Matricularme en la edición 9 nov\s–\s4 dic 2026$/

async function withTheme(page: Page, theme: string): Promise<void> {
  await page.addInitScript((id) => localStorage.setItem('elearning.theme', id), theme)
}

const box = async (locator: Locator) => {
  const found = await locator.boundingBox()
  if (!found) throw new Error('sin caja')
  return found
}

const style = (locator: Locator, property: string) => locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property)

for (const theme of ['colofon', 'colofon-dark']) {
  test(`${theme}: el buscador y su botón miden 44px y el campo escribe a 16px`, async ({ page }) => {
    await withTheme(page, theme)
    await fakeApi(page)
    await page.goto('/cursos')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    const search = page.getByRole('searchbox', { name: 'Buscar cursos' })
    expect((await box(search)).height).toBe(44)
    expect(await style(search, 'font-size')).toBe('16px')
    expect((await box(page.getByRole('button', { name: 'Buscar', exact: true }))).height).toBe(44)
  })
}

test('colofon: un campo inválido lleva 2px de danger y no salta', async ({ page }) => {
  await withTheme(page, 'colofon')
  await fakeApi(page)
  await page.goto('/cursos')
  const search = page.getByRole('searchbox', { name: 'Buscar cursos' })
  const before = await box(search)
  const padding = await style(search, 'padding-left')

  await search.evaluate((element) => element.setAttribute('aria-invalid', 'true'))

  expect(await box(search)).toEqual(before)
  expect(await style(search, 'padding-left')).toBe(padding)
  expect(await style(search, 'border-top-width')).toBe('1px')
  // el segundo píxel, por dentro, en el color del borde
  const [border, shadow] = [await style(search, 'border-top-color'), await style(search, 'box-shadow')]
  expect(shadow).toBe(`${border} 0px 0px 0px 1px inset`)
})

test('colofon: el botón sm (tabla de docencia) mide 36px a la vista y responde en 44px', async ({ page }) => {
  await withTheme(page, 'colofon')
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09/correccion')
  const action = page.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' })
  // elementFromPoint solo ve lo que está en pantalla
  await action.scrollIntoViewIfNeeded()
  const { x, y, width, height } = await box(action)
  expect(height).toBe(36)

  // 3px por encima y por debajo de su borde, el punto sigue siendo el botón
  const hit = (pointY: number) =>
    action.evaluate(
      (element, point) => {
        const target = document.elementFromPoint(point.x, point.y)
        return target === element || element.contains(target)
      },
      { x: x + width / 2, y: pointY }
    )
  expect(await hit(y - 3)).toBe(true)
  expect(await hit(y + height + 3)).toBe(true)
  // y no más: el área es de 44px exactos
  expect(await hit(y - 5)).toBe(false)
})

test('colofon: «Matricularme», en una pantalla del estudiante, es un botón de 44px', async ({ page }) => {
  await withTheme(page, 'colofon')
  await fakeApi(page, { signedIn: true, enrolled: false })
  await page.goto('/cursos/srtm-anuncios')
  expect((await box(page.getByRole('button', { name: ACTION }))).height).toBe(44)
})

test('el tema claro de Wasichai no cambia: sus controles siguen a 36px', async ({ page }) => {
  await withTheme(page, 'light')
  await fakeApi(page)
  await page.goto('/cursos')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  const search = page.getByRole('searchbox', { name: 'Buscar cursos' })
  expect((await box(search)).height).toBe(36)
  expect(await style(search, 'font-size')).toBe('14px')
})

test('modo lectura: papel sepia en la lección y en su lectura, A+ y se recuerda al volver', async ({ page }) => {
  await withTheme(page, 'colofon')
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  const reading = page.locator('[data-reading]')
  const article = page.getByRole('article', { name: 'Tipos de anuncio' })
  const background = () => article.evaluate((element) => getComputedStyle(element).backgroundColor)
  const fontSize = () => reading.evaluate((element) => getComputedStyle(element).fontSize)
  await expect.poll(background).toBe('rgb(255, 255, 255)')
  await expect.poll(fontSize).toBe('20px')
  // la lectura en Newsreader, la de la app
  expect(await style(reading, 'font-family')).toMatch(/^Newsreader,/)

  const tools = page.getByRole('toolbar', { name: 'Lectura' })
  const toggle = tools.getByRole('button', { name: 'Modo lectura' })
  await toggle.click()
  await expect(article).toHaveAttribute('data-theme', 'colofon-lectura')
  // surface y tinta de colofon-lectura, también en la lectura
  await expect.poll(background).toBe('rgb(242, 235, 221)')
  expect(await style(reading, 'color')).toBe('rgb(58, 47, 34)')
  // la hoja de controles sigue valiendo dentro del modo lectura
  expect((await box(toggle)).height).toBe(44)

  await tools.getByRole('button', { name: 'Texto más grande' }).click()
  await expect.poll(fontSize).toBe('22px')

  await page.reload()
  await expect(page.getByRole('toolbar', { name: 'Lectura' }).getByRole('button', { name: 'Modo lectura' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(background).toBe('rgb(242, 235, 221)')
  await expect.poll(fontSize).toBe('22px')
})

test('modo lectura en colofon-dark: sigue oscuro y abre el interlineado de la lectura', async ({ page }) => {
  await withTheme(page, 'colofon-dark')
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  const reading = page.locator('[data-reading]')
  await page.getByRole('toolbar', { name: 'Lectura' }).getByRole('button', { name: 'Modo lectura' }).click()

  const article = page.getByRole('article', { name: 'Tipos de anuncio' })
  await expect(article).not.toHaveAttribute('data-theme')
  await expect.poll(() => article.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(22, 29, 38)')
  // 1,79 × 20px
  await expect.poll(() => reading.evaluate((element) => getComputedStyle(element).lineHeight)).toBe('35.8px')
})

test('el certificado pone al titular en Newsreader, servida por la app', async ({ page }) => {
  const fonts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(new URL(request.url()).host)
  })
  await withTheme(page, 'colofon')
  await fakeApi(page, { certificateIssued: true })
  await page.goto('/certificados/K7Q2-M9XW-4RTB')
  const holder = page.getByRole('heading', { level: 1, name: 'Rosa Quispe Mamani' })
  await expect(holder).toBeVisible()

  expect(await style(holder, 'font-family')).toMatch(/^Newsreader,/)
  await expect.poll(() => page.evaluate(async () => (await document.fonts.load('600 36px Newsreader')).length)).toBeGreaterThan(0)
  // ninguna letra viene de fuera
  expect(new Set(fonts)).toEqual(new Set([new URL(page.url()).host]))
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`el sello al terminar el curso (${reducedMotion}): una animación, o ninguna con movimiento reducido`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await withTheme(page, 'colofon')
    await fakeApi(page, { signedIn: true, courseComplete: true })
    await page.goto('/mis-cursos/mat-sgspe-1/finalizacion')
    const seal = page.locator('[data-seal]')
    await expect(seal).toBeVisible()

    // un estado cumplido: --success de colofon (#2D6A45)
    expect(await style(seal, 'background-color')).toBe('rgb(45, 106, 69)')
    expect(await style(seal, 'animation-name')).toBe(reducedMotion === 'reduce' ? 'none' : 'seal')
    if (reducedMotion === 'no-preference') expect(await style(seal, 'animation-iteration-count')).toBe('1')
  })
}

test('sin cumplir las reglas no hay sello', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1/finalizacion')
  await expect(page.getByRole('region', { name: 'Para terminar el curso' })).toContainText('1 de 3 lecciones')
  await expect(page.locator('[data-seal]')).toHaveCount(0)
})
