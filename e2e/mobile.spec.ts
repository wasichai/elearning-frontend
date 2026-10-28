import { expect, test, type Page } from '@playwright/test'
import { fakeApi } from './api'

// a 390 px (un teléfono corriente) nada obliga a desplazarse en horizontal
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number; wider: string[] }> {
  return page.evaluate(() => {
    const root = document.documentElement
    // los elementos que se salen por la derecha, para que el fallo diga cuál
    const wider = [...document.body.querySelectorAll('*')]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 0.5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 3).join('.')}`)
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, wider }
  })
}

test('la lista del catálogo no desborda en horizontal', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/cursos')
  await expect(page.getByRole('region', { name: 'Resultados' }).getByRole('listitem')).toHaveCount(2)

  const overflow = await horizontalOverflow(page)
  expect(overflow.wider).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})

test('la ficha del curso no desborda en horizontal', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/cursos/srtm-anuncios')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const overflow = await horizontalOverflow(page)
  expect(overflow.wider).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})
