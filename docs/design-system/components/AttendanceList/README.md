# AttendanceList

Lista de asistencia de una sesión: una fila por matriculado con un control segmentado de cuatro estados y un resumen arriba.

## Estados de asistencia
Presente (`success`, check) · Tarde (`warning`, reloj) · Ausente (`danger`, aspa) · Justificada (`info`, i). Cada botón lleva **icono + palabra**; el elegido usa `aria-pressed="true"` y relleno o contorno de 2px. Sin marcar: ningún botón pulsado y «Sin marcar» bajo el nombre.

## Qué aporta quien lo usa
Sesión (número, fecha y hora de Lima), matriculados, estado previo si existe, y la acción de guardado. Opcional: «Marcar todos presentes» para empezar rápido.

## Reglas
- Botones de 44px de alto: se marca cómodo con el dedo desde una tableta en el aula.
- Guardado explícito con aviso de cambios sin guardar al salir; tras guardar, toast «Asistencia guardada».
- Móvil: el control segmentado pasa a una línea bajo el nombre.
