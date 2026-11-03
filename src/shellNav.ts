import { CORE_MODULE_ID, CORE_ROUTE_PATHS, type CallerPermissions, type ResolvedNavItem, type ShellNav } from '@wasichai/core'
import { matchPath } from 'react-router'

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

// core nombra cada entrada `<módulo>:<clave>` (lo vigila shellNav.test.ts con el registro de verdad)
const isCoreItem = (item: ResolvedNavItem) => item.key.startsWith(`${CORE_MODULE_ID}:`)

// en la sección, solo lo de core; fuera de ella, todo menos lo de core. «Inicio» no pasa por aquí: lo pone el shell siempre.
// la entrada a la sección y lo demás del LMS siguen con su `visible`, que core aplica después de esta función
export const shellNav: ShellNav = (groups, { pathname, permissions }) => {
  const inSection = canAdminister(permissions) && isCoreRoute(pathname)
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => isCoreItem(item) === inSection) })).filter((group) => group.items.length > 0)
}
