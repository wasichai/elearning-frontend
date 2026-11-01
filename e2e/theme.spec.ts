import { expect, test, type Locator, type Page } from '@playwright/test'
import { fakeApi } from './api'

// la hoja de controles del tema Quipu (src/theme/quipu-controls.css), medida en el navegador: objetivos de 44px y campos
// de 16px en Quipu; los temas de Wasichai no cambian

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

for (const theme of ['quipu', 'quipu-dark']) {
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

test('quipu: un campo inválido lleva 2px de danger y no salta', async ({ page }) => {
  await withTheme(page, 'quipu')
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

test('quipu: el botón sm mide 36px a la vista y responde en 44px', async ({ page }) => {
  await withTheme(page, 'quipu')
  await fakeApi(page, { signedIn: true, enrolled: false })
  await page.goto('/cursos/srtm-anuncios')
  const action = page.getByRole('button', { name: ACTION })
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
