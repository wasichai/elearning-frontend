// la lectura HTML no pide nada fuera del documento: sin CSP propia, el srcdoc aislado aún cargaría imágenes, estilos o
// fuentes remotas (rastreo de IP y del tiempo de lectura), y un meta refresh lo llevaría a otra página, cosa que la CSP
// no impide. se le pone al principio de head una CSP que solo deja imágenes data: y estilos en línea, y se quitan los
// meta refresh. DOMParser no ejecuta nada del documento. otra CSP del propio documento no la afloja: se aplican todas
export const READING_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'"

export function lockedReading(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const meta of doc.querySelectorAll('meta[http-equiv]')) if (meta.getAttribute('http-equiv')?.trim().toLowerCase() === 'refresh') meta.remove()
  const csp = doc.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = READING_CSP
  doc.head.prepend(csp)
  // con doctype sigue en modo estándar; sin él, en el mismo modo que tenía
  return `${doc.doctype ? '<!doctype html>' : ''}${doc.documentElement.outerHTML}`
}
