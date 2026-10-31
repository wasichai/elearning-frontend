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
  openComments: 0
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
  openComments: 1
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

// lo que responde POST /studio/courses/{id}/versions
export const createdVersion = { id: 'a1b2c3d4-0000-4000-8000-000000000003', number: 3, status: 'BORRADOR' }

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Internal Server Error',
  status,
  detail,
  errors: []
})
