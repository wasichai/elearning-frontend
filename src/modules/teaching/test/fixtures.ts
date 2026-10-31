// ejemplos del contrato del espacio docente («Espacio docente (F3, ADR-0016)» en docs/api/lms.md del backend),
// completados donde el documento pone «…». los usan las pruebas unitarias y las extremo a extremo (e2e/api.ts)

export const offering = {
  code: 'edicion-sgspe-2026-09',
  status: 'EN_CURSO',
  startDate: '2026-09-07',
  endDate: '2026-10-16',
  timeZone: 'America/Lima',
  course: { slug: 'sgspe-introductorio', code: 'SGSPE-101', title: 'Introducción al SGSPE' },
  enrolled: 2,
  pendingAttempts: 1
}

export const otherOffering = {
  code: 'edicion-srtm-2026-11',
  status: 'INSCRIPCION_ABIERTA',
  startDate: '2026-11-09',
  endDate: '2026-12-04',
  timeZone: 'America/Lima',
  course: { slug: 'srtm-anuncios', code: 'SRTM-ANU-101', title: 'Licencias de anuncios con SRTM' },
  enrolled: 1,
  pendingAttempts: 0
}

export const roster = [
  {
    enrollmentId: 'mat-sgspe-1',
    email: 'estudiante@demo.local',
    status: 'ACTIVA',
    progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
    attendance: { attended: 1, total: 2 },
    assessments: [{ lessonId: 'lec-eva', title: 'Evaluación final', bestPercent: null, passed: null, pending: true }]
  },
  {
    enrollmentId: 'mat-sgspe-2',
    email: 'ana.torres@demo.local',
    status: 'FINALIZADA',
    progress: { completedLessons: 3, totalLessons: 3, percent: 100 },
    attendance: { attended: 2, total: 2 },
    assessments: [{ lessonId: 'lec-eva', title: 'Evaluación final', bestPercent: 85, passed: true, pending: false }]
  }
]

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Internal Server Error',
  status,
  detail,
  errors: []
})

// la corrección: un intento enviado con una pregunta automática, una abierta y una de archivo

export const pendingAttempts = [
  {
    attemptId: 'int-1',
    enrollmentId: 'mat-sgspe-1',
    email: 'estudiante@demo.local',
    lessonId: 'lec-eva',
    lessonTitle: 'Evaluación final',
    submittedAt: '2026-10-28T15:20:00Z',
    pendingQuestions: 2
  }
]

const questions = [
  {
    id: 'p-single',
    order: 1,
    type: 'SINGLE',
    prompt: '¿Quién otorga la licencia?',
    points: 2,
    options: [
      { id: 'o-muni', text: 'La municipalidad' },
      { id: 'o-sunat', text: 'La SUNAT' }
    ],
    rubric: []
  },
  {
    id: 'p-open',
    order: 2,
    type: 'OPEN',
    prompt: 'Explica cómo se liquida.',
    points: 4,
    options: [],
    rubric: [
      { description: 'Cita la ordenanza', points: 2 },
      { description: 'Explica el cálculo', points: 2 }
    ]
  },
  {
    id: 'p-file',
    order: 3,
    type: 'FILE',
    prompt: 'Sube la liquidación.',
    points: 4,
    options: [],
    rubric: [{ description: 'El cálculo es correcto', points: 4 }]
  }
]

export const SUBMISSION_URL = '/api/objects/entrega/records/ent-1/files/archivo'

export const attemptToGrade = {
  id: 'int-1',
  number: 1,
  status: 'SUBMITTED',
  startedAt: '2026-10-28T15:00:00Z',
  deadline: '2026-10-28T15:30:00Z',
  submittedAt: '2026-10-28T15:20:00Z',
  questions,
  answers: [
    { questionId: 'p-single', optionIds: ['o-muni'], text: null, submissionId: null },
    { questionId: 'p-open', optionIds: [], text: 'Se aplica la tasa al área del anuncio.', submissionId: null },
    {
      questionId: 'p-file',
      optionIds: [],
      text: null,
      submissionId: 'ent-1',
      submission: { id: 'ent-1', file: { name: 'liquidacion.pdf', contentType: 'application/pdf', size: 2048, url: SUBMISSION_URL } }
    }
  ],
  result: {
    score: 2,
    maxScore: 10,
    percent: null,
    passed: null,
    pending: true,
    questions: [
      { questionId: 'p-single', points: 2, maxPoints: 2, correct: true, comment: null, solution: { optionIds: ['o-muni'], acceptedAnswers: [] } },
      { questionId: 'p-open', points: null, maxPoints: 4, correct: null, comment: null, solution: null },
      { questionId: 'p-file', points: null, maxPoints: 4, correct: null, comment: null, solution: null }
    ]
  }
}

// la abierta ya calificada y la de archivo por calificar
export const attemptPartlyGraded = {
  ...attemptToGrade,
  result: {
    ...attemptToGrade.result,
    score: 5,
    questions: attemptToGrade.result.questions.map((outcome) =>
      outcome.questionId === 'p-open' ? { ...outcome, points: 3, comment: 'Falta la ordenanza.' } : outcome
    )
  }
}

export const attemptGraded = {
  ...attemptToGrade,
  status: 'GRADED',
  result: {
    score: 8,
    maxScore: 10,
    percent: 80,
    passed: true,
    pending: false,
    questions: attemptPartlyGraded.result.questions.map((outcome) => (outcome.questionId === 'p-file' ? { ...outcome, points: 3 } : outcome))
  }
}

// las sesiones como las lee el docente: sin asistencia. horas en Lima (UTC−5)
export const teachingSessions = [
  {
    id: 'ses-1',
    title: 'Presentación del curso',
    type: 'TEORIA',
    modality: 'VIRTUAL',
    start: '2026-11-10T13:00:00Z',
    end: '2026-11-10T14:30:00Z',
    timeZone: 'America/Lima',
    status: 'PROGRAMADA',
    link: 'https://meet.example/sgspe-1',
    location: null,
    lessonId: null,
    originalSessionId: null
  },
  {
    id: 'ses-2',
    title: 'Consulta cancelada',
    type: 'CONSULTA',
    modality: 'PRESENCIAL',
    start: '2026-11-12T13:00:00Z',
    end: '2026-11-12T14:00:00Z',
    timeZone: 'America/Lima',
    status: 'CANCELADA',
    link: null,
    location: 'Aula 204',
    lessonId: null,
    originalSessionId: null
  }
]

export const attendanceRows = [
  { enrollmentId: 'mat-sgspe-1', email: 'estudiante@demo.local', status: null },
  { enrollmentId: 'mat-sgspe-2', email: 'ana.torres@demo.local', status: 'PRESENTE' }
]
