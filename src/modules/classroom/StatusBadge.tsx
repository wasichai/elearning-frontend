import { isDone, type ProgressStatus } from './contract'

export { STATUS_STATES, StatusBadge, type StatusState } from '../../shared/StatusBadge'

// el estado de la insignia que le toca a una lección según su progreso
export function statusOf(status: ProgressStatus): 'done' | 'active' | 'todo' {
  return isDone(status) ? 'done' : status === 'INICIADA' ? 'active' : 'todo'
}
