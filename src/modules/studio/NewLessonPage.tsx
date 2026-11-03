import type { Form } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { DraftRecordPage } from './DraftRecordPage'

const LESSON_OBJECT = 'leccion'

// el formulario de core pregunta la unidad con un selector que solo trae cien, de todos los cursos: aquí la unidad es esta y no se
// pregunta, ni la fuente, que la pone la importación. el resto de campos de cada tipo se edita después, en la ficha de la lección
const LESSON_FORM: Form = {
  id: 'studio-new-lesson',
  name: 'studio-new-lesson',
  label: 'studio-new-lesson',
  objectName: LESSON_OBJECT,
  generated: true,
  definition: { sections: [{ title: null, fields: ['orden', 'titulo', 'tipo', 'duracion_minutos', 'resumen'] }] }
}

// una lección nueva de una unidad de un borrador propio, con el orden siguiente propuesto
export function NewLessonPage() {
  const { t } = useTranslation('studio')
  const { unitId = '' } = useParams()
  return (
    <DraftRecordPage
      title={t('newLesson.title')}
      objectName={LESSON_OBJECT}
      form={LESSON_FORM}
      gone={t('newLesson.unitGone')}
      plan={(version) => {
        const unit = version.units.find((candidate) => candidate.id === unitId)
        if (!unit) return null
        return {
          subtitle: t('newLesson.subtitle', { order: unit.order, title: unit.title }),
          attributes: { orden: Math.max(0, ...unit.lessons.map((lesson) => lesson.order)) + 1, tipo: 'LECTURA' },
          fixed: { unidad: unit.id }
        }
      }}
    />
  )
}
