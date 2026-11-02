import { expect, test, type Page } from '@playwright/test'
import { fakeApi } from './api'

// a 390 px (un teléfono corriente) nada obliga a desplazarse en horizontal
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number; wider: string[] }> {
  return page.evaluate(() => {
    const root = document.documentElement
    // los elementos que se salen por la derecha, para que el fallo diga cuál
    // lo de dentro de un svg se recorta con él: la banda de cordones dibuja de más y se corta por la derecha según el ancho
    const wider = [...document.body.querySelectorAll('*')]
      .filter((element) => !element.parentElement?.closest('svg'))
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

test('a 360 px, con filtros activos y la hoja de «Más filtros», tampoco desborda', async ({ page }) => {
  const api = await fakeApi(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/cursos?minPracticeHours=10&prerequisiteKnowledge=navegador-web&level=INICIAL')
  await expect(page.getByRole('group', { name: 'Filtros activos' })).toBeVisible()
  expect((await horizontalOverflow(page)).wider).toEqual([])

  await page.getByRole('button', { name: 'Más filtros 3 activos' }).click()
  const sheet = page.getByRole('dialog', { name: 'Más filtros' })
  await expect(sheet).toBeVisible()
  expect((await horizontalOverflow(page)).wider).toEqual([])

  // la hoja queda pegada abajo y sus desplegables funcionan dentro de ella
  const box = (await sheet.boundingBox())!
  expect(Math.round(box.y + box.height)).toBe(740)
  await sheet.getByRole('combobox', { name: 'Modalidad' }).click()
  await page.getByRole('option', { name: 'Asíncrona' }).click()
  await expect.poll(() => api.catalogRequests.at(-1)?.searchParams.get('modality')).toBe('ASINCRONA')

  await expect(sheet.getByRole('button', { name: /^Ver / })).toBeVisible()
  await sheet.getByRole('button', { name: /^Ver / }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Más filtros 4 activos' })).toBeFocused()
})

test('la ficha del curso no desborda en horizontal', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/cursos/srtm-anuncios')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const overflow = await horizontalOverflow(page)
  expect(overflow.wider).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})
