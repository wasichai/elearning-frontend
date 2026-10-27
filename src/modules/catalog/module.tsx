import type { WasichaiModule } from '@wasichai/core'
import { catalogMessages } from './i18n'
import { CATALOG_MODULE_ID } from './routes'

export { CATALOG_MODULE_ID, CATALOG_ROUTES } from './routes'

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
