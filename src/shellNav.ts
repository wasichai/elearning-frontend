import { CORE_MODULE_ID, CORE_ROUTE_PATHS, type CallerPermissions, type HomeRoute, type ResolvedNavItem, type ShellNav } from '@wasichai/core'
import { matchPath } from 'react-router'
import { PUBLISH_TERMS_PATH } from './modules/administration/routes'
import { CLASSROOM_ROUTES } from './modules/classroom/routes'
import { canReview } from './modules/review/permissions'
import { REVIEW_ROUTES } from './modules/review/routes'
import { canAuthor } from './modules/studio/permissions'
import { STUDIO_ROUTES } from './modules/studio/routes'
import { canTeach } from './modules/teaching/module'
import { TEACHING_ROUTES } from './modules/teaching/routes'
import { canLearn } from './shared/learning'

// la sección de administración es un estado del menú (issue #141, ADR-0005 del backend): una sola app, un solo router y
// ninguna URL nueva. el servidor decide igual (403): esto solo evita ofrecer lo que no le sirve a quien entró

// quién la tiene, según GET /auth/me/permissions. nunca por un nombre de rol. sin permisos (cargando o con error), nadie
export function canAdminister(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.capabilities ?? []).includes('MANAGE_ORGANIZATION'))
}

// el inicio y el login son de core, pero no son administración: el inicio es la vuelta al LMS
const { home: _home, login: _login, ...SECTION_PATHS } = CORE_ROUTE_PATHS
const SECTION_PATTERNS = Object.values(SECTION_PATHS).map((path) => `/${path}`)

export function isCoreRoute(pathname: string): boolean {
  return SECTION_PATTERNS.some((pattern) => matchPath(pattern, pathname) !== null)
}

// la sección son las pantallas de core más la única del LMS que le pertenece: publicar los términos de uso
const PUBLISH_TERMS_TO = `/${PUBLISH_TERMS_PATH}`

export function isSectionRoute(pathname: string): boolean {
  return isCoreRoute(pathname) || matchPath(PUBLISH_TERMS_TO, pathname) !== null
}

// core nombra cada entrada `<módulo>:<clave>` (lo vigila shellNav.test.ts con el registro de verdad)
const isSectionItem = (item: ResolvedNavItem) => item.key.startsWith(`${CORE_MODULE_ID}:`) || item.to === PUBLISH_TERMS_TO

// en la sección, solo lo suyo; fuera de ella, todo lo demás. «Inicio» no pasa por aquí: lo pone el shell siempre.
// la entrada a la sección y lo demás del LMS siguen con su `visible`, que core aplica después de esta función
export const shellNav: ShellNav = (groups, { pathname, permissions }) => {
  const inSection = canAdminister(permissions) && isSectionRoute(pathname)
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => isSectionItem(item) === inSection) })).filter((group) => group.items.length > 0)
}

// el destino de «Inicio» (issue #142): quien administra conserva el panel de core; los demás, la primera sección del LMS
// que el servidor les deja abrir, con los mismos predicados que sus menús. nunca por rol, y nadie aterriza en un 403.
// sin ninguna (una autoridad que solo aprueba créditos), también el panel: queda dentro del shell, con su menú y su
// cierre de sesión, y solo lista lo que la API le deja ver. core solo la llama con los permisos ya en la mano
const HOME_SECTIONS: ReadonlyArray<readonly [(permissions: CallerPermissions | null) => boolean, string]> = [
  [canLearn, CLASSROOM_ROUTES.enrollments],
  [canTeach, TEACHING_ROUTES.offerings],
  [canAuthor, STUDIO_ROUTES.versions],
  [canReview, REVIEW_ROUTES.inbox]
]

export const homeRoute: HomeRoute = (permissions) =>
  canAdminister(permissions) ? null : (HOME_SECTIONS.find(([allowed]) => allowed(permissions))?.[1] ?? null)
