import type { Attempt } from '../src/shared/attempts'
import {
  attendanceRows,
  attemptToGrade,
  offering,
  otherOffering,
  pendingAttempts,
  problem,
  roster,
  teachingSessions
} from '../src/modules/teaching/test/fixtures'

// el espacio docente simulado (ADR-0016): solo las ediciones asignadas a la persona; lo demás, 404 como el servidor.
// el estado vive en la prueba, así una recarga conserva lo que se hizo

export type Reply = { status: number; body: unknown }

export const TEACHING = '/api/lms/teaching/'
const OFFERINGS = '/api/lms/teaching/offerings'

export interface TeachingOptions {
  // sin ninguna edición asignada
  noOfferings?: boolean
}

export function teachingState({ noOfferings = false }: TeachingOptions = {}) {
  const offerings = noOfferings ? [] : structuredClone([offering, otherOffering])
  const rosters: Record<string, unknown[]> = noOfferings ? {} : { [offering.code]: structuredClone(roster), [otherOffering.code]: [] }
  const owned = noOfferings ? [] : [offering.code]
  return {
    offerings,
    rosters,
    queues: Object.fromEntries(owned.map((code) => [code, structuredClone(pendingAttempts)])) as Record<string, typeof pendingAttempts>,
    attempts: new Map<string, Attempt>(noOfferings ? [] : [[attemptToGrade.id, structuredClone(attemptToGrade) as Attempt]]),
    // el historial de calificaciones, solo inserción como lms.calificacion
    gradeHistory: [] as { questionId: string; points: number; reason: string | null }[],
    sessions: Object.fromEntries(owned.map((code) => [code, structuredClone(teachingSessions)])) as Record<string, Row[]>,
    attendance: new Map<string, typeof attendanceRows>(noOfferings ? [] : [[teachingSessions[0]!.id, structuredClone(attendanceRows)]]),
    lastSession: 10
  }
}

type Row = Omit<(typeof teachingSessions)[number], 'link' | 'location' | 'originalSessionId'> & {
  link: string | null
  location: string | null
  originalSessionId: string | null
}

export type TeachingState = ReturnType<typeof teachingState>

const conflict = (detail: string): Reply => ({ status: 409, body: problem(409, detail) })
const invalid = (detail: string): Reply => ({ status: 400, body: problem(400, detail) })
const notFound = (what: string): Reply => ({ status: 404, body: problem(404, `${what} no encontrada`) })

// calificar como el servidor: puntos en rango, motivo al cambiar una nota ya puesta, y al no quedar pendientes el intento
// pasa a GRADED con su nota y sale de la cola
function grade(state: TeachingState, attempt: Attempt, body: { questionId?: string; points?: number; comment?: string | null; reason?: string | null }): Reply {
  const outcome = attempt.result?.questions.find((candidate) => candidate.questionId === body.questionId)
  const result = attempt.result
  if (!result || !outcome) return notFound('Pregunta')
  const points = Number(body.points)
  if (!(points >= 0 && points <= outcome.maxPoints)) return invalid('Puntos fuera de rango')
  if (outcome.points !== null && !body.reason) return conflict('Cambiar una nota ya puesta exige un motivo')
  outcome.points = points
  outcome.comment = body.comment ?? null
  state.gradeHistory.push({ questionId: outcome.questionId, points, reason: body.reason ?? null })
  result.score = result.questions.reduce((sum, candidate) => sum + (candidate.points ?? 0), 0)
  result.pending = result.questions.some((candidate) => candidate.points === null)
  if (!result.pending) {
    result.percent = Math.round((result.score * 100) / result.maxScore)
    result.passed = result.percent >= 70
    attempt.status = 'GRADED'
    for (const code of Object.keys(state.queues)) state.queues[code] = state.queues[code]!.filter((queued) => queued.attemptId !== attempt.id)
  }
  return { status: 200, body: attempt }
}

interface NewSession {
  title: string
  type: string
  modality: string
  durationMinutes: number
  link: string | null
  location: string | null
  originalSessionId?: string
  recurrence: { pattern: string; days: string[]; startDate: string; endDate: string; localTime: string }
}

const WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
// Lima no tiene horario de verano: la hora local son siempre 5 h menos que UTC
const limaInstant = (date: string, time: string) => new Date(`${date}T${time}:00-05:00`)
const iso = (date: Date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

function createSessions(state: TeachingState, code: string, body: NewSession): Reply {
  if (body.link && !body.link.startsWith('https://')) return invalid('El enlace solo puede ser https')
  const { pattern, days, startDate, endDate, localTime } = body.recurrence
  const created: Row[] = []
  let index = 0
  for (let day = new Date(`${startDate}T00:00:00Z`); day <= new Date(`${endDate}T00:00:00Z`); day = new Date(day.getTime() + 86_400_000), index++) {
    const selected =
      pattern === 'ONCE' ? index === 0 : pattern === 'DAILY' ? true : pattern === 'ALTERNATE_DAYS' ? index % 2 === 0 : days.includes(WEEK[day.getUTCDay()]!)
    if (!selected) continue
    const start = limaInstant(day.toISOString().slice(0, 10), localTime)
    created.push({
      id: `ses-${++state.lastSession}`,
      title: body.title,
      type: body.type,
      modality: body.modality,
      start: iso(start),
      end: iso(new Date(start.getTime() + body.durationMinutes * 60_000)),
      timeZone: 'America/Lima',
      status: 'PROGRAMADA',
      link: body.link,
      location: body.location,
      lessonId: null,
      originalSessionId: body.originalSessionId ?? null
    })
  }
  state.sessions[code]!.push(...created)
  for (const session of created) state.attendance.set(session.id, structuredClone(attendanceRows))
  return { status: 201, body: created }
}

function simulateSession(state: TeachingState, method: string, id: string, action: string, body: Record<string, unknown>): Reply | undefined {
  const session = Object.values(state.sessions)
    .flat()
    .find((candidate) => candidate.id === id)
  if (!session) return notFound('Sesión')
  if (method === 'POST' && action === 'cancel') {
    if (!body.reason) return invalid('Falta el motivo')
    session.status = 'CANCELADA'
    return { status: 200, body: session }
  }
  if (method === 'POST' && action === 'reschedule') {
    if (!body.reason) return invalid('Falta el motivo')
    const length = Date.parse(session.end) - Date.parse(session.start)
    const start = limaInstant(String(body.date), String(body.localTime))
    Object.assign(session, { status: 'REPROGRAMADA', start: iso(start), end: iso(new Date(start.getTime() + length)) })
    return { status: 200, body: session }
  }
  const rows = state.attendance.get(id) ?? []
  if (method === 'GET' && action === 'attendance') return { status: 200, body: rows }
  if (method === 'PUT' && action === 'attendance') {
    const records = (body.records ?? []) as { enrollmentId: string; status: string }[]
    const changesRecorded = records.some((record) => {
      const previous = rows.find((row) => row.enrollmentId === record.enrollmentId)?.status
      return previous != null && previous !== record.status
    })
    if (changesRecorded && !body.reason) return conflict('Cambiar una asistencia ya registrada exige un motivo')
    for (const record of records) Object.assign(rows.find((row) => row.enrollmentId === record.enrollmentId) ?? {}, { status: record.status })
    return { status: 200, body: rows }
  }
  return undefined
}

export function simulateTeaching(state: TeachingState, method: string, url: URL, body: unknown): Reply | undefined {
  if (!url.pathname.startsWith(TEACHING)) return undefined
  if (method === 'GET' && url.pathname === OFFERINGS) return { status: 200, body: state.offerings }
  const [code, rest] = url.pathname
    .slice(OFFERINGS.length + 1)
    .split(/\/(.*)/s)
    .map((part) => (part === undefined ? undefined : decodeURIComponent(part)))
  if (url.pathname.startsWith(`${OFFERINGS}/`)) {
    if (!code || !(code in state.rosters)) return notFound('Edición')
    if (method === 'GET' && rest === 'students') return { status: 200, body: state.rosters[code] }
    if (method === 'GET' && rest === 'attempts') return { status: 200, body: state.queues[code] ?? [] }
    if (method === 'GET' && rest === 'sessions') return { status: 200, body: state.sessions[code] ?? [] }
    if (method === 'POST' && rest === 'sessions') return createSessions(state, code, body as NewSession)
    return undefined
  }
  const attemptMatch = /^\/api\/lms\/teaching\/attempts\/([^/]+)(\/grades)?$/.exec(url.pathname)
  if (attemptMatch) {
    const attempt = state.attempts.get(decodeURIComponent(attemptMatch[1]!))
    if (!attempt) return notFound('Intento')
    if (method === 'GET' && !attemptMatch[2]) return { status: 200, body: attempt }
    if (method === 'POST' && attemptMatch[2]) return grade(state, attempt, (body ?? {}) as Parameters<typeof grade>[2])
    return undefined
  }
  const sessionMatch = /^\/api\/lms\/teaching\/sessions\/([^/]+)\/(cancel|reschedule|attendance)$/.exec(url.pathname)
  if (sessionMatch) return simulateSession(state, method, decodeURIComponent(sessionMatch[1]!), sessionMatch[2]!, (body ?? {}) as Record<string, unknown>)
  return undefined
}
