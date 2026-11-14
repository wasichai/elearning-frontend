/// <reference types="vite/client" />

interface ImportMetaEnv {
  // nombre visible del producto; vacío o ausente = el nombre de trabajo
  readonly VITE_APP_NAME?: string
  // logo del producto: una ruta del sitio (/logo.svg, en public/) o una URL http(s); vacío o ausente = la marca Colofón
  readonly VITE_APP_LOGO?: string
  // fracción de un vídeo reproducida que completa su lección (0 < x ≤ 1); vacía o ausente = el final
  readonly VITE_VIDEO_COMPLETION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
