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

describe('la celebración', () => {
  it('el sello se anuda una sola vez: 900ms con ease-knot, sin repetirse', () => {
    const theme = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--animate-seal:\s*([^;]+);/.exec(theme)?.[1]).toBe('seal 900ms cubic-bezier(0.34, 1.4, 0.64, 1) both')
    expect(index).toMatch(/@keyframes seal\s*\{\s*from\s*\{\s*transform: scale\(0\.4\) rotate\(-30deg\);\s*opacity: 0;\s*\}\s*\}/)
  })

  it('el maíz es un token del tema, con respaldo para los temas de Wasichai', () => {
    const theme = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(index)?.[1] ?? ''
    expect(/--color-maiz:\s*([^;]+);/.exec(theme)?.[1]).toBe('var(--maiz, #d99a1e)')
    expect(/--color-on-maiz:\s*([^;]+);/.exec(theme)?.[1]).toBe('var(--on-maiz, #1e2327)')
  })
})
