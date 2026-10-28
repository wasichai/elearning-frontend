// ejemplos del contrato del aula («Aula del estudiante» en docs/api/lms.md del backend), completados donde el documento
// pone «…». los usan las pruebas unitarias y las extremo a extremo (e2e/api.ts). cada prueba copia y altera lo que
// necesita: estos objetos no se mutan.

const FILES = '/api/objects/version_recurso/records'

export const lessonHtml = `<!doctype html><html lang="es"><body><h1>Tipos de anuncio</h1><p>Un anuncio puede ser adosado, luminoso o en panel.</p><script>document.body.setAttribute('data-script', 'ran')</script></body></html>`

export const enrollment = {
  id: 'mat-srtm-1',
  status: 'ACTIVA',
  enrolledAt: '2026-10-28T15:00:00Z',
  course: { slug: 'srtm-anuncios', code: 'SRTM-ANU-101', title: 'Licencias de anuncios con SRTM' },
  version: 1,
  offering: { code: 'edicion-srtm-2026-11', status: 'INSCRIPCION_ABIERTA', startDate: '2026-11-09', endDate: '2026-12-04', timeZone: 'America/Lima' },
  progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
  nextLesson: { id: 'lec-video', title: 'Recorrido por la pantalla', unitOrder: 1, lessonOrder: 2 }
}

export const otherEnrollment = {
  ...enrollment,
  id: 'mat-sgspe-1',
  enrolledAt: '2026-09-01T14:00:00Z',
  course: { slug: 'sgspe-introductorio', code: 'SGSPE-101', title: 'Introducción al SGSPE' },
  offering: { code: 'edicion-sgspe-2026-09', status: 'EN_CURSO', startDate: '2026-09-07', endDate: '2026-10-16', timeZone: 'America/Lima' },
  progress: { completedLessons: 0, totalLessons: 6, percent: 0 },
  nextLesson: { id: 'lec-sgspe-1', title: 'Qué es el SGSPE', unitOrder: 1, lessonOrder: 1 }
}

// todo completado: no queda siguiente lección
export const finishedEnrollment = {
  ...enrollment,
  id: 'mat-done-1',
  course: { slug: 'tributos-locales', code: 'TRI-100', title: 'Tributos locales' },
  offering: { code: 'edicion-tri-2026-08', status: 'FINALIZADA', startDate: '2026-08-03', endDate: '2026-08-28', timeZone: 'America/Lima' },
  progress: { completedLessons: 4, totalLessons: 4, percent: 100 },
  nextLesson: null
}

const notStarted = { status: 'NO_INICIADA', startedAt: null, completedAt: null, evidence: null }

export const classroom = {
  ...enrollment,
  units: [
    {
      id: 'uni-1',
      order: 1,
      title: 'El trámite de anuncios',
      description: 'Qué es una licencia de anuncio y quién la pide.',
      progress: { completedLessons: 1, totalLessons: 2, percent: 50 },
      lessons: [
        {
          id: 'lec-html',
          order: 1,
          title: 'Tipos de anuncio',
          type: 'LECTURA',
          durationMinutes: 30,
          summary: 'Clasificación de anuncios.',
          completion: 'EXPLICIT',
          progress: { status: 'COMPLETADA', startedAt: '2026-10-28T15:05:00Z', completedAt: '2026-10-28T15:30:00Z', evidence: 'FINALIZACION_EXPLICITA' },
          resources: [
            {
              id: 'rec-html',
              title: 'Tipos de anuncio (lectura)',
              type: 'HTML',
              version: 1,
              file: { name: 'leccion.html', contentType: 'text/html', size: 2048, url: `${FILES}/vr-html/files/archivo` }
            }
          ]
        },
        {
          id: 'lec-video',
          order: 2,
          title: 'Recorrido por la pantalla',
          type: 'VIDEO',
          durationMinutes: 15,
          summary: 'Demostración.',
          completion: 'VIDEO_END',
          progress: notStarted,
          resources: [
            {
              id: 'rec-video',
              title: 'Recorrido en vídeo',
              type: 'VIDEO',
              version: 1,
              file: { name: 'recorrido.mp4', contentType: 'video/mp4', size: 1048576, url: `${FILES}/vr-video/files/archivo` }
            }
          ]
        }
      ]
    },
    {
      id: 'uni-2',
      order: 2,
      title: 'La liquidación',
      description: null,
      progress: { completedLessons: 0, totalLessons: 1, percent: 0 },
      lessons: [
        {
          id: 'lec-pdf',
          order: 1,
          title: 'Guía de liquidación',
          type: 'PRESENTACION',
          durationMinutes: null,
          summary: null,
          completion: 'EXPLICIT',
          progress: notStarted,
          resources: [
            {
              id: 'rec-pdf',
              title: 'Guía en PDF',
              type: 'PDF',
              version: 2,
              file: { name: 'guia-liquidacion.pdf', contentType: 'application/pdf', size: 482304, url: `${FILES}/vr-pdf/files/archivo` }
            },
            {
              id: 'rec-xlsx',
              title: 'Plantilla de cálculo',
              type: 'HOJA_CALCULO',
              version: 1,
              file: {
                name: 'plantilla.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 10240,
                url: `${FILES}/vr-xlsx/files/archivo`
              }
            },
            { id: 'rec-none', title: 'Material por publicar', type: 'PDF', version: 1, file: null }
          ]
        },
        {
          id: 'lec-quiz',
          order: 2,
          title: 'Cuestionario de la unidad',
          type: 'EVALUACION',
          durationMinutes: 20,
          summary: 'Diez preguntas sobre la liquidación.',
          completion: 'NOT_YET',
          progress: notStarted,
          resources: []
        }
      ]
    }
  ]
}

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Internal Server Error',
  status,
  detail,
  errors: []
})

// F3 (ADR-0016): «Introducción al SGSPE» con una evaluación, una sesión en vivo y su certificado

export const assessmentSummary = {
  id: 'eva-final',
  title: 'Evaluación final',
  maxAttempts: 2,
  timeLimitMinutes: 30,
  passingPercent: 70,
  attemptsUsed: 0,
  openAttemptId: null,
  best: null
}

export const assessmentClassroom = {
  ...otherEnrollment,
  progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
  nextLesson: { id: 'lec-eva', title: 'Evaluación final', unitOrder: 1, lessonOrder: 2 },
  units: [
    {
      id: 'uni-sg-1',
      order: 1,
      title: 'El SGSPE',
      description: null,
      progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
      lessons: [
        {
          id: 'lec-sgspe-1',
          order: 1,
          title: 'Qué es el SGSPE',
          type: 'LECTURA',
          durationMinutes: 20,
          summary: null,
          completion: 'EXPLICIT',
          progress: { status: 'COMPLETADA', startedAt: '2026-09-08T14:00:00Z', completedAt: '2026-09-08T14:20:00Z', evidence: 'FINALIZACION_EXPLICITA' },
          resources: []
        },
        {
          id: 'lec-eva',
          order: 2,
          title: 'Evaluación final',
          type: 'EVALUACION',
          durationMinutes: 30,
          summary: 'Seis preguntas sobre el SGSPE.',
          completion: 'ASSESSMENT',
          progress: notStarted,
          resources: [],
          assessment: assessmentSummary
        },
        {
          id: 'lec-sesion',
          order: 3,
          title: 'Sesión de consulta',
          type: 'SESION',
          durationMinutes: 90,
          summary: null,
          completion: 'ATTENDANCE',
          progress: notStarted,
          resources: []
        }
      ]
    }
  ]
}

const questions = [
  {
    id: 'p-single',
    order: 1,
    type: 'SINGLE',
    prompt: '¿Quién otorga la licencia de anuncio?',
    points: 2,
    options: [
      { id: 'o-muni', text: 'La municipalidad' },
      { id: 'o-sunat', text: 'La SUNAT' }
    ],
    rubric: []
  },
  {
    id: 'p-multiple',
    order: 2,
    type: 'MULTIPLE',
    prompt: '¿Qué tipos de anuncio existen?',
    points: 2,
    options: [
      { id: 'o-adosado', text: 'Adosado' },
      { id: 'o-luminoso', text: 'Luminoso' },
      { id: 'o-sonoro', text: 'Sonoro' }
    ],
    rubric: []
  },
  {
    id: 'p-tf',
    order: 3,
    type: 'TRUE_FALSE',
    prompt: 'El SGSPE registra los expedientes.',
    points: 1,
    options: [
      { id: 'o-v', text: 'Verdadero' },
      { id: 'o-f', text: 'Falso' }
    ],
    rubric: []
  },
  { id: 'p-short', order: 4, type: 'SHORT', prompt: '¿Cuáles son las siglas del sistema de rentas?', points: 1, options: [], rubric: [] },
  {
    id: 'p-open',
    order: 5,
    type: 'OPEN',
    prompt: 'Explica cómo se liquida una licencia.',
    points: 2,
    options: [],
    rubric: [
      { description: 'Cita la ordenanza', points: 1 },
      { description: 'Explica el cálculo', points: 1 }
    ]
  },
  {
    id: 'p-file',
    order: 6,
    type: 'FILE',
    prompt: 'Sube la liquidación de ejemplo.',
    points: 2,
    options: [],
    rubric: [{ description: 'El cálculo es correcto', points: 2 }]
  }
]

const SUBMISSION_FILE = { name: 'liquidacion.pdf', contentType: 'application/pdf', size: 20480, url: '/api/objects/entrega/records/ent-1/files/archivo' }

export const openAttempt = {
  id: 'int-1',
  number: 1,
  status: 'OPEN',
  startedAt: '2026-10-28T15:00:00Z',
  deadline: '2026-10-28T15:30:00Z',
  submittedAt: null,
  questions,
  answers: [],
  result: null
}

export const filledAnswers = [
  { questionId: 'p-single', optionIds: ['o-muni'], text: null, submissionId: null },
  { questionId: 'p-multiple', optionIds: ['o-adosado', 'o-luminoso'], text: null, submissionId: null },
  { questionId: 'p-tf', optionIds: ['o-f'], text: null, submissionId: null },
  { questionId: 'p-short', optionIds: [], text: 'SRTM', submissionId: null },
  { questionId: 'p-open', optionIds: [], text: 'Se aplica la tasa de la ordenanza al área del anuncio.', submissionId: null },
  { questionId: 'p-file', optionIds: [], text: null, submissionId: 'ent-1', submission: { id: 'ent-1', file: SUBMISSION_FILE } }
]

// enviado, con la pregunta abierta y la de archivo por corregir
export const submittedAttempt = {
  ...openAttempt,
  status: 'SUBMITTED',
  submittedAt: '2026-10-28T15:20:00Z',
  answers: filledAnswers,
  result: {
    score: 5,
    maxScore: 10,
    percent: null,
    passed: null,
    pending: true,
    questions: [
      { questionId: 'p-single', points: 2, maxPoints: 2, correct: true, comment: null, solution: null },
      { questionId: 'p-multiple', points: 2, maxPoints: 2, correct: true, comment: null, solution: null },
      { questionId: 'p-tf', points: 0, maxPoints: 1, correct: false, comment: null, solution: null },
      { questionId: 'p-short', points: 1, maxPoints: 1, correct: true, comment: null, solution: null },
      { questionId: 'p-open', points: null, maxPoints: 2, correct: null, comment: null, solution: null },
      { questionId: 'p-file', points: null, maxPoints: 2, correct: null, comment: null, solution: null }
    ]
  }
}

// corregido y con las soluciones a la vista (showSolutions: ON_SUBMIT)
export const gradedAttempt = {
  ...submittedAttempt,
  status: 'GRADED',
  result: {
    score: 8,
    maxScore: 10,
    percent: 80,
    passed: true,
    pending: false,
    questions: [
      { questionId: 'p-single', points: 2, maxPoints: 2, correct: true, comment: null, solution: { optionIds: ['o-muni'], acceptedAnswers: [] } },
      {
        questionId: 'p-multiple',
        points: 2,
        maxPoints: 2,
        correct: true,
        comment: null,
        solution: { optionIds: ['o-adosado', 'o-luminoso'], acceptedAnswers: [] }
      },
      { questionId: 'p-tf', points: 0, maxPoints: 1, correct: false, comment: null, solution: { optionIds: ['o-v'], acceptedAnswers: [] } },
      { questionId: 'p-short', points: 1, maxPoints: 1, correct: true, comment: null, solution: { optionIds: [], acceptedAnswers: ['SRTM', 'S.R.T.M.'] } },
      { questionId: 'p-open', points: 1, maxPoints: 2, correct: null, comment: 'Falta citar la ordenanza.', solution: null },
      { questionId: 'p-file', points: 2, maxPoints: 2, correct: null, comment: null, solution: null }
    ]
  }
}

export const submission = { id: 'ent-1', file: null, uploadUrl: '/api/objects/entrega/records/ent-1/files/archivo' }
