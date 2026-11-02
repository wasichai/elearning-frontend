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
  before: 'Antes:',
  now: 'Ahora:',
  fields: 'Cambió: {{fields}}',
  ownLessons: 'sus lecciones',
  otherFields: 'otros datos',
  summary: 'Resumen de cambios',
  legend: 'Leyenda',
  units_one: '{{value}} unidad',
  units_other: '{{value}} unidades',
  lessons_one: '{{value}} lección',
  lessons_other: '{{value}} lecciones',
  total: {
    ADDED: 'Añadidas',
    CHANGED: 'Cambiadas',
    REMOVED: 'Quitadas'
  },
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
  // los campos de unidad y leccion en model/model.json del backend, más recursos y entornos; uno que no esté aquí se nombra otherFields
  field: {
    titulo: 'título',
    descripcion: 'descripción',
    objetivos: 'objetivos',
    horas_estimadas: 'horas estimadas',
    tipo: 'tipo',
    duracion_minutos: 'duración',
    resumen: 'resumen',
    referencia_fuente: 'fuente',
    recursos: 'recursos',
    objetivo: 'objetivo',
    requisitos: 'requisitos',
    hitos: 'hitos',
    criterios_aceptacion: 'criterios de aceptación',
    entregables: 'entregables',
    entornos: 'entornos'
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
  before: 'Before:',
  now: 'Now:',
  fields: 'Changed: {{fields}}',
  ownLessons: 'its lessons',
  otherFields: 'other data',
  summary: 'Summary of changes',
  legend: 'Key',
  units_one: '{{value}} unit',
  units_other: '{{value}} units',
  lessons_one: '{{value}} lesson',
  lessons_other: '{{value}} lessons',
  total: {
    ADDED: 'Added',
    CHANGED: 'Changed',
    REMOVED: 'Removed'
  },
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
    recursos: 'resources',
    objetivo: 'objective',
    requisitos: 'requirements',
    hitos: 'milestones',
    criterios_aceptacion: 'acceptance criteria',
    entregables: 'deliverables',
    entornos: 'environments'
  }
}

export const diffMessages = { es, en }

// los campos con nombre traducido
export function isKnownField(field: string): field is keyof typeof es.field {
  return Object.hasOwn(es.field, field)
}
