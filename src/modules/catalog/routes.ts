export const CATALOG_MODULE_ID = 'catalog'

// claves de ruta para useWasichaiLinks().to(...)
export const CATALOG_ROUTES = {
  courses: `${CATALOG_MODULE_ID}:courses`,
  course: `${CATALOG_MODULE_ID}:course`
} as const

// el aula de una matrícula, del módulo classroom: la clave de ruta como texto, que es lo que permite el registro sin
// importar otro módulo. si el aula no está registrada, links.has(…) es false y la ficha no ofrece matricularse
export const CLASSROOM_ROUTE = 'classroom:classroom'
