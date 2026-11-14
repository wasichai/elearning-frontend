import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveConfig } from '@wasichai/core'
import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ColofonMark } from './shared/ColofonMark'
import { homeRoute, shellChrome, shellNav } from './shellNav'
import { COLOFON_SYSTEM_THEMES, COLOFON_THEMES } from './theme/themes'
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

    expect(resolveConfig({ ...config, appLogo: undefined, publicHome: undefined })).toEqual({
      apiBaseUrl: '/api',
      appName: 'Aula Abierta',
      appTagline: '',
      storagePrefix: 'elearning',
      languages: ['es', 'en'],
      timeZone: 'America/Lima',
      themes: COLOFON_THEMES,
      systemThemes: COLOFON_SYSTEM_THEMES,
      defaultLoginEmail: '',
      shellNav,
      homeRoute,
      shellChrome
    })
  })

  it('sin sesión, / es la portada pública', () => {
    expect(createConfig({ DEV: false }).publicHome).toBeDefined()
  })

  it('la marca Colofón acompaña al nombre en el shell y el login', () => {
    const logo = createConfig({ DEV: false }).appLogo
    expect(isValidElement(logo) && logo.type).toBe(ColofonMark)
  })

  it('propone el administrador de la semilla solo en desarrollo', () => {
    expect(createConfig({ DEV: true }).defaultLoginEmail).toBe(DEV_LOGIN_EMAIL)
    expect(createConfig({ DEV: false }).defaultLoginEmail).toBe('')
  })

  it('un usuario nuevo entra en el tema Colofón, claro u oscuro según su sistema', () => {
    const config = createConfig({ DEV: false })
    expect(config.themes?.map((theme) => theme.id)).toEqual(['colofon', 'colofon-dark'])
    expect(config.systemThemes).toEqual({ light: 'colofon', dark: 'colofon-dark' })
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

// el script de arranque de index.html, que aplica el tema guardado antes del bundle
describe('tema guardado antes del bundle', () => {
  const html = readFileSync(join(import.meta.dirname, '../index.html'), 'utf8')
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1]!

  function boot(stored: string | null, systemDark = false, failSave = false) {
    const storage = new Map<string, string>(stored === null ? [] : [['elearning.theme', stored]])
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> }
    new Function('localStorage', 'matchMedia', 'document', script)(
      {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (failSave) throw new Error('cuota')
          storage.set(key, value)
        }
      },
      () => ({ matches: systemDark }),
      { documentElement: root }
    )
    return { theme: root.dataset.theme, scheme: root.style.colorScheme, saved: storage.get('elearning.theme') }
  }

  it('un tema guardado quipu pasa a colofon, y quipu-dark a colofon-dark, y queda guardado', () => {
    expect(boot('quipu')).toEqual({ theme: 'colofon', scheme: 'light', saved: 'colofon' })
    expect(boot('quipu-dark')).toEqual({ theme: 'colofon-dark', scheme: 'dark', saved: 'colofon-dark' })
  })

  it('si no puede guardar la migración, igual pone el tema', () => {
    expect(boot('quipu', false, true)).toMatchObject({ theme: 'colofon', scheme: 'light' })
  })

  it('los temas de Colofón y los de core se respetan', () => {
    expect(boot('colofon-dark')).toEqual({ theme: 'colofon-dark', scheme: 'dark', saved: 'colofon-dark' })
    expect(boot('light')).toEqual({ theme: 'light', scheme: 'light', saved: 'light' })
  })

  it('sin tema guardado o con uno desconocido, Colofón claro u oscuro según el sistema', () => {
    expect(boot(null).theme).toBe('colofon')
    expect(boot(null, true).theme).toBe('colofon-dark')
    expect(boot('system', true).theme).toBe('colofon-dark')
    expect(boot('otro').theme).toBe('colofon')
  })
})

describe('shellChrome', () => {
  it('shellChrome is compact on a lesson url and full on /mis-cursos', () => {
    expect(shellChrome({ pathname: '/mis-cursos/mat-srtm-1', search: '?leccion=lec-html' })).toBe('compact')
    expect(shellChrome({ pathname: '/mis-cursos/mat-srtm-1', search: '?leccion=lec-eva&intento=int-1' })).toBe('compact')
    // sin ?leccion el aula abre igual una lección (o el aula vacía): también estrecho
    expect(shellChrome({ pathname: '/mis-cursos/mat-srtm-1', search: '' })).toBe('compact')
    expect(shellChrome({ pathname: '/mis-cursos', search: '' })).toBe('full')
    expect(shellChrome({ pathname: '/mis-cursos/mat-srtm-1/sesiones', search: '?leccion=lec-html' })).toBe('full')
    expect(shellChrome({ pathname: '/mis-cursos/mat-srtm-1/finalizacion', search: '' })).toBe('full')
    expect(shellChrome({ pathname: '/cursos/srtm', search: '?leccion=x' })).toBe('full')
  })
})
