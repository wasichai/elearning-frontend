# Field

Campo de formulario completo: etiqueta, control (texto, área de texto, casilla), ayuda, contador y mensaje de error.

## Qué aporta quien lo usa
`label` visible siempre (nunca solo placeholder), `id` enlazado con `for`, ayuda vía `aria-describedby`, y en error `aria-invalid="true"` + mensaje que diga **qué pasó y cómo arreglarlo**.

## Estados
- Reposo: borde `line-strong` (≥3:1) sobre `surface`.
- Hover: borde `ink-muted`.
- Foco: anillo `focus` 2px.
- Error (`.is-invalid`): borde `danger` de 2px + icono + texto en `danger`. El color nunca va solo.
- Deshabilitado: `surface-sunken`, texto `ink-muted`, y una ayuda que explica por qué.
- Solo lectura: borde discontinuo.

## Reglas
- Texto de campo a 16px como mínimo (evita el zoom en iOS).
- Valida al salir del campo o al enviar; nunca mientras se escribe.
- En respuestas abiertas de evaluación, el contador cuenta palabras si la consigna está en palabras.
- Marca lo opcional («(opcional)»), no lo obligatorio.
