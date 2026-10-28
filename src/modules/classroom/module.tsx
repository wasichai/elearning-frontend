import type { WasichaiModule } from '@wasichai/core'
import { classroomMessages } from './i18n'
import { CLASSROOM_MODULE_ID } from './routes'

export { CLASSROOM_MODULE_ID, CLASSROOM_ROUTES } from './routes'

// el aula del estudiante (ADR-0012 y ADR-0016 del backend): sus cursos, su progreso, evaluaciones, sesiones y certificado,
// con sesión (chrome 'shell'); la verificación pública del certificado, sin ella (chrome 'public').
// la entrada de menú no lleva `visible`: el shell solo se pinta con sesión, cualquiera con sesión puede tener matrículas
// y quien no tenga ninguna ve el panel vacío con el camino al catálogo. qué matrículas ve cada uno lo decide el servidor.
export function classroomModule(): WasichaiModule {
  return {
    id: CLASSROOM_MODULE_ID,
    routes: [
      { id: 'enrollments', path: 'mis-cursos', chrome: 'shell', lazy: () => import('./MyCoursesPage').then((m) => ({ default: m.MyCoursesPage })) },
      { id: 'classroom', path: 'mis-cursos/:enrollmentId', chrome: 'shell', lazy: () => import('./ClassroomPage').then((m) => ({ default: m.ClassroomPage })) },
      {
        id: 'sessions',
        path: 'mis-cursos/:enrollmentId/sesiones',
        chrome: 'shell',
        lazy: () => import('./SessionsPage').then((m) => ({ default: m.SessionsPage }))
      },
      {
        id: 'completion',
        path: 'mis-cursos/:enrollmentId/finalizacion',
        chrome: 'shell',
        lazy: () => import('./CompletionPage').then((m) => ({ default: m.CompletionPage }))
      },
      // la verificación de un certificado es pública (como el catálogo): quien lo recibe no tiene cuenta. imprime el certificado
      { id: 'verify', path: 'certificados', chrome: 'public', lazy: () => import('./CertificatePage').then((m) => ({ default: m.VerifyPage })) },
      { id: 'certificate', path: 'certificados/:code', chrome: 'public', lazy: () => import('./CertificatePage').then((m) => ({ default: m.CertificatePage })) }
    ],
    // antes que los grupos de core (datos 10): para un estudiante, aprender es lo primero del menú
    navGroups: [{ id: 'learning', labelKey: `${CLASSROOM_MODULE_ID}:nav.group`, order: 5 }],
    nav: [{ group: 'learning', labelKey: `${CLASSROOM_MODULE_ID}:nav.myCourses`, order: 10, route: 'enrollments' }],
    i18n: classroomMessages
  }
}
