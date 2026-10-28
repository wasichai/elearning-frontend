import { describe, expect, it } from 'vitest'
import { ContractError, courseDetailSchema, coursePageSchema, parseContract } from './contract'
import { courseDetail, coursePage, courseSummary } from './test/fixtures'

describe('contrato del catálogo', () => {
  it('acepta los ejemplos del documento', () => {
    expect(parseContract(coursePageSchema, 'courses', coursePage).content).toHaveLength(2)
    expect(parseContract(courseDetailSchema, 'course', courseDetail).credits.proposal?.proposed).toBe(8)
  })

  it('acepta campos nuevos que el contrato no conoce', () => {
    expect(() => parseContract(coursePageSchema, 'courses', { ...coursePage, sortedBy: 'upcoming' })).not.toThrow()
  })

  it('acepta un curso sin sistema de créditos y sin propuesta', () => {
    const credits = { system: null, approved: null, proposal: null }
    expect(parseContract(courseDetailSchema, 'course', { ...courseDetail, credits }).credits.system).toBeNull()
  })

  it.each([
    ['falta un campo', { ...coursePage, totalPages: undefined }, 'totalPages'],
    ['nivel desconocido', { ...coursePage, content: [{ ...courseSummary, level: 'EXPERTO' }] }, 'level'],
    [
      'fecha mal formada',
      { ...coursePage, content: [{ ...courseSummary, nextOffering: { ...courseSummary.nextOffering, startDate: '09/11/2026' } }] },
      'startDate'
    ],
    [
      'zona horaria inexistente',
      { ...coursePage, content: [{ ...courseSummary, nextOffering: { ...courseSummary.nextOffering, timeZone: 'America/Atlantis' } }] },
      'zona horaria'
    ],
    ['horas como texto', { ...coursePage, content: [{ ...courseSummary, workload: { ...courseSummary.workload, totalHours: '48' } }] }, 'totalHours'],
    ['un HTML en vez de JSON', '<!doctype html>', 'expected object']
  ])('rechaza la página de cursos: %s', (_case, body, hint) => {
    expect(() => parseContract(coursePageSchema, 'GET courses', body)).toThrow(ContractError)
    expect(() => parseContract(coursePageSchema, 'GET courses', body)).toThrow(hint)
  })

  it('rechaza una propuesta de créditos de otro sistema', () => {
    const credits = { ...courseDetail.credits, system: 'SCH' }
    expect(() => parseContract(courseDetailSchema, 'course', { ...courseDetail, credits })).toThrow('la propuesta de créditos no corresponde al sistema')
  })

  it('rechaza créditos sin sistema que traen propuesta', () => {
    const credits = { ...courseDetail.credits, system: null }
    expect(() => parseContract(courseDetailSchema, 'course', { ...courseDetail, credits })).toThrow(ContractError)
  })

  it('el error dice qué recurso y qué campo fallaron', () => {
    const error = (() => {
      try {
        parseContract(courseDetailSchema, 'GET courses/srtm-anuncios', { ...courseDetail, units: [{ ...courseDetail.units[0], lessons: 'ninguna' }] })
      } catch (cause) {
        return cause
      }
    })()

    expect(error).toBeInstanceOf(ContractError)
    expect((error as ContractError).resource).toBe('GET courses/srtm-anuncios')
    expect((error as Error).message).toMatch(/GET courses\/srtm-anuncios[\s\S]*units\[0\]\.lessons/)
  })
})
