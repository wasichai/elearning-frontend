import type { WasichaiModule } from '@wasichai/core'
import { catalogMessages } from './i18n'

export const CATALOG_MODULE_ID = 'catalog'

// claves de ruta para useWasichaiLinks().to(...)
export const CATALOG_ROUTES = {
  courses: `${CATALOG_MODULE_ID}:courses`,
  course: `${CATALOG_MODULE_ID}:course`
} as const

// el catálogo público: se ve sin sesión (chrome 'public', fuera del AuthGate y del shell).
// sin entrada de menú: el menú del shell es el trabajo con sesión y ningún grupo de core es un catálogo;
// el aula (E8) traerá el grupo de aprendizaje y podrá enlazar aquí por clave de ruta.
export function catalogModule(): WasichaiModule {
  return {
    id: CATALOG_MODULE_ID,
    routes: [
      { id: 'courses', path: 'cursos', chrome: 'public', lazy: () => import('./CatalogPage').then((m) => ({ default: m.CatalogPage })) },
      { id: 'course', path: 'cursos/:slug', chrome: 'public', lazy: () => import('./CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })) }
    ],
    i18n: catalogMessages
  }
}
