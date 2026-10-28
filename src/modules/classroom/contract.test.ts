import { describe, expect, it } from 'vitest'
import { sessionListSchema, sessionSchema } from '../../shared/sessions'
import {
  attemptSchema,
  certificateSchema,
  classroomSchema,
  completionSchema,
  ContractError,
  enrollmentListSchema,
  enrollmentSchema,
  lessonProgressSchema,
  parseContract,
  submissionSchema
} from './contract'
import {
  assessmentClassroom,
  assessmentSummary,
  certificate,
  classroom,
  completionMet,
  completionPending,
  enrollment,
  finishedEnrollment,
  gradedAttempt,
  openAttempt,
  sessions,
  submission,
  submittedAttempt
} from './test/fixtures'

const lesson = classroom.units[0]!.lessons[0]!
const withLesson = (patch: Record<string, unknown>) => ({
  ...classroom,
  units: [{ ...classroom.units[0], lessons: [{ ...lesson, ...patch }] }]
})

describe('contrato del aula', () => {
  it('acepta los ejemplos del documento', () => {
    expect(parseContract(enrollmentListSchema, 'enrollments', [enrollment, finishedEnrollment])).toHaveLength(2)
    expect(parseContract(enrollmentSchema, 'enrollment', finishedEnrollment).nextLesson).toBeNull()
    const parsed = parseContract(classroomSchema, 'classroom', classroom)
    expect(parsed.units.flatMap((unit) => unit.lessons.map((l) => l.completion))).toEqual(['EXPLICIT', 'VIDEO_END', 'EXPLICIT', 'NOT_YET'])
    expect(parsed.units[1]?.lessons[0]?.resources[2]?.file).toBeNull()
  })

  it('acepta campos nuevos y un progreso sin marcas de tiempo todavía', () => {
    expect(() => parseContract(enrollmentSchema, 'enrollment', { ...enrollment, certificate: null })).not.toThrow()
    expect(parseContract(lessonProgressSchema, 'progress', { status: 'NO_INICIADA' }).startedAt).toBeUndefined()
    expect(parseContract(lessonProgressSchema, 'progress', { status: 'INICIADA', startedAt: '2026-10-28T15:05:00Z' }).status).toBe('INICIADA')
  })

  it.each([
    ['falta el siguiente paso', { ...enrollment, nextLesson: undefined }, 'nextLesson'],
    ['estado de matrícula desconocido', { ...enrollment, status: 'PAUSADA' }, 'status'],
    ['porcentaje con decimales', { ...enrollment, progress: { ...enrollment.progress, percent: 33.3 } }, 'percent'],
    ['porcentaje sobre 100', { ...enrollment, progress: { ...enrollment.progress, percent: 101 } }, 'percent'],
    ['más completadas que lecciones', { ...enrollment, progress: { completedLessons: 4, totalLessons: 3, percent: 100 } }, 'completedLessons'],
    ['fecha de la edición mal formada', { ...enrollment, offering: { ...enrollment.offering, startDate: '09/11/2026' } }, 'startDate'],
    ['zona horaria inexistente', { ...enrollment, offering: { ...enrollment.offering, timeZone: 'America/Atlantis' } }, 'zona horaria'],
    ['instante sin zona', { ...enrollment, enrolledAt: '2026-10-28 15:00' }, 'enrolledAt'],
    ['versión como texto', { ...enrollment, version: '1' }, 'version']
  ])('rechaza una matrícula: %s', (_case, body, hint) => {
    expect(() => parseContract(enrollmentSchema, 'GET classroom/enrollments', body)).toThrow(ContractError)
    expect(() => parseContract(enrollmentSchema, 'GET classroom/enrollments', body)).toThrow(hint)
  })

  it.each([
    ['cómo se completa, desconocido', withLesson({ completion: 'ALWAYS' }), 'completion'],
    ['estado de progreso desconocido', withLesson({ progress: { status: 'TERMINADA' } }), 'status'],
    ['evidencia sin completar', withLesson({ progress: { status: 'INICIADA', evidence: 'FINALIZACION_EXPLICITA' } }), 'evidencia'],
    ['recursos que no son lista', withLesson({ resources: null }), 'resources'],
    ['archivo sin URL', withLesson({ resources: [{ ...lesson.resources[0], file: { ...lesson.resources[0]!.file, url: undefined } }] }), 'url'],
    ['unidades que faltan', { ...classroom, units: undefined }, 'units'],
    ['un HTML en vez de JSON', '<!doctype html>', 'expected object']
  ])('rechaza un aula: %s', (_case, body, hint) => {
    expect(() => parseContract(classroomSchema, 'GET classroom/enrollments/x', body)).toThrow(ContractError)
    expect(() => parseContract(classroomSchema, 'GET classroom/enrollments/x', body)).toThrow(hint)
  })
})

const assessed = assessmentClassroom.units[0]!.lessons[1]!
const withAssessment = (patch: Record<string, unknown>) => ({
  ...assessmentClassroom,
  units: [{ ...assessmentClassroom.units[0], lessons: [{ ...assessed, ...patch }] }]
})
const question = openAttempt.questions[0]!

describe('contrato de las evaluaciones (F3)', () => {
  it('acepta los ejemplos del documento: aula con evaluación y sesión, intentos abierto, pendiente y corregido, entrega', () => {
    const parsed = parseContract(classroomSchema, 'classroom', assessmentClassroom)
    expect(parsed.units[0]?.lessons.map((lesson) => lesson.completion)).toEqual(['EXPLICIT', 'ASSESSMENT', 'ATTENDANCE'])
    expect(parsed.units[0]?.lessons[1]?.assessment?.maxAttempts).toBe(2)
    expect(parsed.units[0]?.lessons[0]?.assessment).toBeUndefined()
    expect(parseContract(attemptSchema, 'attempt', openAttempt).questions.map((q) => q.type)).toEqual([
      'SINGLE',
      'MULTIPLE',
      'TRUE_FALSE',
      'SHORT',
      'OPEN',
      'FILE'
    ])
    expect(parseContract(attemptSchema, 'attempt', submittedAttempt).result?.percent).toBeNull()
    expect(parseContract(attemptSchema, 'attempt', gradedAttempt).result?.questions[3]?.solution?.acceptedAnswers).toEqual(['SRTM', 'S.R.T.M.'])
    expect(parseContract(submissionSchema, 'submission', submission).file).toBeNull()
  })

  it('acepta una evaluación sin límite de tiempo, con su mejor intento pendiente y un intento sin plazo', () => {
    const lesson = withAssessment({ assessment: { ...assessmentSummary, timeLimitMinutes: null, best: { percent: null, passed: null, pending: true } } })
    expect(parseContract(classroomSchema, 'classroom', lesson).units[0]?.lessons[0]?.assessment?.best?.pending).toBe(true)
    expect(parseContract(attemptSchema, 'attempt', { ...openAttempt, deadline: null }).deadline).toBeNull()
    expect(
      parseContract(attemptSchema, 'attempt', { ...submittedAttempt, answers: [{ ...submittedAttempt.answers[0], submission: null }] }).answers
    ).toHaveLength(1)
  })

  it.each([
    ['ASSESSMENT sin evaluación', withAssessment({ assessment: null }), 'assessment'],
    ['más intentos usados que permitidos', withAssessment({ assessment: { ...assessmentSummary, attemptsUsed: 3 } }), 'attemptsUsed'],
    ['nota mínima sobre 100', withAssessment({ assessment: { ...assessmentSummary, passingPercent: 120 } }), 'passingPercent'],
    ['intentos máximos a cero', withAssessment({ assessment: { ...assessmentSummary, maxAttempts: 0, attemptsUsed: 0 } }), 'maxAttempts']
  ])('rechaza un aula con evaluación: %s', (_case, body, hint) => {
    expect(() => parseContract(classroomSchema, 'GET classroom/enrollments/x', body)).toThrow(ContractError)
    expect(() => parseContract(classroomSchema, 'GET classroom/enrollments/x', body)).toThrow(hint)
  })

  it.each([
    ['un intento abierto con resultado (filtraría soluciones)', { ...openAttempt, result: gradedAttempt.result }, 'result'],
    ['un intento enviado sin resultado', { ...submittedAttempt, result: null }, 'result'],
    ['estado desconocido', { ...openAttempt, status: 'EXPIRED' }, 'status'],
    ['tipo de pregunta desconocido', { ...openAttempt, questions: [{ ...question, type: 'ESSAY' }] }, 'type'],
    [
      'verdadero/falso con tres opciones',
      { ...openAttempt, questions: [{ ...openAttempt.questions[2], options: openAttempt.questions[1]!.options }] },
      'verdadero'
    ],
    ['resultado sin nota ni pendiente', { ...gradedAttempt, result: { ...gradedAttempt.result, percent: null } }, 'percent'],
    ['respuesta sin pregunta', { ...submittedAttempt, answers: [{ optionIds: [], text: null, submissionId: null }] }, 'questionId'],
    ['plazo sin zona', { ...openAttempt, deadline: '2026-10-28 15:30' }, 'deadline']
  ])('rechaza un intento: %s', (_case, body, hint) => {
    expect(() => parseContract(attemptSchema, 'GET classroom/attempts/x', body)).toThrow(ContractError)
    expect(() => parseContract(attemptSchema, 'GET classroom/attempts/x', body)).toThrow(hint)
  })

  it('rechaza una entrega sin URL de subida', () => {
    expect(() => parseContract(submissionSchema, 'submission', { id: 'ent-1', file: null })).toThrow('uploadUrl')
  })
})

const session = sessions[0]!

describe('contrato de sesiones, finalización y certificado (F3)', () => {
  it('acepta los ejemplos del documento', () => {
    expect(parseContract(sessionListSchema, 'sessions', sessions).map((s) => s.status)).toEqual(['REPROGRAMADA', 'CANCELADA', 'PROGRAMADA'])
    // el docente las recibe sin asistencia
    const { attendance: _attendance, ...withoutAttendance } = session
    expect(parseContract(sessionSchema, 'session', withoutAttendance).attendance).toBeUndefined()
    expect(parseContract(completionSchema, 'completion', completionPending).met).toBe(false)
    expect(parseContract(completionSchema, 'completion', completionMet).rules).toHaveLength(3)
    expect(parseContract(completionSchema, 'completion', { met: true, rules: [] }).met).toBe(true)
    expect(parseContract(certificateSchema, 'certificate', certificate).code).toBe('K7Q2-M9XW-4RTB')
    expect(parseContract(enrollmentSchema, 'enrollment', { ...enrollment, status: 'FINALIZADA', certificateCode: 'K7Q2-M9XW-4RTB' }).certificateCode).toBe(
      'K7Q2-M9XW-4RTB'
    )
    expect(parseContract(enrollmentSchema, 'enrollment', { ...enrollment, certificateCode: null }).certificateCode).toBeNull()
  })

  it.each([
    ['enlace http', { ...session, link: 'http://meet.example/x' }, 'https'],
    ['enlace javascript:', { ...session, link: 'javascript:alert(1)' }, 'https'],
    ['termina antes de empezar', { ...session, end: '2026-09-08T12:00:00Z' }, 'termina antes'],
    ['estado desconocido', { ...session, status: 'SUSPENDIDA' }, 'status'],
    ['asistencia desconocida', { ...session, attendance: 'QUIZAS' }, 'attendance'],
    ['modalidad desconocida', { ...session, modality: 'HIBRIDA' }, 'modality'],
    ['zona inexistente', { ...session, timeZone: 'America/Atlantis' }, 'zona horaria']
  ])('rechaza una sesión: %s', (_case, body, hint) => {
    expect(() => parseContract(sessionSchema, 'GET classroom/enrollments/x/sessions', body)).toThrow(ContractError)
    expect(() => parseContract(sessionSchema, 'GET classroom/enrollments/x/sessions', body)).toThrow(hint)
  })

  it.each([
    ['met que no coincide con sus reglas', { ...completionPending, met: true }, 'met'],
    ['regla desconocida', { met: false, rules: [{ rule: 'PAGO', met: false, detail: '' }] }, 'rule'],
    ['reglas que faltan', { met: true }, 'rules']
  ])('rechaza una finalización: %s', (_case, body, hint) => {
    expect(() => parseContract(completionSchema, 'completion', body)).toThrow(hint)
  })

  it.each([
    ['sin código', { ...certificate, code: '' }, 'code'],
    ['sin titular', { ...certificate, holderName: '' }, 'holderName'],
    ['fecha de la edición mal formada', { ...certificate, offering: { ...certificate.offering, endDate: '16/10/2026' } }, 'endDate'],
    ['horas como texto', { ...certificate, totalHours: '18' }, 'totalHours']
  ])('rechaza un certificado: %s', (_case, body, hint) => {
    expect(() => parseContract(certificateSchema, 'certificate', body)).toThrow(hint)
  })
})
