// ejemplos del contrato de la importación («Importación» en docs/api/lms.md del backend). los usan las pruebas unitarias
// y las extremo a extremo (e2e/studio-api.ts)

export const PINNED_SHA = '4f2a9c1e0b7d6a5f4e3d2c1b0a9f8e7d6c5b4a39'
export const ANY_SHA = '0123456789abcdef0123456789abcdef01234567'

// un repositorio con cualquier commit y otro fijado a uno
export const importSources = [
  { repository: 'wasichai/manual-sgspe', sha: null },
  { repository: 'wasichai/manual-srtm', sha: PINNED_SHA }
]

// los cursos que la persona puede leer, como los da la API de registros de Wasichai (GET /objects/curso/records)
export const courseRecords = {
  content: [
    {
      id: 'c0a8e1f2-0000-4000-8000-0000000000aa',
      createdAt: '2026-01-10T12:00:00Z',
      updatedAt: null,
      attributes: { codigo: 'SGSPE-101', titulo: 'Introducción al SGSPE', estado: 'ACTIVO' }
    },
    {
      id: 'c0a8e1f2-0000-4000-8000-0000000000bb',
      createdAt: '2026-02-01T12:00:00Z',
      updatedAt: null,
      attributes: { codigo: 'SRTM-201', titulo: 'Administración tributaria municipal', estado: 'ACTIVO' }
    }
  ],
  page: 0,
  size: 200,
  totalElements: 2,
  totalPages: 1
}

export const IMPORT_JOB_ID = 'f1e2d3c4-0000-4000-8000-000000000001'
export const IMPORTED_VERSION_ID = 'a1b2c3d4-0000-4000-8000-000000000009'
export const SOURCE = `wasichai/manual-sgspe@${ANY_SHA}:manual/maestro.adoc`

export const pendingJob = { id: IMPORT_JOB_ID, status: 'PENDIENTE', error: null, versionId: null, report: null }
export const runningJob = { ...pendingJob, status: 'EN_CURSO' }

export const importReport = {
  source: SOURCE,
  files: 6,
  includes: 5,
  sections: 14,
  images: 3,
  units: 3,
  lessons: 11,
  problemCount: 3,
  problems: [
    { kind: 'MISSING_IMAGE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/acceso.adoc`, line: 12, detail: 'img/portal.png' },
    { kind: 'MISSING_INCLUDE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/maestro.adoc`, line: 8, detail: 'anexos.adoc' },
    { kind: 'MISSING_IMAGE', origin: `wasichai/manual-sgspe@${ANY_SHA}:manual/pagos.adoc`, line: 0, detail: 'img/caja.png' }
  ]
}

export const doneJob = { ...pendingJob, status: 'HECHO', versionId: IMPORTED_VERSION_ID, report: importReport }
export const failedJob = { ...pendingJob, status: 'FALLIDO', error: 'manual/maestro.adoc does not exist at this commit' }
