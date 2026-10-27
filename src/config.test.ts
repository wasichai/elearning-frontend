import { resolveConfig } from '@wasichai/core'
import { describe, expect, it } from 'vitest'
import { appName, DEFAULT_APP_NAME } from './config'

describe('appName', () => {
  it('toma VITE_APP_NAME y core lo conserva al resolver el config', () => {
    expect(resolveConfig({ appName: appName({ VITE_APP_NAME: 'Aula Abierta' }) }).appName).toBe('Aula Abierta')
  })

  it('usa el nombre de trabajo si la variable falta o está vacía', () => {
    expect(appName({})).toBe(DEFAULT_APP_NAME)
    expect(appName({ VITE_APP_NAME: '  ' })).toBe(DEFAULT_APP_NAME)
  })
})
