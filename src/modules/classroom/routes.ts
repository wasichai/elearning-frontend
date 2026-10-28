export const CLASSROOM_MODULE_ID = 'classroom'

// claves de ruta para useWasichaiLinks().to(...)
export const CLASSROOM_ROUTES = {
  enrollments: `${CLASSROOM_MODULE_ID}:enrollments`,
  classroom: `${CLASSROOM_MODULE_ID}:classroom`,
  sessions: `${CLASSROOM_MODULE_ID}:sessions`,
  completion: `${CLASSROOM_MODULE_ID}:completion`,
  verify: `${CLASSROOM_MODULE_ID}:verify`,
  certificate: `${CLASSROOM_MODULE_ID}:certificate`
} as const

// la lección abierta del aula vive en la URL (?leccion=<id>): se vuelve a ella y se comparte con el enlace
export const LESSON_PARAM = 'leccion'
// el intento abierto de la evaluación de esa lección (?leccion=<id>&intento=<id>)
export const ATTEMPT_PARAM = 'intento'

// la lista del catálogo (módulo catalog): la clave de ruta como texto, que es lo que permite el registro sin importar
// otro módulo. si el catálogo no está registrado, links.has(…) es false y no se enlaza
export const CATALOG_COURSES_ROUTE = 'catalog:courses'
