// los ejemplos del contrato v1 del catálogo (contrato-catalogo.md del backend), completados donde el documento pone «…».
// cada prueba copia y altera lo que necesita: estos objetos no se mutan.

export const courseSummary = {
  slug: 'srtm-anuncios',
  code: 'SRTM-ANU-101',
  title: 'Licencias de anuncios con SRTM',
  summary: 'Tramitación de licencias de publicidad exterior en el sistema de rentas municipal.',
  language: 'es',
  level: 'INICIAL',
  modality: 'ASINCRONA',
  category: { slug: 'gestion-municipal', name: 'Gestión municipal' },
  weeks: 4,
  workload: { totalHours: 48, contactHours: 24, autonomousHours: 24 },
  nextOffering: {
    code: 'edicion-srtm-2026-11',
    status: 'INSCRIPCION_ABIERTA',
    startDate: '2026-11-09',
    endDate: '2026-12-04',
    timeZone: 'America/Lima',
    enrollmentOpen: true
  },
  illustrative: true
}

export const courseWithoutOffering = {
  ...courseSummary,
  slug: 'sgspe-introductorio',
  code: 'SGSPE-101',
  title: 'Introducción al SGSPE',
  summary: 'Primeros pasos con el sistema de gestión.',
  level: 'INTERMEDIO',
  modality: 'HIBRIDA',
  category: null,
  weeks: 6,
  workload: { totalHours: 72, contactHours: 36, autonomousHours: 36 },
  nextOffering: null,
  illustrative: false
}

export const coursePage = {
  content: [courseSummary, courseWithoutOffering],
  page: 0,
  size: 12,
  totalElements: 2,
  totalPages: 1,
  facets: {
    categories: [
      { slug: 'gestion-municipal', name: 'Gestión municipal', count: 2 },
      { slug: 'programacion', name: 'Programación', count: 1 }
    ]
  }
}

export const emptyPage = { ...coursePage, content: [], totalElements: 0, totalPages: 0 }

const { nextOffering: _nextOffering, ...summaryWithoutOffering } = courseSummary

export const courseDetail = {
  ...summaryWithoutOffering,
  weeks: 6,
  prerequisiteKnowledge: 'Manejo básico de hoja de cálculo.',
  version: { number: 1, publishedAt: '2026-10-20T15:00:00Z' },
  objectives: ['Registrar una solicitud de licencia', 'Emitir la liquidación'],
  learningOutcomes: ['Tramita una licencia de anuncio de principio a fin'],
  requirements: 'Cuenta de usuario en SRTM de pruebas.',
  assessment: 'Cuestionario por unidad y caso práctico final.',
  certification: 'Constancia de participación.',
  sources: ['Manual de usuario SRTM, módulo de anuncios'],
  workload: {
    weeks: 6,
    weekly: { theory: 12, practice: 12, supervised: 0, autonomous: 12 },
    theoryHours: 72,
    practiceHours: 72,
    supervisedHours: 0,
    autonomousHours: 72,
    contactHours: 144,
    directedHours: 144,
    totalHours: 216
  },
  credits: {
    system: 'ECTS',
    approved: null,
    proposal: {
      system: 'ECTS',
      policyId: 'ects-carga-total',
      policyVersion: '1',
      method: 'Horas totales entre horas por crédito, redondeado al paso',
      parameters: { horasPorCredito: '27', paso: '0.5' },
      source: 'Guía ECTS 2015, sección 4',
      totalHours: 216,
      calculated: 8,
      proposed: 8,
      warnings: [],
      status: 'PROPUESTO'
    }
  },
  units: [
    {
      order: 1,
      title: 'El trámite de anuncios',
      description: 'Qué es una licencia de anuncio y quién la pide.',
      objectives: ['Distinguir los tipos de anuncio'],
      estimatedHours: 6,
      lessons: [
        {
          order: 1,
          title: 'Tipos de anuncio',
          type: 'LECTURA',
          durationMinutes: 30,
          summary: 'Clasificación de anuncios.',
          source: 'wasichai/srtm-backend@6daacd3:docs/anuncios.adoc#tipos'
        },
        { order: 2, title: 'Recorrido por la pantalla', type: 'VIDEO', durationMinutes: 15, summary: 'Demostración.', source: 'manual-srtm#pantalla' }
      ]
    }
  ],
  offerings: [
    {
      code: 'edicion-srtm-2026-11',
      status: 'INSCRIPCION_ABIERTA',
      startDate: '2026-11-09',
      endDate: '2026-12-04',
      timeZone: 'America/Lima',
      enrollmentFrom: '2026-10-15',
      enrollmentUntil: '2026-11-06',
      enrollmentOpen: true,
      capacity: 30,
      schedule: 'Martes y jueves, 18:00–20:00',
      teachers: [{ name: 'Ana Quispe', professionalTitle: 'Ing. de sistemas', role: 'TITULAR' }]
    }
  ],
  teachers: [{ name: 'Ana Quispe', professionalTitle: 'Ing. de sistemas', bio: 'Diez años en rentas municipales.', specialties: 'Tributación local' }]
}

export const problem = (status: number, detail: string, errors: { field: string; message: string }[] = []) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Internal Server Error',
  status,
  detail,
  errors
})
