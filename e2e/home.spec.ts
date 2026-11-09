import { expect, test, type Page } from '@playwright/test'
import { fakeApi, type FakeApiOptions } from './api'

// el destino de «Inicio» (issue #142): quien administra conserva el panel de core; los demás, la primera sección del LMS que el
// servidor les deja abrir (aula, docencia, estudio, revisión), por permiso; sin ninguna, también el panel. nadie aterriza en un 403

const OBJECTS = '/api/objects'
const TAGLINE = 'Plataforma de aplicaciones geoespaciales configurables'
const menu = (page: Page) => page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Inicio', exact: true }) })
const home = (page: Page) => menu(page).getByRole('link', { name: 'Inicio', exact: true })
const panel = (page: Page) => page.getByRole('heading', { level: 1, name: 'Inicio' })
const myCourses = (page: Page) => page.getByRole('heading', { level: 1, name: 'Mis cursos' })

// anota lo que delata el panel: la petición de sus datos y, en cada cambio del DOM, si su lema llegó a pintarse
async function watchPanel(page: Page) {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === OBJECTS) requests.push(request.url())
  })
  await page.addInitScript((tagline) => {
    const state = window as unknown as { sawPanel?: boolean }
    new MutationObserver(() => {
      if (document.body?.textContent?.includes(tagline)) state.sawPanel = true
    }).observe(document, { childList: true, subtree: true, characterData: true })
  }, TAGLINE)
  return {
    requests,
    sawPanel: () => page.evaluate(() => (window as unknown as { sawPanel?: boolean }).sawPanel === true)
  }
}

// sin matricula: READ, GET /lms/classroom/enrollments responde 403: el creador y el revisor de la demo no tienen matrículas
const NOT_ADMINISTERING: [string, FakeApiOptions, string, string][] = [
  ['un estudiante', { signedIn: true }, '/mis-cursos', 'Mis cursos'],
  ['un docente', { signedIn: true, as: 'teacher' }, '/mis-cursos', 'Mis cursos'],
  ['un creador', { signedIn: true, as: 'creator' }, '/estudio', 'Mis versiones'],
  ['un revisor', { signedIn: true, as: 'reviewer' }, '/revision', 'Bandeja de revisión']
]

for (const [who, options, path, title] of NOT_ADMINISTERING) {
  test(`${who} aterriza en ${path} desde /, también al recargar, sin montar el panel`, async ({ page }) => {
    const watch = await watchPanel(page)
    const api = await fakeApi(page, options)
    const landing = page.getByRole('heading', { level: 1, name: title })
    await page.goto('/')
    await expect(page).toHaveURL(path)
    await expect(landing).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(path)
    await expect(landing).toBeVisible()
    // y por «Inicio», desde otra pantalla
    await page.goto('/cursos')
    await page.goto('/')
    await expect(page).toHaveURL(path)
    await expect(home(page)).toHaveAttribute('href', path)
    expect(watch.requests).toEqual([])
    expect(await watch.sawPanel()).toBe(false)
    expect(api.unexpected).toEqual([])
  })
}

test('quien no administra vuelve a su inicio con «Inicio» y la atrás no queda atrapada en /', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis ediciones' })).toBeVisible()
  await home(page).click()
  await expect(page).toHaveURL('/mis-cursos')
  await page.goBack()
  await expect(page).toHaveURL('/docencia')
  // la redirección reemplaza a /: atrás no vuelve a ella
  await page.goto('/')
  await expect(page).toHaveURL('/mis-cursos')
  await page.goBack()
  await expect(page).toHaveURL('/docencia')
})

// el catálogo es público, sin shell: ahí no tendría menú ni cierre de sesión. el panel solo lista lo que la API le deja ver
test('sin ninguna sección del LMS, el inicio es el panel de core y el catálogo no le ofrece «Mis cursos»', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'authority' })
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(panel(page)).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Catálogo', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toHaveCount(0)
  await page.goto('/cursos')
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de cursos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mis cursos', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('href', '/')
  expect(api.unexpected).toEqual([])
})

test.describe('quien administra', () => {
  const administrator: FakeApiOptions = { signedIn: true, as: 'administrator' }

  test('conserva el panel en /, con recarga, y su menú le lleva a «Mis cursos»', async ({ page }) => {
    const watch = await watchPanel(page)
    await fakeApi(page, administrator)
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(panel(page)).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(panel(page)).toBeVisible()
    expect(watch.requests.length).toBeGreaterThan(0)
    await expect(home(page)).toHaveAttribute('href', '/')
    await expect(menu(page).getByRole('link', { name: 'Administración', exact: true })).toBeVisible()
    await menu(page).getByRole('link', { name: 'Mis cursos', exact: true }).click()
    await expect(page).toHaveURL('/mis-cursos')
    await expect(myCourses(page)).toBeVisible()
  })

  test('«Inicio» desde la sección de administración sale de ella al panel, con el menú del LMS', async ({ page }) => {
    await fakeApi(page, administrator)
    await page.goto('/admin/users')
    await expect(menu(page).getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
    await home(page).click()
    await expect(page).toHaveURL('/')
    await expect(panel(page)).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
    await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
  })
})

test.describe('permisos', () => {
  test('cargando: se ve el mensaje de carga, sin el panel ni sus datos, y al llegar aterriza', async ({ page }) => {
    const watch = await watchPanel(page)
    await fakeApi(page, { signedIn: true })
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/auth/me/permissions', async (route) => {
      await held
      await route.fallback()
    })
    await page.goto('/')
    await expect(page.getByRole('main').getByText('Cargando')).toBeVisible()
    await expect(page).toHaveURL('/')
    await expect(panel(page)).toHaveCount(0)
    release()
    await expect(page).toHaveURL('/mis-cursos')
    await expect(myCourses(page)).toBeVisible()
    expect(watch.requests).toEqual([])
    expect(await watch.sawPanel()).toBe(false)
  })

  // sin saber quién es, core abre su panel (src/app/home.ts de @wasichai/core): la persona no se queda en blanco ni en un bucle,
  // y el menú la lleva a su trabajo. no gana acceso a nada: el panel solo lista lo que la API le deja ver
  test('con error: core abre su panel, sin bucle, y «Mis cursos» sigue a un clic', async ({ page }) => {
    const visited: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname)
    })
    await fakeApi(page, { signedIn: true, permissionsFail: true })
    await page.goto('/')
    await expect(panel(page)).toBeVisible()
    await expect(page).toHaveURL('/')
    // quieto: ninguna navegación más, y nunca salió de /
    const settled = visited.length
    // sin un tiempo a ojo: con la red en reposo cualquier redirección ya habría ocurrido
    await page.waitForLoadState('networkidle')
    expect(visited).toHaveLength(settled)
    expect(new Set(visited)).toEqual(new Set(['/']))
    await expect(home(page)).toHaveAttribute('href', '/')
    await menu(page).getByRole('link', { name: 'Mis cursos', exact: true }).click()
    await expect(page).toHaveURL('/mis-cursos')
    await expect(myCourses(page)).toBeVisible()
  })
})

test.describe('sin sesión', () => {
  test('/ lleva al login', async ({ page }) => {
    await fakeApi(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login(\?|$)/)
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  async function signIn(page: Page) {
    await page.getByLabel('Correo').fill('rosa@demo.local')
    await page.getByLabel('Contraseña').fill('una-clave')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }

  test('tras iniciar sesión vuelve a la página pedida', async ({ page }) => {
    await fakeApi(page, { as: 'creator' })
    await page.goto('/estudio?orden=1')
    await expect(page).toHaveURL(/\/login\?returnTo=/)
    await signIn(page)
    await expect(page).toHaveURL('/estudio?orden=1')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis versiones' })).toBeVisible()
  })

  test('sin página pedida, iniciar sesión lleva al destino de cada quien', async ({ page }) => {
    const watch = await watchPanel(page)
    await fakeApi(page)
    await page.goto('/login')
    await signIn(page)
    await expect(page).toHaveURL('/mis-cursos')
    await expect(myCourses(page)).toBeVisible()
    expect(watch.requests).toEqual([])
    expect(await watch.sawPanel()).toBe(false)
  })

  test('quien administra llega al panel al iniciar sesión', async ({ page }) => {
    await fakeApi(page, { as: 'administrator' })
    await page.goto('/login')
    await signIn(page)
    await expect(page).toHaveURL('/')
    await expect(panel(page)).toBeVisible()
  })
})
