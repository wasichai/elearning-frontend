import type { Scenario } from '../scenario'

export const catalogScenarios: Scenario[] = [
  { name: 'catalog', path: '/cursos' },
  { name: 'catalog-empty', path: '/cursos?q=no-existe-ninguno' },
  { name: 'catalog-course', path: '/cursos/srtm-anuncios' },
  { name: 'catalog-course-full', path: '/cursos/srtm-anuncios', api: { offeringFull: true } },
  { name: 'catalog-course-missing', path: '/cursos/no-existe' }
]
