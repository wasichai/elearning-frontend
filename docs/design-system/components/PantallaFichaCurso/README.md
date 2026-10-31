# Pantalla · Ficha de curso (escritorio)

Ficha pública del catálogo en `/cursos/:slug`: banda de cordones del curso, hechos académicos, qué aprenderás, temario y ediciones con «Matricularme».

## Composición
- **Banda** de 120px con el patrón del curso (misma semilla que su `CourseCard`).
- **Cabecera**: volver al catálogo, antetítulo (área · lecciones · unidades), `title-1`, resumen en `font-read` 18/28 a 62ch.
- **Hechos** en cuadrícula de 2: horas y dedicación semanal, créditos ECTS, sesiones en vivo con su horario de Lima, certificado.
- **Qué aprenderás**: 4–6 resultados con check, en infinitivo.
- **Temario**: `Syllabus` sin estados (nudos huecos, no enlazados), solo la unidad 1 abierta.
- **Columna de ediciones** (340px, fija al desplazar): una tarjeta por edición con estado, fechas, cupos y docente. La edición abierta tiene la única acción primaria de la página.

## Estados
- Ya matriculado: la tarjeta de su edición cambia a «Ir al curso» con insignia «En curso».
- Sin ediciones abiertas: aviso `info` «La próxima edición abre en marzo 2027» + «Avisarme».
- Cupos agotados: insignia «Cerrada» con `lock` y botón deshabilitado «Matrícula cerrada».
- Matriculando: botón en `is-loading` («Matriculando…») → toast «Te matriculaste en la edición 2027-I» y paso a «Ir al curso».
