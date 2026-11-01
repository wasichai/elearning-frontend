# AssessmentHeader

Cabecera fija de una evaluación en curso: título, posición, intentos, plazo, temporizador y «Entregar».

## Anatomía
Título + «Pregunta 3 de 10 · se guarda sola» · Intento 2 de 3 (con rombos: usado, actual, libre) · plazo con fecha y hora de Lima · temporizador · botón Entregar.

## Temporizador
- Normal: `surface-sunken`.
- Últimos 5 minutos (`is-warning`): `warning-soft` + texto «últimos 5 min».
- Último minuto (`is-critical`): `danger-soft` + «se entrega sola al llegar a 0».
- `role="timer"` con `aria-live="off"`; anuncia por `aria-live="polite"` solo a los 5 min y a 1 min. Nunca parpadea.
- Sin límite de tiempo: oculta el temporizador; no muestres «∞».

## Reglas
- Siempre visible (`position: sticky`, `z-sticky`). En móvil se compacta a dos líneas: título y, debajo, temporizador + Entregar.
- «Entregar» abre el diálogo de confirmación con las preguntas en blanco listadas.
- El autoguardado se confirma en texto discreto; si falla, aviso `danger` persistente.
