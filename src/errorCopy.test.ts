import { describe, expect, it } from 'vitest'
import { MODULES_ROOT, offenders } from './test/boundaries'

// el código de un error va aparte, nunca dentro de la frase (pendiente de la épica #179, tras #194)
const STATUS_IN_SENTENCE = /\((?:error|Error) \{\{status\}\}\)/g

function statusInSentence(source: string): string[] {
  return source.match(STATUS_IN_SENTENCE) ?? []
}

describe('mensajes de error', () => {
  it('ningún texto mete «(error N)» en la frase', () => {
    expect(offenders(MODULES_ROOT, (_file, source) => statusInSentence(source), /i18n\.ts$/i)).toEqual([])
  })

  it('la regla reconoce el código dentro y fuera de la frase', () => {
    expect(statusInSentence("'No pudimos guardarlo (error {{status}}).'")).toHaveLength(1)
    expect(statusInSentence("'No pudimos guardarlo. Código del error: {{status}}.'")).toEqual([])
  })
})
