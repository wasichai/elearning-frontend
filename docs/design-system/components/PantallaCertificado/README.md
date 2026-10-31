# Pantalla · Certificado (pantalla e impresión)

Certificado verificable en `/certificados/:code`: banda de verificación pública arriba y el documento imprimible debajo.

## Pantalla
- Pública, sin login. Barra con código, «Descargar PDF» e «Imprimir».
- Verificación en `success-soft` con escudo: «Certificado válido» + emisor, fecha, titular y estado de revocación. Si no existe: EmptyState de error «No encontramos un certificado con el código WQ-…»; si fue revocado: aviso `danger` con fecha y motivo.

## Documento
- Proporción A4 horizontal (1,414:1), siempre tema claro (`data-theme="light"` en el elemento) para que se vea igual en pantalla oscura e impresión.
- Nombre del titular en Literata 44/52; curso en Literata 600; datos académicos completos (edición, fechas, horas, créditos ECTS, nota sobre 20).
- Cordones de quipu al margen derecho: el único ornamento; nudos en `brand`, `maiz` y `success`.
- Pie: docente responsable, lugar y fecha de emisión (Lima), URL de verificación, código en mono y QR.

## Impresión
`@media print`: `@page A4 landscape; margin 0`, oculta todo `.wq-no-print`, el shell y la navegación; `print-color-adjust: exact`. Móvil: el certificado se reordena en una columna legible y el PDF conserva el diseño A4.
