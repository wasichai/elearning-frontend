import { expect, test } from '@playwright/test'
import { open, SCENARIOS, VIEWPORTS } from './scenarios'

// con VISUAL_DIR guarda capturas para mirarlas; sin él las compara con las de referencia.
// VISUAL_ONLY=student-lesson,catalog y VISUAL_VIEWPORTS=phone,desktop acotan el recorrido
const dir = process.env.VISUAL_DIR
const only = process.env.VISUAL_ONLY?.split(',')
const viewports = process.env.VISUAL_VIEWPORTS?.split(',') ?? ['phone', 'tablet', 'desktop']
const language = process.env.VISUAL_LOCALE

for (const scenario of SCENARIOS.filter((candidate) => !only || only.includes(candidate.name))) {
  for (const viewport of viewports as (keyof typeof VIEWPORTS)[]) {
    test(`${scenario.name} en ${viewport}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport])
      await open(page, scenario)
      // ninguna pantalla desborda en horizontal (4-responsive.md)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'desbordamiento horizontal de la página').toBeLessThanOrEqual(0)
      if (dir) await page.screenshot({ path: `${dir}/${scenario.name}-${viewport}${language ? `-${language}` : ''}.png`, fullPage: true })
      else await expect(page).toHaveScreenshot(`${scenario.name}-${viewport}.png`, { fullPage: true, maxDiffPixelRatio: 0.01, animations: 'disabled' })
    })
  }
}
