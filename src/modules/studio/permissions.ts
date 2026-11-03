import type { CallerPermissions } from '@wasichai/core'

// el enlace «Importar desde un repositorio» es cortesía (CLAUDE.md, regla 4): el servidor exige CREATE sobre version_curso,
// unidad y leccion para ver los orígenes y para importar (403 si no). nunca se compara un nombre de rol
const IMPORT_OBJECTS = ['version_curso', 'unidad', 'leccion']

export function canImport(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || IMPORT_OBJECTS.every((object) => (permissions.objects[object] ?? []).includes('CREATE')))
}

// el menú «Contenido» y lo que crea versiones son cortesía (CLAUDE.md, regla 4): GET /lms/studio/versions devuelve solo las versiones
// de quien las escribió y lo ajeno es 404. se muestra a quien puede crear versiones de curso (version_curso: CREATE) o administra.
// nunca se compara un nombre de rol
export function canAuthor(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.version_curso ?? []).includes('CREATE'))
}

// quien puede leer la lista de cursos de core (cortesía: decide el servidor)
export function canReadCourses(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.curso ?? []).includes('READ'))
}

// el enlace «Nuevo curso» es cortesía: el servidor exige CREATE sobre curso al guardar. por permiso, nunca por rol
export function canCreateCourse(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.curso ?? []).includes('CREATE'))
}
