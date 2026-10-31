export const STUDIO_MODULE_ID = 'studio'

// claves de ruta para useWasichaiLinks().to(...)
export const STUDIO_ROUTES = {
  versions: `${STUDIO_MODULE_ID}:versions`,
  version: `${STUDIO_MODULE_ID}:version`
} as const
