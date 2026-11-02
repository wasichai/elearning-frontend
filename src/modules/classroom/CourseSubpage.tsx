import type { ReactNode } from 'react'
import { ScreenBody } from '../../shared/Screen'
import type { Classroom } from './contract'
import { CourseHeader, CourseQuery } from './CourseFrame'

// una sección de una matrícula que no es el temario (sesiones, finalización), dentro del marco del curso. la pestaña activa ya la nombra a
// la vista; subtitle es su encabezado para quien navega por títulos
export function CourseSubpage({ subtitle, children }: { subtitle: string; children: (classroom: Classroom) => ReactNode }) {
  return (
    <CourseQuery>
      {(classroom) => (
        <>
          <CourseHeader classroom={classroom} />
          <ScreenBody width="wide">
            <div className="flex max-w-3xl min-w-0 flex-col gap-6">
              <h2 className="sr-only">{subtitle}</h2>
              {children(classroom)}
            </div>
          </ScreenBody>
        </>
      )}
    </CourseQuery>
  )
}
