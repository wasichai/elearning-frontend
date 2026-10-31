import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { canAuthor, canImport, STUDIO_ROUTES, studioModule } from './module'

describe('studioModule', () => {
  it('lo acepta createRegistry junto a coreModule, con sus rutas dentro del shell', () => {
    const registry = createRegistry([coreModule, studioModule()])

    expect(registry.routes.filter((route) => route.moduleId === 'studio').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: STUDIO_ROUTES.versions, path: '/estudio', chrome: 'shell' },
      { key: STUDIO_ROUTES.version, path: '/estudio/versiones/:id', chrome: 'shell' },
      { key: STUDIO_ROUTES.import, path: '/estudio/importar', chrome: 'shell' }
    ])
  })

  it('pone «Mis versiones» en el grupo «Contenido», visible solo para quien puede crear versiones o administra', () => {
    const registry = createRegistry([coreModule, studioModule()])
    const studio = registry.navGroups.find((group) => group.id === 'studio')
    const item = studio?.items[0]

    expect(studio).toMatchObject({ labelKey: 'studio:nav.group' })
    expect(item).toMatchObject({ labelKey: 'studio:nav.versions', to: '/estudio' })
    // por permisos, nunca por nombre de rol: quien solo lee versiones (estudiante, docente, revisor) no lo ve
    expect(item?.visible?.({ admin: false, objects: { version_curso: ['READ', 'VER_TODAS'] } })).toBe(false)
    expect(item?.visible?.({ admin: false, objects: { version_curso: ['READ', 'UPDATE', 'APROBAR'] } })).toBe(false)
    expect(item?.visible?.({ admin: false, objects: { version_curso: ['READ', 'CREATE', 'UPDATE', 'ENVIAR_A_REVISION'] } })).toBe(true)
    expect(item?.visible?.({ admin: true, objects: {} })).toBe(true)
    expect(item?.visible?.(null)).toBe(false)
    expect(canAuthor({ admin: false, objects: {} })).toBe(false)
  })

  it('el enlace a la importación es para quien puede crear versiones, unidades y lecciones, o administra', () => {
    // por permisos, nunca por nombre de rol; el servidor responde 403 igual
    expect(canImport({ admin: false, objects: { version_curso: ['READ', 'CREATE'], unidad: ['CREATE'], leccion: ['CREATE'] } })).toBe(true)
    expect(canImport({ admin: false, objects: { version_curso: ['READ', 'CREATE'], unidad: ['CREATE'], leccion: ['READ', 'UPDATE'] } })).toBe(false)
    expect(canImport({ admin: false, objects: { unidad: ['CREATE'], leccion: ['CREATE'] } })).toBe(false)
    expect(canImport({ admin: true, objects: {} })).toBe(true)
    expect(canImport(null)).toBe(false)
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, studioModule()]))

    expect(links.to(STUDIO_ROUTES.versions)).toBe('/estudio')
    expect(links.to(STUDIO_ROUTES.version, { id: 'v-1' })).toBe('/estudio/versiones/v-1')
    expect(links.to(STUDIO_ROUTES.import)).toBe('/estudio/importar')
  })

  it('carga sus páginas bajo demanda y trae sus textos', async () => {
    const module = studioModule()

    for (const route of module.routes ?? []) {
      expect(route.component).toBeUndefined()
      expect((await route.lazy!()).default).toBeTypeOf('function')
    }
    expect(Object.keys(module.i18n ?? {})).toEqual(['es', 'en'])
  })
})
