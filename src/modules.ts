import type { WasichaiModule } from '@wasichai/core'

// los módulos de la app, además de coreModule, que WasichaiApp pone siempre (login, panel, objetos, administración).
// el backend solo corre el starter base de Wasichai: ningún módulo de @wasichai/{views,forms,...} tendría servidor.
// los módulos del LMS llegan desde E7 (catálogo), uno por experiencia (ADR-0003 y ADR-0005 del backend).
export const modules: WasichaiModule[] = []
