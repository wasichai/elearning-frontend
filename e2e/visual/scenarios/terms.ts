import type { Page } from '@playwright/test'
import { administrator, student, type Scenario } from '../scenario'

// los términos de uso en cada estado de la aceptación, y publicarlos

const clickWithdraw = async (page: Page) => {
  await page.getByRole('button', { name: /^(Retirar mi aceptación|Withdraw my acceptance)$/ }).click()
  await page.getByRole('dialog').waitFor()
}

const withdrawn = async (page: Page) => {
  await clickWithdraw(page)
  await page.getByRole('button', { name: /^(Retirar y suprimir|Withdraw and erase)$/ }).click()
  await page.getByText(/Tu retirada está en curso|Your withdrawal is in progress/).waitFor()
}

const acceptWhileErasing = async (page: Page) => {
  await page.getByRole('button', { name: /^(Volver a aceptar|Accept again)$/ }).click()
  await page.getByText(/todavía se están suprimiendo|is still being erased/).waitFor()
}

const invalidPublish = async (page: Page) => {
  await page.getByRole('textbox', { name: /^(Texto de los términos|Text of the terms)$/ }).fill('')
  await page.getByRole('textbox', { name: /^(Plazo de conservación, en días|Retention period, in days)$/ }).fill('0')
  await page.getByRole('button', { name: /^(Publicar versión nueva|Publish new version)$/ }).click()
  await page.getByText(/Escribe el texto de los términos\.|Write the text of the terms\./).waitFor()
}

const confirmPublish = async (page: Page) => {
  await page.getByRole('button', { name: /^(Publicar versión nueva|Publish new version)$/ }).click()
  await page.getByRole('dialog').waitFor()
}

const published = async (page: Page) => {
  await confirmPublish(page)
  await page.getByRole('button', { name: /^(Publicar|Publish)$/ }).click()
  await page.getByText(/Publicaste la versión 4|You published version 4/).waitFor()
}

// GET /terms falla: la ruta más reciente manda sobre la simulación
const loadFails = async (page: Page) => {
  await page.route('**/api/lms/terms', (route) =>
    route.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"title":"Error","status":500}' })
  )
  await page.reload()
  await page.getByRole('alert').waitFor()
}

const ADMIN_PATH = '/administracion/terminos'
const RETURNING = '/terminos?returnTo=%2Fcursos%2Fsrtm-anuncios'

export const termsScenarios: Scenario[] = [
  { name: 'terms-none', path: '/terminos', api: { ...student, terms: 'none' } },
  { name: 'terms-none-returning', path: RETURNING, api: { ...student, terms: 'none' } },
  { name: 'terms-accepted', path: '/terminos', api: student },
  { name: 'terms-older', path: '/terminos', api: { ...student, terms: 'older' } },
  { name: 'terms-withdrawn', path: '/terminos', api: { ...student, terms: 'withdrawn' } },
  { name: 'terms-withdrawn-409', path: '/terminos', api: { ...student, terms: 'withdrawn' }, act: acceptWhileErasing },
  { name: 'terms-expired', path: '/terminos', api: { ...student, terms: 'expired' } },
  { name: 'terms-unpublished', path: '/terminos', api: { ...student, terms: 'unpublished' } },
  { name: 'terms-unpublished-admin', path: '/terminos', api: { ...administrator, terms: 'unpublished' } },
  { name: 'terms-withdraw-confirm', path: '/terminos', api: student, act: clickWithdraw },
  { name: 'terms-withdraw-done', path: '/terminos', api: student, act: withdrawn },
  { name: 'terms-load-error', path: '/terminos', api: student, act: loadFails },
  { name: 'terms-publish-load-error', path: ADMIN_PATH, api: administrator, act: loadFails },
  { name: 'terms-publish', path: ADMIN_PATH, api: administrator },
  { name: 'terms-publish-first', path: ADMIN_PATH, api: { ...administrator, terms: 'unpublished' } },
  { name: 'terms-publish-invalid', path: ADMIN_PATH, api: administrator, act: invalidPublish },
  { name: 'terms-publish-confirm', path: ADMIN_PATH, api: administrator, act: confirmPublish },
  { name: 'terms-publish-done', path: ADMIN_PATH, api: administrator, act: published },
  { name: 'terms-publish-refused', path: ADMIN_PATH, api: student }
]
