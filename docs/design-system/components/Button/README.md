# Button

Botón de acción con cinco variantes —primaria, secundaria, fantasma, destructiva y celebración— y tres tamaños de uso.

## Cuándo usarlo
- **Primaria (`wq-btn--primary`, `brand`)**: una sola por vista, la acción que hace avanzar al estudiante: «Continuar lección 5», «Entregar evaluación», «Matricularme».
- **Secundaria (`wq-btn`)**: acciones de apoyo: «Descargar guía», «Ver temario».
- **Fantasma (`wq-btn--ghost`)**: acciones terciarias y botones de icono en barras.
- **Destructiva (`wq-btn--danger`)**: solo dentro del diálogo de confirmación, nunca como primer paso. Para disparar el diálogo usa `wq-btn--danger-quiet`.
- **Celebración (`wq-btn--celebrate`, `maiz`)**: exclusiva de la finalización: «Ver mi certificado». Nunca en otra parte.

## Qué aporta quien lo usa
Texto en infinitivo o con el objeto concreto («Guardar nota», no «Aceptar»); icono opcional a la izquierda (o flecha a la derecha para avanzar); `aria-label` en botones de solo icono.

## Estados
Hover (`brand-hover`/`surface-sunken`), foco (anillo `focus` 2px + 2px de separación), pulsado (baja 1px), deshabilitado (`surface-sunken` + `ink-muted`, `cursor: not-allowed`; explica al lado por qué), cargando (`is-loading` + `aria-busy="true"`, spinner y gerundio: «Entregando…»; el ancho no salta).

## Reglas
- Alto mínimo `target-min` (44px). `wq-btn--sm` (36px visual) solo en tablas densas de escritorio; su `::after` amplía el área táctil.
- En móvil, la acción principal de un formulario va a ancho completo (`wq-btn--block`).
- No uses `brand` para destruir ni `danger` para avanzar.

## Tailwind
`bg-brand text-on-brand hover:bg-brand-hover rounded-md min-h-target px-[18px] font-semibold focus-visible:outline-focus`.
