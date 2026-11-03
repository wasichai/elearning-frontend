import { describe, expect, it } from 'vitest'
import { ContractError, courseRecordPageSchema, importJobListSchema, importJobSchema, importSourceListSchema, parseContract } from './contract'
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

  it('acepta un tipo de problema nuevo: el contrato le da gravedad a «cualquier tipo nuevo»', () => {
    const report = { ...importReport, problems: [{ ...importReport.problems[0], kind: 'NEW_KIND', severity: 'GAP' }] }
    const [job] = parseContract(importJobListSchema, 'GET studio/import', [{ ...doneJob, report }])
    expect(job?.report?.problems[0]).toMatchObject({ kind: 'NEW_KIND', severity: 'GAP' })
  })

  it('acepta la lista de trabajos con lo pedido y sus fechas, y una lista vacía', () => {
    const jobs = parseContract(importJobListSchema, 'GET studio/import', [runningJob, doneJob, failedJob])
    expect(jobs.map((job) => job.status)).toEqual(['EN_CURSO', 'HECHO', 'FALLIDO'])
    expect(jobs[0]).toMatchObject({ finishedAt: null, createdAt: pendingJob.createdAt, source: pendingJob.source, courseId: pendingJob.courseId })
    expect(jobs[1]?.report?.problemsBySeverity).toEqual({ GAP: 1, CHECK: 2 })
    expect(jobs[1]?.report?.problems[0]?.severity).toBe('CHECK')
    expect(parseContract(importJobListSchema, 'GET studio/import', [])).toEqual([])
    expect(() => parseContract(importJobListSchema, 'GET studio/import', { content: [] })).toThrow(ContractError)
    // el instante real del servidor, con microsegundos
    expect(parseContract(importJobSchema, 'job', { ...pendingJob, createdAt: '2026-11-03T06:51:22.408123Z' }).createdAt).toBe('2026-11-03T06:51:22.408123Z')
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
    ['problema con tipo vacío', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], kind: '' }] } }, 'kind'],
    ['problema sin tipo', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], kind: undefined }] } }, 'kind'],
    ['línea negativa', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], line: -1 }] } }, 'line'],
    ['informe sin recuento', { ...doneJob, report: { ...importReport, problemCount: undefined } }, 'problemCount'],
    ['sin id', { ...pendingJob, id: '' }, 'id'],
    ['gravedad desconocida', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], severity: 'INFO' }] } }, 'severity'],
    ['problema sin gravedad', { ...doneJob, report: { ...importReport, problems: [{ ...importReport.problems[0], severity: undefined }] } }, 'severity'],
    ['informe sin totales por gravedad', { ...doneJob, report: { ...importReport, problemsBySeverity: undefined } }, 'problemsBySeverity'],
    ['totales incompletos', { ...doneJob, report: { ...importReport, problemsBySeverity: { GAP: 1 } } }, 'CHECK'],
    ['total negativo', { ...doneJob, report: { ...importReport, problemsBySeverity: { GAP: -1, CHECK: 0 } } }, 'GAP'],
    ['sin fuente', { ...pendingJob, source: '' }, 'source'],
    ['sin curso', { ...pendingJob, courseId: undefined }, 'courseId'],
    ['sin fecha de creación', { ...pendingJob, createdAt: undefined }, 'createdAt'],
    ['fecha que no es un instante', { ...pendingJob, createdAt: 'ayer' }, 'createdAt'],
    ['fin que no es un instante', { ...failedJob, finishedAt: 'hoy' }, 'finishedAt']
  ])('rechaza el trabajo: %s', (_case, body, hint) => {
    expect(() => parseContract(importJobSchema, 'GET studio/import/x', body)).toThrow(ContractError)
    expect(() => parseContract(importJobSchema, 'GET studio/import/x', body)).toThrow(hint)
  })
})
