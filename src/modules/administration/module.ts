import { ScrollText, Settings } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { canAdminister } from '../../shellNav'
import { administrationMessages } from './i18n'
import { ADMINISTRATION_MODULE_ID, PUBLISH_TERMS_PATH } from './routes'

export { ADMINISTRATION_MODULE_ID } from './routes'

// la entrada a la sección de administración y lo que es del LMS dentro de ella: publicar los términos de uso. las pantallas de Wasichai son de core
// y no se reimplementan. el menú de la sección lo decide shellNav (src/shellNav.ts)
export function administrationModule(): WasichaiModule {
  return {
    id: ADMINISTRATION_MODULE_ID,
    routes: [
      { id: 'terms', path: PUBLISH_TERMS_PATH, chrome: 'shell', lazy: () => import('./PublishTermsPage').then((m) => ({ default: m.PublishTermsPage })) }
    ],
    // tras «Revisión» (8) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'platform', labelKey: `${ADMINISTRATION_MODULE_ID}:nav.group`, order: 9 }],
    nav: [
      { group: 'platform', labelKey: `${ADMINISTRATION_MODULE_ID}:nav.entry`, order: 10, route: 'core:objects', visible: canAdminister, icon: Settings },
      // en el grupo «Administración» de core, tras sus entradas: solo se ve dentro de la sección y con permiso
      { group: 'administration', labelKey: `${ADMINISTRATION_MODULE_ID}:publish.nav`, order: 50, route: 'terms', visible: canAdminister, icon: ScrollText }
    ],
    i18n: administrationMessages
  }
}
