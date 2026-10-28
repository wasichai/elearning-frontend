import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { CATALOG_ROUTES, catalogModule } from './module'

describe('catalogModule', () => {
  it('lo acepta createRegistry junto a coreModule', () => {
    const registry = createRegistry([coreModule, catalogModule()])

    expect(registry.routes.filter((route) => route.moduleId === 'catalog').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: CATALOG_ROUTES.courses, path: '/cursos', chrome: 'public' },
      { key: CATALOG_ROUTES.course, path: '/cursos/:slug', chrome: 'public' }
    ])
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, catalogModule()]))

    expect(links.to(CATALOG_ROUTES.courses, {}, { level: 'AVANZADO' })).toBe('/cursos?level=AVANZADO')
    expect(links.to(CATALOG_ROUTES.course, { slug: 'srtm-anuncios' })).toBe('/cursos/srtm-anuncios')
  })

  it('carga sus páginas bajo demanda y trae sus textos', async () => {
    const module = catalogModule()

    for (const route of module.routes ?? []) {
      expect(route.component).toBeUndefined()
      expect((await route.lazy!()).default).toBeTypeOf('function')
    }
    expect(Object.keys(module.i18n ?? {})).toContain('es')
  })
})
