// la lectura HTML no pide nada fuera del documento: sin CSP propia, el srcdoc aislado aún cargaría imágenes, estilos o
// fuentes remotas (rastreo de IP y del tiempo de lectura), y un meta refresh lo llevaría a otra página, cosa que la CSP
// no impide. se le pone al principio de head una CSP que solo deja imágenes data: y estilos en línea, y se quitan los
// meta refresh. DOMParser no ejecuta nada del documento. otra CSP del propio documento no la afloja: se aplican todas
export const READING_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'"

export function lockedReading(html: string, palette?: ReadingPalette): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const meta of doc.querySelectorAll('meta[http-equiv]')) if (meta.getAttribute('http-equiv')?.trim().toLowerCase() === 'refresh') meta.remove()
  const csp = doc.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = READING_CSP
  doc.head.prepend(csp)
  // el estilo de lectura va justo detrás de la CSP, antes que cualquier estilo del autor, y con especificidad cero
  const style = doc.createElement('style')
  style.dataset.reading = ''
  style.textContent = readingStyle(palette)
  csp.after(style)
  // con doctype sigue en modo estándar; sin él, en el mismo modo que tenía
  return `${doc.doctype ? '<!doctype html>' : ''}${doc.documentElement.outerHTML}`
}

// los colores del tema de la app con que se pinta la lectura: el iframe tiene origen opaco y no ve las variables CSS de
// la página, así que se le pasan resueltos. el que no parece un color se descarta (nada de cerrar la regla e inyectar)
export interface ReadingPalette {
  colorScheme: 'light' | 'dark'
  background?: string
  text?: string
  muted?: string
  link?: string
  line?: string
  rule?: string
}

const COLOR = /^(?:#[\da-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch)\([\d\s.,%/-]+\))$/i

function declaration(property: string, value: string | undefined): string {
  const color = value?.trim()
  return color && COLOR.test(color) ? `${property}: ${color};` : ''
}

// tipografía de lectura larga del sistema Quipu: medida de 68 caracteres, 19/32, títulos con aire. todo dentro de
// :where(), especificidad cero: cualquier estilo del autor gana. sin fuentes: la CSP no deja cargar ninguna, Literata
// solo si está instalada
export function readingStyle(palette?: ReadingPalette): string {
  const p = palette ?? { colorScheme: 'light' }
  return [
    `:where(html) { color-scheme: ${p.colorScheme === 'dark' ? 'dark' : 'light'}; ${declaration('background', p.background)} ${declaration('color', p.text)} }`,
    ":where(body) { box-sizing: border-box; max-width: 68ch; margin: 0 auto; padding: 2.5rem 1.5rem 3rem; font: 400 19px/1.68 Literata, Georgia, 'Iowan Old Style', 'Times New Roman', serif; hyphens: auto; overflow-wrap: break-word; }",
    ':where(h1, h2, h3, h4) { line-height: 1.3; font-weight: 600; }',
    ':where(h1) { font-size: 1.9em; font-weight: 500; margin: 0 0 1em; }',
    ':where(h2) { font-size: 1.37em; margin: 2.5em 0 0.6em; }',
    ':where(h3) { font-size: 1.1em; margin: 1.8em 0 0.5em; }',
    ':where(p, ul, ol) { margin: 0 0 1.1em; }',
    `:where(a) { text-underline-offset: 3px; ${declaration('color', p.link)} }`,
    `:where(blockquote) { margin: 2em 0; padding-left: 1.25em; border-left: 2px solid; font-style: italic; ${declaration('border-left-color', p.rule)} }`,
    ':where(img, video, svg) { max-width: 100%; height: auto; }',
    `:where(figcaption, small) { font-size: 0.85em; ${declaration('color', p.muted)} }`,
    ':where(table) { border-collapse: collapse; width: 100%; font-size: 0.9em; }',
    `:where(th, td) { border-bottom: 1px solid; padding: 0.4em 0.6em; text-align: left; ${declaration('border-bottom-color', p.line)} }`,
    ':where(code, pre) { font-family: ui-monospace, Menlo, monospace; font-size: 0.88em; }',
    ':where(pre) { overflow: auto; }',
    '@media (max-width: 640px) { :where(body) { font-size: 18px; padding: 2rem 1rem; } }'
  ].join('\n')
}
