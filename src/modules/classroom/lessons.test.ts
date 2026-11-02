import { describe, expect, it } from 'vitest'
import type { Session } from '../../shared/sessions'
import { assessmentFigure, attendanceFigure } from './lessons'
import { assessmentClassroom, sessions } from './test/fixtures'
import type { Classroom } from './contract'

const units = assessmentClassroom.units as unknown as Classroom['units']
const withBest = (passed: boolean | null, pending = false) =>
  units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) =>
      lesson.assessment ? { ...lesson, assessment: { ...lesson.assessment, best: { percent: passed === null ? null : 80, passed, pending } } } : lesson
    )
  }))

// las mismas cuentas que la regla de finalización del servidor (CompletionService): lo que se ve aquí no contradice a «Finalización»
describe('las cifras de avance', () => {
  it('evaluaciones: cuentan todas las de lecciones; aprobada solo con best.passed', () => {
    expect(assessmentFigure(units)).toEqual({ completed: 0, total: 1 })
    expect(assessmentFigure(withBest(true))).toEqual({ completed: 1, total: 1 })
    expect(assessmentFigure(withBest(false))).toEqual({ completed: 0, total: 1 })
    // esperando corrección no está aprobada todavía
    expect(assessmentFigure(withBest(null, true))).toEqual({ completed: 0, total: 1 })
  })

  it('asistencia: sobre las no canceladas, también las futuras; presente y tarde cuentan', () => {
    const list = sessions as unknown as Session[]
    expect(attendanceFigure(list)).toEqual({ completed: 1, total: 2 })
    expect(
      attendanceFigure([
        { ...list[0]!, attendance: 'TARDE' },
        { ...list[2]!, attendance: 'JUSTIFICADO' }
      ])
    ).toEqual({ completed: 1, total: 2 })
    expect(attendanceFigure([{ ...list[1]! }])).toEqual({ completed: 0, total: 0 })
  })
})
