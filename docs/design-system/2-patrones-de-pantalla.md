# Patrones de pantalla

Cada patrón nombra su ruta, su acción primaria y los componentes que lo componen. Las pantallas marcadas con ★ tienen vista previa en Componentes › Pantallas.

## ★ Ficha de curso · `/cursos/:slug`
Pública, sin login.
1. Cabecera: banda de cordones del curso (`CourseCard` a gran tamaño), área, título `title-1`, resumen de dos líneas.
2. Hechos en fila con iconos: horas, créditos ECTS, modalidad, nº de sesiones en vivo, idioma.
3. **Ediciones**: tarjetas por edición (2026-II · ago–dic · cupos · docente) con `StatusBadge` (abierta, completa, en curso). La edición abierta lleva «Matricularme» (única primaria); en móvil esa acción queda fija al pie.
4. Temario en lectura (`Syllabus` sin estados, todo plegado salvo la unidad 1), qué aprenderás, requisitos, certificado que se obtiene.
Estados: sin ediciones abiertas → aviso `info` «La próxima edición abre en marzo 2027» + «Avisarme»; ya matriculado → «Ir al curso».

## ★ Mis cursos · `/mis-cursos`
Saludo con lo de esta semana → «Retoma donde lo dejaste» (anillo + lección exacta + primaria) → plazos (máx. 2 avisos) → pestañas En curso / Completados / Todos → cuadrícula de `CourseCard`. Móvil primero: una columna, acción a ancho completo.

## Detalle del curso del estudiante · `/mis-cursos/:enrollmentId`
Cabecera con quipu grande (`wq-quipu--lg`) y cifras: lecciones, evaluaciones, asistencia. Debajo, `Syllabus` completo con estados y fechas. Pestañas: Temario · Sesiones (`SessionCalendar` en agenda) · Calificaciones.

## ★ Lección con temario lateral · `?leccion=…`
Escritorio: temario de 320px + visor. Móvil: barra mínima con progreso de lectura, «Temario» en hoja inferior, acción fija al pie. Tema `lectura` opcional. Ver `LessonViewer`.

## Evaluación en curso · `?leccion=…&intento=…`
1. Antes de empezar: ficha con nº de preguntas, tiempo, intentos usados (rombos), plazo, si se muestran respuestas; «Comenzar intento 2 de 3».
2. En curso: `AssessmentHeader` fijo + una pregunta por pantalla en móvil (todas en una columna en escritorio con índice lateral de nudos: respondida = musgo, en blanco = hueco, marcada para revisar = terracota).
3. Entregar → `Dialog` con preguntas en blanco listadas.
4. Sin conexión: aviso persistente «Sin conexión. Tus respuestas se guardan en este dispositivo y se enviarán al volver».

## ★ Resultado de evaluación
Anillo con la nota (`success` si aprueba, `warning` si no) «16/20 · Aprobada», intento y fecha. Desglose por pregunta (`Question` en estado resultado) con enlaces de repaso. Pendiente de corrección: insignia `review` y «Tu docente corregirá las preguntas abiertas; te avisaremos». Acciones: «Volver al curso» (primaria) e «Intentar de nuevo» si quedan intentos.

## ★ Finalización del curso · `/mis-cursos/:id/finalizacion`
Bloque `wq-finish` en `maiz-soft` con sello, cifras reales y «Ver mi certificado» (`wq-btn--celebrate`). Debajo, «Tu recorrido» con barras. Si falta un requisito: no celebra; lista lo pendiente con su estado.

## ★ Certificado · `/certificados/:code`
Público. Banda de verificación + documento A4 horizontal siempre en claro + Descargar PDF / Imprimir. Hoja de impresión dedicada. Ver la pantalla.

## Panel docente · `/docencia`
Ediciones asignadas en tarjetas con tres cifras —matriculados, por corregir (insignia `review`), próxima sesión— y accesos directos. Optimizado para escritorio (≥1280px), usable en tableta.

## Edición · `/docencia/:code`
Pestañas: Matriculados (`EnrollmentTable`) · Corrección · Sesiones (`SessionCalendar` mes) · Asistencia (`AttendanceList` por sesión).

## ★ Corrección · `/docencia/:code/correccion/:attemptId`
Lista de entregas · respuesta en `font-read` · `Rubric` · comentario · total · «Guardar y pasar al siguiente». Cambio de nota publicada → motivo obligatorio.

## Sesiones · `/docencia/:code/sesiones`
Calendario mensual con «Programar sesión». Reprogramar y cancelar piden motivo (`Dialog`) y notifican. Asistencia en `/sesiones/:sessionId/asistencia` con `AttendanceList`.
