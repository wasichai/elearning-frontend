import { offering, otherOffering, problem, roster } from '../src/modules/teaching/test/fixtures'

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
  return { offerings, rosters }
}

export type TeachingState = ReturnType<typeof teachingState>

const notFound = (what: string): Reply => ({ status: 404, body: problem(404, `${what} no encontrada`) })

export function simulateTeaching(state: TeachingState, method: string, url: URL): Reply | undefined {
  if (!url.pathname.startsWith(TEACHING)) return undefined
  if (method === 'GET' && url.pathname === OFFERINGS) return { status: 200, body: state.offerings }
  const [code, rest] = url.pathname
    .slice(OFFERINGS.length + 1)
    .split(/\/(.*)/s)
    .map((part) => (part === undefined ? undefined : decodeURIComponent(part)))
  if (url.pathname.startsWith(`${OFFERINGS}/`)) {
    if (!code || !(code in state.rosters)) return notFound('Edición')
    if (method === 'GET' && rest === 'students') return { status: 200, body: state.rosters[code] }
  }
  return undefined
}
