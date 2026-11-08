import type { SystemThemes, ThemeDefinition } from '@wasichai/core'

// los temas Colofón (colofon.css). la etiqueta es una clave del espacio de nombres del aula, donde viven sus textos
export const COLOFON_THEME = { id: 'colofon', label: 'classroom:theme.colofon', colorScheme: 'light' } satisfies ThemeDefinition
export const COLOFON_DARK_THEME = { id: 'colofon-dark', label: 'classroom:theme.colofonDark', colorScheme: 'dark' } satisfies ThemeDefinition

export const COLOFON_THEMES = [COLOFON_THEME, COLOFON_DARK_THEME]

// un usuario nuevo («sistema») entra en Colofón, claro u oscuro según su sistema operativo
export const COLOFON_SYSTEM_THEMES: SystemThemes = { light: COLOFON_THEME.id, dark: COLOFON_DARK_THEME.id }

// el modo lectura de la lección (sepia): solo como subárbol con data-theme en el contenedor de la lección; no está en
// config.themes, así que el selector del shell no lo ofrece
export const COLOFON_READING_THEME = { id: 'colofon-lectura', colorScheme: 'light' } as const

// los temas que pintan colofon.css y colofon-controls.css
export const COLOFON_STYLED_THEMES = [COLOFON_THEME.id, COLOFON_DARK_THEME.id, COLOFON_READING_THEME.id]
