// nombre de trabajo: el producto se llama como diga VITE_APP_NAME en cada despliegue (ADR-0005 del backend)
export const DEFAULT_APP_NAME = 'wasichai-learning'

export interface AppEnv {
  VITE_APP_NAME?: string
}

// una variable vacía en .env cuenta como no puesta
export function appName(env: AppEnv = import.meta.env): string {
  return env.VITE_APP_NAME?.trim() || DEFAULT_APP_NAME
}
