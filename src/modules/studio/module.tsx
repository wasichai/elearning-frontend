import { PenLine } from 'lucide-react'
import type { RecordPanelProps, WasichaiModule } from '@wasichai/core'
import { lazy, Suspense } from 'react'
import { studioMessages } from './i18n'
import { canAuthor } from './permissions'
import { STUDIO_MODULE_ID } from './routes'

export { canAuthor, canImport } from './permissions'
export { STUDIO_MODULE_ID, STUDIO_ROUTES } from './routes'

const LazyFirstDraftPanel = lazy(() => import('./FirstDraftPanel').then((m) => ({ default: m.FirstDraftPanel })))

// core pinta sus paneles en la ficha de cualquier registro: el código del estudio solo se carga en la de un curso
function CourseRecordPanel(props: RecordPanelProps) {
  if (props.objectName !== 'curso') return null
  return (
    <Suspense fallback={null}>
      <LazyFirstDraftPanel {...props} />
    </Suspense>
  )
}

// el estudio del creador (ADR-0018 del backend): sus versiones, una versión nueva por copia o importada de un manual, su
// borrador y el envío a revisión
export function studioModule(): WasichaiModule {
  return {
    id: STUDIO_MODULE_ID,
    routes: [
      { id: 'versions', path: 'estudio', chrome: 'shell', lazy: () => import('./VersionsPage').then((m) => ({ default: m.VersionsPage })) },
      { id: 'version', path: 'estudio/versiones/:id', chrome: 'shell', lazy: () => import('./VersionPage').then((m) => ({ default: m.VersionPage })) },
      { id: 'import', path: 'estudio/importar', chrome: 'shell', lazy: () => import('./ImportPage').then((m) => ({ default: m.ImportPage })) },
      { id: 'newCourse', path: 'estudio/cursos/nuevo', chrome: 'shell', lazy: () => import('./NewCoursePage').then((m) => ({ default: m.NewCoursePage })) },
      {
        id: 'newUnit',
        path: 'estudio/versiones/:id/unidades/nueva',
        chrome: 'shell',
        lazy: () => import('./NewUnitPage').then((m) => ({ default: m.NewUnitPage }))
      }
    ],
    // tras «Docencia» (6) y antes que los grupos de core (datos 10)
    navGroups: [{ id: 'studio', labelKey: `${STUDIO_MODULE_ID}:nav.group`, order: 7 }],
    nav: [{ group: 'studio', labelKey: `${STUDIO_MODULE_ID}:nav.versions`, order: 10, route: 'versions', visible: canAuthor, icon: PenLine }],
    recordPanels: [CourseRecordPanel],
    i18n: studioMessages
  }
}
