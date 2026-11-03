import { Settings } from 'lucide-react'
import type { WasichaiModule } from '@wasichai/core'
import { canAdminister } from '../../shellNav'
import { administrationMessages } from './i18n'

export const ADMINISTRATION_MODULE_ID = 'administration'

// la entrada a la sección de administración: no trae pantallas, las de Wasichai son de core y no se reimplementan.
// el menú de la sección lo decide shellNav (src/shellNav.ts)
export function administrationModule(): WasichaiModule {
  return {
    id: ADMINISTRATION_MODULE_ID,
    // tras «Revisión» (8) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'platform', labelKey: `${ADMINISTRATION_MODULE_ID}:nav.group`, order: 9 }],
    nav: [{ group: 'platform', labelKey: `${ADMINISTRATION_MODULE_ID}:nav.entry`, order: 10, route: 'core:objects', visible: canAdminister, icon: Settings }],
    i18n: administrationMessages
  }
}
