import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DECISIONS, VERSION_STATUSES } from './contract'
import { reviewMessages } from './i18n'

type Tree = { [key: string]: string | Tree }

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))
}

const es = leaves(reviewMessages.es)
const defined = (key: string) => es.includes(key) || es.includes(`${key}_other`)

// claves literales de t('…') en el código del módulo; las compuestas con ${…} se comprueban abajo, por enumeración
function staticKeys(): string[] {
  const dir = import.meta.dirname
  return readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .flatMap((name) => [...readFileSync(join(dir, name), 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((match) => match[1]!))
}

describe('textos de la bandeja del revisor', () => {
  it('español e inglés tienen las mismas claves y ninguna vacía', () => {
    expect(leaves(reviewMessages.en)).toEqual(es)
    for (const language of Object.values(reviewMessages)) {
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
    const asked = DECISIONS.filter((decision) => decision !== 'APROBAR')
    const composed = [
      ...VERSION_STATUSES.map((status) => `status.${status}`),
      ...DECISIONS.flatMap((decision) => [`decision.${decision}`, `decided.${decision}`, `decide.${decision}`]),
      ...asked.flatMap((decision) => [`decide.${decision}Title`, `decide.${decision}Description`]),
      // el vocabulario tipo_leccion del modelo; uno nuevo se muestra tal cual
      ...['LECTURA', 'VIDEO', 'PRESENTACION', 'LABORATORIO', 'EVALUACION', 'SESION'].map((type) => `lessonType.${type}`),
      ...['invalid', 'notFound', 'conflict', 'refused', 'server', 'network', 'contract'].flatMap((kind) => [
        `problem.inbox.${kind}`,
        `problem.version.${kind}`,
        `problem.hint.${kind}`
      ]),
      'problem.hint.unexpected'
    ]
    expect(composed.filter((key) => !defined(key))).toEqual([])
  })
})
