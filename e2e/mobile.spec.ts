import { expect, test } from '@playwright/test'
import { fakeApi } from './api'
import { horizontalOverflow } from './overflow'

// a 390 px (un teléfono corriente) nada obliga a desplazarse en horizontal
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

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

test.describe('la acción de la ficha, al pie', () => {
  const ACTION = /^Matricularme en la edición/

  test('hay una sola, se queda abajo al desplazar y no tapa el final ni lo enfocado', async ({ page }) => {
    await fakeApi(page, { signedIn: true, enrolled: false })
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/cursos/srtm-anuncios')
    const action = page.getByRole('button', { name: ACTION })
    await expect(action).toHaveCount(1)
    await expect(action).toBeInViewport()
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const bar = page.locator('[data-slot="course-action"]')
    expect(Math.round((await bar.boundingBox())!.y + (await bar.boundingBox())!.height)).toBe(640)

    // lo que recibe el foco con el teclado no se queda debajo de la barra: la unidad, a la altura de la barra, y Tab desde el enlace anterior
    const unit = page.locator('summary').filter({ hasText: 'Unidad 1' })
    await page.getByRole('link', { name: '← Catálogo' }).evaluate((link: HTMLElement) => link.focus({ preventScroll: true }))
    const barTop = (await bar.boundingBox())!.y
    await page.evaluate(
      ([element, top]) => {
        const scroller = document.scrollingElement!
        scroller.scrollTop += (element as HTMLElement).getBoundingClientRect().top - (top as number) - 8
      },
      [await unit.elementHandle(), barTop] as const
    )
    expect((await unit.boundingBox())!.y).toBeGreaterThan(barTop)
    await page.keyboard.press('Tab')
    await expect(unit).toBeFocused()
    await expect.poll(async () => (await unit.boundingBox())!.y + (await unit.boundingBox())!.height).toBeLessThanOrEqual((await bar.boundingBox())!.y)

    // al final de la página, lo último del contenido se ve por encima de la barra
    const last = page.getByRole('heading', { level: 2, name: 'Datos del curso' }).locator('xpath=ancestor::section').locator('dl')
    await page.evaluate(() => {
      const scroller = document.querySelector('main')?.closest('[class*="overflow"]') ?? document.scrollingElement!
      scroller.scrollTop = scroller.scrollHeight
      document.scrollingElement!.scrollTop = document.scrollingElement!.scrollHeight
    })
    await expect(last).toBeInViewport()
    expect((await last.boundingBox())!.y + (await last.boundingBox())!.height).toBeLessThanOrEqual((await bar.boundingBox())!.y)
  })

  test('el 409 se lee en la barra y no hay desbordamiento', async ({ page }) => {
    const api = await fakeApi(page, { signedIn: true, enrolled: false })
    api.failOnce((url) => url.pathname === '/api/lms/enrollments', 409, 'No quedan plazas en esta edición.')
    await page.goto('/cursos/srtm-anuncios')

    await page.getByRole('button', { name: ACTION }).click()

    await expect(page.locator('[data-slot="course-action"]').getByRole('alert')).toHaveText('No quedan plazas en esta edición.')
    const overflow = await horizontalOverflow(page)
    expect(overflow.wider).toEqual([])
  })
})

test('la ficha del curso no desborda en horizontal', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/cursos/srtm-anuncios')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const overflow = await horizontalOverflow(page)
  expect(overflow.wider).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
})
