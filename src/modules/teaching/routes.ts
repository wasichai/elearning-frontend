export const TEACHING_MODULE_ID = 'teaching'

// claves de ruta para useWasichaiLinks().to(...)
export const TEACHING_ROUTES = {
  offerings: `${TEACHING_MODULE_ID}:offerings`,
  roster: `${TEACHING_MODULE_ID}:roster`
} as const
