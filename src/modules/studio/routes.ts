export const STUDIO_MODULE_ID = 'studio'

// claves de ruta para useWasichaiLinks().to(...)
export const STUDIO_ROUTES = {
  versions: `${STUDIO_MODULE_ID}:versions`,
  version: `${STUDIO_MODULE_ID}:version`,
  import: `${STUDIO_MODULE_ID}:import`,
  newCourse: `${STUDIO_MODULE_ID}:newCourse`,
  newUnit: `${STUDIO_MODULE_ID}:newUnit`,
  newLesson: `${STUDIO_MODULE_ID}:newLesson`
} as const
