import { student, type Scenario } from '../scenario'

export const classroomScenarios: Scenario[] = [
  { name: 'student-courses', path: '/mis-cursos', api: student },
  { name: 'student-courses-empty', path: '/mis-cursos', api: { ...student, enrolled: false } },
  { name: 'student-course', path: '/mis-cursos/mat-srtm-1', api: student },
  { name: 'student-lesson', path: '/mis-cursos/mat-srtm-1?leccion=lec-html', api: student },
  { name: 'student-lesson-video', path: '/mis-cursos/mat-srtm-1?leccion=lec-video', api: student },
  { name: 'student-lesson-pdf', path: '/mis-cursos/mat-srtm-1?leccion=lec-pdf', api: student },
  { name: 'student-assessment', path: '/mis-cursos/mat-sgspe-1?leccion=lec-eva', api: student },
  { name: 'student-sessions', path: '/mis-cursos/mat-sgspe-1/sesiones', api: student },
  { name: 'student-completion-pending', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: student },
  { name: 'student-completion', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: { ...student, courseComplete: true } },
  { name: 'certificate', path: '/certificados/K7Q2-M9XW-4RTB', api: { certificateIssued: true } },
  { name: 'certificate-missing', path: '/certificados/NO-EXISTE' },
  { name: 'certificate-verify', path: '/certificados' }
]
