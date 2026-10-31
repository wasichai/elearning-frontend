import { randomUUID } from 'node:crypto'
import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

// lo que comparten los recorridos contra el backend de verdad

export const API_URL = process.env.WASICHAI_API_URL ?? 'http://localhost:8090'
// las del administrador de la semilla dev, como en model/apply.py. tiene todos los permisos, PUBLICAR incluido
export const ADMIN = { email: process.env.WASICHAI_EMAIL ?? 'admin@wasichai.local', password: process.env.WASICHAI_PASSWORD ?? 'admin' }

export interface Account {
  email: string
  password: string
}

export async function token(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password } })
  expect(response.status(), `no se pudo iniciar sesión como ${email} en ${API_URL}`).toBe(200)
  return ((await response.json()) as { token: string }).token
}

// cada ejecución crea sus usuarios con el administrador del perfil dev: se repite sin limpiar nada
export async function newUser(request: APIRequestContext, role: string, displayName: string): Promise<Account> {
  const admin = await token(request, ADMIN.email, ADMIN.password)
  const user = { email: `e2e-${randomUUID()}@demo.wasichai-learning.test`, password: `E2e-${randomUUID()}` }
  const response = await request.post(`${API_URL}/api/users`, {
    headers: { Authorization: `Bearer ${admin}` },
    data: { ...user, displayName, roles: [role] }
  })
  expect(response.status()).toBe(201)
  return user
}

export const newStudent = (request: APIRequestContext) => newUser(request, 'ESTUDIANTE', 'Estudiante e2e')

export async function signIn(page: Page, user: Account) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(user.email)
  await page.getByLabel('Contraseña').fill(user.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

// cada persona en su propio contexto: ni sesión ni almacenamiento compartidos
export async function browserFor(browser: Browser, baseURL: string | undefined, account?: Account) {
  const context = await browser.newContext({ baseURL, locale: 'es-PE', timezoneId: 'America/Lima' })
  const page = await context.newPage()
  if (account) await signIn(page, account)
  return { context, page }
}
