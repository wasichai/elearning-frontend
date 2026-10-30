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
