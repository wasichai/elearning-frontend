import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { woff2Axes } from '../test/woff2Axes'

// las letras del sistema de diseño Colofón, servidas por la app (sin peticiones a terceros) con su licencia SIL OFL:
// Newsreader para títulos y lectura (--font-read de @theme) y Source Sans 3 para la interfaz (--font-sans de los temas)

const index = readFileSync(join(import.meta.dirname, '../index.css'), 'utf8')
const fonts = join(import.meta.dirname, 'fonts')

// los @font-face de index.css: familia, archivo, estilo, peso y rango
const faces = [...index.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
  family: /font-family:\s*'([^']+)'/.exec(body!)?.[1],
  file: /url\('\.\/theme\/fonts\/([^']+)'\)/.exec(body!)?.[1],
  style: /font-style:\s*(\w+)/.exec(body!)?.[1],
  weight: /font-weight:\s*([\d ]+);/.exec(body!)?.[1],
  range: /unicode-range:\s*([^;]+);/.exec(body!)?.[1]
}))

describe('letras de la app', () => {
  it.each([
    ['Newsreader', 'Newsreader', '300 700'],
    ['Source Sans 3', 'SourceSans3', '300 800']
  ])('%s se sirve desde src/theme/fonts, variable, con su licencia OFL', (family, license, weight) => {
    const own = faces.filter((face) => face.family === family)
    // normal y cursiva, en latin y latin-ext
    expect(own.map((face) => face.file)).toHaveLength(4)
    expect(own.map((face) => face.style).sort()).toEqual(['italic', 'italic', 'normal', 'normal'])
    for (const face of own) {
      expect(existsSync(join(fonts, face.file!)), face.file).toBe(true)
      expect(face.file).toMatch(/-(latin|latin-ext)\.woff2$/)
      expect(face.weight).toBe(weight)
      expect(face.range, face.file).toMatch(/^U\+/)
    }
    expect(readFileSync(join(fonts, `OFL-${license}.txt`), 'utf8')).toContain('SIL Open Font License, Version 1.1')
  })

  // el eje real del archivo (tabla fvar) debe cubrir lo que declara el @font-face: si no, el navegador sintetiza los pesos que faltan
  it('los archivos de Newsreader conservan el eje opsz (6-72) y cubren el rango de peso declarado', () => {
    const own = faces.filter((face) => face.family === 'Newsreader')
    expect(own).toHaveLength(4)
    for (const face of own) {
      const axes = woff2Axes(readFileSync(join(fonts, face.file!)))
      const [min, max] = face.weight!.split(' ').map(Number)
      expect(
        axes.find((axis) => axis.tag === 'opsz'),
        face.file
      ).toMatchObject({ min: 6, max: 72 })
      const wght = axes.find((axis) => axis.tag === 'wght')!
      expect(wght.min, face.file).toBeLessThanOrEqual(min!)
      expect(wght.max, face.file).toBeGreaterThanOrEqual(max!)
    }
  })

  it('los de Source Sans 3 son variables en wght y cubren el rango declarado', () => {
    for (const face of faces.filter((face) => face.family === 'Source Sans 3')) {
      const wght = woff2Axes(readFileSync(join(fonts, face.file!))).find((axis) => axis.tag === 'wght')!
      const [min, max] = face.weight!.split(' ').map(Number)
      expect(wght.min, face.file).toBeLessThanOrEqual(min!)
      expect(wght.max, face.file).toBeGreaterThanOrEqual(max!)
    }
  })

  it('no queda ninguna fuente de Quipu', () => {
    expect(index).not.toMatch(/Figtree|Literata/)
    expect(readdirSync(fonts).filter((name) => /Figtree|Literata/.test(name))).toEqual([])
  })

  it('--font-read en @theme empieza por Newsreader, con serifas de respaldo', () => {
    const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--font-read:\s*([^;]+);/.exec(theme)?.[1]).toMatch(/^'Newsreader', .*serif$/)
  })

  it('la escala tipográfica de tokens.json es la de @theme', () => {
    const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    const scale: [string, string, string, string][] = [
      ['display', '56px', '60px', '330'],
      ['h1', '44px', '50px', '380'],
      ['h2', '32px', '38px', '440'],
      ['h3', '25px', '31px', '520'],
      ['h4', '20px', '27px', '600'],
      ['h5', '17px', '24px', '650'],
      ['meta', '15px', '20px', '600'],
      ['body', '16px', '24px', '400'],
      ['secondary', '14px', '20px', '400'],
      ['label', '15px', '20px', '600'],
      ['reading', '20px', '33px', '400']
    ]
    for (const [name, size, line, weight] of scale) {
      const read = (suffix: string) => new RegExp(`--text-${name}${suffix}:\\s*([^;]+);`).exec(theme)?.[1]
      expect([name, read(''), read('--line-height'), read('--font-weight')]).toEqual([name, size, line, weight])
    }
    expect(/--text-meta--letter-spacing:\s*([^;]+);/.exec(theme)?.[1]).toBe('0.07em')
    expect(index).toMatch(/@utility meta\s*\{[^}]*font-variant-caps: all-small-caps;/)
  })

  it('espaciados y anchos de Foundations', () => {
    const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    const staticTheme = /@theme static\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    const space = [4, 8, 12, 16, 24, 32, 48, 72, 112].map((px, at) => new RegExp(`--space-${at + 1}:\\s*${px}px;`))
    for (const pattern of space) expect(staticTheme).toMatch(pattern)
    expect(theme).toMatch(/--container-measure:\s*66ch;/)
    expect(theme).toMatch(/--container-index-col:\s*280px;/)
    expect(theme).toMatch(/--container-margin-col:\s*264px;/)
    expect(theme).toMatch(/--container-content-max:\s*1200px;/)
    // la sombra sigue al tema: la utilidad lee la variable, no copia su valor claro
    expect(index).toMatch(/:where\(:root\)\s*\{\s*--shadow-overlay:\s*0 12px 32px rgb\(23 32 43 \/ 16%\);/)
    expect(index).toMatch(/@utility shadow-overlay\s*\{\s*box-shadow: var\(--shadow-overlay\);/)
    expect(theme).not.toMatch(/--shadow-overlay/)
  })
})

describe('la celebración', () => {
  it('el sello se anuda una sola vez: 900ms con ease-knot, sin repetirse', () => {
    const theme = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--animate-seal:\s*([^;]+);/.exec(theme)?.[1]).toBe('seal 900ms cubic-bezier(0.34, 1.4, 0.64, 1) both')
    expect(index).toMatch(/@keyframes seal\s*\{\s*from\s*\{\s*transform: scale\(0\.4\) rotate\(-30deg\);\s*opacity: 0;\s*\}\s*\}/)
  })

  it('el maíz de Quipu ya no existe: ni token ni utilidad', () => {
    expect(index).not.toMatch(/maiz/)
  })
})

describe('la impresión', () => {
  it('el certificado se imprime en un A4 apaisado sin márgenes de página: los pone el propio documento', () => {
    const print = /@media print\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(print).toMatch(/@page\s*\{\s*size: A4 landscape;\s*margin: 0;\s*\}/)
  })
})
