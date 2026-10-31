import type { CallerPermissions } from '@wasichai/core'

// acciones declaradas sobre version_curso (model/model.json del backend)
const VERSION_OBJECT = 'version_curso'

// el menú «Bandeja de revisión» es cortesía (CLAUDE.md, regla 4): la bandeja exige APROBAR sobre version_curso (403 si no) y
// solo lista lo que está a cargo de la persona; eso lo decide el servidor. nunca se compara un nombre de rol
export function canReview(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects[VERSION_OBJECT] ?? []).includes('APROBAR'))
}

// publicar lo aprobado exige PUBLICAR; el botón se oculta sin él, y el servidor responde 403 igual
export function canPublish(permissions: CallerPermissions | null): boolean {
  return permissions !== null && (permissions.admin || (permissions.objects[VERSION_OBJECT] ?? []).includes('PUBLICAR'))
}
