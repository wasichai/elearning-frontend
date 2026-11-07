import type { Page } from '@playwright/test'
import { administrator, authority, creator, reviewer, student, teacher, type Scenario } from '../scenario'

// el menú del shell con y sin permiso, dentro y fuera de las rutas de core (issue #141)
const LESSON = '/data/objects/leccion/records/l-1'

// en móvil el menú es un cajón: se abre para verlo. en escritorio el botón no está
const openDrawer = async (page: Page) => {
  const button = page.getByRole('button', { name: 'Abrir el menú' })
  if (!(await button.isVisible())) return
  await button.click()
  // el cajón entra con una transición: se captura ya quieto
  const home = page.getByRole('link', { name: 'Inicio', exact: true })
  await home.waitFor()
  await page.waitForTimeout(400)
}

export const shellScenarios: Scenario[] = [
  // lo primero que ve cualquiera: la marca Quipu sobre el formulario (#181)
  { name: 'login', path: '/login' },
  // / lleva a «Mis cursos»: «Inicio» e «Mis cursos» son la misma ruta
  { name: 'shell-student-home', path: '/', api: student },
  { name: 'shell-student', path: '/mis-cursos', api: student, act: openDrawer },
  { name: 'shell-student-core', path: '/admin/users', api: student, act: openDrawer },
  { name: 'shell-teacher', path: '/docencia', api: teacher, act: openDrawer },
  { name: 'shell-creator', path: '/estudio', api: creator, act: openDrawer },
  { name: 'shell-creator-core', path: LESSON, api: creator, act: openDrawer },
  // la autoridad no tiene sección del LMS: el panel de core, con su menú; el catálogo público le ofrece «Inicio»
  { name: 'shell-authority-home', path: '/', api: authority, act: openDrawer },
  { name: 'shell-authority-home-closed', path: '/', api: authority },
  { name: 'shell-authority-catalog', path: '/cursos', api: authority },
  { name: 'shell-reviewer', path: '/revision', api: reviewer, act: openDrawer },
  { name: 'shell-admin', path: '/mis-cursos', api: administrator, act: openDrawer },
  { name: 'shell-admin-home', path: '/', api: administrator, act: openDrawer },
  { name: 'shell-admin-core', path: '/data/objects', api: administrator, act: openDrawer },
  // la pantalla de core con el cajón cerrado
  { name: 'shell-admin-core-closed', path: '/data/objects', api: administrator },
  { name: 'shell-admin-users', path: '/admin/users', api: administrator, act: openDrawer },
  { name: 'shell-admin-record', path: LESSON, api: administrator, act: openDrawer },
  { name: 'shell-admin-home-closed', path: '/', api: administrator },
  // sin saber qué puede la persona no se ofrece la sección; en /, core abre su panel
  { name: 'shell-student-home-permissions-error', path: '/', api: { ...student, permissionsFail: true } },
  { name: 'shell-admin-permissions-error', path: '/mis-cursos', api: { ...administrator, permissionsFail: true }, act: openDrawer },
  { name: 'shell-admin-permissions-error-core', path: '/admin/users', api: { ...administrator, permissionsFail: true }, act: openDrawer }
]
