import type { WasichaiModule } from '@wasichai/core'
import { ScrollText } from 'lucide-react'
import { termsMessages } from './i18n'
import { TERMS_MODULE_ID } from './routes'

export { TERMS_MODULE_ID, TERMS_ROUTES } from './routes'

// los términos de uso de cada persona (ADR-0037 del backend): leerlos, aceptarlos y retirarlos. su entrada va en «Aprendizaje», sin `visible`:
// leerlos y retirarlos es de cualquiera con sesión, y el shell solo se pinta con ella. publicarlos es de administration
export function termsModule(): WasichaiModule {
  return {
    id: TERMS_MODULE_ID,
    routes: [{ id: 'terms', path: 'terminos', chrome: 'shell', lazy: () => import('./TermsPage').then((m) => ({ default: m.TermsPage })) }],
    nav: [{ group: 'learning', labelKey: `${TERMS_MODULE_ID}:nav.entry`, order: 90, route: 'terms', icon: ScrollText }],
    i18n: termsMessages
  }
}
