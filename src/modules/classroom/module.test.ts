import { coreModule, createLinks, createRegistry } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { CLASSROOM_ROUTES, classroomModule } from './module'

describe('classroomModule', () => {
  it('lo acepta createRegistry junto a coreModule, con sus rutas dentro del shell', () => {
    const registry = createRegistry([coreModule, classroomModule()])

    expect(registry.routes.filter((route) => route.moduleId === 'classroom').map(({ key, path, chrome }) => ({ key, path, chrome }))).toEqual([
      { key: CLASSROOM_ROUTES.enrollments, path: '/mis-cursos', chrome: 'shell' },
      { key: CLASSROOM_ROUTES.classroom, path: '/mis-cursos/:enrollmentId', chrome: 'shell' },
      { key: CLASSROOM_ROUTES.sessions, path: '/mis-cursos/:enrollmentId/sesiones', chrome: 'shell' },
      { key: CLASSROOM_ROUTES.completion, path: '/mis-cursos/:enrollmentId/finalizacion', chrome: 'shell' },
      // la verificación del certificado es pública, como el catálogo
      { key: CLASSROOM_ROUTES.verify, path: '/certificados', chrome: 'public' },
      { key: CLASSROOM_ROUTES.certificate, path: '/certificados/:code', chrome: 'public' }
    ])
  })

  it('pone «Mis cursos» en su propio grupo del menú, antes que los de core, para quien puede leer sus matrículas', () => {
    const registry = createRegistry([coreModule, classroomModule()])
    const learning = registry.navGroups.find((group) => group.id === 'learning')

    expect(registry.navGroups[0]?.id).toBe('learning')
    expect(learning).toMatchObject({ labelKey: 'classroom:nav.group' })
    expect(learning?.items).toHaveLength(1)
    expect(learning?.items[0]).toMatchObject({ labelKey: 'classroom:nav.myCourses', to: '/mis-cursos', disabled: false })
    // cortesía: el servidor responde 403 a GET /lms/classroom/enrollments sin matricula: READ
    const visible = learning?.items[0]?.visible
    expect(visible?.({ admin: false, objects: { matricula: ['READ'] } })).toBe(true)
    expect(visible?.({ admin: true, objects: {} })).toBe(true)
    expect(visible?.({ admin: false, objects: { curso: ['READ'] } })).toBe(false)
    // sin saber aún los permisos (cargando o con error) se ofrece: la página explica un 403
    expect(visible?.(null)).toBe(true)
  })

  it('los enlaces se construyen por clave de ruta', () => {
    const links = createLinks(createRegistry([coreModule, classroomModule()]))

    expect(links.to(CLASSROOM_ROUTES.enrollments)).toBe('/mis-cursos')
    expect(links.to(CLASSROOM_ROUTES.classroom, { enrollmentId: 'mat-1' }, { leccion: 'lec-2' })).toBe('/mis-cursos/mat-1?leccion=lec-2')
    expect(links.to(CLASSROOM_ROUTES.certificate, { code: 'K7Q2-M9XW-4RTB' })).toBe('/certificados/K7Q2-M9XW-4RTB')
  })

  it('carga sus páginas bajo demanda y trae sus textos', async () => {
    const module = classroomModule()

    for (const route of module.routes ?? []) {
      expect(route.component).toBeUndefined()
      expect((await route.lazy!()).default).toBeTypeOf('function')
    }
    expect(Object.keys(module.i18n ?? {})).toEqual(['es', 'en'])
  })
})
