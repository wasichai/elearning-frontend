import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENROLLMENT_STATUSES, OFFERING_STATUSES } from '../../shared/contract'
import { ATTENDANCE_STATUSES, SESSION_MODALITIES, SESSION_STATUSES, SESSION_TYPES } from '../../shared/sessions'
import { RECURRENCE_PATTERNS, WEEK_DAYS } from './contract'
import { teachingMessages } from './i18n'

type Tree = { [key: string]: string | Tree }

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'string' ? [prefix + key] : leaves(value, `${prefix}${key}.`)))
}

const es = leaves(teachingMessages.es)
const defined = (key: string) => es.includes(key) || es.includes(`${key}_other`)

// claves literales de t('…') en el código del módulo; las compuestas con ${…} se comprueban abajo, por enumeración
function staticKeys(): string[] {
  const dir = import.meta.dirname
  return readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .flatMap((name) => [...readFileSync(join(dir, name), 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((match) => match[1]!))
}

describe('textos del espacio docente', () => {
  it('español e inglés tienen las mismas claves y ninguna vacía', () => {
    expect(leaves(teachingMessages.en)).toEqual(es)
    for (const language of Object.values(teachingMessages)) {
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
      ...ENROLLMENT_STATUSES.map((status) => `roster.enrollmentStatus.${status}`),
      ...SESSION_STATUSES.map((status) => `sessions.status.${status}`),
      ...SESSION_TYPES.map((type) => `sessions.type.${type}`),
      ...SESSION_MODALITIES.map((modality) => `sessions.modality.${modality}`),
      ...ATTENDANCE_STATUSES.map((status) => `attendance.statuses.${status}`),
      ...RECURRENCE_PATTERNS.map((pattern) => `form.patterns.${pattern}`),
      ...WEEK_DAYS.map((day) => `form.weekDays.${day}`),
      ...['invalid', 'notFound', 'conflict', 'refused', 'server', 'network', 'contract'].flatMap((kind) => [
        `problem.offerings.${kind}`,
        `problem.roster.${kind}`,
        `problem.queue.${kind}`,
        `problem.attempt.${kind}`,
        `problem.sessions.${kind}`,
        `problem.attendance.${kind}`,
        `problem.hint.${kind}`
      ]),
      'problem.hint.unexpected'
    ]
    expect(composed.filter((key) => !defined(key))).toEqual([])
  })
})
