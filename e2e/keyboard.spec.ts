import { expect, test, type Locator, type Page } from '@playwright/test'
import { coursePage } from '../src/modules/catalog/test/fixtures'
import { fakeApi, isCourseList } from './api'

// accesibilidad funcional: el recorrido entero (buscar, filtrar, abrir una ficha, desplegar el cálculo y volver) se hace
// solo con el teclado, y cada control se encuentra por su rol y su nombre accesible, como lo anuncia un lector de pantalla

// pulsa Tab (o Mayús+Tab) hasta que el foco llega a `target`; falla si no llega: el control no se alcanza con el teclado
async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab', max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key)
    if (await target.evaluate((element) => element === document.activeElement)) break
  }
  await expect(target).toBeFocused()
  // el foco llegó por teclado y se ve: el navegador lo marca como :focus-visible
  expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
}

test('el catálogo y la ficha se manejan solo con el teclado', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')
  const courses = page.getByRole('region', { name: 'Resultados' }).getByRole('listitem')
  await expect(courses).toHaveCount(2)

  // buscar: escribir y Enter
  const search = page.getByRole('searchbox', { name: 'Buscar cursos' })
  await tabTo(page, search)
  await page.keyboard.type('anuncios')
  await page.keyboard.press('Enter')
  await expect(courses).toHaveCount(1)
  expect(api.catalogRequests.at(-1)?.searchParams.get('q')).toBe('anuncios')

  // limpiar con el botón
  await tabTo(page, page.getByRole('button', { name: 'Limpiar filtros' }))
  await page.keyboard.press('Enter')
  await expect(courses).toHaveCount(2)

  // un desplegable: se abre con Enter, se recorre con flechas y se elige con Enter
  const level = page.getByRole('combobox', { name: 'Nivel' })
  await tabTo(page, level, 'Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await expect(page.getByRole('option', { name: 'Cualquiera' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Inicial' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(level).toBeFocused()
  await expect(level).toHaveText('Inicial')
  await expect.poll(() => api.catalogRequests.at(-1)?.searchParams.get('level')).toBe('INICIAL')
  await expect(courses).toHaveCount(1)

  // abrir la ficha con Enter sobre el enlace del curso
  await tabTo(page, page.getByRole('link', { name: 'Licencias de anuncios con SRTM' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeVisible()

  // el detalle del cálculo de créditos se despliega con el teclado
  const how = page.getByText('Cómo se calculó')
  await tabTo(page, how)
  await expect(page.getByText('Guía ECTS 2015, sección 4')).toBeHidden()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Guía ECTS 2015, sección 4')).toBeVisible()

  // y de vuelta al catálogo, con los filtros limpios
  await tabTo(page, page.getByRole('link', { name: 'Catálogo' }), 'Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/cursos')
  await expect(courses).toHaveCount(2)
})

test('cambiar de página con el teclado lleva el foco al principio de los resultados', async ({ page }) => {
  await fakeApi(page)
  // dos páginas de un curso cada una (la ruta registrada después gana a la de fakeApi)
  await page.route(isCourseList, async (route) => {
    const index = Number(new URL(route.request().url()).searchParams.get('page'))
    await route.fulfill({ json: { ...coursePage, content: [coursePage.content[index % 2]], page: index, totalElements: 2, totalPages: 2 } })
  })
  await page.goto('/cursos')
  const courses = page.getByRole('region', { name: 'Resultados' }).getByRole('listitem')
  await expect(courses).toHaveCount(1)

  const next = page.getByRole('button', { name: /siguiente/i })
  await tabTo(page, next)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/cursos?page=2')
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeFocused()
  await expect(courses.getByRole('link')).toHaveText('Introducción al SGSPE')
})
