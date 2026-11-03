import { problem } from '../src/modules/catalog/test/fixtures'

// los términos de uso simulados (docs/api/lms.md, ADR-0037 del backend): lo que dicen GET, POST y DELETE, y la puerta de la matrícula y el
// progreso. el estudiante de la simulación ya los aceptó, como en la semilla, salvo que la prueba pida otra cosa

type Reply = { status: number; body: unknown }

export const TERMS_API = '/api/lms/terms'
const ACCEPTANCE_API = `${TERMS_API}/acceptance`

const TERMS_TEXT = `1. Qué datos tratamos
Tu nombre, tu correo, tus matrículas, tu progreso, tus intentos y tus calificaciones. No tratamos datos de pago ni documentos de identidad.

2. Para qué los tratamos
Para darte acceso a los cursos, registrar tu avance y emitir tus certificados.

3. Cuánto tiempo
Los conservamos el plazo que aceptas aquí. Si lo retiras o vence, se suprimen, y lo que deba conservarse queda sin tu nombre.

<b>Esta etiqueta es texto y no se interpreta.</b>`

export const PUBLISHED_TERMS = { version: 3, text: TERMS_TEXT, retentionDays: 730, publishedAt: '2026-11-01T15:00:00Z' }

export type TermsScenario = 'accepted' | 'none' | 'older' | 'withdrawn' | 'expired' | 'unpublished'

const acceptance = (over: object = {}) => ({
  version: 3,
  acceptedAt: '2026-11-02T15:00:00Z',
  expiresAt: '2028-11-01T15:00:00Z',
  withdrawnAt: null as string | null,
  valid: true,
  ...over
})

export interface TermsState {
  current: { version: number; text: string; retentionDays: number; publishedAt: string } | null
  acceptance: ReturnType<typeof acceptance> | null
}

export function termsState(scenario: TermsScenario = 'accepted'): TermsState {
  switch (scenario) {
    case 'none':
      return { current: PUBLISHED_TERMS, acceptance: null }
    case 'older':
      return { current: PUBLISHED_TERMS, acceptance: acceptance({ version: 2 }) }
    case 'withdrawn':
      return { current: PUBLISHED_TERMS, acceptance: acceptance({ valid: false, withdrawnAt: '2026-11-03T15:00:00Z' }) }
    case 'expired':
      return { current: PUBLISHED_TERMS, acceptance: acceptance({ valid: false, expiresAt: '2026-11-03T15:00:00Z' }) }
    case 'unpublished':
      return { current: null, acceptance: null }
    default:
      return { current: PUBLISHED_TERMS, acceptance: acceptance() }
  }
}

export const isTerms = (url: URL) => url.pathname === TERMS_API || url.pathname === ACCEPTANCE_API

// la puerta: se comprueba antes que nada, como EnrollmentService y LessonProgressService
export function termsGate(state: TermsState, doing: string): Reply | undefined {
  if (state.acceptance?.valid) return undefined
  return { status: 403, body: problem(403, `Para ${doing} debes aceptar los términos de uso vigentes (o renovarlos si tu aceptación venció o la retiraste)`) }
}

export function simulateTerms(state: TermsState, method: string, url: URL, body: unknown, canPublish: boolean): Reply | undefined {
  if (url.pathname === TERMS_API && method === 'GET') return { status: 200, body: { current: state.current, acceptance: state.acceptance } }
  if (url.pathname === TERMS_API && method === 'POST') return publish(state, body, canPublish)
  if (url.pathname === ACCEPTANCE_API && method === 'POST') return accept(state, body)
  if (url.pathname === ACCEPTANCE_API && method === 'DELETE') return withdraw(state)
  return undefined
}

function publish(state: TermsState, body: unknown, canPublish: boolean): Reply {
  if (!canPublish) return { status: 403, body: problem(403, 'Forbidden') }
  const { text, retentionDays } = (body ?? {}) as { text?: string; retentionDays?: number }
  const errors = [
    ...(!text?.trim() ? [{ field: 'text', message: 'must have between 1 and 100000 characters' }] : []),
    ...(!retentionDays || retentionDays < 1 || retentionDays > 36_500
      ? [{ field: 'retentionDays', message: 'must be a number of days between 1 and 36500' }]
      : [])
  ]
  if (errors.length > 0) return { status: 400, body: { ...problem(400, 'Invalid terms of use'), errors } }
  const version = (state.current?.version ?? 0) + 1
  state.current = { version, text: text!.trim(), retentionDays: retentionDays!, publishedAt: '2026-11-03T15:00:00Z' }
  return { status: 201, body: state.current }
}

function accept(state: TermsState, body: unknown): Reply {
  if (!state.current) return { status: 409, body: problem(409, 'La organización aún no publicó sus términos de uso') }
  const version = (body as { version?: number } | null)?.version
  if (version !== state.current.version) return { status: 409, body: problem(409, `Los términos de uso vigentes son la versión ${state.current.version}`) }
  if (state.acceptance && !state.acceptance.valid) {
    return { status: 409, body: problem(409, 'Tus datos de la aceptación anterior se están suprimiendo: vuelve a aceptar en unos minutos') }
  }
  state.acceptance = acceptance({ version, acceptedAt: '2026-11-03T15:00:00Z' })
  return { status: 200, body: state.acceptance }
}

function withdraw(state: TermsState): Reply {
  if (!state.acceptance) return { status: 404, body: problem(404, 'No tienes una aceptación de los términos de uso') }
  state.acceptance = { ...state.acceptance, valid: false, withdrawnAt: '2026-11-03T15:00:00Z' }
  return { status: 202, body: { jobId: '6f1c1e2a-1111-4222-8333-444455556666' } }
}
