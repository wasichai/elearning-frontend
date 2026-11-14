// el nombre y el logo del producto, por despliegue y al compilar (VITE_APP_NAME, VITE_APP_LOGO). puro, sin React: lo usan la
// configuración de la app (src/config.ts) y el index.html (vite.config.ts, por brandHtml)

// nombre de trabajo: el producto se llama como diga VITE_APP_NAME en cada despliegue (ADR-0005 del backend)
export const DEFAULT_APP_NAME = 'wasichai-learning'

export interface BrandEnv {
  VITE_APP_NAME?: string
  VITE_APP_LOGO?: string
}

// una variable vacía en .env cuenta como no puesta
export function appName(env: Pick<BrandEnv, 'VITE_APP_NAME'> = import.meta.env): string {
  return env.VITE_APP_NAME?.trim() || DEFAULT_APP_NAME
}

// una ruta del propio sitio (/logo.svg, el archivo en public/) o una URL http(s). otra cosa (javascript:, data:, //otro-host)
// no es un logo: queda la marca Colofón
const LOGO_URL = /^(\/(?!\/)|https?:\/\/)/i

export function appLogoUrl(env: Pick<BrandEnv, 'VITE_APP_LOGO'> = import.meta.env): string | undefined {
  const url = env.VITE_APP_LOGO?.trim()
  return url && LOGO_URL.test(url) ? url : undefined
}
