import type { WasichaiConfig } from '@wasichai/core'
import { createElement, lazy } from 'react'
import { ColofonMark } from './shared/ColofonMark'
import { homeRoute, shellChrome, shellNav } from './shellNav'
import { COLOFON_SYSTEM_THEMES, COLOFON_THEMES } from './theme/themes'
import { appLogoUrl, appName, type BrandEnv } from './brand'

export { appLogoUrl, appName, DEFAULT_APP_NAME } from './brand'

// la portada pública: lo que / muestra sin sesión, fuera del shell (publicHome de @wasichai/core). perezosa: quien entra con sesión no la baja
const LandingPage = lazy(() => import('./modules/catalog/LandingPage').then((m) => ({ default: m.LandingPage })))

// el administrador de la semilla de Wasichai (perfil dev del backend); en producción el login sale vacío
export const DEV_LOGIN_EMAIL = 'admin@wasichai.local'

export interface AppEnv extends BrandEnv {
  VITE_VIDEO_COMPLETION?: string
  DEV: boolean
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
    // sin el lema por defecto de Wasichai, que habla de otro producto; el nombre basta
    appTagline: '',
    // la marca junto al nombre: barra lateral, cajón, barra estrecha, login y páginas públicas. core la deja aria-hidden.
    // VITE_APP_LOGO la cambia por la imagen del despliegue
    appLogo: brandLogo(appLogoUrl(env)),
    storagePrefix: 'elearning',
    languages: ['es', 'en'],
    timeZone: 'America/Lima',
    // el tema Colofón (src/theme): lo abre un usuario nuevo; claro y oscuro de Wasichai siguen en el selector
    themes: COLOFON_THEMES,
    systemThemes: COLOFON_SYSTEM_THEMES,
    defaultLoginEmail: env.DEV ? DEV_LOGIN_EMAIL : '',
    // qué menú se ve según el permiso y la ruta: la sección de administración es un estado del menú
    shellNav,
    // adónde lleva / y «Inicio» según quién entra
    homeRoute,
    // y sin sesión, / es la portada
    publicHome: LandingPage,
    // la lección abierta, en el shell estrecho
    shellChrome
  }
}

// la imagen del despliegue, decorativa como la marca (el nombre es el texto accesible), o la «c» de Colofón
function brandLogo(url: string | undefined) {
  return url ? createElement('img', { src: url, alt: '', className: 'size-7 shrink-0 object-contain' }) : createElement(ColofonMark, { className: 'size-7' })
}
