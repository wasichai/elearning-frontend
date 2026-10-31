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
