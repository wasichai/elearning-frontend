import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// las letras del sistema de diseño Quipu, servidas por la app (sin peticiones a terceros) con su licencia SIL OFL:
// Figtree para la interfaz (--font-sans de los temas Quipu) y Literata para leer (--font-read de @theme)

const index = readFileSync(join(import.meta.dirname, '../index.css'), 'utf8')
const fonts = join(import.meta.dirname, 'fonts')

// los @font-face de index.css: familia y archivo
const faces = [...index.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
  family: /font-family:\s*'([^']+)'/.exec(body!)?.[1],
  file: /url\('\.\/theme\/fonts\/([^']+)'\)/.exec(body!)?.[1]
}))

describe('letras de la app', () => {
  it.each(['Figtree', 'Literata'])('%s se sirve desde src/theme/fonts con su licencia OFL', (family) => {
    const own = faces.filter((face) => face.family === family)
    expect(own.length).toBeGreaterThan(0)
    for (const face of own) expect(existsSync(join(fonts, face.file!)), face.file).toBe(true)
    expect(readFileSync(join(fonts, `OFL-${family}.txt`), 'utf8')).toContain('SIL Open Font License, Version 1.1')
  })

  it('--font-read en @theme empieza por Literata, con serifas de respaldo', () => {
    const theme = /@theme\s*\{([^}]*)\}/.exec(index)?.[1] ?? ''
    expect(/--font-read:\s*([^;]+);/.exec(theme)?.[1]).toMatch(/^'Literata', .*serif$/)
  })
})
