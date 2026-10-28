import { describe, expect, it } from 'vitest'
import { classroomSchema, ContractError, enrollmentListSchema, enrollmentSchema, lessonProgressSchema, parseContract } from './contract'
import { classroom, enrollment, finishedEnrollment } from './test/fixtures'

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
