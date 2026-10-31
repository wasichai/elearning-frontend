import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { canTeach, TEACHING_ROUTES, teachingModule } from './module'

describe('teachingModule', () => {
  it('lo acepta createRegistry junto a coreModule, con sus rutas dentro del shell', () => {
    const registry = createRegistry([coreModule, teachingModule()])

    expect(registry.routes.filter((route) => route.moduleId === 'teaching').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: TEACHING_ROUTES.offerings, path: '/docencia', chrome: 'shell' },
      { key: TEACHING_ROUTES.roster, path: '/docencia/:code', chrome: 'shell' }
    ])
  })

  it('pone «Mis ediciones» en el grupo «Docencia», visible solo para quien puede leer asignaciones o administra', () => {
    const registry = createRegistry([coreModule, teachingModule()])
    const teaching = registry.navGroups.find((group) => group.id === 'teaching')
    const item = teaching?.items[0]

    expect(teaching).toMatchObject({ labelKey: 'teaching:nav.group' })
    expect(item).toMatchObject({ labelKey: 'teaching:nav.offerings', to: '/docencia' })
    // por permisos, nunca por nombre de rol: un estudiante no lo ve; un docente o un administrador, sí
    expect(item?.visible?.({ admin: false, objects: { curso: ['READ'], matricula: ['READ', 'CREATE'] } })).toBe(false)
    expect(item?.visible?.({ admin: false, objects: { docente_edicion: ['READ'], matricula: ['READ'] } })).toBe(true)
    expect(item?.visible?.({ admin: true, objects: {} })).toBe(true)
    // mientras los permisos no llegan, no se muestra
    expect(item?.visible?.(null)).toBe(false)
    expect(canTeach({ admin: false, objects: { docente_edicion: [] } })).toBe(false)
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, teachingModule()]))

    expect(links.to(TEACHING_ROUTES.offerings)).toBe('/docencia')
    expect(links.to(TEACHING_ROUTES.roster, { code: 'edicion-1' })).toBe('/docencia/edicion-1')
  })

  it('carga sus páginas bajo demanda y trae sus textos', async () => {
    const module = teachingModule()

    for (const route of module.routes ?? []) {
      expect(route.component).toBeUndefined()
      expect((await route.lazy!()).default).toBeTypeOf('function')
    }
    expect(Object.keys(module.i18n ?? {})).toEqual(['es', 'en'])
  })
})
