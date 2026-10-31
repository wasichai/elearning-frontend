import type { CallerPermissions, WasichaiModule } from '@wasichai/core'
import { studioMessages } from './i18n'
import { STUDIO_MODULE_ID } from './routes'

export { STUDIO_MODULE_ID, STUDIO_ROUTES } from './routes'

// el menú «Contenido» es cortesía (CLAUDE.md, regla 4): GET /lms/studio/versions devuelve solo las versiones de quien las
// escribió y lo ajeno es 404. se muestra a quien puede crear versiones de curso (version_curso: CREATE) o administra.
// nunca se compara un nombre de rol
export function canAuthor(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.version_curso ?? []).includes('CREATE'))
}

// el estudio del creador (ADR-0018 del backend): sus versiones, una versión nueva por copia, su borrador y el envío a revisión
export function studioModule(): WasichaiModule {
  return {
    id: STUDIO_MODULE_ID,
    routes: [
      { id: 'versions', path: 'estudio', chrome: 'shell', lazy: () => import('./VersionsPage').then((m) => ({ default: m.VersionsPage })) },
      { id: 'version', path: 'estudio/versiones/:id', chrome: 'shell', lazy: () => import('./VersionPage').then((m) => ({ default: m.VersionPage })) }
    ],
    // tras «Docencia» (6) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'studio', labelKey: `${STUDIO_MODULE_ID}:nav.group`, order: 7 }],
    nav: [{ group: 'studio', labelKey: `${STUDIO_MODULE_ID}:nav.versions`, order: 10, route: 'versions', visible: canAuthor }],
    i18n: studioMessages
  }
}
