import { describe, expect, it } from 'vitest'
import {
  ContractError,
  newVersionSchema,
  parseContract,
  studioVersionDetailSchema,
  studioVersionListSchema,
  studioVersionSchema,
  versionDiffSchema
} from './contract'
import { createdVersion, draftDetail, draftDiff, draftVersion, publishedDetail, publishedDiff, publishedVersion } from './test/fixtures'

describe('contrato del estudio del creador', () => {
  it('acepta los ejemplos del documento, también listas vacías, nulos y campos nuevos', () => {
    expect(parseContract(studioVersionListSchema, 'versions', [draftVersion, publishedVersion])).toHaveLength(2)
    expect(parseContract(studioVersionListSchema, 'versions', [])).toEqual([])
    expect(parseContract(studioVersionSchema, 'submit', { ...draftVersion, status: 'EN_REVISION', updatedAt: null, extra: 1 }).status).toBe('EN_REVISION')
    expect(parseContract(studioVersionDetailSchema, 'detail', publishedDetail).decisions[1]?.reason).toBeNull()
    expect(parseContract(studioVersionDetailSchema, 'detail', draftDetail).units[1]?.lessons[1]?.sourceRef).toContain('@4f2a9c1')
    // el servidor responde a la versión nueva con su identidad; si manda el detalle entero, también vale
    expect(parseContract(newVersionSchema, 'new', createdVersion).id).toBe(createdVersion.id)
    expect(parseContract(newVersionSchema, 'new', { ...draftDetail, number: 3 }).number).toBe(3)
  })

  it.each([
    ['estado desconocido', [{ ...draftVersion, status: 'ARCHIVADA' }], 'status'],
    ['número cero', [{ ...draftVersion, number: 0 }], 'number'],
    ['comentarios negativos', [{ ...draftVersion, openComments: -1 }], 'openComments'],
    ['fecha sin zona', [{ ...draftVersion, updatedAt: '2026-10-30 15:20' }], 'updatedAt'],
    ['sin curso', [{ ...draftVersion, course: null }], 'course']
  ])('rechaza mis versiones: %s', (_case, body, hint) => {
    expect(() => parseContract(studioVersionListSchema, 'GET studio/versions', body)).toThrow(ContractError)
    expect(() => parseContract(studioVersionListSchema, 'GET studio/versions', body)).toThrow(hint)
  })

  it.each([
    [
      'tipo de lección desconocido',
      { ...draftDetail, units: [{ ...draftDetail.units[0], lessons: [{ ...draftDetail.units[0]!.lessons[0], type: 'PODCAST' }] }] },
      'type'
    ],
    [
      'recursos con decimales',
      { ...draftDetail, units: [{ ...draftDetail.units[0], lessons: [{ ...draftDetail.units[0]!.lessons[0], resources: 1.5 }] }] },
      'resources'
    ],
    ['decisión desconocida', { ...publishedDetail, decisions: [{ ...publishedDetail.decisions[0], decision: 'ARCHIVAR' }] }, 'decision'],
    ['comentario sin estado', { ...publishedDetail, comments: [{ ...publishedDetail.comments[0], resolved: undefined }] }, 'resolved'],
    ['sin unidades', { ...draftDetail, units: undefined }, 'units']
  ])('rechaza el detalle: %s', (_case, body, hint) => {
    expect(() => parseContract(studioVersionDetailSchema, 'GET studio/versions/x', body)).toThrow(ContractError)
    expect(() => parseContract(studioVersionDetailSchema, 'GET studio/versions/x', body)).toThrow(hint)
  })

  it('acepta las diferencias con la versión anterior, también sin ella', () => {
    const diff = parseContract(versionDiffSchema, 'GET studio/versions/x/diff', draftDiff)
    expect(diff.baseVersion).toBe(1)
    expect(diff.units[1]?.previousTitle).toBe('Liquidación')
    expect(parseContract(versionDiffSchema, 'GET studio/versions/x/diff', publishedDiff).units.every((unit) => unit.change === 'ADDED')).toBe(true)
    expect(() => parseContract(versionDiffSchema, 'GET studio/versions/x/diff', { ...draftDiff, units: [{ ...draftDiff.units[0], change: 'MOVED' }] })).toThrow(
      ContractError
    )
  })
})
