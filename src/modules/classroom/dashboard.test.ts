import { describe, expect, it } from 'vitest'
import { classroomPanelSchema, enrollmentListSchema, type Enrollment } from './contract'
import { sessionListSchema, upcomingSessions, type Session } from '../../shared/sessions'
import { agendaSchema } from './agenda'
import {
  groupEnrollments,
  liveSessions,
  pickPrimary,
  railAssessments,
  railEnrollments,
  sessionsByDay,
  sessionsWithin,
  weekRange,
  weekSessions
} from './dashboard'
import { agendaItem, assessmentSummary, enrollment, finishedEnrollment, otherEnrollment, panelItem, sessions } from './test/fixtures'

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

describe('las matrículas del riel', () => {
  it('solo las activas, la principal primero', () => {
    const list = parse([otherEnrollment, enrollment, { ...finishedEnrollment, status: 'FINALIZADA' }, { ...enrollment, id: 'retirada', status: 'RETIRADA' }])
    expect(railEnrollments(groupEnrollments(list)).map((item) => item.id)).toEqual([enrollment.id, otherEnrollment.id])
  })

  // antes: «con un tope, y dice que lo aplicó»
  it('todas, por muchas que sean', () => {
    const list = parse(Array.from({ length: 40 }, (_, index) => ({ ...enrollment, id: `mat-${index}` })))
    expect(railEnrollments(groupEnrollments(list))).toHaveLength(40)
  })
})

describe('lo que trae el panel al riel', () => {
  const pending = { lessonId: 'lec-eva', assessment: assessmentSummary }
  const panel = classroomPanelSchema.parse([
    panelItem(enrollment, { pendingAssessments: [pending] }),
    panelItem(otherEnrollment, { pendingAssessments: [pending] }),
    panelItem({ ...enrollment, id: 'cerrada', status: 'FINALIZADA' }, { pendingAssessments: [pending] })
  ])
  const active = panel.slice(0, 2)

  it('las evaluaciones van en el orden de las matrículas del riel, sin las de una que no está en él', () => {
    expect(railAssessments([...active].reverse(), panel).map((row) => row.enrollment.id)).toEqual([otherEnrollment.id, enrollment.id])
  })

  it('una matrícula que el panel no trae no aporta nada', () => {
    expect(railAssessments(active, panel.slice(1)).map((row) => row.enrollment.id)).toEqual([otherEnrollment.id])
  })
})

describe('la semana, de la agenda', () => {
  const DAY = 24 * 3600 * 1000
  const NOW = Date.parse('2026-11-13T12:00:00Z')
  const active = parse([enrollment, otherEnrollment])
  const at = (id: string, base: Parameters<typeof agendaItem>[0], start: string, patch: object = {}) =>
    agendaSchema.parse([agendaItem(base, { ...sessions[2], id, start, end: new Date(Date.parse(start) + 3600 * 1000).toISOString(), ...patch })])[0]!

  it('pide un intervalo redondeado al día que cubre los próximos 7 días, dentro del máximo de 62', () => {
    const range = weekRange(NOW)
    expect(weekRange(NOW + 3600 * 1000)).toEqual(range)
    expect(Date.parse(range.from)).toBeLessThanOrEqual(NOW - 12 * 3600 * 1000)
    expect(Date.parse(range.to)).toBeGreaterThanOrEqual(NOW + 7 * DAY)
    expect(Date.parse(range.to) - Date.parse(range.from)).toBeLessThanOrEqual(62 * DAY)
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('solo de las matrículas activas, sin las terminadas y hasta 7 días; la que está en curso y las canceladas siguen', () => {
    const closed = { ...finishedEnrollment, status: 'FINALIZADA' }
    const agenda = [
      at('en-curso', enrollment, '2026-11-13T11:30:00Z'),
      at('terminada', enrollment, '2026-11-13T09:00:00Z'),
      at('cancelada', otherEnrollment, '2026-11-15T13:00:00Z', { status: 'CANCELADA' }),
      at('cerrada', closed, '2026-11-15T13:00:00Z'),
      at('lejos', enrollment, '2026-11-21T13:00:00Z')
    ]
    const week = weekSessions(agenda, active, NOW)
    expect(week.map((session) => session.id)).toEqual(['en-curso', 'cancelada'])
    expect(liveSessions(week).map((session) => session.id)).toEqual(['en-curso'])
  })

  it('agrupa por día civil en la zona de cada sesión', () => {
    // 2026-11-14T03:00Z es aún el 13 en Lima (UTC−5)
    const days = sessionsByDay([
      at('a', enrollment, '2026-11-13T20:00:00Z'),
      at('b', enrollment, '2026-11-14T03:00:00Z'),
      at('c', enrollment, '2026-11-14T13:00:00Z')
    ])
    expect(days.map((day) => day.sessions.map((session) => session.id))).toEqual([['a', 'b'], ['c']])
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
