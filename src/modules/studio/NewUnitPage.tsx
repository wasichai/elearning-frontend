import type { Form } from '@wasichai/core'
import { useTranslation } from 'react-i18next'
import { DraftRecordPage } from './DraftRecordPage'

const UNIT_OBJECT = 'unidad'

// el formulario de core pregunta la versión con un selector que nombra cada una por su estado («BORRADOR», «BORRADOR»…) y solo trae
// cien: aquí la versión es esta y no se pregunta, ni la fuente, que la pone la importación
const UNIT_FORM: Form = {
  id: 'studio-new-unit',
  name: 'studio-new-unit',
  label: 'studio-new-unit',
  objectName: UNIT_OBJECT,
  generated: true,
  definition: { sections: [{ title: null, fields: ['orden', 'titulo', 'descripcion', 'objetivos', 'horas_estimadas'] }] }
}

// una unidad nueva de un borrador propio, con el orden siguiente propuesto
export function NewUnitPage() {
  const { t } = useTranslation('studio')
  return (
    <DraftRecordPage
      title={t('newUnit.title')}
      objectName={UNIT_OBJECT}
      form={UNIT_FORM}
      plan={(version) => ({
        subtitle: t('newUnit.subtitle', { number: version.number, course: version.course.title }),
        attributes: { orden: Math.max(0, ...version.units.map((unit) => unit.order)) + 1 },
        fixed: { version_curso: version.id }
      })}
    />
  )
}
