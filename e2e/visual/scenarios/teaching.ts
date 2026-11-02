import { teacher, type Scenario } from '../scenario'

const OFFERING = '/docencia/edicion-sgspe-2026-09'

export const teachingScenarios: Scenario[] = [
  { name: 'teacher-offerings', path: '/docencia', api: teacher },
  { name: 'teacher-offerings-empty', path: '/docencia', api: { ...teacher, noOfferings: true } },
  { name: 'teacher-roster', path: OFFERING, api: teacher },
  { name: 'teacher-queue', path: `${OFFERING}/correccion`, api: teacher },
  { name: 'teacher-sessions', path: `${OFFERING}/sesiones`, api: teacher }
]
