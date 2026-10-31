import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { canPublish, canReview, REVIEW_ROUTES, reviewModule } from './module'

describe('reviewModule', () => {
  it('lo acepta createRegistry junto a coreModule, con sus rutas dentro del shell', () => {
    const registry = createRegistry([coreModule, reviewModule()])

    expect(registry.routes.filter((route) => route.moduleId === 'review').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: REVIEW_ROUTES.inbox, path: '/revision', chrome: 'shell' },
      { key: REVIEW_ROUTES.version, path: '/revision/:versionId', chrome: 'shell' }
    ])
  })

  it('pone «Bandeja de revisión» en su grupo, visible solo con APROBAR sobre version_curso o administrando', () => {
    const registry = createRegistry([coreModule, reviewModule()])
    const group = registry.navGroups.find((candidate) => candidate.id === 'review')
    const item = group?.items[0]

    expect(group).toMatchObject({ labelKey: 'review:nav.group' })
    expect(item).toMatchObject({ labelKey: 'review:nav.inbox', to: '/revision' })
    // por permisos, nunca por nombre de rol: un creador (sin APROBAR) no lo ve; un revisor o un administrador, sí
    expect(item?.visible?.({ admin: false, objects: { version_curso: ['READ', 'CREATE', 'UPDATE'] } })).toBe(false)
    expect(item?.visible?.({ admin: false, objects: { version_curso: ['READ', 'APROBAR'] } })).toBe(true)
    expect(item?.visible?.({ admin: true, objects: {} })).toBe(true)
    expect(item?.visible?.(null)).toBe(false)
  })

  it('publicar se ofrece solo con PUBLICAR', () => {
    expect(canPublish({ admin: false, objects: { version_curso: ['READ', 'APROBAR'] } })).toBe(false)
    expect(canPublish({ admin: false, objects: { version_curso: ['PUBLICAR'] } })).toBe(true)
    expect(canPublish({ admin: true, objects: {} })).toBe(true)
    expect(canPublish(null)).toBe(false)
    expect(canReview({ admin: false, objects: {} })).toBe(false)
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, reviewModule()]))

    expect(links.to(REVIEW_ROUTES.inbox)).toBe('/revision')
    expect(links.to(REVIEW_ROUTES.version, { versionId: 'ver-1' })).toBe('/revision/ver-1')
  })

  it('carga sus páginas bajo demanda y trae sus textos', async () => {
    const module = reviewModule()

    for (const route of module.routes ?? []) {
      expect(route.component).toBeUndefined()
      expect((await route.lazy!()).default).toBeTypeOf('function')
    }
    expect(Object.keys(module.i18n ?? {})).toEqual(['es', 'en'])
  })
})
