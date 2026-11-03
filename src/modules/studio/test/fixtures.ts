// ejemplos del contrato del estudio del creador («Estudio del creador» en docs/api/lms.md del backend), completados donde
// el documento pone «…». los usan las pruebas unitarias y las extremo a extremo (e2e/studio-api.ts)

export const AUTHOR_ID = '6f1c2b0e-0000-4000-8000-000000000001'
export const REVIEWER_ID = '6f1c2b0e-0000-4000-8000-000000000002'

const course = { id: 'c0a8e1f2-0000-4000-8000-0000000000aa', code: 'SGSPE-101', title: 'Introducción al SGSPE' }

// un borrador sin comentarios, listo para enviar
export const draftVersion = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  number: 2,
  status: 'BORRADOR',
  course,
  authorId: AUTHOR_ID,
  reviewerId: null,
  updatedAt: '2026-10-30T15:20:00Z',
  openComments: 0,
  generator: null
}

// la versión publicada de la que salió, con lo que comentó y decidió el revisor
export const publishedVersion = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  number: 1,
  status: 'PUBLICADA',
  course,
  authorId: AUTHOR_ID,
  reviewerId: REVIEWER_ID,
  updatedAt: '2026-09-01T12:00:00Z',
  openComments: 1,
  generator: null
}

export const units = [
  {
    id: 'u-2',
    order: 2,
    title: 'Liquidaciones',
    lessons: [{ id: 'l-3', order: 1, title: 'Evaluación final', type: 'EVALUACION', sourceRef: null, hasAssessment: true, resources: 0 }]
  },
  {
    id: 'u-1',
    order: 1,
    title: 'Primeros pasos',
    lessons: [
      { id: 'l-2', order: 2, title: 'Recorrido por el portal', type: 'VIDEO', sourceRef: null, hasAssessment: false, resources: 2 },
      {
        id: 'l-1',
        order: 1,
        title: 'Entrar al portal',
        type: 'LECTURA',
        sourceRef: 'wasichai/manual-sgspe@4f2a9c1:acceso.adoc#entrar',
        hasAssessment: false,
        resources: 1
      }
    ]
  }
]

export const comments = [
  {
    id: 'com-1',
    section: 'unidad:1/leccion:1',
    text: 'El primer paso no dice qué navegador usar.',
    authorId: REVIEWER_ID,
    createdAt: '2026-08-20T14:00:00Z',
    resolved: true
  },
  {
    id: 'com-2',
    section: 'unidad:2/leccion:1',
    text: 'La evaluación pide algo que la unidad no enseña.',
    authorId: REVIEWER_ID,
    createdAt: '2026-08-21T09:30:00Z',
    resolved: false
  }
]

export const decisions = [
  { decision: 'PEDIR_CAMBIOS', reason: 'Faltan ejemplos en la unidad 2.', authorId: REVIEWER_ID, at: '2026-08-21T10:00:00Z' },
  { decision: 'APROBAR', reason: null, authorId: REVIEWER_ID, at: '2026-08-28T16:00:00Z' }
]

export const draftDetail = { ...draftVersion, units, comments: [], decisions: [] }
export const publishedDetail = { ...publishedVersion, units, comments, decisions }

// GET /studio/versions/{id}/diff del borrador contra la versión 1: la lección 2 de la unidad 1 es nueva, la 1 cambió de
// recursos y la unidad 2 de título
export const draftDiff = {
  baseVersion: 1,
  units: [
    {
      order: 1,
      change: 'CHANGED',
      title: 'Primeros pasos',
      previousTitle: 'Primeros pasos',
      fields: [],
      lessons: [
        { order: 1, change: 'CHANGED', title: 'Entrar al portal', previousTitle: 'Entrar al portal', fields: ['recursos'] },
        { order: 2, change: 'ADDED', title: 'Recorrido por el portal', previousTitle: null, fields: [] }
      ]
    },
    {
      order: 2,
      change: 'CHANGED',
      title: 'Liquidaciones',
      previousTitle: 'Liquidación',
      fields: ['titulo'],
      lessons: [{ order: 1, change: 'SAME', title: 'Evaluación final', previousTitle: 'Evaluación final', fields: [] }]
    }
  ]
}

// la primera versión del curso no tiene con qué compararse
export const publishedDiff = {
  baseVersion: null,
  units: units.map((unit) => ({
    order: unit.order,
    change: 'ADDED',
    title: unit.title,
    previousTitle: null,
    fields: [],
    lessons: unit.lessons.map((lesson) => ({ order: lesson.order, change: 'ADDED', title: lesson.title, previousTitle: null, fields: [] }))
  }))
}

// lo que responde POST /studio/courses/{id}/versions
export const createdVersion = { id: 'a1b2c3d4-0000-4000-8000-000000000003', number: 3, status: 'BORRADOR' }

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Internal Server Error',
  status,
  detail,
  errors: []
})

// un curso recién creado, sin versiones, y su primer borrador: vacío, como lo crea POST studio/courses/{id}/versions (#270)
export const newCourseRecord = {
  id: 'c0a8e1f2-0000-4000-8000-0000000000bb',
  createdAt: '2026-11-03T10:00:00Z',
  updatedAt: '2026-11-03T10:00:00Z',
  attributes: { codigo: 'NUEVO-101', slug: 'nuevo-101', titulo: 'Curso nuevo', idioma: 'es', nivel: 'INICIAL' }
}

export const firstDraftDetail = {
  ...draftDetail,
  id: 'a1b2c3d4-0000-4000-8000-000000000010',
  number: 1,
  course: { id: newCourseRecord.id, code: 'NUEVO-101', title: 'Curso nuevo' },
  units: []
}

// un borrador con unidades y sin ninguna lección: tampoco se puede enviar
export const noLessonsDetail = {
  ...firstDraftDetail,
  units: [
    { id: 'u-vacia-2', order: 2, title: 'Pagos', lessons: [] },
    { id: 'u-vacia-1', order: 1, title: 'Primeros pasos', lessons: [] }
  ]
}

export const objectField = (name: string, label: string, type: string, required = false, position = 0, relationTarget: string | null = null) => ({
  id: `f-${name}`,
  name,
  label,
  type,
  required,
  unique: false,
  defaultValue: null,
  description: null,
  position,
  enumOptions: null,
  relationTarget,
  visible: true,
  editable: true
})

const objectDefinition = (
  name: string,
  label: string,
  fields: (Omit<ReturnType<typeof objectField>, 'defaultValue' | 'enumOptions'> & { defaultValue: string | null; enumOptions: string[] | null })[]
) => ({
  id: `o-${name}`,
  name,
  label,
  pluralLabel: label,
  description: null,
  enabled: true,
  uniqueConstraints: [],
  appendOnly: false,
  apiOnly: false,
  requiresReason: false,
  fields
})

// los metadatos que da el servidor (model/model.json del backend), con los campos que usan las pantallas del estudio
export const courseDefinition = objectDefinition('curso', 'Curso', [
  objectField('codigo', 'Código', 'TEXT', true, 0),
  objectField('slug', 'Identificador en URL', 'TEXT', true, 1),
  objectField('titulo', 'Título', 'TEXT', true, 2)
])

export const unitDefinition = objectDefinition('unidad', 'Unidad', [
  objectField('orden', 'Orden', 'INTEGER', true, 0),
  objectField('titulo', 'Título', 'TEXT', true, 1),
  objectField('descripcion', 'Descripción', 'LONG_TEXT', false, 2),
  objectField('objetivos', 'Objetivos (uno por línea)', 'LONG_TEXT', false, 3),
  objectField('horas_estimadas', 'Horas estimadas', 'DECIMAL', false, 4),
  objectField('referencia_fuente', 'Fuente', 'TEXT', false, 5),
  objectField('version_curso', 'Versión del curso', 'RELATION', true, 6, 'version_curso')
])

export const lessonDefinition = objectDefinition('leccion', 'Lección', [
  objectField('orden', 'Orden', 'INTEGER', true, 0),
  objectField('titulo', 'Título', 'TEXT', true, 1),
  {
    ...objectField('tipo', 'Tipo', 'ENUM', true, 2),
    defaultValue: 'LECTURA',
    enumOptions: ['LECTURA', 'VIDEO', 'PRESENTACION', 'LABORATORIO', 'EVALUACION', 'SESION']
  },
  objectField('duracion_minutos', 'Duración en minutos', 'INTEGER', false, 3),
  objectField('resumen', 'Resumen', 'LONG_TEXT', false, 4),
  objectField('referencia_fuente', 'Fuente', 'TEXT', false, 5),
  objectField('unidad', 'Unidad', 'RELATION', true, 6, 'unidad')
])
