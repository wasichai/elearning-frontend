# Rubric

Rúbrica de corrección: criterios en filas, niveles en columnas, celdas pulsables, total y motivo cuando cambia una nota publicada.

## Anatomía
Encabezado de niveles · fila por criterio con peso · celdas `wq-level` (botón con `aria-pressed`) con puntos y descriptor · bloque `wq-grade-total` con nota anterior tachada → nota nueva, motivo y acción.

## Estados
Celda: reposo, hover, foco, elegida (borde `brand` 2px + `brand-soft` + texto «· elegido»). Fila sin elegir al guardar: error en la fila («Elige un nivel para Argumentación»). Guardando: botón en `is-loading`.

## Cambio de nota
Si la nota ya fue publicada, el motivo es **obligatorio** y se pide en el mismo bloque (o con `Dialog` de motivo si el cambio se hace desde la tabla). El historial muestra quién, cuándo y por qué.

## Responsive
Escritorio: tabla completa. Menos de `bp-lg`: cada criterio pasa a ser un grupo de botones apilados (radio group) con el nivel elegido arriba.
