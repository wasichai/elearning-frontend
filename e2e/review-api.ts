import { otherVersionInReview, problem, versionDetail } from '../src/modules/review/test/fixtures'

// la bandeja del revisor simulada (ADR-0018): las versiones en revisión a cargo de la persona; lo demás, 404 como el
// servidor. el estado vive en la prueba, así una recarga conserva lo que se hizo

export type Reply = { status: number; body: unknown }

export const REVIEW = '/api/lms/review/'
const VERSIONS = '/api/lms/review/versions'
const MAX_TEXT = 4000
// PEDIR_CAMBIOS devuelve a BORRADOR y RECHAZAR retira, como EditorialWorkflowGuard
const TARGETS: Record<string, string> = { APROBAR: 'APROBADA', PEDIR_CAMBIOS: 'BORRADOR', RECHAZAR: 'RETIRADA' }

interface Decision {
  decision: string
  reason: string | null
  authorId: string
  at: string
}
type Detail = Omit<typeof versionDetail, 'status' | 'reviewerId' | 'decisions'> & { status: string; reviewerId: string | null; decisions: Decision[] }

export function reviewState() {
  const versions: Detail[] = [structuredClone(versionDetail), { ...structuredClone(otherVersionInReview), units: [], comments: [], decisions: [] }]
  return { versions, lastComment: 10 }
}

export type ReviewState = ReturnType<typeof reviewState>

const conflict = (detail: string): Reply => ({ status: 409, body: problem(409, detail) })
const invalid = (detail: string): Reply => ({ status: 400, body: problem(400, detail) })
const notFound = (what: string): Reply => ({ status: 404, body: problem(404, `${what} no encontrada`) })
const now = () => new Date().toISOString()

// el resumen (StudioVersion) que devuelven la bandeja, decidir y publicar
function summary(version: Detail) {
  const { id, number, status, course, authorId, reviewerId, updatedAt } = version
  return { id, number, status, course, authorId, reviewerId, updatedAt, openComments: version.comments.filter((comment) => !comment.resolved).length }
}

function detail(version: Detail) {
  return { ...version, ...summary(version) }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function simulateVersion(state: ReviewState, method: string, version: Detail, action: string | undefined, body: Record<string, unknown>): Reply | undefined {
  if (method === 'GET' && !action) return { status: 200, body: detail(version) }
  if (method === 'POST' && action === 'comments') {
    const section = text(body.section)
    const written = text(body.text)
    if (!section || !written || written.length > MAX_TEXT) return invalid('Faltan la sección o el texto')
    if (version.status !== 'EN_REVISION') return conflict('Solo se comenta una versión en revisión')
    const comment = { id: `com-${++state.lastComment}`, section, text: written, authorId: 'u-revisor', createdAt: now(), resolved: false }
    version.comments.push(comment)
    return { status: 201, body: comment }
  }
  if (method === 'POST' && action === 'decision') {
    const decision = String(body.decision ?? '')
    const reason = text(body.reason)
    if (!(decision in TARGETS)) return invalid('Decisión desconocida')
    if (!reason && decision !== 'APROBAR') return invalid('reason: required unless approving')
    if (version.status !== 'EN_REVISION') return conflict('Solo se decide una versión en revisión')
    version.status = TARGETS[decision]!
    version.decisions.push({ decision, reason, authorId: 'u-revisor', at: now() })
    return { status: 200, body: summary(version) }
  }
  if (method === 'POST' && action === 'publish') {
    if (version.status !== 'APROBADA') return conflict('Solo se publica una versión aprobada')
    version.status = 'PUBLICADA'
    return { status: 200, body: summary(version) }
  }
  return undefined
}

export function simulateReview(state: ReviewState, method: string, url: URL, body: unknown): Reply | undefined {
  if (!url.pathname.startsWith(REVIEW)) return undefined
  if (method === 'GET' && url.pathname === VERSIONS)
    return { status: 200, body: state.versions.filter((version) => version.status === 'EN_REVISION').map(summary) }
  const versionMatch = /^\/api\/lms\/review\/versions\/([^/]+)(?:\/(comments|decision|publish))?$/.exec(url.pathname)
  if (versionMatch) {
    const version = state.versions.find((candidate) => candidate.id === decodeURIComponent(versionMatch[1]!))
    if (!version) return notFound('Versión')
    return simulateVersion(state, method, version, versionMatch[2], (body ?? {}) as Record<string, unknown>)
  }
  const resolveMatch = /^\/api\/lms\/review\/comments\/([^/]+)\/resolve$/.exec(url.pathname)
  if (resolveMatch && method === 'POST') {
    const comment = state.versions.flatMap((version) => version.comments).find((candidate) => candidate.id === decodeURIComponent(resolveMatch[1]!))
    if (!comment) return notFound('Comentario')
    comment.resolved = true
    return { status: 200, body: comment }
  }
  return undefined
}
