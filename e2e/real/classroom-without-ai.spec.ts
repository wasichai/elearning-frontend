import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, API_URL, browserFor, expandedUnits, newStudent, signIn, token, type Account } from './helpers'

// RF-MED-04 (front#171, elearning-backend#294): lo publicado funciona sin el proveedor de IA. El backend corre sin ninguna clave
// (ni ANTHROPIC_API_KEY ni OPENAI_API_KEY), así que cada paso de la canalización lo hace el doble determinista (docs/ai §7 del
// backend). Por la API, como cada papel: brief → análisis → diseño → borrador de lecciones; la autora corrige el borrador, el
// revisor lo valida y lo aprueba y el administrador lo publica. Luego un estudiante matriculado lo recorre entero en el aula, sin
// que ninguna pantalla llame a /api/lms/ai ni muestre un error o una carga pendiente.
//
// La fuente es la de la unidad de demostración del backend (docs/ai/evaluations/demo-unit/fuente), leída de GitHub en un commit
// exacto: E2E_AI_SOURCE (owner/repo@sha:ruta) y el backend con ese repositorio en LMS_IMPORTER_ALLOWED_SOURCES. En CI, el commit
// del backend que se prueba. Sin esa variable, la prueba se salta
test.skip(!process.env.E2E_REAL, 'solo con E2E_REAL=1 y el backend en marcha')

const SOURCE = process.env.E2E_AI_SOURCE ?? ''
const AI_API = '/api/lms/ai'
const DONE_STATES = ['DONE', 'FAILED', 'CANCELLED']

type Json = Record<string, unknown>
interface RecordPage {
  content: { id: string; attributes: Json }[]
}
interface Run {
  step: string
  status: string
  generator: string
  output: { versionId?: string } | null
}
interface ClassroomLesson {
  id: string
  title: string
  summary: string | null
  completion: string
  resources: { id: string; title: string; type: string; file: unknown }[]
}
interface Classroom {
  units: { title: string; lessons: ClassroomLesson[] }[]
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// un cliente de la API con el token de una persona; cada llamada comprueba su estado y devuelve el JSON
async function client(request: APIRequestContext, account: Account) {
  const headers = { Authorization: `Bearer ${await token(request, account.email, account.password)}` }
  const call = async <T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, status: number[], data?: unknown): Promise<T> => {
    const response = await request.fetch(`${API_URL}${path}`, { method, headers, data })
    const text = await response.text()
    expect(status, `${method} ${path}: ${response.status()} ${text}`).toContain(response.status())
    return (text ? JSON.parse(text) : null) as T
  }
  return {
    get: <T>(path: string) => call<T>('GET', path, [200]),
    post: <T>(path: string, data: unknown, status = 200) => call<T>('POST', path, [status], data),
    create: async (object: string, attributes: Json) => (await call<{ id: string }>('POST', `/api/objects/${object}/records`, [201], { attributes })).id,
    patch: (object: string, id: string, attributes: Json) => call<unknown>('PATCH', `/api/objects/${object}/records/${id}`, [200], { attributes }),
    remove: (object: string, id: string) => call<unknown>('DELETE', `/api/objects/${object}/records/${id}`, [200, 204]),
    list: async (object: string, field: string, value: string) =>
      (await call<RecordPage>('GET', `/api/objects/${object}/records?${field}=${value}&size=200`, [200])).content
  }
}
type Client = Awaited<ReturnType<typeof client>>

// una cuenta nueva con esos roles, creada por el administrador del perfil dev
async function account(request: APIRequestContext, roles: string[], displayName: string): Promise<Account> {
  const admin = await token(request, ADMIN.email, ADMIN.password)
  const user = { email: `e2e-${randomUUID()}@demo.wasichai-learning.test`, password: `E2e-${randomUUID()}` }
  const response = await request.post(`${API_URL}/api/users`, { headers: { Authorization: `Bearer ${admin}` }, data: { ...user, displayName, roles } })
  expect(response.status()).toBe(201)
  return user
}

// espera a que la cola termine el trabajo y devuelve su estado final
async function finished(api: Client, path: string): Promise<{ status: string; executionId?: string | null; error?: string | null }> {
  let job: { status: string; executionId?: string | null; error?: string | null } = { status: 'QUEUED' }
  await expect
    .poll(
      async () => {
        job = await api.get(path)
        return job.status
      },
      { message: `el trabajo ${path} no terminó`, timeout: 90_000, intervals: [1_000, 2_000, 5_000] }
    )
    .toMatch(new RegExp(`^(${DONE_STATES.join('|')})$`))
  return job
}

// encola un paso de IA y devuelve su ejecución, que tiene que ser del doble determinista: el backend no tiene proveedor
async function step(api: Client, path: string, body: Json, name: string): Promise<Run & { id: string }> {
  const queued = await api.post<{ id: string }>(path, body, 202)
  const job = await finished(api, `${AI_API}/jobs/${queued.id}`)
  expect(job.status, `${name}: ${job.error ?? ''}`).toBe('DONE')
  const run = await api.get<Run & { id: string }>(`${AI_API}/runs/${job.executionId}`)
  expect(run.step).toBe(name)
  expect(run.status).toBe('SUCCEEDED')
  expect(run.generator, `${name} sin proveedor de IA`).toBe('DETERMINISTIC')
  return run
}

test(
  'sin proveedor de IA, un estudiante lee entero y completa un curso publicado de contenido generado',
  { tag: '@publishes' },
  async ({ page, browser, baseURL, request }) => {
    test.skip(!SOURCE, 'necesita E2E_AI_SOURCE (owner/repo@sha:ruta) y ese repositorio en LMS_IMPORTER_ALLOWED_SOURCES del backend')
    test.setTimeout(300_000)
    const run = randomUUID().slice(0, 8)
    const code = `SINIA-${run}`.toUpperCase()
    const title = `Curso generado sin IA ${run}`

    const authorAccount = await account(request, ['CREADOR'], 'Autora e2e')
    const reviewerAccount = await account(request, ['REVISOR'], 'Revisor e2e')
    const author = await client(request, authorAccount)
    const reviewer = await client(request, reviewerAccount)
    const admin = await client(request, ADMIN)

    let version = ''
    // por lección de evaluación, el enunciado de cada pregunta y el texto de su opción correcta: lo que respondería quien estudió
    const answers = new Map<string, { statement: string; answer: string }[]>()

    await test.step('la canalización, sin claves: brief, análisis, diseño y borrador del doble determinista', async () => {
      const course = await author.create('curso', { codigo: code, slug: code.toLowerCase(), titulo: title, idioma: 'es', nivel: 'INICIAL' })
      const brief = await author.create('brief', {
        curso: course,
        tematica: 'Administración de anuncios',
        publico: 'Personal administrativo',
        objetivos: 'Publicar un anuncio\nRetirarlo',
        duracion_horas: 6,
        idioma: 'es',
        nivel: 'INICIAL',
        expertos: 'Responsable de comunicación',
        fuentes: SOURCE,
        estado: 'LISTO'
      })
      const analysis = await step(author, `${AI_API}/source-analysis`, { briefId: brief }, 'SOURCE_ANALYSIS')
      const design = await step(author, `${AI_API}/course-design`, { executionId: analysis.id }, 'COURSE_DESIGN')
      const draft = await step(author, `${AI_API}/lesson-draft`, { executionId: design.id }, 'LESSON_DRAFT')
      version = draft.output!.versionId!
      expect(version).toBeTruthy()
    })

    try {
      await test.step('la autora corrige el borrador: quita las preguntas abiertas, que pedirían corrección docente', async () => {
        for (const unit of await author.list('unidad', 'version_curso', version)) {
          for (const lesson of await author.list('leccion', 'unidad', unit.id)) {
            if (lesson.attributes.tipo !== 'EVALUACION') continue
            const keyed: { statement: string; answer: string }[] = []
            answers.set(lesson.id, keyed)
            for (const evaluation of await author.list('evaluacion', 'leccion', lesson.id)) {
              for (const question of await author.list('pregunta', 'evaluacion', evaluation.id)) {
                if (question.attributes.tipo === 'ABIERTA') {
                  await author.remove('pregunta', question.id)
                  continue
                }
                const correct = (await author.list('opcion', 'pregunta', question.id)).find((option) => option.attributes.correcta === true)
                expect(correct, `la pregunta «${String(question.attributes.enunciado)}» no tiene opción correcta`).toBeDefined()
                keyed.push({ statement: String(question.attributes.enunciado), answer: String(correct!.attributes.texto) })
              }
            }
          }
        }
        expect(answers.size, 'el borrador generado no trae evaluaciones').toBeGreaterThan(0)
        for (const keyed of answers.values()) expect(keyed.length, 'una evaluación generada sin preguntas de opción').toBeGreaterThan(0)
      })

      await test.step('el revisor valida el borrador generado; sin proveedor, la opinión de consistencia se salta', async () => {
        const queued = await reviewer.post<{ id: string }>(`${AI_API}/validations`, { versionId: version }, 202)
        const job = await finished(reviewer, `${AI_API}/validations/jobs/${queued.id}`)
        expect(job.status, job.error ?? '').toBe('DONE')
        const view = await reviewer.get<{ report: { blocking: boolean }; opinion: { status: string } }>(`${AI_API}/validations?versionId=${version}`)
        expect(view.report.blocking, JSON.stringify(view.report)).toBe(false)
        expect(view.opinion.status).toBe('SKIPPED')
      })

      await test.step('las lecturas generadas y la versión pasan su revisión; la bandeja la marca «Generado sin IA, ilustrativo»', async () => {
        for (const unit of await author.list('unidad', 'version_curso', version)) {
          for (const lesson of await author.list('leccion', 'unidad', unit.id)) {
            for (const link of await author.list('recurso_leccion', 'leccion', lesson.id)) {
              const resource = String(link.attributes.version_recurso)
              await author.patch('version_recurso', resource, { estado: 'EN_REVISION' })
              await reviewer.patch('version_recurso', resource, { estado: 'APROBADA' })
              await admin.patch('version_recurso', resource, { estado: 'PUBLICADA' })
            }
          }
        }
        await author.post(`/api/lms/studio/versions/${version}/submit`, {})
        const inbox = await reviewer.get<{ id: string; generator: string | null }[]>('/api/lms/review/versions')
        expect(inbox.find((item) => item.id === version)?.generator).toBe('DETERMINISTIC')

        const desk = await browserFor(browser, baseURL, reviewerAccount)
        try {
          await desk.page.goto('/revision')
          const item = desk.page.getByRole('article').filter({ has: desk.page.getByRole('heading', { name: title }) })
          await expect(item.getByText('Generado sin IA, ilustrativo')).toBeVisible()
        } finally {
          await desk.context.close()
        }

        await reviewer.post(`/api/lms/review/versions/${version}/decision`, { decision: 'APROBAR', reason: null })
        await admin.post(`/api/lms/review/versions/${version}/publish`, {})
        const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
        await admin.create('edicion_curso', {
          codigo: code,
          version_curso: version,
          estado: 'INSCRIPCION_ABIERTA',
          fecha_inicio: day(0),
          fecha_fin: day(30),
          zona_horaria: 'America/Lima',
          inscripcion_desde: day(-1),
          inscripcion_hasta: day(5)
        })
      })

      await test.step('el estudiante lo recorre entero en el aula, sin llamar a la IA, hasta el 100 %', async () => {
        const studentAccount = await newStudent(request)
        const student = await client(request, studentAccount)
        const enrollment = (await student.post<{ id: string }>('/api/lms/enrollments', { offering: code }, 201)).id
        const classroom = await student.get<Classroom>(`/api/lms/classroom/enrollments/${enrollment}`)
        const lessons = classroom.units.flatMap((unit) => unit.lessons)
        expect(lessons.length).toBeGreaterThan(0)
        expect(lessons.some((lesson) => lesson.resources.some((resource) => resource.type === 'HTML' && resource.file))).toBe(true)

        const ai: string[] = []
        page.on('request', (sent) => {
          const { pathname } = new URL(sent.url())
          if (pathname.startsWith(AI_API)) ai.push(pathname)
        })
        await signIn(page, studentAccount)
        await page.getByRole('link', { name: 'Mis cursos' }).click()
        const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) })
        await expect(card).toBeVisible()
        await expect(page.getByRole('alert')).toHaveCount(0)

        await page.goto(`/mis-cursos/${enrollment}`)
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
        // todas las unidades y todas sus lecciones, con su título
        const units = await expandedUnits(page)
        for (const unit of classroom.units) await expect(units.locator('summary').filter({ hasText: unit.title }).first()).toBeVisible()
        for (const lesson of lessons) await expect(units.getByRole('link', { name: new RegExp(`^${escape(lesson.title)}`) }).first()).toBeVisible()

        for (const lesson of lessons) {
          await page.goto(`/mis-cursos/${enrollment}?leccion=${lesson.id}`)
          await expect(page.getByRole('heading', { level: 2, name: lesson.title })).toBeVisible()
          if (lesson.summary) await expect(page.getByRole('article', { name: lesson.title }).getByText(lesson.summary.trim())).toBeVisible()
          // cada lectura generada: su HTML del servidor, con texto, en el iframe aislado
          for (const resource of lesson.resources.filter((candidate) => candidate.type === 'HTML' && candidate.file)) {
            const frame = page.locator('iframe').and(page.getByTitle(resource.title, { exact: true }))
            await expect(frame).toHaveAttribute('sandbox', '')
            await expect(frame.contentFrame().locator('body')).toContainText(/\S/)
          }

          if (lesson.completion === 'EXPLICIT') {
            await page.getByRole('button', { name: 'Marcar como completada' }).click()
            await expect(page.getByRole('status').filter({ hasText: 'Lección completada' })).toBeVisible()
          } else {
            expect(lesson.completion, `la lección «${lesson.title}» no se completa por la interfaz`).toBe('ASSESSMENT')
            await page.getByRole('button', { name: /^Comenzar intento 1 de / }).click()
            await page.getByRole('dialog', { name: '¿Comenzar el intento?' }).getByRole('button', { name: 'Comenzar' }).click()
            await expect(page.getByRole('heading', { level: 3, name: 'Intento 1' })).toBeVisible()
            const keyed = answers.get(lesson.id)
            expect(keyed, `la lección «${lesson.title}» no es una de las evaluaciones del borrador`).toBeDefined()
            for (const { statement, answer } of keyed!)
              await page.getByRole('group', { name: statement }).getByRole('radio', { name: answer, exact: true }).check()
            await page.getByRole('button', { name: 'Entregar' }).click()
            const confirm = page.getByRole('dialog', { name: '¿Entregar el intento?' })
            await expect(confirm).toContainText('Respondiste todas las preguntas.')
            await confirm.getByRole('button', { name: 'Entregar' }).click()
            await expect(page.getByRole('heading', { level: 3, name: 'Resultado del intento 1' })).toBeVisible()
            await expect(page.getByRole('status').filter({ hasText: 'Aprobada' }).getByRole('img', { name: 'Nota: 100 %' })).toBeVisible()
          }
          await expect(page.getByRole('alert')).toHaveCount(0)
        }

        await page.goto(`/mis-cursos/${enrollment}`)
        await expect(page.getByRole('progressbar', { name: 'Progreso del curso' })).toHaveAttribute('aria-valuenow', '100')
        for (const lesson of lessons)
          await expect(
            (await expandedUnits(page)).getByRole('link', { name: new RegExp(`^${escape(lesson.title)}.*(Completada|Aprobada)`) }).first()
          ).toBeVisible()
        // ni error, ni aviso de la IA, ni una carga que no termina
        await expect(page.getByRole('alert')).toHaveCount(0)
        await expect(page.getByText(/^Cargando/)).toHaveCount(0)
        expect(ai, 'el aula no llama a la IA').toEqual([])
      })
    } finally {
      // retirarla al acabar saca el curso del catálogo: una segunda ejecución sobre la misma base sigue contando los de la demo.
      // un borrador que no llegó a publicarse no está en el catálogo y se queda como está
      if (version) {
        const state = (await admin.get<{ attributes: Json }>(`/api/objects/version_curso/records/${version}`)).attributes.estado
        if (state === 'PUBLICADA') await admin.patch('version_curso', version, { estado: 'RETIRADA' })
      }
    }
  }
)
