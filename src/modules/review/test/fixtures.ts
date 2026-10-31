// ejemplos del contrato de la bandeja del revisor («Estudio y revisión (F4, ADR-0018)» en docs/api/lms.md del backend),
// completados donde el documento pone «…». los usan las pruebas unitarias y las extremo a extremo (e2e/review-api.ts).
// los instantes van a mediodía UTC: la fecha es la misma en cualquier zona

export const versionInReview = {
  id: 'ver-sgspe-2',
  number: 2,
  status: 'EN_REVISION',
  course: { id: 'cur-sgspe', code: 'SGSPE-101', title: 'Introducción al SGSPE' },
  authorId: 'u-creador',
  reviewerId: null,
  updatedAt: '2026-10-20T12:00:00Z',
  openComments: 1
}

export const otherVersionInReview = {
  id: 'ver-srtm-1',
  number: 1,
  status: 'EN_REVISION',
  course: { id: 'cur-srtm', code: 'SRTM-ANU-101', title: 'Licencias de anuncios con SRTM' },
  authorId: 'u-creador',
  reviewerId: 'u-revisor',
  updatedAt: '2026-10-25T12:00:00Z',
  openComments: 0
}

export const versionDetail = {
  ...versionInReview,
  units: [
    {
      id: 'uni-1',
      order: 1,
      title: 'El sistema y sus actores',
      lessons: [
        { id: 'lec-1', order: 1, title: 'Qué es el SGSPE', type: 'LECTURA', sourceRef: null, hasAssessment: false, resources: 1 },
        { id: 'lec-2', order: 2, title: 'Evaluación de la unidad', type: 'EVALUACION', sourceRef: null, hasAssessment: true, resources: 0 }
      ]
    }
  ],
  comments: [
    {
      id: 'com-1',
      section: 'unidad:1/leccion:1',
      text: 'Falta citar la ordenanza.',
      authorId: 'u-revisor',
      createdAt: '2026-10-21T12:00:00Z',
      resolved: false
    },
    {
      id: 'com-0',
      section: 'version',
      text: 'Revisar el título del curso.',
      authorId: 'u-revisor',
      createdAt: '2026-10-19T12:00:00Z',
      resolved: true
    }
  ],
  decisions: [
    {
      decision: 'PEDIR_CAMBIOS',
      reason: 'Faltan las referencias normativas.',
      authorId: 'u-revisor',
      at: '2026-10-18T12:00:00Z'
    }
  ]
}

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : status === 403 ? 'Forbidden' : 'Internal Server Error',
  status,
  detail,
  errors: []
})
