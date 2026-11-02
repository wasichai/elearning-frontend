import type { CallerPermissions } from '@wasichai/core'

// el enlace «Importar desde un repositorio» es cortesía (CLAUDE.md, regla 4): el servidor exige CREATE sobre version_curso,
// unidad y leccion para ver los orígenes y para importar (403 si no). nunca se compara un nombre de rol
const IMPORT_OBJECTS = ['version_curso', 'unidad', 'leccion']

export function canImport(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || IMPORT_OBJECTS.every((object) => (permissions.objects[object] ?? []).includes('CREATE')))
}

// el enlace «Nuevo curso» es cortesía: el servidor exige CREATE sobre curso al guardar. por permiso, nunca por rol
export function canCreateCourse(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.curso ?? []).includes('CREATE'))
}
