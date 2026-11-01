# Accesibilidad

Mínimo WCAG 2.2 AA en los tres temas. Es una condición de entrega, no una mejora.

## Contraste (verificado en claro, oscuro y lectura)
| Par | Claro | Oscuro | Lectura |
|---|---|---|---|
| `ink` sobre `bg` / `surface` / `surface-sunken` | 14,3 / 15,6 / 13,0 | 14,5 / 13,2 / 15,3 | 12,5 / 13,5 / 11,3 |
| `ink-muted` sobre `bg` / `surface` / `surface-sunken` | 6,3 / 6,8 / 5,7 | 7,7 / 7,1 / 8,1 | 6,5 / 7,1 / 5,9 |
| `brand` (texto) sobre `bg` / `surface` / `brand-soft` | 5,4 / 5,8 / 4,7 | 7,0 / 6,4 / 5,7 | 5,3 / 5,8 / 4,5 |
| `on-brand` sobre `brand` / `brand-hover` | 5,9 / 7,8 | 7,1 / 8,8 | 6,5 / 8,4 |
| `success` sobre `bg` / `success-soft` | 5,8 / 5,2 | 9,2 / 7,8 | 5,8 / 5,3 |
| `warning` sobre `bg` / `warning-soft` | 5,7 / 5,1 | 9,6 / 7,8 | 5,9 / 5,4 |
| `danger` sobre `bg` / `danger-soft` | 6,7 / 5,8 | 7,7 / 6,7 | 6,5 / 5,6 |
| `info` sobre `bg` / `info-soft` | 6,0 / 5,4 | 8,9 / 7,7 | 6,0 / 5,5 |
| `on-maiz` sobre `maiz` | 6,5 | 8,1 | 6,5 |
| `line-strong` sobre `bg` / `surface` (bordes de control, cordón) | 3,8 / 4,2 | 4,1 / 3,7 | 3,7 / 4,0 |
| `focus` sobre `bg` / `surface` / `surface-sunken` / `brand-soft` | 6,2 / 6,7 / 5,6 / 5,4 | 8,6 / 7,9 / 9,1 / 7,1 | 6,1 / 6,7 / 5,6 / 5,3 |

`maiz` es solo relleno decorativo: el texto encima va en `on-maiz` (≥6,5:1) y el texto de logro en `maiz-ink`. Los valores exactos se recalculan con cada cambio de token.

## Foco
- Anillo `focus` de 2px sólido con 2px de separación en todo elemento interactivo (`:focus-visible`), incluidos celdas de rúbrica, nudos enlazados, opciones y botones segmentados.
- Nunca `outline: none` sin reemplazo. El foco no queda tapado por la cabecera fija (usa `scroll-margin-top`).
- Diálogos y cajón móvil atrapan el foco y lo devuelven al disparador al cerrar.

## Objetivos táctiles
`target-min` = 44 × 44px para todo control: botones, ítems de navegación, opciones, filas del temario (48px), botones de asistencia, celdas de rúbrica (72px). La variante `wq-btn--sm` (36px) amplía su área a 44px con un pseudoelemento y solo se usa en tablas docentes de escritorio.

## Color nunca como único indicador
- Estados de aprendizaje: icono + palabra (`StatusBadge`) y forma de nudo.
- Errores de campo: borde de 2px + icono + mensaje.
- Opciones correctas/incorrectas: texto «Correcta» / «Tu respuesta».
- Asistencia: icono + palabra en cada botón.
- Sesión cancelada: tachado + palabra «Cancelada».
- `success` (musgo) y `danger` (carmín) se distinguen además por icono y texto; no dependen del matiz.

## Lectores de pantalla
- El quipu es decorativo (`aria-hidden`) y siempre va con su equivalente en texto o `aria-label`: «4 de 8 lecciones completadas».
- Barras con `role="progressbar"` y valores; temporizador con `role="timer"` y anuncios solo a 5 y 1 minutos.
- Lección actual con `aria-current="page"`; lecciones bloqueadas explican cuándo se abren.
- Tablas con `scope`, `aria-sort` y `caption`.
- Idioma `lang="es-PE"`; lecturas en otro idioma marcan su `lang`.

## Lectura y movimiento
- Texto redimensionable al 200 % sin pérdida; la lectura ofrece A−/A+ (17–23px) y tema `lectura`.
- `prefers-reduced-motion`: sin desplazamientos ni rebotes; solo fundidos de ≤120ms.
- Vídeos con subtítulos y transcripción; PDF con alternativa accesible cuando sea posible.
- Tiempo límite: la evaluación avisa a 5 y 1 minutos y permite ajustes de tiempo configurados por el docente (WCAG 2.2.1).
