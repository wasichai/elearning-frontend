import type { Page } from '@playwright/test'

export interface Overflow {
  scrollWidth: number
  clientWidth: number
  mainScrollWidth: number
  mainClientWidth: number
  wider: string[]
}

// lo que obliga a desplazarse en horizontal: la página, el área que desplaza el shell y los elementos que se salen por la derecha, para que
// el fallo diga cuál. lo de dentro de un svg se recorta con él (la banda de cordones dibuja de más), y lo de dentro de un contenedor con
// desplazamiento o recorte propio (las pestañas de sección, un truncado) tampoco desborda la página
export async function horizontalOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const root = document.documentElement
    const main = document.querySelector('main')
    const clipped = (element: Element) => {
      for (let up = element.parentElement; up && up !== document.body; up = up.parentElement)
        if (getComputedStyle(up).overflowX !== 'visible' && up !== main) return true
      return false
    }
    const wider = [...document.body.querySelectorAll('*')]
      .filter((element) => !element.parentElement?.closest('svg'))
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 0.5)
      .filter((element) => !clipped(element))
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 3).join('.')}`)
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      mainScrollWidth: main?.scrollWidth ?? 0,
      mainClientWidth: main?.clientWidth ?? 0,
      wider
    }
  })
}
