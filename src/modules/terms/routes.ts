export const TERMS_MODULE_ID = 'terms'

// claves de ruta para useWasichaiLinks().to(...)
export const TERMS_ROUTES = {
  terms: `${TERMS_MODULE_ID}:terms`
} as const

// publicar los términos, del módulo administration: la clave de ruta como texto. si no está registrada, links.has(…) es false y no se enlaza
export const PUBLISH_TERMS_ROUTE = 'administration:terms'
