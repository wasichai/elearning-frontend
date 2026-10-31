import type { WasichaiConfig } from '@wasichai/core'
import { QUIPU_SYSTEM_THEMES, QUIPU_THEMES } from './theme/themes'

// nombre de trabajo: el producto se llama como diga VITE_APP_NAME en cada despliegue (ADR-0005 del backend)
export const DEFAULT_APP_NAME = 'wasichai-learning'
// el administrador de la semilla de Wasichai (perfil dev del backend); en producción el login sale vacío
export const DEV_LOGIN_EMAIL = 'admin@wasichai.local'

export interface AppEnv {
  VITE_APP_NAME?: string
  VITE_VIDEO_COMPLETION?: string
  DEV: boolean
}

// una variable vacía en .env cuenta como no puesta
export function appName(env: Pick<AppEnv, 'VITE_APP_NAME'> = import.meta.env): string {
  return env.VITE_APP_NAME?.trim() || DEFAULT_APP_NAME
}

// fracción de un vídeo que hay que reproducir para completar su lección (RF-AUL-04): por defecto, todo (el final).
// VITE_VIDEO_COMPLETION la cambia por despliegue, entre 0 (excluido) y 1; vacía o inválida, el defecto
export const DEFAULT_VIDEO_COMPLETION = 1

export function videoCompletion(env: Pick<AppEnv, 'VITE_VIDEO_COMPLETION'> = import.meta.env): number {
  const text = env.VITE_VIDEO_COMPLETION?.trim()
  const value = text ? Number(text) : Number.NaN
  return value > 0 && value <= 1 ? value : DEFAULT_VIDEO_COMPLETION
}

// la configuración de <WasichaiApp>. /api lo atiende el proxy de Vite (vite.config.ts) o el del despliegue.
// storagePrefix propio: otra app de Wasichai en el mismo origen no comparte sesión, idioma ni tema.
export function createConfig(env: AppEnv = import.meta.env): WasichaiConfig {
  return {
    apiBaseUrl: '/api',
    appName: appName(env),
    storagePrefix: 'elearning',
    languages: ['es', 'en'],
    timeZone: 'America/Lima',
    // el tema Quipu (src/theme): lo abre un usuario nuevo; claro y oscuro de Wasichai siguen en el selector
    themes: QUIPU_THEMES,
    systemThemes: QUIPU_SYSTEM_THEMES,
    defaultLoginEmail: env.DEV ? DEV_LOGIN_EMAIL : ''
  }
}
