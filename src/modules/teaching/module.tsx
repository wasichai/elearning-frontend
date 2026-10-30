import type { CallerPermissions, WasichaiModule } from '@wasichai/core'
import { teachingMessages } from './i18n'
import { TEACHING_MODULE_ID } from './routes'

export { TEACHING_MODULE_ID, TEACHING_ROUTES } from './routes'

// el menú «Docencia» es cortesía (CLAUDE.md, regla 4): quien enseña es quien tiene una edición asignada, y eso lo decide
// el servidor (GET /teaching/offerings devuelve solo las suyas; lo ajeno, 404). @wasichai/core 1.3.0 solo deja decidir la
// visibilidad de un menú con los permisos (NavContribution.visible), no con datos, así que se muestra a quien puede leer
// las asignaciones (docente_edicion: READ) o administra; si no tiene ninguna, la página lo dice con un estado vacío claro.
// nunca se compara un nombre de rol
export function canTeach(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.docente_edicion ?? []).includes('READ'))
}

// el espacio docente (ADR-0016 del backend): sus ediciones y sus matriculados, con sesión (chrome 'shell')
export function teachingModule(): WasichaiModule {
  return {
    id: TEACHING_MODULE_ID,
    routes: [
      { id: 'offerings', path: 'docencia', chrome: 'shell', lazy: () => import('./OfferingsPage').then((m) => ({ default: m.OfferingsPage })) },
      { id: 'roster', path: 'docencia/:code', chrome: 'shell', lazy: () => import('./RosterPage').then((m) => ({ default: m.RosterPage })) }
    ],
    // tras «Aprendizaje» (5) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'teaching', labelKey: `${TEACHING_MODULE_ID}:nav.group`, order: 6 }],
    nav: [{ group: 'teaching', labelKey: `${TEACHING_MODULE_ID}:nav.offerings`, order: 10, route: 'offerings', visible: canTeach }],
    i18n: teachingMessages
  }
}
