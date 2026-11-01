# Question

Pregunta de evaluación en tres tipos —opción, respuesta abierta y entrega de archivo— con su estado de resultado.

## Tipos
- **Opción única / múltiple** (`wq-option`): tarjetas de 52px con radio o casilla nativos; la elegida en `brand-soft` con borde `brand` de 2px.
- **Abierta**: `wq-textarea` con contador en palabras y «guardado hace 10 s».
- **Entrega**: zona de arrastre (`wq-dropzone`, `is-over` al arrastrar) + botón «Elegir archivo» (accesible por teclado) + filas de archivo con estado: subiendo (barra), listo, error (motivo y cómo corregir).

## Resultado
`is-correct` / `is-wrong`: borde de 2px, fondo suave **y** texto «Correcta» / «Tu respuesta» con icono. Incluye un enlace a la lección para repasar. Solo se muestran las correctas si la configuración de la evaluación lo permite.

## Qué aporta quien lo usa
Número y tipo, puntos, enunciado (en `font-read` 18/28 para lectura cómoda), opciones, formatos y tamaño máximo para entregas.

## Reglas
- Enunciado como `<p>` dentro de `section` con `aria-labelledby`; opciones en `fieldset` con `legend`.
- Nunca reordenes las opciones entre intentos sin avisar.
