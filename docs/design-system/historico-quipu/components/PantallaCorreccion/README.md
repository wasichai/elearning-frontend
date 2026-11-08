# Pantalla · Panel docente y corrección (escritorio)

Corrección en escritorio optimizada para lotes: lista de entregas a la izquierda, respuesta y rúbrica a la derecha, guardar y pasar al siguiente.

## Composición
- Cabecera: curso · edición, evaluación, contador «12 por corregir», Anterior / Siguiente.
- Lista de entregas (260px): avatar, nombre, fecha de entrega; fuera de plazo marcado en texto.
- Respuesta del estudiante en `font-read` sobre `bg` para leerla como texto, no como formulario.
- `Rubric`, comentario y bloque de total con «Guardar y pasar al siguiente» (atajo: Ctrl+Enter).
- Si la nota ya estaba publicada, el bloque total pide **motivo del cambio** (ver Rubric).

## Panel docente (/docencia)
Ediciones asignadas como tarjetas con tres cifras —matriculados, por corregir, próxima sesión— y accesos a `EnrollmentTable`, corrección y `SessionCalendar` + `AttendanceList`.

## Responsive
Optimizada para ≥`bp-xl`. En tableta la lista de entregas se vuelve un select «Entrega de…» sobre la respuesta.
