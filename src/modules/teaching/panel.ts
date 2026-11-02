import type { Session } from '../../shared/sessions'
import type { PendingAttempt, TeachingOffering } from './contract'

// lo que decide el panel docente, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

// el servidor no tiene una vista agregada: cada edición cuesta hasta dos peticiones (su cola y sus sesiones). con 8 ya son 16 más
// la lista, y quien enseña rara vez lleva más a la vez. el tope se aplica por trabajo pendiente, nunca a las cifras (que salen de
// la lista), y el panel dice cuándo lo aplicó, para que un bloque vacío no se lea como «no hay nada»
export const MAX_PANEL_OFFERINGS = 8
// lo que cabe en cada bloque sin alejar lo de abajo: el resto se cuenta, y las entregas llevan a su cola
export const MAX_TRAY_ROWS = 5
export const MAX_AGENDA_ROWS = 6

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function isLive({ status }: TeachingOffering): boolean {
  return status !== 'FINALIZADA' && status !== 'CANCELADA'
}

export function panelFigures(offerings: TeachingOffering[]) {
  return {
    offerings: offerings.length,
    pending: offerings.reduce((sum, offering) => sum + offering.pendingAttempts, 0),
    enrolled: offerings.reduce((sum, offering) => sum + offering.enrolled, 0)
  }
}

// por qué este orden: primero lo que ya espera a alguien (más intentos sin corregir, aunque la edición haya terminado: esas notas
// siguen debiéndose); luego lo que sigue vivo, antes que lo finalizado o cancelado; y a igualdad, lo que empezó antes
export function byWork(offerings: TeachingOffering[]): TeachingOffering[] {
  return [...offerings].sort(
    (a, b) =>
      b.pendingAttempts - a.pendingAttempts || Number(isLive(b)) - Number(isLive(a)) || a.startDate.localeCompare(b.startDate) || a.code.localeCompare(b.code)
  )
}

// qué se lee de cada edición: su cola, si tiene algo por corregir; sus sesiones, si sigue viva (una edición terminada ya no tiene
// agenda). por trabajo, así el tope deja fuera lo que menos urge
export function panelPlan(offerings: TeachingOffering[]) {
  const sorted = byWork(offerings)
  const withWork = sorted.filter((offering) => offering.pendingAttempts > 0)
  const live = sorted.filter(isLive)
  return {
    grading: withWork.slice(0, MAX_PANEL_OFFERINGS),
    gradingCapped: withWork.length > MAX_PANEL_OFFERINGS,
    agenda: live.slice(0, MAX_PANEL_OFFERINGS),
    agendaCapped: live.length > MAX_PANEL_OFFERINGS
  }
}

export function oldestFirst(attempts: PendingAttempt[]): PendingAttempt[] {
  return [...attempts].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
}

// los grupos con la entrega más antigua arriba, con sus entregas ya ordenadas. lo que aún no se sabe (cargando o con error), al final
export function groupsByOldest<T extends { attempts: PendingAttempt[] }>(groups: T[]): T[] {
  const age = ({ attempts }: T) => (attempts[0] ? Date.parse(attempts[0].submittedAt) : Infinity)
  return [...groups].sort((a, b) => (age(a) === age(b) ? 0 : age(a) - age(b)))
}

// cuánto lleva esperando una entrega, en la unidad mayor que cabe. sin meses: «hace 45 días» es exacto y se compara mejor
export function submittedAge(instant: string, now: number, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  const elapsed = now - Date.parse(instant)
  if (elapsed >= DAY_MS) return format.format(-Math.floor(elapsed / DAY_MS), 'day')
  if (elapsed >= HOUR_MS) return format.format(-Math.floor(elapsed / HOUR_MS), 'hour')
  return format.format(-Math.max(1, Math.floor(elapsed / MINUTE_MS)), 'minute')
}

// sin canceladas y de la más próxima a la más lejana. la que está en curso aún cuenta: es cuando se pasa asistencia
export function upcomingSessions<T extends Pick<Session, 'status' | 'start' | 'end'>>(sessions: T[], now: number): T[] {
  return sessions.filter((session) => session.status !== 'CANCELADA' && Date.parse(session.end) > now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}
