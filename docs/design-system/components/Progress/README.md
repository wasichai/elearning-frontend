# Progress

Tres formas de mostrar avance honesto: el **quipu** (cordón de nudos), la **barra** y el **anillo**.

## Quipu (firma del sistema)
Cada nudo es una unidad real del curso. La forma dice el tipo y el relleno dice el estado:
- Círculo = lección; rombo (`wq-knot--eval`) = evaluación; doble anillo (`wq-knot--session`) = sesión en vivo.
- Relleno `success` = completada; anillo `brand` grueso = en curso; hueco = pendiente; `danger` con aspa = vencida; `info` = pendiente de corrección.
- El cordón es `line-strong` (≥3:1). El quipu es decorativo (`aria-hidden`): acompáñalo SIEMPRE de un texto o `aria-label` que diga «4 de 8 lecciones».
- Hasta 24 nudos; con más, agrupa por unidad (un quipu por unidad).
- Al completar una lección, el nudo se anuda con `duration-slow` + `ease-knot` (un único rebote leve).

## Barra
`role="progressbar"` con `aria-valuenow`. Relleno `brand`; `is-complete` → `success`. Cabecera con etiqueta y cifra exacta («5 de 8», no solo «62 %»). Indeterminada para subidas sin tamaño conocido.

## Anillo
Para el resumen del curso (96px) y para filas compactas (`wq-ring--sm`, 48px). Cifras tabulares (`numeral`).

## Honestidad
Nunca redondees hacia arriba (7,9 de 8 es «7 de 8»). No muestres porcentajes de un curso sin lecciones publicadas. Nada de rachas, puntos ni rankings.
