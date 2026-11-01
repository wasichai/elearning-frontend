import { describe, expect, it } from 'vitest'
import { lockedReading, READING_CSP, readingStyle } from './reading'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('lockedReading', () => {
  it('pone la CSP que no deja pedir nada fuera como primer elemento de head y conserva el contenido', () => {
    const doc = parse(lockedReading('<!doctype html><html lang="es"><head><title>Lectura</title></head><body><h1>Tipos de anuncio</h1></body></html>'))

    const first = doc.head.firstElementChild
    expect(first?.getAttribute('http-equiv')).toBe('Content-Security-Policy')
    expect(first?.getAttribute('content')).toBe(READING_CSP)
    expect(doc.title).toBe('Lectura')
    expect(doc.querySelector('h1')?.textContent).toBe('Tipos de anuncio')
    expect(doc.documentElement.lang).toBe('es')
  })

  it('la CSP solo deja imágenes data: y estilos en línea', () => {
    expect(READING_CSP).toBe("default-src 'none'; img-src data:; style-src 'unsafe-inline'")
  })

  it('con doctype sigue en modo estándar; sin head ni html también lleva la CSP', () => {
    expect(lockedReading('<!DOCTYPE html><p>hola</p>')).toMatch(/^<!doctype html><html><head><meta http-equiv="Content-Security-Policy"/)
    const bare = lockedReading('<p>hola</p>')
    expect(bare).not.toMatch(/^<!doctype/)
    expect(parse(bare).head.firstElementChild?.getAttribute('http-equiv')).toBe('Content-Security-Policy')
  })

  it('quita los meta refresh, se escriban como se escriban, y deja los demás meta', () => {
    const doc = parse(
      lockedReading(
        '<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=https://otro.example"><meta http-equiv=" Refresh " content="5"></head><body></body></html>'
      )
    )
    expect(doc.querySelectorAll('meta[http-equiv]')).toHaveLength(1)
    expect(doc.querySelector('meta[charset]')).not.toBeNull()
  })

  it('el script del documento se conserva para el iframe aislado, que no lo ejecuta, y no corre al prepararlo', () => {
    const html = lockedReading("<body><script>document.body.setAttribute('data-script', 'ran')</script></body>")
    expect(html).toContain('<script>')
    expect(document.body).not.toHaveAttribute('data-script')
  })

  it('pone el estilo de lectura justo detrás de la CSP, antes de los estilos del autor, que lo pisan', () => {
    const doc = parse(lockedReading('<html><head><style>body { font-family: Arial }</style></head><body><p>hola</p></body></html>'))

    const [csp, reading, author] = [...doc.head.children]
    expect(csp?.getAttribute('http-equiv')).toBe('Content-Security-Policy')
    expect(reading?.tagName).toBe('STYLE')
    expect(reading?.hasAttribute('data-reading')).toBe(true)
    expect(author?.textContent).toBe('body { font-family: Arial }')
  })

  it('el estilo de lectura tiene especificidad cero y la medida de lectura larga', () => {
    const css = readingStyle()
    const selectors = [...css.matchAll(/^\s*([^{@]+)\{/gm)].map((match) => match[1]!.trim())
    expect(selectors.length).toBeGreaterThan(5)
    expect(selectors.filter((selector) => !selector.startsWith(':where('))).toEqual([])
    expect(css).toContain('max-width: 68ch')
    expect(css).toContain('color-scheme: light')
  })

  it('pinta la lectura con los colores del tema que recibe', () => {
    const css = readingStyle({ colorScheme: 'dark', background: '#1b2023', text: 'oklch(93% 0.008 265)', link: '#e58a63' })
    expect(css).toContain('color-scheme: dark')
    expect(css).toContain('background: #1b2023;')
    expect(css).toContain('color: oklch(93% 0.008 265);')
    expect(css).toContain('color: #e58a63;')
  })

  it('descarta un valor que no es un color, sin dejar cerrar la regla', () => {
    const css = readingStyle({ colorScheme: 'light', background: 'red; } body { display: none', text: 'url(https://otro.example/x)' })
    expect(css).not.toContain('display: none')
    expect(css).not.toContain('otro.example')
    expect(css).not.toMatch(/background:/)
  })
})
