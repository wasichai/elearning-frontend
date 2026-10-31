import { describe, expect, it } from 'vitest'
import { ContractError, courseRecordPageSchema, importJobSchema, importSourceListSchema, parseContract } from './contract'
import { courseRecords, doneJob, failedJob, importReport, importSources, pendingJob, runningJob } from './test/importFixtures'

describe('contrato de la importación', () => {
  it('acepta los ejemplos del documento, también nulos y campos nuevos', () => {
    expect(parseContract(importSourceListSchema, 'sources', importSources)).toHaveLength(2)
    expect(parseContract(importSourceListSchema, 'sources', [])).toEqual([])
    expect(parseContract(importJobSchema, 'job', pendingJob).status).toBe('PENDIENTE')
    expect(parseContract(importJobSchema, 'job', { ...runningJob, error: 'GitHub respondió 502', extra: 1 }).error).toBe('GitHub respondió 502')
    expect(parseContract(importJobSchema, 'job', doneJob).report?.problems[0]?.kind).toBe('MISSING_IMAGE')
    expect(parseContract(importJobSchema, 'job', failedJob).report).toBeNull()
    expect(parseContract(courseRecordPageSchema, 'cursos', courseRecords).content[1]?.attributes.titulo).toBe('Administración tributaria municipal')
    expect(parseContract(courseRecordPageSchema, 'cursos', { content: [{ id: 'c', attributes: { titulo: null } }] }).content).toHaveLength(1)
  })

  it.each([
    ['sha incompleto', [{ repository: 'wasichai/manual', sha: '4f2a9c1' }], 'sha'],
    ['sha en mayúsculas', [{ repository: 'wasichai/manual', sha: 'A'.repeat(40) }], 'sha'],
    ['repositorio sin dueño', [{ repository: 'manual', sha: null }], 'repository']
  ])('rechaza los orígenes: %s', (_case, body, hint) => {
    expect(() => parseContract(importSourceListSchema, 'GET studio/import/sources', body)).toThrow(ContractError)
    expect(() => parseContract(importSourceListSchema, 'GET studio/import/sources', body)).toThrow(hint)
  })

  it.each([
    ['estado desconocido', { ...pendingJob, status: 'CANCELADO' }, 'status'],
    ['problema desconocido', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], kind: 'TYPO' }] } }, 'kind'],
    ['línea negativa', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], line: -1 }] } }, 'line'],
    ['informe sin recuento', { ...doneJob, report: { ...importReport, problemCount: undefined } }, 'problemCount'],
    ['sin id', { ...pendingJob, id: '' }, 'id']
  ])('rechaza el trabajo: %s', (_case, body, hint) => {
    expect(() => parseContract(importJobSchema, 'GET studio/import/x', body)).toThrow(ContractError)
    expect(() => parseContract(importJobSchema, 'GET studio/import/x', body)).toThrow(hint)
  })
})
