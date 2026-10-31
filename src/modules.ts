import type { WasichaiModule } from '@wasichai/core'
import { catalogModule } from './modules/catalog/module'
import { classroomModule } from './modules/classroom/module'
import { teachingModule } from './modules/teaching/module'

// los módulos de la app, además de coreModule, que WasichaiApp pone siempre (login, panel, objetos, administración).
// el backend solo corre el starter base de Wasichai: ningún módulo de @wasichai/{views,forms,...} tendría servidor.
// un módulo por experiencia del LMS (ADR-0003 y ADR-0005 del backend).
export const modules: WasichaiModule[] = [catalogModule(), classroomModule(), teachingModule()]
