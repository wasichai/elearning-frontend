import { describe, expect, it } from 'vitest'
import { enrollmentListSchema, classroomSchema, type Classroom, type Enrollment } from './contract'
import { sessionListSchema, upcomingSessions, type Session } from '../../shared/sessions'
import { groupEnrollments, pendingAssessments, pickPrimary, railEnrollments, MAX_RAIL_COURSES, sessionsWithin } from './dashboard'
import { assessmentClassroom, assessmentSummary, classroom, enrollment, finishedEnrollment, otherEnrollment, sessions } from './test/fixtures'

const parse = (list: unknown[]): Enrollment[] => enrollmentListSchema.parse(list)
const withProgress = (completedLessons: number, totalLessons: number) => ({
  progress: { completedLessons, totalLessons, percent: totalLessons === 0 ? 0 : Math.floor((completedLessons * 100) / totalLessons) }
})

describe('la matrícula principal de «Continuar aprendiendo»', () => {
  it('es la que ya tiene avance, aunque el servidor ponga antes otra sin empezar', () => {
    const [unstarted, started] = parse([
      { ...otherEnrollment, id: 'sin-empezar' },
      { ...enrollment, id: 'con-avance', ...withProgress(1, 3) }
    ])
    expect(pickPrimary([unstarted!, started!])?.id).toBe('con-avance')
  })

  it('entre las que tienen avance, la que está más cerca de terminar', () => {
    const list = parse([
      { ...enrollment, id: 'a', ...withProgress(1, 4) },
      { ...enrollment, id: 'b', ...withProgress(3, 4) }
    ])
    expect(pickPrimary(list)?.id).toBe('b')
  })

  it('a igual avance, respeta el orden del servidor (la de inicio más próximo primero)', () => {
    const list = parse([
      { ...enrollment, id: 'a', ...withProgress(1, 2) },
      { ...enrollment, id: 'b', ...withProgress(2, 4) }
    ])
    expect(pickPrimary(list)?.id).toBe('a')
  })

  it('una edición terminada o cancelada cede ante otra que sigue viva, aunque lleve más avance', () => {
    const closed = (status: string, id: string) => ({ ...enrollment, id, offering: { ...enrollment.offering, status }, ...withProgress(3, 4) })
    const list = parse([closed('FINALIZADA', 'terminada'), closed('CANCELADA', 'cancelada'), { ...otherEnrollment, id: 'viva' }])
    expect(pickPrimary(list)?.id).toBe('viva')
    expect(pickPrimary(list.slice(0, 2))?.id).toBe('terminada')
  })

  it('no hay principal sin siguiente lección ni en una matrícula que no está activa', () => {
    const list = parse([
      finishedEnrollment,
      { ...enrollment, id: 'finalizada', status: 'FINALIZADA' },
      { ...enrollment, id: 'retirada', status: 'RETIRADA' },
      { ...enrollment, id: 'certificada', certificateCode: 'K7Q2' }
    ])
    expect(pickPrimary(list)).toBeUndefined()
  })
})

describe('los grupos del panel', () => {
  it('cada matrícula cae en uno solo y ninguna se pierde, sea cual sea su estado', () => {
    const list = parse([
      enrollment,
      otherEnrollment,
      finishedEnrollment,
      { ...enrollment, id: 'finalizada', status: 'FINALIZADA' },
      { ...finishedEnrollment, id: 'certificada', status: 'FINALIZADA', certificateCode: 'K7Q2' },
      { ...enrollment, id: 'retirada', status: 'RETIRADA' },
      { ...enrollment, id: 'sin-lecciones', ...withProgress(0, 0), nextLesson: null }
    ])
    const groups = groupEnrollments(list)

    expect(groups.primary?.id).toBe(enrollment.id)
    expect(groups.inProgress.map((item) => item.id)).toEqual([otherEnrollment.id, 'sin-lecciones'])
    expect(groups.completed.map((item) => item.id)).toEqual([finishedEnrollment.id, 'finalizada', 'certificada'])
    expect(groups.withdrawn.map((item) => item.id)).toEqual(['retirada'])
  })
})

describe('las matrículas que lee el riel', () => {
  it('solo las activas, la principal primero', () => {
    const list = parse([otherEnrollment, enrollment, { ...finishedEnrollment, status: 'FINALIZADA' }, { ...enrollment, id: 'retirada', status: 'RETIRADA' }])
    const rail = railEnrollments(groupEnrollments(list))
    expect(rail.read.map((item) => item.id)).toEqual([enrollment.id, otherEnrollment.id])
    expect(rail.capped).toBe(false)
  })

  it('con un tope, y dice que lo aplicó', () => {
    const list = parse(Array.from({ length: MAX_RAIL_COURSES + 2 }, (_, index) => ({ ...enrollment, id: `mat-${index}` })))
    const rail = railEnrollments(groupEnrollments(list))
    expect(rail.read).toHaveLength(MAX_RAIL_COURSES)
    expect(rail.capped).toBe(true)
  })
})

describe('las próximas sesiones', () => {
  const list: Session[] = sessionListSchema.parse(sessions)
  const NOW = Date.parse('2026-09-15T12:00:00Z')

  it('sin las pasadas ni las canceladas, de la más próxima a la más lejana', () => {
    expect(upcomingSessions(list, NOW).map((session) => session.id)).toEqual(['ses-3'])
    expect(upcomingSessions(list, Date.parse('2026-09-01T00:00:00Z')).map((session) => session.id)).toEqual(['ses-1', 'ses-3'])
  })

  it('la que está en curso sigue siendo útil: aún se puede entrar', () => {
    expect(upcomingSessions(list, Date.parse('2026-09-08T13:30:00Z')).map((session) => session.id)).toEqual(['ses-1', 'ses-3'])
  })

  it('cuenta las de los próximos 7 días exactos', () => {
    const start = Date.parse('2026-11-17T13:00:00Z')
    const day = 24 * 3600 * 1000
    expect(sessionsWithin(upcomingSessions(list, start - 7 * day + 1000), start - 7 * day + 1000, 7)).toHaveLength(1)
    expect(sessionsWithin(upcomingSessions(list, start - 7 * day - 1000), start - 7 * day - 1000, 7)).toHaveLength(0)
  })
})

describe('las evaluaciones pendientes', () => {
  const lessonWith = (assessment: object | null, overrides: object = {}): Classroom => {
    const base = structuredClone(assessmentClassroom) as Record<string, unknown> & { units: { lessons: Record<string, unknown>[] }[] }
    const lesson = base.units[0]!.lessons.find((candidate) => candidate.id === 'lec-eva')!
    Object.assign(lesson, { assessment }, overrides)
    return classroomSchema.parse(base)
  }
  const pendingOf = (data: Classroom) => pendingAssessments(data).map((item) => item.lesson.id)

  it('una sin hacer y con intentos', () => {
    expect(pendingOf(lessonWith({ ...assessmentSummary }))).toEqual(['lec-eva'])
  })

  it('sin intentos, ya no está pendiente', () => {
    expect(pendingOf(lessonWith({ ...assessmentSummary, attemptsUsed: assessmentSummary.maxAttempts }))).toEqual([])
  })

  it('sin intentos pero con uno abierto, sí', () => {
    expect(pendingOf(lessonWith({ ...assessmentSummary, attemptsUsed: assessmentSummary.maxAttempts, openAttemptId: 'int-1' }))).toEqual(['lec-eva'])
  })

  it('aprobada, ya no', () => {
    const progress = { status: 'APROBADA', startedAt: '2026-09-08T14:00:00Z', completedAt: '2026-09-08T15:00:00Z', evidence: 'X' }
    expect(pendingOf(lessonWith({ ...assessmentSummary }, { progress }))).toEqual([])
  })

  it('una que aún no se puede hacer (NOT_YET), tampoco', () => {
    expect(pendingOf(lessonWith({ ...assessmentSummary }, { completion: 'NOT_YET' }))).toEqual([])
  })

  it('una lección sin evaluación no cuenta', () => {
    expect(pendingAssessments(classroomSchema.parse(classroom))).toEqual([])
  })
})
