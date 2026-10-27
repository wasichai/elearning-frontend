import { resolveConfig } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { appName, createConfig, DEFAULT_APP_NAME, DEV_LOGIN_EMAIL } from './config'

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
      defaultLoginEmail: ''
    })
  })

  it('propone el administrador de la semilla solo en desarrollo', () => {
    expect(createConfig({ DEV: true }).defaultLoginEmail).toBe(DEV_LOGIN_EMAIL)
    expect(createConfig({ DEV: false }).defaultLoginEmail).toBe('')
  })

  it('sin VITE_APP_NAME se llama con el nombre de trabajo', () => {
    expect(createConfig({ DEV: false }).appName).toBe(DEFAULT_APP_NAME)
  })
})
