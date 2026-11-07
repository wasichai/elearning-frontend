import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { modules } from '../../modules'
import { learningGroup } from './test/learningGroup'
import { CATALOG_ROUTES, catalogModule } from './module'

describe('catalogModule', () => {
  it('lo acepta createRegistry junto a coreModule', () => {
    const registry = createRegistry([coreModule, catalogModule(), learningGroup])

    expect(registry.routes.filter((route) => route.moduleId === 'catalog').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: CATALOG_ROUTES.courses, path: '/cursos', chrome: 'public' },
      { key: CATALOG_ROUTES.course, path: '/cursos/:slug', chrome: 'public' }
    ])
  })

  // con sesión, el catálogo se abre desde el menú, en «Aprendizaje», justo después de «Mis cursos» y para cualquiera
  it('tiene entrada de menú en «Aprendizaje», tras «Mis cursos» y sin condición', () => {
    const learning = createRegistry([coreModule, ...modules]).navGroups.find((group) => group.id === 'learning')
    const keys = learning?.items.map((item) => item.labelKey)

    expect(keys?.indexOf('catalog:nav.courses')).toBe((keys?.indexOf('classroom:nav.myCourses') ?? -2) + 1)
    const entry = learning?.items.find((item) => item.labelKey === 'catalog:nav.courses')
    expect(entry).toMatchObject({ to: '/cursos', disabled: false })
    expect(entry?.visible).toBeUndefined()
    expect(entry?.icon).toBeDefined()
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, catalogModule(), learningGroup]))

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
