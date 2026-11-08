import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLOFON_STYLED_THEMES } from './themes'

// la hoja de controles del tema Colofón (colofon-controls.css): objetivos de 44px y campos de 16px sobre los componentes de
// @wasichai/ui. como las hojas de tema de wasichai-ui (themes/antDesign.test.ts): cada regla vive en el scope de los dos
// temas Colofón, sin entrar en un subárbol con otro tema, y solo toca los data-slot públicos del README de @wasichai/ui

const read = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8')
const css = read('colofon-controls.css')
const colofon = read('colofon.css')

// los dos temas del selector y el modo lectura de la lección
const ANY = `:is(${COLOFON_STYLED_THEMES.map((id) => `[data-theme='${id}']`).join(', ')})`
const SCOPE = `@scope (${ANY}) to ([data-theme]:not(${ANY}))`

// los hooks públicos que esta hoja puede tocar (README de @wasichai/ui, «Styling hooks»)
// y el de los estados de consulta de @wasichai/core (su README, «Query states»)
const SLOTS = ['button', 'input', 'textarea', 'select-trigger', 'tabs-trigger', 'alert', 'table-head', 'nav-item', 'query-state']
const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['sm', 'md', 'icon']

const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '')

// los bloques más externos (un @scope, un @layer): preludio y cuerpo
function blocks(text: string): { prelude: string; body: string }[] {
  const clean = uncommented(text)
  const found: { prelude: string; body: string }[] = []
  let depth = 0
  let start = 0
  let open = 0
  for (let index = 0; index < clean.length; index++) {
    if (clean[index] === '{' && depth++ === 0) open = index
    else if (clean[index] === '}' && --depth === 0) {
      found.push({ prelude: clean.slice(start, open).trim().replace(/\s+/g, ' '), body: clean.slice(open + 1, index) })
      start = index + 1
    }
  }
  return found
}

// una lista de selectores por sus comas de primer nivel (no las de :is(…))
function splitTop(list: string): string[] {
  const parts = ['']
  let depth = 0
  for (const char of list) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0
    if (char === ',' && depth === 0) parts.push('')
    else parts[parts.length - 1] += char
  }
  return parts.map((part) => part.trim().replace(/\s+/g, ' '))
}

// las reglas más internas de un cuerpo: sus selectores y sus declaraciones
function rules(body: string): { selectors: string[]; declarations: Map<string, string> }[] {
  return [...uncommented(body).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, declarations]) => ({
    selectors: splitTop(selectors!),
    declarations: new Map(
      declarations!.split(';').flatMap((declaration) => {
        const colon = declaration.indexOf(':')
        return colon < 0
          ? []
          : [
              [
                declaration.slice(0, colon).trim(),
                declaration
                  .slice(colon + 1)
                  .trim()
                  .replace(/\s+/g, ' ')
              ] as const
            ]
      })
    )
  }))
}

// las declaraciones sin capa (ganan a las utilidades de Tailwind) y las de @layer base (las pisa cualquier clase)
const unlayered = blocks(css)
  .filter((block) => block.prelude === SCOPE)
  .map((block) => block.body)
  .join('\n')
const base = blocks(css)
  .filter((block) => block.prelude === '@layer base')
  .flatMap((block) => blocks(block.body).filter((inner) => inner.prelude === SCOPE))
  .map((inner) => inner.body)
  .join('\n')

// lo que declara una regla de selector exacto, en la capa dada
function declared(selector: string, layer: string = unlayered): Map<string, string> {
  const found = rules(layer).filter((rule) => rule.selectors.includes(selector))
  if (found.length === 0) throw new Error(`ninguna regla para ${selector}`)
  return new Map(found.flatMap((rule) => [...rule.declarations]))
}

const FIELDS = ":is([data-slot='input'], [data-slot='textarea'], [data-slot='select-trigger'])"

describe('colofon-controls.css', () => {
  it('se importa después de los tokens del tema', () => {
    const index = readFileSync(join(import.meta.dirname, '../index.css'), 'utf8')
    expect(index.indexOf("@import './theme/colofon-controls.css';")).toBeGreaterThan(index.indexOf("@import './theme/colofon.css';"))
  })

  it('cada regla está en el scope de los temas Colofón, sin capa o en la capa base, y nunca entra en otro tema', () => {
    const found = blocks(css)
    expect(found.length).toBeGreaterThan(0)
    for (const { prelude, body } of found) {
      expect([SCOPE, '@layer base'], prelude).toContain(prelude)
      if (prelude === '@layer base') expect(blocks(body).map((inner) => inner.prelude)).toEqual([SCOPE])
    }
  })

  it('cada regla se engancha a un data-slot público', () => {
    const selectors = rules(unlayered + base).flatMap((rule) => rule.selectors)
    expect(selectors.length).toBeGreaterThan(5)
    expect(selectors.filter((selector) => !selector.includes('[data-slot='))).toEqual([])
    const values = (attribute: string) => [...css.matchAll(new RegExp(`\\[${attribute}='([^']+)'\\]`, 'g'))].map(([, value]) => value)
    for (const [, name] of css.matchAll(/\[(data-[a-z-]+)/g))
      expect(['data-theme', 'data-slot', 'data-variant', 'data-size', 'data-state'], name).toContain(name)
    for (const slot of values('data-slot')) expect(SLOTS, slot).toContain(slot)
    for (const variant of values('data-variant')) expect(VARIANTS, variant).toContain(variant)
    for (const size of values('data-size')) expect(SIZES, size).toContain(size)
    // data-state, solo el de los estados de consulta de core
    for (const state of values('data-state')) expect(['empty'], state).toContain(state)
  })

  it('no tiene colores propios: solo tokens que ponen los dos temas Colofón', () => {
    const code = uncommented(css)
    expect(code.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi)).toBeNull()
    const used = [...new Set([...code.matchAll(/var\((--[a-z-]+)\)/g)].map(([, name]) => name!))]
    expect(used.length).toBeGreaterThan(0)
    for (const id of COLOFON_STYLED_THEMES) {
      const start = colofon.indexOf(`[data-theme='${id}'] {`)
      const block = colofon.slice(start, colofon.indexOf('}', start))
      expect(
        used.filter((name) => !block.includes(`${name}:`)),
        id
      ).toEqual([])
    }
  })

  it('los botones md e icon miden 44px, con texto de 15px/600 y radio --radius', () => {
    expect(declared("[data-slot='button']").get('font-size')).toBe('15px')
    expect(declared("[data-slot='button']").get('font-weight')).toBe('600')
    expect(declared("[data-slot='button']").get('border-radius')).toBe('var(--radius)')
    expect(declared("[data-slot='button'][data-size='md']").get('height')).toBe('44px')
    const icon = declared("[data-slot='button'][data-size='icon']")
    expect([icon.get('height'), icon.get('width')]).toEqual(['44px', '44px'])
  })

  it('el botón de texto (ghost) es un enlace: link y subrayado', () => {
    const ghost = declared("[data-slot='button'][data-variant='ghost']")
    expect([ghost.get('color'), ghost.get('text-decoration')]).toEqual(['var(--link)', 'underline'])
  })

  it('una herramienta de barra (ghost en role=toolbar) es un control, no un enlace: tinta, sin subrayado; pulsada, en brand-soft', () => {
    const tool = declared("[role='toolbar'] [data-slot='button'][data-variant='ghost']")
    expect([tool.get('color'), tool.get('text-decoration')]).toEqual(['var(--ink)', 'none'])
    expect(declared("[role='toolbar'] [data-slot='button'][data-variant='ghost']:hover:not(:disabled)").get('background-color')).toBe('var(--table-head)')
    const pressed = declared("[role='toolbar'] [data-slot='button'][data-variant='ghost'][aria-pressed='true']")
    expect([pressed.get('background-color'), pressed.get('color'), pressed.get('box-shadow')]).toEqual([
      'var(--brand-soft)',
      'var(--brand)',
      'inset 0 0 0 1px var(--border)'
    ])
  })

  it('el botón sm mide 36px y su área táctil llega a 44px', () => {
    expect(declared("[data-slot='button'][data-size='sm']").get('height')).toBe('36px')
    const area = declared("[data-slot='button'][data-size='sm']::after")
    expect(area.get('content')).toBe("''")
    expect(area.get('position')).toBe('absolute')
    // 44px exactos, centrados en el botón: un inset se mediría desde la caja de relleno y un botón con borde se quedaría en 42px
    expect(area.get('height')).toBe('44px')
    expect(area.get('width')).toBe('max(100% + 8px, 44px)')
    expect([area.get('top'), area.get('left'), area.get('transform')]).toEqual(['50%', '50%', 'translate(-50%, -50%)'])
    expect(area.has('inset')).toBe(false)
    // el ::after se coloca respecto del botón; en la capa base, para que una clase de quien lo usa (absolute) gane
    expect(declared("[data-slot='button'][data-size='sm']", base).get('position')).toBe('relative')
  })

  it('un botón deshabilitado enseña el cursor not-allowed', () => {
    const disabled = declared("[data-slot='button']:disabled")
    expect(disabled.get('cursor')).toBe('not-allowed')
    // la librería apaga los eventos del puntero al deshabilitar, y eso esconde el cursor
    expect(disabled.get('pointer-events')).toBe('auto')
    // y se distingue sin color: relleno de filete y texto apagado
    const muted = declared("[data-slot='button']:disabled:not([data-variant='ghost'])")
    expect([muted.get('background-color'), muted.get('color')]).toEqual(['var(--border)', 'var(--ink-muted)'])
  })

  it('los campos miden 44px y escriben a 16px', () => {
    expect(declared(FIELDS).get('font-size')).toBe('16px')
    expect(declared(FIELDS).get('border-radius')).toBe('var(--radius)')
    expect(declared(":is([data-slot='input'], [data-slot='select-trigger'])").get('height')).toBe('44px')
    expect(declared("[data-slot='textarea']").get('min-height')).toBe('44px')
    expect(declared(`${FIELDS}:disabled`).get('cursor')).toBe('not-allowed')
  })

  it('un campo inválido lleva un borde danger de 2px sin saltar: ni el borde ni el relleno cambian de tamaño', () => {
    const invalid = declared(`${FIELDS}[aria-invalid='true']`)
    expect(invalid.get('border-color')).toBe('var(--danger)')
    expect(invalid.get('box-shadow')).toBe('inset 0 0 0 1px var(--danger)')
    expect([...invalid.keys()].filter((name) => /^(border-width|border|padding.*|height)$/.test(name))).toEqual([])
  })

  it('las pestañas miden 44px, subrayan 2px y la elegida se subraya en brand con tinta y más peso', () => {
    const tab = declared("[data-slot='tabs-trigger']")
    expect([tab.get('min-height'), tab.get('border-bottom-width')]).toEqual(['44px', '2px'])
    const selected = declared("[data-slot='tabs-trigger'][aria-selected='true']")
    expect([selected.get('border-bottom-color'), selected.get('color'), selected.get('font-weight')]).toEqual(['var(--brand)', 'var(--ink)', '650'])
  })

  it('los encabezados de tabla van en versalitas, como los metadatos', () => {
    const head = declared("[data-slot='table-head']")
    expect([head.get('text-transform'), head.get('font-variant-caps'), head.get('letter-spacing'), head.get('font-size')]).toEqual([
      'none',
      'all-small-caps',
      '0.06em',
      '15px'
    ])
    // solo los de columna fijan el peso: el de un encabezado de fila lo decide quien lo usa
    expect(head.has('font-weight')).toBe(false)
    expect(declared("[data-slot='table-head'][scope='col']").get('font-weight')).toBe('600')
  })

  it('los ítems del menú miden 44px como mínimo', () => {
    expect(declared("[data-slot='nav-item']").get('min-height')).toBe('44px')
  })

  it('el ítem actual no depende solo del color: brand-soft, un filete de tinta de 2px y un peso mayor, sin cambiar de tamaño', () => {
    const current = declared("[data-slot='nav-item'][aria-current='page']")
    expect(current.get('background-color')).toBe('var(--brand-soft)')
    expect(current.get('font-weight')).toBe('650')
    expect(current.get('box-shadow')).toBe('inset 2px 0 0 var(--ink)')
    expect([...current.keys()].filter((name) => /^(border.*|padding.*|height|min-height)$/.test(name))).toEqual([])
  })

  it('el icono de un estado vacío se ve: 40px en ink-muted, no el gris de borde de core', () => {
    const icon = declared("[data-slot='query-state'][data-state='empty'] > svg")
    expect(icon.get('width')).toBe('40px')
    expect(icon.get('height')).toBe('40px')
    expect(icon.get('color')).toBe('var(--ink-muted)')
  })

  it('las alertas redondean con radius-lg', () => {
    expect(declared("[data-slot='alert']").get('border-radius')).toBe('var(--radius-lg)')
  })
})
