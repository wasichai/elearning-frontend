import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classroomMessages } from '../modules/classroom/i18n'
import { QUIPU_DARK_THEME, QUIPU_SYSTEM_THEMES, QUIPU_THEME, QUIPU_THEMES } from './themes'

// el tema Quipu cumple el contrato de @wasichai/ui (todos los tokens) y WCAG 2.2 AA en sus dos variantes

const quipu = readFileSync(join(import.meta.dirname, 'quipu.css'), 'utf8')
const wasichai = readFileSync(createRequire(import.meta.url).resolve('@wasichai/ui/theme.css'), 'utf8')

// las declaraciones --x: valor del bloque de un selector
function tokens(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`sin bloque ${selector}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return new Map([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]))
}

const resolve = (block: Map<string, string>, name: string): string => {
  const value = block.get(name)
  if (value === undefined) throw new Error(`falta --${name}`)
  const alias = /^var\(--([\w-]+)\)$/.exec(value)
  return alias ? resolve(block, alias[1]!) : value
}

const channels = (hex: string) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255)

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

// un color al alfa dado sobre un fondo, como lo pinta text-shell-muted/70
function over(hex: string, background: string, alpha: number): string {
  const [front, back] = [channels(hex), channels(background)]
  return `#${front
    .map((c, i) =>
      Math.round((alpha * c + (1 - alpha) * back[i]!) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

// texto sobre sus fondos (4,5:1) y marcas que no son texto (3:1, WCAG 1.4.11)
const TEXT: [string, string[]][] = [
  ['ink', ['surface', 'surface-muted', 'surface-raised', 'table-head', 'brand-soft']],
  ['ink-muted', ['surface', 'surface-muted', 'surface-raised', 'table-head']],
  ['placeholder', ['surface']],
  ['brand-strong', ['surface', 'surface-muted', 'brand-soft']],
  ['link', ['surface', 'surface-muted']],
  ['on-brand', ['brand', 'brand-strong']],
  ['on-danger', ['danger']],
  ['danger', ['surface', 'danger-soft']],
  ['success', ['surface', 'success-soft']],
  ['warning', ['surface', 'warning-soft']],
  ['notice', ['surface', 'notice-soft']],
  ['shell-ink', ['shell']],
  ['shell-muted', ['shell']]
]
const MARKS: [string, string[]][] = [
  ['border-control', ['surface', 'surface-muted']],
  ['focus', ['surface', 'surface-muted', 'table-head']]
]

function failing(block: Map<string, string>, pairs: [string, string[]][], min: number): string[] {
  return pairs.flatMap(([front, backs]) =>
    backs.flatMap((back) => {
      const ratio = contrast(resolve(block, front), resolve(block, back))
      return ratio >= min ? [] : [`${front} sobre ${back}: ${ratio.toFixed(2)}`]
    })
  )
}

describe.each(QUIPU_THEMES.map((theme) => [theme.id]))('tema %s', (id) => {
  const block = tokens(quipu, `[data-theme='${id}']`)

  it('pone todos los tokens del tema claro de @wasichai/ui', () => {
    const required = [...tokens(wasichai, "[data-theme='light']").keys()]
    expect(required.length).toBeGreaterThan(20)
    expect(required.filter((name) => !block.has(name))).toEqual([])
  })

  it('el texto llega a 4,5:1 sobre sus fondos', () => {
    expect(failing(block, TEXT, 4.5)).toEqual([])
  })

  it('bordes de campo y anillo de foco llegan a 3:1', () => {
    expect(failing(block, MARKS, 3)).toEqual([])
  })

  it('las etiquetas de grupo del menú (shell-muted al 70 %) siguen en AA', () => {
    const shell = resolve(block, 'shell')
    expect(contrast(over(resolve(block, 'shell-muted'), shell, 0.7), shell)).toBeGreaterThanOrEqual(4.5)
  })

  it('el foco no es la marca', () => {
    expect(resolve(block, 'focus')).not.toBe(resolve(block, 'brand'))
  })
})

describe('definiciones de los temas', () => {
  it('un claro y un oscuro, que el sistema sigue', () => {
    expect([QUIPU_THEME.colorScheme, QUIPU_DARK_THEME.colorScheme]).toEqual(['light', 'dark'])
    expect(QUIPU_SYSTEM_THEMES).toEqual({ light: 'quipu', dark: 'quipu-dark' })
  })

  it('sus etiquetas existen en español e inglés', () => {
    for (const theme of QUIPU_THEMES) {
      const [namespace, path] = theme.label.split(':')
      expect(namespace).toBe('classroom')
      const key = path!.split('.')[1]!
      expect(classroomMessages.es.theme[key as keyof typeof classroomMessages.es.theme]).toBeTruthy()
      expect(classroomMessages.en.theme[key as keyof typeof classroomMessages.en.theme]).toBeTruthy()
    }
  })

  it('cada tema tiene su bloque en quipu.css y en el script de arranque de index.html', () => {
    const html = readFileSync(join(import.meta.dirname, '../../index.html'), 'utf8')
    for (const theme of QUIPU_THEMES) {
      expect(quipu).toContain(`[data-theme='${theme.id}'] {`)
      expect(html).toMatch(new RegExp(`['"]?${theme.id}['"]?: '${theme.colorScheme}'`))
    }
  })
})
