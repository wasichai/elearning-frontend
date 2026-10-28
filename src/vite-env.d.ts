/// <reference types="vite/client" />

interface ImportMetaEnv {
  // nombre visible del producto; vacío o ausente = el nombre de trabajo
  readonly VITE_APP_NAME?: string
  // fracción de un vídeo reproducida que completa su lección (0 < x ≤ 1); vacía o ausente = el final
  readonly VITE_VIDEO_COMPLETION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
