import { describe, expect, it } from 'vitest'
import { attendanceRowListSchema, ContractError, parseContract, pendingAttemptListSchema, rosterSchema, teachingOfferingListSchema } from './contract'
import { attemptSchema } from '../../shared/attempts'
import { sessionListSchema } from '../../shared/sessions'
import { attemptGraded, attemptToGrade, attendanceRows, offering, otherOffering, pendingAttempts, roster, teachingSessions } from './test/fixtures'

const student = roster[0]!

describe('contrato del espacio docente', () => {
  it('acepta los ejemplos del documento, también listas vacías y campos nuevos', () => {
    expect(parseContract(teachingOfferingListSchema, 'offerings', [offering, otherOffering])).toHaveLength(2)
    expect(parseContract(teachingOfferingListSchema, 'offerings', [])).toEqual([])
    expect(parseContract(rosterSchema, 'roster', roster)[1]?.assessments[0]?.bestPercent).toBe(85)
    expect(parseContract(rosterSchema, 'roster', [{ ...student, phone: null }])).toHaveLength(1)
    expect(parseContract(rosterSchema, 'roster', [{ ...student, email: null }])[0]?.email).toBeNull()
  })

  it.each([
    ['estado de edición desconocido', [{ ...offering, status: 'ARCHIVADA' }], 'status'],
    ['matriculados negativos', [{ ...offering, enrolled: -1 }], 'enrolled'],
    ['intentos por corregir con decimales', [{ ...offering, pendingAttempts: 1.5 }], 'pendingAttempts'],
    ['fecha mal formada', [{ ...offering, startDate: '07/09/2026' }], 'startDate'],
    ['zona inexistente', [{ ...offering, timeZone: 'Mars/Olympus' }], 'zona horaria'],
    ['sin curso', [{ ...offering, course: null }], 'course']
  ])('rechaza mis ediciones: %s', (_case, body, hint) => {
    expect(() => parseContract(teachingOfferingListSchema, 'GET teaching/offerings', body)).toThrow(ContractError)
    expect(() => parseContract(teachingOfferingListSchema, 'GET teaching/offerings', body)).toThrow(hint)
  })

  it.each([
    ['más asistencias que sesiones', [{ ...student, attendance: { attended: 3, total: 2 } }], 'asistencias'],
    ['estado de matrícula desconocido', [{ ...student, status: 'PAUSADA' }], 'status'],
    ['progreso sobre 100', [{ ...student, progress: { ...student.progress, percent: 120 } }], 'percent'],
    ['nota sobre 100', [{ ...student, assessments: [{ ...student.assessments[0], bestPercent: 101 }] }], 'bestPercent'],
    ['evaluaciones que no son lista', [{ ...student, assessments: null }], 'assessments']
  ])('rechaza los matriculados: %s', (_case, body, hint) => {
    expect(() => parseContract(rosterSchema, 'GET teaching/offerings/x/students', body)).toThrow(ContractError)
    expect(() => parseContract(rosterSchema, 'GET teaching/offerings/x/students', body)).toThrow(hint)
  })
})

describe('contrato de corrección, sesiones y asistencia', () => {
  it('acepta los ejemplos del documento', () => {
    expect(parseContract(pendingAttemptListSchema, 'queue', pendingAttempts)[0]?.pendingQuestions).toBe(2)
    expect(parseContract(pendingAttemptListSchema, 'queue', [{ ...pendingAttempts[0], email: null }])[0]?.email).toBeNull()
    expect(parseContract(attemptSchema, 'attempt', attemptToGrade).answers[2]?.submission?.file?.name).toBe('liquidacion.pdf')
    expect(parseContract(attemptSchema, 'attempt', attemptGraded).result?.passed).toBe(true)
    expect(parseContract(sessionListSchema, 'sessions', teachingSessions)[0]?.attendance).toBeUndefined()
    expect(parseContract(attendanceRowListSchema, 'attendance', attendanceRows)[0]?.status).toBeNull()
  })

  it.each([
    ['sin preguntas por corregir', [{ ...pendingAttempts[0], pendingQuestions: 0 }], 'pendingQuestions'],
    ['fecha de envío sin zona', [{ ...pendingAttempts[0], submittedAt: '2026-10-28 15:20' }], 'submittedAt'],
    ['sin lección', [{ ...pendingAttempts[0], lessonId: undefined }], 'lessonId']
  ])('rechaza la cola: %s', (_case, body, hint) => {
    expect(() => parseContract(pendingAttemptListSchema, 'queue', body)).toThrow(ContractError)
    expect(() => parseContract(pendingAttemptListSchema, 'queue', body)).toThrow(hint)
  })

  it.each([
    ['estado desconocido', [{ ...attendanceRows[0], status: 'QUIZAS' }], 'status'],
    ['sin matrícula', [{ ...attendanceRows[0], enrollmentId: '' }], 'enrollmentId']
  ])('rechaza la asistencia: %s', (_case, body, hint) => {
    expect(() => parseContract(attendanceRowListSchema, 'attendance', body)).toThrow(hint)
  })
})
