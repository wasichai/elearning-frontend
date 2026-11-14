import { describe, expect, it } from 'vitest'
import { brandHtml } from './brandHtml'

const HTML = '<html><head>\n<title>wasichai-learning</title>\n</head><body></body></html>'

describe('brandHtml', () => {
  it('el título de la pestaña es el nombre del producto, antes de que cargue la app', () => {
    expect(brandHtml(HTML, { VITE_APP_NAME: 'Aula Abierta' })).toContain('<title>Aula Abierta</title>')
  })

  it('sin nombre, el de trabajo', () => {
    expect(brandHtml(HTML, {})).toContain('<title>wasichai-learning</title>')
  })

  it('escapa el nombre: es texto, no HTML', () => {
    expect(brandHtml(HTML, { VITE_APP_NAME: 'A&B <Aula>' })).toContain('<title>A&amp;B &lt;Aula&gt;</title>')
  })

  it('con logo, es también el icono de la pestaña', () => {
    const html = brandHtml(HTML, { VITE_APP_LOGO: '/marca/logo.svg?v="2"' })
    expect(html).toContain('<link rel="icon" href="/marca/logo.svg?v=&quot;2&quot;" />\n</head>')
  })

  it('sin logo válido, no añade icono', () => {
    expect(brandHtml(HTML, { VITE_APP_LOGO: 'javascript:alert(1)' })).not.toContain('rel="icon"')
    expect(brandHtml(HTML, {})).not.toContain('rel="icon"')
  })
})
