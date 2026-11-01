# EnrollmentTable

Tabla de matriculados del espacio docente: búsqueda, filtros, orden, avance, nota, asistencia, estado y acciones por fila.

## Columnas
Estudiante (avatar con iniciales, nombre, correo) · Avance (barra fina + %) · Nota (0–20, alineada a la derecha, cifras tabulares; «—» sin nota) · Asistencia («3/4») · Estado (`StatusBadge`) · Acciones (menú: ver entregas, corregir, retirar matrícula → `Dialog` con motivo).

## Estados
Cargando (filas esqueleto con la geometría real), vacío («Aún no hay matriculados en esta edición»), sin resultados de búsqueda (EmptyState de búsqueda + «Quitar filtros»), error (aviso `danger` sobre la tabla con «Reintentar»), fila seleccionada (`aria-selected`, `brand-soft`).

## Reglas
- Encabezado fijo (`sticky`), orden con `aria-sort` y botón en el `th`.
- Escritorio docente (≥`bp-xl`): tabla completa. Tableta: oculta correo y asistencia. Móvil: cada fila es una tarjeta con nombre, estado y avance.
- Notas en escala vigesimal peruana (0–20); aprobado desde 11 salvo que la edición diga otra cosa.
