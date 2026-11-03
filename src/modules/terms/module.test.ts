import { coreModule, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { modules } from '../../modules'
import { TERMS_ROUTE } from '../../shared/terms'
import { termsMessages } from './i18n'
import { termsModule, TERMS_MODULE_ID } from './module'

function leaves(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value as object, `${prefix}${key}.`)))
}

describe('termsModule', () => {
  it('su ruta es la clave que usan los demás módulos', () => {
    const registry = createRegistry([coreModule, ...modules])
    expect(`${TERMS_MODULE_ID}:terms`).toBe(TERMS_ROUTE)
    expect(registry.routes.find((route) => route.key === TERMS_ROUTE)?.path).toBe('/terminos')
  })

  it('va con sesión, dentro del shell', () => {
    expect(termsModule().routes?.[0]?.chrome).toBe('shell')
  })

  // el acceso real para retirar: cualquiera con sesión, no solo tras un 403, sin depender de un permiso
  it('tiene entrada de menú en «Aprendizaje», sin condición', () => {
    const entry = termsModule().nav?.[0]
    expect(entry?.group).toBe('learning')
    expect(entry?.route).toBe('terms')
    expect(entry?.visible).toBeUndefined()
  })

  it('tiene los mismos textos en español e inglés', () => {
    expect(leaves(termsMessages.en).sort()).toEqual(leaves(termsMessages.es).sort())
  })
})
