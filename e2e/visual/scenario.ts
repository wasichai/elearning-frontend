import type { Page } from '@playwright/test'
import type { FakeApiOptions } from '../api'

// una pantalla del recorrido visual con su API simulada y lo que hay que hacer para llegar al estado que se quiere ver
export interface Scenario {
  name: string
  path: string
  api?: FakeApiOptions
  act?: (page: Page) => Promise<void>
}

export const student: FakeApiOptions = { signedIn: true }
export const teacher: FakeApiOptions = { signedIn: true, as: 'teacher' }
export const creator: FakeApiOptions = { signedIn: true, as: 'creator' }
export const reviewer: FakeApiOptions = { signedIn: true, as: 'reviewer' }
export const administrator: FakeApiOptions = { signedIn: true, as: 'administrator' }
// sin ninguna sección del LMS: aterriza en el panel de core (#178)
export const authority: FakeApiOptions = { signedIn: true, as: 'authority' }
