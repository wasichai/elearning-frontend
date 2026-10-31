import { draftDetail, problem, publishedDetail } from '../src/modules/studio/test/fixtures'

// el estudio del creador simulado (ADR-0018): solo las versiones de quien las escribió; lo demás, 404 como el servidor.
// el estado vive en la prueba, así una recarga conserva lo enviado y lo creado

export type Reply = { status: number; body: unknown }

export const STUDIO = '/api/lms/studio/'
const VERSIONS = '/api/lms/studio/versions'

type Detail = Omit<typeof publishedDetail, 'status' | 'reviewerId' | 'comments' | 'decisions'> & {
  status: string
  reviewerId: string | null
  comments: unknown[]
  decisions: unknown[]
}

export function studioState() {
  // las más recientes primero, como las lista el servidor
  const versions = structuredClone([draftDetail, publishedDetail]) as Detail[]
  // la versión 1 era algo distinta del borrador, para que haya qué comparar: sin el recorrido por el portal y con otro
  // título en la unidad 2
  const first = versions[1]!
  first.units = first.units.map((unit) =>
    unit.order === 2 ? { ...unit, title: 'Liquidación' } : { ...unit, lessons: unit.lessons.filter((lesson) => lesson.order !== 2) }
  )
  return { versions, lastNumber: 2 }
}

export type StudioState = ReturnType<typeof studioState>

const summary = (version: Detail) => ({
  id: version.id,
  number: version.number,
  status: version.status,
  course: version.course,
  authorId: version.authorId,
  reviewerId: version.reviewerId,
  updatedAt: version.updatedAt,
  openComments: version.openComments
})
type Unit = Detail['units'][number]
type Lesson = Unit['lessons'][number]

// lo que difiere de una unidad o una lección con la de antes (mismo order), como VersionDiff del servidor: los campos
// del modelo en español, ordenados
function lessonFields(now: Lesson, before: Lesson): string[] {
  return [
    ...(now.resources !== before.resources ? ['recursos'] : []),
    ...(now.sourceRef !== before.sourceRef ? ['referencia_fuente'] : []),
    ...(now.type !== before.type ? ['tipo'] : []),
    ...(now.title !== before.title ? ['titulo'] : [])
  ]
}

function compare<T extends { order: number; title: string }, R>(now: T[], before: T[], describe: (now?: T, before?: T) => R): R[] {
  const orders = [...new Set([...now, ...before].map((item) => item.order))].sort((a, b) => a - b)
  return orders.map((order) =>
    describe(
      now.find((item) => item.order === order),
      before.find((item) => item.order === order)
    )
  )
}

function item(now: { order: number; title: string } | undefined, before: { order: number; title: string } | undefined, fields: string[], changed = false) {
  if (!before) return { order: now!.order, change: 'ADDED', title: now!.title, previousTitle: null, fields: [] }
  if (!now) return { order: before.order, change: 'REMOVED', title: null, previousTitle: before.title, fields: [] }
  return { order: now.order, change: fields.length > 0 || changed ? 'CHANGED' : 'SAME', title: now.title, previousTitle: before.title, fields }
}

// contra la versión del mismo curso con el number más alto por debajo; sin ella, baseVersion null y todo ADDED
function diffOf(state: StudioState, version: Detail) {
  const base = state.versions
    .filter((candidate) => candidate.course.id === version.course.id && candidate.number < version.number)
    .sort((a, b) => b.number - a.number)[0]
  const units = compare<Unit, object>(version.units, base?.units ?? [], (now?: Unit, before?: Unit) => {
    const lessons = compare<Lesson, ReturnType<typeof item>>(now?.lessons ?? [], before?.lessons ?? [], (lesson?: Lesson, previous?: Lesson) =>
      item(lesson, previous, lesson && previous ? lessonFields(lesson, previous) : [])
    )
    const fields = now && before && now.title !== before.title ? ['titulo'] : []
    return {
      ...item(
        now,
        before,
        fields,
        lessons.some((lesson) => lesson.change !== 'SAME')
      ),
      lessons
    }
  })
  return { baseVersion: base?.number ?? null, units }
}

const notFound: Reply = { status: 404, body: problem(404, 'Versión no encontrada') }

// copia la versión indicada a un borrador nuevo, sin sus comentarios ni sus decisiones (ADR-0018 §1)
function newVersion(state: StudioState, courseId: string, body: { fromVersionId?: string | null }): Reply {
  const ofCourse = state.versions.filter((version) => version.course.id === courseId)
  const source = body.fromVersionId ? ofCourse.find((version) => version.id === body.fromVersionId) : ofCourse[0]
  if (!source) return { status: 400, body: problem(400, 'Invalid version') }
  const number = ++state.lastNumber
  const id = `a1b2c3d4-0000-4000-8000-${String(number).padStart(12, '0')}`
  const created: Detail = {
    ...structuredClone(source),
    id,
    number,
    status: 'BORRADOR',
    reviewerId: null,
    updatedAt: new Date().toISOString(),
    openComments: 0,
    comments: [],
    decisions: []
  }
  state.versions.unshift(created)
  return { status: 201, body: { id, number, status: 'BORRADOR' } }
}

export function simulateStudio(state: StudioState, method: string, url: URL, body: unknown): Reply | undefined {
  if (!url.pathname.startsWith(STUDIO)) return undefined
  if (method === 'GET' && url.pathname === VERSIONS) return { status: 200, body: state.versions.map(summary) }
  const courseMatch = /^\/api\/lms\/studio\/courses\/([^/]+)\/versions$/.exec(url.pathname)
  if (courseMatch && method === 'POST') return newVersion(state, decodeURIComponent(courseMatch[1]!), (body ?? {}) as { fromVersionId?: string | null })
  const versionMatch = /^\/api\/lms\/studio\/versions\/([^/]+)(?:\/(submit|diff))?$/.exec(url.pathname)
  if (!versionMatch) return undefined
  const version = state.versions.find((candidate) => candidate.id === decodeURIComponent(versionMatch[1]!))
  if (!version) return notFound
  if (method === 'GET' && !versionMatch[2]) return { status: 200, body: version }
  if (method === 'GET' && versionMatch[2] === 'diff') return { status: 200, body: diffOf(state, version) }
  if (method === 'POST' && versionMatch[2] === 'submit') {
    if (version.status !== 'BORRADOR') return { status: 409, body: problem(409, 'Solo se envía a revisión un borrador') }
    version.status = 'EN_REVISION'
    version.updatedAt = new Date().toISOString()
    return { status: 200, body: summary(version) }
  }
  return undefined
}
