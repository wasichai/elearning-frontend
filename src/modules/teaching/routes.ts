export const TEACHING_MODULE_ID = 'teaching'

// claves de ruta para useWasichaiLinks().to(...)
export const TEACHING_ROUTES = {
  offerings: `${TEACHING_MODULE_ID}:offerings`,
  roster: `${TEACHING_MODULE_ID}:roster`,
  queue: `${TEACHING_MODULE_ID}:queue`,
  attempt: `${TEACHING_MODULE_ID}:attempt`,
  sessions: `${TEACHING_MODULE_ID}:sessions`,
  attendance: `${TEACHING_MODULE_ID}:attendance`
} as const

// la lista de matrículas del aula (módulo classroom): la clave de ruta como texto, que es lo que permite el registro sin importar
// otro módulo. si no está registrado, links.has(…) es false y no se enlaza
export const CLASSROOM_ENROLLMENTS_ROUTE = 'classroom:enrollments'
