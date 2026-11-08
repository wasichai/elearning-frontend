import { expect, test, type Page } from '@playwright/test'
import { fakeApi, type FakeApiOptions } from './api'

// la sección de administración es un estado del menú (issue #141): sin permiso no aparece, en ninguna ruta; con permiso, una
// entrada lleva a ella y «Inicio» vuelve. ninguna URL cambia

const menu = (page: Page) => page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Inicio', exact: true }) })
const entry = (page: Page) => menu(page).getByRole('link', { name: 'Administración', exact: true })
const groupTitles = (page: Page) => menu(page).locator("[data-slot='nav-group']")

// lo de core no está: ni sus grupos, ni sus entradas, ni la entrada a la sección
async function expectNoSection(page: Page) {
  await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toBeVisible()
  for (const title of ['Datos', 'Administración', 'Plataforma'])
    await expect(groupTitles(page).filter({ hasText: new RegExp(`^${title}$`, 'i') })).toHaveCount(0)
  for (const name of ['Administración', 'Objetos', 'Relaciones', 'Usuarios', 'Roles', 'Permisos', 'Auditoría', 'Cuentas de servicio'])
    await expect(menu(page).getByRole('link', { name, exact: true })).toHaveCount(0)
}

async function expectInSection(page: Page) {
  await expect(groupTitles(page)).toHaveText(['Datos', 'Administración'])
  await expect(menu(page).getByRole('link', { name: 'Objetos', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toHaveCount(0)
  await expect(entry(page)).toHaveCount(0)
}

const ACCOUNTS: [string, FakeApiOptions, string][] = [
  ['un estudiante', { signedIn: true }, 'Mis cursos'],
  ['un docente', { signedIn: true, as: 'teacher' }, 'Mis ediciones'],
  ['un creador', { signedIn: true, as: 'creator' }, 'Mis versiones'],
  ['un revisor', { signedIn: true, as: 'reviewer' }, 'Bandeja de revisión']
]

for (const [who, options, own] of ACCOUNTS) {
  test(`${who} no ve la sección de administración, en ninguna ruta`, async ({ page }) => {
    const api = await fakeApi(page, options)
    for (const path of [
      '/',
      '/mis-cursos',
      '/data/objects',
      '/data/objects/leccion/records/l-1',
      '/admin/users',
      '/admin/roles',
      '/admin/permissions',
      '/admin/audit',
      '/admin/service-accounts'
    ]) {
      await page.goto(path)
      await expect(menu(page).getByRole('link', { name: own, exact: true }), path).toBeVisible()
      await expectNoSection(page)
    }
    expect(api.unexpected).toEqual([])
  })
}

test('un estudiante que escribe /admin/users no recibe datos: la API responde 403 y el menú no cambia', async ({ page }) => {
  await fakeApi(page, { signedIn: true })
  const users = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/users')
  await page.goto('/admin/users')
  expect((await users).status()).toBe(403)
  await expect(page.getByText('rosa@demo.local')).toHaveCount(0)
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
  await expectNoSection(page)
})

test('un creador que abre una lección desde el estudio mantiene su menú del LMS, también al recargar', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'creator' })
  await page.goto('/estudio')
  await page.getByRole('link', { name: 'Introducción al SGSPE — versión 2' }).click()
  await page.getByRole('link', { name: 'Editar la lección «Entrar al portal»' }).click()
  await expect(page).toHaveURL('/data/objects/leccion/records/l-1')
  await expect(page.getByRole('textbox', { name: /^Título/ })).toHaveValue('Entrar al portal')
  await expect(menu(page).getByRole('link', { name: 'Mis versiones', exact: true })).toBeVisible()
  await expectNoSection(page)
  await page.reload()
  await expect(page.getByRole('textbox', { name: /^Título/ })).toHaveValue('Entrar al portal')
  await expect(menu(page).getByRole('link', { name: 'Mis versiones', exact: true })).toBeVisible()
  await expectNoSection(page)
  expect(api.unexpected).toEqual([])
})

test.describe('con permiso', () => {
  const administrator: FakeApiOptions = { signedIn: true, as: 'administrator' }

  test('encuentra la entrada desde «Mis cursos», llega a «Objetos» y vuelve con «Inicio»', async ({ page }) => {
    const api = await fakeApi(page, administrator)
    await page.goto('/mis-cursos')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
    await expect(groupTitles(page).filter({ hasText: /^Datos$/ })).toHaveCount(0)
    await entry(page).click()

    await expect(page).toHaveURL('/data/objects')
    await expect(page.getByRole('heading', { level: 1, name: 'Objetos' })).toBeVisible()
    await expectInSection(page)

    await menu(page).getByRole('link', { name: 'Inicio', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(entry(page)).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
    await expect(groupTitles(page).filter({ hasText: /^Datos$/ })).toHaveCount(0)
    expect(api.unexpected).toEqual([])
  })

  test('lo encuentra también en el cajón del móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await fakeApi(page, administrator)
    await page.goto('/mis-cursos')
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    await entry(page).click()

    await expect(page).toHaveURL('/data/objects')
    await expect(page.getByRole('heading', { level: 1, name: 'Objetos' })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    await expectInSection(page)
    await menu(page).getByRole('link', { name: 'Inicio', exact: true }).click()

    await expect(page).toHaveURL('/')
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    await expect(entry(page)).toBeVisible()
  })

  // cada ruta de la sección abre directamente y sobrevive a una recarga, con su pantalla de core y el menú de la sección
  const ROUTES: [string, string][] = [
    ['/data/objects', 'Objetos'],
    ['/data/objects/leccion/records/l-1', 'Lección'],
    ['/admin/users', 'Usuarios'],
    ['/admin/roles', 'Roles'],
    ['/admin/permissions', 'Permisos'],
    ['/admin/audit', 'Auditoría'],
    ['/admin/service-accounts', 'Cuentas de servicio']
  ]
  for (const [path, title] of ROUTES) {
    test(`${path} abre y se recarga`, async ({ page }) => {
      const api = await fakeApi(page, administrator)
      await page.goto(path)
      await expect(page.getByRole('heading', { name: new RegExp(title) }).first()).toBeVisible()
      await expectInSection(page)
      await page.reload()
      await expect(page).toHaveURL(path)
      await expect(page.getByRole('heading', { name: new RegExp(title) }).first()).toBeVisible()
      await expectInSection(page)
      expect(api.unexpected).toEqual([])
    })
  }

  test('con los permisos en error no se ofrece la sección y las pantallas del LMS funcionan', async ({ page }) => {
    await fakeApi(page, { ...administrator, permissionsFail: true })
    await page.goto('/mis-cursos')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
    await expectNoSection(page)
    await page.goto('/data/objects')
    await expectNoSection(page)
  })

  test('con los permisos cargando no se ofrece la sección y las pantallas del LMS funcionan', async ({ page }) => {
    await fakeApi(page, administrator)
    // la respuesta no llega nunca: gana a la simulación porque esta ruta se registra después
    await page.route('**/api/auth/me/permissions', () => undefined)
    await page.goto('/mis-cursos')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
    await expectNoSection(page)
  })
})

test('los ítems del menú miden 44 px y el actual se marca con algo más que el color', async ({ page }) => {
  // una pantalla que no es su inicio, para medir «Inicio» sin marcar junto a la actual
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto('/docencia')
  const current = menu(page).getByRole('link', { name: 'Mis ediciones', exact: true })
  await expect(current).toHaveAttribute('aria-current', 'page')
  const home = menu(page).getByRole('link', { name: 'Inicio', exact: true })
  await expect(home).not.toHaveAttribute('aria-current', 'page')
  for (const item of [current, home]) expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect(current).toHaveCSS('font-weight', '650')
  await expect(current).toHaveCSS('box-shadow', /inset/)
  await expect(home).toHaveCSS('box-shadow', 'none')
})

// «Inicio» y su sección no se marcan a la vez (H2 de #179, wasichai-ui#176): si «Inicio» lleva a una entrada del menú, solo esa
// entrada es la actual; si lleva al panel de core, la actual es «Inicio»
for (const [who, options] of [
  ['un estudiante', { signedIn: true }],
  ['un docente', { signedIn: true, as: 'teacher' }]
] as const) {
  test(`${who} en su inicio ve marcada solo «Mis cursos»`, async ({ page }) => {
    await fakeApi(page, options)
    await page.goto('/mis-cursos')
    await expect(page.getByRole('heading', { level: 1, name: 'Mis cursos' })).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).not.toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1)
  })
}

test('quien administra ve marcada «Inicio» en el panel', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'authority' })
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1)
})
