import { expect, test, type Page } from '@playwright/test'
import { ADMIN, newStudent, signIn } from './helpers'

// la sección de administración con los permisos que responde el backend de verdad (issue #141). solo con E2E_REAL=1
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

const menu = (page: Page) => page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Inicio', exact: true }) })

test('quien administra entra por la entrada del menú, llega a Objetos y vuelve con Inicio', async ({ page }) => {
  await signIn(page, ADMIN)
  await menu(page).getByRole('link', { name: 'Mis cursos', exact: true }).click()
  await menu(page).getByRole('link', { name: 'Administración', exact: true }).click()
  await expect(page).toHaveURL('/data/objects')
  await expect(page.getByRole('heading', { level: 1, name: 'Objetos' })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toHaveCount(0)
  await menu(page).getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
})

test('un estudiante que escribe /admin/users recibe 403 y su menú no cambia', async ({ page, request }) => {
  await signIn(page, await newStudent(request))
  const users = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/users')
  await page.goto('/admin/users')
  expect((await users).status()).toBe(403)
  await expect(menu(page).getByRole('link', { name: 'Mis cursos', exact: true })).toBeVisible()
  for (const name of ['Administración', 'Objetos', 'Usuarios']) await expect(menu(page).getByRole('link', { name, exact: true })).toHaveCount(0)
})
