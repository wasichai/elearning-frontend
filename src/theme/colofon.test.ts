import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classroomMessages } from '../modules/classroom/i18n'
import { COLOFON_DARK_THEME, COLOFON_READING_THEME, COLOFON_STYLED_THEMES, COLOFON_SYSTEM_THEMES, COLOFON_THEME, COLOFON_THEMES } from './themes'

// el tema Colofón cumple el contrato de @wasichai/ui (todos los tokens) y WCAG 2.2 AA en sus dos variantes y en el modo
// lectura (colofon-lectura, un subárbol de la lección)

const colofon = readFileSync(join(import.meta.dirname, 'colofon.css'), 'utf8')
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
  // temporal: mientras existan los tokens del maíz (tarea 4/5)
  ['on-maiz', ['maiz']],
  ['ink', ['maiz-soft']],
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

describe.each(COLOFON_STYLED_THEMES.map((id) => [id]))('tema %s', (id) => {
  const block = tokens(colofon, `[data-theme='${id}']`)

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

// el sepia de tokens.json: papel y tinta
const LECTURA: Record<string, string> = { surface: '#f2ebdd', ink: '#3a2f22' }

// los valores del tema claro de tokens.json (Foundations §1)
const CLARO: Record<string, string> = {
  brand: '#1f3a64',
  'brand-strong': '#152a4a',
  'brand-soft': '#e3e9f2',
  'on-brand': '#ffffff',
  ink: '#17202b',
  'ink-muted': '#4f5b69',
  link: '#24508c',
  focus: '#2a5db0',
  surface: '#ffffff',
  'surface-muted': '#f4f5f7',
  shell: '#edeff3',
  'table-head': '#eef1f5',
  border: '#d3d8df',
  'border-control': '#7d8794',
  success: '#2d6a45',
  'success-soft': '#e4f0e8',
  warning: '#8a5300',
  'warning-soft': '#f8eed9',
  danger: '#b42318',
  'danger-soft': '#fbe9e7',
  notice: '#2b5e6e',
  'notice-soft': '#e2eef1',
  radius: '3px',
  'radius-card': '4px'
}

// lo que Foundations fija del oscuro; el resto se deriva y lo comprueban los pares AA
const OSCURO: Record<string, string> = {
  'surface-muted': '#0f141b',
  surface: '#161d26',
  ink: '#e4e8ee',
  'ink-muted': '#a6b0bd',
  'border-control': '#6b7686',
  brand: '#a9c1e8',
  'on-brand': '#0f1a2c',
  link: '#9cc0f2',
  success: '#7cc79a',
  warning: '#e3b25c',
  danger: '#f28b82'
}

describe('valores de tokens.json', () => {
  it('el tema claro lleva los valores de las restricciones', () => {
    const block = tokens(colofon, "[data-theme='colofon']")
    expect(Object.fromEntries(Object.keys(CLARO).map((name) => [name, block.get(name)]))).toEqual(CLARO)
  })

  it('el oscuro lleva los que Foundations fija', () => {
    const block = tokens(colofon, "[data-theme='colofon-dark']")
    expect(Object.fromEntries(Object.keys(OSCURO).map((name) => [name, block.get(name)]))).toEqual(OSCURO)
  })
})

describe('modo lectura', () => {
  it('es colofon-lectura, claro, y no se ofrece en el selector de tema', () => {
    expect(COLOFON_READING_THEME).toEqual({ id: 'colofon-lectura', colorScheme: 'light' })
    expect(COLOFON_THEMES.map((theme) => theme.id)).not.toContain(COLOFON_READING_THEME.id)
  })

  it('lleva el papel sepia y la tinta cálida del sistema de diseño', () => {
    const block = tokens(colofon, "[data-theme='colofon-lectura']")
    expect(Object.fromEntries(Object.keys(LECTURA).map((name) => [name, block.get(name)]))).toEqual(LECTURA)
  })

  it('el anillo de foco de Colofón vale también en la lectura', () => {
    const scope = `:is(${COLOFON_STYLED_THEMES.map((id) => `[data-theme='${id}']`).join(', ')}) *:focus-visible`
    expect(colofon).toContain(scope)
  })
})

describe('definiciones de los temas', () => {
  it('un claro y un oscuro, que el sistema sigue', () => {
    expect([COLOFON_THEME.colorScheme, COLOFON_DARK_THEME.colorScheme]).toEqual(['light', 'dark'])
    expect(COLOFON_SYSTEM_THEMES).toEqual({ light: 'colofon', dark: 'colofon-dark' })
  })

  it('sus etiquetas existen en español e inglés', () => {
    for (const theme of COLOFON_THEMES) {
      const [namespace, path] = theme.label.split(':')
      expect(namespace).toBe('classroom')
      const key = path!.split('.')[1]!
      expect(classroomMessages.es.theme[key as keyof typeof classroomMessages.es.theme]).toBeTruthy()
      expect(classroomMessages.en.theme[key as keyof typeof classroomMessages.en.theme]).toBeTruthy()
    }
  })

  it('las etiquetas son Colofón y Colofón oscuro (Colophon y Colophon dark en inglés)', () => {
    expect(classroomMessages.es.theme).toEqual({ colofon: 'Colofón', colofonDark: 'Colofón oscuro' })
    expect(classroomMessages.en.theme).toEqual({ colofon: 'Colophon', colofonDark: 'Colophon dark' })
  })

  it('cada tema tiene su bloque en colofon.css y en el script de arranque de index.html', () => {
    const html = readFileSync(join(import.meta.dirname, '../../index.html'), 'utf8')
    for (const theme of COLOFON_THEMES) {
      expect(colofon).toContain(`[data-theme='${theme.id}'] {`)
      expect(html).toMatch(new RegExp(`['"]?${theme.id}['"]?: '${theme.colorScheme}'`))
    }
  })
})
