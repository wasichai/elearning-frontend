export const CATALOG_MODULE_ID = 'catalog'

// claves de ruta para useWasichaiLinks().to(...)
export const CATALOG_ROUTES = {
  courses: `${CATALOG_MODULE_ID}:courses`,
  course: `${CATALOG_MODULE_ID}:course`
} as const
