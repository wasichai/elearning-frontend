# Dialog

Diálogo modal para decisiones que interrumpen el flujo: confirmación simple y confirmación con motivo y acción destructiva (`ReasonDialog`).

## Variantes
- **Confirmación** (`role="dialog"`): resume la consecuencia con datos concretos («Respondiste 9 de 10»). Primaria a la derecha.
- **Con motivo y destructiva** (`role="alertdialog"`): icono `alert` sobre `danger-soft`, título con el objeto («Cancelar la sesión del jue 12 nov»), quién se verá afectado, campo **Motivo** obligatorio, botón `wq-btn--danger` con el verbo exacto. Se usa para cancelar sesiones, cambiar una nota ya publicada y retirar una matrícula.

## Qué aporta quien lo usa
Título que sea una pregunta o una acción con objeto, cuerpo con la consecuencia, texto de los dos botones (nunca «Sí/No» ni «Aceptar»), y en ReasonDialog el `minLength` del motivo.

## Comportamiento
- Foco inicial en el primer campo (o en el botón seguro si no hay campos); foco atrapado; Esc y el botón de cerrar equivalen a «Volver».
- El botón destructivo nunca recibe el foco inicial.
- Abre con `duration-base` + `ease-standard`; con movimiento reducido, solo fundido.
- Móvil: botones apilados a ancho completo, el seguro abajo.

## Nota para @wasichai/core
`ReasonDialog` v1.3.0 no permite pintar en rojo el botón de confirmar. Este sistema lo pide: expón una prop `tone="danger"` que aplique `wq-btn--danger`.
