import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

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

  it('Newsreader conserva el eje opsz en sus archivos', () => {
    for (const face of faces.filter((face) => face.family === 'Newsreader')) expect(face.file).toContain('opsz-wght')
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
    const space = [4, 8, 12, 16, 24, 32, 48, 72, 112].map((px, at) => new RegExp(`--space-${at + 1}:\\s*${px}px;`))
    for (const pattern of space) expect(theme).toMatch(pattern)
    expect(theme).toMatch(/--container-measure:\s*66ch;/)
    expect(theme).toMatch(/--container-index-col:\s*280px;/)
    expect(theme).toMatch(/--container-margin-col:\s*264px;/)
    expect(theme).toMatch(/--container-content-max:\s*1200px;/)
    expect(theme).toMatch(/--shadow-overlay:\s*0 12px 32px rgb\(23 32 43 \/ 16%\);/)
  })
})

describe('la celebración', () => {
  it('el sello se anuda una sola vez: 900ms con ease-knot, sin repetirse', () => {
    const theme = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--animate-seal:\s*([^;]+);/.exec(theme)?.[1]).toBe('seal 900ms cubic-bezier(0.34, 1.4, 0.64, 1) both')
    expect(index).toMatch(/@keyframes seal\s*\{\s*from\s*\{\s*transform: scale\(0\.4\) rotate\(-30deg\);\s*opacity: 0;\s*\}\s*\}/)
  })

  it('el maíz es un token del tema, con respaldo para los temas de Wasichai', () => {
    const theme = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--color-maiz:\s*([^;]+);/.exec(theme)?.[1]).toBe('var(--maiz, var(--warning))')
    expect(/--color-on-maiz:\s*([^;]+);/.exec(theme)?.[1]).toBe('var(--on-maiz, var(--surface))')
  })
})

describe('la impresión', () => {
  it('el certificado se imprime en un A4 apaisado sin márgenes de página: los pone el propio documento', () => {
    const print = /@media print\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(print).toMatch(/@page\s*\{\s*size: A4 landscape;\s*margin: 0;\s*\}/)
  })
})
