import { upcomingSessions } from '../../shared/sessions'
import type { PendingAttempt, TeachingOffering, TeachingPanelItem } from './contract'

// lo que decide el panel docente, sin pintar nada. todo se deriva de forma exacta de lo que da el contrato

// lo que cabe en cada bloque sin alejar lo de abajo: el resto se cuenta, y las entregas llevan a su cola. el panel trae justo estas
// entregas de cada edición (los primeros de la cola)
export const MAX_TRAY_ROWS = 5
export const MAX_AGENDA_ROWS = 6

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function isLive({ status }: Pick<TeachingOffering, 'status'>): boolean {
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
export function byWork<T extends TeachingOffering>(offerings: T[]): T[] {
  return [...offerings].sort(
    (a, b) =>
      b.pendingAttempts - a.pendingAttempts || Number(isLive(b)) - Number(isLive(a)) || a.startDate.localeCompare(b.startDate) || a.code.localeCompare(b.code)
  )
}

// las próximas sesiones de las ediciones vivas (una edición terminada ya no tiene agenda). el servidor las ordena por edición: aquí se
// funden, y el reloj de la pantalla deja fuera la que terminó con la página abierta
export function panelAgenda(items: TeachingPanelItem[], now: number) {
  return upcomingSessions(
    items.filter(isLive).flatMap((item) => item.upcomingSessions.map((session) => ({ ...session, offering: item }))),
    now
  )
}

// cuántas entregas de la edición no caben en la bandeja, con el total real. con menos filas de las que caben ya está toda la cola, aunque
// el total diga más: cuenta todo lo enviado, y la cola deja fuera los intentos propios de quien la mira
export function hiddenAttempts({ pendingAttempts, oldestPending }: Pick<TeachingPanelItem, 'pendingAttempts' | 'oldestPending'>): number {
  return oldestPending.length < MAX_TRAY_ROWS ? 0 : Math.max(0, pendingAttempts - MAX_TRAY_ROWS)
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
