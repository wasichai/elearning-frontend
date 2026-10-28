import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { OFFERING_STATUSES } from './contract'
import { classroomMessages } from './i18n'
import { classroomModule } from './module'
import { MyCoursesPage } from './MyCoursesPage'
import { enrollment } from './test/fixtures'

type Tree = { [key: string]: string | Tree }

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))
}

const es = leaves(classroomMessages.es)
const defined = (key: string) => es.includes(key) || es.includes(`${key}_other`)

// claves literales de t('…') en el código del módulo; las compuestas con ${…} se comprueban abajo, por enumeración
function staticKeys(): string[] {
  const dir = import.meta.dirname
  return readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .flatMap((name) => [...readFileSync(join(dir, name), 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((match) => match[1]!))
}

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

describe('textos del aula', () => {
  it('español e inglés tienen las mismas claves y ninguna vacía', () => {
    expect(leaves(classroomMessages.en)).toEqual(es)
    for (const language of Object.values(classroomMessages)) {
      const empty = leaves(language).filter((key) => key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, language) === '')
      expect(empty).toEqual([])
    }
  })

  it('cada clave literal que usa el código existe', () => {
    const keys = staticKeys()
    expect(keys.length).toBeGreaterThan(10)
    expect(keys.filter((key) => !defined(key))).toEqual([])
  })

  it('cada valor de las enumeraciones tiene su texto', () => {
    const composed = [
      ...OFFERING_STATUSES.map((status) => `offering.status.${status}`),
      ...['invalid', 'notFound', 'conflict', 'refused', 'server', 'network', 'contract'].flatMap((kind) => [
        `problem.enrollments.${kind}`,
        `problem.classroom.${kind}`,
        `problem.hint.${kind}`
      ]),
      'problem.hint.unexpected'
    ]
    expect(composed.filter((key) => !defined(key))).toEqual([])
  })

  it('«Mis cursos» se lee en inglés, con fechas en inglés', async () => {
    fetchMock = mockFetch([{ path: '/lms/classroom/enrollments', body: [enrollment] }])

    renderWithProviders(<MyCoursesPage />, { modules: [classroomModule()], route: '/mis-cursos', language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'My courses' })).toBeInTheDocument()
    expect(await screen.findByText('Nov 9 – Dec 4, 2026')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 lessons · 33%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue “Licencias de anuncios con SRTM”' })).toBeInTheDocument()
  })
})
