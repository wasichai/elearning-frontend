export const CLASSROOM_MODULE_ID = 'classroom'

// claves de ruta para useWasichaiLinks().to(...)
export const CLASSROOM_ROUTES = {
  enrollments: `${CLASSROOM_MODULE_ID}:enrollments`,
  classroom: `${CLASSROOM_MODULE_ID}:classroom`
} as const

// la lección abierta del aula vive en la URL (?leccion=<id>): se vuelve a ella y se comparte con el enlace
export const LESSON_PARAM = 'leccion'

// la lista del catálogo (módulo catalog): la clave de ruta como texto, que es lo que permite el registro sin importar
// otro módulo. si el catálogo no está registrado, links.has(…) es false y no se enlaza
export const CATALOG_COURSES_ROUTE = 'catalog:courses'
