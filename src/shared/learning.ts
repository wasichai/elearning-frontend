import type { CallerPermissions } from '@wasichai/core'

// quien puede abrir «Mis cursos»: GET /lms/classroom/enrollments exige matricula: READ (403 si no) y solo devuelve las de
// la persona. es cortesía (CLAUDE.md, regla 4): decide el servidor. lo usan el menú del aula, el inicio y la cabecera
// pública. nunca se compara un nombre de rol
export function canLearn(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects.matricula ?? []).includes('READ'))
}
