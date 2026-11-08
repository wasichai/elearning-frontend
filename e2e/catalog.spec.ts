import { expect, test, type Page } from '@playwright/test'
import { fakeApi, isCourseList } from './api'

// el catálogo público con la API simulada: búsqueda y filtros viajan al servidor, y un fallo se explica y se recupera

const results = (page: Page) => page.getByRole('region', { name: 'Resultados' })
const courses = (page: Page) => results(page).getByRole('listitem')
const lastParam = (urls: URL[], name: string) => urls.at(-1)?.searchParams.get(name)
// los filtros de segunda línea, plegados: en escritorio es un <details>, que no tiene rol de botón
const openMoreFilters = (page: Page) => page.getByText('Más filtros').click()

test('buscar y filtrar: la petición lleva el filtro y la lista cambia', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')

  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de cursos' })).toBeVisible()
  await expect(courses(page)).toHaveCount(2)
  await expect(results(page).getByRole('status')).toHaveText('2 cursos')
  expect(lastParam(api.catalogRequests, 'page')).toBe('0')
  expect(lastParam(api.catalogRequests, 'size')).toBe('12')

  // búsqueda libre
  await page.getByRole('searchbox', { name: 'Buscar cursos' }).fill('SGSPE')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'q')).toBe('SGSPE')
  await expect(courses(page)).toHaveCount(1)
  await expect(courses(page).getByRole('link')).toHaveText('Introducción al SGSPE')
  await expect(page).toHaveURL(/\/cursos\?q=SGSPE$/)

  // limpiar vuelve al catálogo entero
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByRole('searchbox', { name: 'Buscar cursos' })).toHaveValue('')

  // un filtro de selección: nivel
  await openMoreFilters(page)
  await page.getByRole('combobox', { name: 'Nivel' }).click()
  await page.getByRole('option', { name: 'Intermedio' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'level')).toBe('INTERMEDIO')
  await expect(courses(page)).toHaveCount(1)
  await expect(courses(page).getByRole('link')).toHaveText('Introducción al SGSPE')

  // y otro encima: categoría (de los facets). ninguno cumple ambos
  const chip = page.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Gestión municipal (2)' })
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => api.catalogRequests.at(-1)?.search).toMatch(/category=gestion-municipal/)
  expect(lastParam(api.catalogRequests, 'level')).toBe('INTERMEDIO')
  await expect(results(page).getByText('Ningún curso coincide con la búsqueda')).toBeVisible()

  expect(api.unexpected).toEqual([])
})

test('filtros de duración, inscripción y horas: la lista cambia y, sin resultados, el estado vacío deja limpiar', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos')
  await expect(courses(page)).toHaveCount(2)
  await openMoreFilters(page)

  await page.getByRole('combobox', { name: 'Inscripción' }).click()
  await page.getByRole('option', { name: 'Con inscripción abierta' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'enrollmentOpen')).toBe('true')
  await expect(courses(page)).toHaveCount(1)
  await expect(page).toHaveURL(/\/cursos\?enrollmentOpen=true$/)

  await page.getByLabel('Horas de trabajo autónomo (mínimo)').fill('20')
  await page.getByLabel('Horas de trabajo autónomo (mínimo)').press('Enter')
  await expect.poll(() => lastParam(api.catalogRequests, 'minAutonomousHours')).toBe('20')
  await expect(courses(page)).toHaveCount(1)

  await page.getByRole('combobox', { name: 'Duración' }).click()
  await page.getByRole('option', { name: 'Semestral (12 a 26 semanas)' }).click()
  await expect.poll(() => lastParam(api.catalogRequests, 'minWeeks')).toBe('12')
  await expect(results(page).getByText('Ningún curso coincide con la búsqueda')).toBeVisible()

  await results(page).getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByLabel('Horas de trabajo autónomo (mínimo)')).toHaveValue('')
  expect(api.unexpected).toEqual([])
})

test('los filtros activos se ven, se cuentan y se quitan uno a uno; plegado, «Más filtros» no estorba', async ({ page }) => {
  const api = await fakeApi(page)
  await page.goto('/cursos?level=INICIAL&minWeeks=3&maxWeeks=8&q=anuncios')
  await expect(courses(page)).toHaveCount(1)

  // plegado: los controles de segunda línea no se ven ni reciben el foco, y su contador dice cuántos hay en marcha
  await expect(page.getByRole('combobox', { name: 'Nivel' })).toBeHidden()
  await expect(page.getByText('2 activos')).toBeAttached()

  const active = page.getByRole('group', { name: 'Filtros activos' })
  await active.getByRole('button', { name: 'Quitar filtro Duración: De 3 a 8 semanas' }).click()
  await expect(page).toHaveURL(/\/cursos\?q=anuncios&level=INICIAL$/)
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeFocused()
  await expect(page.getByText('1 activo', { exact: true })).toBeAttached()
  expect(lastParam(api.catalogRequests, 'minWeeks')).toBeNull()

  await active.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page).toHaveURL(/\/cursos$/)
  await expect(active).toHaveCount(0)
  await expect(courses(page)).toHaveCount(2)
})

test('el título de cada fila es su único enlace y su foco se ve', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/cursos')
  const row = courses(page).first()
  await expect(row).toBeVisible()
  const link = row.getByRole('link')
  await expect(link).toHaveCount(1)

  // se pide por teclado: focus() desde el código no siempre activa :focus-visible
  await link.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(link).toBeFocused()
  const outline = await link.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset }
  })
  expect(outline).toEqual({ style: 'solid', width: '2px', offset: '2px' })

  // la fila no es un objetivo de clic: solo el título lleva a la ficha
  const box = (await row.boundingBox())!
  await page.mouse.click(box.x + box.width - 8, box.y + 8)
  await expect(page).toHaveURL('/cursos')
  await link.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Licencias de anuncios con SRTM' })).toBeVisible()
})

test('los chips de categoría miden 44 px y los resultados son una lista de una columna', async ({ page }) => {
  await fakeApi(page)
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto('/cursos')
  await expect(courses(page)).toHaveCount(2)

  const chips = page.getByRole('group', { name: 'Categoría' }).getByRole('button')
  for (const chip of await chips.all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const [first, second] = [await courses(page).nth(0).boundingBox(), await courses(page).nth(1).boundingBox()]
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1)
  expect(second!.x).toBe(first!.x)
})

test('un error del servidor se explica y «Reintentar» lo recupera', async ({ page }) => {
  const api = await fakeApi(page)
  api.failOnce(isCourseList, 500)
  await page.goto('/cursos')

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('No pudimos cargar el catálogo')
  await expect(alert).toContainText('El servidor no pudo responder. Inténtalo de nuevo en unos minutos.')
  // el código, aparte y plegado: no está en la frase, pero quien lo reporte lo encuentra en «Detalles»
  await expect(alert.getByText('Código del error: 500')).toBeHidden()
  await alert.getByText('Detalles').click()
  await expect(alert.getByText('Código del error: 500')).toBeVisible()
  await expect(courses(page)).toHaveCount(0)

  await alert.getByRole('button', { name: 'Reintentar' }).click()
  await expect(courses(page)).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(api.catalogRequests).toHaveLength(2)
})
