import type { SystemThemes, ThemeDefinition } from '@wasichai/core'

// los temas Quipu (quipu.css). la etiqueta es una clave del espacio de nombres del aula, donde viven sus textos
export const QUIPU_THEME: ThemeDefinition = { id: 'quipu', label: 'classroom:theme.quipu', colorScheme: 'light' }
export const QUIPU_DARK_THEME: ThemeDefinition = { id: 'quipu-dark', label: 'classroom:theme.quipuDark', colorScheme: 'dark' }

export const QUIPU_THEMES = [QUIPU_THEME, QUIPU_DARK_THEME]

// un usuario nuevo («sistema») entra en Quipu, claro u oscuro según su sistema operativo
export const QUIPU_SYSTEM_THEMES: SystemThemes = { light: QUIPU_THEME.id, dark: QUIPU_DARK_THEME.id }
