import { reviewer, type Scenario } from '../scenario'

export const reviewScenarios: Scenario[] = [
  { name: 'review-inbox', path: '/revision', api: reviewer },
  { name: 'review-version', path: '/revision/ver-sgspe-2', api: reviewer }
]
