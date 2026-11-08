# StatusBadge

Insignia que nombra el estado de una lección, evaluación, curso o sesión siempre con **icono + texto**, nunca solo color.

## Estados de aprendizaje
| Estado | Clase | Icono | Tokens |
|---|---|---|---|
| No iniciado | `wq-badge--todo` | círculo vacío | `state-todo` / `state-todo-soft` |
| En curso | `wq-badge--active` | medio círculo | `state-active` / `state-active-soft` |
| Completado | `wq-badge--done` | check en círculo | `state-done` / `state-done-soft` |
| Vencido | `wq-badge--overdue` | reloj tachado | `state-overdue` / `state-overdue-soft` |
| Pendiente de corrección | `wq-badge--review` | reloj de arena | `state-review` / `state-review-soft` |

Además: `--warning` (plazo cercano), `--achievement` (certificado, `maiz`), `--live` (sesión en vivo; el punto late, y se detiene con movimiento reducido), `--outline` (datos neutros: créditos) y neutra.

## Reglas
- Texto corto en mayúscula inicial («En curso», no «EN CURSO»).
- Una insignia de estado por elemento; los datos extra van en metadatos, no en más insignias.
- Los mismos iconos se usan en los nudos del quipu y en el temario: un estado tiene una sola forma en todo el producto.
