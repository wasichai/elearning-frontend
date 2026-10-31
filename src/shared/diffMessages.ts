// los textos de VersionDiffSection, que cada módulo que la usa pone bajo la clave diff de su espacio de nombres

const es = {
  title: 'Cambios',
  loading: 'Comparando con la versión anterior…',
  failed: 'No pudimos cargar las diferencias con la versión anterior.',
  retry: 'Reintentar la comparación',
  noBase: 'Es la primera versión de este curso: no hay una versión anterior con la que compararla, así que todo su contenido es nuevo.',
  base: 'Comparada con la versión {{number}}.',
  noChanges: 'Su contenido es el mismo que el de la versión {{number}}.',
  changed: 'Lo que cambió',
  unit: 'Unidad {{order}}. {{title}}',
  lesson: 'Lección {{unit}}.{{order}}. {{title}}',
  previousTitle: 'Antes: «{{title}}»',
  fields: 'Cambió: {{fields}}',
  sameUnits_one: '{{value}} unidad sin cambios',
  sameUnits_other: '{{value}} unidades sin cambios',
  sameLessons_one: '{{value}} lección sin cambios',
  sameLessons_other: '{{value}} lecciones sin cambios',
  // unidad y lección son femeninas: un solo juego de etiquetas sirve a las dos
  change: {
    ADDED: 'Añadida',
    REMOVED: 'Quitada',
    CHANGED: 'Cambiada',
    SAME: 'Sin cambios'
  },
  // los campos de unidad y leccion en model/model.json del backend; uno que no esté aquí se muestra tal cual
  field: {
    titulo: 'título',
    descripcion: 'descripción',
    objetivos: 'objetivos',
    horas_estimadas: 'horas estimadas',
    tipo: 'tipo',
    duracion_minutos: 'duración',
    resumen: 'resumen',
    referencia_fuente: 'fuente',
    recursos: 'recursos'
  }
}

// mismas claves que es: el tipo lo exige al compilar y VersionDiff.test.tsx lo comprueba
const en: typeof es = {
  title: 'Changes',
  loading: 'Comparing with the previous version…',
  failed: 'We could not load the differences with the previous version.',
  retry: 'Retry the comparison',
  noBase: 'This is the first version of this course: there is no previous version to compare it with, so all of its content is new.',
  base: 'Compared with version {{number}}.',
  noChanges: 'Its content is the same as in version {{number}}.',
  changed: 'What changed',
  unit: 'Unit {{order}}. {{title}}',
  lesson: 'Lesson {{unit}}.{{order}}. {{title}}',
  previousTitle: 'Before: “{{title}}”',
  fields: 'Changed: {{fields}}',
  sameUnits_one: '{{value}} unit unchanged',
  sameUnits_other: '{{value}} units unchanged',
  sameLessons_one: '{{value}} lesson unchanged',
  sameLessons_other: '{{value}} lessons unchanged',
  change: {
    ADDED: 'Added',
    REMOVED: 'Removed',
    CHANGED: 'Changed',
    SAME: 'Unchanged'
  },
  field: {
    titulo: 'title',
    descripcion: 'description',
    objetivos: 'objectives',
    horas_estimadas: 'estimated hours',
    tipo: 'type',
    duracion_minutos: 'duration',
    resumen: 'summary',
    referencia_fuente: 'source',
    recursos: 'resources'
  }
}

export const diffMessages = { es, en }

// los campos con nombre traducido
export function isKnownField(field: string): field is keyof typeof es.field {
  return Object.hasOwn(es.field, field)
}
