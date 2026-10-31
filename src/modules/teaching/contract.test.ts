import { describe, expect, it } from 'vitest'
import { ContractError, parseContract, rosterSchema, teachingOfferingListSchema } from './contract'
import { offering, otherOffering, roster } from './test/fixtures'

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
