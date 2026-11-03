import { coreModule, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { administrationModule, ADMINISTRATION_MODULE_ID } from './module'

describe('administrationModule', () => {
  const module = administrationModule()

  it('su única pantalla es publicar los términos: la entrada a la sección lleva a la de objetos de core', () => {
    expect((module.routes ?? []).map((route) => route.id)).toEqual(['terms'])
    const registry = createRegistry([coreModule, module])
    const platform = registry.navGroups.find((group) => group.id === 'platform')
    expect(platform?.items.map((item) => [item.labelKey, item.to])).toEqual([[`${ADMINISTRATION_MODULE_ID}:nav.entry`, '/data/objects']])
  })

  it('la entrada se ve solo con permiso, nunca por un nombre de rol', () => {
    const visible = module.nav?.[0]?.visible
    expect(visible?.({ admin: true, objects: {} })).toBe(true)
    expect(visible?.({ admin: false, capabilities: ['MANAGE_ORGANIZATION'], objects: {} })).toBe(true)
    expect(visible?.({ admin: false, capabilities: [], objects: { version_curso: ['CREATE'] } })).toBe(false)
    expect(visible?.(null)).toBe(false)
  })

  it('publicar los términos se ve solo con permiso, nunca por un nombre de rol', () => {
    const entry = module.nav?.find((item) => item.route === 'terms')
    expect(entry?.group).toBe('administration')
    expect(entry?.visible?.({ admin: true, objects: {} })).toBe(true)
    expect(entry?.visible?.({ admin: false, capabilities: ['MANAGE_ORGANIZATION'], objects: {} })).toBe(true)
    expect(entry?.visible?.({ admin: false, capabilities: ['MANAGE_METADATA'], objects: { terminos: ['CREATE'] } })).toBe(false)
    expect(entry?.visible?.(null)).toBe(false)
  })

  it('va tras los grupos del LMS', () => {
    expect(module.navGroups?.[0]?.order).toBe(9)
  })

  it('tiene los mismos textos en español e inglés', () => {
    const { es, en } = module.i18n!
    expect(Object.keys(en!)).toEqual(Object.keys(es!))
    expect(en?.nav).toEqual({ group: 'Platform', entry: 'Administration' })
    expect(es?.nav).toEqual({ group: 'Plataforma', entry: 'Administración' })
  })
})
