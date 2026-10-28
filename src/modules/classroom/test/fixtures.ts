// ejemplos del contrato del aula («Aula del estudiante» en docs/api/lms.md del backend), completados donde el documento
// pone «…». los usan las pruebas unitarias y las extremo a extremo (e2e/api.ts). cada prueba copia y altera lo que
// necesita: estos objetos no se mutan.

const FILES = '/api/objects/version_recurso/records'

export const lessonHtml = `<!doctype html><html lang="es"><body><h1>Tipos de anuncio</h1><p>Un anuncio puede ser adosado, luminoso o en panel.</p><script>document.body.setAttribute('data-script', 'ran')</script></body></html>`

export const enrollment = {
  id: 'mat-srtm-1',
  status: 'ACTIVA',
  enrolledAt: '2026-10-28T15:00:00Z',
  course: { slug: 'srtm-anuncios', code: 'SRTM-ANU-101', title: 'Licencias de anuncios con SRTM' },
  version: 1,
  offering: { code: 'edicion-srtm-2026-11', status: 'INSCRIPCION_ABIERTA', startDate: '2026-11-09', endDate: '2026-12-04', timeZone: 'America/Lima' },
  progress: { completedLessons: 1, totalLessons: 3, percent: 33 },
  nextLesson: { id: 'lec-video', title: 'Recorrido por la pantalla', unitOrder: 1, lessonOrder: 2 }
}

export const otherEnrollment = {
  ...enrollment,
  id: 'mat-sgspe-1',
  enrolledAt: '2026-09-01T14:00:00Z',
  course: { slug: 'sgspe-introductorio', code: 'SGSPE-101', title: 'Introducción al SGSPE' },
  offering: { code: 'edicion-sgspe-2026-09', status: 'EN_CURSO', startDate: '2026-09-07', endDate: '2026-10-16', timeZone: 'America/Lima' },
  progress: { completedLessons: 0, totalLessons: 6, percent: 0 },
  nextLesson: { id: 'lec-sgspe-1', title: 'Qué es el SGSPE', unitOrder: 1, lessonOrder: 1 }
}

// todo completado: no queda siguiente lección
export const finishedEnrollment = {
  ...enrollment,
  id: 'mat-done-1',
  course: { slug: 'tributos-locales', code: 'TRI-100', title: 'Tributos locales' },
  offering: { code: 'edicion-tri-2026-08', status: 'FINALIZADA', startDate: '2026-08-03', endDate: '2026-08-28', timeZone: 'America/Lima' },
  progress: { completedLessons: 4, totalLessons: 4, percent: 100 },
  nextLesson: null
}

const notStarted = { status: 'NO_INICIADA', startedAt: null, completedAt: null, evidence: null }

export const classroom = {
  ...enrollment,
  units: [
    {
      id: 'uni-1',
      order: 1,
      title: 'El trámite de anuncios',
      description: 'Qué es una licencia de anuncio y quién la pide.',
      progress: { completedLessons: 1, totalLessons: 2, percent: 50 },
      lessons: [
        {
          id: 'lec-html',
          order: 1,
          title: 'Tipos de anuncio',
          type: 'LECTURA',
          durationMinutes: 30,
          summary: 'Clasificación de anuncios.',
          completion: 'EXPLICIT',
          progress: { status: 'COMPLETADA', startedAt: '2026-10-28T15:05:00Z', completedAt: '2026-10-28T15:30:00Z', evidence: 'FINALIZACION_EXPLICITA' },
          resources: [
            {
              id: 'rec-html',
              title: 'Tipos de anuncio (lectura)',
              type: 'HTML',
              version: 1,
              file: { name: 'leccion.html', contentType: 'text/html', size: 2048, url: `${FILES}/vr-html/files/archivo` }
            }
          ]
        },
        {
          id: 'lec-video',
          order: 2,
          title: 'Recorrido por la pantalla',
          type: 'VIDEO',
          durationMinutes: 15,
          summary: 'Demostración.',
          completion: 'VIDEO_END',
          progress: notStarted,
          resources: [
            {
              id: 'rec-video',
              title: 'Recorrido en vídeo',
              type: 'VIDEO',
              version: 1,
              file: { name: 'recorrido.mp4', contentType: 'video/mp4', size: 1048576, url: `${FILES}/vr-video/files/archivo` }
            }
          ]
        }
      ]
    },
    {
      id: 'uni-2',
      order: 2,
      title: 'La liquidación',
      description: null,
      progress: { completedLessons: 0, totalLessons: 1, percent: 0 },
      lessons: [
        {
          id: 'lec-pdf',
          order: 1,
          title: 'Guía de liquidación',
          type: 'PRESENTACION',
          durationMinutes: null,
          summary: null,
          completion: 'EXPLICIT',
          progress: notStarted,
          resources: [
            {
              id: 'rec-pdf',
              title: 'Guía en PDF',
              type: 'PDF',
              version: 2,
              file: { name: 'guia-liquidacion.pdf', contentType: 'application/pdf', size: 482304, url: `${FILES}/vr-pdf/files/archivo` }
            },
            {
              id: 'rec-xlsx',
              title: 'Plantilla de cálculo',
              type: 'HOJA_CALCULO',
              version: 1,
              file: {
                name: 'plantilla.xlsx',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 10240,
                url: `${FILES}/vr-xlsx/files/archivo`
              }
            },
            { id: 'rec-none', title: 'Material por publicar', type: 'PDF', version: 1, file: null }
          ]
        },
        {
          id: 'lec-quiz',
          order: 2,
          title: 'Cuestionario de la unidad',
          type: 'EVALUACION',
          durationMinutes: 20,
          summary: 'Diez preguntas sobre la liquidación.',
          completion: 'NOT_YET',
          progress: notStarted,
          resources: []
        }
      ]
    }
  ]
}

export const problem = (status: number, detail: string) => ({
  type: 'about:blank',
  title: status === 404 ? 'Not Found' : status === 409 ? 'Conflict' : 'Internal Server Error',
  status,
  detail,
  errors: []
})
