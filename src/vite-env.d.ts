/// <reference types="vite/client" />

interface ImportMetaEnv {
  // nombre visible del producto; vacío o ausente = el nombre de trabajo
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
