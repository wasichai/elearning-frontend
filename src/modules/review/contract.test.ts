import { describe, expect, it } from 'vitest'
import { ContractError, parseContract, reviewCommentSchema, studioVersionDetailSchema, studioVersionListSchema, studioVersionSchema } from './contract'
import { otherVersionInReview, versionDetail, versionInReview } from './test/fixtures'

describe('contrato de la bandeja del revisor', () => {
  it('acepta los ejemplos del documento, también listas vacías, nulos y campos nuevos', () => {
    expect(parseContract(studioVersionListSchema, 'inbox', [versionInReview, otherVersionInReview])).toHaveLength(2)
    expect(parseContract(studioVersionListSchema, 'inbox', [])).toEqual([])
    expect(parseContract(studioVersionSchema, 'version', { ...versionInReview, updatedAt: null, authorId: null, extra: 1 }).updatedAt).toBeNull()
    const detail = parseContract(studioVersionDetailSchema, 'detail', versionDetail)
    expect(detail.units[0]?.lessons[1]?.hasAssessment).toBe(true)
    expect(detail.decisions[0]?.decision).toBe('PEDIR_CAMBIOS')
    expect(parseContract(studioVersionDetailSchema, 'detail', { ...versionDetail, units: [], comments: [], decisions: [] }).units).toEqual([])
    // un tipo de lección que la interfaz aún no conoce no rompe
    const unknownType = { ...versionDetail, units: [{ ...versionDetail.units[0]!, lessons: [{ ...versionDetail.units[0]!.lessons[0]!, type: 'PODCAST' }] }] }
    expect(parseContract(studioVersionDetailSchema, 'detail', unknownType).units[0]?.lessons[0]?.type).toBe('PODCAST')
  })

  it('rechaza un estado o una decisión desconocidos y tipos equivocados', () => {
    expect(() => parseContract(studioVersionListSchema, 'inbox', [{ ...versionInReview, status: 'ARCHIVADA' }])).toThrow(ContractError)
    expect(() => parseContract(studioVersionSchema, 'version', { ...versionInReview, openComments: '1' })).toThrow(ContractError)
    expect(() =>
      parseContract(studioVersionDetailSchema, 'detail', { ...versionDetail, decisions: [{ ...versionDetail.decisions[0]!, decision: 'OK' }] })
    ).toThrow(ContractError)
    expect(() => parseContract(reviewCommentSchema, 'comment', { ...versionDetail.comments[0]!, resolved: 'no' })).toThrow(ContractError)
  })
})
