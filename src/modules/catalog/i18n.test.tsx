import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { mockFetch, renderWithProviders, type FetchMock } from '@wasichai/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { CatalogPage } from './CatalogPage'
import { LEVELS, MODALITIES, SORTS } from './contract'
import { catalogMessages } from './i18n'
import { catalogModule } from './module'
import { coursePage } from './test/fixtures'

type Tree = { [key: string]: string | Tree }

// las claves hoja de un árbol de mensajes, con su ruta: 'filters.search', 'catalog.count_one'…
function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))
}

const es = leaves(catalogMessages.es)
// una clave con plural existe si existe ella o su forma _other
const defined = (key: string) => es.includes(key) || es.includes(`${key}_other`)

// claves literales de t('…') en el código del módulo (las compuestas con ${…} se comprueban abajo, por enumeración)
function staticKeys(): string[] {
  const dir = import.meta.dirname
  return readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .flatMap((name) => [...readFileSync(join(dir, name), 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((match) => match[1]!))
}

let fetchMock: FetchMock | undefined
afterEach(() => fetchMock?.restore())

describe('textos del catálogo', () => {
  it('español e inglés tienen las mismas claves', () => {
    expect(leaves(catalogMessages.en)).toEqual(es)
  })

  it('ningún texto queda vacío', () => {
    for (const language of Object.values(catalogMessages)) {
      const empty = leaves(language).filter((key) => key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, language) === '')
      expect(empty).toEqual([])
    }
  })

  it('cada clave literal que usa el código existe', () => {
    const keys = staticKeys()
    expect(keys.length).toBeGreaterThan(20)
    expect(keys.filter((key) => !defined(key))).toEqual([])
  })

  it('cada valor de las enumeraciones tiene su texto', () => {
    const composed = [
      ...LEVELS.map((level) => `level.${level}`),
      ...MODALITIES.map((modality) => `modality.${modality}`),
      ...SORTS.map((sort) => `sort.${sort}`),
      ...['open', 'closed', 'running', 'scheduled'].map((state) => `offering.state.${state}`),
      ...['theory', 'practice', 'supervised', 'autonomous'].map((row) => `workload.${row}`),
      ...['invalid', 'notFound', 'refused', 'server', 'network', 'contract'].flatMap((kind) => [
        `problem.catalog.${kind}`,
        `problem.course.${kind}`,
        `problem.hint.${kind}`
      ]),
      'problem.hint.unexpected'
    ]
    expect(composed.filter((key) => !defined(key))).toEqual([])
  })

  it('la página se lee en inglés, con fechas en inglés', async () => {
    fetchMock = mockFetch([{ path: '/lms/public/catalog/courses', body: coursePage }])

    renderWithProviders(<CatalogPage />, { modules: [catalogModule()], route: '/cursos', user: null, permissions: null, language: 'en' })

    expect(await screen.findByText('2 courses')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
    expect(screen.getByText('4 weeks · 48 h')).toBeInTheDocument()
    expect(screen.getByText('Nov 9 – Dec 4, 2026')).toBeInTheDocument()
    expect(screen.getByText('Enrollment open')).toBeInTheDocument()
    expect(screen.getByText('Illustrative content')).toBeInTheDocument()
  })
})
