import { expect, test } from '@playwright/test'
import { open, SCENARIOS, VIEWPORTS } from './scenarios'

// con VISUAL_DIR guarda capturas para mirarlas; sin él las compara con las de referencia.
// VISUAL_ONLY=student-lesson,catalog y VISUAL_VIEWPORTS=phone,desktop acotan el recorrido
const dir = process.env.VISUAL_DIR
const only = process.env.VISUAL_ONLY?.split(',')
const viewports = process.env.VISUAL_VIEWPORTS?.split(',') ?? ['phone', 'tablet', 'desktop']
// el idioma y el tema, en el nombre, también al comparar: la tanda oscura tiene sus propias referencias y no se compara con la clara
const suffix = [process.env.VISUAL_LANG ?? process.env.VISUAL_LOCALE, process.env.VISUAL_DARK ? 'dark' : undefined]
  .filter(Boolean)
  .map((part) => `-${part}`)
  .join('')

for (const scenario of SCENARIOS.filter((candidate) => !only || only.includes(candidate.name))) {
  for (const viewport of viewports as (keyof typeof VIEWPORTS)[]) {
    test(`${scenario.name} en ${viewport}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport])
      await open(page, scenario)
      // ninguna pantalla desborda en horizontal (4-responsive.md)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, 'desbordamiento horizontal de la página').toBeLessThanOrEqual(0)
      if (dir) await page.screenshot({ path: `${dir}/${scenario.name}-${viewport}${suffix}.png`, fullPage: true })
      else await expect(page).toHaveScreenshot(`${scenario.name}-${viewport}${suffix}.png`, { fullPage: true, maxDiffPixelRatio: 0.01, animations: 'disabled' })
    })
  }
}
