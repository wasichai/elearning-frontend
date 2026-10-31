import { resolveConfig } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { QUIPU_SYSTEM_THEMES, QUIPU_THEMES } from './theme/themes'
import { appName, createConfig, DEFAULT_APP_NAME, DEFAULT_VIDEO_COMPLETION, DEV_LOGIN_EMAIL, videoCompletion } from './config'

describe('appName', () => {
  it('toma VITE_APP_NAME', () => {
    expect(appName({ VITE_APP_NAME: 'Aula Abierta' })).toBe('Aula Abierta')
  })

  it('usa el nombre de trabajo si la variable falta o está vacía', () => {
    expect(appName({})).toBe(DEFAULT_APP_NAME)
    expect(appName({ VITE_APP_NAME: '  ' })).toBe(DEFAULT_APP_NAME)
  })
})

describe('createConfig', () => {
  it('arma el config de la app y core lo acepta tal cual', () => {
    const config = createConfig({ VITE_APP_NAME: 'Aula Abierta', DEV: false })

    expect(resolveConfig(config)).toEqual({
      apiBaseUrl: '/api',
      appName: 'Aula Abierta',
      storagePrefix: 'elearning',
      languages: ['es', 'en'],
      timeZone: 'America/Lima',
      themes: QUIPU_THEMES,
      systemThemes: QUIPU_SYSTEM_THEMES,
      defaultLoginEmail: ''
    })
  })

  it('propone el administrador de la semilla solo en desarrollo', () => {
    expect(createConfig({ DEV: true }).defaultLoginEmail).toBe(DEV_LOGIN_EMAIL)
    expect(createConfig({ DEV: false }).defaultLoginEmail).toBe('')
  })

  it('un usuario nuevo entra en el tema Quipu, claro u oscuro según su sistema', () => {
    const config = createConfig({ DEV: false })
    expect(config.themes?.map((theme) => theme.id)).toEqual(['quipu', 'quipu-dark'])
    expect(config.systemThemes).toEqual({ light: 'quipu', dark: 'quipu-dark' })
  })

  it('sin VITE_APP_NAME se llama con el nombre de trabajo', () => {
    expect(createConfig({ DEV: false }).appName).toBe(DEFAULT_APP_NAME)
  })
})

describe('videoCompletion', () => {
  it('por defecto, el vídeo completa su lección al terminar', () => {
    expect(DEFAULT_VIDEO_COMPLETION).toBe(1)
    expect(videoCompletion({})).toBe(1)
    expect(videoCompletion({ VITE_VIDEO_COMPLETION: ' ' })).toBe(1)
  })

  it('toma la fracción reproducida de VITE_VIDEO_COMPLETION', () => {
    expect(videoCompletion({ VITE_VIDEO_COMPLETION: '0.9' })).toBe(0.9)
    expect(videoCompletion({ VITE_VIDEO_COMPLETION: ' 0.5 ' })).toBe(0.5)
    expect(videoCompletion({ VITE_VIDEO_COMPLETION: '1' })).toBe(1)
  })

  it('un valor fuera de (0, 1] o que no es un número usa el final', () => {
    for (const value of ['0', '-0.5', '1.5', '90', 'noventa', 'NaN', 'Infinity']) {
      expect(videoCompletion({ VITE_VIDEO_COMPLETION: value })).toBe(1)
    }
  })
})
