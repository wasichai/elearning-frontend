import { creator, type Scenario } from '../scenario'

export const studioScenarios: Scenario[] = [
  { name: 'studio', path: '/estudio', api: creator },
  { name: 'studio-draft', path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000002', api: creator },
  { name: 'studio-published', path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000001', api: creator },
  { name: 'studio-import', path: '/estudio/importar', api: creator }
]
