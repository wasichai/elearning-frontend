# Feedback (avisos y toasts)

Avisos en línea (`wq-alert`) para información que el estudiante necesita para decidir, y toasts (`wq-toast`) para confirmar una acción recién hecha.

## Avisos
- Tonos: informativo (por defecto, `info`), éxito (`success`), aviso (`warning`), error (`danger`), logro (`maiz`).
- Siempre icono + título; cuerpo opcional; una acción como máximo.
- `role="alert"` solo para errores que bloquean; el resto `role="status"`.
- Fechas con día de la semana y hora de Lima: «viernes 13 de noviembre, 23:59».

## Toasts
- Fondo `surface-inverse`, texto `ink-inverse`, `elevation-2`; abajo al centro en móvil, abajo a la izquierda en escritorio.
- Duran 5 s (8 s si tienen acción). Se pausan con hover o foco. Nunca contienen errores que requieran acción: eso es un aviso.
- «Deshacer» en vez de diálogo para acciones reversibles (marcar completada).
