import type { WasichaiConfig } from '@wasichai/core'

// nombre de trabajo: el producto se llama como diga VITE_APP_NAME en cada despliegue (ADR-0005 del backend)
export const DEFAULT_APP_NAME = 'wasichai-learning'
// el administrador de la semilla de Wasichai (perfil dev del backend); en producción el login sale vacío
export const DEV_LOGIN_EMAIL = 'admin@wasichai.local'

export interface AppEnv {
  VITE_APP_NAME?: string
  DEV: boolean
}

// una variable vacía en .env cuenta como no puesta
export function appName(env: Pick<AppEnv, 'VITE_APP_NAME'> = import.meta.env): string {
  return env.VITE_APP_NAME?.trim() || DEFAULT_APP_NAME
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
    defaultLoginEmail: env.DEV ? DEV_LOGIN_EMAIL : ''
  }
}
