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

  // limpiar deja el foco en los resultados, no en la nada
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeFocused()

  // una categoría: botón que se pulsa con Espacio
  const category = page.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Gestión municipal (2)' })
  await tabTo(page, category, 'Shift+Tab')
  await page.keyboard.press('Space')
  await expect(category).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => api.catalogRequests.at(-1)?.searchParams.get('category')).toBe('gestion-municipal')
  await page.keyboard.press('Space')
  await expect(category).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => api.catalogRequests.at(-1)?.searchParams.get('category')).toBeNull()

  // plegado, «Más filtros» no se lleva el foco: de él se salta a los resultados
  const more = page.locator('summary').filter({ hasText: 'Más filtros' })
  await tabTo(page, more)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Licencias de anuncios con SRTM' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(more).toBeFocused()
  await page.keyboard.press('Enter')

  // un desplegable: se abre con Enter, se recorre con flechas y se elige con Enter
  const level = page.getByRole('combobox', { name: 'Nivel' })
  await tabTo(page, level)
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

// los flujos de trabajo, solo con el teclado: foco a la vista (en el control o en lo que lo enmarca), Esc cierra los diálogos y el foco vuelve a quien los abrió
async function focusIsVisible(target: Locator): Promise<void> {
  const shown = await target.evaluate((element) => {
    // la tarjeta y la opción enmarcan su enlace o su radio: el anillo está en ellas
    for (let node: Element | null = element, up = 0; node && up < 3; node = node.parentElement, up++) {
      const style = getComputedStyle(node)
      if ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) || style.boxShadow !== 'none') return true
    }
    return false
  })
  expect(shown, 'el foco se ve').toBe(true)
}

async function escapeReturnsTo(page: Page, dialog: Locator, opener: Locator): Promise<void> {
  await expect(dialog).toBeVisible()
  // el foco queda atrapado dentro mientras está abierto
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
}

test('el panel: del menú a «Continuar» y a la lección, con el foco a la vista', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos')
  const resume = page
    .getByRole('main')
    .getByRole('link', { name: /^Continuar/ })
    .first()
  await tabTo(page, resume)
  await focusIsVisible(resume)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/mis-cursos\/mat-/)
})

test('la lección: el foco va al título al cambiar y las herramientas de lectura van con el teclado', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
  const toolbar = page.getByRole('toolbar', { name: 'Lectura' })
  const mode = toolbar.getByRole('button', { name: 'Modo lectura' })
  // un solo tabstop para toda la barra: Tab entra por su primer botón y las flechas llegan a los demás
  await tabTo(page, toolbar.getByRole('button', { name: 'Índice' }))
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1)
  for (let i = 0; i < 6 && !(await mode.evaluate((element) => element === document.activeElement)); i++) await page.keyboard.press('ArrowRight')
  await focusIsVisible(mode)
  await page.keyboard.press('Space')
  await expect(mode).toHaveAttribute('aria-pressed', 'true')
  await expect(mode).toBeFocused()

  const next = page.getByRole('link', { name: /^Siguiente/ })
  await tabTo(page, next)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 2, name: 'Recorrido por la pantalla' })).toBeFocused()
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la hoja del índice: Esc la cierra y devuelve el foco; elegir una lección lo lleva a su título', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos/mat-srtm-1?leccion=lec-html')
    const open = page.getByRole('button', { name: 'Índice' })
    await tabTo(page, open)
    await focusIsVisible(open)
    await page.keyboard.press('Enter')
    await escapeReturnsTo(page, page.getByRole('dialog', { name: 'Índice' }), open)

    await page.keyboard.press('Enter')
    const lesson = page.getByRole('dialog', { name: 'Índice' }).getByRole('link', { name: /^Recorrido por la pantalla/ })
    await tabTo(page, lesson)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Recorrido por la pantalla' })).toBeFocused()
  })

  test('el menú del shell es un cajón: atrapa el foco, Esc lo cierra y devuelve el foco', async ({ page }) => {
    await fakeApi(page, { signedIn: true })
    await page.goto('/mis-cursos')
    const open = page.getByRole('button', { name: 'Abrir el menú' })
    await tabTo(page, open)
    await page.keyboard.press('Enter')
    // es de core y no se anuncia como diálogo: un aside con su botón, que deja inerte lo demás
    const panel = page.locator(`[id="${await open.getAttribute('aria-controls')}"]`)
    await expect.poll(() => panel.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
    expect(await panel.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(panel).not.toBeInViewport()
    await expect(open).toBeFocused()
  })

  test('la hoja de filtros del catálogo: Esc la cierra y devuelve el foco', async ({ page }) => {
    await fakeApi(page)
    await page.goto('/cursos')
    const open = page.getByRole('button', { name: /^Más filtros/ })
    await tabTo(page, open)
    await page.keyboard.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Más filtros' })
    await escapeReturnsTo(page, sheet, open)
  })
})

test('la evaluación: se empieza, se responde y el diálogo de entrega se cierra con Esc', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  await page.goto('/mis-cursos/mat-sgspe-1?leccion=lec-eva')
  const start = page.getByRole('button', { name: /^Comenzar intento/ })
  await tabTo(page, start)
  await page.keyboard.press('Enter')
  await escapeReturnsTo(page, page.getByRole('dialog'), start)

  await page.keyboard.press('Enter')
  await tabTo(page, page.getByRole('dialog').getByRole('button', { name: 'Comenzar' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeFocused()

  // un grupo de opciones: se entra con Tab, se elige con Espacio, y el marco de la opción dice dónde se está
  const option = page.getByRole('radio', { name: 'La municipalidad' })
  await tabTo(page, option)
  await focusIsVisible(option)
  await page.keyboard.press('Space')
  await expect(option).toBeChecked()

  const submit = page.getByRole('button', { name: 'Entregar' })
  await tabTo(page, submit, 'Shift+Tab')
  await page.keyboard.press('Enter')
  await escapeReturnsTo(page, page.getByRole('dialog'), submit)
})

test('la corrección: salir con cambios pregunta, y Esc se queda donde estaba', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09/correccion/int-1')
  const points = page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' }).getByLabel('Puntos (de 0 a 4)')
  await tabTo(page, points, 'Tab', 60)
  await focusIsVisible(points)
  await page.keyboard.type('3')

  const back = page.getByRole('link', { name: /Cola de corrección/ })
  await tabTo(page, back, 'Shift+Tab', 60)
  await page.keyboard.press('Enter')
  await escapeReturnsTo(page, page.getByRole('dialog', { name: '¿Salir sin guardar?' }), back)
  await expect(page).toHaveURL(/\/correccion\/int-1$/)
  await expect(points).toHaveValue('3')
})

test('la asistencia: se marca con el teclado y salir a medias pregunta', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09/sesiones/ses-1/asistencia')
  const all = page.getByRole('button', { name: 'Marcar a todos presentes' })
  await tabTo(page, all, 'Tab', 60)
  await focusIsVisible(all)
  await page.keyboard.press('Enter')
  const late = page
    .getByRole('group', { name: /^Asistencia de/ })
    .first()
    .getByRole('button', { name: 'Tarde' })
  await tabTo(page, late)
  await focusIsVisible(late)
  await page.keyboard.press('Space')
  await expect(late).toHaveAttribute('aria-pressed', 'true')

  const back = page.getByRole('link', { name: /Sesiones de la edición/ })
  await tabTo(page, back, 'Shift+Tab')
  await page.keyboard.press('Enter')
  await escapeReturnsTo(page, page.getByRole('dialog', { name: '¿Salir sin guardar?' }), back)
})

test('la revisión: el diálogo de rechazo se cierra con Esc y comentar se abre con el teclado', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'reviewer' })
  await page.goto('/revision')
  const version = page.getByRole('main').getByRole('link').first()
  await tabTo(page, version)
  await focusIsVisible(version)
  await page.keyboard.press('Enter')

  const reject = page.getByRole('button', { name: 'Rechazar' })
  await tabTo(page, reject)
  await focusIsVisible(reject)
  await page.keyboard.press('Enter')
  await escapeReturnsTo(page, page.getByRole('dialog'), reject)

  const comment = page.getByRole('button', { name: 'Comentar La versión completa' })
  await tabTo(page, comment)
  await page.keyboard.press('Enter')
  const text = page.getByRole('form').getByRole('textbox')
  await expect(text).toBeFocused()
  // cerrar el formulario devuelve el foco al botón que lo abrió
  await tabTo(page, page.getByRole('form').getByRole('button', { name: 'Cancelar' }))
  await page.keyboard.press('Enter')
  await expect(comment).toBeFocused()
})

test('programar una sesión: el foco entra en el formulario y vuelve al cerrarlo', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia/edicion-sgspe-2026-09/sesiones')
  const open = page.getByRole('button', { name: 'Programar sesión' })
  await tabTo(page, open)
  await page.keyboard.press('Enter')
  const form = page.getByRole('form', { name: 'Crear una sesión o una serie' })
  await expect(form.getByLabel('Título')).toBeFocused()
  await tabTo(page, form.getByRole('button', { name: 'Cerrar sin crear' }))
  await page.keyboard.press('Enter')
  await expect(open).toBeFocused()
})
