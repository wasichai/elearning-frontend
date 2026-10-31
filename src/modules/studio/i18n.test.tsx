import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LESSON_TYPES, REVIEW_DECISIONS, VERSION_STATUSES } from './contract'
import { studioMessages } from './i18n'

type Tree = { [key: string]: string | Tree }

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))
}

const es = leaves(studioMessages.es)
const defined = (key: string) => es.includes(key) || es.includes(`${key}_other`)

// claves literales de t('…') en el código del módulo; las compuestas con ${…} se comprueban abajo, por enumeración
function staticKeys(): string[] {
  const dir = import.meta.dirname
  return readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .flatMap((name) => [...readFileSync(join(dir, name), 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((match) => match[1]!))
}

describe('textos del estudio', () => {
  it('español e inglés tienen las mismas claves y ninguna vacía', () => {
    expect(leaves(studioMessages.en)).toEqual(es)
    for (const language of Object.values(studioMessages)) {
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
      ...VERSION_STATUSES.flatMap((status) => [`status.${status}`, `statusHint.${status}`]),
      ...LESSON_TYPES.map((type) => `lessonType.${type}`),
      ...REVIEW_DECISIONS.map((decision) => `decision.${decision}`),
      ...['invalid', 'notFound', 'conflict', 'refused', 'server', 'network', 'contract'].flatMap((kind) => [
        `problem.versions.${kind}`,
        `problem.version.${kind}`,
        `problem.hint.${kind}`
      ]),
      'problem.hint.unexpected'
    ]
    expect(composed.filter((key) => !defined(key))).toEqual([])
  })
})
