import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery } from '@tanstack/react-query'
import type { WasichaiModule } from '@wasichai/core'
import { renderWithProviders } from '@wasichai/testing'
import { describe, expect, it } from 'vitest'
import { ContractError, parseContract } from './contract'
import { versionDiffSchema, type VersionDiff } from './diff'
import { diffMessages, isKnownField } from './diffMessages'
import { VersionDiffSection } from './VersionDiff'

// las diferencias con la versión anterior (VersionDiff en docs/api/lms.md del backend), que comparten el estudio y la bandeja

const NAMESPACE = 'diffhost'
const host: WasichaiModule = { id: NAMESPACE, i18n: { es: { diff: diffMessages.es }, en: { diff: diffMessages.en } } }

// el ejemplo del documento, completado: una unidad cambiada (título y una lección añadida, otra cambiada, otra igual),
// una añadida, una quitada y una igual
const diff: VersionDiff = {
  baseVersion: 1,
  units: [
    { order: 4, change: 'SAME', title: 'Cierre', previousTitle: 'Cierre', fields: [], lessons: [] },
    {
      order: 1,
      change: 'CHANGED',
      title: 'Primeros pasos',
      previousTitle: 'Comenzar',
      fields: ['titulo'],
      lessons: [
        { order: 3, change: 'ADDED', title: 'Recorrido por el portal', previousTitle: null, fields: [] },
        { order: 1, change: 'SAME', title: 'Entrar al portal', previousTitle: 'Entrar al portal', fields: [] },
        { order: 2, change: 'CHANGED', title: 'Cambiar la clave', previousTitle: 'Cambiar la clave', fields: ['recursos', 'resumen', 'video_url'] }
      ]
    },
    { order: 3, change: 'REMOVED', title: null, previousTitle: 'Anexos', fields: [], lessons: [] },
    {
      order: 2,
      change: 'ADDED',
      title: 'Liquidaciones',
      previousTitle: null,
      fields: [],
      lessons: [{ order: 1, change: 'ADDED', title: 'Evaluación final', previousTitle: null, fields: [] }]
    }
  ]
}

const firstVersion: VersionDiff = {
  baseVersion: null,
  units: [{ order: 1, change: 'ADDED', title: 'Primeros pasos', previousTitle: null, fields: [], lessons: [] }]
}

// la sección con una consulta que responde lo que se le da, o falla
function renderDiff(result: VersionDiff | Error, language?: string) {
  let calls = 0
  function Host() {
    const query = useQuery({
      queryKey: ['diff'],
      queryFn: () => {
        calls += 1
        return result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
      },
      retry: false
    })
    return <VersionDiffSection namespace={NAMESPACE} query={query} />
  }
  renderWithProviders(<Host />, { modules: [host], language })
  return { calls: () => calls }
}

describe('contrato de las diferencias', () => {
  it('acepta el ejemplo, la primera versión y campos nuevos', () => {
    expect(parseContract(versionDiffSchema, 'diff', diff).units).toHaveLength(4)
    expect(parseContract(versionDiffSchema, 'diff', firstVersion).baseVersion).toBeNull()
    expect(parseContract(versionDiffSchema, 'diff', { ...diff, computedAt: 'ahora' }).baseVersion).toBe(1)
    expect(parseContract(versionDiffSchema, 'diff', { baseVersion: 3, units: [] }).units).toEqual([])
  })

  it.each([
    ['cambio desconocido', { ...diff, units: [{ ...diff.units[0], change: 'MOVED' }] }, 'change'],
    ['sin lecciones', { ...diff, units: [{ ...diff.units[0], lessons: undefined }] }, 'lessons'],
    ['campos que no son lista', { ...diff, units: [{ ...diff.units[1], fields: 'titulo' }] }, 'fields'],
    [
      'lección sin título anterior',
      { ...diff, units: [{ ...diff.units[1], lessons: [{ order: 1, change: 'SAME', title: 'x', fields: [] }] }] },
      'previousTitle'
    ],
    ['versión base cero', { ...diff, baseVersion: 0 }, 'baseVersion'],
    ['sin unidades', { baseVersion: 1 }, 'units']
  ])('rechaza: %s', (_case, body, hint) => {
    expect(() => parseContract(versionDiffSchema, 'GET versions/x/diff', body)).toThrow(ContractError)
    expect(() => parseContract(versionDiffSchema, 'GET versions/x/diff', body)).toThrow(hint)
  })
})

describe('VersionDiffSection', () => {
  it('muestra lo añadido, lo quitado y lo cambiado, en orden y con sus campos; lo igual, plegado', async () => {
    renderDiff(diff)

    const section = within(await screen.findByRole('region', { name: 'Cambios' }))
    expect(await section.findByText('Comparada con la versión 1.')).toBeInTheDocument()
    const changed = section.getByRole('list', { name: 'Lo que cambió' })
    const units = within(changed)
      .getAllByRole('listitem')
      .filter((item) => item.parentElement === changed)
    expect(units).toHaveLength(3)
    expect(units[0]).toHaveTextContent(/^CambiadaUnidad 1\. Primeros pasosAntes: «Comenzar»Cambió: título/)
    expect(units[1]).toHaveTextContent(/^AñadidaUnidad 2\. LiquidacionesAñadidaLección 2\.1\. Evaluación final$/)
    expect(units[2]).toHaveTextContent(/^QuitadaUnidad 3\. Anexos$/)

    // las lecciones de la unidad cambiada: la cambiada con sus campos (el desconocido, tal cual), la añadida y la igual plegada
    const lessons = within(units[0]!)
    expect(lessons.getByText('Lección 1.2. Cambiar la clave').closest('li')).toHaveTextContent('Cambió: recursos, resumen, video_url')
    expect(lessons.getByText('Lección 1.3. Recorrido por el portal').closest('li')).toHaveTextContent(/^AñadidaLección 1\.3/)
    expect(lessons.getByText('1 lección sin cambios')).toBeVisible()
    expect(lessons.getByText('Lección 1.1. Entrar al portal')).not.toBeVisible()

    // la unidad igual, fuera de la lista y plegada
    expect(within(changed).queryByText(/Cierre/)).not.toBeInTheDocument()
    expect(section.getByText('1 unidad sin cambios')).toBeVisible()
    expect(section.getByText('Unidad 4. Cierre')).not.toBeVisible()
  })

  it('sin versión anterior lo dice, sin listar nada', async () => {
    renderDiff(firstVersion)

    expect(await screen.findByText(/Es la primera versión de este curso/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(/Primeros pasos/)).not.toBeInTheDocument()
  })

  it('sin cambios lo dice, con todo plegado', async () => {
    renderDiff({ baseVersion: 2, units: [{ order: 1, change: 'SAME', title: 'Primeros pasos', previousTitle: 'Primeros pasos', fields: [], lessons: [] }] })

    expect(await screen.findByText('Su contenido es el mismo que el de la versión 2.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Lo que cambió' })).not.toBeInTheDocument()
    expect(screen.getByText('1 unidad sin cambios')).toBeVisible()
  })

  it('un fallo se explica y deja reintentar', async () => {
    const { calls } = renderDiff(new TypeError('Failed to fetch'))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las diferencias con la versión anterior.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar la comparación' }))
    await waitFor(() => expect(calls()).toBe(2))
  })

  it('en inglés', async () => {
    renderDiff(diff, 'en')

    const section = within(await screen.findByRole('region', { name: 'Changes' }))
    expect(await section.findByText('Compared with version 1.')).toBeInTheDocument()
    expect(section.getByText('Before: “Comenzar”')).toBeInTheDocument()
    expect(section.getByText('Changed: resources, summary, video_url')).toBeInTheDocument()
    expect(section.getByText('Removed')).toBeInTheDocument()
    expect(section.getByText('1 unit unchanged')).toBeInTheDocument()
  })
})

describe('textos de las diferencias', () => {
  type Tree = { [key: string]: string | Tree }
  const leaves = (tree: Tree, prefix = ''): string[] =>
    Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))

  it('español e inglés tienen las mismas claves y ninguna vacía', () => {
    expect(leaves(diffMessages.en)).toEqual(leaves(diffMessages.es))
    for (const language of Object.values(diffMessages)) {
      const empty = leaves(language).filter((key) => key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, language) === '')
      expect(empty).toEqual([])
    }
  })

  it('conoce los campos de unidad y lección del modelo, y nada más', () => {
    for (const field of ['titulo', 'descripcion', 'objetivos', 'horas_estimadas', 'tipo', 'duracion_minutos', 'resumen', 'referencia_fuente', 'recursos'])
      expect(isKnownField(field)).toBe(true)
    expect(isKnownField('video_url')).toBe(false)
    expect(isKnownField('constructor')).toBe(false)
  })
})
