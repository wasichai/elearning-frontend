# Auditoría UX/UI de wasichai-learning

Hecha el 2 de noviembre de 2026 sobre `main` (d1c3c94), con las pantallas reales en Chromium (API simulada de `e2e/api.ts`,
capturas a 390, 1024 y 1440 px), leyendo el código y comparando con Quipu. Severidad: **alta** impide o confunde una tarea
principal; **media** la hace más lenta o rompe la coherencia; **baja** es pulido.

## Estado de partida

Los cimientos son buenos: tokens de Quipu con AA comprobado, modo lectura, quipu de nudos, insignias con icono, iframe
aislado con CSP, permisos en el servidor, i18n completo y 561 pruebas unitarias más los recorridos e2e. El problema es de
composición: casi todas las pantallas son una columna de texto en un cuadro de ancho fijo, sobre una barra de título. Tienen
los datos, pero no jerarquía: nada dice qué hacer ahora.

## Inventario

| Módulo    | Pantallas                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------- |
| catalog   | `CatalogPage`, `CourseDetailPage`, `EnrollAction`                                                         |
| classroom | `MyCoursesPage`, `ClassroomPage` + `LessonView`, `AssessmentLesson` + `AttemptView`, `AttemptResult`, `SessionsPage`, `CompletionPage`, `CertificatePage`, `VerifyPage` |
| teaching  | `OfferingsPage`, `RosterPage`, `GradingQueuePage`, `AttemptGradingPage`, `OfferingSessionsPage`, `AttendancePage` |
| studio    | `VersionsPage`, `VersionPage`, `ImportPage`                                                               |
| review    | `InboxPage`, `VersionReviewPage`                                                                          |
| shared    | `VersionDiff`, `ProblemState`, `PublicLayout`                                                             |

## Problemas transversales

| #   | Problema                                                                                                  | Sev.  | Impacto                                                                  | Solución                                                                     | Módulos | Depende de |
| --- | --------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------- | ---------- |
| T1  | `PageHeader` de core tiene `px-8` fijo: en móvil el título no se alinea con el contenido; sin ruta de navegación | media | Cabecera descolocada en cada pantalla móvil                              | `ScreenHeader` / `ScreenBody` con el mismo contenedor                        | todos   | —          |
| T2  | Título a la izquierda y contenido centrado en otro ancho                                                  | media | Dos ejes de lectura en la misma pantalla                                 | Un contenedor por pantalla (`reading`, `content`, `wide`)                    | todos   | T1         |
| T3  | Enlaces sueltos («Cola de corrección», «Sesiones en vivo») como navegación de sección                     | alta  | Las sesiones y el certificado pasan inadvertidos                         | Pestañas de sección bajo la cabecera, por URL                                | classroom, teaching | T1 |
| T4  | Estados sin forma común: texto de color en docencia, palabra sola en el estudio, insignia solo en el aula | alta  | Color como único indicador (`pendiente de corrección`), WCAG 1.4.1       | `StatusBadge` compartida con icono y palabra                                 | todos   | —          |
| T5  | Menú sin iconos en las entradas del LMS, frente a las de core que sí los llevan                           | media | Las entradas principales parecen rotas                                   | `icon` de `NavContribution` con Lucide, ya usado por core                    | todos   | —          |
| T6  | Lema «Spatial Application Platform for GIS» en el menú y el login                                         | media | Habla de otro producto                                                   | `config.appTagline`                                                          | config  | —          |
| T7  | Estados vacíos como dos líneas de texto; errores sin icono                                                | media | Una pantalla vacía parece rota                                           | `EmptyState` de core; `ProblemState` con icono                               | todos   | —          |
| T8  | Escala tipográfica de Quipu sin utilidades; cada pantalla elige `text-*` a mano                           | media | Jerarquía inconsistente                                                  | `text-title-*`, `text-read-*` en `@theme`                                    | todos   | —          |
| T9  | Falta el marco de datos de los cursos: ninguna identidad visual                                           | media | Todos los cursos parecen iguales                                         | `CordBanner`, generado del slug                                              | catalog, classroom, teaching | — |

## Por experiencia

### Estudiante

| #   | Problema                                                                                          | Sev.  | Impacto                                                       | Solución                                                                                 |
| --- | ------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| E1  | «Mis cursos» es una lista con un botón igual por curso; nada destaca dónde seguir                 | alta  | Hay que decidir por dónde seguir antes de empezar             | Bloque «Continuar aprendiendo» con la siguiente lección exacta y una sola primaria       |
| E2  | Sesiones y evaluaciones no aparecen fuera de cada curso                                           | alta  | Hay que entrar curso por curso para saber qué viene           | Riel «Próximas sesiones» y «Por hacer» con datos reales de los endpoints existentes      |
| E3  | Sin separación entre en curso y completados; certificado escondido en una línea                   | media | Lo terminado compite con lo pendiente                         | Secciones separadas y acceso directo al certificado                                      |
| E4  | Sin vista de curso: `/mis-cursos/:id` abre directamente una lección                               | alta  | No se entiende el recorrido ni el avance por unidad           | Resumen del curso en el panel del temario; cifras, unidades y fechas en su sitio         |
| E5  | En móvil, 400 px de metadatos y controles antes de leer la primera línea                          | alta  | La lectura empieza fuera de la pantalla                       | Barra mínima, temario en hoja inferior, herramientas compactas                           |
| E6  | Cuatro títulos repetidos antes del contenido (curso, lección, recurso, h1 del documento)          | media | El contenido no es protagonista                               | Una sola jerarquía; el título del recurso solo si difiere o hay varios                   |
| E7  | Lectura en una tarjeta dentro de la página, con iframe de 75vh y doble desplazamiento             | alta  | Sensación de formulario, no de publicación                    | Superficie de lectura a altura de ventana y medida de 68ch; sin scripts ni cambios de CSP |
| E8  | Sin acción principal «Marcar y seguir» visible al terminar; anterior/siguiente son enlaces tenues | media | Se pierde el hilo del curso                                   | Pie de lección claro: completar, anterior y siguiente con el título                      |
| E9  | Ficha previa a la evaluación sin jerarquía; la regla y el botón pesan lo mismo                    | media | No se ve qué pasa al empezar                                  | Ficha con hechos, intentos en rombos, consecuencias y una primaria                       |
| E10 | Preguntas en lista larga sin índice ni estado de respondidas (según diseño, índice lateral de nudos) | alta | En evaluaciones largas se pierde lo que falta                 | Índice de nudos, cabecera fija con tiempo y «Entregar»                                   |
| E11 | Finalización y certificado por debajo de los criterios de Quipu en móvil                          | media | Momento de logro apagado                                      | Sello, cifras reales, recorrido; certificado sin tocar su impresión                      |

### Docente

| #   | Problema                                                                               | Sev.  | Impacto                                             | Solución                                                                    |
| --- | -------------------------------------------------------------------------------------- | ----- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| D1  | «Mis ediciones» no prioriza: lo pendiente es una frase en rojo terracota entre metadatos | alta  | Las entregas pendientes se pasan por alto           | Panel con cifras por edición y bandeja «Por corregir» con acceso directo    |
| D2  | Próximas sesiones ausentes del panel                                                   | alta  | Hay que abrir cada edición                          | Agenda agregada con los endpoints existentes                                |
| D3  | Matriculados sin búsqueda, orden ni filtros; progreso y evaluación en texto            | alta  | Seguir a 30 personas es leer una tabla entera       | Búsqueda, filtros, orden, barra de avance, insignias y resumen de la edición |
| D4  | Correo en mayúsculas                                                                   | media | Peor lectura y lectores de pantalla deletrean       | Sin `uppercase`; iniciales y correo                                         |
| D5  | Sin navegación de edición: enlaces sueltos                                             | alta  | Cambiar de tarea requiere volver y buscar           | Pestañas: Matriculados, Corrección, Sesiones                                |
| D6  | Tablas que desbordan en móvil                                                          | media | Inutilizable en el aula desde el teléfono           | Tarjeta por estudiante bajo `md`                                            |
| D7  | Corrección en una columna, sin contexto de la cola                                     | alta  | Corregir 30 entregas son muchos viajes              | Dos paneles, posición en la cola, «Guardar y pasar al siguiente»            |
| D8  | Asistencia sin marcado en lote ni resumen                                              | alta  | Pasar lista es lento                                | «Marcar a todos presentes» local, resumen por estado, controles de 44 px    |

### Creador

| #   | Problema                                                                                     | Sev.  | Impacto                                              | Solución                                                               |
| --- | -------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| C1  | «Estado: Borrador» como título y acción al lado de un enlace; el estado es texto             | alta  | Riesgo de confundir versiones                        | Cabecera con estado, y panel lateral de estado y línea de versiones    |
| C2  | Diferencias como lista técnica, sin leyenda                                                  | alta  | No se distingue de un vistazo qué cambió             | Leyenda añadido/quitado/cambiado con icono y forma; resumen en cifras  |
| C3  | Temario con «Editar» repetido y metadatos técnicos al mismo nivel                            | media | Ruido                                                | Temario en filas, con acción discreta y la fuente plegada              |
| C4  | Comentarios del revisor desconectados de la sección                                          | media | Hay que cruzar dos listas                            | Comentarios junto a su sección, con su estado                          |
| C5  | Importación: formulario largo y resultado poco jerárquico                                    | media | No se entiende el progreso                           | Pasos visibles, informe por severidad                                  |

### Revisor

| #   | Problema                                                                        | Sev.  | Impacto                                            | Solución                                                               |
| --- | ------------------------------------------------------------------------------- | ----- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| R1  | La decisión queda arriba del todo y se pierde al leer; primaria y danger juntas | alta  | Hay que volver arriba tras revisar                 | Panel de decisión fijo a la derecha en escritorio, siempre a la vista  |
| R2  | Bandeja sin priorizar                                                           | media | No se sabe por dónde empezar                       | Orden por antigüedad y comentarios abiertos a la vista                 |
| R3  | Comentar es un botón repetido por sección con cuadros dentro de cuadros         | media | Página larga y ruidosa                             | Filas por sección con contador y comentario desplegable                |

### Público

| #   | Problema                                                                                              | Sev.  | Impacto                                                | Solución                                                                      |
| --- | ----------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| P1  | Once campos de filtro a la vista antes del primer curso                                               | alta  | El catálogo parece un formulario                       | Búsqueda y categorías a la vista; el resto, en «Más filtros» con contador     |
| P2  | Cursos en lista sin identidad, categoría en mayúsculas                                                | alta  | No transmite un catálogo                               | Cuadrícula de `CourseCard` con banda de cordones                              |
| P3  | Sin entrada a la cuenta desde las páginas públicas                                                    | media | Quien ya tiene cuenta no encuentra por dónde entrar    | «Iniciar sesión» / «Mis cursos» en la cabecera                                |
| P4  | Ficha sin acción de matrícula destacada; en móvil, al final                                           | alta  | La acción principal queda lejos                        | Columna de ediciones fija en escritorio, acción al pie en móvil               |

## Accesibilidad

| #   | Problema                                                                 | Sev.  | Solución                                                       |
| --- | ------------------------------------------------------------------------ | ----- | -------------------------------------------------------------- |
| A1  | Objetivos de 24–36 px en enlaces de navegación de sección y temario      | media | Filas de 44–48 px; temario con `min-h-12`                      |
| A2  | Estados solo con color en docencia y resultados                          | alta  | `StatusBadge`                                                  |
| A3  | `input type=date` con formato del navegador, `h3` saltados               | baja  | Encabezados con `Section`                                      |
| A4  | Sin regla global de movimiento reducido                                  | media | Regla en `src/index.css`                                       |

## Limitaciones de `@wasichai/core` y `@wasichai/ui`

No se parchean aquí (CLAUDE.md, regla 7); se piden en `wasichai-ui` con este proyecto como segundo usuario.

| #   | Limitación                                                                                                                          | Efecto aquí                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| W1  | Los ítems del menú del shell no tienen `data-slot`: no se puede dar la marca al ítem actual ni 44 px de alto (`NavLink` `py-2`, 36 px) | El menú sigue con el estilo de core y bajo el objetivo táctil de Quipu          |
| W2  | Sin un `chrome` por estado de ruta: la lección no puede retirar el menú global con `?leccion=`                                       | La lección retira su temario, no el menú global                                 |
| W3  | `PageHeader` con `px-8` fijo, sin ruta de navegación ni ancho de contenedor                                                           | `ScreenHeader` en `src/shared` hasta que exista                                 |
| W4  | Selector de tema y de idioma del shell sin hooks; `EmptyState` sin descripción propia                                                 | Se usan tal cual                                                                |
| W5  | La marca del shell no admite logotipo; solo texto                                                                                     | `QuipuMark` solo en las páginas públicas                                        |
| W6  | `ConfirmDialog` y `cn()` no conocen las utilidades de texto de la app (`tailwind-merge`)                                              | Las utilidades de escala van en elementos propios                               |
| W7  | Las entradas de core (Datos, Administración) salen a un estudiante si la lectura está permitida                                        | Un estudiante ve menús que no le sirven; requiere `visible` por permiso en core |

## Dependencias entre cambios

Cimientos compartidos (T1–T9) → estudiante y visor, que fijan el listón → docencia → estudio y revisión → catálogo y
certificado → refinamiento transversal.
