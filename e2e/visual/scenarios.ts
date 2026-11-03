import type { Page } from '@playwright/test'
import { fakeApi } from '../api'
import type { Scenario } from './scenario'
import { catalogScenarios } from './scenarios/catalog'
import { classroomScenarios } from './scenarios/classroom'
import { reviewScenarios } from './scenarios/review'
import { shellScenarios } from './scenarios/shell'
import { studioScenarios } from './scenarios/studio'
import { teachingScenarios } from './scenarios/teaching'
import { termsScenarios } from './scenarios/terms'

// el recorrido visual: cada pantalla principal con su API simulada. lo usan screens.spec.ts (regresión visual) y la
// inspección a ojo (VISUAL_DIR guarda las capturas). no sustituye a las pruebas de comportamiento de e2e/
export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
  small: { width: 360, height: 740 }
} as const

export const SCENARIOS: Scenario[] = [
  ...catalogScenarios,
  ...classroomScenarios,
  ...teachingScenarios,
  ...studioScenarios,
  ...reviewScenarios,
  ...shellScenarios,
  ...termsScenarios
]

export async function open(page: Page, scenario: Scenario): Promise<void> {
  await fakeApi(page, scenario.api ?? {})
  // VISUAL_LANG=en: el idioma que core guarda con el storagePrefix de la app (WasichaiApp no lo toma del navegador)
  const language = process.env.VISUAL_LANG
  if (language) await page.addInitScript((value) => localStorage.setItem('elearning.lang', value), language)
  await page.goto(scenario.path)
  await page.waitForLoadState('networkidle')
  await scenario.act?.(page)
}
