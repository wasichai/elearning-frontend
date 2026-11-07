import { CORE_ROUTE_PATHS, coreModule, createRegistry, type CallerPermissions, type ResolvedNavGroup } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { modules } from './modules'
import { canAdminister, homeRoute, isCoreRoute, isSectionRoute, shellNav } from './shellNav'

// los grupos de verdad, los que WasichaiApp pasa a shellNav: si core cambia cómo nombra sus entradas, esto falla aquí
const registry = createRegistry([coreModule, ...modules])
const { navGroups } = registry

const ACCOUNT_OF = {
  estudiante: { admin: false, capabilities: [], objects: { curso: ['READ'], matricula: ['READ', 'CREATE'] } },
  docente: { admin: false, capabilities: [], objects: { curso: ['READ'], docente_edicion: ['READ'], matricula: ['READ', 'CREATE'] } },
  creador: { admin: false, capabilities: [], objects: { curso: ['READ', 'CREATE', 'UPDATE'], version_curso: ['READ', 'CREATE', 'UPDATE'] } },
  revisor: { admin: false, capabilities: [], objects: { curso: ['READ'], version_curso: ['READ', 'UPDATE', 'APROBAR'] } },
  // la cuenta de autoridad de la demo: lee cursos y aprueba créditos, sin matrículas (GET /lms/classroom/enrollments le da 403)
  autoridad: { admin: false, capabilities: [], objects: { curso: ['READ'], version_curso: ['READ', 'UPDATE', 'APROBAR_CREDITOS', 'VER_TODAS'] } }
} satisfies Record<string, CallerPermissions>
const ADMIN: CallerPermissions = { admin: true, capabilities: ['MANAGE_ORGANIZATION'], objects: {} }
const MANAGER: CallerPermissions = { admin: false, capabilities: ['MANAGE_ORGANIZATION'], objects: {} }

const CORE_PATHS = [
  '/data/objects',
  '/data/objects/leccion/records/l-1',
  '/admin/users',
  '/admin/roles',
  '/admin/permissions',
  '/admin/audit',
  '/admin/service-accounts'
]
const LMS_PATHS = ['/', '/mis-cursos', '/estudio', '/estudio/versiones/v-1', '/revision', '/cursos', '/terminos']
const PUBLISH_TERMS = '/administracion/terminos'
const PUBLISH_ENTRY = 'administration:publish.nav'
const SECTION_PATHS = [...CORE_PATHS, PUBLISH_TERMS]

// lo que queda tras shellNav y el filtro de `visible` que core aplica después (AppShell): lo que se ve
function menu(pathname: string, permissions: CallerPermissions | null) {
  const visible = (groups: readonly ResolvedNavGroup[]) =>
    groups.map((group) => ({ ...group, items: group.items.filter((item) => item.visible?.(permissions) ?? true) })).filter((group) => group.items.length > 0)
  const shown = visible(shellNav(navGroups, { pathname, permissions }))
  return { groups: shown.map((group) => group.id), items: shown.flatMap((group) => group.items.map((item) => item.labelKey)) }
}

describe('canAdminister', () => {
  it('lo da admin o la capacidad MANAGE_ORGANIZATION', () => {
    expect(canAdminister(ADMIN)).toBe(true)
    expect(canAdminister({ admin: true, objects: {} })).toBe(true)
    expect(canAdminister(MANAGER)).toBe(true)
  })

  it('no lo da nada más: ni otra capacidad, ni permisos de objeto, ni la falta de permisos', () => {
    expect(canAdminister(null)).toBe(false)
    expect(canAdminister({ admin: false, objects: {} })).toBe(false)
    expect(canAdminister({ admin: false, capabilities: ['MANAGE_METADATA'], objects: {} })).toBe(false)
    for (const permissions of Object.values(ACCOUNT_OF)) expect(canAdminister(permissions)).toBe(false)
  })
})

describe('isCoreRoute', () => {
  it('reconoce cada ruta de core salvo el inicio y el login', () => {
    const { home, login, ...section } = CORE_ROUTE_PATHS
    for (const path of Object.values(section)) expect(isCoreRoute(`/${path.replace(/:[a-z]+/g, 'x-1')}`), path).toBe(true)
    expect(isCoreRoute(`/${home}`)).toBe(false)
    expect(isCoreRoute(`/${login}`)).toBe(false)
  })

  it('no confunde una ruta del LMS ni un prefijo que no es ruta', () => {
    for (const path of [...LMS_PATHS, '/data', '/admin', '/data/objects/leccion/records/l-1/otra', '/administrar/users'])
      expect(isCoreRoute(path), path).toBe(false)
  })
})

describe('isSectionRoute', () => {
  it('son las rutas de core y la de publicar los términos', () => {
    for (const path of SECTION_PATHS) expect(isSectionRoute(path), path).toBe(true)
  })

  it('no lo es el resto del LMS, ni los términos de cada persona, ni lo que cuelgue de publicar', () => {
    for (const path of [...LMS_PATHS, `${PUBLISH_TERMS}/otra`, '/administracion']) expect(isSectionRoute(path), path).toBe(false)
  })
})

describe('shellNav', () => {
  describe.each(Object.entries(ACCOUNT_OF))('sin permiso: %s', (_, permissions) => {
    it.each([...LMS_PATHS, ...SECTION_PATHS])('en %s no ve Datos, Administración ni la entrada', (pathname) => {
      const { groups, items } = menu(pathname, permissions)
      expect(groups).not.toContain('data')
      expect(groups).not.toContain('administration')
      expect(groups).not.toContain('platform')
      expect(items.filter((key) => key.startsWith('nav.') || key.startsWith('administration:'))).toEqual([])
    })
  })

  it('un creador en la lección que abrió desde el estudio mantiene su menú del LMS', () => {
    const creator = ACCOUNT_OF.creador
    expect(menu('/data/objects/leccion/records/l-1', creator)).toEqual(menu('/estudio', creator))
    expect(menu('/data/objects/leccion/records/l-1', creator).items).toContain('studio:nav.versions')
  })

  it('un estudiante que escribe /admin/users mantiene su menú', () => {
    expect(menu('/admin/users', ACCOUNT_OF.estudiante)).toEqual(menu('/mis-cursos', ACCOUNT_OF.estudiante))
  })

  it('un estudiante que escribe la ruta de publicar los términos mantiene su menú, sin la entrada', () => {
    const { items } = menu(PUBLISH_TERMS, ACCOUNT_OF.estudiante)
    expect(menu(PUBLISH_TERMS, ACCOUNT_OF.estudiante)).toEqual(menu('/mis-cursos', ACCOUNT_OF.estudiante))
    expect(items).not.toContain(PUBLISH_ENTRY)
  })

  it.each(Object.entries(ACCOUNT_OF))('%s llega a sus términos y al catálogo desde el menú', (_, permissions) => {
    expect(menu('/mis-cursos', permissions).items).toContain('terms:nav.entry')
    expect(menu('/mis-cursos', permissions).items).toContain('catalog:nav.courses')
  })

  it('«Mis cursos» solo se ofrece a quien puede leer sus matrículas', () => {
    expect(menu('/mis-cursos', ACCOUNT_OF.estudiante).items).toContain('classroom:nav.myCourses')
    expect(menu('/cursos', ACCOUNT_OF.autoridad).items).not.toContain('classroom:nav.myCourses')
    expect(menu('/mis-cursos', ADMIN).items).toContain('classroom:nav.myCourses')
    // administrar la organización no da matrículas: el servidor respondería 403
    expect(menu('/mis-cursos', MANAGER).items).not.toContain('classroom:nav.myCourses')
  })

  describe.each([
    ['admin', ADMIN],
    ['MANAGE_ORGANIZATION', MANAGER]
  ])('con permiso (%s)', (_, permissions) => {
    it.each(LMS_PATHS)('fuera de core, en %s: el LMS y la entrada, sin los grupos de core', (pathname) => {
      const { groups, items } = menu(pathname, permissions)
      expect(groups).toContain('platform')
      expect(groups).not.toContain('data')
      expect(groups).not.toContain('administration')
      expect(items).toContain('administration:nav.entry')
      expect(items).toContain('catalog:nav.courses')
      expect(items).toContain('terms:nav.entry')
      expect(items).not.toContain(PUBLISH_ENTRY)
    })

    it.each(SECTION_PATHS)('en la sección, en %s: solo Datos y Administración, con publicar los términos', (pathname) => {
      const { groups, items } = menu(pathname, permissions)
      expect(groups).toEqual(['data', 'administration'])
      expect(items).not.toContain('administration:nav.entry')
      expect(items).not.toContain('terms:nav.entry')
      expect(items).toContain('nav.objects')
      expect(items).toContain('nav.users')
      expect(items).toContain(PUBLISH_ENTRY)
    })
  })

  describe('con los permisos cargando o con error (null)', () => {
    it.each([...LMS_PATHS, ...SECTION_PATHS])('en %s no se ofrece la sección', (pathname) => {
      const { groups, items } = menu(pathname, null)
      expect(groups).not.toContain('data')
      expect(groups).not.toContain('administration')
      expect(groups).not.toContain('platform')
      expect(items).toContain('classroom:nav.myCourses')
      expect(items).toContain('catalog:nav.courses')
    })
  })

  it('no toca los grupos que recibe', () => {
    const before = navGroups.map((group) => group.items.length)
    shellNav(navGroups, { pathname: '/admin/users', permissions: ADMIN })
    expect(navGroups.map((group) => group.items.length)).toEqual(before)
  })
})

describe('homeRoute', () => {
  const pathOf = (permissions: CallerPermissions) => registry.routes.find((candidate) => candidate.key === homeRoute(permissions))?.path

  // la primera sección del LMS que el servidor le deja abrir, por permiso y nunca por rol: nadie aterriza en un 403
  it.each([
    ['estudiante', '/mis-cursos'],
    ['docente', '/mis-cursos'],
    ['creador', '/estudio'],
    ['revisor', '/revision']
  ] as const)('%s aterriza en %s', (account, path) => {
    expect(pathOf(ACCOUNT_OF[account])).toBe(path)
  })

  it('quien enseña y no tiene matrículas aterriza en su docencia', () => {
    expect(pathOf({ admin: false, objects: { docente_edicion: ['READ'] } })).toBe('/docencia')
  })

  // el catálogo es público, sin shell: no tendría menú ni cierre de sesión
  it('sin ninguna sección del LMS (la autoridad), el panel de core, dentro del shell', () => {
    expect(homeRoute(ACCOUNT_OF.autoridad)).toBeNull()
  })

  it.each([
    ['admin', ADMIN],
    ['MANAGE_ORGANIZATION', MANAGER]
  ])('con permiso (%s) conserva el panel de core', (_, permissions) => {
    expect(homeRoute(permissions)).toBeNull()
  })

  it('una respuesta sin capacidades no da el panel a quien tiene matrículas', () => {
    expect(homeRoute({ admin: false, objects: { matricula: ['READ'] } })).not.toBeNull()
  })
})
