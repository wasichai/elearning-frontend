import type { WasichaiModule } from '@wasichai/core'
import { reviewMessages } from './i18n'
import { canReview } from './permissions'
import { REVIEW_MODULE_ID } from './routes'

export { REVIEW_MODULE_ID, REVIEW_ROUTES } from './routes'
export { canPublish, canReview } from './permissions'

// la bandeja del revisor (ADR-0018 del backend): lo que espera revisión, comentarios por sección, decisiones y publicar
export function reviewModule(): WasichaiModule {
  return {
    id: REVIEW_MODULE_ID,
    routes: [
      { id: 'inbox', path: 'revision', chrome: 'shell', lazy: () => import('./InboxPage').then((m) => ({ default: m.InboxPage })) },
      {
        id: 'version',
        path: 'revision/:versionId',
        chrome: 'shell',
        lazy: () => import('./VersionReviewPage').then((m) => ({ default: m.VersionReviewPage }))
      }
    ],
    // tras «Docencia» (6) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'review', labelKey: `${REVIEW_MODULE_ID}:nav.group`, order: 8 }],
    nav: [{ group: 'review', labelKey: `${REVIEW_MODULE_ID}:nav.inbox`, order: 10, route: 'inbox', visible: canReview }],
    i18n: reviewMessages
  }
}
