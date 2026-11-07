import { LibraryBig } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { catalogMessages } from './i18n'
import { CATALOG_MODULE_ID } from './routes'

export { CATALOG_MODULE_ID, CATALOG_ROUTES } from './routes'

// el catálogo público: se ve sin sesión (chrome 'public', fuera del AuthGate y del shell).
// con sesión se abre desde el menú, en el grupo «Aprendizaje» que trae el aula (módulo classroom), tras «Mis cursos»:
// es el único camino a matricularse en otro curso. sin condición, como la propia página. la ficha enlaza el aula por clave.
export function catalogModule(): WasichaiModule {
  return {
    id: CATALOG_MODULE_ID,
    routes: [
      { id: 'courses', path: 'cursos', chrome: 'public', lazy: () => import('./CatalogPage').then((m) => ({ default: m.CatalogPage })) },
      { id: 'course', path: 'cursos/:slug', chrome: 'public', lazy: () => import('./CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })) }
    ],
    nav: [{ group: 'learning', labelKey: `${CATALOG_MODULE_ID}:nav.courses`, order: 20, route: 'courses', icon: LibraryBig }],
    i18n: catalogMessages
  }
}
